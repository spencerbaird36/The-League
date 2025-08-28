import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types/Player';
import LazyLoadFallback from '../components/LazyLoadFallback';
import VirtualScrollTable from '../components/VirtualScrollTable';
import { useDraft } from '../context/DraftContext';
import { useDraftOperations } from '../hooks/useDraftOperations';
// Phase 1 Redesign: New draft hooks
import { useDraftState } from '../hooks/useDraftState';
import { useDraftTimer } from '../hooks/useDraftTimer';
import { useNotifications } from '../hooks/useNotifications';
import { useWebSocketDraft } from '../hooks/useWebSocketDraft';
// Phase 2 Redesign: Enhanced features
import { useDraftAnalytics } from '../hooks/useDraftAnalytics';
import { useDraftProgress } from '../hooks/useDraftProgress';
import DraftBoard from '../components/DraftBoard';
import PlayerRecommendations from '../components/PlayerRecommendations';
import DraftProgressBar from '../components/DraftProgressBar';
// Phase 4 Redesign: Real-time collaboration and management tools
import DraftChatRoom from '../components/DraftChatRoom';
import CommissionerControls from '../components/CommissionerControls';
import { DraftAction } from '../components/CommissionerControls';
import signalRService from '../services/signalRService';
import { draftService } from '../services/draftService';
import { cleanPlayerName } from '../utils/playerNameUtils';
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
  // Phase 1 Redesign: New draft state management
  const [draftState, draftStateActions] = useDraftState();
  const [notifications, notificationActions] = useNotifications({
    maxNotifications: 5,
    defaultDuration: 4000,
    enableSounds: true
  });
  // Phase 1 Redesign: New timer management
  const [timerState, timerActions] = useDraftTimer({
    defaultDuration: 15, // 15 seconds to match backend
    onTimerExpired: () => {
      if (draftState.isActive && draftStateActions.isMyTurn(user?.id || 0)) {
        handleAutoDraft();
      }
    },
    onTimerTick: (timeRemaining) => {
      draftStateActions.setTimeRemaining(timeRemaining);
    }
  });

  // Use the new draft context and operations
  const { state, dispatch } = useDraft();
  const draftOperations = useDraftOperations(user);
  const navigate = useNavigate();
  
  // Phase 1 Redesign: WebSocket draft management
  const webSocketActions = useWebSocketDraft({
    leagueId: user?.league?.id,
    userId: user?.id,
    events: {
      onDraftStarted: (data) => {
        console.log('🎯 Draft started event received:', data);
        draftStateActions.updateDraftState({
          isActive: true,
          currentPlayerId: data.CurrentUserId || data.currentUserId,
          currentTurn: data.CurrentTurn || data.currentTurn || 0,
          currentRound: data.CurrentRound || data.currentRound || 1
        });
        // Initialize WebSocket timer state
        setWebSocketTimer({
          timeRemaining: data.TimeLimit || 15,
          isActive: true
        });
        
        // Initialize WebSocket draft state for UI compatibility
        setWebSocketDraftState({
          CurrentUserId: data.CurrentUserId || data.currentUserId,
          CurrentTurn: data.CurrentTurn || data.currentTurn || 0,
          CurrentRound: data.CurrentRound || data.currentRound || 1,
          TimeLimit: data.TimeLimit || 15
        });
        
        timerActions.startTimer(data.TimeLimit || 15);
        notificationActions.notifyDraftStarted();
        if (draftStateActions.isMyTurn(user?.id || 0)) {
          notificationActions.notifyYourTurn();
        }
      },
      onTurnChanged: (data) => {
        console.log('🔄 Turn changed event received:', data);
        const newCurrentPlayerId = data.CurrentUserId || data.currentUserId;
        draftStateActions.updateDraftState({
          isActive: true,
          currentPlayerId: newCurrentPlayerId,
          currentTurn: data.CurrentTurn || data.currentTurn,
          currentRound: data.CurrentRound || data.currentRound
        });
        // Reset WebSocket timer for new turn
        setWebSocketTimer({
          timeRemaining: data.TimeLimit || 15,
          isActive: true
        });
        
        // Update WebSocket draft state for compatibility
        setWebSocketDraftState((prev: any) => ({
          ...prev,
          CurrentUserId: newCurrentPlayerId,
          CurrentTurn: data.CurrentTurn || data.currentTurn,
          CurrentRound: data.CurrentRound || data.currentRound,
          TimeLimit: data.TimeLimit || 15
        }));
        
        // Update isMyTurn state
        const isMyTurnNow = newCurrentPlayerId === user?.id;
        setIsMyTurn(isMyTurnNow);
        
        timerActions.resetTimer(data.TimeLimit || 15);
        if (isMyTurnNow) {
          notificationActions.notifyYourTurn();
        }
      },
      onPlayerDrafted: (data) => {
        console.log('✅ Player drafted event received (Draft.tsx):', data);
        
        // Extract player information from WebSocket event
        const playerId = data.playerId || data.PlayerId || data.playerName?.toLowerCase().replace(/\s+/g, '-');
        const playerName = data.playerName || data.PlayerName || 'Unknown Player';
        const position = data.position || data.Position || 'Unknown';
        const team = data.team || data.Team || 'Unknown';
        const league = data.league || data.League || 'NFL';
        const isAutoDraft = data.isAutoDraft || data.IsAutoDraft || false;
        
        // Extract drafter information
        const drafterId = data.userId || data.UserId;
        const drafterUsername = data.username || data.Username;
        
        // Find the drafter's display name
        let drafterDisplayName = 'Unknown Player';
        if (drafterId) {
          const member = state.leagueMembers.find(m => m.id === drafterId);
          if (member) {
            drafterDisplayName = `${member.firstName} ${member.lastName}`;
          } else if (user && drafterId === user.id) {
            drafterDisplayName = 'You';
          } else if (drafterUsername) {
            drafterDisplayName = drafterUsername;
          } else {
            drafterDisplayName = `User ${drafterId}`;
          }
        }
        
        // Add notification for player pick
        notificationActions.notifyPlayerPicked(playerName, position, team, isAutoDraft, drafterDisplayName);
        
        // Update legacy rosters for backward compatibility
        const draftedPlayer: Player = {
          id: playerId || `${playerName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          name: playerName,
          position: position,
          team: team,
          league: league as 'NFL' | 'NBA' | 'MLB'
        };
        draftPlayer(draftedPlayer);
        
        // Refresh draft state (but limit API polling by using setTimeout)
        setTimeout(() => {
          Promise.all([
            draftOperations.fetchDraftState(),
            fetchAvailablePlayersFromBackend()
          ]).catch(error => {
            console.error('❌ Failed to refresh state after player drafted:', error);
          });
        }, 500); // Delay to prevent rapid polling
      },
      onDraftPaused: (data) => {
        console.log('⏸️ Draft paused event received:', data);
        draftStateActions.updateDraftState({ isPaused: true });
        timerActions.pauseTimer();
        notificationActions.notifyDraftPaused();
      },
      onDraftResumed: (data) => {
        console.log('▶️ Draft resumed event received:', data);
        draftStateActions.updateDraftState({ isPaused: false });
        timerActions.resumeTimer();
        notificationActions.notifyDraftResumed();
      },
      onDraftCompleted: (data) => {
        console.log('🏁 Draft completed event received:', data);
        draftStateActions.updateDraftState({ 
          isCompleted: true, 
          isActive: false 
        });
        // Stop WebSocket timer
        setWebSocketTimer({
          timeRemaining: 0,
          isActive: false
        });
        timerActions.stopTimer();
        
        // Stop auto-drafting state and show completion message
        draftOperations.stopAutoDrafting();
        
        notificationActions.notifyDraftCompleted();
        
        // Refresh draft state to get all the new picks
        draftOperations.fetchDraftState();
      },
      onTimerTick: (data) => {
        const timeRemaining = data.TimeRemaining ?? data.timeRemaining;
        if (timeRemaining !== undefined) {
          draftStateActions.setTimeRemaining(timeRemaining);
          // Update WebSocket timer state for UI display
          setWebSocketTimer({
            timeRemaining: timeRemaining,
            isActive: true
          });
        } else {
          console.warn('❌ TimerTick data missing timeRemaining:', data);
        }
      },
      onAutoDraft: (data) => {
        console.log('🤖 Auto draft event received:', data);
        // Auto-draft logic handled in onPlayerDrafted
      },
      onDraftReset: (data) => {
        console.log('🔄 Draft reset event received (Draft.tsx):', data);
        draftStateActions.resetDraftState();
        timerActions.stopTimer();
        // Clear WebSocket draft state to ensure start button shows
        setWebSocketDraftState(null);
        notificationActions.addNotification({
          type: 'turn',
          title: 'Draft Reset',
          message: `Draft was reset by ${data.ResetBy || 'Administrator'}`,
          duration: 5000
        });
        // Dispatch to context to trigger refresh across app
        dispatch({ type: 'DRAFT_RESET' });
        // Throttle API call after reset to prevent excessive polling
        setTimeout(() => {
          fetchAvailablePlayersFromBackend();
        }, 1000);
      },
      onDraftPickError: (data) => {
        console.log('❌ Draft pick error event received:', data);
        
        // Show user-friendly error message based on error type
        let errorMessage = 'Failed to make draft pick';
        if (data.Error === 'NOT_YOUR_TURN') {
          errorMessage = data.Message || "It's not your turn to draft";
        } else if (data.Message) {
          errorMessage = data.Message;
        }
        
        notificationActions.notifyError(errorMessage);
      }
    }
  });

  // Legacy state for backward compatibility
  const [webSocketDraftState, setWebSocketDraftState] = useState<any>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [draftTimer, setDraftTimer] = useState(15);
  const [draftTimerActive, setDraftTimerActive] = useState(false);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasJoinedLeagueRef = useRef<boolean>(false);
  
  // WebSocket timer state
  const [webSocketTimer, setWebSocketTimer] = useState<{timeRemaining: number; isActive: boolean}>({
    timeRemaining: 15,
    isActive: false
  });
  
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
  
  // Phase 1 Redesign: Update legacy state based on new draft state
  useEffect(() => {
    setIsMyTurn(draftStateActions.isMyTurn(user?.id || 0));
    setDraftTimer(timerState.timeRemaining);
    setDraftTimerActive(timerState.isActive);
  }, [draftState.currentPlayerId, user?.id, timerState.timeRemaining, timerState.isActive, draftStateActions]);
  
  const [isPlayerInfoModalOpen, setIsPlayerInfoModalOpen] = useState<boolean>(false);
  const [isDraftConfirmModalOpen, setIsDraftConfirmModalOpen] = useState<boolean>(false);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<Player | null>(null);
  const [selectedPlayerForDraft, setSelectedPlayerForDraft] = useState<Player | null>(null);
  
  
  // Phase 4 Redesign: Chat and commissioner controls visibility
  const [isDraftChatVisible, setIsDraftChatVisible] = useState(false);
  const [isCommissionerControlsVisible, setIsCommissionerControlsVisible] = useState(false);
  
  
  // Get values from draft context (legacy)
  const legacyDraftState = draftOperations.draftState;
  const isDraftCreated = !!legacyDraftState;
  
  // Phase 2 Redesign: Enhanced analytics and progress tracking
  const draftAnalytics = useDraftAnalytics();
  const draftProgress = useDraftProgress(
    legacyDraftState?.draftOrder || draftState.draftOrder,
    legacyDraftState?.draftPicks || draftState.picks,
    draftState.currentTurn,
    user?.id
  );
  
  
  // State for available players from backend
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [isLoadingAvailablePlayers, setIsLoadingAvailablePlayers] = useState(false);
  
  // Debounce timer for API calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced function to fetch available players from backend
  const debouncedFetchPlayers = useCallback(async () => {
    const leagueId = user?.league?.id;
    
    if (!leagueId) {
      return;
    }

    setIsLoadingAvailablePlayers(true);
    try {
      const backendPlayers = await draftService.fetchAvailablePlayersForDraft(leagueId);
      setAvailablePlayers(backendPlayers);
    } catch (error) {
      console.error('Failed to fetch available players:', error);
      setAvailablePlayers([]);
    } finally {
      setIsLoadingAvailablePlayers(false);
    }
  }, [user?.league?.id]); // Remove isLoadingAvailablePlayers to prevent loops

  // Function to fetch available players with debouncing
  const fetchAvailablePlayersFromBackend = useCallback(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set up new debounced call
    debounceTimerRef.current = setTimeout(() => {
      debouncedFetchPlayers();
    }, 1000); // 1 second debounce
  }, [debouncedFetchPlayers]);

  // Fetch available players when component mounts or league changes
  useEffect(() => {
    if (user?.league?.id) {
      debouncedFetchPlayers();
    }
  }, [user?.league?.id, debouncedFetchPlayers]);

  const filteredPlayers = React.useMemo(() => {
    const filtered = availablePlayers.filter((player: Player) => {
      const leagueMatch = selectedLeague === 'ALL' || player.league === selectedLeague;
      const positionMatch = selectedPosition === 'ALL' || player.position === selectedPosition;
      return leagueMatch && positionMatch;
    });
    
    return filtered;
  }, [availablePlayers, selectedLeague, selectedPosition]);
  
  // Phase 2 Redesign: Smart recommendations and analytics
  const teamNeeds = React.useMemo(() => {
    if (!user?.id || !legacyDraftState?.draftPicks) return [];
    return draftAnalytics.analyzeTeamNeeds(user.id, legacyDraftState.draftPicks);
  }, [user?.id, legacyDraftState?.draftPicks, draftAnalytics]);
  
  const playerSuggestions = React.useMemo(() => {
    if (!user?.id || !legacyDraftState?.draftPicks || !draftStateActions.isMyTurn(user.id)) return [];
    return draftAnalytics.getSuggestedPicks(user.id, legacyDraftState.draftPicks, availablePlayers);
  }, [user?.id, legacyDraftState?.draftPicks, draftStateActions, availablePlayers, draftAnalytics]);

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

  // Phase 1 Redesign: Enhanced draft start with new systems
  const startDraftSession = async () => {
    console.log('=== START DRAFT SESSION CALLED (Phase 1) ===');
    
    if (!user?.league?.id) {
      notificationActions.notifyError('No league found. Please make sure you are in a league.');
      return;
    }

    const currentLegacyDraftState = draftOperations.draftState;
    if (!currentLegacyDraftState) {
      notificationActions.notifyError('No draft found. Please create a draft first.');
      return;
    }

    if (currentLegacyDraftState.isActive || draftState.isActive) {
      notificationActions.notifyError('Draft is already active.');
      return;
    }

    try {
      // Use WebSocket-based draft system if connected
      if (webSocketActions.isConnected()) {
        // Start the draft state in backend, but WebSocket will handle timer
        const updatedDraft = await draftService.startDraft(currentLegacyDraftState.id);
        // Update draft state without starting legacy timer
        draftStateActions.updateDraftState({ 
          isActive: true,
          draftOrder: updatedDraft.draftOrder || [],
          currentTurn: updatedDraft.currentTurn || 0,
          currentRound: updatedDraft.currentRound || 1,
        });
        await webSocketActions.startDraft(user.league.id);
      } else {
        console.warn('⚠️ WebSocket not connected - starting timer locally');
        // Fallback: start timer locally if WebSocket not available
        draftStateActions.updateDraftState({ 
          isActive: true,
          draftOrder: currentLegacyDraftState.draftOrder || [],
          currentTurn: 0,
          currentRound: 1,
          currentPlayerId: currentLegacyDraftState.draftOrder?.[0] || 0
        });
        timerActions.startTimer(15);
      }
      
      console.log('✅ Draft started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start draft:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationActions.notifyError(`Failed to start draft: ${errorMessage}`);
    }
  };

  // Track if a pick is currently being made to prevent duplicates
  const [isPickInProgress, setIsPickInProgress] = useState(false);

  // Function to fetch current draft state via correct API
  const fetchCurrentDraftState = useCallback(async () => {
    if (!user?.league?.id) return;
    
    try {
      console.log('🔄 Fetching current draft state via draftService...');
      
      // Use the correct draft service endpoint
      await draftOperations.fetchDraftState();
      const currentState = draftOperations.draftState;
      console.log('📊 Current draft state from hook:', currentState);
      
      if (currentState) {
        // Handle different possible response structures
        const isActive = currentState.isActive || false;
        const timeLimit = 15; // Default timer value
        
        if (isActive) {
          // Determine current user ID from draft order and current turn
          const currentUserIndex = currentState.currentTurn % currentState.draftOrder.length;
          const currentUserId = currentState.draftOrder[currentUserIndex];
          
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
            // startDraftTimer will be called when needed
          }
        } else {
          console.log('⚠️ Draft is not active according to API');
        }
      } else {
        console.log('⚠️ Could not fetch draft state');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch current draft state:', error);
    }
  }, [user?.league?.id, user?.id, draftOperations.fetchDraftState, draftOperations.draftState]);

  // Phase 1 Redesign: Enhanced draft pick with new systems
  const makeDraftPick = useCallback(async (player: Player) => {
    
    // Prevent duplicate pick attempts
    if (isPickInProgress) {
      console.warn('⚠️ Pick already in progress, ignoring duplicate request');
      return;
    }
    
    setIsPickInProgress(true);
    
    try {
      if (webSocketActions.isConnected() && user?.league?.id) {
        // Use WebSocket via new hook
        console.log('✅ Using WebSocket draft pick (Phase 1)');
        await webSocketActions.makePick(user.league.id, player, false);
        console.log('📞 WebSocket draft pick completed');
      } else {
        // Fallback to REST API
        console.log('❌ Using REST API fallback (Phase 1)');
        await draftOperations.makeDraftPick(player);
        
        // Notifications handled by WebSocket onPlayerDrafted event
        draftPlayer(player, false);
        
        // Advance turn manually in new state
        draftStateActions.advanceTurn();
        timerActions.resetTimer(15);
      }
      
      console.log('✅ Draft pick successful (Phase 1)');
      
    } catch (error) {
      console.error('❌ Draft pick failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationActions.notifyError(`Failed to draft ${player.name}: ${errorMessage}`);
    } finally {
      setIsPickInProgress(false);
    }
  }, [webSocketActions, draftOperations, draftPlayer, addDraftToast, notificationActions, draftStateActions, timerActions, user?.league?.id]);  // Remove isPickInProgress from deps to prevent loop

  // Handle player name click to show player info
  const handlePlayerNameClick = useCallback((player: Player) => {
    setSelectedPlayerForInfo(player);
    setIsPlayerInfoModalOpen(true);
  }, []);
  
  
  // Phase 2 Redesign: Draft board slot click handler
  const handleDraftSlotClick = useCallback((slot: any) => {
    if (slot.player) {
      // Show player info if slot is filled
      handlePlayerNameClick(slot.player);
    } else if (slot.isCurrentPick && slot.isUserPick) {
      // Focus on player selection if it's user's current pick
      const availablePlayersSection = document.querySelector('.available-players');
      availablePlayersSection?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [handlePlayerNameClick]);

  // Draft button click will be defined after variable declarations

  const handleConfirmDraft = () => {
    if (selectedPlayerForDraft) {
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
    if (!legacyDraftState?.id) return;
    
    try {
      await draftOperations.resetDraft(legacyDraftState.id);
      // Also clear local rosters for backward compatibility
      clearRosters();
      // Reset new draft state too
      draftStateActions.resetDraftState();
      timerActions.stopTimer();
      // Clear WebSocket draft state to ensure start button shows
      setWebSocketDraftState(null);
      // Dispatch to context to trigger refresh across app
      dispatch({ type: 'DRAFT_RESET' });
      // Refresh available players after reset
      fetchAvailablePlayersFromBackend();
      console.log('✅ Draft reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset draft:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationActions.notifyError(`Failed to reset draft: ${errorMessage}`);
    }
  };

  // Check if it's the current user's turn (WebSocket mode takes precedence)
  const isCurrentUserTurn = draftState && user ? 
    (signalRService.isConnected() && webSocketDraftState ? 
      (webSocketDraftState.CurrentUserId === user.id && draftState.isActive) : 
      draftOperations.isUserTurn(user.id)) : false;

  // Check if draft is active (WebSocket mode takes precedence)
  const isDraftActive = signalRService.isConnected() && webSocketDraftState ? 
    draftState.isActive : draftState?.isActive;


  // Handle draft button click to show confirmation - optimized with useCallback
  const handleDraftClick = useCallback((player: Player) => {
    
    // Always allow the draft attempt - let backend handle validation and provide proper error feedback
    setSelectedPlayerForDraft(player);
    setIsDraftConfirmModalOpen(true);
  }, []);

  // Phase 2 Redesign: Quick draft from recommendations
  const handleQuickDraft = useCallback((player: Player) => {
    // Always allow the draft attempt - let backend handle validation and provide proper error feedback
    setSelectedPlayerForDraft(player);
    setIsDraftConfirmModalOpen(true);
  }, []);
  


  // Phase 4 Redesign: Commissioner action handler
  const handleCommissionerAction = useCallback((action: DraftAction) => {
    console.log('Commissioner action:', action);
    
    switch (action.type) {
      case 'pause':
        draftStateActions.setTimerActive(false);
        notificationActions.notifyDraftPaused();
        break;
        
      case 'resume':
        draftStateActions.setTimerActive(true);
        notificationActions.notifyDraftResumed();
        break;
        
      case 'reset_timer':
        draftStateActions.setTimeRemaining(10); // Reset to default
        break;
        
      case 'extend_timer':
        const currentTime = draftState.timeRemaining;
        draftStateActions.setTimeRemaining(currentTime + (action.data?.seconds || 30));
        break;
        
      case 'skip_pick':
        draftStateActions.advanceTurn();
        break;
        
      case 'force_pick':
        if (action.data?.player) {
          // This would normally call the draft player function
          console.log('Force picking:', action.data.player.name);
        }
        break;
        
      case 'backup_draft':
        console.log('Creating draft backup...');
        // Would implement backup functionality
        break;
        
      case 'emergency_stop':
        draftStateActions.setTimerActive(false);
        notificationActions.notifyError('Draft stopped by commissioner');
        break;
        
      case 'send_announcement':
        if (action.data?.message) {
          notificationActions.addNotification({
            type: 'turn',
            title: 'Commissioner Announcement',
            message: action.data.message,
            duration: 10000
          });
        }
        break;
        
      default:
        console.warn('Unknown commissioner action:', action.type);
    }
  }, [draftState, draftStateActions, notificationActions]);

  // Phase 1 Redesign: Enhanced auto-draft with new systems
  const handleAutoDraft = useCallback(async () => {
    const currentPlayerId = draftState.currentPlayerId || (webSocketDraftState?.CurrentUserId);
    const userIsCurrentPlayer = currentPlayerId === user?.id;
    
    if (!user?.league?.id || !userIsCurrentPlayer) {
      console.log('❌ Cannot auto-draft: league ID:', user?.league?.id, 'isCurrentPlayer:', userIsCurrentPlayer);
      return;
    }
    
    console.log('🤖 ===== STARTING AUTO-DRAFT PROCESS (Phase 1) =====');
    console.log('🤖 User ID:', user.id, 'League ID:', user.league.id);
    
    try {
      const neededPositions = ['QB', 'RB', 'WR', 'TE', 'SP', 'CP', '1B', '2B', '3B', 'SS', 'C', 'DH', 'OF', 'PG', 'SG', 'SF', 'PF'];
      const availablePlayersForAutoDraft = availablePlayers.filter(player =>
        neededPositions.includes(player.position)
      );
      
      console.log('🤖 Available players for auto-draft:', availablePlayersForAutoDraft.length);
      
      if (availablePlayersForAutoDraft.length > 0) {
        const randomPlayer = availablePlayersForAutoDraft[Math.floor(Math.random() * availablePlayersForAutoDraft.length)];
        console.log('🤖 Selected random player for auto-draft:', randomPlayer.name);
        
        if (webSocketActions.isConnected() && user?.league?.id) {
          // Use WebSocket for auto-draft
          await webSocketActions.makePick(user.league.id, randomPlayer, true);
        } else {
          // Fallback to REST API with auto-draft flag
          await draftOperations.makeDraftPick(randomPlayer);
          
          // Notifications handled by WebSocket onPlayerDrafted event
          draftPlayer(randomPlayer, true);
          
          // Advance turn manually
          draftStateActions.advanceTurn();
          timerActions.resetTimer(15);
        }
        
        console.log('🤖 Auto-draft completed (Phase 1)');
      } else {
        console.log('🤖 No available players for auto-draft!');
        notificationActions.notifyError('No available players for auto-draft');
      }
    } catch (error) {
      console.error('Auto-draft failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationActions.notifyError(`Auto-draft failed: ${errorMessage}`);
    }
  }, [user?.league?.id, user?.id, draftState.currentPlayerId, webSocketDraftState?.CurrentUserId, availablePlayers, webSocketActions, draftOperations, notificationActions, addDraftToast, draftPlayer, draftStateActions, timerActions]);


  // Phase 1 Redesign: Legacy timer wrapper for backward compatibility
  const startDraftTimer = useCallback((timeLimit: number = 15) => {
    timerActions.startTimer(timeLimit);
  }, [timerActions]);

  const stopDraftTimer = useCallback(() => {
    timerActions.stopTimer();
  }, [timerActions]);

  const resetDraftTimer = useCallback((timeLimit: number = 15) => {
    timerActions.resetTimer(timeLimit);
  }, [timerActions]);

  // Phase 1 Redesign: WebSocket management now handled by useWebSocketDraft hook
  // Legacy cleanup - keeping some state sync for backward compatibility
  useEffect(() => {
    // Sync legacy state with WebSocket state for components that still need it
    if (webSocketDraftState) {
      setIsMyTurn(webSocketDraftState.CurrentUserId === user?.id);
      setDraftTimer(webSocketDraftState.TimeLimit || 15);
    }
  }, [webSocketDraftState, user?.id]);


  return (
    <div className="draft-container">
      {/* Phase 1 Redesign: Notifications Display */}
      {notifications.length > 0 && (
        <div className="notifications-container" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '400px'
        }}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification notification-${notification.type}`}
              style={{
                background: notification.type === 'error' ? 'linear-gradient(135deg, #dc3545, #e85d6b)' :
                           notification.type === 'turn' ? 'linear-gradient(135deg, var(--accent-gold), #F4D03F)' :
                           notification.type === 'pick' ? 'linear-gradient(135deg, #28a745, #34ce57)' :
                           'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))',
                color: 'white',
                padding: '16px 20px',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => notificationActions.removeNotification(notification.id)}
            >
              <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: '0.9rem' }}>
                {notification.title}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: '0.9' }}>
                {notification.message}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <header className="page-header draft-header">
        <h1 className="page-title">Fantasy Draft</h1>
        <p className="page-subtitle">Select players to build your ultimate fantasy team</p>
        
        {/* Phase 1 Redesign: Updated Timer Section */}
        {(draftState.isActive || timerState.isActive || webSocketDraftState) && (
          <div className="draft-timer-section">
            <div className="timer-container">
              <div className="timer-display">
                <span className="timer-label">Time Remaining:</span>
                <span className={`timer-value ${
                  webSocketTimer.timeRemaining <= 5 ? 'urgent' : ''
                } ${timerState.isPaused || isPaused ? 'paused' : ''}`}>
                  {webSocketTimer.timeRemaining}s
                </span>
              </div>
              
              <div className="timer-bar-container">
                <div 
                  className={`timer-bar ${
                    webSocketTimer.timeRemaining <= 5 ? 'urgent' : ''
                  } ${timerState.isPaused || isPaused ? 'paused' : ''}`}
                  style={{ width: `${(webSocketTimer.timeRemaining / 15) * 100}%` }}
                />
              </div>
              
              <button 
                onClick={() => {
                  if (timerState.isActive && user?.league?.id && webSocketActions.isConnected()) {
                    if (timerState.isPaused) {
                      webSocketActions.resumeDraft(user.league.id);
                    } else {
                      webSocketActions.pauseDraft(user.league.id);
                    }
                  } else {
                    if (timerState.isPaused) {
                      timerActions.resumeTimer();
                    } else {
                      timerActions.pauseTimer();
                    }
                  }
                }}
                className="pause-btn"
              >
                {timerState.isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
            
            {timerState.isActive && (
              <div className="draft-timer-status">
                {draftStateActions.isMyTurn(user?.id || 0) ? (
                  <div className="your-turn-message">
                    🎯 It's your turn to pick!
                  </div>
                ) : (
                  <div className="waiting-turn-message">
                    ⏳ Waiting for pick...
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
          
          {isDraftCreated && !draftState.isActive && !timerState.isActive && !webSocketDraftState && !legacyDraftState?.isCompleted && (
            <div className="draft-ready">
              <p>Draft is ready to begin!</p>
              <div className="draft-management-buttons">
                <button onClick={startDraftSession} className="start-draft-btn">
                  Start Draft
                </button>
                <button onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
                {!legacyDraftState?.isCompleted && (
                  draftOperations.isAutoDrafting ? (
                    <button onClick={draftOperations.stopAutoDrafting} className="stop-auto-draft-btn">
                      Stop Auto Draft
                    </button>
                  ) : (
                    <button onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
                      Auto Draft
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          
          {isDraftCreated && (draftState.isCompleted || legacyDraftState?.isCompleted) && (
            <div className="draft-completed">
              <p>✅ Draft has been completed!</p>
              <p>All teams have finished selecting their players.</p>
              <div className="draft-management-buttons">
                <button onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
              </div>
            </div>
          )}
          
          {(draftState.isActive || timerState.isActive || webSocketDraftState) && (
            <div className="draft-active">
              <p>
                Draft in progress - Round {webSocketDraftState?.CurrentRound || draftState.currentRound || legacyDraftState?.currentRound || 1}, 
                Pick {(webSocketDraftState?.CurrentTurn || draftState.currentTurn || legacyDraftState?.currentTurn || 0) + 1}
              </p>
              {draftOperations.isAutoDrafting && (
                <p className="auto-draft-status">🤖 {draftOperations.autoDraftMessage}</p>
              )}
              {draftStateActions.isMyTurn(user?.id || 0) && !draftOperations.isAutoDrafting && (
                <p className="your-turn-notification">🎯 It's your turn to pick!</p>
              )}
              
              {/* Phase 2 Redesign: Draft Progress Bar */}
              <DraftProgressBar
                completionPercentage={draftProgress.getDraftCompletionPercentage()}
                currentRound={webSocketDraftState?.CurrentRound || draftState.currentRound || legacyDraftState?.currentRound || 1}
                totalRounds={15}
                currentPick={(webSocketDraftState?.CurrentTurn || draftState.currentTurn || legacyDraftState?.currentTurn || 0) + 1}
                totalPicks={(legacyDraftState?.draftOrder?.length || draftState.draftOrder.length || 0) * 15}
                picksRemaining={draftProgress.getPicksRemaining()}
              />
              
              <div className="draft-management-buttons">
                <button onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
                {!draftState?.isCompleted && (
                  draftOperations.isAutoDrafting ? (
                    <button onClick={draftOperations.stopAutoDrafting} className="stop-auto-draft-btn">
                      Stop Auto Draft
                    </button>
                  ) : (
                    <button onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
                      Auto Draft
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </header>



      {/* Draft Main Content Area */}
      <section className="draft-main-content">
        
        {/* Phase 2 Redesign: Draft Board Visualization */}
        {isDraftCreated && legacyDraftState && (
          <DraftBoard
            board={draftProgress.getDraftBoard()}
            leagueMembers={state.leagueMembers}
            currentUser={user ? {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName
            } : undefined}
            onSlotClick={handleDraftSlotClick}
            className="main-draft-board"
          />
        )}
        
        {/* Show Available Players and Filters only when draft is not completed */}
        {!draftState.isCompleted && !legacyDraftState?.isCompleted ? (
          <>
            {/* Phase 2 Redesign: Player Recommendations */}
            {draftStateActions.isMyTurn(user?.id || 0) && playerSuggestions.length > 0 && (
              <PlayerRecommendations
                suggestions={playerSuggestions}
                teamNeeds={teamNeeds}
                onPlayerClick={handlePlayerNameClick}
                onPlayerSelect={handleQuickDraft}
                className="main-recommendations"
              />
            )}
            
            {/* Phase 4 Redesign: Draft Chat Room */}
            <DraftChatRoom
              leagueId={user?.league?.id}
              userId={user?.id}
              username={user?.username}
              isVisible={isDraftChatVisible}
              onToggle={() => setIsDraftChatVisible(!isDraftChatVisible)}
            />
            
            {/* Phase 4 Redesign: Commissioner Controls */}
            <CommissionerControls
              isCommissioner={user?.id === 1} // Simplified check - would be more sophisticated
              draftState={webSocketDraftState || draftState}
              picks={legacyDraftState?.draftPicks || draftState.picks || []}
              draftOrder={legacyDraftState?.draftOrder || draftState.draftOrder}
              availablePlayers={availablePlayers}
              isVisible={isCommissionerControlsVisible}
              onToggle={() => setIsCommissionerControlsVisible(!isCommissionerControlsVisible)}
              onDraftAction={handleCommissionerAction}
            />
            
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
                        <button className={selectedPosition === 'C' ? 'active' : ''} onClick={() => setSelectedPosition('C')}>C</button>
                        <button className={selectedPosition === 'DH' ? 'active' : ''} onClick={() => setSelectedPosition('DH')}>DH</button>
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
                        <button className={selectedPosition === 'C' ? 'active' : ''} onClick={() => setSelectedPosition('C')}>C</button>
                        <button className={selectedPosition === 'DH' ? 'active' : ''} onClick={() => setSelectedPosition('DH')}>DH</button>
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
                  {!draftState.isActive && !timerState.isActive ? (
                    <span className="draft-status"> - Draft Not Started</span>
                  ) : timerState.isPaused || draftState.isPaused ? (
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
                          width: '40%',
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
                          width: '12%',
                          render: (player: Player, index: number) => (
                            <span className="position">{player.position}</span>
                          )
                        },
                        {
                          key: 'team',
                          header: 'Team',
                          width: '16%',
                          render: (player: Player, index: number) => (
                            <span className="team">{player.team}</span>
                          )
                        },
                        {
                          key: 'league',
                          header: 'League',
                          width: '12%',
                          render: (player: Player, index: number) => (
                            <span className={`league-badge ${player.league.toLowerCase()}`}>
                              {player.league}
                            </span>
                          )
                        },
                        {
                          key: 'action',
                          header: 'Action',
                          width: '20%',
                          render: (player: Player, index: number) => (
                            <button
                              className={`draft-btn ${!isCurrentUserTurn || !isDraftActive || isPickInProgress ? 'disabled' : ''}`}
                              onClick={() => handleDraftClick(player)}
                              disabled={!isDraftActive || isPickInProgress}
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
                {isDraftCreated && legacyDraftState && legacyDraftState.draftPicks && (
                  <div className="total-picks-container">
                    <span className="total-picks">{legacyDraftState.draftPicks.length} total picks</span>
                  </div>
                )}
                
                {isDraftCreated && legacyDraftState && legacyDraftState.draftPicks && legacyDraftState.draftPicks.length > 0 ? (
                  <div className="drafted-players-container">
                    {legacyDraftState.draftPicks
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
                                      name: cleanPlayerName(pick.playerName),
                                      position: pick.playerPosition,
                                      team: pick.playerTeam,
                                      league: pick.playerLeague as 'NFL' | 'NBA' | 'MLB',
                                      stats: {}
                                    };
                                    handlePlayerNameClick(player);
                                  }}
                                >
                                  {cleanPlayerName(pick.playerName)}
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
          /* Phase 1 Redesign: When draft is completed, show message to use Free Agents */
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