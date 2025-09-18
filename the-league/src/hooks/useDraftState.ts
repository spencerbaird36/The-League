import { useState, useCallback, useRef } from 'react';
import { Player } from '../types/Player';

export interface DraftPick {
  id: number;
  userId: number;
  userFullName: string;
  username: string;
  playerName: string;
  playerId?: string | null; // Add playerId for filtering available players
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
  pickNumber: number;
  round: number;
  roundPick: number;
  pickedAt: string;
}

export interface DraftState {
  // Core draft info
  id?: number;
  leagueId?: number;
  leagueName?: string;
  
  // Draft progression
  currentTurn: number;
  currentRound: number;
  currentPickNumber: number;
  
  // Timer state
  timeRemaining: number;
  isTimerActive: boolean;
  
  // Draft status
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  
  // Participants
  draftOrder: number[];
  currentPlayerId: number;
  
  // Picks
  picks: DraftPick[];
  
  // Timestamps
  startedAt?: string;
  lastUpdateAt?: string;
}

export interface DraftStateActions {
  // State updates
  updateDraftState: (updates: Partial<DraftState>) => void;
  resetDraftState: () => void;
  
  // Draft progression
  advanceTurn: () => void;
  setCurrentPlayer: (userId: number) => void;
  
  // Timer actions
  setTimeRemaining: (time: number) => void;
  setTimerActive: (active: boolean) => void;
  
  // Pick management
  addPick: (pick: DraftPick) => void;
  
  // Utility functions
  getCurrentPlayer: () => number;
  isMyTurn: (userId: number) => boolean;
  getTotalPicks: () => number;
  getRemainingPicks: () => number;
}

const INITIAL_DRAFT_STATE: DraftState = {
  currentTurn: 0,
  currentRound: 1,
  currentPickNumber: 1,
  timeRemaining: 10, // 10 seconds for testing
  isTimerActive: false,
  isActive: false,
  isPaused: false,
  isCompleted: false,
  draftOrder: [],
  currentPlayerId: 0,
  picks: [],
};

export const useDraftState = (): [DraftState, DraftStateActions] => {
  const [state, setState] = useState<DraftState>(INITIAL_DRAFT_STATE);
  const stateRef = useRef<DraftState>(state);
  
  // Keep ref in sync with state for callbacks
  stateRef.current = state;

  const updateDraftState = useCallback((updates: Partial<DraftState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates, lastUpdateAt: new Date().toISOString() };
      console.log('🔄 Draft state updated:', updates);
      return newState;
    });
  }, []);

  const resetDraftState = useCallback(() => {
    console.log('🔄 Resetting draft state to initial values');
    setState(INITIAL_DRAFT_STATE);
  }, []);

  const advanceTurn = useCallback(() => {
    setState(prev => {
      const nextTurn = prev.currentTurn + 1;
      const nextPickNumber = prev.currentPickNumber + 1;
      
      // Calculate round based on draft order length
      const playersPerRound = prev.draftOrder.length;
      const nextRound = Math.floor(nextTurn / playersPerRound) + 1;
      
      // Determine next player ID based on snake draft logic
      let nextPlayerIndex: number;
      const roundIndex = Math.floor(nextTurn / playersPerRound);
      const positionInRound = nextTurn % playersPerRound;
      
      if (roundIndex % 2 === 0) {
        // Even rounds (0, 2, 4...): normal order
        nextPlayerIndex = positionInRound;
      } else {
        // Odd rounds (1, 3, 5...): reverse order (snake)
        nextPlayerIndex = playersPerRound - 1 - positionInRound;
      }
      
      const nextPlayerId = prev.draftOrder[nextPlayerIndex] || 0;
      
      const newState = {
        ...prev,
        currentTurn: nextTurn,
        currentRound: nextRound,
        currentPickNumber: nextPickNumber,
        currentPlayerId: nextPlayerId,
        timeRemaining: 10, // Reset timer for next turn
        lastUpdateAt: new Date().toISOString()
      };
      
      console.log('⏭️ Advanced to next turn:', {
        turn: nextTurn,
        round: nextRound,
        pick: nextPickNumber,
        playerId: nextPlayerId
      });
      
      return newState;
    });
  }, []);

  const setCurrentPlayer = useCallback((userId: number) => {
    updateDraftState({ currentPlayerId: userId });
  }, [updateDraftState]);

  const setTimeRemaining = useCallback((time: number) => {
    setState(prev => ({ ...prev, timeRemaining: time }));
  }, []);

  const setTimerActive = useCallback((active: boolean) => {
    setState(prev => ({ ...prev, isTimerActive: active }));
    console.log('⏰ Timer active state changed to:', active);
  }, []);

  const addPick = useCallback((pick: DraftPick) => {
    setState(prev => ({
      ...prev,
      picks: [...prev.picks, pick],
      lastUpdateAt: new Date().toISOString()
    }));
    console.log('✅ Added draft pick:', pick.playerName);
  }, []);

  const getCurrentPlayer = useCallback((): number => {
    return stateRef.current.currentPlayerId;
  }, []);

  const isMyTurn = useCallback((userId: number): boolean => {
    return stateRef.current.currentPlayerId === userId && stateRef.current.isActive;
  }, []);

  const getTotalPicks = useCallback((): number => {
    return stateRef.current.picks.length;
  }, []);

  const getRemainingPicks = useCallback((): number => {
    // Each team drafts 15 players
    const picksPerTeam = 15;
    const totalPlayers = stateRef.current.draftOrder.length;
    const totalDraftPicks = picksPerTeam * totalPlayers;
    return totalDraftPicks - stateRef.current.picks.length;
  }, []);

  const actions: DraftStateActions = {
    updateDraftState,
    resetDraftState,
    advanceTurn,
    setCurrentPlayer,
    setTimeRemaining,
    setTimerActive,
    addPick,
    getCurrentPlayer,
    isMyTurn,
    getTotalPicks,
    getRemainingPicks
  };

  return [state, actions];
};