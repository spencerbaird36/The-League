import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Player } from '../types/Player';
import TimerDisplay from '../components/TimerDisplay';
import { useDraft } from '../context/DraftContext';
import './MyTeam.css';
import { apiRequest } from '../config/api';

interface League {
  id: number;
  name: string;
  joinCode: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt?: string;
  league?: League;
}

interface RosterSlot {
  position: string;
  player: Player | null;
}

interface TeamPageProps {
  currentUser: User | null;
  isDrafting: boolean;
  isPaused: boolean;
  timeRemaining: number;
  timeoutMessage: string;
  togglePause: () => void;
  timerStartTime: number | null;
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

const TeamPage: React.FC<TeamPageProps> = ({ 
  currentUser,
  isDrafting,
  isPaused,
  timeRemaining,
  timeoutMessage,
  togglePause,
  timerStartTime
}) => {
  const { userId } = useParams<{ userId: string }>();
  const { state } = useDraft();
  const [teamUser, setTeamUser] = useState<User | null>(null);
  const [userRoster, setUserRoster] = useState<UserRosterPlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Get roster from draft context if available
  const userIdNum = userId ? parseInt(userId) : null;
  const draftedPlayersFromContext = userIdNum && state.localRosters[userIdNum] ? state.localRosters[userIdNum] : [];

  // Convert UserRosterPlayer to Player format for existing functions
  const convertToPlayer = (rosterPlayer: UserRosterPlayer): Player => ({
    id: rosterPlayer.playerName, // Use player name as ID for Player interface compatibility
    name: rosterPlayer.playerName,
    position: rosterPlayer.playerPosition,
    team: rosterPlayer.playerTeam,
    league: rosterPlayer.playerLeague as 'NFL' | 'MLB' | 'NBA',
    stats: {} // Empty stats object to match Player interface
  });

  // Use draft context data if available, otherwise use API data
  const playersToUse = draftedPlayersFromContext.length > 0 ? draftedPlayersFromContext : userRoster.map(convertToPlayer);
  
  // Separate players by league
  const draftedNFL = playersToUse.filter(p => p.league === 'NFL');
  const draftedMLB = playersToUse.filter(p => p.league === 'MLB');
  const draftedNBA = playersToUse.filter(p => p.league === 'NBA');

  const allDraftedPlayers = [...draftedNFL, ...draftedMLB, ...draftedNBA];

  // Define roster structures
  const mlbRosterPositions = ['SP', 'CL', '1B', '2B', '3B', 'SS', 'RF', 'CF', 'LF'];
  const nflRosterPositions = ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE'];
  const nbaRosterPositions = ['PG', 'SG', 'SF', 'PF', 'C'];

  useEffect(() => {
    const fetchTeamUser = async () => {
      if (!userId) {
        setError('No team ID provided');
        setLoading(false);
        return;
      }

      // If viewing own team, use current user data
      if (currentUser && currentUser.id.toString() === userId) {
        setTeamUser(currentUser);
        
        // Fetch own roster
        if (currentUser.league?.id) {
          try {
            const rosterResponse = await apiRequest(`/api/userroster/user/${userId}/league/${currentUser.league.id}`);
            if (rosterResponse.ok) {
              const rosterData = await rosterResponse.json();
              setUserRoster(rosterData);
            }
          } catch (err) {
            console.error('Error fetching own roster:', err);
          }
        }
        
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest(`/api/users/${userId}`);
        if (response.ok) {
          const userData = await response.json();
          setTeamUser(userData);
          
          // Fetch user's roster
          if (userData.league?.id) {
            const rosterResponse = await apiRequest(`/api/userroster/user/${userId}/league/${userData.league.id}`);
            if (rosterResponse.ok) {
              const rosterData = await rosterResponse.json();
              setUserRoster(rosterData);
            }
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load team information');
        }
      } catch (error) {
        console.error('Error fetching team user:', error);
        setError('Network error. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamUser();
  }, [userId, currentUser]);

  // Function to organize players into roster slots
  const organizeRoster = (players: Player[], positions: string[]) => {
    const roster: RosterSlot[] = positions.map((pos) => ({ 
      position: pos, 
      player: null 
    }));
    const bench: Player[] = [];

    players.forEach(player => {
      let playerPosition = player.position;
      if (['RF', 'CF', 'LF'].includes(player.position) && player.league === 'MLB') {
        const exactSlot = roster.find(slot => 
          slot.position === playerPosition && slot.player === null
        );
        if (exactSlot) {
          exactSlot.player = player;
          return;
        } else {
          const anyOFSlot = roster.find(slot => 
            ['RF', 'CF', 'LF'].includes(slot.position) && slot.player === null
          );
          if (anyOFSlot) {
            anyOFSlot.player = player;
            return;
          }
        }
      }

      if (player.position === 'CP' && player.league === 'MLB') {
        const clSlot = roster.find(slot => 
          slot.position === 'CL' && slot.player === null
        );
        if (clSlot) {
          clSlot.player = player;
          return;
        }
      }

      const availableSlot = roster.find(slot => 
        slot.position === playerPosition && slot.player === null
      );

      if (availableSlot) {
        availableSlot.player = player;
      } else {
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

  if (loading) {
    return (
      <div className="my-team-container">
        <div className="my-team-header">
          <p>Loading team information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-team-container">
        <div className="my-team-header">
          <p style={{ color: '#ff6b6b' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!teamUser) {
    return (
      <div className="my-team-container">
        <div className="my-team-header">
          <p>Team not found</p>
        </div>
      </div>
    );
  }

  const isOwnTeam = currentUser && currentUser.id === teamUser.id;
  const teamName = isOwnTeam ? 'Your Team' : `${teamUser.firstName} ${teamUser.lastName}'s Team`;

  return (
    <div className="my-team-container">
      <div className="my-team-header">
        <h1>{teamName}</h1>
        {teamUser.league && (
          <p>League: {teamUser.league.name}</p>
        )}
        {allDraftedPlayers.length > 0 ? (
          <p>
            {isOwnTeam ? 'You have' : `${teamUser.firstName} has`} drafted {allDraftedPlayers.length} players across all leagues
          </p>
        ) : (
          <p>
            {isOwnTeam ? "You haven't" : `${teamUser.firstName} hasn't`} drafted any players yet
          </p>
        )}
        
        {isOwnTeam && (
          <TimerDisplay
            isDrafting={isDrafting}
            isPaused={isPaused}
            timeRemaining={timeRemaining}
            timeoutMessage={timeoutMessage}
            togglePause={togglePause}
            showStartButton={false}
            timerStartTime={timerStartTime}
          />
        )}
      </div>

      <div className="teams-grid">
        {renderRosterTable(draftedNFL, "NFL", "🏈", nflRosterPositions)}
        {renderRosterTable(draftedMLB, "MLB", "⚾", mlbRosterPositions)}
        {renderRosterTable(draftedNBA, "NBA", "🏀", nbaRosterPositions)}
      </div>
    </div>
  );
};

export default TeamPage;