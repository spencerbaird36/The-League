import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import './LeagueStandings.css';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  league?: {
    id: number;
    name: string;
  };
}

interface StandingsEntry {
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
}

interface LeagueStandingsProps {
  user: User | null;
}

const LeagueStandings: React.FC<LeagueStandingsProps> = ({ user }) => {
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStandings = async () => {
      if (!user?.league?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching standings for league:', user.league.id);
        const response = await apiRequest(`/api/leagues/${user.league.id}/standings`);
        
        if (response.ok) {
          const standingsData = await response.json();
          console.log('Standings data received:', standingsData);
          
          // The backend returns { LeagueId, LeagueName, Standings: [...] }
          const standingsArray = standingsData.standings || standingsData.Standings || [];
          
          // Transform the data to match our interface
          const transformedStandings: StandingsEntry[] = standingsArray.map((entry: any) => ({
            userId: entry.userId || entry.UserId,
            username: entry.username || entry.Username,
            firstName: entry.firstName || entry.FirstName,
            lastName: entry.lastName || entry.LastName,
            wins: entry.wins || entry.Wins || 0,
            losses: entry.losses || entry.Losses || 0,
            ties: entry.ties || entry.Ties || 0,
            pointsFor: entry.pointsFor || entry.PointsFor || 0,
            pointsAgainst: entry.pointsAgainst || entry.PointsAgainst || 0,
            winPercentage: entry.winPercentage || entry.WinPercentage || (entry.wins || entry.Wins || 0) / Math.max(1, (entry.wins || entry.Wins || 0) + (entry.losses || entry.Losses || 0))
          }));
          
          console.log('Transformed standings:', transformedStandings);
          setStandings(transformedStandings);
        } else {
          console.error('Failed to fetch standings:', response.status, response.statusText);
          setError('Failed to load standings');
        }
      } catch (err) {
        console.error('Error fetching standings:', err);
        setError('Failed to load standings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStandings();
  }, [user?.league?.id]);

  if (isLoading) {
    return (
      <div className="standings-card">
        <h3 className="standings-header">League Standings</h3>
        <div className="standings-loading">Loading standings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="standings-card">
        <h3 className="standings-header">League Standings</h3>
        <div className="standings-error">{error}</div>
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <div className="standings-card">
        <h3 className="standings-header">League Standings</h3>
        <div className="standings-empty">No standings data available yet.</div>
      </div>
    );
  }

  return (
    <div className="standings-card">
      <h3 className="standings-header">
        <span className="standings-icon">🏆</span>
        League Standings
      </h3>
      
      <div className="standings-table-container">
        <table className="standings-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>W-L-T</th>
              <th>Win %</th>
              <th>PF</th>
              <th>PA</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, index) => (
              <tr 
                key={entry.userId}
                className={`standings-row ${entry.userId === user?.id ? 'current-user' : ''}`}
              >
                <td className="rank">
                  <span className={`rank-badge ${index < 3 ? 'top-rank' : ''}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="team-name">
                  <div className="team-info">
                    <span className="name">{entry.firstName} {entry.lastName}</span>
                    <span className="username">@{entry.username}</span>
                  </div>
                </td>
                <td className="record">
                  <span className="wins">{entry.wins}</span>-
                  <span className="losses">{entry.losses}</span>-
                  <span className="ties">{entry.ties}</span>
                </td>
                <td className="win-percentage">
                  {(entry.winPercentage * 100).toFixed(1)}%
                </td>
                <td className="points-for">{entry.pointsFor.toFixed(1)}</td>
                <td className="points-against">{entry.pointsAgainst.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {user && standings.find(s => s.userId === user.id) && (
        <div className="user-rank-summary">
          <span className="rank-text">
            Your rank: #{standings.findIndex(s => s.userId === user.id) + 1} of {standings.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default LeagueStandings;