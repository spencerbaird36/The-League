import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types/Player';
import { players } from '../data/players';
import Modal from '../components/Modal';
import PlayerCard from '../components/PlayerCard';
import { useDraft } from '../context/DraftContext';
import { useDraftOperations } from '../hooks/useDraftOperations';
import signalRService from '../services/signalRService';
import './Draft.css';


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
  draftPlayer: (player: Player) => void;
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
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
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
    try {
      if (signalRService.isConnected() && user?.league?.id) {
        // Use WebSocket to start draft
        console.log('Starting draft via WebSocket...');
        await signalRService.startDraft(user.league.id);
      } else {
        // Fallback to REST API
        await draftOperations.startDraft();
      }
      console.log('✅ Draft started successfully');
    } catch (error) {
      console.error('❌ Failed to start draft:', error);
      alert(`Failed to start draft: ${error}`);
    }
  };

  // Make a draft pick using the new draft operations
  const makeDraftPick = useCallback(async (player: Player) => {
    console.log('🎯 Making draft pick for player:', player.name);
    
    try {
      if (signalRService.isConnected() && user?.league?.id) {
        // Use WebSocket to make draft pick
        console.log('Making draft pick via WebSocket...');
        await signalRService.makeDraftPick(
          user.league.id,
          player.id,
          player.name,
          player.position,
          player.team,
          player.league
        );
      } else {
        // Fallback to REST API
        await draftOperations.makeDraftPick(player);
        // Update legacy roster state for backward compatibility
        draftPlayer(player);
      }
      console.log('✅ Draft pick successful');
    } catch (error) {
      console.error('❌ Draft pick failed:', error);
      alert(`Failed to draft ${player.name}: ${error}`);
    }
  }, [draftOperations, draftPlayer, user?.league?.id]);

  const handlePlayerClick = (player: Player) => {
    // Only allow player selection if it's the user's turn (in WebSocket mode) or if not using WebSocket
    if (signalRService.isConnected() && !isMyTurn) {
      alert("It's not your turn to draft!");
      return;
    }
    
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const handleConfirmDraft = () => {
    if (selectedPlayer) {
      makeDraftPick(selectedPlayer);
      setIsModalOpen(false);
      setSelectedPlayer(null);
    }
  };

  const handleCancelDraft = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
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

  // Check if it's the current user's turn
  const isCurrentUserTurn = draftState && user ? 
    draftOperations.isUserTurn(user.id) : false;

  // Handle clicking on a manager's tile to view their team
  const handleManagerClick = (userId: number) => {
    navigate(`/team/${userId}`);
  };

  // WebSocket draft timer
  const startDraftTimer = useCallback((timeLimit: number = 15) => {
    console.log('Starting draft timer:', timeLimit);
    setDraftTimer(timeLimit);
    setDraftTimerActive(true);
    
    if (draftTimerRef.current) {
      clearInterval(draftTimerRef.current);
    }
    
    draftTimerRef.current = setInterval(() => {
      setDraftTimer(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setDraftTimerActive(false);
          clearInterval(draftTimerRef.current!);
          // Auto-draft if it's the user's turn
          if (isMyTurn && user?.league?.id) {
            console.log('Time expired, triggering auto-draft');
            handleAutoDraft();
          }
          return 0;
        }
        return newTime;
      });
    }, 1000);
  }, [isMyTurn, user?.league?.id]);

  const stopDraftTimer = useCallback(() => {
    setDraftTimerActive(false);
    if (draftTimerRef.current) {
      clearInterval(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

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
            randomPlayer.league
          );
        } else {
          // Fallback to legacy draft method
          await makeDraftPick(randomPlayer);
        }
      }
    } catch (error) {
      console.error('Auto-draft failed:', error);
    }
  }, [user?.league?.id, user?.id, isMyTurn, availablePlayers, makeDraftPick]);

  // WebSocket event handlers
  useEffect(() => {
    if (!user?.league?.id) return;

    const handleDraftStarted = (data: any) => {
      console.log('Draft started via WebSocket:', data);
      setWebSocketDraftState(data);
      setIsMyTurn(data.CurrentUserId === user.id);
      if (data.CurrentUserId === user.id) {
        startDraftTimer(data.TimeLimit || 15);
      }
    };

    const handleTurnChanged = (data: any) => {
      console.log('Turn changed via WebSocket:', data);
      const myTurn = data.CurrentUserId === user.id;
      setIsMyTurn(myTurn);
      
      if (myTurn) {
        console.log('It\'s my turn!');
        startDraftTimer(data.TimeLimit || 15);
        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMdATuM1/LPeSsF');
          audio.play().catch(e => console.log('Could not play notification sound'));
        } catch (e) {
          console.log('Could not create notification sound');
        }
      } else {
        stopDraftTimer();
      }
    };

    const handlePlayerDrafted = (data: any) => {
      console.log('Player drafted via WebSocket:', data);
      // Update local state to remove the drafted player
      const draftedPlayer: Player = {
        id: data.PlayerId,
        name: data.PlayerName,
        position: data.Position,
        team: data.Team,
        league: data.League
      };
      draftPlayer(draftedPlayer);
      
      // Stop timer since a pick was made
      stopDraftTimer();
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

    // Register WebSocket event listeners
    signalRService.onDraftStarted(handleDraftStarted);
    signalRService.onTurnChanged(handleTurnChanged);
    signalRService.onPlayerDrafted(handlePlayerDrafted);
    signalRService.onDraftPaused(handleDraftPaused);
    signalRService.onDraftResumed(handleDraftResumed);
    signalRService.onDraftCompleted(handleDraftCompleted);

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
  }, [user?.league?.id, user?.id, draftPlayer, startDraftTimer, stopDraftTimer, handleAutoDraft]);

  return (
    <div className="draft-container">
      <header className="draft-header">
        <h1>Fantasy Draft</h1>
        <p>Select players to build your ultimate fantasy team</p>
        
        {/* Draft Timer Section */}
        {(draftState?.isActive || draftTimerActive) && (
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
                  () => signalRService.pauseDraft(user.league.id) : 
                  draftOperations.pauseTimer
                }
                className="pause-btn"
              >
                {state.timer.isPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
            
            {isMyTurn && draftTimerActive && (
              <div className="your-turn-message">
                🎯 It's your turn to pick! Time remaining: {draftTimer}s
              </div>
            )}
            
            {state.timer.timeoutMessage && (
              <div className="timeout-message">
                {state.timer.timeoutMessage}
              </div>
            )}
          </div>
        )}
        
        {/* Draft Management Buttons */}
        {!isDraftCreated && (
          <div className="auto-draft-section">
            <div className="draft-management-buttons">
              <button onClick={createDraft} className="begin-draft-btn">
                Create Draft
              </button>
            </div>
          </div>
        )}

        {/* Draft Status */}
        <div className="draft-status-info">
          {!isDraftCreated && (
            <div className="draft-setup">
              <p>No draft created yet for this league.</p>
            </div>
          )}
          
          {isDraftCreated && !draftState?.isActive && !webSocketDraftState && (
            <div className="draft-ready">
              <p>Draft is ready to begin!</p>
              <button onClick={startDraftSession} className="start-draft-btn">
                Start Draft
              </button>
            </div>
          )}
          
          {(draftState?.isActive || webSocketDraftState) && (
            <div className="draft-active">
              <p>
                Draft in progress - Round {webSocketDraftState?.CurrentRound || draftState?.currentRound || 1}, 
                Pick {(webSocketDraftState?.CurrentTurn || draftState?.currentTurn || 0) + 1}
              </p>
              <p>
                {signalRService.isConnected() ? '🟢 Live WebSocket Draft' : '🟡 REST API Draft'}
              </p>
              {(isMyTurn || isCurrentUserTurn) && (
                <p className="your-turn-notification">🎯 It's your turn to pick!</p>
              )}
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

          <div className="draft-controls">
            {!draftState.isActive && (
              <button onClick={startDraftSession} className="draft-control-btn start">
                Start Draft
              </button>
            )}
            <button onClick={handleResetDraft} className="draft-control-btn reset">
              Reset Draft
            </button>
            <button onClick={draftOperations.startAutoDraftingForAllTeams} className="auto-draft-btn">
              Auto Draft
            </button>
          </div>
        </section>
      )}

      {/* Draft Main Content Area */}
      <section className="draft-main-content">
        
        {/* Left Sidebar - Filters */}
        <aside className="draft-sidebar">
          <div className="sidebar-header">
            <h3>Filters</h3>
          </div>
          
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
        </aside>

        {/* Right Main Content - Available Players */}
        <main className="draft-main">
          <section className="available-players">
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
              <table key={`${selectedLeague}-${selectedPosition}`}>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Position</th>
                    <th>Team</th>
                    <th>League</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player: Player) => {
                    return (
                      <tr key={player.id}>
                        <td>
                          <button 
                            className="player-name-button"
                            onClick={() => handlePlayerClick(player)}
                            disabled={!isCurrentUserTurn || !draftState?.isActive}
                          >
                            {player.name}
                          </button>
                        </td>
                        <td>
                          <span className="position">{player.position}</span>
                        </td>
                        <td>
                          <span className="team">{player.team}</span>
                        </td>
                        <td>
                          <span className={`league-badge ${player.league.toLowerCase()}`}>
                            {player.league}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`draft-btn ${!isCurrentUserTurn || !draftState?.isActive ? 'disabled' : ''}`}
                            onClick={() => handlePlayerClick(player)}
                            disabled={!isCurrentUserTurn || !draftState?.isActive}
                          >
                            Draft
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </section>
        </main>
      </section>

      {/* Draft Pick Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancelDraft}
        title="Confirm Draft Pick"
      >
        {selectedPlayer && (
          <div className="modal-content">
            <PlayerCard player={selectedPlayer} />
            <p>Are you sure you want to draft {selectedPlayer.name}?</p>
            <div className="modal-actions">
              <button onClick={handleConfirmDraft} className="draft-control-btn start">
                Confirm Draft
              </button>
              <button onClick={handleCancelDraft} className="draft-control-btn reset">
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Draft;