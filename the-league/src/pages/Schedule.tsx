import React, { useState, useEffect } from 'react';
import { SeasonSchedule, ScheduleMatchup, WeekSchedule } from '../types/Schedule';
import './Schedule.css';

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

interface ScheduleProps {
  user: User | null;
}

const Schedule: React.FC<ScheduleProps> = ({ user }) => {
  const [selectedLeague, setSelectedLeague] = useState<'NFL' | 'NBA' | 'MLB'>('NFL');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [schedules, setSchedules] = useState<{
    NFL: SeasonSchedule | null;
    NBA: SeasonSchedule | null;
    MLB: SeasonSchedule | null;
  }>({
    NFL: null,
    NBA: null,
    MLB: null
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Get current week based on today's date and league
  const getCurrentWeek = (league: 'NFL' | 'NBA' | 'MLB'): number => {
    const today = new Date();
    let seasonStart: Date;
    
    switch (league) {
      case 'NFL':
        seasonStart = new Date('2025-09-01');
        break;
      case 'NBA':
        seasonStart = new Date('2025-10-15');
        break;
      case 'MLB':
        seasonStart = new Date('2025-04-01');
        break;
    }
    
    if (today < seasonStart) return 1;
    
    const daysDiff = Math.floor((today.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysDiff / 7) + 1;
    
    // Cap at reasonable limits
    const maxWeeks = league === 'NFL' ? 17 : 26;
    return Math.min(week, maxWeeks);
  };

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!user?.league?.id) {
        setError('No league found');
        setLoading(false);
        return;
      }

      try {
        // Fetch schedules for all sports from backend
        const currentYear = new Date().getFullYear();
        const apiBaseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://the-league-api-1ff2960f0715.herokuapp.com' 
          : '';
        const [nflResponse, nbaResponse, mlbResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/schedule/league/${user.league.id}/sport/NFL/year/${currentYear}`),
          fetch(`${apiBaseUrl}/api/schedule/league/${user.league.id}/sport/NBA/year/${currentYear}`),
          fetch(`${apiBaseUrl}/api/schedule/league/${user.league.id}/sport/MLB/year/${currentYear}`)
        ]);

        if (!nflResponse.ok || !nbaResponse.ok || !mlbResponse.ok) {
          throw new Error('Failed to fetch schedules');
        }

        const [nflSchedule, nbaSchedule, mlbSchedule] = await Promise.all([
          nflResponse.json(),
          nbaResponse.json(),
          mlbResponse.json()
        ]);

        setSchedules({
          NFL: nflSchedule,
          NBA: nbaSchedule,
          MLB: mlbSchedule
        });
        
        // Set current week based on selected league
        setSelectedWeek(getCurrentWeek(selectedLeague));
      } catch (error) {
        console.error('Error fetching schedules:', error);
        setError('Failed to load schedules. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [user?.league?.id]);

  // Update selected week when league changes
  useEffect(() => {
    setSelectedWeek(getCurrentWeek(selectedLeague));
  }, [selectedLeague]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const getWeekDateRange = (week: WeekSchedule): string => {
    const startDate = new Date(week.startDate);
    const endDate = new Date(week.endDate);
    
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const renderMatchup = (matchup: ScheduleMatchup) => {
    const isCurrentUserInvolved = 
      matchup.homeTeamId === user?.id || matchup.awayTeamId === user?.id;
    
    return (
      <div 
        key={matchup.id} 
        className={`matchup-card ${isCurrentUserInvolved ? 'user-involved' : ''}`}
      >
        <div className="matchup-header">
          <span className="matchup-date">{formatDate(matchup.date)}</span>
          <span className="matchup-time">{formatTime(matchup.date)}</span>
        </div>
        
        <div className="matchup-teams">
          <div className="team away-team">
            <span className="team-name">{matchup.awayTeamName}</span>
            <span className="team-label">@</span>
          </div>
          
          <div className="vs-separator">vs</div>
          
          <div className="team home-team">
            <span className="team-name">{matchup.homeTeamName}</span>
            <span className="team-label">HOME</span>
          </div>
        </div>
        
        {matchup.status === 'completed' && matchup.homeScore !== undefined && matchup.awayScore !== undefined && (
          <div className="matchup-score">
            <span className="score">{matchup.awayScore} - {matchup.homeScore}</span>
          </div>
        )}
        
        <div className={`matchup-status ${matchup.status}`}>
          {matchup.status === 'upcoming' && 'Upcoming'}
          {matchup.status === 'in_progress' && 'In Progress'}
          {matchup.status === 'completed' && 'Final'}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="schedule-container">
        <div className="schedule-loading">Loading schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-container">
        <div className="schedule-error">{error}</div>
      </div>
    );
  }

  const currentSchedule = schedules[selectedLeague];
  const currentWeekSchedule = currentSchedule?.weeks.find(week => week.week === selectedWeek);

  // Calculate number of teams from the schedule
  const getTeamCount = () => {
    if (!currentSchedule?.weeks[0]?.matchups) return 0;
    const teamIds = new Set(currentSchedule.weeks[0].matchups.flatMap(m => [m.homeTeamId, m.awayTeamId]));
    return teamIds.size;
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h1>League Schedule</h1>
        <p>{user?.league?.name} - {currentSchedule?.season} Season</p>
      </div>

      {/* League Selector */}
      <div className="league-selector">
        <div className="league-tabs">
          {(['NFL', 'NBA', 'MLB'] as const).map((league) => (
            <button
              key={league}
              className={`league-tab ${selectedLeague === league ? 'active' : ''}`}
              onClick={() => setSelectedLeague(league)}
            >
              <span className="league-icon">
                {league === 'NFL' && '🏈'}
                {league === 'NBA' && '🏀'}
                {league === 'MLB' && '⚾'}
              </span>
              {league}
            </button>
          ))}
        </div>
      </div>

      {/* Week Selector */}
      {currentSchedule && (
        <div className="week-selector">
          <div className="week-navigation">
            <button
              className="week-nav-btn prev"
              onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
              disabled={selectedWeek <= 1}
            >
              ← Previous Week
            </button>
            
            <div className="week-info">
              <span className="week-number">Week {selectedWeek}</span>
              {currentWeekSchedule && (
                <span className="week-dates">{getWeekDateRange(currentWeekSchedule)}</span>
              )}
            </div>
            
            <button
              className="week-nav-btn next"
              onClick={() => setSelectedWeek(Math.min(currentSchedule.weeks.length, selectedWeek + 1))}
              disabled={selectedWeek >= currentSchedule.weeks.length}
            >
              Next Week →
            </button>
          </div>
          
          {/* Week Quick Selector */}
          <div className="week-quick-selector">
            {currentSchedule.weeks.slice(0, Math.min(8, currentSchedule.weeks.length)).map((week) => (
              <button
                key={week.week}
                className={`week-quick-btn ${selectedWeek === week.week ? 'active' : ''}`}
                onClick={() => setSelectedWeek(week.week)}
              >
                {week.week}
              </button>
            ))}
            {currentSchedule.weeks.length > 8 && (
              <span className="week-more">...</span>
            )}
          </div>
        </div>
      )}

      {/* Schedule Content */}
      <div className="schedule-content">
        {currentWeekSchedule ? (
          <div className="week-schedule">
            <div className="week-header">
              <h2>Week {currentWeekSchedule.week} - {selectedLeague}</h2>
              <p className="week-subtitle">
                {getWeekDateRange(currentWeekSchedule)} • {currentWeekSchedule.matchups.length} game{currentWeekSchedule.matchups.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {currentWeekSchedule.matchups.length > 0 ? (
              <div className="matchups-grid">
                {currentWeekSchedule.matchups.map(renderMatchup)}
              </div>
            ) : (
              <div className="no-games">
                <p>No games scheduled for this week.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="no-schedule">
            <p>No schedule available for Week {selectedWeek}.</p>
          </div>
        )}
      </div>

      {/* Season Overview */}
      {currentSchedule && (
        <div className="season-overview">
          <h3>Season Overview</h3>
          <div className="season-stats">
            <div className="stat-item">
              <span className="stat-label">Total Weeks</span>
              <span className="stat-value">{currentSchedule.weeks.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Games</span>
              <span className="stat-value">
                {currentSchedule.weeks.reduce((total, week) => total + week.matchups.length, 0)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Teams</span>
              <span className="stat-value">{getTeamCount()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Current Week</span>
              <span className="stat-value">{getCurrentWeek(selectedLeague)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;