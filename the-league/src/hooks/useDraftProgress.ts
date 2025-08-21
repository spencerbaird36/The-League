import { useState, useCallback, useMemo } from 'react';
import { DraftPick } from './useDraftState';
import { Player } from '../types/Player';

export interface DraftSlot {
  round: number;
  pick: number;
  pickNumber: number;
  userId: number;
  player: Player | null;
  isCurrentPick: boolean;
  isUserPick: boolean;
}

export interface RosterSlot {
  position: string;
  player: Player | null;
  isFilled: boolean;
  isStarter: boolean;
}

export interface TeamRoster {
  userId: number;
  slots: RosterSlot[];
  filledSlots: number;
  totalSlots: number;
  completionPercentage: number;
}

export interface DraftProgress {
  // Draft board visualization
  getDraftBoard: () => DraftSlot[][];
  getDraftSlot: (round: number, pick: number) => DraftSlot | null;
  
  // Team roster tracking  
  getTeamRoster: (userId: number) => TeamRoster;
  getAllTeamRosters: () => TeamRoster[];
  
  // Progress metrics
  getDraftCompletionPercentage: () => number;
  getRoundsRemaining: () => number;
  getPicksRemaining: () => number;
  
  // Position tracking
  getPositionFillStatus: () => Record<string, { filled: number; total: number }>;
  getMostNeededPositions: () => string[];
}

// Standard roster configuration - adjust based on league settings
const ROSTER_CONFIG = {
  // NFL positions
  QB: { count: 2, starters: 1 },
  RB: { count: 4, starters: 2 },
  WR: { count: 4, starters: 2 },
  TE: { count: 2, starters: 1 },
  
  // MLB positions
  SP: { count: 3, starters: 3 }, // Starting Pitcher
  CP: { count: 2, starters: 2 }, // Closer/Relief
  'C': { count: 1, starters: 1 }, // Catcher
  '1B': { count: 2, starters: 1 },
  '2B': { count: 2, starters: 1 },
  '3B': { count: 2, starters: 1 },
  'SS': { count: 2, starters: 1 },
  'OF': { count: 3, starters: 3 }, // Outfield
  'DH': { count: 1, starters: 1 },
  
  // NBA positions
  PG: { count: 2, starters: 1 },
  SG: { count: 2, starters: 1 },
  SF: { count: 2, starters: 1 },
  PF: { count: 2, starters: 1 }
};

const TOTAL_ROUNDS = 15;

export const useDraftProgress = (
  draftOrder: number[],
  picks: DraftPick[],
  currentTurn: number,
  currentUserId?: number
): DraftProgress => {
  
  const [cachedBoard, setCachedBoard] = useState<DraftSlot[][] | null>(null);
  
  // Create draft board matrix
  const getDraftBoard = useCallback((): DraftSlot[][] => {
    if (cachedBoard) return cachedBoard;
    
    const board: DraftSlot[][] = [];
    const totalPlayers = draftOrder.length;
    
    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
      const roundSlots: DraftSlot[] = [];
      
      for (let pickInRound = 0; pickInRound < totalPlayers; pickInRound++) {
        // Snake draft logic - reverse order on odd rounds
        const userIndex = (round % 2 === 1) 
          ? pickInRound 
          : totalPlayers - 1 - pickInRound;
          
        const userId = draftOrder[userIndex];
        const pickNumber = (round - 1) * totalPlayers + pickInRound + 1;
        
        // Find if this slot has been filled
        const existingPick = picks.find(pick => pick.pickNumber === pickNumber);
        const player = existingPick ? {
          id: String(existingPick.id || 0),
          name: existingPick.playerName,
          position: existingPick.playerPosition,
          team: existingPick.playerTeam,
          league: existingPick.playerLeague as 'NFL' | 'NBA' | 'MLB'
        } : null;
        
        roundSlots.push({
          round,
          pick: pickInRound + 1,
          pickNumber,
          userId,
          player,
          isCurrentPick: pickNumber === currentTurn + 1,
          isUserPick: userId === currentUserId
        });
      }
      
      board.push(roundSlots);
    }
    
    setCachedBoard(board);
    return board;
  }, [draftOrder, picks, currentTurn, currentUserId, cachedBoard]);
  
  // Clear cache when picks change
  useMemo(() => {
    setCachedBoard(null);
  }, [picks.length, currentTurn]);
  
  const getDraftSlot = useCallback((round: number, pick: number): DraftSlot | null => {
    const board = getDraftBoard();
    if (round < 1 || round > board.length) return null;
    if (pick < 1 || pick > board[round - 1].length) return null;
    
    return board[round - 1][pick - 1];
  }, [getDraftBoard]);
  
  const getTeamRoster = useCallback((userId: number): TeamRoster => {
    const userPicks = picks.filter(pick => pick.userId === userId);
    const positionCounts = userPicks.reduce((acc, pick) => {
      acc[pick.playerPosition] = (acc[pick.playerPosition] || []).concat([pick]);
      return acc;
    }, {} as Record<string, DraftPick[]>);
    
    const slots: RosterSlot[] = [];
    let filledSlots = 0;
    let totalSlots = 0;
    
    // Create roster slots based on configuration
    Object.entries(ROSTER_CONFIG).forEach(([position, config]) => {
      const playerPicks = positionCounts[position] || [];
      
      for (let i = 0; i < config.count; i++) {
        const pick = playerPicks[i];
        const player = pick ? {
          id: String(pick.id || 0),
          name: pick.playerName,
          position: pick.playerPosition,
          team: pick.playerTeam,
          league: pick.playerLeague as 'NFL' | 'NBA' | 'MLB'
        } : null;
        
        slots.push({
          position,
          player,
          isFilled: !!player,
          isStarter: i < config.starters
        });
        
        if (player) filledSlots++;
        totalSlots++;
      }
    });
    
    return {
      userId,
      slots,
      filledSlots,
      totalSlots,
      completionPercentage: totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0
    };
  }, [picks]);
  
  const getAllTeamRosters = useCallback((): TeamRoster[] => {
    return draftOrder.map(userId => getTeamRoster(userId));
  }, [draftOrder, getTeamRoster]);
  
  const getDraftCompletionPercentage = useCallback((): number => {
    const totalPossiblePicks = draftOrder.length * TOTAL_ROUNDS;
    return totalPossiblePicks > 0 ? (picks.length / totalPossiblePicks) * 100 : 0;
  }, [picks.length, draftOrder.length]);
  
  const getRoundsRemaining = useCallback((): number => {
    const currentRound = Math.floor(currentTurn / draftOrder.length) + 1;
    return Math.max(0, TOTAL_ROUNDS - currentRound + 1);
  }, [currentTurn, draftOrder.length]);
  
  const getPicksRemaining = useCallback((): number => {
    const totalPicks = draftOrder.length * TOTAL_ROUNDS;
    return Math.max(0, totalPicks - picks.length);
  }, [picks.length, draftOrder.length]);
  
  const getPositionFillStatus = useCallback((): Record<string, { filled: number; total: number }> => {
    const status: Record<string, { filled: number; total: number }> = {};
    
    Object.entries(ROSTER_CONFIG).forEach(([position, config]) => {
      const totalSlots = config.count * draftOrder.length;
      const filledSlots = picks.filter(pick => pick.playerPosition === position).length;
      
      status[position] = {
        filled: filledSlots,
        total: totalSlots
      };
    });
    
    return status;
  }, [picks, draftOrder.length]);
  
  const getMostNeededPositions = useCallback((): string[] => {
    const fillStatus = getPositionFillStatus();
    
    return Object.entries(fillStatus)
      .map(([position, status]) => ({
        position,
        fillPercentage: status.total > 0 ? status.filled / status.total : 1,
        remaining: status.total - status.filled
      }))
      .filter(item => item.remaining > 0)
      .sort((a, b) => a.fillPercentage - b.fillPercentage)
      .map(item => item.position);
  }, [getPositionFillStatus]);
  
  return {
    getDraftBoard,
    getDraftSlot,
    getTeamRoster,
    getAllTeamRosters,
    getDraftCompletionPercentage,
    getRoundsRemaining,
    getPicksRemaining,
    getPositionFillStatus,
    getMostNeededPositions
  };
};