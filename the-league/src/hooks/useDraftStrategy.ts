import { useState, useCallback, useMemo } from 'react';
import { Player } from '../types/Player';
import { DraftPick } from './useDraftState';

export interface DraftStrategy {
  id: string;
  name: string;
  description: string;
  priorities: { position: string; priority: number; rounds: number[] }[];
  valueThresholds: { position: string; minValue: number }[];
  flexibilityScore: number; // 0-100, how adaptive the strategy is
}

export interface MockDraftResult {
  picks: DraftPick[];
  yourTeam: DraftPick[];
  grade: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  estimatedFinish: number;
}

export interface WhatIfScenario {
  id: string;
  name: string;
  description: string;
  modifications: {
    type: 'draft_player' | 'skip_player' | 'trade_up' | 'trade_down';
    targetPlayer?: Player;
    pickNumber?: number;
    userId?: number;
  }[];
  result?: MockDraftResult;
}

export interface AuctionValue {
  player: Player;
  estimatedValue: number;
  recommendedBid: number;
  tier: number;
  inflationAdjusted: number;
}

export interface DraftStrategyTools {
  // Strategy management
  getAvailableStrategies: () => DraftStrategy[];
  setActiveStrategy: (strategyId: string) => void;
  getActiveStrategy: () => DraftStrategy | null;
  createCustomStrategy: (strategy: Omit<DraftStrategy, 'id'>) => DraftStrategy;
  
  // Mock drafting
  runMockDraft: (strategy: DraftStrategy, rounds?: number) => Promise<MockDraftResult>;
  getAIDraftPick: (availablePlayers: Player[], pickNumber: number, teamPicks: DraftPick[]) => Player;
  
  // What-if scenarios
  createScenario: (scenario: Omit<WhatIfScenario, 'id'>) => WhatIfScenario;
  runScenario: (scenario: WhatIfScenario) => Promise<WhatIfScenario>;
  compareScenarios: (scenarios: WhatIfScenario[]) => any;
  
  // Value-based drafting
  generateAuctionValues: (budget: number, inflationRate: number) => AuctionValue[];
  getPlayerValue: (player: Player, format: 'standard' | 'ppr' | 'auction') => number;
  calculateReplacement: (position: string) => number;
  
  // Strategy recommendations
  recommendStrategy: (userPreferences: any, leagueSettings: any) => DraftStrategy;
  adaptStrategy: (currentStrategy: DraftStrategy, draftState: any) => DraftStrategy;
  getNextPickRecommendation: (strategy: DraftStrategy, availablePlayers: Player[]) => Player[];
}

// Pre-built draft strategies
const DRAFT_STRATEGIES: DraftStrategy[] = [
  {
    id: 'robust_rb',
    name: 'Robust RB',
    description: 'Prioritize elite RBs early, build depth at skill positions',
    priorities: [
      { position: 'RB', priority: 100, rounds: [1, 2, 3] },
      { position: 'WR', priority: 80, rounds: [3, 4, 5] },
      { position: 'QB', priority: 60, rounds: [6, 7, 8] },
      { position: 'TE', priority: 40, rounds: [9, 10] }
    ],
    valueThresholds: [
      { position: 'RB', minValue: 85 },
      { position: 'WR', minValue: 75 },
      { position: 'QB', minValue: 65 }
    ],
    flexibilityScore: 70
  },
  {
    id: 'zero_rb',
    name: 'Zero RB',
    description: 'Fade RBs early, focus on WRs and late-round RB value',
    priorities: [
      { position: 'WR', priority: 100, rounds: [1, 2, 3, 4] },
      { position: 'QB', priority: 80, rounds: [5, 6] },
      { position: 'TE', priority: 70, rounds: [7, 8] },
      { position: 'RB', priority: 90, rounds: [9, 10, 11, 12] }
    ],
    valueThresholds: [
      { position: 'WR', minValue: 80 },
      { position: 'QB', minValue: 70 },
      { position: 'RB', minValue: 50 }
    ],
    flexibilityScore: 85
  },
  {
    id: 'balanced',
    name: 'Balanced Approach',
    description: 'Take best available player regardless of position',
    priorities: [
      { position: 'RB', priority: 85, rounds: [1, 2, 3, 4, 5] },
      { position: 'WR', priority: 85, rounds: [1, 2, 3, 4, 5] },
      { position: 'QB', priority: 70, rounds: [6, 7, 8] },
      { position: 'TE', priority: 60, rounds: [8, 9, 10] }
    ],
    valueThresholds: [
      { position: 'RB', minValue: 70 },
      { position: 'WR', minValue: 70 },
      { position: 'QB', minValue: 60 }
    ],
    flexibilityScore: 95
  },
  {
    id: 'pitcher_heavy',
    name: 'Pitcher Heavy (MLB)',
    description: 'Dominate pitching categories with elite starters and closers',
    priorities: [
      { position: 'SP', priority: 100, rounds: [1, 2, 3, 4, 5] },
      { position: 'CP', priority: 90, rounds: [6, 7, 8] },
      { position: 'OF', priority: 80, rounds: [9, 10, 11] },
      { position: '1B', priority: 70, rounds: [12, 13] }
    ],
    valueThresholds: [
      { position: 'SP', minValue: 80 },
      { position: 'CP', minValue: 70 },
      { position: 'OF', minValue: 60 }
    ],
    flexibilityScore: 60
  },
  {
    id: 'hitting_first',
    name: 'Hitting First (MLB)',
    description: 'Secure elite hitters early, stream pitching',
    priorities: [
      { position: 'OF', priority: 100, rounds: [1, 2, 3] },
      { position: '1B', priority: 90, rounds: [2, 3, 4] },
      { position: 'SS', priority: 85, rounds: [4, 5] },
      { position: 'SP', priority: 70, rounds: [8, 9, 10] }
    ],
    valueThresholds: [
      { position: 'OF', minValue: 85 },
      { position: '1B', minValue: 80 },
      { position: 'SS', minValue: 75 }
    ],
    flexibilityScore: 75
  }
];

// Simple AI logic for mock drafts
const AI_DRAFT_LOGIC = {
  getPositionNeed: (teamPicks: DraftPick[], position: string): number => {
    const positionCounts = teamPicks.reduce((acc, pick) => {
      acc[pick.playerPosition] = (acc[pick.playerPosition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const current = positionCounts[position] || 0;
    const targets = { QB: 2, RB: 4, WR: 4, TE: 2, SP: 3, CP: 2 };
    const target = targets[position as keyof typeof targets] || 2;
    
    return Math.max(0, target - current);
  },
  
  calculatePlayerScore: (player: Player, pickNumber: number, need: number): number => {
    // Simple scoring algorithm
    const baseValue = Math.random() * 100; // Placeholder for actual player value
    const positionMultiplier = need > 0 ? 1.2 : 0.8;
    const pickPenalty = pickNumber * 0.5; // Later picks have penalty
    
    return Math.max(0, baseValue * positionMultiplier - pickPenalty);
  }
};

export const useDraftStrategy = (
  availablePlayers: Player[],
  currentPicks: DraftPick[],
  draftOrder: number[],
  userId?: number
): DraftStrategyTools => {
  
  const [activeStrategy, setActiveStrategyState] = useState<DraftStrategy | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  
  const getAvailableStrategies = useCallback((): DraftStrategy[] => {
    return DRAFT_STRATEGIES;
  }, []);
  
  const setActiveStrategy = useCallback((strategyId: string) => {
    const strategy = DRAFT_STRATEGIES.find(s => s.id === strategyId);
    setActiveStrategyState(strategy || null);
  }, []);
  
  const getActiveStrategy = useCallback((): DraftStrategy | null => {
    return activeStrategy;
  }, [activeStrategy]);
  
  const createCustomStrategy = useCallback((strategy: Omit<DraftStrategy, 'id'>): DraftStrategy => {
    const customStrategy: DraftStrategy = {
      ...strategy,
      id: `custom_${Date.now()}`
    };
    return customStrategy;
  }, []);
  
  const getAIDraftPick = useCallback((
    availablePlayersForAI: Player[], 
    pickNumber: number, 
    teamPicks: DraftPick[]
  ): Player => {
    if (availablePlayersForAI.length === 0) {
      throw new Error('No available players for AI pick');
    }
    
    // Score each available player
    const scoredPlayers = availablePlayersForAI.map(player => {
      const need = AI_DRAFT_LOGIC.getPositionNeed(teamPicks, player.position);
      const score = AI_DRAFT_LOGIC.calculatePlayerScore(player, pickNumber, need);
      return { player, score };
    });
    
    // Sort by score and add some randomness
    scoredPlayers.sort((a, b) => b.score - a.score);
    
    // Pick from top 5 with weighted randomness
    const topCandidates = scoredPlayers.slice(0, 5);
    const weights = [0.4, 0.25, 0.2, 0.1, 0.05];
    const random = Math.random();
    
    let cumulative = 0;
    for (let i = 0; i < topCandidates.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return topCandidates[i].player;
      }
    }
    
    return topCandidates[0].player;
  }, []);
  
  const runMockDraft = useCallback(async (
    strategy: DraftStrategy, 
    rounds: number = 15
  ): Promise<MockDraftResult> => {
    const mockPicks: DraftPick[] = [...currentPicks];
    const mockAvailable = [...availablePlayers];
    const userTeam: DraftPick[] = [];
    
    const totalPlayers = draftOrder.length;
    const totalPicks = rounds * totalPlayers;
    
    // Simulate remaining picks
    for (let pickNum = mockPicks.length + 1; pickNum <= totalPicks; pickNum++) {
      if (mockAvailable.length === 0) break;
      
      // Determine whose turn it is (snake draft)
      const round = Math.ceil(pickNum / totalPlayers);
      const posInRound = ((pickNum - 1) % totalPlayers) + 1;
      const userIndex = (round % 2 === 1) ? posInRound - 1 : totalPlayers - posInRound;
      const currentUserId = draftOrder[userIndex];
      
      // Get team's current picks
      const teamPicks = mockPicks.filter(pick => pick.userId === currentUserId);
      
      // Select player based on strategy (for user) or AI logic (for others)
      let selectedPlayer: Player;
      
      if (currentUserId === userId && strategy) {
        // Use strategy for user picks
        const roundNum = Math.ceil(pickNum / totalPlayers);
        const relevantPriorities = strategy.priorities.filter(p => 
          p.rounds.includes(roundNum)
        ).sort((a, b) => b.priority - a.priority);
        
        let bestPick: Player | null = null;
        
        for (const priority of relevantPriorities) {
          const positionPlayers = mockAvailable.filter(p => 
            p.position === priority.position
          );
          
          if (positionPlayers.length > 0) {
            bestPick = positionPlayers[0]; // Simplified - would use value calculation
            break;
          }
        }
        
        selectedPlayer = bestPick || mockAvailable[0];
      } else {
        // Use AI logic for other teams
        selectedPlayer = getAIDraftPick(mockAvailable, pickNum, teamPicks);
      }
      
      // Create mock pick
      const mockPick: DraftPick = {
        id: pickNum,
        userId: currentUserId,
        userFullName: `User ${currentUserId}`,
        username: `user${currentUserId}`,
        playerName: selectedPlayer.name,
        playerPosition: selectedPlayer.position,
        playerTeam: selectedPlayer.team,
        playerLeague: selectedPlayer.league,
        pickNumber: pickNum,
        round: Math.ceil(pickNum / totalPlayers),
        roundPick: ((pickNum - 1) % totalPlayers) + 1,
        pickedAt: new Date().toISOString()
      };
      
      mockPicks.push(mockPick);
      
      if (currentUserId === userId) {
        userTeam.push(mockPick);
      }
      
      // Remove player from available
      const playerIndex = mockAvailable.findIndex(p => p.id === selectedPlayer.id);
      if (playerIndex > -1) {
        mockAvailable.splice(playerIndex, 1);
      }
    }
    
    // Grade the user's team
    const score = Math.min(100, Math.max(0, 75 + Math.random() * 30)); // Placeholder
    let grade = 'C';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';
    
    return {
      picks: mockPicks,
      yourTeam: userTeam,
      grade,
      score,
      strengths: ['Good early picks', 'Solid depth'],
      weaknesses: score < 75 ? ['Weak at key positions'] : [],
      estimatedFinish: Math.ceil(Math.random() * draftOrder.length)
    };
  }, [currentPicks, availablePlayers, draftOrder, userId, getAIDraftPick]);
  
  const createScenario = useCallback((scenario: Omit<WhatIfScenario, 'id'>): WhatIfScenario => {
    const newScenario: WhatIfScenario = {
      ...scenario,
      id: `scenario_${Date.now()}`
    };
    
    setScenarios(prev => [...prev, newScenario]);
    return newScenario;
  }, []);
  
  const runScenario = useCallback(async (scenario: WhatIfScenario): Promise<WhatIfScenario> => {
    // Simplified scenario simulation
    const result = await runMockDraft(activeStrategy || DRAFT_STRATEGIES[0]);
    
    const updatedScenario: WhatIfScenario = {
      ...scenario,
      result
    };
    
    setScenarios(prev => prev.map(s => s.id === scenario.id ? updatedScenario : s));
    return updatedScenario;
  }, [activeStrategy, runMockDraft]);
  
  const compareScenarios = useCallback((scenarioList: WhatIfScenario[]) => {
    return scenarioList
      .filter(s => s.result)
      .map(s => ({
        id: s.id,
        name: s.name,
        grade: s.result!.grade,
        score: s.result!.score,
        estimatedFinish: s.result!.estimatedFinish
      }))
      .sort((a, b) => b.score - a.score);
  }, []);
  
  const generateAuctionValues = useCallback((budget: number, inflationRate: number): AuctionValue[] => {
    return availablePlayers.map((player, index) => {
      const baseValue = Math.max(1, 50 - index); // Simple declining value
      const inflationAdjusted = baseValue * (1 + inflationRate);
      const recommendedBid = Math.floor(inflationAdjusted * 0.95); // Bid slightly under
      
      return {
        player,
        estimatedValue: baseValue,
        recommendedBid,
        tier: Math.ceil((index + 1) / 12),
        inflationAdjusted
      };
    }).slice(0, 200); // Top 200 players
  }, [availablePlayers]);
  
  const getPlayerValue = useCallback((player: Player, format: 'standard' | 'ppr' | 'auction'): number => {
    // Simplified value calculation
    const baseValue = Math.random() * 100; // Would use actual projections
    
    const formatMultipliers = {
      standard: 1.0,
      ppr: player.position === 'WR' ? 1.2 : 1.0,
      auction: 1.1
    };
    
    return baseValue * formatMultipliers[format];
  }, []);
  
  const calculateReplacement = useCallback((position: string): number => {
    // Replacement level calculation
    const positionPlayers = availablePlayers.filter(p => p.position === position);
    const replacementIndex = Math.floor(positionPlayers.length * 0.7); // 70th percentile
    
    return getPlayerValue(positionPlayers[replacementIndex] || positionPlayers[0], 'standard');
  }, [availablePlayers, getPlayerValue]);
  
  const recommendStrategy = useCallback((userPreferences: any, leagueSettings: any): DraftStrategy => {
    // Simple recommendation logic
    if (leagueSettings?.scoring === 'ppr') {
      return DRAFT_STRATEGIES.find(s => s.id === 'zero_rb') || DRAFT_STRATEGIES[0];
    }
    
    return DRAFT_STRATEGIES.find(s => s.id === 'balanced') || DRAFT_STRATEGIES[0];
  }, []);
  
  const adaptStrategy = useCallback((currentStrategy: DraftStrategy, draftState: any): DraftStrategy => {
    // Simple adaptation - would be more sophisticated in practice
    return {
      ...currentStrategy,
      flexibilityScore: Math.min(100, currentStrategy.flexibilityScore + 5)
    };
  }, []);
  
  const getNextPickRecommendation = useCallback((
    strategy: DraftStrategy, 
    availablePlayersForRec: Player[]
  ): Player[] => {
    const currentRound = Math.ceil((currentPicks.length + 1) / draftOrder.length);
    
    // Find relevant strategy priorities for this round
    const relevantPriorities = strategy.priorities
      .filter(p => p.rounds.includes(currentRound))
      .sort((a, b) => b.priority - a.priority);
    
    const recommendations: Player[] = [];
    
    for (const priority of relevantPriorities) {
      const positionPlayers = availablePlayersForRec
        .filter(p => p.position === priority.position)
        .slice(0, 2);
      
      recommendations.push(...positionPlayers);
      
      if (recommendations.length >= 5) break;
    }
    
    // Fill with BPA if needed
    if (recommendations.length < 5) {
      const remaining = availablePlayersForRec
        .filter(p => !recommendations.includes(p))
        .slice(0, 5 - recommendations.length);
      
      recommendations.push(...remaining);
    }
    
    return recommendations.slice(0, 5);
  }, [currentPicks, draftOrder]);
  
  return {
    getAvailableStrategies,
    setActiveStrategy,
    getActiveStrategy,
    createCustomStrategy,
    runMockDraft,
    getAIDraftPick,
    createScenario,
    runScenario,
    compareScenarios,
    generateAuctionValues,
    getPlayerValue,
    calculateReplacement,
    recommendStrategy,
    adaptStrategy,
    getNextPickRecommendation
  };
};