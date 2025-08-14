import React, { useState, useEffect } from 'react';
import { Player } from '../types/Player';
import TimerDisplay from '../components/TimerDisplay';
import './MyTeam.css';
import { apiRequest } from '../config/api';

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
        const response = await apiRequest(`/api/userroster/user/${user.id}/league/${user.league.id}`);
        
        if (response.ok) {
          const rosterData = await response.json();
          setUserRoster(rosterData);
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
                <tr key={`${leagueName}-${slot.position}-${index}`} className="starter-row">
                  <td className="roster-position">{slot.position}</td>
                  {slot.player ? (
                    <>
                      <td className="player-name">{slot.player.name}</td>
                      <td className="team">{slot.player.team}</td>
                      <td className="stats">{renderStats(slot.player)}</td>
                    </>
                  ) : (
                    <>
                      <td className="empty-slot">Empty</td>
                      <td className="empty-slot">-</td>
                      <td className="empty-slot">-</td>
                    </>
                  )}
                </tr>
              ))}
              
              {/* Bench players */}
              {bench.length > 0 && (
                <>
                  <tr className="bench-divider">
                    <td colSpan={4} className="bench-header">
                      <span>Bench</span>
                    </td>
                  </tr>
                  {bench.map((player, index) => (
                    <tr key={`${leagueName}-bench-${index}`} className="bench-row">
                      <td className="roster-position">BN</td>
                      <td className="player-name">{player.name}</td>
                      <td className="team">{player.team}</td>
                      <td className="stats">{renderStats(player)}</td>
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
      <div className="my-team-header">
        <h1>My Team</h1>
        {allDraftedPlayers.length > 0 && (
          <p>
            You have drafted {allDraftedPlayers.length} players across all leagues
          </p>
        )}
        
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
    </div>
  );
};

export default MyTeam;