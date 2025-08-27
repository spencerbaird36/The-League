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
      console.log('✅ Player drafted event received');
      
      // Extract player ID with fallback patterns
      let playerId = null;
      if ('playerId' in data && data.playerId !== null && data.playerId !== undefined) {
        playerId = data.playerId;
      } else if ('PlayerId' in data && data.PlayerId !== null && data.PlayerId !== undefined) {
        playerId = data.PlayerId;
      } else {
        // Search for any property containing player ID
        for (const [key, value] of Object.entries(data)) {
          if (key.toLowerCase().includes('player') && key.toLowerCase().includes('id') && value) {
            playerId = value;
            break;
          }
        }
      }
      
      const playerName = data.playerName || data.PlayerName || 'Unknown Player';
      const position = data.position || data.Position || 'Unknown';
      const team = data.team || data.Team || 'Unknown';
      const isAutoDraft = data.isAutoDraft || data.IsAutoDraft || false;
      
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
      
      // Extract drafter information for notification
      const drafterId = data.userId || data.UserId;
      let drafterDisplayName = 'Unknown Player';
      if (drafterId && user && drafterId === user.id) {
        drafterDisplayName = 'You';
      } else if (data.username || data.Username) {
        drafterDisplayName = data.username || data.Username;
      } else if (data.userFullName || data.UserFullName) {
        drafterDisplayName = data.userFullName || data.UserFullName;
      } else if (drafterId) {
        drafterDisplayName = `User ${drafterId}`;
      }
      
      notificationActions.notifyPlayerPicked(playerName, position, team, isAutoDraft, drafterDisplayName);
      
      // Advance to next turn
      draftActions.advanceTurn();
    }, [draftActions, notificationActions, draftState.currentPickNumber, draftState.currentRound, user]),

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
    }, [draftActions, timerActions, notificationActions]),

    onDraftPickError: useCallback((data: any) => {
      console.log('❌ Draft pick error event received:', data);
      
      // Show user-friendly error message based on error type
      let errorMessage = 'Failed to make draft pick';
      if (data.Error === 'NOT_YOUR_TURN') {
        errorMessage = data.Message || "It's not your turn to draft";
      } else if (data.Message) {
        errorMessage = data.Message;
      }
      
      notificationActions.notifyError(errorMessage);
    }, [notificationActions])
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
      .map(pick => pick.playerId)
      .filter(id => id != null && id !== undefined && id !== '') // Remove null/undefined values
    );
    
    const availablePlayers = players.filter(player => !draftedPlayerIds.has(player.id));
    
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