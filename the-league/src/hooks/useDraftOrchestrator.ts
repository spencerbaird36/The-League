import { useCallback, useEffect, useMemo } from 'react';
import { useDraftState, DraftState, DraftPick } from './useDraftState';
import { useWebSocketDraft, WebSocketDraftEvents } from './useWebSocketDraft';
import { useDraftTimer } from './useDraftTimer';
import { useNotifications } from './useNotifications';
import { Player } from '../types/Player';
import { players } from '../data/players';

interface User {
  id: number;
  league?: {
    id: number;
    name: string;
  };
}

interface UseDraftOrchestratorProps {
  user: User | null;
}

export interface DraftOrchestratorActions {
  // Draft management
  startDraft: () => Promise<void>;
  pauseDraft: () => Promise<void>;
  resumeDraft: () => Promise<void>;
  resetDraft: () => Promise<void>;
  
  // Player actions
  makePick: (player: Player) => Promise<void>;
  autoDraft: () => Promise<void>;
  
  // Timer actions
  pauseTimer: () => void;
  resumeTimer: () => void;
  
  // Utility
  getAvailablePlayers: () => Player[];
  isMyTurn: () => boolean;
}

export const useDraftOrchestrator = ({ user }: UseDraftOrchestratorProps) => {
  const [draftState, draftActions] = useDraftState();
  const [notifications, notificationActions] = useNotifications({
    enableSounds: true,
    defaultDuration: 4000
  });

  // Timer with callbacks
  const [timerState, timerActions] = useDraftTimer({
    defaultDuration: 10, // 10 seconds for testing
    onTimerExpired: useCallback(() => {
      console.log('⏰ Timer expired - triggering auto-draft');
      if (draftState.isActive && draftActions.isMyTurn(user?.id || 0)) {
        // Auto-draft for current user
        autoDraftInternal();
      }
    }, [draftState.isActive, user?.id]),
    onTimerTick: useCallback((timeRemaining: number) => {
      draftActions.setTimeRemaining(timeRemaining);
    }, [draftActions])
  });

  // WebSocket event handlers
  const webSocketEvents: WebSocketDraftEvents = {
    onDraftStarted: useCallback((data: any) => {
      console.log('🎯 Draft started event received:', data);
      
      draftActions.updateDraftState({
        id: data.id || data.Id,
        isActive: true,
        isPaused: false,
        draftOrder: data.draftOrder || data.DraftOrder || [],
        currentTurn: 0,
        currentRound: 1,
        currentPickNumber: 1,
        currentPlayerId: data.draftOrder?.[0] || data.DraftOrder?.[0] || 0
      });
      
      notificationActions.notifyDraftStarted();
      
      // Start timer for first pick
      timerActions.startTimer(10);
    }, [draftActions, notificationActions, timerActions]),

    onTurnChanged: useCallback((data: any) => {
      console.log('🔄 Turn changed event received:', data);
      
      const currentUserId = data.CurrentUserId || data.currentUserId || 0;
      const timeLimit = data.TimeLimit || data.timeLimit || 10;
      
      draftActions.updateDraftState({
        currentPlayerId: currentUserId,
        currentRound: data.CurrentRound || data.currentRound || draftState.currentRound,
        currentTurn: data.CurrentTurn || data.currentTurn || draftState.currentTurn
      });
      
      // Check if it's current user's turn
      if (currentUserId === user?.id) {
        notificationActions.notifyYourTurn();
      }
      
      // Restart timer for new turn
      timerActions.startTimer(timeLimit);
    }, [draftActions, notificationActions, timerActions, user?.id, draftState.currentRound, draftState.currentTurn]),

    onPlayerDrafted: useCallback((data: any) => {
      console.log('✅ Player drafted event received:', data);
      console.log('🔍 Available keys in data:', Object.keys(data));
      console.log('🔍 data object type:', typeof data);
      console.log('🔍 data.playerId:', data.playerId);
      console.log('🔍 data.PlayerId:', data.PlayerId);
      console.log('🔍 JSON.stringify(data):', JSON.stringify(data));
      
      // Try multiple property access patterns with explicit checks
      let playerId = null;
      
      // Check exact property names with explicit existence tests
      if ('playerId' in data && data.playerId !== null && data.playerId !== undefined) {
        playerId = data.playerId;
        console.log('🎯 Found playerId via data.playerId:', playerId);
      } else if ('PlayerId' in data && data.PlayerId !== null && data.PlayerId !== undefined) {
        playerId = data.PlayerId;
        console.log('🎯 Found playerId via data.PlayerId:', playerId);
      } else {
        // Iterate through all properties to find any containing player ID
        for (const [key, value] of Object.entries(data)) {
          console.log(`🔍 Checking property: ${key} = ${value}`);
          if (key.toLowerCase().includes('player') && key.toLowerCase().includes('id') && value) {
            playerId = value;
            console.log(`🎯 Found playerId via ${key}:`, playerId);
            break;
          }
        }
        
        // If still not found, log all properties
        if (!playerId) {
          console.log('❌ No playerId found in any property!');
          console.log('🔍 All properties:', Object.entries(data));
        }
      }
      
      const playerName = data.playerName || data.PlayerName || 'Unknown Player';
      const position = data.position || data.Position || 'Unknown';
      const team = data.team || data.Team || 'Unknown';
      const isAutoDraft = data.isAutoDraft || data.IsAutoDraft || false;
      
      console.log('🔍 Final playerId value:', playerId);
      
      // Create pick object
      const pick: DraftPick = {
        id: data.id || Date.now(),
        userId: data.userId || data.UserId || 0,
        userFullName: data.userFullName || data.UserFullName || 'Unknown',
        username: data.username || data.Username || 'Unknown',
        playerName,
        playerId: playerId, // Store the player ID for filtering
        playerPosition: position,
        playerTeam: team,
        playerLeague: data.league || data.League || 'Unknown',
        pickNumber: data.pickNumber || data.PickNumber || draftState.currentPickNumber,
        round: data.round || data.Round || draftState.currentRound,
        roundPick: data.roundPick || data.RoundPick || 1,
        pickedAt: data.pickedAt || data.PickedAt || new Date().toISOString()
      };
      
      draftActions.addPick(pick);
      notificationActions.notifyPlayerPicked(playerName, position, team, isAutoDraft);
      
      // Advance to next turn
      draftActions.advanceTurn();
    }, [draftActions, notificationActions, draftState.currentPickNumber, draftState.currentRound]),

    onDraftPaused: useCallback((data: any) => {
      console.log('⏸️ Draft paused event received:', data);
      
      draftActions.updateDraftState({ isPaused: true });
      timerActions.pauseTimer();
      notificationActions.notifyDraftPaused();
    }, [draftActions, timerActions, notificationActions]),

    onDraftResumed: useCallback((data: any) => {
      console.log('▶️ Draft resumed event received:', data);
      
      draftActions.updateDraftState({ isPaused: false });
      timerActions.resumeTimer();
      notificationActions.notifyDraftResumed();
    }, [draftActions, timerActions, notificationActions]),

    onDraftCompleted: useCallback((data: any) => {
      console.log('🏁 Draft completed event received:', data);
      
      draftActions.updateDraftState({ 
        isCompleted: true, 
        isActive: false 
      });
      timerActions.stopTimer();
      notificationActions.notifyDraftCompleted();
    }, [draftActions, timerActions, notificationActions]),

    onTimerTick: useCallback((data: any) => {
      const timeRemaining = data.timeRemaining || data.TimeRemaining || 0;
      draftActions.setTimeRemaining(timeRemaining);
    }, [draftActions]),

    onAutoDraft: useCallback((data: any) => {
      console.log('🤖 Auto-draft event received:', data);
      // This will be handled by onPlayerDrafted
    }, []),

    onDraftReset: useCallback((data: any) => {
      console.log('🔄 Draft reset event received:', data);
      draftActions.resetDraftState();
      timerActions.stopTimer();
      notificationActions.addNotification({
        type: 'turn',
        title: 'Draft Reset',
        message: `Draft was reset by ${data.ResetBy || 'Administrator'}`,
        duration: 5000
      });
    }, [draftActions, timerActions, notificationActions])
  };

  // Initialize WebSocket
  const webSocketActions = useWebSocketDraft({
    leagueId: user?.league?.id,
    userId: user?.id,
    events: webSocketEvents
  });

  // Auto-draft internal function
  const autoDraftInternal = useCallback(async () => {
    if (!user?.league?.id || !draftActions.isMyTurn(user.id)) {
      console.log('❌ Cannot auto-draft: not user\'s turn');
      return;
    }

    try {
      // Get available players
      const availablePlayers = getAvailablePlayersInternal();
      
      if (availablePlayers.length === 0) {
        console.log('❌ No available players for auto-draft');
        notificationActions.notifyError('No available players for auto-draft');
        return;
      }

      // Select random player
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      const selectedPlayer = availablePlayers[randomIndex];
      
      console.log('🤖 Auto-drafting player:', selectedPlayer.name);
      
      // Make the pick via WebSocket
      await webSocketActions.makePick(user.league.id, selectedPlayer, true);
      
    } catch (error) {
      console.error('❌ Auto-draft failed:', error);
      notificationActions.notifyError('Auto-draft failed');
    }
  }, [user, draftActions, webSocketActions, notificationActions]);

  // Get available players
  const getAvailablePlayersInternal = useCallback((): Player[] => {
    const draftedPlayerIds = new Set(draftState.picks
      .map(pick => {
        console.log(`🔍 Processing pick: ${pick.playerName}, playerId: ${pick.playerId}`);
        return pick.playerId;
      }) // Use playerId if available (for auto-drafted players)
      .filter(id => {
        const isValid = id != null && id !== undefined && id !== '';
        console.log(`🔍 Filtering playerId: ${id}, isValid: ${isValid}`);
        return isValid;
      }) // Remove null/undefined values
    );
    
    console.log('🔍 Drafted player IDs for filtering:', Array.from(draftedPlayerIds));
    console.log('🔍 Total picks:', draftState.picks.length);
    console.log('🔍 Picks with valid playerId:', draftState.picks.filter(pick => pick.playerId && pick.playerId !== '').length);
    console.log('🔍 All picks details:', draftState.picks.map(pick => ({ 
      name: pick.playerName, 
      playerId: pick.playerId,
      hasPlayerId: !!pick.playerId 
    })));
    
    const availablePlayers = players.filter(player => {
      const isDrafted = draftedPlayerIds.has(player.id);
      if (isDrafted) {
        console.log(`🔍 Player ${player.name} (${player.id}) is drafted, filtering out`);
      }
      return !isDrafted;
    });
    console.log('🔍 Available players count:', availablePlayers.length, 'out of', players.length);
    
    return availablePlayers;
  }, [draftState.picks]);

  // Public action implementations
  const startDraft = useCallback(async () => {
    if (!user?.league?.id) {
      notificationActions.notifyError('No league found');
      return;
    }

    try {
      await webSocketActions.startDraft(user.league.id);
    } catch (error) {
      console.error('Failed to start draft:', error);
      notificationActions.notifyError('Failed to start draft');
    }
  }, [user?.league?.id, webSocketActions, notificationActions]);

  const pauseDraft = useCallback(async () => {
    if (!user?.league?.id) return;

    try {
      await webSocketActions.pauseDraft(user.league.id);
    } catch (error) {
      console.error('Failed to pause draft:', error);
      notificationActions.notifyError('Failed to pause draft');
    }
  }, [user?.league?.id, webSocketActions, notificationActions]);

  const resumeDraft = useCallback(async () => {
    if (!user?.league?.id) return;

    try {
      await webSocketActions.resumeDraft(user.league.id);
    } catch (error) {
      console.error('Failed to resume draft:', error);
      notificationActions.notifyError('Failed to resume draft');
    }
  }, [user?.league?.id, webSocketActions, notificationActions]);

  const resetDraft = useCallback(async () => {
    if (!user?.league?.id) return;

    try {
      await webSocketActions.resetDraft(user.league.id);
      draftActions.resetDraftState();
      timerActions.resetTimer();
      notificationActions.clearAllNotifications();
    } catch (error) {
      console.error('Failed to reset draft:', error);
      notificationActions.notifyError('Failed to reset draft');
    }
  }, [user?.league?.id, webSocketActions, draftActions, timerActions, notificationActions]);

  const makePick = useCallback(async (player: Player) => {
    if (!user?.league?.id || !draftActions.isMyTurn(user.id)) {
      notificationActions.notifyError('Not your turn to pick');
      return;
    }

    try {
      console.log('🎯 Making manual pick:', player.name);
      await webSocketActions.makePick(user.league.id, player, false);
    } catch (error) {
      console.error('Failed to make pick:', error);
      notificationActions.notifyError('Failed to make pick');
    }
  }, [user, draftActions, webSocketActions, notificationActions]);

  const actions: DraftOrchestratorActions = {
    startDraft,
    pauseDraft,
    resumeDraft,
    resetDraft,
    makePick,
    autoDraft: autoDraftInternal,
    pauseTimer: timerActions.pauseTimer,
    resumeTimer: timerActions.resumeTimer,
    getAvailablePlayers: getAvailablePlayersInternal,
    isMyTurn: () => draftActions.isMyTurn(user?.id || 0)
  };

  // Sync timer state with draft state
  useEffect(() => {
    draftActions.setTimerActive(timerState.isActive);
  }, [timerState.isActive, draftActions]);

  return {
    // State
    draftState,
    timerState,
    notifications,
    
    // Actions
    actions,
    
    // WebSocket status
    isWebSocketConnected: webSocketActions.isConnected()
  };
};