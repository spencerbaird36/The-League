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
import FloatingDraftTimer from '../components/FloatingDraftTimer';
// Phase 4 Redesign: Real-time collaboration and management tools
import DraftChatRoom from '../components/DraftChatRoom';
import CommissionerControls from '../components/CommissionerControls';
import { DraftAction } from '../components/CommissionerControls';
import signalRService from '../services/signalRService';
import { draftService } from '../services/draftService';
import { leagueService, LeagueConfiguration } from '../services/leagueService';
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

  // Floating timer visibility state
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const timerSectionRef = useRef<HTMLDivElement>(null);
  
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

  // Scroll detection for floating timer visibility
  useEffect(() => {
    const handleScroll = () => {
      if (!timerSectionRef.current || !draftState.isActive) {
        setShowFloatingTimer(false);
        return;
      }

      const timerRect = timerSectionRef.current.getBoundingClientRect();
      const isTimerVisible = timerRect.top >= 0 && timerRect.bottom <= window.innerHeight;
      
      // Show floating timer when main timer is out of view and draft is active
      setShowFloatingTimer(!isTimerVisible && draftState.isActive);
    };

    // Initial check
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [draftState.isActive]);
  
  const [isPlayerInfoModalOpen, setIsPlayerInfoModalOpen] = useState<boolean>(false);
  const [isDraftConfirmModalOpen, setIsDraftConfirmModalOpen] = useState<boolean>(false);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<Player | null>(null);
  const [selectedPlayerForDraft, setSelectedPlayerForDraft] = useState<Player | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  
  // Phase 4 Redesign: Chat and commissioner controls visibility
  const [isDraftChatVisible, setIsDraftChatVisible] = useState(false);
  const [isCommissionerControlsVisible, setIsCommissionerControlsVisible] = useState(false);
  
  
  // Get values from draft context (legacy)
  const legacyDraftState = draftOperations.draftState;
  const isDraftCreated = !!legacyDraftState;
  
  // Phase 2 Redesign: Enhanced analytics and progress tracking
  const draftAnalytics = useDraftAnalytics();
  // Fix draft order issue - generate from all league members if no valid order exists
  let draftOrderToUse = legacyDraftState?.draftOrder || draftState.draftOrder;

  // If we don't have a valid draft order or it doesn't match the number of league members, create one
  if (!draftOrderToUse?.length || draftOrderToUse.length !== state.leagueMembers.length) {
    draftOrderToUse = state.leagueMembers.map(member => member.id);
    console.log('🔧 Generated new draft order from league members:', draftOrderToUse);
  }

  console.log('🎯 Draft order debug:', {
    legacyDraftOrder: legacyDraftState?.draftOrder,
    stateDraftOrder: draftState.draftOrder,
    leagueMembersCount: state.leagueMembers.length,
    leagueMemberIds: state.leagueMembers.map(m => m.id),
    draftOrderToUse,
    legacyDraftOrderLength: legacyDraftState?.draftOrder?.length,
    stateDraftOrderLength: draftState.draftOrder?.length,
    draftOrderToUseLength: draftOrderToUse?.length
  });

  // State for available players from backend
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [isLoadingAvailablePlayers, setIsLoadingAvailablePlayers] = useState(false);
  const [leagueConfig, setLeagueConfig] = useState<LeagueConfiguration | null>(null);

  const draftProgress = useDraftProgress(
    draftOrderToUse,
    legacyDraftState?.draftPicks || draftState.picks,
    draftState.currentTurn,
    leagueConfig?.totalKeeperSlots || 15,
    user?.id
  );
  
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

  // Fetch league configuration to determine enabled sports
  useEffect(() => {
    const fetchLeagueConfig = async () => {
      if (user?.league?.id) {
        try {
          const config = await leagueService.getLeagueConfiguration(user.league.id);
          setLeagueConfig(config);
        } catch (error) {
          console.error('Error fetching league configuration:', error);
        }
      }
    };

    fetchLeagueConfig();
  }, [user?.league?.id]);

  // Fetch initial draft state when component mounts
  useEffect(() => {
    const fetchInitialDraftState = async () => {
      if (user?.league?.id) {
        try {
          console.log('🔄 Fetching initial draft state for league:', user.league.id);
          await draftOperations.fetchDraftState();
          console.log('✅ Initial draft state fetched successfully');
        } catch (error) {
          console.error('❌ Error fetching initial draft state:', error);
        }
      }
    };

    fetchInitialDraftState();
  }, [user?.league?.id]); // Removed draftOperations.fetchDraftState from dependencies to prevent repeated calls

  // Get enabled sports based on league configuration
  const getEnabledSports = (): ('NFL' | 'MLB' | 'NBA')[] => {
    if (!leagueConfig) return ['NFL', 'MLB', 'NBA']; // Default to all sports if config not loaded
    
    const enabledSports: ('NFL' | 'MLB' | 'NBA')[] = [];
    if (leagueConfig.includeNFL) enabledSports.push('NFL');
    if (leagueConfig.includeMLB) enabledSports.push('MLB');
    if (leagueConfig.includeNBA) enabledSports.push('NBA');
    
    return enabledSports;
  };

  const filteredPlayers = React.useMemo(() => {
    const filtered = availablePlayers.filter((player: Player) => {
      const leagueMatch = selectedLeague === 'ALL' || player.league === selectedLeague;
      const positionMatch = selectedPosition === 'ALL' || player.position === selectedPosition;
      const searchMatch = !searchTerm || 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase());
      return leagueMatch && positionMatch && searchMatch;
    });
    
    // Sort by fantasy points in descending order (highest first)
    // Players with projections always rank higher than those without
    filtered.sort((a, b) => {
      const aFantasyPoints = a.projection?.fantasyPoints ?? -1;
      const bFantasyPoints = b.projection?.fantasyPoints ?? -1;
      
      // If both have projections, sort by fantasy points
      if (aFantasyPoints >= 0 && bFantasyPoints >= 0) {
        return bFantasyPoints - aFantasyPoints;
      }
      
      // If only one has projections, prioritize the one with projections
      if (aFantasyPoints >= 0 && bFantasyPoints < 0) return -1;
      if (bFantasyPoints >= 0 && aFantasyPoints < 0) return 1;
      
      // If neither has projections, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return filtered;
  }, [availablePlayers, selectedLeague, selectedPosition, searchTerm]);
  
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
        const updatedDraft = await draftService.startDraft(currentLegacyDraftState.id, user.id);
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
  }, [user?.league?.id, user?.id]); // Removed function dependencies to prevent infinite loops

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
  const handleResetDraft = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent default button behavior to avoid page refresh
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

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

      // Force a complete refresh to ensure all roster data is cleared
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  // Get current player name for floating timer
  const getCurrentPlayerName = useCallback(() => {
    const currentPlayerId = draftState.currentPlayerId;
    if (!currentPlayerId) return 'Unknown Player';
    
    const member = state.leagueMembers.find(m => m.id === currentPlayerId);
    if (member) {
      return `${member.firstName} ${member.lastName}`;
    }
    
    return 'Unknown Player';
  }, [draftState.currentPlayerId, state.leagueMembers]);

  // Phase 1 Redesign: Enhanced auto-draft with new systems
  const handleAutoDraft = useCallback(async () => {
    const currentPlayerId = draftState.currentPlayerId || (webSocketDraftState?.CurrentUserId);
    const userIsCurrentPlayer = currentPlayerId === user?.id;

    if (!user?.league?.id || !userIsCurrentPlayer) {
      console.log('❌ Cannot auto-draft: league ID:', user?.league?.id, 'isCurrentPlayer:', userIsCurrentPlayer);
      return;
    }

    console.log('🤖 ===== STARTING SMART AUTO-DRAFT PROCESS =====');
    console.log('🤖 User ID:', user.id, 'League ID:', user.league.id);

    try {
      // Get available players with projections
      const availablePlayersWithProjections = await draftOperations.getAvailablePlayers();
      console.log('🤖 Available players with projections:', availablePlayersWithProjections.length);

      // Get all currently drafted players for context
      const allDraftedPlayers = draftOperations.allDraftedPlayers;
      console.log('🤖 Total drafted players:', allDraftedPlayers.length);

      // Get needed positions for current user
      const neededPositions = draftOperations.getNeededPositions(user.id);
      console.log('🤖 Needed positions for user:', neededPositions);

      // Use the improved draft service algorithm
      const selectedPlayer = draftService.selectBestAvailablePlayer(
        availablePlayersWithProjections,
        neededPositions,
        allDraftedPlayers
      );

      if (selectedPlayer) {
        console.log(`🤖 Smart auto-draft selected: ${selectedPlayer.name} (${selectedPlayer.position}, ${selectedPlayer.league})`);

        if (webSocketActions.isConnected() && user?.league?.id) {
          // Use WebSocket for auto-draft
          await webSocketActions.makePick(user.league.id, selectedPlayer, true);
        } else {
          // Fallback to REST API with auto-draft flag
          await draftOperations.makeDraftPick(selectedPlayer);

          // Notifications handled by WebSocket onPlayerDrafted event
          draftPlayer(selectedPlayer, true);

          // Advance turn manually
          draftStateActions.advanceTurn();
          timerActions.resetTimer(15);
        }

        console.log('🤖 Smart auto-draft completed successfully');
      } else {
        console.log('🤖 No available players found for auto-draft!');
        notificationActions.notifyError('No available players for auto-draft');
      }
    } catch (error) {
      console.error('Smart auto-draft failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      notificationActions.notifyError(`Auto-draft failed: ${errorMessage}`);

      // Fallback to simple random selection if smart draft fails
      console.log('🤖 Falling back to simple random selection...');
      const simpleAvailable = availablePlayers.filter(player =>
        ['QB', 'RB', 'WR', 'TE', 'SP', 'CP', '1B', '2B', '3B', 'SS', 'C', 'DH', 'OF', 'PG', 'SG', 'SF', 'PF'].includes(player.position)
      );

      if (simpleAvailable.length > 0) {
        const randomPlayer = simpleAvailable[Math.floor(Math.random() * simpleAvailable.length)];
        console.log('🤖 Fallback selected:', randomPlayer.name);

        try {
          if (webSocketActions.isConnected() && user?.league?.id) {
            await webSocketActions.makePick(user.league.id, randomPlayer, true);
          } else {
            await draftOperations.makeDraftPick(randomPlayer);
            draftPlayer(randomPlayer, true);
            draftStateActions.advanceTurn();
            timerActions.resetTimer(15);
          }
        } catch (fallbackError) {
          console.error('Fallback auto-draft also failed:', fallbackError);
        }
      }
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
          top: '20px', // Back to normal position since timer is on left side
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '400px',
          transition: 'top 0.3s ease' // Smooth transition when repositioning
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
          <div className="draft-timer-section" ref={timerSectionRef}>
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
              <button type="button" onClick={createDraft} className="begin-draft-btn">
                Create Draft
              </button>
            </div>
          )}
          
          {isDraftCreated && !draftState.isActive && !timerState.isActive && !webSocketDraftState && (
            <div className="draft-ready">
              <p>Draft is ready to begin!</p>
              <div className="draft-management-buttons">
                <button type="button" onClick={startDraftSession} className="start-draft-btn">
                  Start Draft
                </button>
                <button type="button" onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
                {draftOperations.isAutoDrafting ? (
                  <button type="button" onClick={draftOperations.stopAutoDrafting} className="stop-auto-draft-btn">
                    Stop Auto Draft
                  </button>
                ) : (
                  <button type="button" onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
                    Auto Draft
                  </button>
                )}
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
                totalRounds={leagueConfig?.totalKeeperSlots || 15}
                currentPick={(webSocketDraftState?.CurrentTurn || draftState.currentTurn || legacyDraftState?.currentTurn || 0) + 1}
                totalPicks={(legacyDraftState?.draftOrder?.length || draftState.draftOrder.length || 0) * (leagueConfig?.totalKeeperSlots || 15)}
                picksRemaining={draftProgress.getPicksRemaining()}
              />

              <div className="draft-management-buttons">
                <button type="button" onClick={handleResetDraft} className="draft-control-btn reset">
                  Reset Draft
                </button>
                {draftOperations.isAutoDrafting ? (
                  <button type="button" onClick={draftOperations.stopAutoDrafting} className="stop-auto-draft-btn">
                    Stop Auto Draft
                  </button>
                ) : (
                  <button type="button" onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
                    Auto Draft
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>



      {/* Draft Main Content Area */}
      <section className="draft-main-content">

        {/* Phase 2 Redesign: Draft Board Visualization - Always visible */}
        <section className="draft-board-section">
          <div className="draft-board-container">
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
          </div>
        </section>

        {/* Show content only when draft is not completed */}
        <>
          {/* Phase 2 Redesign: Player Recommendations */}
            {!draftStateActions.isMyTurn(user?.id || 0) && playerSuggestions.length > 0 && (
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

            {/* Filters Section */}
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
                    {getEnabledSports().map(sport => (
                      <button
                        key={sport}
                        className={selectedLeague === sport ? 'active' : ''}
                        onClick={() => setSelectedLeague(sport)}
                      >
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="search-filter">
                  <h4>Search Players</h4>
                  <div className="search-input-container">
                    <input
                      type="text"
                      placeholder="Search by player name or team..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="clear-search-btn"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
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
                        {getEnabledSports().includes('NFL') && (
                          <>
                            <button className={selectedPosition === 'QB' ? 'active' : ''} onClick={() => setSelectedPosition('QB')}>QB</button>
                            <button className={selectedPosition === 'RB' ? 'active' : ''} onClick={() => setSelectedPosition('RB')}>RB</button>
                            <button className={selectedPosition === 'WR' ? 'active' : ''} onClick={() => setSelectedPosition('WR')}>WR</button>
                            <button className={selectedPosition === 'TE' ? 'active' : ''} onClick={() => setSelectedPosition('TE')}>TE</button>
                          </>
                        )}
                        {getEnabledSports().includes('MLB') && (
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
                        {getEnabledSports().includes('NBA') && (
                          <>
                            <button className={selectedPosition === 'PG' ? 'active' : ''} onClick={() => setSelectedPosition('PG')}>PG</button>
                            <button className={selectedPosition === 'SG' ? 'active' : ''} onClick={() => setSelectedPosition('SG')}>SG</button>
                            <button className={selectedPosition === 'SF' ? 'active' : ''} onClick={() => setSelectedPosition('SF')}>SF</button>
                            <button className={selectedPosition === 'PF' ? 'active' : ''} onClick={() => setSelectedPosition('PF')}>PF</button>
                            <button className={selectedPosition === 'C' ? 'active' : ''} onClick={() => setSelectedPosition('C')}>C</button>
                          </>
                        )}
                      </>
                    )}
                    {selectedLeague === 'NFL' && getEnabledSports().includes('NFL') && (
                      <>
                        <button className={selectedPosition === 'QB' ? 'active' : ''} onClick={() => setSelectedPosition('QB')}>QB</button>
                        <button className={selectedPosition === 'RB' ? 'active' : ''} onClick={() => setSelectedPosition('RB')}>RB</button>
                        <button className={selectedPosition === 'WR' ? 'active' : ''} onClick={() => setSelectedPosition('WR')}>WR</button>
                        <button className={selectedPosition === 'TE' ? 'active' : ''} onClick={() => setSelectedPosition('TE')}>TE</button>
                      </>
                    )}
                    {selectedLeague === 'MLB' && getEnabledSports().includes('MLB') && (
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
                    {selectedLeague === 'NBA' && getEnabledSports().includes('NBA') && (
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

            {/* Available Players Section */}
            <section className="available-players-section">
              <div className="available-players-container">
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
                            width: '14%',
                            render: (player: Player, index: number) => (
                              <span className="team">{player.team}</span>
                            )
                          },
                          {
                            key: 'projection',
                            header: 'Proj Pts ↓',
                            width: '12%',
                            render: (player: Player, index: number) => (
                              <span className="projection-points">
                                {player.projection?.fantasyPoints ? 
                                  Math.round(player.projection.fantasyPoints) : 
                                  '-'
                                }
                              </span>
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
                            width: '18%',
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
              </div>
            </section>
          </>
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

      {/* Floating Draft Timer - shows when main timer is out of view */}
      <FloatingDraftTimer
        timeRemaining={webSocketTimer.timeRemaining}
        isActive={webSocketTimer.isActive}
        isPaused={timerState.isPaused || isPaused}
        isMyTurn={draftStateActions.isMyTurn(user?.id || 0)}
        currentPlayerName={getCurrentPlayerName()}
        onExtendTime={() => {
          const currentTime = draftState.timeRemaining;
          draftStateActions.setTimeRemaining(currentTime + 30);
        }}
        isVisible={showFloatingTimer}
      />
    </div>
  );
};

export default Draft;