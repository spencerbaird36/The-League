import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../config/api';
import './LeagueHomepage.css';

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

interface UpcomingMatchup {
  id: number;
  week: number;
  opponent: {
    userId: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  league: 'NFL' | 'NBA' | 'MLB';
  status: 'upcoming' | 'in_progress' | 'completed';
}

interface Transaction {
  id: number;
  type: 'FreeAgentPickup' | 'Trade' | 'Drop' | 'Waiver';
  description: string;
  playerName?: string;
  playerPosition?: string;
  playerTeam?: string;
  playerLeague?: 'NFL' | 'NBA' | 'MLB';
  createdAt: string;
  userName: string;
}

interface LeagueHomepageProps {
  user: User | null;
}

const LeagueHomepage: React.FC<LeagueHomepageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [upcomingMatchups, setUpcomingMatchups] = useState<UpcomingMatchup[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current week (this would normally come from the league settings)
  const currentWeek = 1; // TODO: Replace with actual current week logic

  const fetchStandings = useCallback(async () => {
    if (!user?.league?.id) return;
    
    try {
      const response = await apiRequest(`/api/leagues/${user.league.id}/standings`);
      if (response.ok) {
        const data = await response.json();
        setStandings(data.standings?.slice(0, 5) || []); // Show top 5 for homepage preview
      }
    } catch (error) {
      console.error('Error fetching standings:', error);
      // Set empty standings on error
      setStandings([]);
    }
  }, [user?.league?.id]);

  const fetchUpcomingMatchups = useCallback(async () => {
    if (!user?.league?.id || !user?.id) return;
    
    // TODO: Replace with actual schedule API when implemented
    // Mock data for development since schedule/upcoming endpoint doesn't exist yet
    setUpcomingMatchups([
      {
        id: 1,
        week: currentWeek,
        opponent: {
          userId: 2,
          username: 'sportsfan99',
          firstName: 'John',
          lastName: 'Smith'
        },
        league: 'NFL',
        status: 'upcoming'
      }
    ]);
  }, [user?.league?.id, user?.id, currentWeek]);

  const fetchRecentTransactions = useCallback(async () => {
    if (!user?.league?.id) return;
    
    try {
      const response = await apiRequest(`/api/teams/transactions/${user.league.id}?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // For now, use empty array - no mock data since this is a new feature
      setRecentTransactions([]);
    }
  }, [user?.league?.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStandings(),
        fetchUpcomingMatchups(),
        fetchRecentTransactions()
      ]);
      setLoading(false);
    };

    fetchData();
  }, [fetchStandings, fetchUpcomingMatchups, fetchRecentTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Show relative time for recent transactions
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      // For older transactions, show formatted date in user's timezone
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'FreeAgentPickup': return '⬆️';
      case 'Trade': return '🔄';
      case 'Drop': return '⬇️';
      case 'Waiver': return '📋';
      default: return '📄';
    }
  };

  const getTransactionDescription = (transaction: Transaction) => {
    // Use the description from the backend, which is already formatted
    return transaction.description;
  };

  if (loading) {
    return (
      <div className="league-homepage">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your league dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="league-homepage">
      <div className="homepage-header">
        <h1>Welcome back, {user?.firstName}!</h1>
        <p className="league-name">{user?.league?.name}</p>
      </div>

      <div className="dashboard-grid">
        {/* Standings Preview */}
        <div className="dashboard-card standings-card">
          <div className="card-header">
            <h2>League Standings</h2>
            <button 
              className="view-more-btn"
              onClick={() => navigate('/standings')}
            >
              View All
            </button>
          </div>
          <div className="card-content">
            {standings.length > 0 ? (
              <div className="standings-preview">
                {standings.map((entry, index) => (
                  <div 
                    key={entry.userId} 
                    className={`standing-item ${entry.userId === user?.id ? 'current-user' : ''}`}
                  >
                    <div className="standing-rank">#{entry.rank}</div>
                    <div className="standing-info">
                      <span className="standing-name">
                        {entry.firstName} {entry.lastName}
                      </span>
                      <span className="standing-record">
                        {entry.wins}-{entry.losses}
                        {entry.ties > 0 && `-${entry.ties}`}
                      </span>
                    </div>
                    <div className="standing-points">
                      {entry.pointsFor.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>Standings will appear here once games begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Matchups */}
        <div className="dashboard-card matchups-card">
          <div className="card-header">
            <h2>Your Upcoming Matchups</h2>
            <button 
              className="view-more-btn"
              onClick={() => navigate('/schedule')}
            >
              View Schedule
            </button>
          </div>
          <div className="card-content">
            {upcomingMatchups.length > 0 ? (
              <div className="matchups-preview">
                {upcomingMatchups.map((matchup) => (
                  <div key={matchup.id} className="matchup-item">
                    <div className="matchup-week">Week {matchup.week}</div>
                    <div className="matchup-details">
                      <div className="matchup-teams">
                        <span className="team-name current-user">You</span>
                        <span className="vs">vs</span>
                        <span className="team-name">
                          {matchup.opponent.firstName} {matchup.opponent.lastName}
                        </span>
                      </div>
                      <div className="matchup-league">
                        <span className={`league-badge ${matchup.league.toLowerCase()}`}>
                          {matchup.league}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <p>No upcoming matchups scheduled yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="dashboard-card transactions-card">
          <div className="card-header">
            <h2>Recent League Activity</h2>
            <span className="activity-count">
              {recentTransactions.length} recent transactions
            </span>
          </div>
          <div className="card-content">
            {recentTransactions.length > 0 ? (
              <div className="transactions-list">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-icon">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="transaction-details">
                      <div className="transaction-description">
                        <span className="transaction-action">
                          {getTransactionDescription(transaction)}
                        </span>
                      </div>
                      <div className="transaction-meta">
                        {transaction.playerLeague && (
                          <span className={`league-badge ${transaction.playerLeague.toLowerCase()}`}>
                            {transaction.playerLeague}
                          </span>
                        )}
                        <span className="transaction-time">
                          {formatDate(transaction.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data">
                <div className="no-transactions-icon">📝</div>
                <h3>No transactions yet</h3>
                <p>League activity will appear here once drafting begins or trades are made.</p>
                <button 
                  className="action-btn"
                  onClick={() => navigate('/draft')}
                >
                  Start Drafting
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card quick-actions-card">
          <div className="card-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              <button 
                className="quick-action-btn draft"
                onClick={() => navigate('/draft')}
              >
                <span className="action-icon">🎯</span>
                <span className="action-text">Draft Players</span>
              </button>
              <button 
                className="quick-action-btn team"
                onClick={() => navigate('/my-team')}
              >
                <span className="action-icon">👥</span>
                <span className="action-text">View My Team</span>
              </button>
              <button 
                className="quick-action-btn chat"
                onClick={() => navigate('/chat')}
              >
                <span className="action-icon">💬</span>
                <span className="action-text">League Chat</span>
              </button>
              <button 
                className="quick-action-btn standings"
                onClick={() => navigate('/standings')}
              >
                <span className="action-icon">🏆</span>
                <span className="action-text">Full Standings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeagueHomepage;