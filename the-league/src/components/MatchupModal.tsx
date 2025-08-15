import React, { useState, useEffect } from 'react';
import { ScheduleMatchup } from '../types/Schedule';
import { Player } from '../types/Player';
import { apiRequest } from '../config/api';
import Modal from './Modal';
import PlayerInfoModal from './PlayerInfoModal';
import './MatchupModal.css';

interface MatchupModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchup: ScheduleMatchup | null;
  selectedLeague: 'NFL' | 'NBA' | 'MLB';
  leagueId: number;
}

interface RosterPlayer {
  id: number;
  playerName: string;
  playerTeam: string;
  playerPosition: string;
  playerLeague: string;
  pickNumber: number;
  round: number;
  draftedAt: string;
}

interface RosterSlot {
  position: string;
  player: RosterPlayer | null;
}

const MatchupModal: React.FC<MatchupModalProps> = ({ isOpen, onClose, matchup, selectedLeague, leagueId }) => {
  const [homeRoster, setHomeRoster] = useState<RosterPlayer[]>([]);
  const [awayRoster, setAwayRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPlayerInfoModalOpen, setIsPlayerInfoModalOpen] = useState<boolean>(false);
  const [selectedPlayerForInfo, setSelectedPlayerForInfo] = useState<Player | null>(null);

  useEffect(() => {
    if (isOpen && matchup) {
      fetchTeamRosters();
    }
  }, [isOpen, matchup, selectedLeague]);

  const fetchTeamRosters = async () => {
    if (!matchup) return;

    setLoading(true);
    setError('');

    try {
      const [homeResponse, awayResponse] = await Promise.all([
        apiRequest(`/api/UserRoster/user/${matchup.homeTeamId}/league/${leagueId}`),
        apiRequest(`/api/UserRoster/user/${matchup.awayTeamId}/league/${leagueId}`)
      ]);

      if (!homeResponse.ok || !awayResponse.ok) {
        throw new Error('Failed to fetch team rosters');
      }

      const [homeData, awayData] = await Promise.all([
        homeResponse.json(),
        awayResponse.json()
      ]);

      // Filter rosters by selected league
      const homeFiltered = homeData.filter((player: RosterPlayer) => 
        player.playerLeague === selectedLeague
      );
      const awayFiltered = awayData.filter((player: RosterPlayer) => 
        player.playerLeague === selectedLeague
      );

      setHomeRoster(homeFiltered);
      setAwayRoster(awayFiltered);
    } catch (err) {
      console.error('Error fetching team rosters:', err);
      setError('Failed to load team rosters');
    } finally {
      setLoading(false);
    }
  };

  // Roster position definitions
  const getRosterPositions = (league: 'NFL' | 'NBA' | 'MLB'): string[] => {
    switch (league) {
      case 'NFL':
        return ['QB', 'RB', 'RB', 'WR', 'WR', 'WR', 'TE'];
      case 'NBA':
        return ['PG', 'SG', 'SF', 'PF', 'C'];
      case 'MLB':
        return ['SP', 'CL', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF'];
      default:
        return [];
    }
  };

  // Organize players into roster slots
  const organizeRoster = (players: RosterPlayer[], positions: string[]): RosterSlot[] => {
    const roster: RosterSlot[] = positions.map((pos, index) => ({ 
      position: pos, 
      player: null 
    }));

    // Sort players by draft order
    const sortedPlayers = [...players].sort((a, b) => a.pickNumber - b.pickNumber);

    sortedPlayers.forEach(player => {
      // Handle position mapping for MLB outfielders
      let playerPosition = player.playerPosition;
      if (player.playerPosition === 'OF' && selectedLeague === 'MLB') {
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
      if (player.playerPosition === 'CP' && selectedLeague === 'MLB') {
        const clSlot = roster.find(slot => 
          slot.position === 'CL' && slot.player === null
        );
        if (clSlot) {
          clSlot.player = player;
          return;
        }
      }

      // Try to fill the exact position first
      const exactSlot = roster.find(slot => 
        slot.position === playerPosition && slot.player === null
      );
      if (exactSlot) {
        exactSlot.player = player;
        return;
      }

      // If no exact match, try to fill any empty slot of the same general position
      // This is primarily for positions that have multiple slots (like RB, WR, OF)
      const similarSlot = roster.find(slot => 
        slot.position === playerPosition && slot.player === null
      );
      if (similarSlot) {
        similarSlot.player = player;
      }
    });

    return roster;
  };

  // Convert RosterPlayer to Player format for modal
  const convertToPlayer = (rosterPlayer: RosterPlayer): Player => ({
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

  const renderTeamRoster = (roster: RosterPlayer[], teamName: string, isHome: boolean) => {
    const positions = getRosterPositions(selectedLeague);
    const organizedRoster = organizeRoster(roster, positions);

    return (
      <div className={`team-roster ${isHome ? 'home' : 'away'}`}>
        <div className="team-header">
          <h3>{teamName}</h3>
          <span className="team-label">{isHome ? 'HOME' : 'AWAY'}</span>
        </div>
        
        <div className="roster-table-container">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Player</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {organizedRoster.map((slot, index) => (
                <tr key={`${teamName}-${slot.position}-${index}`} className="roster-row">
                  <td className="roster-position">{slot.position}</td>
                  {slot.player ? (
                    <>
                      <td className="player-name">
                        <span 
                          className="clickable-player-name"
                          onClick={() => handlePlayerNameClick(convertToPlayer(slot.player!))}
                        >
                          {slot.player.playerName}
                        </span>
                      </td>
                      <td className="player-team">{slot.player.playerTeam}</td>
                    </>
                  ) : (
                    <>
                      <td className="empty-slot">—</td>
                      <td className="empty-slot">—</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!matchup) return null;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="matchup-modal-content">
        <div className="matchup-modal-header">
          <h2>Week {matchup.week} {selectedLeague} Matchup</h2>
          <div className="matchup-details">
            <div className="matchup-date-time">
              <span className="date">{formatDate(matchup.date)}</span>
              <span className="time">{formatTime(matchup.date)}</span>
            </div>
            <div className="matchup-vs">
              <span className="away-team">{matchup.awayTeamName}</span>
              <span className="vs">@</span>
              <span className="home-team">{matchup.homeTeamName}</span>
            </div>
          </div>
        </div>

        {loading && (
          <div className="modal-loading">
            <div className="loading-spinner"></div>
            <p>Loading team rosters...</p>
          </div>
        )}

        {error && (
          <div className="modal-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="teams-comparison">
            {renderTeamRoster(awayRoster, matchup.awayTeamName, false)}
            <div className="vs-divider">
              <span className="vs-text">VS</span>
            </div>
            {renderTeamRoster(homeRoster, matchup.homeTeamName, true)}
          </div>
        )}

        {/* Player Info Modal */}
        <PlayerInfoModal
          isOpen={isPlayerInfoModalOpen}
          onClose={handleClosePlayerInfo}
          player={selectedPlayerForInfo}
        />
      </div>
    </Modal>
  );
};

export default MatchupModal;