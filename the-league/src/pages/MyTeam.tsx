import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Player } from '../types/Player';
import TimerDisplay from '../components/TimerDisplay';
import LazyLoadFallback from '../components/LazyLoadFallback';
import './MyTeam.css';
import { apiRequest } from '../config/api';
import { cleanPlayerName } from '../utils/playerNameUtils';

// Lazy load modals since they're only needed when users click on them
const PlayerInfoModal = lazy(() => import('../components/PlayerInfoModal'));
const TradeProposalModal = lazy(() => import('../components/TradeProposalModal'));
const TradeNotifications = lazy(() => import('../components/TradeNotifications'));

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
}

interface UserRosterPlayer {
  id: number;
  playerName: string;
  playerPosition: string;
  playerTeam: string;
  playerLeague: string;
  pickNumber: number;
  round: number;
  draftedAt: string;
  lineupPosition?: string;
}

interface MyTeamProps {
  isDrafting: boolean;
  isPaused: boolean;
  timeRemaining: number;
  timeoutMessage: string;
  togglePause: () => void;
  user: User | null;
  timerStartTime: number | null;
}

interface RosterSlot {
  position: string;
  player: Player | null;
}

const MyTeam: React.FC<MyTeamProps> = ({ 
  isDrafting,
  isPaused,
  timeRemaining,
  timeoutMessage,
  togglePause,
  user,
  timerStartTime
}) => {
  const [userRoster, setUserRoster] = useState<UserRosterPlayer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlayerInfoModalOpen, setIsPlayerInfoModalOpen] = useState<boolean>(false);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<Player | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [tradeNotificationRefresh, setTradeNotificationRefresh] = useState<number>(0);
  
  // Expand/collapse state for each team
  const [expandedTeams, setExpandedTeams] = useState<{[key: string]: boolean}>({
    NFL: false,
    MLB: false,
    NBA: false
  });
  
  // Drag and drop state
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [draggedFromPosition, setDraggedFromPosition] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);
  const [validDropZones, setValidDropZones] = useState<string[]>([]);

  // Fetch user's roster from backend
  useEffect(() => {
    const fetchUserRoster = async () => {
      if (!user?.id || !user?.league?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // Get user's complete roster from the UserRoster API (includes both draft picks and free agent pickups)
        const response = await apiRequest(`/api/userroster/user/${user.id}/league/${user.league.id}`);
        
        if (response.ok) {
          const rosterData = await response.json();
          
          // Convert to UserRosterPlayer format
          const userRosterPlayers = rosterData?.map((player: any) => ({
            id: player.id,
            playerName: cleanPlayerName(player.playerName), // Clean the player name
            playerPosition: player.playerPosition,
            playerTeam: player.playerTeam,
            playerLeague: player.playerLeague,
            pickNumber: player.pickNumber,
            round: player.round,
            draftedAt: player.draftedAt,
            lineupPosition: player.lineupPosition
          })) || [];
            
          setUserRoster(userRosterPlayers);
        } else {
          console.error('Failed to fetch user roster:', response.status);
          setError('Failed to load your roster');
        }
      } catch (err) {
        console.error('Error fetching user roster:', err);
        setError('Failed to load your roster');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRoster();
    
    // Set up polling to refresh roster every 3 seconds during active draft
    let interval: NodeJS.Timeout | null = null;
    if (isDrafting) {
      interval = setInterval(fetchUserRoster, 3000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.id, user?.league?.id, isDrafting]);

  // Convert UserRosterPlayer to Player format for existing functions
  const convertToPlayer = (rosterPlayer: UserRosterPlayer): Player => ({
    id: rosterPlayer.id.toString(),
    name: rosterPlayer.playerName,
    position: rosterPlayer.playerPosition,
    team: rosterPlayer.playerTeam,
    league: rosterPlayer.playerLeague as 'NFL' | 'MLB' | 'NBA',
    lineupPosition: rosterPlayer.lineupPosition,
    stats: {} // Empty stats object to match Player interface
  });

  // Handle player name click to show player info
  const handlePlayerNameClick = (player: Player) => {
    setSelectedPlayerForInfo(player);
    setIsPlayerInfoModalOpen(true);
  };

  const handleClosePlayerInfo = () => {
    setIsPlayerInfoModalOpen(false);
    setSelectedPlayerForInfo(null);
  };

  // Trade modal handlers
  const handleOpenTradeModal = () => {
    setIsTradeModalOpen(true);
  };

  const handleCloseTradeModal = () => {
    setIsTradeModalOpen(false);
  };

  // Drag and drop handlers
  const handleDragStart = (player: Player, position: string, index: number) => {
    setDraggedPlayer(player);
    setDraggedFromPosition(position);
    setDraggedFromIndex(index);
    
    // Calculate valid drop zones based on player position
    const validZones = calculateValidDropZones(player);
    setValidDropZones(validZones);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Helper function to check if a position slot is a valid drop zone
  const isValidDropZone = (position: string): boolean => {
    if (!draggedPlayer) return false;
    return validDropZones.includes(position);
  };

  // Helper function to find a player in a specific slot
  const findPlayerInSlot = (position: string, index: number): Player | null => {
    console.log(`Looking for player in position: ${position}, index: ${index}`);
    
    // For bench, always return null (bench can accept multiple players)
    if (position === 'BN') {
      console.log('Target is bench - returning null (no swap needed)');
      return null;
    }

    // Determine which league this position belongs to
    let leaguePlayers: Player[] = [];
    let rosterPositions: string[] = [];
    
    if (['QB', 'RB', 'WR', 'TE'].includes(position)) {
      leaguePlayers = draftedNFL;
      rosterPositions = nflRosterPositions;
    } else if (['SP', 'CL', '1B', '2B', '3B', 'SS', 'OF'].includes(position)) {
      leaguePlayers = draftedMLB;
      rosterPositions = mlbRosterPositions;
    } else if (['PG', 'SG', 'SF', 'PF', 'C'].includes(position)) {
      leaguePlayers = draftedNBA;
      rosterPositions = nbaRosterPositions;
    } else {
      console.log('Unknown position:', position);
      return null;
    }

    // Organize roster and find the player at the target index
    const { roster } = organizeRoster(leaguePlayers, rosterPositions);
    const targetSlot = roster[index];
    const foundPlayer = targetSlot?.player || null;
    
    console.log(`Found player in slot:`, foundPlayer?.name || 'Empty');
    return foundPlayer;
  };

  // Helper function to swap two players' positions
  const swapPlayers = async (player1: Player, player2: Player, player1NewPosition: string, player2NewPosition: string) => {
    
    try {
      // Update both players' positions
      await Promise.all([
        updatePlayerPosition(player1, player1NewPosition, 0),
        updatePlayerPosition(player2, player2NewPosition, 0)
      ]);
    } catch (error) {
      console.error('Error in swapPlayers:', error);
      throw error;
    }
  };

  const handleDrop = async (targetPosition: string, targetIndex: number) => {
    
    if (!draggedPlayer || !draggedFromPosition || draggedFromIndex === null) {
      console.log('Missing drag state - aborting');
      return;
    }
    
    // Check if the move is valid (compatible positions)
    if (!isValidMove(draggedPlayer, draggedFromPosition, targetPosition)) {
      console.log(`Invalid move: ${draggedPlayer.name} (${draggedPlayer.position}) cannot be moved to ${targetPosition}`);
      clearDragState();
      return;
    }
    
    // Don't allow dropping on the same position
    if (draggedFromPosition === targetPosition && draggedFromIndex === targetIndex) {
      console.log('Dropping on same position - aborting');
      clearDragState();
      return;
    }
    
    try {
      // Check if target position is occupied by finding the target slot player
      const targetPlayer = findPlayerInSlot(targetPosition, targetIndex);
      
      if (targetPlayer && targetPosition !== 'BN') {
        // PLAYER SWAP: Both positions are occupied and it's not bench
        await swapPlayers(draggedPlayer, targetPlayer, targetPosition, draggedFromPosition);
      } else {
        // SIMPLE MOVE: Target is empty or bench (bench can have multiple players)
        await updatePlayerPosition(draggedPlayer, targetPosition, targetIndex);
      }
      
      // Refresh roster data to reflect changes
      await refetchUserRoster();
    } catch (error) {
      console.error('Failed to update player position:', error);
      // Could show a toast notification here
    }
    
    clearDragState();
  };

  // Helper function to validate moves
  const isValidMove = (player: Player, fromPosition: string, toPosition: string): boolean => {
    // Allow moves from/to bench
    if (fromPosition === 'BN' || toPosition === 'BN') return true;
    
    // Check if player position matches target position
    if (player.position === toPosition) return true;
    
    // Handle special cases
    if (player.league === 'MLB') {
      // Closers (CP) can play as CL
      if (player.position === 'CP' && toPosition === 'CL') return true;
      // All outfielders can play any OF position
      if (player.position === 'OF' && toPosition === 'OF') return true;
    }
    
    if (player.league === 'NFL') {
      // Allow flexible RB/WR positioning if needed
      // Add any specific NFL position flexibility here
    }
    
    if (player.league === 'NBA') {
      // Add any specific NBA position flexibility here
    }
    
    return false;
  };

  // Helper function to clear drag state
  const clearDragState = () => {
    setDraggedPlayer(null);
    setDraggedFromPosition(null);
    setDraggedFromIndex(null);
    setValidDropZones([]);
  };

  // Calculate valid drop zones for a player
  const calculateValidDropZones = (player: Player): string[] => {
    const validZones = ['BN']; // Bench is always valid
    
    // Add player's primary position
    validZones.push(player.position);
    
    // Add special position mappings
    if (player.league === 'MLB') {
      if (player.position === 'CP') {
        validZones.push('CL'); // Closers can play CL
      }
      if (player.position === 'OF') {
        // Outfielders can play any OF position (all OF slots)
        validZones.push('OF');
      }
    }
    
    if (player.league === 'NFL') {
      // Add any NFL-specific position flexibility here if needed
    }
    
    if (player.league === 'NBA') {
      // Add any NBA-specific position flexibility here if needed
    }
    
    return validZones;
  };

  // Helper function to refetch roster data
  const refetchUserRoster = async () => {
    if (!user?.id || !user?.league?.id) {
      return;
    }
    
    try {
      const response = await apiRequest(`/api/userroster/user/${user.id}/league/${user.league.id}`);
      
      if (response.ok) {
        const rosterData = await response.json();
        
        const userRosterPlayers = rosterData?.map((player: any) => ({
          id: player.id,
          playerName: cleanPlayerName(player.playerName),
          playerPosition: player.playerPosition,
          playerTeam: player.playerTeam,
          playerLeague: player.playerLeague,
          pickNumber: player.pickNumber,
          round: player.round,
          draftedAt: player.draftedAt,
          lineupPosition: player.lineupPosition
        })) || [];
        
        setUserRoster(userRosterPlayers);
      } else {
        console.error('API response not OK:', response.status);
      }
    } catch (err) {
      console.error('❌ Error refetching user roster:', err);
    }
  };

  // API call to update player position
  const updatePlayerPosition = async (player: Player, newPosition: string, targetIndex: number) => {
    if (!user?.id || !user?.league?.id) throw new Error('User or league not found');
    
    // Find the roster player entry
    const rosterPlayer = userRoster.find(p => p.playerName === player.name);
    if (!rosterPlayer) {
      throw new Error('Player not found in roster');
    }
    
    
    // Make API call to update position
    const response = await apiRequest(`/api/userroster/${rosterPlayer.id}/position`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newPosition: newPosition,
        positionIndex: targetIndex
      })
    });
    
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('API update failed:', errorData);
      throw new Error(errorData.message || 'Failed to update player position');
    }
    
    return await response.json();
  };

  const handleDragEnd = () => {
    clearDragState();
    setValidDropZones([]);
  };

  // Toggle expand/collapse for team sections
  const toggleTeamExpansion = (league: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [league]: !prev[league]
    }));
  };

  // Separate players by league
  const draftedNFL = userRoster
    .filter(p => p.playerLeague === 'NFL')
    .map(convertToPlayer);
  
  const draftedMLB = userRoster
    .filter(p => p.playerLeague === 'MLB')
    .map(convertToPlayer);
  
  const draftedNBA = userRoster
    .filter(p => p.playerLeague === 'NBA')
    .map(convertToPlayer);


  const allDraftedPlayers = [...draftedNFL, ...draftedMLB, ...draftedNBA];

  // Define roster structures
  const mlbRosterPositions = ['SP', 'CL', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'];
  const nflRosterPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE'];
  const nbaRosterPositions = ['PG', 'SG', 'SF', 'PF', 'C'];

  // Function to organize players into roster slots using lineup position
  const organizeRoster = (players: Player[], positions: string[]) => {
    
    const roster: RosterSlot[] = positions.map((pos, index) => ({ 
      position: pos, 
      player: null 
    }));
    const bench: Player[] = [];

    // First pass: Place players with explicit lineup positions
    const playersWithPositions = players.filter(p => p.lineupPosition);
    const playersWithoutPositions = players.filter(p => !p.lineupPosition);
    
    playersWithPositions.forEach(player => {
      
      // Find the appropriate slot for this lineup position
      const targetSlot = roster.find(slot => 
        slot.position === player.lineupPosition && slot.player === null
      );
      if (targetSlot) {
        targetSlot.player = player;
      } else {
        autoAssignPlayer(player, roster, bench);
      }
    });
    
    playersWithoutPositions.forEach(player => {
      autoAssignPlayer(player, roster, bench);
    });


    return { roster, bench };
  };

  // Helper function to auto-assign players without lineup positions
  const autoAssignPlayer = (player: Player, roster: RosterSlot[], bench: Player[]) => {
    // Handle position mapping for MLB outfielders
    if (player.position === 'OF' && player.league === 'MLB') {
      const anyOFSlot = roster.find(slot => 
        slot.position === 'OF' && slot.player === null
      );
      if (anyOFSlot) {
        anyOFSlot.player = player;
        return;
      }
    }

    // Handle position mapping for MLB closers (CL can be filled by CP)
    if (player.position === 'CP' && player.league === 'MLB') {
      const clSlot = roster.find(slot => 
        slot.position === 'CL' && slot.player === null
      );
      if (clSlot) {
        clSlot.player = player;
        return;
      }
    }

    // Find first empty slot for this exact position
    const availableSlot = roster.find(slot => 
      slot.position === player.position && slot.player === null
    );

    if (availableSlot) {
      availableSlot.player = player;
    } else {
      // Add to bench if no position available
      bench.push(player);
    }
  };

  const renderStats = (player: Player) => {
    if (!player.stats) return '-';
    
    const stats = Object.entries(player.stats);
    return stats.slice(0, 2).map(([key, value]) => (
      <span key={key} className="stat-item">
        {key}: {value}
      </span>
    ));
  };

  // Get sport-specific stat columns
  const getStatColumns = (league: string) => {
    switch (league) {
      case 'NFL':
        return ['Bye', 'Fan Pts', 'Proj Pts', '% Start', '% Ros', 'Yds', 'TD', 'Int'];
      case 'MLB':
        return ['Bye', 'Fan Pts', 'Proj Pts', '% Start', '% Ros', 'AVG', 'HR', 'RBI', 'SB'];
      case 'NBA':
        return ['Bye', 'Fan Pts', 'Proj Pts', '% Start', '% Ros', 'PPG', 'RPG', 'APG', 'FG%'];
      default:
        return ['Bye', 'Fan Pts', 'Proj Pts', '% Start', '% Ros'];
    }
  };

  const renderTeamCard = (players: Player[], leagueName: string, icon: string, positions: string[]) => {
    const { roster, bench } = organizeRoster(players, positions);
    const totalPlayers = players.length;
    const isExpanded = expandedTeams[leagueName];
    const statColumns = getStatColumns(leagueName);
    
    return (
      <div className="team-card">
        <div 
          className="team-card-header" 
          onClick={() => toggleTeamExpansion(leagueName)}
        >
          <div className="team-info">
            <div className="team-title">
              <span className="team-icon">{icon}</span>
              <h3>{leagueName}</h3>
              <span className="player-count">({totalPlayers})</span>
            </div>
            <div className="team-summary">
              {totalPlayers === 0 ? 'No players drafted' : `${roster.filter(r => r.player).length} starters, ${bench.length} bench`}
            </div>
          </div>
          <div className="expand-icon">
            {isExpanded ? '▲' : '▼'}
          </div>
        </div>
        
        {isExpanded && (
          <div className="team-card-content">
            <div className="team-table-container">
              <table className="roster-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Offense</th>
                    {statColumns.map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Starting lineup */}
                  {roster.map((slot, index) => {
                    const isValidDrop = isValidDropZone(slot.position);
                    const isDraggedSlot = draggedPlayer && draggedFromPosition === slot.position && draggedFromIndex === index;
                    
                    return (
                    <tr 
                      key={`${leagueName}-${slot.position}-${index}`} 
                      className={`starter-row ${slot.player ? 'draggable-row' : ''} ${isValidDrop && !isDraggedSlot ? 'valid-drop-zone' : ''} ${isDraggedSlot ? 'being-dragged' : ''}`}
                      draggable={!!slot.player}
                      onDragStart={() => slot.player && handleDragStart(slot.player, slot.position, index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(slot.position, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <td className="position-cell">
                        <div className="position-badge">{slot.position}</div>
                      </td>
                      {slot.player ? (
                        <>
                          <td className="player-cell">
                            <div className="player-info">
                              <span 
                                className="clickable-player-name"
                                onClick={() => handlePlayerNameClick(slot.player!)}
                              >
                                {slot.player.name}
                              </span>
                              <div className="player-team">{slot.player.team}</div>
                            </div>
                          </td>
                          {statColumns.map((col, colIndex) => (
                            <td key={col} className="stat-cell">-</td>
                          ))}
                        </>
                      ) : (
                        <>
                          <td className="empty-cell">Empty</td>
                          {statColumns.map((col, colIndex) => (
                            <td key={col} className="stat-cell">-</td>
                          ))}
                        </>
                      )}
                    </tr>
                    );
                  })}
                  
                  {/* Bench players */}
                  {bench.length > 0 && (
                    <>
                      <tr className="bench-divider">
                        <td colSpan={statColumns.length + 2} className="bench-header">
                          <span>Bench</span>
                        </td>
                      </tr>
                      {bench.map((player, index) => {
                        const isValidDrop = isValidDropZone('BN');
                        const isDraggedSlot = draggedPlayer && draggedFromPosition === 'BN' && draggedFromIndex === index;
                        
                        return (
                        <tr 
                          key={`${leagueName}-bench-${index}`} 
                          className={`bench-row draggable-row ${isValidDrop && !isDraggedSlot ? 'valid-drop-zone' : ''} ${isDraggedSlot ? 'being-dragged' : ''}`}
                          draggable={true}
                          onDragStart={() => handleDragStart(player, 'BN', index)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop('BN', index)}
                          onDragEnd={handleDragEnd}
                        >
                          <td className="position-cell">
                            <div className="position-badge bench">BN</div>
                          </td>
                          <td className="player-cell">
                            <div className="player-info">
                              <span 
                                className="clickable-player-name"
                                onClick={() => handlePlayerNameClick(player)}
                              >
                                {player.name}
                              </span>
                              <div className="player-team">{player.team}</div>
                            </div>
                          </td>
                          {statColumns.map((col, colIndex) => (
                            <td key={col} className="stat-cell">-</td>
                          ))}
                        </tr>
                        )
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="my-team-container">
        <div className="my-team-header">
          <h1>My Team</h1>
          <p>Loading your roster...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-team-container">
        <div className="my-team-header">
          <h1>My Team</h1>
          <p style={{ color: 'red' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-team-container">
      <div className="page-header my-team-header">
        <div className="header-top">
          <h1 className="page-title">My Team</h1>
          <div className="header-actions">
            {user?.league && (
              <Suspense fallback={<div>Loading...</div>}>
                <TradeNotifications 
                  user={user} 
                  onTradeUpdate={() => {
                    // Refresh roster data when a trade is accepted
                    window.location.reload();
                  }}
                  refreshTrigger={tradeNotificationRefresh}
                />
              </Suspense>
            )}
            {user?.league && allDraftedPlayers.length > 0 && (
              <button 
                className="propose-trade-btn"
                onClick={handleOpenTradeModal}
                aria-label="Propose a trade with another team"
              >
                🤝 Propose Trade
              </button>
            )}
          </div>
        </div>
        
        <TimerDisplay
          isDrafting={isDrafting}
          isPaused={isPaused}
          timeRemaining={timeRemaining}
          timeoutMessage={timeoutMessage}
          togglePause={togglePause}
          showStartButton={false}
          timerStartTime={timerStartTime}
        />
      </div>

      <div className="teams-container">
        {renderTeamCard(draftedNFL, "NFL", "🏈", nflRosterPositions)}
        {renderTeamCard(draftedMLB, "MLB", "⚾", mlbRosterPositions)}
        {renderTeamCard(draftedNBA, "NBA", "🏀", nbaRosterPositions)}
      </div>

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

      {/* Trade Proposal Modal */}
      {isTradeModalOpen && user?.league && (
        <Suspense fallback={<LazyLoadFallback type="modal" />}>
          <TradeProposalModal
            isOpen={isTradeModalOpen}
            onClose={handleCloseTradeModal}
            user={user}
            userRoster={allDraftedPlayers}
            onTradeProposed={() => {
              // Trigger TradeNotifications to refresh
              setTradeNotificationRefresh(prev => prev + 1);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default MyTeam;