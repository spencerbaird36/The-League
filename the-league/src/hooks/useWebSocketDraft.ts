import { useEffect, useCallback, useRef } from 'react';
import signalRService from '../services/signalRService';
import { DraftState, DraftPick } from './useDraftState';
import { Player } from '../types/Player';

// WebSocket Events
export const WEBSOCKET_EVENTS = {
  // Outbound events (what we send)
  START_DRAFT: 'StartDraft',
  MAKE_PICK: 'MakeDraftPick',
  PAUSE_DRAFT: 'PauseDraft',
  RESUME_DRAFT: 'ResumeDraft',
  RESET_DRAFT: 'ResetDraft',
  
  // Inbound events (what we listen for)
  DRAFT_STARTED: 'DraftStarted',
  TURN_CHANGED: 'TurnChanged',
  PLAYER_DRAFTED: 'PlayerDrafted',
  TIMER_TICK: 'TimerTick',
  DRAFT_PAUSED: 'DraftPaused',
  DRAFT_RESUMED: 'DraftResumed',
  DRAFT_COMPLETED: 'DraftCompleted',
  AUTO_DRAFT: 'AutoDraft'
} as const;

export interface WebSocketDraftEvents {
  onDraftStarted: (data: any) => void;
  onTurnChanged: (data: any) => void;
  onPlayerDrafted: (data: any) => void;
  onTimerTick: (data: any) => void;
  onDraftPaused: (data: any) => void;
  onDraftResumed: (data: any) => void;
  onDraftCompleted: (data: any) => void;
  onAutoDraft: (data: any) => void;
  onDraftReset: (data: any) => void;
}

export interface WebSocketDraftActions {
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
  
  // Draft actions
  startDraft: (leagueId: number) => Promise<void>;
  makePick: (leagueId: number, player: Player, isAutoDraft?: boolean) => Promise<void>;
  pauseDraft: (leagueId: number) => Promise<void>;
  resumeDraft: (leagueId: number) => Promise<void>;
  resetDraft: (leagueId: number) => Promise<void>;
}

interface UseWebSocketDraftProps {
  leagueId?: number;
  userId?: number;
  events: WebSocketDraftEvents;
}

export const useWebSocketDraft = ({ 
  leagueId, 
  userId, 
  events 
}: UseWebSocketDraftProps): WebSocketDraftActions => {
  const isInitialized = useRef(false);
  const eventHandlersRef = useRef(events);
  
  // Keep event handlers ref current
  eventHandlersRef.current = events;

  // Enhanced event handlers with detailed logging
  const handleDraftStarted = useCallback((data: any) => {
    console.log('🎯 WebSocket: Draft Started', data);
    eventHandlersRef.current.onDraftStarted(data);
  }, []);

  const handleTurnChanged = useCallback((data: any) => {
    console.log('🔄 WebSocket: Turn Changed', {
      currentUser: data.CurrentUserId || data.currentUserId,
      round: data.CurrentRound || data.currentRound,
      turn: data.CurrentTurn || data.currentTurn,
      timeLimit: data.TimeLimit || data.timeLimit
    });
    eventHandlersRef.current.onTurnChanged(data);
  }, []);

  const handlePlayerDrafted = useCallback((data: any) => {
    console.log('✅ WebSocket: Player Drafted', {
      player: data.playerName || data.PlayerName,
      position: data.position || data.Position,
      team: data.team || data.Team,
      isAutoDraft: data.isAutoDraft || data.IsAutoDraft
    });
    eventHandlersRef.current.onPlayerDrafted(data);
  }, []);

  const handleTimerTick = useCallback((data: any) => {
    console.log('⏰ WebSocket: Timer Tick', data.timeRemaining || data.TimeRemaining);
    eventHandlersRef.current.onTimerTick(data);
  }, []);

  const handleDraftPaused = useCallback((data: any) => {
    console.log('⏸️ WebSocket: Draft Paused', data);
    eventHandlersRef.current.onDraftPaused(data);
  }, []);

  const handleDraftResumed = useCallback((data: any) => {
    console.log('▶️ WebSocket: Draft Resumed', data);
    eventHandlersRef.current.onDraftResumed(data);
  }, []);

  const handleDraftCompleted = useCallback((data: any) => {
    console.log('🏁 WebSocket: Draft Completed', data);
    eventHandlersRef.current.onDraftCompleted(data);
  }, []);

  const handleAutoDraft = useCallback((data: any) => {
    console.log('🤖 WebSocket: Auto Draft', data);
    eventHandlersRef.current.onAutoDraft(data);
  }, []);

  const handleDraftReset = useCallback((data: any) => {
    console.log('🔄 WebSocket: Draft Reset', data);
    eventHandlersRef.current.onDraftReset(data);
  }, []);

  // Initialize WebSocket connection and event listeners
  useEffect(() => {
    if (!leagueId || !userId || isInitialized.current) return;

    const initializeWebSocket = async () => {
      try {
        console.log('🔗 Initializing WebSocket draft connection for league:', leagueId);
        
        // Connect to SignalR
        await signalRService.connect();
        console.log('✅ SignalR connected successfully');
        
        // Join the league room
        await signalRService.joinLeague(leagueId, userId);
        console.log('✅ Joined league room:', leagueId);
        
        // Register all event listeners
        signalRService.onDraftStarted(handleDraftStarted);
        signalRService.onTurnChanged(handleTurnChanged);
        signalRService.onPlayerDrafted(handlePlayerDrafted);
        signalRService.onDraftPaused(handleDraftPaused);
        signalRService.onDraftResumed(handleDraftResumed);
        signalRService.onDraftCompleted(handleDraftCompleted);
        
        // Add TimerTick event handler for server-driven timer updates
        signalRService.onTimerTick(handleTimerTick);
        
        // Add DraftReset event handler
        signalRService.onDraftReset(handleDraftReset);
        
        // Note: AutoDraft events are handled through PlayerDrafted with isAutoDraft flag
        
        console.log('✅ All WebSocket event listeners registered');
        isInitialized.current = true;
        
      } catch (error) {
        console.error('❌ Failed to initialize WebSocket draft:', error);
      }
    };

    initializeWebSocket();

    // Cleanup function
    return () => {
      if (isInitialized.current) {
        console.log('🧹 Cleaning up WebSocket draft listeners');
        
        signalRService.offDraftStarted(handleDraftStarted);
        signalRService.offTurnChanged(handleTurnChanged);
        signalRService.offPlayerDrafted(handlePlayerDrafted);
        signalRService.offDraftPaused(handleDraftPaused);
        signalRService.offDraftResumed(handleDraftResumed);
        signalRService.offDraftCompleted(handleDraftCompleted);
        
        // Cleanup TimerTick event handler
        signalRService.offTimerTick(handleTimerTick);
        
        // Cleanup DraftReset event handler
        signalRService.offDraftReset(handleDraftReset);
        
        isInitialized.current = false;
      }
    };
  }, [
    leagueId, 
    userId,
    handleDraftStarted,
    handleTurnChanged,
    handlePlayerDrafted,
    handleTimerTick,
    handleDraftPaused,
    handleDraftResumed,
    handleDraftCompleted,
    handleAutoDraft,
    handleDraftReset
  ]);

  // Action implementations
  const connect = useCallback(async (): Promise<void> => {
    if (!signalRService.isConnected()) {
      console.log('🔗 Connecting to WebSocket...');
      await signalRService.connect();
    }
  }, []);

  const disconnect = useCallback((): void => {
    console.log('🔌 Disconnecting from WebSocket...');
    // Note: We typically don't disconnect from SignalR as it's used globally
    // signalRService.disconnect();
  }, []);

  const isConnected = useCallback((): boolean => {
    return signalRService.isConnected();
  }, []);

  const startDraft = useCallback(async (leagueId: number): Promise<void> => {
    if (!signalRService.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    
    console.log('🎯 Starting draft via WebSocket for league:', leagueId);
    await signalRService.startDraft(leagueId);
  }, []);

  const makePick = useCallback(async (
    leagueId: number, 
    player: Player, 
    isAutoDraft: boolean = false
  ): Promise<void> => {
    if (!signalRService.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    
    console.log('🎯 Making draft pick via WebSocket:', {
      player: player.name,
      isAutoDraft,
      leagueId
    });
    
    await signalRService.makeDraftPick(
      leagueId,
      player.id,
      player.name,
      player.position,
      player.team,
      player.league,
      isAutoDraft
    );
  }, []);

  const pauseDraft = useCallback(async (leagueId: number): Promise<void> => {
    if (!signalRService.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    
    console.log('⏸️ Pausing draft via WebSocket for league:', leagueId);
    await signalRService.pauseDraft(leagueId);
  }, []);

  const resumeDraft = useCallback(async (leagueId: number): Promise<void> => {
    if (!signalRService.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    
    console.log('▶️ Resuming draft via WebSocket for league:', leagueId);
    await signalRService.resumeDraft(leagueId);
  }, []);

  const resetDraft = useCallback(async (leagueId: number): Promise<void> => {
    if (!signalRService.isConnected()) {
      throw new Error('WebSocket not connected');
    }
    
    console.log('🔄 Resetting draft via WebSocket for league:', leagueId);
    await signalRService.resetDraft(leagueId);
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
    startDraft,
    makePick,
    pauseDraft,
    resumeDraft,
    resetDraft
  };
};