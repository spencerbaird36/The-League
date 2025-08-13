import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Standings.css';

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

interface StandingEntry {
  rank: number;
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  winPercentage: number;
  gamesPlayed: number;
  gamesBehind: number;
}

interface StandingsData {
  leagueId: number;
  leagueName: string;
  standings: StandingEntry[];
}

interface StandingsProps {
  user: User | null;
}

const Standings: React.FC<StandingsProps> = ({ user }) => {
  const navigate = useNavigate();
  const [standingsData, setStandingsData] = useState<StandingsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchStandings = async () => {
      if (!user?.league?.id) {
        setError('No league found');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/leagues/${user.league.id}/standings`);
        if (response.ok) {
          const data = await response.json();
          setStandingsData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load standings');
        }
      } catch (error) {
        console.error('Error fetching standings:', error);
        setError('Network error. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [user?.league?.id]);

  const formatWinPercentage = (percentage: number): string => {
    return (percentage * 100).toFixed(1) + '%';
  };

  const formatGamesBehind = (gamesBehind: number): string => {
    if (gamesBehind === 0) return '-';
    return gamesBehind.toString();
  };

  const getRecordString = (wins: number, losses: number, ties: number): string => {
    if (ties > 0) {
      return `${wins}-${losses}-${ties}`;
    }
    return `${wins}-${losses}`;
  };

  const handleTeamClick = (userId: number) => {
    navigate(`/team/${userId}`);
  };

  if (loading) {
    return (
      <div className="standings-container">
        <div className="standings-loading">Loading standings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="standings-container">
        <div className="standings-error">{error}</div>
      </div>
    );
  }

  if (!standingsData) {
    return (
      <div className="standings-container">
        <div className="standings-error">No standings data available</div>
      </div>
    );
  }

  return (
    <div className="standings-container">
      <div className="standings-header">
        <h1>{standingsData.leagueName} Standings</h1>
        <p>{standingsData.standings.length} teams</p>
      </div>

      <div className="standings-table-container">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Record</th>
              <th>Win%</th>
              <th>Points For</th>
              <th>Points Against</th>
              <th>GB</th>
            </tr>
          </thead>
          <tbody>
            {standingsData.standings.map((entry) => (
              <tr 
                key={entry.userId}
                className={entry.userId === user?.id ? 'current-user' : ''}
              >
                <td className="rank-cell">{entry.rank}</td>
                <td className="team-cell">
                  <div 
                    className="team-info clickable"
                    onClick={() => handleTeamClick(entry.userId)}
                  >
                    <span className="team-name">
                      {entry.firstName} {entry.lastName}
                    </span>
                    <span className="username">@{entry.username}</span>
                  </div>
                </td>
                <td className="record-cell">
                  {getRecordString(entry.wins, entry.losses, entry.ties)}
                </td>
                <td className="percentage-cell">
                  {formatWinPercentage(entry.winPercentage)}
                </td>
                <td className="points-cell">
                  {entry.pointsFor.toFixed(1)}
                </td>
                <td className="points-cell">
                  {entry.pointsAgainst.toFixed(1)}
                </td>
                <td className="gb-cell">
                  {formatGamesBehind(entry.gamesBehind)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {standingsData.standings.length === 0 && (
        <div className="no-standings">
          <p>No standings available yet. Games need to be played to generate standings.</p>
        </div>
      )}
    </div>
  );
};

export default Standings;