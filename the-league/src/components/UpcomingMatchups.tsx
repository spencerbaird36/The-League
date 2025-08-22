import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import './UpcomingMatchups.css';

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

interface Matchup {
  id: number;
  week: number;
  season: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  awayTeam: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  homeScore?: number;
  awayScore?: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  startDate: string;
  leagueType?: string;
}

interface UpcomingMatchupsProps {
  user: User | null;
}

const UpcomingMatchups: React.FC<UpcomingMatchupsProps> = ({ user }) => {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingMatchups = async () => {
      if (!user?.id || !user?.league?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Fetching upcoming matchups for league:', user.league.id);
        
        // Fetch schedules for all sports for current year
        const currentYear = new Date().getFullYear();
        const sports = ['NFL', 'MLB', 'NBA'];
        const allMatchups: Matchup[] = [];
        
        for (const sport of sports) {
          try {
            const response = await apiRequest(`/api/schedule/league/${user.league.id}/sport/${sport}/year/${currentYear}`);
            
            if (response.ok) {
              const scheduleData = await response.json();
              console.log(`${sport} schedule data received:`, scheduleData);
              
              if (Array.isArray(scheduleData)) {
                const sportMatchups = scheduleData
                  .filter((match: any) => {
                    // Only include matchups involving the current user
                    return match.homeTeamId === user.id || match.awayTeamId === user.id;
                  })
                  .filter((match: any) => {
                    // Only include upcoming or in-progress matchups
                    const matchDate = new Date(match.startDate || match.date);
                    const now = new Date();
                    return match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS' || matchDate >= now;
                  })
                  .slice(0, 2) // Limit to 2 per sport
                  .map((match: any, index: number) => ({
                    id: match.id || `${sport}-${index}`,
                    week: match.week || 1,
                    season: match.season || currentYear,
                    homeTeamId: match.homeTeamId,
                    awayTeamId: match.awayTeamId,
                    homeTeam: match.homeTeam || {
                      id: match.homeTeamId,
                      username: match.homeTeamId === user.id ? user.username : 'Unknown',
                      firstName: match.homeTeamId === user.id ? user.firstName : 'Unknown',
                      lastName: match.homeTeamId === user.id ? user.lastName : 'User'
                    },
                    awayTeam: match.awayTeam || {
                      id: match.awayTeamId,
                      username: match.awayTeamId === user.id ? user.username : 'Unknown',
                      firstName: match.awayTeamId === user.id ? user.firstName : 'Unknown',
                      lastName: match.awayTeamId === user.id ? user.lastName : 'User'
                    },
                    homeScore: match.homeScore,
                    awayScore: match.awayScore,
                    status: match.status || 'SCHEDULED',
                    startDate: match.startDate || match.date || new Date().toISOString(),
                    leagueType: sport
                  }));
                
                allMatchups.push(...sportMatchups);
              }
            }
          } catch (sportError) {
            console.log(`No ${sport} schedule found or error fetching:`, sportError);
          }
        }
        
        // Sort by start date and take first 5
        allMatchups.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setMatchups(allMatchups.slice(0, 5));
        
      } catch (err) {
        console.error('Error fetching upcoming matchups:', err);
        setError('Failed to load upcoming matchups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingMatchups();
  }, [user?.id, user?.league?.id, user?.username, user?.firstName, user?.lastName]);

  const formatMatchupDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `In ${diffInDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getOpponent = (matchup: Matchup) => {
    if (matchup.homeTeamId === user?.id) {
      return {
        team: matchup.awayTeam,
        isHome: true,
        userScore: matchup.homeScore,
        opponentScore: matchup.awayScore
      };
    } else {
      return {
        team: matchup.homeTeam,
        isHome: false,
        userScore: matchup.awayScore,
        opponentScore: matchup.homeScore
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return '📅';
      case 'IN_PROGRESS': return '⚡';
      case 'COMPLETED': return '✅';
      default: return '📋';
    }
  };

  const getLeagueIcon = (leagueType?: string) => {
    switch (leagueType) {
      case 'NFL': return '🏈';
      case 'MLB': return '⚾';
      case 'NBA': return '🏀';
      default: return '🏆';
    }
  };

  if (isLoading) {
    return (
      <div className="matchups-card">
        <h3 className="matchups-header">Upcoming Matchups</h3>
        <div className="matchups-loading">Loading matchups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="matchups-card">
        <h3 className="matchups-header">Upcoming Matchups</h3>
        <div className="matchups-error">{error}</div>
      </div>
    );
  }

  if (matchups.length === 0) {
    return (
      <div className="matchups-card">
        <h3 className="matchups-header">
          <span className="matchups-icon">⚔️</span>
          Upcoming Matchups
        </h3>
        <div className="matchups-empty">No upcoming matchups scheduled.</div>
      </div>
    );
  }

  return (
    <div className="matchups-card">
      <h3 className="matchups-header">
        <span className="matchups-icon">⚔️</span>
        Upcoming Matchups
      </h3>
      
      <div className="matchups-list">
        {matchups.map((matchup) => {
          const opponent = getOpponent(matchup);
          
          return (
            <div key={matchup.id} className="matchup-item">
              <div className="matchup-header-row">
                <div className="matchup-week">
                  <span className="week-text">Week {matchup.week}</span>
                  {matchup.leagueType && (
                    <span className="league-badge">
                      {getLeagueIcon(matchup.leagueType)} {matchup.leagueType}
                    </span>
                  )}
                </div>
                <div className="matchup-status">
                  <span className="status-icon">{getStatusIcon(matchup.status)}</span>
                  <span className="status-text">{matchup.status.replace('_', ' ')}</span>
                </div>
              </div>
              
              <div className="matchup-teams">
                <div className="team-section user-team">
                  <div className="team-info">
                    <span className="team-name">You</span>
                    <span className="team-username">@{user?.username}</span>
                  </div>
                  {opponent.userScore !== undefined && (
                    <div className="team-score">{opponent.userScore.toFixed(1)}</div>
                  )}
                </div>
                
                <div className="matchup-vs">
                  <span className="vs-text">vs</span>
                  <div className="home-away-indicator">
                    {opponent.isHome ? '@' : 'vs'}
                  </div>
                </div>
                
                <div className="team-section opponent-team">
                  <div className="team-info">
                    <span className="team-name">{opponent.team.firstName} {opponent.team.lastName}</span>
                    <span className="team-username">@{opponent.team.username}</span>
                  </div>
                  {opponent.opponentScore !== undefined && (
                    <div className="team-score">{opponent.opponentScore.toFixed(1)}</div>
                  )}
                </div>
              </div>
              
              <div className="matchup-footer">
                <div className="matchup-date">
                  {formatMatchupDate(matchup.startDate)}
                </div>
                {matchup.status === 'SCHEDULED' && (
                  <button className="view-matchup-btn">
                    View Details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="matchups-footer">
        <button className="view-all-matchups">
          View Schedule →
        </button>
      </div>
    </div>
  );
};

export default UpcomingMatchups;