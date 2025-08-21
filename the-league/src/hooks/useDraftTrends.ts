import { useState, useCallback, useMemo } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from './useDraftState';

export interface PositionTrend {
  position: string;
  averagePickNumber: number;
  totalDrafted: number;
  scarcityScore: number; // Higher = more scarce
  runRisk: 'high' | 'medium' | 'low'; // Risk of position run
  tierBreaks: number[]; // Pick numbers where value drops significantly
}

export interface ValueTrend {
  round: number;
  averageValue: number;
  valueVariance: number;
  bestValue: DraftPick | null;
  worstValue: DraftPick | null;
}

export interface DraftTrend {
  timestamp: string;
  event: 'pick' | 'tier_break' | 'position_run' | 'value_pick' | 'reach';
  description: string;
  severity: 'info' | 'warning' | 'alert';
  relatedPlayer?: Player;
  impact: number; // 0-100 impact score
}

export interface DraftEfficiency {
  userId: number;
  efficiency: number; // 0-100 efficiency score
  valueOver: number; // Value over replacement
  positionalBalance: number; // How balanced their roster is
  reachCount: number;
  stealCount: number;
  trends: DraftTrend[];
}

export interface DraftTrendsAnalysis {
  // Position trends
  getPositionTrends: () => PositionTrend[];
  getPositionScarcity: (position: string) => number;
  predictPositionRun: (position: string) => 'imminent' | 'likely' | 'unlikely';
  
  // Value trends
  getValueTrends: () => ValueTrend[];
  getExpectedValue: (pickNumber: number, position?: string) => number;
  identifyTierBreaks: (position: string) => number[];
  
  // Real-time insights
  getDraftTrends: () => DraftTrend[];
  addTrend: (trend: DraftTrend) => void;
  
  // Team efficiency
  getDraftEfficiency: (userId: number) => DraftEfficiency;
  getLeagueEfficiencyRankings: () => DraftEfficiency[];
  
  // Predictions
  predictNextPicks: (count: number) => { player: Player; likelihood: number }[];
  suggestCounterStrategy: (upcomingPicks: number[]) => string[];
}

// Position scarcity weights based on typical league settings
const POSITION_SCARCITY_WEIGHTS: Record<string, number> = {
  // NFL - Higher scarcity for skill positions
  QB: 0.8,
  RB: 1.4,
  WR: 1.2,
  TE: 0.9,
  
  // MLB - Pitching is scarce, offense varies
  SP: 1.3,
  CP: 1.1, 
  '1B': 0.9,
  '2B': 1.0,
  '3B': 1.0,
  'SS': 1.1,
  'C': 0.7,
  'DH': 0.8,
  'OF': 1.0,
  
  // NBA - Guards and wings typically deeper
  'PG': 1.0,
  'SG': 1.0,
  'SF': 1.1,
  'PF': 1.1
};

const TIER_BREAK_THRESHOLD = 15; // Pick difference to identify tier breaks

export const useDraftTrends = (
  picks: DraftPick[],
  availablePlayers: Player[],
  draftOrder: number[],
  currentPickNumber: number
): DraftTrendsAnalysis => {
  
  const [trends, setTrends] = useState<DraftTrend[]>([]);
  
  // Analyze position trends
  const getPositionTrends = useCallback((): PositionTrend[] => {
    const positionStats = new Map<string, {
      picks: number[];
      count: number;
    }>();
    
    // Group picks by position
    picks.forEach(pick => {
      const stats = positionStats.get(pick.playerPosition) || { picks: [], count: 0 };
      stats.picks.push(pick.pickNumber);
      stats.count++;
      positionStats.set(pick.playerPosition, stats);
    });
    
    // Calculate trends for each position
    const trends: PositionTrend[] = [];
    
    Object.entries(POSITION_SCARCITY_WEIGHTS).forEach(([position, weight]) => {
      const stats = positionStats.get(position) || { picks: [], count: 0 };
      const averagePickNumber = stats.picks.length > 0 
        ? stats.picks.reduce((sum, pick) => sum + pick, 0) / stats.picks.length
        : 0;
      
      // Calculate scarcity based on available players and draft pace
      const availableAtPosition = availablePlayers.filter(p => p.position === position).length;
      const drafted = stats.count;
      const scarcityScore = Math.min(100, (drafted / (availableAtPosition + drafted)) * 100 * weight);
      
      // Determine run risk based on recent picks and scarcity
      let runRisk: 'high' | 'medium' | 'low' = 'low';
      const recentPicks = picks.slice(-6).filter(p => p.playerPosition === position);
      if (recentPicks.length >= 2 && scarcityScore > 60) {
        runRisk = 'high';
      } else if (recentPicks.length >= 1 && scarcityScore > 40) {
        runRisk = 'medium';
      }
      
      // Identify tier breaks by looking for gaps in pick numbers
      const sortedPicks = stats.picks.sort((a, b) => a - b);
      const tierBreaks: number[] = [];
      for (let i = 1; i < sortedPicks.length; i++) {
        if (sortedPicks[i] - sortedPicks[i-1] > TIER_BREAK_THRESHOLD) {
          tierBreaks.push(sortedPicks[i]);
        }
      }
      
      trends.push({
        position,
        averagePickNumber,
        totalDrafted: stats.count,
        scarcityScore,
        runRisk,
        tierBreaks
      });
    });
    
    return trends.sort((a, b) => b.scarcityScore - a.scarcityScore);
  }, [picks, availablePlayers]);
  
  // Analyze value trends by round
  const getValueTrends = useCallback((): ValueTrend[] => {
    const roundTrends = new Map<number, DraftPick[]>();
    const playersPerRound = draftOrder.length;
    
    // Group picks by round
    picks.forEach(pick => {
      const round = Math.ceil(pick.pickNumber / playersPerRound);
      const roundPicks = roundTrends.get(round) || [];
      roundPicks.push(pick);
      roundTrends.set(round, roundPicks);
    });
    
    const trends: ValueTrend[] = [];
    
    roundTrends.forEach((roundPicks, round) => {
      // Simple value calculation based on pick position vs expected
      const values = roundPicks.map(pick => {
        const expectedPick = Math.random() * 50 + pick.pickNumber - 25; // Placeholder
        return expectedPick - pick.pickNumber; // Positive = value, negative = reach
      });
      
      const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      const valueVariance = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length
      );
      
      // Find best and worst picks in round
      let bestValue: DraftPick | null = null;
      let worstValue: DraftPick | null = null;
      let maxValue = -Infinity;
      let minValue = Infinity;
      
      roundPicks.forEach((pick, index) => {
        const value = values[index];
        if (value > maxValue) {
          maxValue = value;
          bestValue = pick;
        }
        if (value < minValue) {
          minValue = value;
          worstValue = pick;
        }
      });
      
      trends.push({
        round,
        averageValue,
        valueVariance,
        bestValue,
        worstValue
      });
    });
    
    return trends.sort((a, b) => a.round - b.round);
  }, [picks, draftOrder.length]);
  
  const getPositionScarcity = useCallback((position: string): number => {
    const trends = getPositionTrends();
    const trend = trends.find(t => t.position === position);
    return trend?.scarcityScore || 0;
  }, [getPositionTrends]);
  
  const predictPositionRun = useCallback((position: string): 'imminent' | 'likely' | 'unlikely' => {
    const trends = getPositionTrends();
    const trend = trends.find(t => t.position === position);
    
    if (!trend) return 'unlikely';
    
    if (trend.runRisk === 'high') return 'imminent';
    if (trend.runRisk === 'medium') return 'likely';
    return 'unlikely';
  }, [getPositionTrends]);
  
  const getExpectedValue = useCallback((pickNumber: number, position?: string): number => {
    // Simplified value calculation - would use more sophisticated algorithm in production
    const baseValue = 100 - (pickNumber / 2);
    const positionMultiplier = position ? (POSITION_SCARCITY_WEIGHTS[position] || 1) : 1;
    return Math.max(0, baseValue * positionMultiplier);
  }, []);
  
  const identifyTierBreaks = useCallback((position: string): number[] => {
    const trends = getPositionTrends();
    const trend = trends.find(t => t.position === position);
    return trend?.tierBreaks || [];
  }, [getPositionTrends]);
  
  const getDraftTrends = useCallback((): DraftTrend[] => {
    return trends.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [trends]);
  
  const addTrend = useCallback((trend: DraftTrend) => {
    setTrends(prev => [trend, ...prev.slice(0, 49)]); // Keep last 50 trends
  }, []);
  
  const getDraftEfficiency = useCallback((userId: number): DraftEfficiency => {
    const userPicks = picks.filter(pick => pick.userId === userId);
    
    let totalEfficiency = 0;
    let valueOver = 0;
    let reachCount = 0;
    let stealCount = 0;
    
    userPicks.forEach(pick => {
      const expectedValue = getExpectedValue(pick.pickNumber, pick.playerPosition);
      const actualValue = expectedValue + Math.random() * 20 - 10; // Placeholder
      
      const efficiency = Math.min(100, Math.max(0, actualValue / expectedValue * 100));
      totalEfficiency += efficiency;
      
      valueOver += actualValue - expectedValue;
      
      if (efficiency < 80) reachCount++;
      if (efficiency > 120) stealCount++;
    });
    
    // Calculate positional balance
    const positions = new Set(userPicks.map(pick => pick.playerPosition));
    const positionalBalance = Math.min(100, positions.size * 10); // Simple balance metric
    
    return {
      userId,
      efficiency: userPicks.length > 0 ? totalEfficiency / userPicks.length : 0,
      valueOver,
      positionalBalance,
      reachCount,
      stealCount,
      trends: trends.filter(t => t.relatedPlayer && 
        userPicks.some(pick => pick.playerName === t.relatedPlayer?.name))
    };
  }, [picks, getExpectedValue, trends]);
  
  const getLeagueEfficiencyRankings = useCallback((): DraftEfficiency[] => {
    const userIds = Array.from(new Set(picks.map(pick => pick.userId)));
    return userIds
      .map(userId => getDraftEfficiency(userId))
      .sort((a, b) => b.efficiency - a.efficiency);
  }, [picks, getDraftEfficiency]);
  
  const predictNextPicks = useCallback((count: number): { player: Player; likelihood: number }[] => {
    // Simplified prediction based on position needs and scarcity
    const predictions: { player: Player; likelihood: number }[] = [];
    const trends = getPositionTrends();
    
    // Get top available players
    const topPlayers = availablePlayers
      .slice(0, Math.min(count * 3, availablePlayers.length))
      .map(player => {
        const positionTrend = trends.find(t => t.position === player.position);
        const likelihood = positionTrend 
          ? Math.min(100, positionTrend.scarcityScore + Math.random() * 30)
          : Math.random() * 50;
        
        return { player, likelihood };
      })
      .sort((a, b) => b.likelihood - a.likelihood)
      .slice(0, count);
    
    return topPlayers;
  }, [availablePlayers, getPositionTrends]);
  
  const suggestCounterStrategy = useCallback((upcomingPicks: number[]): string[] => {
    const suggestions: string[] = [];
    const trends = getPositionTrends();
    
    // Suggest strategies based on position scarcity and upcoming picks
    const highScarcityPositions = trends
      .filter(t => t.scarcityScore > 60)
      .slice(0, 3);
    
    if (highScarcityPositions.length > 0) {
      suggestions.push(`Consider targeting ${highScarcityPositions[0].position} - high scarcity detected`);
    }
    
    const positionRunRisks = trends.filter(t => t.runRisk === 'high');
    if (positionRunRisks.length > 0) {
      suggestions.push(`Position run likely: ${positionRunRisks.map(t => t.position).join(', ')}`);
    }
    
    if (upcomingPicks.length > 0) {
      const picksUntilNext = upcomingPicks[0] - currentPickNumber;
      if (picksUntilNext <= 5) {
        suggestions.push('Your pick is coming up soon - finalize your target');
      }
    }
    
    return suggestions;
  }, [getPositionTrends, currentPickNumber]);
  
  return {
    getPositionTrends,
    getPositionScarcity,
    predictPositionRun,
    getValueTrends,
    getExpectedValue,
    identifyTierBreaks,
    getDraftTrends,
    addTrend,
    getDraftEfficiency,
    getLeagueEfficiencyRankings,
    predictNextPicks,
    suggestCounterStrategy
  };
};