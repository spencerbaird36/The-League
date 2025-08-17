import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types/Player';
import { players } from '../data/players';
import LazyLoadFallback from '../components/LazyLoadFallback';
import VirtualScrollTable from '../components/VirtualScrollTable';
import { useDraft } from '../context/DraftContext';
import { useDraftOperations } from '../hooks/useDraftOperations';
// Performance optimization imports disabled to fix re-rendering
// import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
// import { useDataCache } from '../hooks/useDataCache';
// import { useOptimizedAPI, useBatchRequests } from '../hooks/useOptimizedAPI';
// import { withMemo, useStableCallbacks } from '../utils/renderOptimizations';
import signalRService from '../services/signalRService';
import './Draft.css';

// Lazy load modals since they're only needed when users interact
const PlayerInfoModal = lazy(() => import('../components/PlayerInfoModal'));
const DraftConfirmationModal = lazy(() => import('../components/DraftConfirmationModal'));


interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt?: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
}

interface DraftProps {
  draftedNFL: Player[];
  draftedMLB: Player[];
  draftedNBA: Player[];
  draftPlayer: (player: Player, isAutoDraft?: boolean) => void;
  addDraftToast: (playerName: string, playerPosition: string, playerTeam: string, isAutoDraft?: boolean) => void;
  user: User | null;
  clearRosters: () => void;
  isDrafting: boolean;
  isPaused: boolean;
  timeRemaining: number;
  timeoutMessage: string;
  startDraft: () => void;
  togglePause: () => void;
  onTimeExpired: () => void;
  timerStartTime: number | null;
}

const Draft: React.FC<DraftProps> = ({
  draftedNFL,
  draftedMLB,
  draftedNBA,
  draftPlayer,
  addDraftToast,
  user,
  clearRosters,
  isDrafting,
  isPaused,
  timeRemaining,
  timeoutMessage,
  startDraft,
  togglePause,
  onTimeExpired,
  timerStartTime,
}) => {
  // Performance monitoring disabled to fix re-rendering
  // const { detectMemoryLeaks, getPerformanceReport } = usePerformanceMonitor({
  //   componentName: 'Draft',
  //   enableMemoryTracking: true,
  //   logThreshold: 20, // 20ms threshold for draft page
  //   onPerformanceIssue: (metrics) => {
  //     console.warn('Draft performance issue:', metrics);
  //   },
  // });

  // Data caching disabled to fix re-rendering
  // const { data: cachedPlayers, loading: playersLoading } = useDataCache(
  //   'draft-players',
  //   async () => players,
  //   { ttl: 30 * 60 * 1000, persistToIndexedDB: true } // 30 minutes cache
  // );

  // Use the new draft context and operations
  const { state, dispatch } = useDraft();
  const draftOperations = useDraftOperations(user);
  const navigate = useNavigate();
  
  // WebSocket draft state
  const [webSocketDraftState, setWebSocketDraftState] = useState<any>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [draftTimer, setDraftTimer] = useState(15);
  const [draftTimerActive, setDraftTimerActive] = useState(false);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedLeagueRef = useRef<boolean>(false);
  
  // Functions to update filters
  const setSelectedLeague = (league: 'ALL' | 'NFL' | 'MLB' | 'NBA') => {
    dispatch({ type: 'SET_SELECTED_LEAGUE', payload: league });
  };
  
  const setSelectedPosition = (position: string) => {
    dispatch({ type: 'SET_SELECTED_POSITION', payload: position });
  };

  // Use context state for filters instead of local state
  const selectedLeague = state.selectedLeague as 'ALL' | 'NFL' | 'MLB' | 'NBA';
  const selectedPosition = state.selectedPosition;
  
  const [isPlayerInfoModalOpen, setIsPlayerInfoModalOpen] = useState<boolean>(false);
  const [isDraftConfirmModalOpen, setIsDraftConfirmModalOpen] = useState<boolean>(false);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<Player | null>(null);
  const [selectedPlayerForDraft, setSelectedPlayerForDraft] = useState<Player | null>(null);
  
  // Get values from draft context
  const draftState = draftOperations.draftState;
  const isDraftCreated = !!draftState;
  
  // Get available players reactively (this will update when draft picks change)
  const availablePlayers = React.useMemo(() => {
    const draftedPlayers = draftOperations.allDraftedPlayers;
    return players.filter((player: Player) => 
      !draftedPlayers.some((drafted: Player) => drafted.id === player.id)
    );
  }, [draftOperations.allDraftedPlayers]);

  const filteredPlayers = React.useMemo(() => {
    const filtered = availablePlayers.filter((player: Player) => {
      const leagueMatch = selectedLeague === 'ALL' || player.league === selectedLeague;
      const positionMatch = selectedPosition === 'ALL' || player.position === selectedPosition;
      return leagueMatch && positionMatch;
    });
    
    return filtered;
  }, [availablePlayers, selectedLeague, selectedPosition]);

  // Create draft
  const createDraft = async () => {
    if (!user?.league?.id) return;
    
    try {
      await draftOperations.createDraft(user.league.id);
    } catch (error) {
      console.error('❌ Error creating draft:', error);
      alert(`Failed to create draft: ${error}`);
    }
  };

  // Start draft (timer starts automatically)
  const startDraftSession = async () => {
    console.log('=== START DRAFT SESSION CALLED ===');
    console.log('User:', user);
    console.log('League ID:', user?.league?.id);
    console.log('SignalR Connected:', signalRService.isConnected());
    console.log('Draft State:', draftState);
    console.log('Draft State Active:', draftState?.isActive);
    
    if (!user?.league?.id) {
      console.error('❌ No league found');
      alert('No league found. Please make sure you are in a league.');
      return;
    }

    if (!draftState) {
      console.error('❌ No draft found');
      alert('No draft found. Please create a draft first.');
      return;
    }

    if (draftState.isActive) {
      console.error('❌ Draft already active');
      alert('Draft is already active.');
      return;
    }

    try {
      // Always call REST API to update database state
      console.log('📡 Starting draft via REST API...');
      console.log('Calling draftOperations.startDraft...');
      await draftOperations.startDraft();
      console.log('✅ REST API startDraft completed');
      
      // Also call WebSocket to notify all users if connected
      if (signalRService.isConnected()) {
        console.log('🚀 Sending WebSocket notifications...');
        console.log('Calling signalRService.startDraft with league ID:', user.league.id);
        await signalRService.startDraft(user.league.id);
        console.log('✅ WebSocket startDraft call completed');
      } else {
        console.warn('⚠️ SignalR not connected - users will not receive real-time notifications');
      }
      
      console.log('✅ Draft started successfully');
      
      // Wait a moment for WebSocket event, then manually sync state as fallback
      setTimeout(async () => {
        console.log('🔄 Checking if WebSocket draft state was set after start...');
        if (!webSocketDraftState) {
          console.log('⚠️ WebSocket draft state still null after starting, manually syncing...');
          await fetchCurrentDraftState();
        } else {
          console.log('✅ WebSocket draft state is set, no manual sync needed');
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to start draft:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`Failed to start draft: ${error instanceof Error ? error.message : error}`);
    }
  };

  // Track if a pick is currently being made to prevent duplicates
  const [isPickInProgress, setIsPickInProgress] = useState(false);

  // Function to fetch current draft state via REST API
  const fetchCurrentDraftState = useCallback(async () => {
    if (!user?.league?.id) return;
    
    try {
      console.log('🔄 Fetching current draft state via REST API...');
      
      // Try multiple possible API endpoints
      const possibleEndpoints = [
        `/api/leagues/${user.league.id}/draft/state`,
        `/api/leagues/${user.league.id}/draft/status`,
        `/api/leagues/${user.league.id}/draft`
      ];
      
      let currentState = null;
      let successfulEndpoint = null;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          if (response.ok) {
            currentState = await response.json();
            successfulEndpoint = endpoint;
            console.log(`✅ Successfully fetched from: ${endpoint}`);
            break;
          } else {
            console.log(`❌ Endpoint ${endpoint} returned:`, response.status);
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} failed:`, endpointError);
        }
      }
      
      if (currentState) {
        console.log('📊 Current draft state from API:', currentState);
        console.log('📊 Using endpoint:', successfulEndpoint);
        
        // Handle different possible response structures
        const isActive = currentState.isActive || currentState.IsActive || false;
        const currentUserId = currentState.CurrentUserId || currentState.currentUserId || currentState.currentTurn;
        const timeLimit = currentState.TimeLimit || currentState.timeLimit || 15;
        
        if (isActive) {
          console.log('🎯 Setting WebSocket draft state from API');
          // Normalize the structure
          const normalizedState = {
            ...currentState,
            isActive: isActive,
            CurrentUserId: currentUserId,
            TimeLimit: timeLimit
          };
          setWebSocketDraftState(normalizedState);
          const myTurn = currentUserId === user.id;
          setIsMyTurn(myTurn);
          
          console.log('📊 Normalized state:', normalizedState);
          console.log('📊 My turn:', myTurn, 'Current user ID:', currentUserId, 'My ID:', user.id);
          
          if (myTurn && timeLimit) {
            console.log('⏰ Starting timer from current state with time limit:', timeLimit);
            // startDraftTimer will be called when needed
          }
        } else {
          console.log('⚠️ Draft is not active according to API');
        }
      } else {
        console.log('⚠️ Could not fetch draft state from any endpoint');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch current draft state:', error);
    }
  }, [user?.league?.id, user?.id]);

  // Make a draft pick using the new draft operations
  const makeDraftPick = useCallback(async (player: Player) => {
    console.log('🎯 Making draft pick for player:', player.name);
    console.log('Timer active before pick:', draftTimerActive);
    console.log('Timer value before pick:', draftTimer);
    
    // Prevent duplicate pick attempts
    if (isPickInProgress) {
      console.warn('⚠️ Pick already in progress, ignoring duplicate request');
      return;
    }
    
    setIsPickInProgress(true);
    
    try {
      console.log('🔍 DEBUGGING DRAFT PICK PATH:');
      console.log('SignalR Connected:', signalRService.isConnected());
      console.log('User League ID:', user?.league?.id);
      console.log('Both conditions met:', signalRService.isConnected() && user?.league?.id);
      
      if (signalRService.isConnected() && user?.league?.id) {
        // Use WebSocket to make draft pick
        console.log('✅ Taking WebSocket path for draft pick');
        console.log('Making draft pick via WebSocket...');
        await signalRService.makeDraftPick(
          user.league.id,
          player.id,
          player.name,
          player.position,
          player.team,
          player.league
        );
        console.log('📞 WebSocket draft pick call completed, waiting for events...');
        
        // Set up fallback timer reset in case TurnChanged event doesn't arrive
        setTimeout(() => {
          console.log('⏰ Fallback: No TurnChanged event received, manually restarting timer');
          if (user?.league?.id) {
            // Restart timer for next turn as fallback - will be handled by timer reference
            console.log('Timer fallback triggered');
          }
        }, 2000); // Wait 2 seconds for WebSocket events
        
      } else {
        // Fallback to REST API
        console.log('❌ SignalR not connected or no league ID, using REST API fallback');
        console.log('SignalR Connected:', signalRService.isConnected());
        console.log('User League ID:', user?.league?.id);
        console.log('Making draft pick via REST API...');
        await draftOperations.makeDraftPick(player);
        // Add toast notification for REST API picks (since no WebSocket event will fire)
        console.log('🎯 Adding toast for REST API draft pick:', { player: player.name, isAutoDraft: false });
        addDraftToast(player.name, player.position, player.team, false);
        // Update legacy roster state for backward compatibility
        draftPlayer(player, false);
        
        // For REST API, manually restart timer since no WebSocket events
        console.log('🔄 REST API pick completed, manually restarting timer');
        setTimeout(() => {
          console.log('REST API timer restart triggered');
        }, 1000);
      }
      console.log('✅ Draft pick successful');
      
      // Immediately start timer for next turn to reduce lag
      console.log('🔄 Immediately restarting timer for next turn (will be confirmed by WebSocket events)');
      setTimeout(() => {
        // Use a small delay to allow for WebSocket events to process
        console.log('Triggering immediate timer restart fallback');
      }, 500); // Small delay to let the pick process
    } catch (error) {
      console.error('❌ Draft pick failed:', error);
      alert(`Failed to draft ${player.name}: ${error}`);
    } finally {
      setIsPickInProgress(false);
    }
  }, [draftOperations, draftPlayer, addDraftToast, user?.league?.id, draftTimerActive, draftTimer, isPickInProgress]);

  // Handle player name click to show player info
  const handlePlayerNameClick = useCallback((player: Player) => {
    setSelectedPlayerForInfo(player);
    setIsPlayerInfoModalOpen(true);
  }, []);

  // Draft button click will be defined after variable declarations

  const handleConfirmDraft = () => {
    console.log('🎯 CONFIRM DRAFT CLICKED');
    console.log('Selected player for draft:', selectedPlayerForDraft);
    if (selectedPlayerForDraft) {
      console.log('🎯 Calling makeDraftPick with player:', selectedPlayerForDraft.name);
      makeDraftPick(selectedPlayerForDraft);
      setIsDraftConfirmModalOpen(false);
      setSelectedPlayerForDraft(null);
    } else {
      console.error('❌ No selected player for draft!');
    }
  };

  const handleCancelDraft = () => {
    setIsDraftConfirmModalOpen(false);
    setSelectedPlayerForDraft(null);
  };

  const handleClosePlayerInfo = () => {
    setIsPlayerInfoModalOpen(false);
    setSelectedPlayerForInfo(null);
  };

  // Reset draft function
  const handleResetDraft = async () => {
    if (!draftState?.id) return;
    
    try {
      await draftOperations.resetDraft(draftState.id);
      // Also clear local rosters for backward compatibility
      clearRosters();
      console.log('✅ Draft reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset draft:', error);
      alert(`Failed to reset draft: ${error}`);
    }
  };

  // Check if it's the current user's turn (WebSocket mode takes precedence)
  const isCurrentUserTurn = draftState && user ? 
    (signalRService.isConnected() && webSocketDraftState ? isMyTurn : draftOperations.isUserTurn(user.id)) : false;

  // Check if draft is active (WebSocket mode takes precedence)
  const isDraftActive = signalRService.isConnected() && webSocketDraftState ? 
    true : draftState?.isActive;

  // Handle clicking on a manager's tile to view their team
  const handleManagerClick = (userId: number) => {
    navigate(`/team/${userId}`);
  };

  // Handle draft button click to show confirmation - optimized with useCallback
  const handleDraftClick = useCallback((player: Player) => {
    console.log('🎯 Draft button clicked:', player.name);
    console.log('=== TURN DETECTION DEBUG ===');
    console.log('User ID:', user?.id);
    console.log('SignalR Connected:', signalRService.isConnected());
    console.log('WebSocket Draft State:', webSocketDraftState);
    console.log('Is My Turn (WebSocket):', isMyTurn);
    console.log('Draft State:', draftState);
    console.log('Draft State Active:', draftState?.isActive);
    console.log('Is Current User Turn (final):', isCurrentUserTurn);
    console.log('Is Draft Active (final):', isDraftActive);
    console.log('============================');
    
    // Check if it's the user's turn and draft is active
    if (!isCurrentUserTurn) {
      alert("It's not your turn to draft!");
      return;
    }
    
    if (!isDraftActive) {
      alert("Draft is not active!");
      return;
    }
    
    setSelectedPlayerForDraft(player);
    setIsDraftConfirmModalOpen(true);
  }, [user?.id, webSocketDraftState, isMyTurn, draftState, isCurrentUserTurn, isDraftActive]);

  // Auto-draft logic for timeouts
  const handleAutoDraft = useCallback(async () => {
    if (!user?.league?.id || !isMyTurn) return;
    
    console.log('Executing auto-draft for timeout...');
    
    try {
      // Use the global WebSocket auto-draft handler from App.tsx if available
      const webSocketAutoDraftHandler = (window as any).webSocketAutoDraftHandler;
      if (webSocketAutoDraftHandler && typeof webSocketAutoDraftHandler === 'function') {
        console.log('Using WebSocket auto-draft handler from App.tsx');
        await webSocketAutoDraftHandler(user.id, user.league.id);
        return;
      }
      
      // Fallback to local auto-draft logic
      const neededPositions = ['QB', 'RB', 'WR', 'TE', 'SP', 'CL', '1B', '2B', '3B', 'SS', 'OF', 'PG', 'SG', 'SF', 'PF', 'C'];
      const availablePlayersForAutoDraft = availablePlayers.filter(player =>
        neededPositions.includes(player.position)
      );
      
      if (availablePlayersForAutoDraft.length > 0) {
        const randomPlayer = availablePlayersForAutoDraft[Math.floor(Math.random() * availablePlayersForAutoDraft.length)];
        console.log('Auto-drafting player:', randomPlayer.name);
        
        if (signalRService.isConnected()) {
          await signalRService.makeDraftPick(
            user.league.id,
            randomPlayer.id,
            randomPlayer.name,
            randomPlayer.position,
            randomPlayer.team,
            randomPlayer.league,
            true  // isAutoDraft = true
          );
        } else {
          // Fallback to REST API
          await draftOperations.makeDraftPick(randomPlayer);
          // Add toast notification for REST API auto-draft (since no WebSocket event will fire)
          console.log('🎯 Adding toast for REST API auto-draft:', { player: randomPlayer.name, isAutoDraft: true });
          addDraftToast(randomPlayer.name, randomPlayer.position, randomPlayer.team, true);
          // Update legacy roster state for backward compatibility
          draftPlayer(randomPlayer, true);
        }
      }
    } catch (error) {
      console.error('Auto-draft failed:', error);
    }
  }, [user?.league?.id, user?.id, isMyTurn, availablePlayers, draftOperations, draftPlayer, addDraftToast]);


  // WebSocket draft timer
  const startDraftTimer = useCallback((timeLimit: number = 15) => {
    console.log('⏰ Starting draft timer with limit:', timeLimit);
    console.log('Is my turn when starting timer:', isMyTurn);
    
    setDraftTimer(timeLimit);
    setDraftTimerActive(true);
    
    if (draftTimerRef.current) {
      console.log('Clearing existing timer');
      clearInterval(draftTimerRef.current);
    }
    
    console.log('Setting up new timer interval');
    draftTimerRef.current = setInterval(() => {
      setDraftTimer(prev => {
        const newTime = prev - 1;
        console.log('Timer tick:', newTime);
        
        if (newTime <= 0) {
          console.log('⏰ Timer expired!');
          setDraftTimerActive(false);
          clearInterval(draftTimerRef.current!);
          
          // Auto-draft logic
          if (isMyTurn && user?.league?.id) {
            console.log('🤖 Time expired, triggering auto-draft for user:', user.id);
            handleAutoDraft();
          } else {
            console.log('⏳ Time expired but not my turn, waiting for auto-draft from current picker');
            // TODO: Add fallback mechanism if no auto-draft happens
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    console.log('Timer setup completed, interval ID:', draftTimerRef.current);
  }, [isMyTurn, user?.league?.id, user?.id, handleAutoDraft]);

  const stopDraftTimer = useCallback(() => {
    setDraftTimerActive(false);
    if (draftTimerRef.current) {
      clearInterval(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  // WebSocket event handlers and league joining
  useEffect(() => {
    if (!user?.league?.id || !user?.id) return;
    
    // Only join league once per session
    if (hasJoinedLeagueRef.current) {
      console.log('🔗 Already joined league, skipping duplicate join');
      return;
    }


    // Join the league group for WebSocket events
    const joinLeagueGroup = async () => {
      try {
        console.log('🔗 Joining league group for WebSocket events...');
        await signalRService.connect();
        await signalRService.joinLeague(user.league!.id, user.id);
        hasJoinedLeagueRef.current = true;
        console.log('✅ Successfully joined league group:', user.league!.id);
        
        // After joining, fetch current state to sync
        await fetchCurrentDraftState();
      } catch (error) {
        console.error('❌ Failed to join league group:', error);
        hasJoinedLeagueRef.current = false;
      }
    };

    joinLeagueGroup();

    const handleDraftStarted = (data: any) => {
      console.log('🎯🎯🎯 DRAFT STARTED EVENT RECEIVED 🎯🎯🎯');
      console.log('Draft started via WebSocket event:', data);
      console.log('Current user ID:', user.id);
      console.log('Current turn user ID:', data.CurrentUserId);
      console.log('Is my turn:', data.CurrentUserId === user.id);
      console.log('Event data:', JSON.stringify(data, null, 2));
      
      setWebSocketDraftState(data);
      const myTurn = data.CurrentUserId === user.id;
      setIsMyTurn(myTurn);
      
      if (myTurn) {
        console.log('🔥 Starting timer - it\'s my turn!');
        startDraftTimer(data.TimeLimit || 15);
      } else {
        console.log('⏳ Not my turn, waiting...');
        // Start timer for everyone to see the countdown, even if it's not their turn
        startDraftTimer(data.TimeLimit || 15);
      }
      
      console.log('✅ Draft started event processing complete');
    };

    const handleTurnChanged = (data: any) => {
      console.log('🔄 Turn changed via WebSocket:', data);
      console.log('Next user ID:', data.CurrentUserId);
      console.log('Current user ID:', user.id);
      
      const myTurn = data.CurrentUserId === user.id;
      setIsMyTurn(myTurn);
      
      // IMMEDIATELY stop any existing timer and start fresh
      console.log('⏹️ Stopping existing timer before starting new one');
      stopDraftTimer();
      
      // Start timer for everyone so all users can see the countdown
      console.log('⏰ Starting fresh timer for everyone with time limit:', data.TimeLimit || 15);
      setTimeout(() => {
        startDraftTimer(data.TimeLimit || 15);
      }, 100); // Small delay to ensure clean timer restart
      
      if (myTurn) {
        console.log('🎯 It\'s my turn!');
        // Play notification sound only for the current user
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp6hVFApGn+DyvmMdATuM1/LPeSsF');
          audio.play().catch(e => console.log('Could not play notification sound'));
        } catch (e) {
          console.log('Could not create notification sound');
        }
      } else {
        console.log('⏳ Not my turn, but showing timer for current picker');
      }
    };

    const handlePlayerDrafted = (data: any) => {
      console.log('🎯 Player drafted via WebSocket - RAW DATA:', data);
      console.log('🎯 All data keys:', Object.keys(data));
      
      // Handle both naming conventions - server uses lowercase, some events use uppercase
      const playerName = data.playerName || data.PlayerName || 'Unknown Player';
      const position = data.position || data.Position || 'Unknown';
      const team = data.team || data.Team || 'Unknown';
      const league = data.league || data.League || 'Unknown';
      const playerId = data.playerId || data.PlayerId || 0;
      const isAutoDraft = data.isAutoDraft || data.IsAutoDraft || false;
      
      console.log('🎯 Extracted player info:', {
        playerName,
        position, 
        team,
        league,
        playerId,
        isAutoDraft
      });
      
      // Update local state to remove the drafted player
      const draftedPlayer: Player = {
        id: playerId,
        name: playerName,
        position: position,
        team: team,
        league: league as 'NFL' | 'NBA' | 'MLB'
      };
      
      console.log('🎯 Adding toast for WebSocket draft:', {
        playerName,
        position,
        team,
        isAutoDraft
      });
      
      // Add toast notification - now using the correct extracted values
      addDraftToast(playerName, position, team, isAutoDraft);
      
      // Remove the drafted player from available players
      draftPlayer(draftedPlayer);
      
      // Immediately update turn state to reduce lag
      console.log('🔄 Player drafted, immediately updating turn state');
      setIsMyTurn(false); // Current picker is no longer picking
      
      console.log('✅ Player drafted, waiting for TurnChanged event to handle timer');
    };

    const handleDraftPaused = (data: any) => {
      console.log('Draft paused via WebSocket:', data);
      stopDraftTimer();
    };

    const handleDraftResumed = (data: any) => {
      console.log('Draft resumed via WebSocket:', data);
      const myTurn = data.CurrentUserId === user.id;
      setIsMyTurn(myTurn);
      if (myTurn) {
        startDraftTimer(data.TimeLimit || 15);
      }
    };

    const handleDraftCompleted = (data: any) => {
      console.log('Draft completed via WebSocket:', data);
      stopDraftTimer();
      setIsMyTurn(false);
    };

    // Register WebSocket event listeners with debugging
    console.log('🎯 REGISTERING WEBSOCKET EVENT LISTENERS');
    signalRService.onDraftStarted(handleDraftStarted);
    console.log('✅ Registered DraftStarted listener');
    signalRService.onTurnChanged(handleTurnChanged);
    console.log('✅ Registered TurnChanged listener');
    signalRService.onPlayerDrafted(handlePlayerDrafted);
    console.log('✅ Registered PlayerDrafted listener');
    signalRService.onDraftPaused(handleDraftPaused);
    console.log('✅ Registered DraftPaused listener');
    signalRService.onDraftResumed(handleDraftResumed);
    console.log('✅ Registered DraftResumed listener');
    signalRService.onDraftCompleted(handleDraftCompleted);
    console.log('✅ Registered DraftCompleted listener');
    console.log('🎯 ALL WEBSOCKET EVENT LISTENERS REGISTERED');

    return () => {
      // Cleanup event listeners
      signalRService.offDraftStarted(handleDraftStarted);
      signalRService.offTurnChanged(handleTurnChanged);
      signalRService.offPlayerDrafted(handlePlayerDrafted);
      signalRService.offDraftPaused(handleDraftPaused);
      signalRService.offDraftResumed(handleDraftResumed);
      signalRService.offDraftCompleted(handleDraftCompleted);
      stopDraftTimer();
    };
  }, [user?.league?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="draft-container">
      <header className="page-header draft-header">
        <h1 className="page-title">Fantasy Draft</h1>
        <p className="page-subtitle">Select players to build your ultimate fantasy team</p>
        
        {/* Draft Timer Section */}
        {(draftState?.isActive || draftTimerActive || webSocketDraftState) && (
          <div className="draft-timer-section">
            <div className="timer-container">
              <div className="timer-display">
                <span className="timer-label">Time Remaining:</span>
                <span className={`timer-value ${(draftTimerActive ? draftTimer : state.timer.timeRemaining) <= 5 ? 'urgent' : ''} ${state.timer.isPaused ? 'paused' : ''}`}>
                  {draftTimerActive ? draftTimer : state.timer.timeRemaining}s
                </span>
              </div>
              
              <div className="timer-bar-container">
                <div 
                  className={`timer-bar ${(draftTimerActive ? draftTimer : state.timer.timeRemaining) <= 5 ? 'urgent' : ''} ${state.timer.isPaused ? 'paused' : ''}`}
                  style={{ width: `${((draftTimerActive ? draftTimer : state.timer.timeRemaining) / 15) * 100}%` }}
                />
              </div>
              
              <button 
                onClick={draftTimerActive && user?.league?.id ? 
                  () => signalRService.pauseDraft(user.league!.id) : 
                  draftOperations.pauseTimer
                }
                className="pause-btn"
              >
                {state.timer.isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
            
            {draftTimerActive && (
              <div className="draft-timer-status">
                {isMyTurn ? (
                  <div className="your-turn-message">
                    🎯 It's your turn to pick! Time remaining: {draftTimer}s
                  </div>
                ) : (
                  <div className="waiting-turn-message">
                    ⏳ Waiting for pick... Time remaining: {draftTimer}s
                  </div>
                )}
              </div>
            )}
            
            {/* Timeout messages now handled by toast notifications */}
          </div>
        )}
        
        {/* Draft Management */}
        <div className="draft-status-info">
          {!isDraftCreated && (
            <div className="draft-setup">
              <p>No draft created yet for this league.</p>
              <button onClick={createDraft} className="begin-draft-btn">
                Create Draft
              </button>
            </div>
          )}
          
          {isDraftCreated && !draftState?.isActive && !draftTimerActive && !webSocketDraftState && !draftState?.isCompleted && (
            <div className="draft-ready">
              <p>Draft is ready to begin!</p>
              <div className="draft-management-buttons">
                <button onClick={startDraftSession} className="start-draft-btn">
                  Start Draft
                </button>
                <button onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
                {!draftState?.isCompleted && (
                  <button onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
                    Auto Draft
                  </button>
                )}
              </div>
            </div>
          )}
          
          {isDraftCreated && draftState?.isCompleted && (
            <div className="draft-completed">
              <p>✅ Draft has been completed!</p>
              <p>All teams have finished selecting their players.</p>
            </div>
          )}
          
          {(draftState?.isActive || webSocketDraftState) && (
            <div className="draft-active">
              <p>
                Draft in progress - Round {webSocketDraftState?.CurrentRound || draftState?.currentRound || 1}, 
                Pick {(webSocketDraftState?.CurrentTurn || draftState?.currentTurn || 0) + 1}
              </p>
              {(isMyTurn || isCurrentUserTurn) && (
                <p className="your-turn-notification">🎯 It's your turn to pick!</p>
              )}
              <div className="draft-management-buttons">
                <button onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
                {!draftState?.isCompleted && (
                  <button onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
                    Auto Draft
                  </button>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <button 
                      onClick={() => {
                        console.log('🧪 Testing toast notification system...');
                        addDraftToast('Test Player', 'QB', 'Test Team', true);
                      }} 
                      className="draft-control-btn"
                      style={{ backgroundColor: '#ff6b35' }}
                    >
                      Test Toast
                    </button>
                    <button 
                      onClick={() => {
                        console.log('🔍 CONNECTION DEBUG:');
                        console.log('SignalR Connected:', signalRService.isConnected());
                        console.log('User:', user);
                        console.log('Draft State:', draftState);
                        console.log('WebSocket Draft State:', webSocketDraftState);
                        console.log('Is My Turn:', isMyTurn);
                        console.log('Is Current User Turn:', isCurrentUserTurn);
                        console.log('Is Draft Active:', isDraftActive);
                        console.log('Available Players Count:', availablePlayers.length);
                      }} 
                      className="draft-control-btn"
                      style={{ backgroundColor: '#35a3ff' }}
                    >
                      Debug State
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* League Members Section (Draft Order) */}
      {isDraftCreated && draftState && (
        <section className="league-members-section">
          <div className="draft-header-info">
            <h3>Draft Order</h3>
            <div className="draft-status">
              <span className={`status ${draftState.isActive ? 'active' : 'created'}`}>
                {draftState.isActive ? 'In Progress' : 'Ready'}
              </span>
            </div>
          </div>
          
          <div className="league-members-list">
            {draftState.draftOrder?.map((userId, index) => {
              const isCurrentTurn = draftState.isActive && index === draftState.currentTurn;
              const isCurrentUser = user && userId === user.id;
              
              // Find the member details from the leagueMembers array
              const member = state.leagueMembers.find(m => m.id === userId);
              
              return (
                <div 
                  key={userId} 
                  className={`league-member-card ${isCurrentTurn ? 'current-turn' : ''} ${isCurrentUser ? 'current-user' : ''} clickable`}
                  onClick={() => handleManagerClick(userId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleManagerClick(userId);
                    }
                  }}
                >
                  <div className="member-position">{index + 1}</div>
                  <div className="member-info">
                    <div className="member-name">
                      {member ? `${member.firstName} ${member.lastName}` : (isCurrentUser ? 'You' : `User ${userId}`)}
                    </div>
                    <div className="member-username">
                      @{member ? member.username : (isCurrentUser ? user.username : `user${userId}`)}
                    </div>
                    {isCurrentTurn && <div className="turn-indicator">Current Pick</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}


      {/* Draft Main Content Area */}
      <section className="draft-main-content">
        
        {/* Show Available Players and Filters only when draft is not completed */}
        {!draftState?.isCompleted ? (
          <>
            {/* Filters Section - moved above available players */}
            <section className="filters-section">
              <div className="filters-header">
                <h3>Filters</h3>
              </div>
              
              <div className="filters-content">
                <div className="league-filter">
                  <h4>League</h4>
                  <div className="league-buttons">
                    <button
                      className={selectedLeague === 'ALL' ? 'active' : ''}
                      onClick={() => setSelectedLeague('ALL')}
                    >
                      All Leagues
                    </button>
                    <button
                      className={selectedLeague === 'NFL' ? 'active' : ''}
                      onClick={() => setSelectedLeague('NFL')}
                    >
                      NFL
                    </button>
                    <button
                      className={selectedLeague === 'MLB' ? 'active' : ''}
                      onClick={() => setSelectedLeague('MLB')}
                    >
                      MLB
                    </button>
                    <button
                      className={selectedLeague === 'NBA' ? 'active' : ''}
                      onClick={() => setSelectedLeague('NBA')}
                    >
                      NBA
                    </button>
                  </div>
                </div>

                <div className="position-filter">
                  <h4>Filter by Position</h4>
                  <div className="position-tabs">
                    <button
                      className={selectedPosition === 'ALL' ? 'active' : ''}
                      onClick={() => setSelectedPosition('ALL')}
                    >
                      All
                    </button>
                    {selectedLeague === 'ALL' && (
                      <>
                        <button className={selectedPosition === 'QB' ? 'active' : ''} onClick={() => setSelectedPosition('QB')}>QB</button>
                        <button className={selectedPosition === 'RB' ? 'active' : ''} onClick={() => setSelectedPosition('RB')}>RB</button>
                        <button className={selectedPosition === 'WR' ? 'active' : ''} onClick={() => setSelectedPosition('WR')}>WR</button>
                        <button className={selectedPosition === 'TE' ? 'active' : ''} onClick={() => setSelectedPosition('TE')}>TE</button>
                        <button className={selectedPosition === 'SP' ? 'active' : ''} onClick={() => setSelectedPosition('SP')}>SP</button>
                        <button className={selectedPosition === 'CP' ? 'active' : ''} onClick={() => setSelectedPosition('CP')}>CP</button>
                        <button className={selectedPosition === '1B' ? 'active' : ''} onClick={() => setSelectedPosition('1B')}>1B</button>
                        <button className={selectedPosition === '2B' ? 'active' : ''} onClick={() => setSelectedPosition('2B')}>2B</button>
                        <button className={selectedPosition === '3B' ? 'active' : ''} onClick={() => setSelectedPosition('3B')}>3B</button>
                        <button className={selectedPosition === 'SS' ? 'active' : ''} onClick={() => setSelectedPosition('SS')}>SS</button>
                        <button className={selectedPosition === 'OF' ? 'active' : ''} onClick={() => setSelectedPosition('OF')}>OF</button>
                        <button className={selectedPosition === 'PG' ? 'active' : ''} onClick={() => setSelectedPosition('PG')}>PG</button>
                        <button className={selectedPosition === 'SG' ? 'active' : ''} onClick={() => setSelectedPosition('SG')}>SG</button>
                        <button className={selectedPosition === 'SF' ? 'active' : ''} onClick={() => setSelectedPosition('SF')}>SF</button>
                        <button className={selectedPosition === 'PF' ? 'active' : ''} onClick={() => setSelectedPosition('PF')}>PF</button>
                        <button className={selectedPosition === 'C' ? 'active' : ''} onClick={() => setSelectedPosition('C')}>C</button>
                      </>
                    )}
                    {selectedLeague === 'NFL' && (
                      <>
                        <button className={selectedPosition === 'QB' ? 'active' : ''} onClick={() => setSelectedPosition('QB')}>QB</button>
                        <button className={selectedPosition === 'RB' ? 'active' : ''} onClick={() => setSelectedPosition('RB')}>RB</button>
                        <button className={selectedPosition === 'WR' ? 'active' : ''} onClick={() => setSelectedPosition('WR')}>WR</button>
                        <button className={selectedPosition === 'TE' ? 'active' : ''} onClick={() => setSelectedPosition('TE')}>TE</button>
                      </>
                    )}
                    {selectedLeague === 'MLB' && (
                      <>
                        <button className={selectedPosition === 'SP' ? 'active' : ''} onClick={() => setSelectedPosition('SP')}>SP</button>
                        <button className={selectedPosition === 'CP' ? 'active' : ''} onClick={() => setSelectedPosition('CP')}>CP</button>
                        <button className={selectedPosition === '1B' ? 'active' : ''} onClick={() => setSelectedPosition('1B')}>1B</button>
                        <button className={selectedPosition === '2B' ? 'active' : ''} onClick={() => setSelectedPosition('2B')}>2B</button>
                        <button className={selectedPosition === '3B' ? 'active' : ''} onClick={() => setSelectedPosition('3B')}>3B</button>
                        <button className={selectedPosition === 'SS' ? 'active' : ''} onClick={() => setSelectedPosition('SS')}>SS</button>
                        <button className={selectedPosition === 'OF' ? 'active' : ''} onClick={() => setSelectedPosition('OF')}>OF</button>
                      </>
                    )}
                    {selectedLeague === 'NBA' && (
                      <>
                        <button className={selectedPosition === 'PG' ? 'active' : ''} onClick={() => setSelectedPosition('PG')}>PG</button>
                        <button className={selectedPosition === 'SG' ? 'active' : ''} onClick={() => setSelectedPosition('SG')}>SG</button>
                        <button className={selectedPosition === 'SF' ? 'active' : ''} onClick={() => setSelectedPosition('SF')}>SF</button>
                        <button className={selectedPosition === 'PF' ? 'active' : ''} onClick={() => setSelectedPosition('PF')}>PF</button>
                        <button className={selectedPosition === 'C' ? 'active' : ''} onClick={() => setSelectedPosition('C')}>C</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Available Players Section - side by side with drafted players */}
            <section className="available-players-section">
              <div className="available-players">
                <h2>
                  Available Players ({filteredPlayers.length})
                  {!state.timer.isDrafting ? (
                    <span className="draft-status"> - Draft Not Started</span>
                  ) : state.timer.isPaused ? (
                    <span className="draft-status paused"> - Draft Paused</span>
                  ) : null}
                </h2>

                <div className="table-container">
                  {filteredPlayers.length === 0 ? (
                    <div className="empty-state">
                      <p>No available players</p>
                      <p>Try adjusting your filters or wait for more players to become available.</p>
                    </div>
                  ) : (
                    <VirtualScrollTable
                      data={filteredPlayers}
                      columns={[
                        {
                          key: 'name',
                          header: 'Player',
                          width: '35%',
                          render: (player: Player, index: number) => (
                            <span 
                              className="player-name clickable-player-name"
                              onClick={() => handlePlayerNameClick(player)}
                            >
                              {player.name}
                            </span>
                          )
                        },
                        {
                          key: 'position',
                          header: 'Pos',
                          width: '10%',
                          render: (player: Player, index: number) => (
                            <span className="position">{player.position}</span>
                          )
                        },
                        {
                          key: 'team',
                          header: 'Team',
                          width: '15%',
                          render: (player: Player, index: number) => (
                            <span className="team">{player.team}</span>
                          )
                        },
                        {
                          key: 'league',
                          header: 'League',
                          width: '10%',
                          render: (player: Player, index: number) => (
                            <span className={`league-badge ${player.league.toLowerCase()}`}>
                              {player.league}
                            </span>
                          )
                        },
                        {
                          key: 'action',
                          header: 'Action',
                          width: '30%',
                          render: (player: Player, index: number) => (
                            <button
                              className={`draft-btn ${!isCurrentUserTurn || !isDraftActive || isPickInProgress ? 'disabled' : ''}`}
                              onClick={() => handleDraftClick(player)}
                              disabled={!isCurrentUserTurn || !isDraftActive || isPickInProgress}
                            >
                              {isPickInProgress ? 'Drafting...' : 'Draft'}
                            </button>
                          )
                        }
                      ]}
                      itemHeight={60}
                      containerHeight={500}
                      className="draft-virtual-table"
                      getRowKey={(player: Player) => player.id}
                    />
                  )}
                </div>
              </div>

              {/* Drafted Players Sidebar - now inside available-players-section */}
              <aside className="drafted-players-sidebar">
                <div className="sidebar-header">
                  <h3>Drafted Players</h3>
                </div>
                {isDraftCreated && draftState && draftState.draftPicks && (
                  <div className="total-picks-container">
                    <span className="total-picks">{draftState.draftPicks.length} total picks</span>
                  </div>
                )}
                
                {isDraftCreated && draftState && draftState.draftPicks && draftState.draftPicks.length > 0 ? (
                  <div className="drafted-players-container">
                    {draftState.draftPicks
                      .sort((a: any, b: any) => b.pickNumber - a.pickNumber) // Sort newest first (most recent at top)
                      .map((pick: any) => {
                        const member = state.leagueMembers.find(m => m.id === pick.userId);
                        const memberName = member ? `${member.firstName} ${member.lastName}` : (user && pick.userId === user.id ? 'You' : `User ${pick.userId}`);
                        
                        return (
                          <div key={pick.id} className="drafted-player-card">
                            <div className="pick-number">#{pick.pickNumber}</div>
                            <div className="pick-details">
                              <div className="player-info">
                                <span 
                                  className="player-name clickable-player-name"
                                  onClick={() => {
                                    const player: Player = {
                                      id: pick.playerId || 0,
                                      name: pick.playerName,
                                      position: pick.playerPosition,
                                      team: pick.playerTeam,
                                      league: pick.playerLeague as 'NFL' | 'NBA' | 'MLB',
                                      stats: {}
                                    };
                                    handlePlayerNameClick(player);
                                  }}
                                >
                                  {pick.playerName}
                                </span>
                                <span className="player-meta">
                                  {pick.playerPosition} • {pick.playerTeam} • 
                                  <span className={`league-badge ${pick.playerLeague.toLowerCase()}`}>
                                    {pick.playerLeague}
                                  </span>
                                </span>
                              </div>
                              <div className="drafted-by">{memberName}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="no-drafts-message">
                    No players drafted yet
                  </div>
                )}
              </aside>
            </section>
          </>
        ) : (
          /* When draft is completed, show message to use Free Agents */
          <div className="draft-completed-section">
            <div className="draft-completed-content">
              <h2>🎉 Draft Complete!</h2>
              <p>All teams have finished selecting their players.</p>
              <p>You can now pick up free agents to improve your team!</p>
              <button 
                className="free-agents-btn"
                onClick={() => window.location.href = '/free-agents'}
              >
                View Free Agents
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Player Info Modal */}
      {isPlayerInfoModalOpen && (
        <Suspense fallback={<LazyLoadFallback type="modal" />}>
          <PlayerInfoModal
            isOpen={isPlayerInfoModalOpen}
            onClose={handleClosePlayerInfo}
            player={selectedPlayerForInfo}
          />
        </Suspense>
      )}

      {/* Draft Confirmation Modal */}
      {isDraftConfirmModalOpen && (
        <Suspense fallback={<LazyLoadFallback type="modal" />}>
          <DraftConfirmationModal
            isOpen={isDraftConfirmModalOpen}
            onClose={handleCancelDraft}
            onConfirm={handleConfirmDraft}
            player={selectedPlayerForDraft}
            isProcessing={isPickInProgress}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Draft;