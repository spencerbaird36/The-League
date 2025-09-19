import { useCallback, useRef, useEffect } from 'react';
import { useDraft } from '../context/DraftContext';
import { draftService } from '../services/draftService';
import signalRService from '../services/signalRService';
import { Player } from '../types/Player';
import { players } from '../data/players';

interface User {
  id: number;
  league?: {
    id: number;
    name: string;
  };
}

// Sound utility function for "your turn" notification
const playYourTurnSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a special "your turn" sound - more prominent and pleasant
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play a chord progression that sounds like "your turn!"
    oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator1.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
    oscillator1.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3); // G5
    
    oscillator2.frequency.setValueAtTime(261.63, audioContext.currentTime); // C4 (octave lower)
    oscillator2.frequency.setValueAtTime(329.63, audioContext.currentTime + 0.15); // E4
    oscillator2.frequency.setValueAtTime(392, audioContext.currentTime + 0.3); // G4
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.8);
    oscillator2.stop(audioContext.currentTime + 0.8);
  } catch (error) {
    console.warn('Failed to play your turn sound:', error);
  }
};

export function useDraftOperations(user: User | null) {
  const { state, dispatch } = useDraft();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cachedMembersRef = useRef<any[]>([]);
  const lastDraftStateRef = useRef<string>('');
  const previousUserTurnRef = useRef<boolean>(false);

  // Get all drafted players from draft picks
  const getAllDraftedPlayers = useCallback((): Player[] => {
    if (!state.draftState?.draftPicks) return [];
    
    return state.draftState.draftPicks.map(pick => 
      draftService.draftPickToPlayer(pick)
    );
  }, [state.draftState?.draftPicks]);

  // Get available players (not yet drafted) with projection data from API
  const getAvailablePlayers = useCallback(async (): Promise<Player[]> => {
    if (!user?.league?.id) return [];

    try {
      // Fetch players with projection data from backend API
      const playersWithProjections = await draftService.fetchAvailablePlayersForDraft(user.league.id);
      console.log(`🎯 Fetched ${playersWithProjections.length} players with projections for auto-draft`);
      return playersWithProjections;
    } catch (error) {
      console.error('Error fetching available players for auto-draft:', error);
      // Fallback to static data if API fails (but this will be empty)
      const draftedPlayers = getAllDraftedPlayers();
      return players.filter(player =>
        !draftedPlayers.some(drafted => drafted.id === player.id)
      );
    }
  }, [getAllDraftedPlayers, user?.league?.id]);

  // Get needed positions for a user's roster
  const getNeededPositions = useCallback((userId: number): string[] => {
    const userRoster = state.localRosters[userId] || [];
    const neededPositions: string[] = [];
    
    // NHL roster positions
    const nflPositionsCount: {[key: string]: number} = {};
    const mlbPositionsCount: {[key: string]: number} = {};
    const nbaPositionsCount: {[key: string]: number} = {};
    
    userRoster.forEach(player => {
      if (player.league === 'NFL') {
        nflPositionsCount[player.position] = (nflPositionsCount[player.position] || 0) + 1;
      } else if (player.league === 'MLB') {
        const pos = player.position === 'CP' ? 'CL' : player.position;
        mlbPositionsCount[pos] = (mlbPositionsCount[pos] || 0) + 1;
      } else if (player.league === 'NBA') {
        nbaPositionsCount[player.position] = (nbaPositionsCount[player.position] || 0) + 1;
      }
    });
    
    // Check NFL needs (max 12: 7 starters + 5 bench)
    const nflCount = Object.values(nflPositionsCount).reduce((sum, count) => sum + count, 0);
    if (nflCount < 12) {
      if (!nflPositionsCount['QB']) neededPositions.push('QB');
      if (!nflPositionsCount['TE']) neededPositions.push('TE');
      if ((nflPositionsCount['RB'] || 0) < 2) neededPositions.push('RB');
      if ((nflPositionsCount['WR'] || 0) < 3) neededPositions.push('WR');
    }
    
    // Check MLB needs (max 14: 9 starters + 5 bench)
    const mlbCount = Object.values(mlbPositionsCount).reduce((sum, count) => sum + count, 0);
    if (mlbCount < 14) {
      const mlbRosterNeeds = {
        'SP': 1,
        'CL': 1,
        '1B': 1,
        '2B': 1,
        '3B': 1,
        'SS': 1,
        'OF': 3
      };
      
      Object.entries(mlbRosterNeeds).forEach(([pos, needed]) => {
        const currentCount = mlbPositionsCount[pos] || 0;
        const stillNeeded = needed - currentCount;
        
        for (let i = 0; i < stillNeeded; i++) {
          if (pos === 'CL') {
            neededPositions.push('CP');
          } else {
            neededPositions.push(pos);
          }
        }
      });
    }
    
    // Check NBA needs (max 8: 5 starters + 3 bench)
    const nbaCount = Object.values(nbaPositionsCount).reduce((sum, count) => sum + count, 0);
    if (nbaCount < 8) {
      const nbaRosterPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
      nbaRosterPositions.forEach(pos => {
        if (!nbaPositionsCount[pos]) {
          neededPositions.push(pos);
        }
      });
    }
    
    return neededPositions;
  }, [state.localRosters]);

  // Fetch draft state
  const fetchDraftState = useCallback(async () => {
    if (!user?.league?.id || state.isLoading.draftState) {
      return;
    }

    dispatch({ type: 'SET_LOADING_DRAFT_STATE', payload: true });

    try {
      const [draftState, members] = await Promise.all([
        draftService.fetchDraftState(user.league.id),
        cachedMembersRef.current.length > 0 ? 
          Promise.resolve(cachedMembersRef.current) : 
          draftService.fetchLeagueMembers(user.league.id)
      ]);

      // Cache members if we fetched them
      if (cachedMembersRef.current.length === 0) {
        cachedMembersRef.current = members;
      }

      // Check if draft state actually changed
      const draftStateHash = JSON.stringify({
        currentTurn: draftState?.currentTurn,
        currentRound: draftState?.currentRound,
        picksCount: draftState?.draftPicks?.length || 0,
        isActive: draftState?.isActive,
        isCompleted: draftState?.isCompleted,
      });

      const isDraftStateChanged = lastDraftStateRef.current !== draftStateHash;
      lastDraftStateRef.current = draftStateHash;

      if (isDraftStateChanged) {
        console.log('🔄 Draft state changed - updating');
        console.log('📋 Setting league members:', members?.length || 0, 'members', members);
        dispatch({ type: 'SET_DRAFT_STATE', payload: draftState });
        dispatch({ type: 'SET_LEAGUE_MEMBERS', payload: members });
        dispatch({ type: 'SET_DRAFT_CREATED', payload: !!draftState });
        
        // Sync local rosters with all draft picks
        if (draftState?.draftPicks) {
          dispatch({ type: 'SYNC_ROSTERS_FROM_PICKS', payload: draftState.draftPicks });
          console.log(`📋 Synced local rosters with ${draftState.draftPicks.length} draft picks`);
        }
      } else {
        console.log('⏸️ Draft state unchanged');
      }
    } catch (error) {
      console.error('Error fetching draft state:', error);
    } finally {
      dispatch({ type: 'SET_LOADING_DRAFT_STATE', payload: false });
    }
  }, [user?.league?.id, state.isLoading.draftState, dispatch]);

  // Make a draft pick
  const makeDraftPick = useCallback(async (player: Player): Promise<void> => {
    if (!state.draftState || !user?.id || state.isLoading.makingPick) {
      throw new Error('Cannot make draft pick - invalid state');
    }

    // Calculate current user using snake draft logic (match backend implementation)
    const draftOrder = state.draftState.draftOrder;
    const teamCount = draftOrder.length;
    const totalPicks = state.draftState.draftPicks?.length || 0;
    
    const currentRoundIndex = Math.floor(totalPicks / teamCount);
    const currentPickInRound = totalPicks % teamCount;
    
    let currentUserIndex;
    if (currentRoundIndex % 2 === 0) {
      // Even round - forward order
      currentUserIndex = currentPickInRound;
    } else {
      // Odd round - reverse order (snake)
      currentUserIndex = teamCount - 1 - currentPickInRound;
    }
    
    const currentUserId = currentUserIndex < draftOrder.length ? draftOrder[currentUserIndex] : 0;
    if (currentUserId !== user.id) {
      throw new Error('It is not your turn to draft');
    }

    dispatch({ type: 'SET_LOADING_MAKING_PICK', payload: true });

    try {
      const pickRequest = draftService.playerToDraftPickRequest(user.id, player);
      const pickResponse = await draftService.makeDraftPick(state.draftState.id, pickRequest);

      // Create the draft pick object
      const draftPick = {
        id: pickResponse.id,
        userId: pickResponse.userId,
        userFullName: pickResponse.userFullName,
        username: pickResponse.username,
        playerName: pickResponse.playerName,
        playerPosition: pickResponse.playerPosition,
        playerTeam: pickResponse.playerTeam,
        playerLeague: pickResponse.playerLeague,
        pickNumber: pickResponse.pickNumber,
        round: pickResponse.round,
        roundPick: pickResponse.roundPick,
        pickedAt: pickResponse.pickedAt,
      };

      // Update local state with the pick
      dispatch({
        type: 'MAKE_DRAFT_PICK',
        payload: {
          userId: user.id,
          player,
          draftPick,
        },
      });

      console.log(`✅ Successfully drafted ${player.name} for user ${user.id}`);
    } catch (error) {
      console.error('Error making draft pick:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING_MAKING_PICK', payload: false });
    }
  }, [state.draftState, user?.id, state.isLoading.makingPick, dispatch]);

  // Auto-draft for current turn (works for any user's turn)
  const performAutoDraft = useCallback(async (): Promise<void> => {
    if (!state.draftState) {
      throw new Error('Cannot perform auto-draft - invalid state');
    }

    // Calculate current user using snake draft logic (match backend implementation)
    const draftOrder = state.draftState.draftOrder;
    const teamCount = draftOrder.length;
    const totalPicks = state.draftState.draftPicks?.length || 0;
    
    const currentRoundIndex = Math.floor(totalPicks / teamCount);
    const currentPickInRound = totalPicks % teamCount;
    
    let currentUserIndex;
    if (currentRoundIndex % 2 === 0) {
      // Even round - forward order
      currentUserIndex = currentPickInRound;
    } else {
      // Odd round - reverse order (snake)
      currentUserIndex = teamCount - 1 - currentPickInRound;
    }
    
    const currentUserId = currentUserIndex < draftOrder.length ? draftOrder[currentUserIndex] : 0;
    console.log(`🤖 Timer expired - auto-drafting for user ${currentUserId}`);

    // Get available players from the API
    const availablePlayers = await getAvailablePlayers();
    const neededPositions = getNeededPositions(currentUserId);
    const draftedPlayers = getAllDraftedPlayers();

    const selectedPlayer = draftService.selectBestAvailablePlayer(
      availablePlayers,
      neededPositions,
      draftedPlayers
    );

    if (selectedPlayer) {
      console.log(`🤖 Auto-drafting ${selectedPlayer.name} for user ${currentUserId}`);
      
      try {
        // Make the draft pick request directly to the backend
        const pickRequest = draftService.playerToDraftPickRequest(currentUserId, selectedPlayer);
        const pickResponse = await draftService.makeDraftPick(state.draftState.id, pickRequest);

        // Create the draft pick object
        const draftPick = {
          id: pickResponse.id,
          userId: pickResponse.userId,
          userFullName: pickResponse.userFullName,
          username: pickResponse.username,
          playerName: pickResponse.playerName,
          playerPosition: pickResponse.playerPosition,
          playerTeam: pickResponse.playerTeam,
          playerLeague: pickResponse.playerLeague,
          pickNumber: pickResponse.pickNumber,
          round: pickResponse.round,
          roundPick: pickResponse.roundPick,
          pickedAt: pickResponse.pickedAt,
        };

        // Update local state with the pick
        dispatch({
          type: 'MAKE_DRAFT_PICK',
          payload: {
            userId: currentUserId,
            player: selectedPlayer,
            draftPick,
          },
        });

        dispatch({ 
          type: 'SET_TIMEOUT_MESSAGE', 
          payload: `Time expired! Auto-drafted ${selectedPlayer.name} (${selectedPlayer.position}, ${selectedPlayer.team})` 
        });

        // Clear message after 5 seconds
        setTimeout(() => {
          dispatch({ type: 'SET_TIMEOUT_MESSAGE', payload: '' });
        }, 5000);

        console.log(`✅ Successfully auto-drafted ${selectedPlayer.name} for user ${currentUserId}`);
      } catch (error) {
        console.error('Error making auto-draft pick:', error);
        throw error;
      }
    } else {
      console.warn('No available players for auto-draft');
      dispatch({ 
        type: 'SET_TIMEOUT_MESSAGE', 
        payload: 'Timer expired but no players available for auto-draft' 
      });
    }
  }, [state.draftState, getAvailablePlayers, getNeededPositions, getAllDraftedPlayers, dispatch]);

  // Handle timer expiration
  const handleTimerExpiration = useCallback(async (): Promise<void> => {
    console.log('⏰ Timer expired - performing auto-draft');
    try {
      await performAutoDraft();
    } catch (error) {
      console.error('Error during timer expiration auto-draft:', error);
      dispatch({ 
        type: 'SET_TIMEOUT_MESSAGE', 
        payload: 'Timer expired but auto-draft failed. Please make a selection.' 
      });
    }
  }, [performAutoDraft, dispatch]);

  // Create a new draft
  const createDraft = useCallback(async (leagueId: number): Promise<void> => {
    try {
      // First fetch league members to create draft order
      const members = await draftService.fetchLeagueMembers(leagueId);
      
      // Create randomized draft order
      const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
      const draftOrder = shuffledMembers.map(member => member.id);
      
      // Create the draft
      const createRequest = {
        leagueId: leagueId,
        draftOrder: draftOrder
      };
      
      const newDraft = await draftService.createDraft(createRequest);
      dispatch({ type: 'SET_DRAFT_STATE', payload: newDraft });
      dispatch({ type: 'SET_LEAGUE_MEMBERS', payload: members });
      dispatch({ type: 'SET_DRAFT_CREATED', payload: true });
      
      console.log('✅ Draft created successfully with randomized order');
    } catch (error) {
      console.error('❌ Error creating draft:', error);
      throw error;
    }
  }, [dispatch]);

  // Start draft and automatically start timer
  const startDraft = useCallback(async (): Promise<void> => {
    if (!state.draftState) {
      throw new Error('Cannot start draft - no draft state');
    }

    if (!user?.id) {
      throw new Error('Cannot start draft - no user ID available');
    }

    console.log('🚀 Attempting to start draft with user ID:', user.id);
    console.log('🚀 User object:', user);

    try {
      const updatedDraft = await draftService.startDraft(state.draftState.id, user.id);
      dispatch({ type: 'SET_DRAFT_STATE', payload: updatedDraft });
      // Automatically start the timer when draft begins
      dispatch({ type: 'START_TIMER', payload: { duration: 15 } });
      console.log('🚀 Draft started successfully with timer');
    } catch (error) {
      console.error('Error starting draft:', error);
      throw error;
    }
  }, [state.draftState, user?.id, dispatch]);

  // Reset draft using SignalR for real-time updates
  const resetDraft = useCallback(async (draftId: number): Promise<void> => {
    if (!user?.league?.id) {
      throw new Error('No league ID available');
    }

    try {
      // Try SignalR first for better real-time sync
      if (signalRService.isConnected()) {
        console.log('🔄 Attempting draft reset via SignalR...');
        await signalRService.resetDraft(user.league.id);
        console.log('✅ Draft reset request sent via SignalR');
      } else {
        // Fallback to REST API if SignalR is not connected
        console.log('🔄 SignalR not connected, using REST API fallback...');
        await draftService.resetDraft(draftId);
        console.log('✅ Draft reset request sent via REST API');
      }
      
      // Clear local state immediately
      dispatch({ type: 'CLEAR_LOCAL_ROSTERS' });
      dispatch({ type: 'RESET_TIMER', payload: { duration: 15 } });

      // Clear cached members to force refetch after reset
      cachedMembersRef.current = [];
      
      // Fetch fresh draft state after reset
      setTimeout(() => {
        fetchDraftState();
      }, 500); // Small delay to ensure backend reset completes
      
    } catch (error) {
      console.error('Error resetting draft:', error);
      
      // If SignalR failed, try REST API as fallback
      if (signalRService.isConnected()) {
        console.log('🔄 SignalR reset failed, trying REST API fallback...');
        try {
          await draftService.resetDraft(draftId);
          console.log('✅ Draft reset successful via REST API fallback');
          
          // Clear local state
          dispatch({ type: 'CLEAR_LOCAL_ROSTERS' });
          dispatch({ type: 'RESET_TIMER', payload: { duration: 15 } });

          // Clear cached members to force refetch after reset
          cachedMembersRef.current = [];
          
          // Fetch fresh draft state
          setTimeout(() => {
            fetchDraftState();
          }, 500);
          
          return; // Success via fallback
        } catch (fallbackError) {
          console.error('❌ Both SignalR and REST API reset failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }, [dispatch, user?.league?.id, fetchDraftState]);

  // Start continuous auto-drafting for all teams
  const startAutoDraftingForAllTeams = useCallback(async (): Promise<void> => {
    if (!state.draftState || !user?.league?.id) {
      throw new Error('Cannot start auto-drafting - no draft state or league');
    }

    dispatch({ type: 'SET_AUTO_DRAFTING', payload: true });
    dispatch({ type: 'SET_AUTO_DRAFT_MESSAGE', payload: 'Completing auto-draft for all teams...' });
    
    console.log('🏁 Starting instant complete auto-draft for all teams');
    
    try {
      // Call the backend to instantly complete the entire draft
      await signalRService.completeAutoDraft(user.league.id);
      
      // The backend will send DraftCompleted event when done
      console.log('🏁 Complete auto-draft request sent to backend');
      
    } catch (error) {
      console.error('Error during complete auto-draft:', error);
      dispatch({ type: 'SET_AUTO_DRAFTING', payload: false });
      dispatch({ type: 'SET_AUTO_DRAFT_MESSAGE', payload: 'Auto-draft failed - please try again' });
      throw error;
    }
    
  }, [state.draftState, user?.league?.id, dispatch]);

  // Stop auto-drafting and resume normal draft process
  const stopAutoDrafting = useCallback((): void => {
    console.log('🛑 Stopping auto-draft simulation');
    dispatch({ type: 'SET_AUTO_DRAFTING', payload: false });
    dispatch({ type: 'SET_AUTO_DRAFT_MESSAGE', payload: 'Stopping auto-draft...' });
  }, [dispatch]);

  // Setup polling for active drafts (TEMPORARILY DISABLED to reduce API calls)
  useEffect(() => {
    // TEMPORARILY DISABLED: Polling causes too many API calls
    console.log('🛑 Draft polling is temporarily disabled to reduce API load');
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('🛑 Cleared existing draft polling');
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Handle timer expiration from context
  useEffect(() => {
    console.log('🕒 Timer state changed:', {
      timeRemaining: state.timer.timeRemaining,
      isDrafting: state.timer.isDrafting,
      shouldTrigger: state.timer.timeRemaining === 0 && state.timer.isDrafting
    });
    
    if (state.timer.timeRemaining === 0 && state.timer.isDrafting) {
      console.log('🔴 Timer expired - triggering auto-draft');
      handleTimerExpiration();
    }
  }, [state.timer.timeRemaining, state.timer.isDrafting, handleTimerExpiration]);

  // Initialize draft state on mount
  useEffect(() => {
    if (user?.league?.id && !state.draftState && !state.isLoading.draftState) {
      fetchDraftState();
    }
  }, [user?.league?.id, state.draftState, state.isLoading.draftState, fetchDraftState]);

  // Effect to detect when it becomes the current user's turn and play special sound
  useEffect(() => {
    if (user?.id && state.draftState?.isActive) {
      // Calculate current user using simplified snake draft logic (match backend implementation)
      const draftOrder = state.draftState.draftOrder;
      const teamCount = draftOrder.length;
      const totalPicks = state.draftState.draftPicks?.length || 0;
      
      // Create the full snake draft sequence
      const snakeSequence: number[] = [];
      const maxRounds = 34; // Total rounds in the draft
      
      for (let round = 0; round < maxRounds; round++) {
        if (round % 2 === 0) {
          // Even rounds: forward order (0, 2, 4...)
          for (let i = 0; i < teamCount; i++) {
            snakeSequence.push(draftOrder[i]);
          }
        } else {
          // Odd rounds: reverse order (1, 3, 5...)
          for (let i = teamCount - 1; i >= 0; i--) {
            snakeSequence.push(draftOrder[i]);
          }
        }
      }
      
      const currentUserId = totalPicks < snakeSequence.length ? snakeSequence[totalPicks] : 0;
      const isCurrentUserTurn = currentUserId === user.id;
      
      // If it just became the user's turn (wasn't before, but is now)
      if (isCurrentUserTurn && !previousUserTurnRef.current) {
        console.log('🔊 It\'s your turn! Playing special notification sound');
        playYourTurnSound();
      }
      
      // Update the previous state
      previousUserTurnRef.current = isCurrentUserTurn;
    }
  }, [user?.id, state.draftState?.currentTurn, state.draftState?.isActive, state.draftState?.draftOrder]);

  return {
    // State
    draftState: state.draftState,
    leagueMembers: state.leagueMembers,
    timer: state.timer,
    isLoading: state.isLoading,
    isAutoDrafting: state.isAutoDrafting,
    autoDraftMessage: state.autoDraftMessage,
    
    // Computed values (note: availablePlayers is now async, components should call getAvailablePlayers directly)
    getAvailablePlayers,
    allDraftedPlayers: getAllDraftedPlayers(),
    
    // Actions
    createDraft,
    fetchDraftState,
    makeDraftPick,
    performAutoDraft,
    startDraft,
    resetDraft,
    startAutoDraftingForAllTeams,
    stopAutoDrafting,
    
    // Timer actions
    startTimer: (duration: number = 15) => dispatch({ type: 'START_TIMER', payload: { duration } }),
    pauseTimer: () => dispatch({ type: 'PAUSE_TIMER' }),
    resumeTimer: () => dispatch({ type: 'RESUME_TIMER' }),
    resetTimer: (duration: number = 15) => dispatch({ type: 'RESET_TIMER', payload: { duration } }),
    
    // Utility functions
    getNeededPositions,
    isUserTurn: (userId: number) => {
      if (!state.draftState) return false;
      
      // Calculate current user using simplified snake draft logic (match backend implementation)
      const draftOrder = state.draftState.draftOrder;
      const teamCount = draftOrder.length;
      const totalPicks = state.draftState.draftPicks?.length || 0;
      
      // Create the full snake draft sequence
      const snakeSequence: number[] = [];
      const maxRounds = 34; // Total rounds in the draft
      
      for (let round = 0; round < maxRounds; round++) {
        if (round % 2 === 0) {
          // Even rounds: forward order (0, 2, 4...)
          for (let i = 0; i < teamCount; i++) {
            snakeSequence.push(draftOrder[i]);
          }
        } else {
          // Odd rounds: reverse order (1, 3, 5...)
          for (let i = teamCount - 1; i >= 0; i--) {
            snakeSequence.push(draftOrder[i]);
          }
        }
      }
      
      const currentUserId = totalPicks < snakeSequence.length ? snakeSequence[totalPicks] : 0;
      return currentUserId === userId;
    },
    getUserRoster: (userId: number) => state.localRosters[userId] || [],
  };
}