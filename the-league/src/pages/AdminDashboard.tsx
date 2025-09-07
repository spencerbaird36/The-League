import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, AdminDashboard as AdminDashboardData, AdminLeague, AdminUser, AdminPlayer } from '../services/adminService';
import './AdminDashboard.css';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leagues' | 'users' | 'players'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: 'league' | 'user' | 'player', id: number, name: string} | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (!adminService.isAdmin(user.email)) {
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard(user.id);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadLeagues = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllLeagues(user.id);
      setLeagues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllUsers(user.id);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAllPlayers(user.id, selectedLeague || undefined);
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'dashboard' | 'leagues' | 'users' | 'players') => {
    setActiveTab(tab);
    setError('');
    
    switch (tab) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'leagues':
        loadLeagues();
        break;
      case 'users':
        loadUsers();
        break;
      case 'players':
        loadPlayers();
        break;
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      setLoading(true);
      const { type, id } = showDeleteConfirm;
      
      switch (type) {
        case 'league':
          await adminService.deleteLeague(id, user.id);
          loadLeagues();
          break;
        case 'user':
          await adminService.deleteUser(id, user.id);
          loadUsers();
          break;
        case 'player':
          await adminService.deletePlayer(id, user.id);
          loadPlayers();
          break;
      }
      
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete operation failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !dashboardData && !leagues.length && !users.length && !players.length) {
    return (
      <div className="admin-dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🛠️ Master Admin Dashboard</h1>
        <p>Welcome, {user.firstName}! You have full administrative access.</p>
        <button 
          className="back-button"
          onClick={() => navigate('/')}
        >
          ← Back to League Homepage
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => handleTabChange('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'leagues' ? 'active' : ''}
          onClick={() => handleTabChange('leagues')}
        >
          🏆 Leagues ({leagues.length})
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => handleTabChange('users')}
        >
          👥 Users ({users.length})
        </button>
        <button 
          className={activeTab === 'players' ? 'active' : ''}
          onClick={() => handleTabChange('players')}
        >
          ⚾ Players ({players.length})
        </button>
      </div>

      <div className="admin-content">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="dashboard-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Users</h3>
                <div className="stat-number">{dashboardData.stats?.totalUsers || 0}</div>
                <div className="stat-detail">{dashboardData.stats?.activeUsers || 0} active</div>
              </div>
              <div className="stat-card">
                <h3>Leagues</h3>
                <div className="stat-number">{dashboardData.stats?.totalLeagues || 0}</div>
                <div className="stat-detail">{dashboardData.stats?.activeLeagues || 0} active</div>
              </div>
              <div className="stat-card">
                <h3>Players</h3>
                <div className="stat-number">{dashboardData.stats?.totalPlayers || 0}</div>
                <div className="stat-detail">{dashboardData.stats?.activePlayers || 0} active</div>
              </div>
            </div>

            <div className="dashboard-sections">
              <div className="dashboard-section">
                <h3>Players by League</h3>
                <div className="league-stats">
                  {(dashboardData.playersByLeague || []).map(league => (
                    <div key={league.league} className="league-stat">
                      <span className="league-name">{league.league}</span>
                      <span className="league-count">{league.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-section">
                <h3>Recent Users</h3>
                <div className="recent-list">
                  {(dashboardData.recentUsers || []).map(user => (
                    <div key={user.id} className="recent-item">
                      <span>{user.firstName} {user.lastName}</span>
                      <span className="recent-date">{formatDate(user.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-section">
                <h3>Recent Leagues</h3>
                <div className="recent-list">
                  {(dashboardData.recentLeagues || []).map(league => (
                    <div key={league.id} className="recent-item">
                      <span>{league.name} ({league.userCount} users)</span>
                      <span className="recent-date">{formatDate(league.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LEAGUES TAB */}
        {activeTab === 'leagues' && (
          <div className="leagues-management">
            <div className="section-header">
              <h2>League Management</h2>
              <p>Manage all leagues and their members</p>
            </div>
            
            <div className="leagues-grid">
              {leagues.map(league => (
                <div key={league.id} className="league-card">
                  <div className="league-header">
                    <h3>{league.name}</h3>
                    <span className={`status ${league.isActive ? 'active' : 'inactive'}`}>
                      {league.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="league-details">
                    <p><strong>Description:</strong> {league.description}</p>
                    <p><strong>Join Code:</strong> {league.joinCode}</p>
                    <p><strong>Members:</strong> {league.userCount}/{league.maxPlayers}</p>
                    <p><strong>Created by:</strong> {league.createdBy.firstName} {league.createdBy.lastName}</p>
                    <p><strong>Created:</strong> {formatDate(league.createdAt)}</p>
                  </div>

                  <div className="league-members">
                    <h4>Members:</h4>
                    <div className="members-list">
                      {(league.users || []).map(user => (
                        <div key={user.id} className="member-item">
                          {user.firstName} {user.lastName} ({user.username})
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="league-actions">
                    <button 
                      className="delete-button"
                      onClick={() => setShowDeleteConfirm({type: 'league', id: league.id, name: league.name})}
                    >
                      🗑️ Delete League
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="users-management">
            <div className="section-header">
              <h2>User Management</h2>
              <p>Manage all registered users</p>
            </div>

            <div className="users-table">
              <div className="table-header">
                <span>Name</span>
                <span>Username</span>
                <span>Email</span>
                <span>League</span>
                <span>Status</span>
                <span>Created</span>
                <span>Actions</span>
              </div>
              
              {users.map(user => (
                <div key={user.id} className="table-row">
                  <span>{user.firstName} {user.lastName}</span>
                  <span>{user.username}</span>
                  <span>{user.email}</span>
                  <span>{user.league ? user.league.name : 'None'}</span>
                  <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span>{formatDate(user.createdAt)}</span>
                  <span>
                    {user.email !== 'spencer.baird36@gmail.com' && (
                      <button 
                        className="delete-button small"
                        onClick={() => setShowDeleteConfirm({type: 'user', id: user.id, name: `${user.firstName} ${user.lastName}`})}
                      >
                        🗑️
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAYERS TAB */}
        {activeTab === 'players' && (
          <div className="players-management">
            <div className="section-header">
              <h2>Player Management</h2>
              <p>Manage all players across all sports</p>
              
              <div className="league-filter">
                <label>Filter by league:</label>
                <select 
                  value={selectedLeague} 
                  onChange={(e) => {
                    setSelectedLeague(e.target.value);
                    // Reload players with new filter
                    adminService.getAllPlayers(user.id, e.target.value || undefined)
                      .then(setPlayers)
                      .catch(err => setError(err.message));
                  }}
                >
                  <option value="">All Leagues</option>
                  <option value="NFL">NFL</option>
                  <option value="MLB">MLB</option>
                  <option value="NBA">NBA</option>
                </select>
              </div>
            </div>

            <div className="players-table">
              <div className="table-header">
                <span>Name</span>
                <span>Position</span>
                <span>Team</span>
                <span>League</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              
              {players.map(player => (
                <div key={player.id} className="table-row">
                  <span>{player.name}</span>
                  <span>{player.position}</span>
                  <span>{player.team}</span>
                  <span>{player.league}</span>
                  <span className="status active">
                    Active
                  </span>
                  <span>
                    <button 
                      className="delete-button small"
                      onClick={() => setShowDeleteConfirm({type: 'player', id: player.id, name: player.name})}
                    >
                      🗑️
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this {showDeleteConfirm.type}?</p>
            <p><strong>{showDeleteConfirm.name}</strong></p>
            <p className="warning">This action cannot be undone and will remove all associated data.</p>
            
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;