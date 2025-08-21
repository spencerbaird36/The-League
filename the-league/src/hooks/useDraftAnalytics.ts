import { useState, useCallback, useMemo } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from './useDraftState';

export interface PlayerValue {
  player: Player;
  value: number;
  tier: number;
  positionRank: number;
  overallRank: number;
}

export interface TeamNeed {
  position: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  filled: number;
}

export interface DraftGrade {
  userId: number;
  grade: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  bestPick: DraftPick | null;
  worstPick: DraftPick | null;
}

export interface DraftAnalytics {
  // Player values and rankings
  getPlayerValue: (player: Player) => PlayerValue;
  getBestAvailable: (position?: string, count?: number) => PlayerValue[];
  getPositionTiers: (position: string) => PlayerValue[][];
  
  // Team analysis
  analyzeTeamNeeds: (userId: number, picks: DraftPick[]) => TeamNeed[];
  getDraftGrade: (userId: number, picks: DraftPick[]) => DraftGrade;
  getTeamStrengthComparison: (allPicks: DraftPick[]) => { userId: number; strength: number }[];
  
  // Draft insights
  getPickValue: (pick: DraftPick, expectedValue: number) => 'steal' | 'value' | 'reach' | 'neutral';
  getSuggestedPicks: (userId: number, picks: DraftPick[], availablePlayers: Player[]) => Player[];
}

// Position priorities for different team building strategies
const POSITION_PRIORITIES = {
  // Standard fantasy football strategy
  standard: {
    QB: { priority: 'medium' as const, target: 2 },
    RB: { priority: 'high' as const, target: 4 },
    WR: { priority: 'high' as const, target: 4 },
    TE: { priority: 'medium' as const, target: 2 },
    SP: { priority: 'high' as const, target: 3 }, // Starting Pitcher
    CP: { priority: 'medium' as const, target: 2 }, // Closer/Relief Pitcher
    '1B': { priority: 'medium' as const, target: 2 },
    '2B': { priority: 'medium' as const, target: 2 },
    '3B': { priority: 'medium' as const, target: 2 },
    'SS': { priority: 'medium' as const, target: 2 },
    'C': { priority: 'low' as const, target: 1 }, // Catcher
    'DH': { priority: 'low' as const, target: 1 },
    'OF': { priority: 'high' as const, target: 3 }, // Outfield
    'PG': { priority: 'medium' as const, target: 2 },
    'SG': { priority: 'medium' as const, target: 2 },
    'SF': { priority: 'medium' as const, target: 2 },
    'PF': { priority: 'medium' as const, target: 2 }
  }
};

export const useDraftAnalytics = (): DraftAnalytics => {
  const [playerValues] = useState<Map<string | number, PlayerValue>>(new Map());

  // Create player value rankings based on simple algorithm
  const calculatePlayerValue = useCallback((player: Player): PlayerValue => {
    // Simple value calculation - in a real app this would use actual projections
    const baseValue = Math.random() * 100; // Placeholder for actual stats
    const positionMultiplier = getPositionMultiplier(player.position);
    const value = baseValue * positionMultiplier;
    
    return {
      player,
      value,
      tier: Math.ceil(value / 20), // Group into tiers of 20 points
      positionRank: 1, // Would be calculated based on position
      overallRank: 1 // Would be calculated based on overall value
    };
  }, []);

  const getPlayerValue = useCallback((player: Player): PlayerValue => {
    if (playerValues.has(player.id)) {
      return playerValues.get(player.id)!;
    }
    
    const value = calculatePlayerValue(player);
    playerValues.set(player.id, value);
    return value;
  }, [playerValues, calculatePlayerValue]);

  const getBestAvailable = useCallback((position?: string, count: number = 10): PlayerValue[] => {
    // This would filter available players and return top values
    // Placeholder implementation
    return [];
  }, []);

  const getPositionTiers = useCallback((position: string): PlayerValue[][] => {
    // Group players by tier within a position
    // Placeholder implementation
    return [[]];
  }, []);

  const analyzeTeamNeeds = useCallback((userId: number, picks: DraftPick[]): TeamNeed[] => {
    const userPicks = picks.filter(pick => pick.userId === userId);
    const positionCounts = userPicks.reduce((acc, pick) => {
      acc[pick.playerPosition] = (acc[pick.playerPosition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const needs: TeamNeed[] = [];
    
    Object.entries(POSITION_PRIORITIES.standard).forEach(([position, config]) => {
      const filled = positionCounts[position] || 0;
      const needed = Math.max(0, config.target - filled);
      
      if (needed > 0) {
        needs.push({
          position,
          priority: config.priority,
          count: config.target,
          filled
        });
      }
    });

    // Sort by priority and need
    return needs.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      const needDiff = (b.count - b.filled) - (a.count - a.filled);
      return needDiff;
    });
  }, []);

  const getDraftGrade = useCallback((userId: number, picks: DraftPick[]): DraftGrade => {
    const userPicks = picks.filter(pick => pick.userId === userId);
    
    // Simple grading algorithm
    let totalValue = 0;
    let bestPick: DraftPick | null = null;
    let worstPick: DraftPick | null = null;
    let bestValue = -Infinity;
    let worstValue = Infinity;
    
    userPicks.forEach(pick => {
      // Calculate pick value (placeholder)
      const pickValue = Math.random() * 100;
      totalValue += pickValue;
      
      if (pickValue > bestValue) {
        bestValue = pickValue;
        bestPick = pick;
      }
      
      if (pickValue < worstValue) {
        worstValue = pickValue;
        worstPick = pick;
      }
    });
    
    const averageValue = userPicks.length > 0 ? totalValue / userPicks.length : 0;
    const score = Math.min(100, Math.max(0, averageValue));
    
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    
    return {
      userId,
      grade,
      score,
      strengths: ['Good value picks', 'Balanced roster'],
      weaknesses: score < 70 ? ['Could improve at key positions'] : [],
      bestPick,
      worstPick
    };
  }, []);

  const getTeamStrengthComparison = useCallback((allPicks: DraftPick[]): { userId: number; strength: number }[] => {
    const userIdSet = new Set(allPicks.map(pick => pick.userId));
    const userIds = Array.from(userIdSet);
    
    return userIds.map(userId => {
      const grade = getDraftGrade(userId, allPicks);
      return {
        userId,
        strength: grade.score
      };
    }).sort((a, b) => b.strength - a.strength);
  }, [getDraftGrade]);

  const getPickValue = useCallback((pick: DraftPick, expectedValue: number): 'steal' | 'value' | 'reach' | 'neutral' => {
    // Simple algorithm based on pick position vs expected value
    const pickNumber = pick.pickNumber;
    const valueRatio = expectedValue / pickNumber;
    
    if (valueRatio > 1.5) return 'steal';
    if (valueRatio > 1.2) return 'value';
    if (valueRatio < 0.8) return 'reach';
    return 'neutral';
  }, []);

  const getSuggestedPicks = useCallback((userId: number, picks: DraftPick[], availablePlayers: Player[]): Player[] => {
    const teamNeeds = analyzeTeamNeeds(userId, picks);
    const suggestions: Player[] = [];
    
    // Get best available at needed positions
    teamNeeds.slice(0, 3).forEach(need => {
      const positionPlayers = availablePlayers
        .filter(player => player.position === need.position)
        .slice(0, 2);
      
      suggestions.push(...positionPlayers);
    });
    
    // Add some best overall available
    const bestOverall = availablePlayers
      .filter(player => !suggestions.includes(player))
      .slice(0, 2);
    
    suggestions.push(...bestOverall);
    
    return suggestions.slice(0, 5);
  }, [analyzeTeamNeeds]);

  return {
    getPlayerValue,
    getBestAvailable,
    getPositionTiers,
    analyzeTeamNeeds,
    getDraftGrade,
    getTeamStrengthComparison,
    getPickValue,
    getSuggestedPicks
  };
};

// Helper function for position value multipliers
function getPositionMultiplier(position: string): number {
  const multipliers: Record<string, number> = {
    QB: 1.0,
    RB: 1.2,
    WR: 1.2,
    TE: 0.9,
    SP: 1.1,
    CP: 0.8,
    '1B': 1.0,
    '2B': 0.9,
    '3B': 0.9,
    'SS': 0.9,
    'C': 0.7,
    'DH': 0.8,
    'OF': 1.0,
    'PG': 1.0,
    'SG': 1.0,
    'SF': 1.0,
    'PF': 1.0
  };
  
  return multipliers[position] || 1.0;
}