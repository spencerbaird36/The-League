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
  
  // Drag and drop state
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [draggedFromPosition, setDraggedFromPosition] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);

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
            draftedAt: player.draftedAt
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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetPosition: string, targetIndex: number) => {
    if (!draggedPlayer || !draggedFromPosition || draggedFromIndex === null) return;
    
    // For now, just log the move - you can implement the actual roster update logic here
    console.log(`Moving ${draggedPlayer.name} from ${draggedFromPosition}[${draggedFromIndex}] to ${targetPosition}[${targetIndex}]`);
    
    // TODO: Implement actual roster update logic here
    // This would involve updating the userRoster state and potentially making API calls
    
    // Clear drag state
    setDraggedPlayer(null);
    setDraggedFromPosition(null);
    setDraggedFromIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setDraggedFromPosition(null);
    setDraggedFromIndex(null);
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

  // Function to organize players into roster slots
  const organizeRoster = (players: Player[], positions: string[]) => {
    const roster: RosterSlot[] = positions.map((pos, index) => ({ 
      position: pos, 
      player: null 
    }));
    const bench: Player[] = [];

    // Sort players by draft order (assuming they're in order)
    players.forEach(player => {
      // Handle position mapping for MLB outfielders
      let playerPosition = player.position;
      if (player.position === 'OF' && player.league === 'MLB') {
        // Try to fill any available outfield position
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
        slot.position === playerPosition && slot.player === null
      );

      if (availableSlot) {
        availableSlot.player = player;
      } else {
        // Add to bench if no position available
        bench.push(player);
      }
    });

    return { roster, bench };
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

  const renderRosterTable = (players: Player[], leagueName: string, icon: string, positions: string[]) => {
    const { roster, bench } = organizeRoster(players, positions);
    const totalPlayers = players.length;
    
    return (
      <div className="team-table-section">
        <h2 className="team-header">
          {icon} {leagueName} Team ({totalPlayers})
        </h2>
        <div className="team-table-container">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Player</th>
                <th>Team</th>
                <th>Stats</th>
              </tr>
            </thead>
            <tbody>
              {/* Starting lineup */}
              {roster.map((slot, index) => (
                <tr 
                  key={`${leagueName}-${slot.position}-${index}`} 
                  className={`starter-row ${slot.player ? 'draggable-row' : ''}`}
                  draggable={!!slot.player}
                  onDragStart={() => slot.player && handleDragStart(slot.player, slot.position, index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(slot.position, index)}
                  onDragEnd={handleDragEnd}
                >
                  <td data-label="Position" className="roster-position">{slot.position}</td>
                  {slot.player ? (
                    <>
                      <td data-label="Player" className="my-team-player-name">
                        <span 
                          className="clickable-player-name"
                          onClick={() => handlePlayerNameClick(slot.player!)}
                        >
                          {slot.player.name}
                        </span>
                      </td>
                      <td data-label="Team" className="team">{slot.player.team}</td>
                      <td data-label="Stats" className="stats">{renderStats(slot.player)}</td>
                    </>
                  ) : (
                    <>
                      <td data-label="Player" className="empty-slot">Empty</td>
                      <td data-label="Team" className="empty-slot">-</td>
                      <td data-label="Stats" className="empty-slot">-</td>
                    </>
                  )}
                </tr>
              ))}
              
              {/* Bench players */}
              {bench.length > 0 && (
                <>
                  <tr className="bench-divider">
                    <td colSpan={4} className="bench-header" data-label="">
                      <span>Bench</span>
                    </td>
                  </tr>
                  {bench.map((player, index) => (
                    <tr 
                      key={`${leagueName}-bench-${index}`} 
                      className="bench-row draggable-row"
                      draggable={true}
                      onDragStart={() => handleDragStart(player, 'BN', index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop('BN', index)}
                      onDragEnd={handleDragEnd}
                    >
                      <td data-label="Position" className="roster-position">BN</td>
                      <td data-label="Player" className="my-team-player-name">
                        <span 
                          className="clickable-player-name"
                          onClick={() => handlePlayerNameClick(player)}
                        >
                          {player.name}
                        </span>
                      </td>
                      <td data-label="Team" className="team">{player.team}</td>
                      <td data-label="Stats" className="stats">{renderStats(player)}</td>
                    </tr>
                  ))}
                </>
              )}
              
            </tbody>
          </table>
        </div>
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

      <div className="teams-grid">
        {renderRosterTable(draftedNFL, "NFL", "🏈", nflRosterPositions)}
        {renderRosterTable(draftedMLB, "MLB", "⚾", mlbRosterPositions)}
        {renderRosterTable(draftedNBA, "NBA", "🏀", nbaRosterPositions)}
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