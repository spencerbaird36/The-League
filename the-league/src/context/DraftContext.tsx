import React, { createContext, useContext, useReducer, useRef, useEffect, ReactNode } from 'react';
import { Player } from '../types/Player';
import { draftService } from '../services/draftService';

// Sound utility functions
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a pleasant notification sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.1); // C#5
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2); // E5
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};


const playWarningSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create an urgent warning sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High pitch
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

// Types for the draft state
export interface DraftState {
  id: number;
  leagueId: number;
  leagueName: string;
  draftOrder: number[];
  currentTurn: number;
  currentRound: number;
  isActive: boolean;
  isCompleted: boolean;
  startedAt?: string;
  draftPicks: DraftPick[];
}

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

export interface LeagueMember {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

// Timer state
export interface TimerState {
  isDrafting: boolean;
  isPaused: boolean;
  timeRemaining: number;
  timerStartTime: number | null;
  hasWarned: boolean;
  timeoutMessage: string;
}

// Combined draft context state
export interface DraftContextState {
  // Draft state
  draftState: DraftState | null;
  isDraftCreated: boolean;
  leagueMembers: LeagueMember[];
  
  // Timer state
  timer: TimerState;
  
  // Local roster state (for display purposes)
  localRosters: {
    [userId: number]: Player[];
  };
  
  // UI state
  isAutoDrafting: boolean;
  autoDraftMessage: string;
  selectedPosition: string;
  selectedLeague: string;
  
  // Loading states
  isLoading: {
    draftState: boolean;
    makingPick: boolean;
  };
  
  // Draft reset trigger (for refreshing components when draft is reset)
  draftResetTrigger: number;
}

// Action types
export type DraftAction =
  | { type: 'SET_DRAFT_STATE'; payload: DraftState | null }
  | { type: 'SET_DRAFT_CREATED'; payload: boolean }
  | { type: 'SET_LEAGUE_MEMBERS'; payload: LeagueMember[] }
  | { type: 'START_TIMER'; payload: { duration: number } }
  | { type: 'PAUSE_TIMER' }
  | { type: 'RESUME_TIMER' }
  | { type: 'RESET_TIMER'; payload: { duration: number } }
  | { type: 'UPDATE_TIME_REMAINING'; payload: number }
  | { type: 'SET_WARNING'; payload: boolean }
  | { type: 'SET_TIMEOUT_MESSAGE'; payload: string }
  | { type: 'MAKE_DRAFT_PICK'; payload: { userId: number; player: Player; draftPick: DraftPick } }
  | { type: 'ADD_TO_LOCAL_ROSTER'; payload: { userId: number; player: Player } }
  | { type: 'CLEAR_LOCAL_ROSTERS' }
  | { type: 'SYNC_ROSTERS_FROM_PICKS'; payload: DraftPick[] }
  | { type: 'SET_AUTO_DRAFTING'; payload: boolean }
  | { type: 'SET_AUTO_DRAFT_MESSAGE'; payload: string }
  | { type: 'SET_SELECTED_POSITION'; payload: string }
  | { type: 'SET_SELECTED_LEAGUE'; payload: string }
  | { type: 'SET_LOADING_DRAFT_STATE'; payload: boolean }
  | { type: 'SET_LOADING_MAKING_PICK'; payload: boolean }
  | { type: 'ADVANCE_TURN' }
  | { type: 'TIME_EXPIRED' }
  | { type: 'DRAFT_RESET' };

const initialState: DraftContextState = {
  draftState: null,
  isDraftCreated: false,
  leagueMembers: [],
  timer: {
    isDrafting: false,
    isPaused: false,
    timeRemaining: 15,
    timerStartTime: null,
    hasWarned: false,
    timeoutMessage: '',
  },
  localRosters: {},
  isAutoDrafting: false,
  autoDraftMessage: '',
  selectedPosition: 'ALL',
  selectedLeague: 'ALL',
  isLoading: {
    draftState: false,
    makingPick: false,
  },
  draftResetTrigger: 0,
};

function draftReducer(state: DraftContextState, action: DraftAction): DraftContextState {
  switch (action.type) {
    case 'SET_DRAFT_STATE':
      return {
        ...state,
        draftState: action.payload,
      };
      
    case 'SET_DRAFT_CREATED':
      return {
        ...state,
        isDraftCreated: action.payload,
      };
      
    case 'SET_LEAGUE_MEMBERS':
      return {
        ...state,
        leagueMembers: action.payload,
      };
      
    case 'START_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          isDrafting: true,
          isPaused: false,
          timeRemaining: action.payload.duration,
          timerStartTime: Date.now(),
          hasWarned: false,
          timeoutMessage: '',
        },
      };
      
    case 'PAUSE_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          isPaused: true,
        },
      };
      
    case 'RESUME_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          isPaused: false,
        },
      };
      
    case 'RESET_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          isDrafting: false,
          isPaused: false,
          timeRemaining: action.payload.duration,
          timerStartTime: null,
          hasWarned: false,
        },
      };
      
    case 'UPDATE_TIME_REMAINING':
      return {
        ...state,
        timer: {
          ...state.timer,
          timeRemaining: action.payload,
        },
      };
      
    case 'SET_WARNING':
      return {
        ...state,
        timer: {
          ...state.timer,
          hasWarned: action.payload,
        },
      };
      
    case 'SET_TIMEOUT_MESSAGE':
      return {
        ...state,
        timer: {
          ...state.timer,
          timeoutMessage: action.payload,
        },
      };
      
    case 'MAKE_DRAFT_PICK':
      // Update draft state with new pick and advance turn
      const updatedDraftState = state.draftState ? {
        ...state.draftState,
        draftPicks: [...state.draftState.draftPicks, action.payload.draftPick],
        currentTurn: (state.draftState.currentTurn + 1) % state.draftState.draftOrder.length,
        currentRound: state.draftState.currentTurn + 1 >= state.draftState.draftOrder.length ? 
          state.draftState.currentRound + 1 : state.draftState.currentRound,
      } : null;
      
      return {
        ...state,
        draftState: updatedDraftState,
        localRosters: {
          ...state.localRosters,
          [action.payload.userId]: [
            ...(state.localRosters[action.payload.userId] || []),
            action.payload.player,
          ],
        },
        timer: {
          ...state.timer,
          isDrafting: true, // Keep drafting active for next turn
          timeRemaining: 15, // Reset timer for next turn
          timeoutMessage: '',
          hasWarned: false,
          timerStartTime: Date.now(),
        },
      };
      
    case 'ADD_TO_LOCAL_ROSTER':
      return {
        ...state,
        localRosters: {
          ...state.localRosters,
          [action.payload.userId]: [
            ...(state.localRosters[action.payload.userId] || []),
            action.payload.player,
          ],
        },
      };
      
    case 'CLEAR_LOCAL_ROSTERS':
      return {
        ...state,
        localRosters: {},
      };
      
    case 'SYNC_ROSTERS_FROM_PICKS':
      // Rebuild local rosters from all draft picks
      const newRosters: { [userId: number]: Player[] } = {};
      
      action.payload.forEach(pick => {
        const player = draftService.draftPickToPlayer(pick);
        if (!newRosters[pick.userId]) {
          newRosters[pick.userId] = [];
        }
        newRosters[pick.userId].push(player);
      });
      
      return {
        ...state,
        localRosters: newRosters,
      };
      
    case 'SET_AUTO_DRAFTING':
      return {
        ...state,
        isAutoDrafting: action.payload,
      };
      
    case 'SET_AUTO_DRAFT_MESSAGE':
      return {
        ...state,
        autoDraftMessage: action.payload,
      };
      
    case 'SET_SELECTED_POSITION':
      return {
        ...state,
        selectedPosition: action.payload,
      };
      
    case 'SET_SELECTED_LEAGUE':
      return {
        ...state,
        selectedLeague: action.payload,
      };
      
    case 'SET_LOADING_DRAFT_STATE':
      return {
        ...state,
        isLoading: {
          ...state.isLoading,
          draftState: action.payload,
        },
      };
      
    case 'SET_LOADING_MAKING_PICK':
      return {
        ...state,
        isLoading: {
          ...state.isLoading,
          makingPick: action.payload,
        },
      };
      
    case 'ADVANCE_TURN':
      if (!state.draftState) return state;
      
      return {
        ...state,
        draftState: {
          ...state.draftState,
          currentTurn: (state.draftState.currentTurn + 1) % state.draftState.draftOrder.length,
          currentRound: state.draftState.currentTurn + 1 >= state.draftState.draftOrder.length ? 
            state.draftState.currentRound + 1 : state.draftState.currentRound,
        },
      };
      
    case 'TIME_EXPIRED':
      return {
        ...state,
        timer: {
          ...state.timer,
          timeRemaining: 0,
          // Don't set isDrafting to false - let the pick handler restart the timer
        },
      };
      
    case 'DRAFT_RESET':
      return {
        ...initialState, // Reset to initial state
        draftResetTrigger: Date.now(), // Update trigger to refresh components
      };
      
    default:
      return state;
  }
}

// Context
const DraftContext = createContext<{
  state: DraftContextState;
  dispatch: React.Dispatch<DraftAction>;
} | null>(null);

// Provider component
interface DraftProviderProps {
  children: ReactNode;
}

export function DraftProvider({ children }: DraftProviderProps) {
  const [state, dispatch] = useReducer(draftReducer, initialState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousTurnRef = useRef<number | null>(null);
  const warningPlayedRef = useRef<boolean>(false);

  // Timer effect with real countdown
  useEffect(() => {
    if (state.timer.isDrafting && !state.timer.isPaused && state.timer.timeRemaining > 0) {
      // Set up an interval to countdown every second
      timerRef.current = setInterval(() => {
        const newTime = state.timer.timeRemaining - 1;
        
        // Set warning at 5 seconds remaining and play warning sound
        if (newTime === 5 && !state.timer.hasWarned && !warningPlayedRef.current) {
          dispatch({ type: 'SET_WARNING', payload: true });
          try {
            playWarningSound();
            warningPlayedRef.current = true;
          } catch (error) {
            console.warn('Failed to play warning sound:', error);
          }
        }
        
        // Time expired
        if (newTime <= 0) {
          console.log('⏰ Context: Timer reached 0, dispatching TIME_EXPIRED');
          dispatch({ type: 'TIME_EXPIRED' });
          // Clear the interval to prevent negative countdown
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        } else {
          console.log('⏰ Context: Timer countdown:', newTime);
          dispatch({ type: 'UPDATE_TIME_REMAINING', payload: newTime });
        }
      }, 1000);
    } else if (state.timer.isDrafting && state.timer.isPaused) {
      // Clear timer when paused
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
    };
  }, [state.timer.isDrafting, state.timer.isPaused, state.timer.timeRemaining, state.timer.hasWarned]);

  // Effect to detect turn changes and play notification sound
  useEffect(() => {
    if (state.draftState?.isActive && state.draftState?.currentTurn !== undefined) {
      const currentTurn = state.draftState.currentTurn;
      
      // If the turn has changed from previous
      if (previousTurnRef.current !== null && previousTurnRef.current !== currentTurn) {
        try {
          playNotificationSound();
          console.log('🔊 Turn changed - playing notification sound');
        } catch (error) {
          console.warn('Failed to play turn notification sound:', error);
        }
      }
      
      // Update the previous turn reference
      previousTurnRef.current = currentTurn;
    }
  }, [state.draftState?.currentTurn, state.draftState?.isActive]);

  // Reset warning played flag when timer resets
  useEffect(() => {
    if (state.timer.timeRemaining === 15) {
      warningPlayedRef.current = false;
    }
  }, [state.timer.timeRemaining]);

  return (
    <DraftContext.Provider value={{ state, dispatch }}>
      {children}
    </DraftContext.Provider>
  );
}

// Custom hook to use the draft context
export function useDraft() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
}