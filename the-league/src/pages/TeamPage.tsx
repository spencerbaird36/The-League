import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Player } from '../types/Player';
import TimerDisplay from '../components/TimerDisplay';
import { useDraft } from '../context/DraftContext';
import LazyLoadFallback from '../components/LazyLoadFallback';
import './MyTeam.css';
import { apiRequest } from '../config/api';
import { cleanPlayerName } from '../utils/playerNameUtils';
import signalRService from '../services/signalRService';

// Lazy load modal since it's only needed when users click on players
const PlayerInfoModal = lazy(() => import('../components/PlayerInfoModal'));

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
  lineupPosition?: string;
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
  const [isPlayerInfoModalOpen, setIsPlayerInfoModalOpen] = useState<boolean>(false);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<Player | null>(null);

  // Expand/collapse state for each team
  const [expandedTeams, setExpandedTeams] = useState<{[key: string]: boolean}>({
    NFL: true,
    MLB: true,
    NBA: true
  });

  // Get roster from draft context if available
  const userIdNum = userId ? parseInt(userId) : null;
  const draftedPlayersFromContext = userIdNum && state.localRosters[userIdNum] ? state.localRosters[userIdNum] : [];

  // Handle player name click to show player info
  const handlePlayerNameClick = (player: Player) => {
    setSelectedPlayerForInfo(player);
    setIsPlayerInfoModalOpen(true);
  };

  const handleClosePlayerInfo = () => {
    setIsPlayerInfoModalOpen(false);
    setSelectedPlayerForInfo(null);
  };

  // Toggle expand/collapse for team sections
  const toggleTeamExpansion = (league: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [league]: !prev[league]
    }));
  };

  // Convert UserRosterPlayer to Player format for existing functions
  const convertToPlayer = (rosterPlayer: UserRosterPlayer): Player => ({
    id: rosterPlayer.id.toString(),
    name: cleanPlayerName(rosterPlayer.playerName),
    position: rosterPlayer.playerPosition,
    team: rosterPlayer.playerTeam,
    league: rosterPlayer.playerLeague as 'NFL' | 'MLB' | 'NBA',
    lineupPosition: rosterPlayer.lineupPosition,
    stats: {} // Empty stats object to match Player interface
  });

  // Refetch roster data (extracted as callback for reuse)
  const refetchRosterData = useCallback(async () => {
    if (!userId) return;

    try {
      let leagueId: number | undefined;

      // Determine league ID
      if (currentUser && currentUser.id.toString() === userId) {
        leagueId = currentUser.league?.id;
      } else if (teamUser?.league?.id) {
        leagueId = teamUser.league.id;
      }

      if (leagueId) {
        console.log('🔄 Refetching roster data for user', userId, 'in league', leagueId);
        const rosterResponse = await apiRequest(`/api/userroster/user/${userId}/league/${leagueId}`);
        if (rosterResponse.ok) {
          const rosterData = await rosterResponse.json();
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
          console.log('✅ Roster data refetched successfully', userRosterPlayers.length, 'players');
        }
      }
    } catch (error) {
      console.error('❌ Error refetching roster data:', error);
    }
  }, [userId, currentUser, teamUser]);

  // Use draft context data if available, otherwise use API data
  const playersToUse = draftedPlayersFromContext.length > 0 ? draftedPlayersFromContext : userRoster.map(convertToPlayer);

  // Separate players by league
  const draftedNFL = playersToUse.filter(p => p.league === 'NFL');
  const draftedMLB = playersToUse.filter(p => p.league === 'MLB');
  const draftedNBA = playersToUse.filter(p => p.league === 'NBA');

  // Remove unused variable warning
  // const allDraftedPlayers = [...draftedNFL, ...draftedMLB, ...draftedNBA];

  // Define roster structures
  const mlbRosterPositions = ['SP', 'CL', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'];
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
              // Convert to UserRosterPlayer format with cleaned names
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
              // Convert to UserRosterPlayer format with cleaned names
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
  }, [userId, currentUser, state.draftResetTrigger]); // Added draftResetTrigger to dependencies

  // Listen for draft reset events via SignalR for real-time updates
  useEffect(() => {
    if (!currentUser?.league?.id) return;

    const handleDraftReset = (data: any) => {
      console.log('🔄 TeamPage: Draft reset event received for league', currentUser.league?.id, data);
      // Refetch roster data when draft is reset
      setTimeout(() => {
        console.log('🔄 TeamPage: Triggering roster refetch after draft reset');
        refetchRosterData();
      }, 1000); // Small delay to ensure backend reset completes
    };

    console.log('🔗 TeamPage: Subscribing to draft reset events for league', currentUser.league.id);
    // Subscribe to draft reset events
    signalRService.onDraftReset(handleDraftReset);

    // Cleanup on unmount
    return () => {
      console.log('🔌 TeamPage: Unsubscribing from draft reset events');
      signalRService.offDraftReset(handleDraftReset);
    };
  }, [currentUser?.league?.id, refetchRosterData]);

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
            {isExpanded ? '\u25b2' : '\u25bc'}
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
                  {roster.map((slot, index) => (
                    <tr
                      key={`${leagueName}-${slot.position}-${index}`}
                      className="starter-row"
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
                  ))}

                  {/* Bench players */}
                  {bench.length > 0 && (
                    <>
                      <tr className="bench-divider">
                        <td colSpan={statColumns.length + 2} className="bench-header">
                          <span>Bench</span>
                        </td>
                      </tr>
                      {bench.map((player, index) => (
                        <tr
                          key={`${leagueName}-bench-${index}`}
                          className="bench-row"
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
                      ))}
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
      <div className="page-header my-team-header">
        <div className="header-top">
          <h1 className="page-title">{teamName}</h1>
          <div className="header-actions">
            {teamUser.league && (
              <div className="league-info">
                League: {teamUser.league.name}
              </div>
            )}
          </div>
        </div>

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
    </div>
  );
};

export default TeamPage;