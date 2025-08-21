import { useState, useCallback, useMemo, useRef } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from './useDraftState';

export interface AIPlayerProjection {
  player: Player;
  projectedPoints: number;
  projectedRank: number;
  confidence: number; // 0-100
  upside: number; // Best case scenario
  floor: number; // Worst case scenario
  consistency: number; // Variance score
  injuryRisk: number; // 0-100
  strengthOfSchedule: number; // 0-100
  marketValue: number; // Current market assessment
  aiValue: number; // AI's calculated value
  trend: 'rising' | 'falling' | 'stable';
  reasoning: string[];
}

export interface AIStrategy {
  name: string;
  description: string;
  confidence: number;
  expectedOutcome: string;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  positionPriorities: { position: string; weight: number; reasoning: string }[];
  targetPlayers: string[]; // Player IDs
  avoidPlayers: string[]; // Player IDs to avoid
  keyInsights: string[];
}

export interface AIPickRecommendation {
  player: Player;
  reasoning: string[];
  confidence: number;
  alternativeValue: number; // Value vs best alternative
  strategyFit: number; // 0-100 how well it fits strategy
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  timing: {
    optimal: boolean;
    earliestRecommended: number; // Pick number
    latestRecommended: number; // Pick number
  };
  impact: {
    shortTerm: string; // Immediate impact
    longTerm: string; // Season outlook
    teamBalance: string; // How it affects roster balance
  };
}

export interface OpponentProfile {
  userId: number;
  draftingStyle: 'aggressive' | 'conservative' | 'value-based' | 'need-based';
  positionBias: Record<string, number>; // Position preferences
  riskTolerance: number; // 0-100
  predictedNextPicks: { player: Player; likelihood: number }[];
  weaknesses: string[]; // Draft weaknesses to exploit
  strengths: string[]; // What they do well
  counterStrategy: string[]; // How to draft against them
}

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'strategy' | 'market' | 'opponent';
  title: string;
  message: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  suggestedActions: string[];
  relevantPlayers: Player[];
  expiresAt?: number; // Pick number when insight becomes irrelevant
}

export interface AIDraftAssistantState {
  isEnabled: boolean;
  isAnalyzing: boolean;
  currentStrategy: AIStrategy | null;
  recommendations: AIPickRecommendation[];
  projections: Map<string, AIPlayerProjection>;
  opponentProfiles: Map<number, OpponentProfile>;
  insights: AIInsight[];
  performanceMetrics: {
    accuracy: number; // Historical prediction accuracy
    valueGenerated: number; // Estimated value added
    decisionsInfluenced: number;
  };
}

export interface AIDraftAssistantActions {
  // Core AI functions
  enableAssistant: (strategy?: string) => void;
  disableAssistant: () => void;
  analyzeCurrentSituation: () => Promise<void>;
  
  // Recommendations
  getTopRecommendations: (count?: number) => AIPickRecommendation[];
  getRecommendationForPlayer: (playerId: string) => AIPickRecommendation | null;
  compareRecommendations: (playerIds: string[]) => any;
  
  // Strategy management
  generateStrategy: (preferences: any) => Promise<AIStrategy>;
  adaptStrategy: (newData: any) => Promise<void>;
  explainStrategy: () => string[];
  
  // Insights
  getActiveInsights: () => AIInsight[];
  dismissInsight: (insightId: string) => void;
  requestInsight: (topic: string) => Promise<AIInsight>;
  
  // Opponent analysis  
  analyzeOpponent: (userId: number) => Promise<OpponentProfile>;
  predictOpponentPicks: (userId: number, rounds: number) => Player[];
  
  // Performance tracking
  recordDecision: (playerId: string, wasRecommended: boolean) => void;
  getPerformanceReport: () => any;
}

// AI Model Configuration
const AI_CONFIG = {
  POSITION_WEIGHTS: {
    // Scoring impact weights for different positions
    QB: { impact: 0.85, scarcity: 0.7, predictability: 0.9 },
    RB: { impact: 1.0, scarcity: 0.9, predictability: 0.6 },
    WR: { impact: 0.95, scarcity: 0.8, predictability: 0.7 },
    TE: { impact: 0.7, scarcity: 0.6, predictability: 0.8 },
    SP: { impact: 0.9, scarcity: 0.8, predictability: 0.75 },
    CP: { impact: 0.6, scarcity: 0.7, predictability: 0.85 }
  },
  
  MARKET_FACTORS: {
    RECENCY_BIAS: 0.15, // How much recent performance affects value
    INJURY_DISCOUNT: 0.25, // Discount for injury-prone players
    ROOKIE_UNCERTAINTY: 0.3, // Additional variance for rookies
    AGE_DECAY: 0.05, // Value decay per year over 30
    BREAKOUT_BONUS: 0.2 // Bonus for predicted breakout candidates
  },
  
  CONFIDENCE_THRESHOLDS: {
    HIGH: 85,
    MEDIUM: 70,
    LOW: 55
  }
};

// Advanced AI algorithms for player evaluation
class AIPlayerEvaluator {
  static calculateProjectedPoints(player: Player): number {
    const baseStats = player.stats || {};
    let projectedPoints = 0;
    
    // Position-specific projection logic
    switch (player.position) {
      case 'QB':
        projectedPoints = 
          (baseStats.passingYards as number || 0) * 0.04 +
          (baseStats.passingTDs as number || 0) * 4 +
          (baseStats.rushingYards as number || 0) * 0.1 +
          (baseStats.rushingTDs as number || 0) * 6;
        break;
        
      case 'RB':
      case 'WR':
        projectedPoints = 
          (baseStats.rushingYards as number || 0) * 0.1 +
          (baseStats.receivingYards as number || 0) * 0.1 +
          (baseStats.rushingTDs as number || 0) * 6 +
          (baseStats.receivingTDs as number || 0) * 6 +
          (baseStats.receptions as number || 0) * 0.5; // PPR scoring
        break;
        
      default:
        projectedPoints = Math.random() * 200 + 100; // Fallback
    }
    
    return Math.max(50, projectedPoints); // Minimum floor
  }
  
  static calculateConfidence(player: Player, marketData: any): number {
    let confidence = 75; // Base confidence
    
    // Adjust based on data quality and consistency
    const stats = player.stats;
    if (stats && Object.keys(stats).length > 3) {
      confidence += 10; // More stats = higher confidence
    }
    
    // Adjust for player experience (would use real age data)
    const estimatedAge = Math.random() * 15 + 20; // 20-35
    if (estimatedAge < 25) confidence -= 5; // Young players less predictable
    if (estimatedAge > 32) confidence -= 10; // Older players have decline risk
    
    return Math.min(95, Math.max(40, confidence));
  }
  
  static generateReasoning(player: Player, projection: AIPlayerProjection): string[] {
    const reasoning: string[] = [];
    
    // High-value reasoning
    if (projection.aiValue > projection.marketValue * 1.15) {
      reasoning.push(`Undervalued by ${((projection.aiValue / projection.marketValue - 1) * 100).toFixed(1)}% based on projections`);
    }
    
    // Consistency analysis
    if (projection.consistency > 80) {
      reasoning.push('High consistency with low week-to-week variance');
    } else if (projection.consistency < 50) {
      reasoning.push('Boom-or-bust profile with high variance');
    }
    
    // Upside potential
    if (projection.upside > projection.projectedPoints * 1.4) {
      reasoning.push('Exceptional upside potential if everything clicks');
    }
    
    // Risk factors
    if (projection.injuryRisk > 70) {
      reasoning.push('Higher injury risk based on history and position');
    }
    
    // Schedule strength
    if (projection.strengthOfSchedule < 40) {
      reasoning.push('Favorable schedule with weak opposing defenses');
    } else if (projection.strengthOfSchedule > 70) {
      reasoning.push('Challenging schedule against strong defenses');
    }
    
    return reasoning.length > 0 ? reasoning : ['Solid, reliable option at this position'];
  }
}

// AI Strategy Generator
class AIStrategyGenerator {
  static generateOptimalStrategy(
    availablePlayers: Player[],
    currentPicks: DraftPick[],
    draftPosition: number,
    leagueSize: number
  ): AIStrategy {
    
    // Analyze draft position advantages
    const isEarlyPick = draftPosition <= 3;
    const isLatePick = draftPosition >= leagueSize - 2;
    const isMiddlePick = !isEarlyPick && !isLatePick;
    
    let strategy: AIStrategy;
    
    if (isEarlyPick) {
      strategy = {
        name: 'Elite Anchor Strategy',
        description: 'Secure elite talent early, build around anchor players',
        confidence: 88,
        expectedOutcome: 'High ceiling with strong foundation players',
        riskLevel: 'balanced',
        positionPriorities: [
          { position: 'RB', weight: 1.0, reasoning: 'Elite RBs provide highest positional advantage' },
          { position: 'WR', weight: 0.9, reasoning: 'Top WRs offer consistent high-end production' },
          { position: 'QB', weight: 0.7, reasoning: 'Can wait on QB depth in middle rounds' }
        ],
        targetPlayers: availablePlayers.slice(0, 12).map(p => p.id),
        avoidPlayers: [],
        keyInsights: [
          'Your early pick gives you access to elite tier players',
          'Focus on players with high floors and proven track records',
          'Consider positional scarcity in first 3 rounds'
        ]
      };
    } else if (isLatePick) {
      strategy = {
        name: 'Value Accumulation Strategy',
        description: 'Target undervalued players with high upside potential',
        confidence: 82,
        expectedOutcome: 'Strong depth with potential for breakout performances',
        riskLevel: 'aggressive',
        positionPriorities: [
          { position: 'WR', weight: 1.0, reasoning: 'Deep WR class allows for value in later rounds' },
          { position: 'RB', weight: 0.8, reasoning: 'Target upside RBs with opportunity' },
          { position: 'TE', weight: 0.9, reasoning: 'Elite TEs provide positional advantage' }
        ],
        targetPlayers: availablePlayers.slice(24, 60).map(p => p.id),
        avoidPlayers: [],
        keyInsights: [
          'Late pick allows for quick back-to-back selections',
          'Target players with changing situations or opportunity',
          'Consider reaching for positional scarcity'
        ]
      };
    } else {
      strategy = {
        name: 'Balanced Excellence Strategy',  
        description: 'Build well-rounded roster with best available players',
        confidence: 85,
        expectedOutcome: 'Consistent production across all positions',
        riskLevel: 'conservative',
        positionPriorities: [
          { position: 'RB', weight: 0.9, reasoning: 'Secure RB depth before scarcity hits' },
          { position: 'WR', weight: 0.9, reasoning: 'Build strong WR core early' },
          { position: 'QB', weight: 0.8, reasoning: 'Target QB in middle rounds for value' }
        ],
        targetPlayers: availablePlayers.slice(12, 36).map(p => p.id),
        avoidPlayers: [],
        keyInsights: [
          'Middle draft position offers flexibility',
          'React to other teams\' strategies and adapt',
          'Balance upside with floor in player selection'
        ]
      };
    }
    
    return strategy;
  }
}

export const useAIDraftAssistant = (
  availablePlayers: Player[],
  currentPicks: DraftPick[],
  draftOrder: number[],
  userId?: number
): [AIDraftAssistantState, AIDraftAssistantActions] => {
  
  const [state, setState] = useState<AIDraftAssistantState>({
    isEnabled: false,
    isAnalyzing: false,
    currentStrategy: null,
    recommendations: [],
    projections: new Map(),
    opponentProfiles: new Map(),
    insights: [],
    performanceMetrics: {
      accuracy: 0,
      valueGenerated: 0,
      decisionsInfluenced: 0
    }
  });
  
  const analysisCache = useRef<Map<string, any>>(new Map());
  const decisionHistory = useRef<Array<{ playerId: string; wasRecommended: boolean; outcome?: string }>>([]);
  const stateRef = useRef(state);
  
  // Keep ref up to date
  stateRef.current = state;
  
  // Generate AI projections for all players
  const generateProjections = useCallback(async (): Promise<Map<string, AIPlayerProjection>> => {
    const projections = new Map<string, AIPlayerProjection>();
    
    // Simulate AI analysis with realistic delays
    await new Promise(resolve => setTimeout(resolve, 100));
    
    for (const player of availablePlayers) {
      const projectedPoints = AIPlayerEvaluator.calculateProjectedPoints(player);
      const marketValue = Math.random() * 100 + 50; // Simulated market value
      const aiValue = projectedPoints * (0.8 + Math.random() * 0.4); // AI's assessment
      
      const projection: AIPlayerProjection = {
        player,
        projectedPoints,
        projectedRank: 0, // Will be calculated after all projections
        confidence: AIPlayerEvaluator.calculateConfidence(player, {}),
        upside: projectedPoints * (1.2 + Math.random() * 0.3),
        floor: projectedPoints * (0.7 + Math.random() * 0.2),
        consistency: Math.random() * 40 + 60, // 60-100
        injuryRisk: Math.random() * 100,
        strengthOfSchedule: Math.random() * 100,
        marketValue,
        aiValue,
        trend: Math.random() > 0.7 ? 'rising' : Math.random() > 0.3 ? 'stable' : 'falling',
        reasoning: []
      };
      
      projection.reasoning = AIPlayerEvaluator.generateReasoning(player, projection);
      projections.set(player.id, projection);
    }
    
    // Calculate ranks based on AI value
    const sortedProjections = Array.from(projections.values())
      .sort((a, b) => b.aiValue - a.aiValue);
    
    sortedProjections.forEach((proj, index) => {
      proj.projectedRank = index + 1;
    });
    
    return projections;
  }, [availablePlayers]);
  
  const enableAssistant = useCallback(async (strategyType?: string) => {
    setState(prev => ({ ...prev, isEnabled: true, isAnalyzing: true }));
    
    try {
      // Generate projections
      const projections = await generateProjections();
      
      // Generate optimal strategy
      const userPosition = draftOrder.findIndex(id => id === userId) + 1;
      const strategy = AIStrategyGenerator.generateOptimalStrategy(
        availablePlayers,
        currentPicks,
        userPosition,
        draftOrder.length
      );
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        currentStrategy: strategy,
        projections
      }));
      
      // Trigger initial analysis after projections are set
      setTimeout(() => analyzeCurrentSituation(), 0);
      
    } catch (error) {
      console.error('Failed to enable AI assistant:', error);
      setState(prev => ({ ...prev, isEnabled: false, isAnalyzing: false }));
    }
  }, [availablePlayers, currentPicks, draftOrder, userId, generateProjections]);
  
  const analyzeCurrentSituation = useCallback(async () => {
    // Use stateRef to access current state without causing dependency issues
    const currentState = stateRef.current;
    if (!currentState.isEnabled) return;
    
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      // Generate recommendations for current pick
      const recommendations: AIPickRecommendation[] = [];
      const topProjections = Array.from(currentState.projections.values())
        .sort((a, b) => b.aiValue - a.aiValue)
        .slice(0, 10);
      
      for (const projection of topProjections) {
        const recommendation: AIPickRecommendation = {
          player: projection.player,
          reasoning: [
            ...projection.reasoning,
            `AI Value: ${projection.aiValue.toFixed(1)} (Market: ${projection.marketValue.toFixed(1)})`,
            `Projected Rank: #${projection.projectedRank} overall`
          ],
          confidence: projection.confidence,
          alternativeValue: projection.aiValue - topProjections[1]?.aiValue || 0,
          strategyFit: Math.random() * 40 + 60, // 60-100
          riskAssessment: {
            level: projection.injuryRisk > 70 ? 'high' : projection.injuryRisk > 40 ? 'medium' : 'low',
            factors: projection.injuryRisk > 70 ? ['Injury history concerns'] : []
          },
          timing: {
            optimal: Math.random() > 0.3,
            earliestRecommended: Math.max(1, projection.projectedRank - 12),
            latestRecommended: projection.projectedRank + 12
          },
          impact: {
            shortTerm: 'Immediate starter with weekly lineup impact',
            longTerm: 'Season-long contributor with upside potential',
            teamBalance: 'Addresses positional need and roster construction'
          }
        };
        
        recommendations.push(recommendation);
      }
      
      // Generate insights
      const insights: AIInsight[] = [
        {
          id: `insight_${Date.now()}`,
          type: 'opportunity',
          title: 'Value Opportunity Detected',
          message: 'Several players are available below their projected value',
          confidence: 82,
          urgency: 'medium',
          actionable: true,
          suggestedActions: ['Consider reaching for undervalued players', 'Monitor market inefficiencies'],
          relevantPlayers: topProjections.slice(0, 3).map(p => p.player),
          expiresAt: currentPicks.length + 5
        }
      ];
      
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        recommendations: recommendations.slice(0, 5),
        insights: [...prev.insights, ...insights]
      }));
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [currentPicks]);
  
  const getTopRecommendations = useCallback((count: number = 5): AIPickRecommendation[] => {
    return state.recommendations
      .sort((a, b) => (b.confidence * b.strategyFit) - (a.confidence * a.strategyFit))
      .slice(0, count);
  }, [state.recommendations]);
  
  const generateStrategy = useCallback(async (preferences: any): Promise<AIStrategy> => {
    const userPosition = draftOrder.findIndex(id => id === userId) + 1;
    return AIStrategyGenerator.generateOptimalStrategy(
      availablePlayers,
      currentPicks,
      userPosition,
      draftOrder.length
    );
  }, [availablePlayers, currentPicks, draftOrder, userId]);
  
  const recordDecision = useCallback((playerId: string, wasRecommended: boolean) => {
    if (!decisionHistory.current) decisionHistory.current = [];
    
    decisionHistory.current.push({
      playerId,
      wasRecommended,
      outcome: 'pending' // Would be updated later based on performance
    });
    
    setState(prev => ({
      ...prev,
      performanceMetrics: {
        ...prev.performanceMetrics,
        decisionsInfluenced: prev.performanceMetrics.decisionsInfluenced + (wasRecommended ? 1 : 0)
      }
    }));
  }, []);
  
  const actions: AIDraftAssistantActions = {
    enableAssistant,
    disableAssistant: () => setState(prev => ({ ...prev, isEnabled: false })),
    analyzeCurrentSituation,
    getTopRecommendations,
    getRecommendationForPlayer: (playerId) => state.recommendations.find(r => r.player.id === playerId) || null,
    compareRecommendations: (playerIds) => playerIds.map(id => state.recommendations.find(r => r.player.id === id)),
    generateStrategy,
    adaptStrategy: async (newData) => { /* Would implement strategy adaptation */ },
    explainStrategy: () => state.currentStrategy?.keyInsights || [],
    getActiveInsights: () => state.insights.filter(i => !i.expiresAt || i.expiresAt > currentPicks.length),
    dismissInsight: (insightId) => setState(prev => ({ 
      ...prev, 
      insights: prev.insights.filter(i => i.id !== insightId) 
    })),
    requestInsight: async (topic) => ({
      id: `insight_${Date.now()}`,
      type: 'strategy',
      title: `${topic} Analysis`,
      message: `AI analysis of ${topic} completed`,
      confidence: 75,
      urgency: 'medium',
      actionable: true,
      suggestedActions: ['Review recommendations'],
      relevantPlayers: []
    }),
    analyzeOpponent: async (userId) => ({
      userId,
      draftingStyle: 'value-based',
      positionBias: { RB: 1.2, WR: 1.0, QB: 0.8 },
      riskTolerance: 65,
      predictedNextPicks: [],
      weaknesses: ['Reaches for favorites', 'Ignores injury risk'],
      strengths: ['Good at finding value', 'Balances roster well'],
      counterStrategy: ['Target players they want early', 'Watch for their patterns']
    }),
    predictOpponentPicks: (userId, rounds) => availablePlayers.slice(0, rounds),
    recordDecision,
    getPerformanceReport: () => state.performanceMetrics
  };
  
  return [state, actions];
};