import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import './UpcomingMatchups.css';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  teamLogo?: string;
  league?: {
    id: number;
    name: string;
  };
}

interface Matchup {
  id: string;
  week: number;
  season?: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  homeScore?: number;
  awayScore?: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  date: string;
  league: string;
}

interface ScheduleResponse {
  league: string;
  season: number;
  weeks: {
    week: number;
    startDate: string;
    endDate: string;
    matchups: Matchup[];
  }[];
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
              const scheduleData: ScheduleResponse = await response.json();
              console.log(`${sport} schedule data received:`, scheduleData);
              
              // Flatten all matchups from all weeks
              const sportMatchups: Matchup[] = [];
              
              for (const week of scheduleData.weeks) {
                for (const matchup of week.matchups) {
                  // Only include matchups involving the current user
                  if (matchup.homeTeamId === user.id || matchup.awayTeamId === user.id) {
                    sportMatchups.push({
                      ...matchup,
                      season: scheduleData.season,
                      league: sport
                    });
                  }
                }
              }
              
              // Find the most current matchup for this sport
              // First, try to find upcoming or in-progress matchups
              const now = new Date();
              
              let currentMatchup = sportMatchups.find(matchup => {
                const matchDate = new Date(matchup.date);
                return (matchup.status === 'upcoming' || matchup.status === 'in_progress' || 
                        matchup.status === 'SCHEDULED' || matchup.status === 'IN_PROGRESS') &&
                       matchDate >= now;
              });
              
              // If no upcoming matchups, get the first scheduled matchup even if it's in the past
              // This ensures we show matchups even when the league hasn't started yet
              if (!currentMatchup && sportMatchups.length > 0) {
                currentMatchup = sportMatchups.find(matchup => 
                  matchup.status === 'upcoming' || matchup.status === 'SCHEDULED'
                ) || sportMatchups[0]; // Fallback to first matchup
              }
              
              if (currentMatchup) {
                allMatchups.push(currentMatchup);
              }
              
            }
          } catch (sportError) {
            console.log(`No ${sport} schedule found or error fetching:`, sportError);
          }
        }
        
        // Sort by week number to show them in chronological order
        allMatchups.sort((a, b) => a.week - b.week);
        setMatchups(allMatchups);
        
      } catch (err) {
        console.error('Error fetching upcoming matchups:', err);
        setError('Failed to load upcoming matchups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingMatchups();
  }, [user?.id, user?.league?.id]);

  const formatMatchupDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7 && diffInDays > 0) return `In ${diffInDays} days`;
    if (diffInDays < 0 && diffInDays > -7) return `${Math.abs(diffInDays)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getOpponent = (matchup: Matchup) => {
    if (matchup.homeTeamId === user?.id) {
      // User is home team
      return {
        name: matchup.awayTeamName,
        isHome: true,
        userScore: matchup.homeScore,
        opponentScore: matchup.awayScore
      };
    } else {
      // User is away team
      return {
        name: matchup.homeTeamName,
        isHome: false,
        userScore: matchup.awayScore,
        opponentScore: matchup.homeScore
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
      case 'upcoming': return '📅';
      case 'in_progress':
      case 'in-progress': return '⚡';
      case 'completed': return '✅';
      default: return '📋';
    }
  };

  const getLeagueIcon = (league: string) => {
    switch (league) {
      case 'NFL': return '🏈';
      case 'MLB': return '⚾';
      case 'NBA': return '🏀';
      default: return '🏆';
    }
  };

  // Team logo mapping
  const TEAM_LOGOS = [
    { id: 'football', emoji: '🏈', name: 'Football' },
    { id: 'basketball', emoji: '🏀', name: 'Basketball' },
    { id: 'baseball', emoji: '⚾', name: 'Baseball' },
    { id: 'soccer', emoji: '⚽', name: 'Soccer' },
    { id: 'hockey', emoji: '🏒', name: 'Hockey' },
    { id: 'tennis', emoji: '🎾', name: 'Tennis' },
    { id: 'golf', emoji: '⛳', name: 'Golf' },
    { id: 'trophy', emoji: '🏆', name: 'Trophy' },
    { id: 'medal', emoji: '🥇', name: 'Gold Medal' },
    { id: 'star', emoji: '⭐', name: 'Star' },
    { id: 'fire', emoji: '🔥', name: 'Fire' },
    { id: 'lightning', emoji: '⚡', name: 'Lightning' }
  ];

  const getUserLogo = () => {
    if (user?.teamLogo) {
      const logo = TEAM_LOGOS.find(logo => logo.id === user.teamLogo);
      return logo?.emoji;
    }
    return null;
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
                  <span className="league-badge">
                    {getLeagueIcon(matchup.league)} {matchup.league}
                  </span>
                </div>
                <div className="matchup-status">
                  <span className="status-icon">{getStatusIcon(matchup.status)}</span>
                  <span className="status-text">{matchup.status.replace('_', ' ').replace('-', ' ')}</span>
                </div>
              </div>
              
              <div className="matchup-teams">
                <div className="team-section user-team">
                  <div className="team-info">
                    <div className="team-name-row">
                      {getUserLogo() && <span className="team-logo">{getUserLogo()}</span>}
                      <span className="team-name">You</span>
                    </div>
                    <span className="team-username">@{user?.username}</span>
                  </div>
                  {opponent.userScore !== undefined && opponent.userScore !== null && (
                    <div className="team-score">{opponent.userScore.toFixed(1)}</div>
                  )}
                </div>
                
                <div className="matchup-vs">
                  <span className="vs-text">vs</span>
                  <div className="home-away-indicator">
                    {opponent.isHome ? 'HOME' : 'AWAY'}
                  </div>
                </div>
                
                <div className="team-section opponent-team">
                  <div className="team-info">
                    <span className="team-name">{opponent.name}</span>
                  </div>
                  {opponent.opponentScore !== undefined && opponent.opponentScore !== null && (
                    <div className="team-score">{opponent.opponentScore.toFixed(1)}</div>
                  )}
                </div>
              </div>
              
              <div className="matchup-footer">
                <div className="matchup-date">
                  {formatMatchupDate(matchup.date)}
                </div>
                {(matchup.status === 'upcoming' || matchup.status === 'SCHEDULED') && (
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