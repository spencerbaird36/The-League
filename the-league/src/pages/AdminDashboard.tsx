import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, AdminDashboard as AdminDashboardData, AdminLeague, AdminUser } from '../services/adminService';
import { nflPlayersService, ActiveNflPlayer, NflPlayerStats, SyncResult } from '../services/nflPlayersService';
import { mlbPlayersService, ActiveMlbPlayer, MlbPlayerStats, SyncResult as MlbSyncResult } from '../services/mlbPlayersService';
import { nbaPlayersService, ActiveNbaPlayer, NbaPlayerStats, SyncResult as NbaSyncResult } from '../services/nbaPlayersService';
import './AdminDashboard.css';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leagues' | 'users' | 'nfl-players' | 'mlb-players' | 'nba-players'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{type: 'league' | 'user', id: number, name: string} | null>(null);

  // NFL Players state
  const [nflPlayers, setNflPlayers] = useState<ActiveNflPlayer[]>([]);
  const [nflPlayerStats, setNflPlayerStats] = useState<NflPlayerStats | null>(null);
  const [nflPlayersPage, setNflPlayersPage] = useState(1);
  const [nflPlayersTotal, setNflPlayersTotal] = useState(0);
  const [nflSelectedPosition, setNflSelectedPosition] = useState<string>('');
  const [nflSelectedTeam, setNflSelectedTeam] = useState<string>('');
  const [nflAvailableTeams, setNflAvailableTeams] = useState<string[]>([]);
  const [nflAvailablePositions, setNflAvailablePositions] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // MLB Players state
  const [mlbPlayers, setMlbPlayers] = useState<ActiveMlbPlayer[]>([]);
  const [mlbPlayerStats, setMlbPlayerStats] = useState<MlbPlayerStats | null>(null);
  const [mlbPlayersPage, setMlbPlayersPage] = useState(1);
  const [mlbPlayersTotal, setMlbPlayersTotal] = useState(0);
  const [mlbSelectedPosition, setMlbSelectedPosition] = useState<string>('');
  const [mlbSelectedTeam, setMlbSelectedTeam] = useState<string>('');
  const [mlbAvailableTeams, setMlbAvailableTeams] = useState<string[]>([]);
  const [mlbAvailablePositions, setMlbAvailablePositions] = useState<string[]>([]);
  const [mlbSyncing, setMlbSyncing] = useState(false);
  const [mlbSyncResult, setMlbSyncResult] = useState<MlbSyncResult | null>(null);

  // NBA Players state
  const [nbaPlayers, setNbaPlayers] = useState<ActiveNbaPlayer[]>([]);
  const [nbaPlayerStats, setNbaPlayerStats] = useState<NbaPlayerStats | null>(null);
  const [nbaPlayersPage, setNbaPlayersPage] = useState(1);
  const [nbaPlayersTotal, setNbaPlayersTotal] = useState(0);
  const [nbaSelectedPosition, setNbaSelectedPosition] = useState<string>('');
  const [nbaSelectedTeam, setNbaSelectedTeam] = useState<string>('');
  const [nbaAvailableTeams, setNbaAvailableTeams] = useState<string[]>([]);
  const [nbaAvailablePositions, setNbaAvailablePositions] = useState<string[]>([]);
  const [nbaSyncing, setNbaSyncing] = useState(false);
  const [nbaSyncResult, setNbaSyncResult] = useState<NbaSyncResult | null>(null);

  useEffect(() => {
    // Check if user is admin
    if (!adminService.isAdmin(user.email)) {
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

  // Effect to reload NFL players when pagination or filters change
  useEffect(() => {
    if (activeTab === 'nfl-players' && (nflSelectedPosition || nflSelectedTeam || nflPlayersPage > 1)) {
      loadNflPlayers();
    }
  }, [nflPlayersPage, nflSelectedPosition, nflSelectedTeam]);

  // Effect to reload MLB players when pagination or filters change
  useEffect(() => {
    if (activeTab === 'mlb-players' && (mlbSelectedPosition || mlbSelectedTeam || mlbPlayersPage > 1)) {
      loadMlbPlayers();
    }
  }, [mlbPlayersPage, mlbSelectedPosition, mlbSelectedTeam]);

  // Effect to reload NBA players when pagination or filters change
  useEffect(() => {
    if (activeTab === 'nba-players' && (nbaSelectedPosition || nbaSelectedTeam || nbaPlayersPage > 1)) {
      loadNbaPlayers();
    }
  }, [nbaPlayersPage, nbaSelectedPosition, nbaSelectedTeam]);

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


  const loadNflPlayers = async () => {
    try {
      setLoading(true);
      const [playersData, statsData, teamsData, positionsData] = await Promise.all([
        nflPlayersService.getActivePlayers(nflSelectedPosition || undefined, nflSelectedTeam || undefined, nflPlayersPage, 20),
        nflPlayersService.getStats(),
        nflPlayersService.getAvailableTeams(),
        nflPlayersService.getAvailablePositions()
      ]);

      setNflPlayers(playersData.players);
      setNflPlayersTotal(playersData.pagination.totalCount);
      setNflPlayerStats(statsData);
      setNflAvailableTeams(teamsData);
      setNflAvailablePositions(positionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NFL players');
    } finally {
      setLoading(false);
    }
  };

  const loadMlbPlayers = async () => {
    try {
      setLoading(true);
      const [playersData, statsData, teamsData, positionsData] = await Promise.all([
        mlbPlayersService.getActivePlayers(mlbSelectedPosition || undefined, mlbSelectedTeam || undefined, mlbPlayersPage, 20),
        mlbPlayersService.getStats(),
        mlbPlayersService.getAvailableTeams(),
        mlbPlayersService.getAvailablePositions()
      ]);

      setMlbPlayers(playersData.players);
      setMlbPlayersTotal(playersData.pagination.totalCount);
      setMlbPlayerStats(statsData);
      setMlbAvailableTeams(teamsData);
      setMlbAvailablePositions(positionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MLB players');
    } finally {
      setLoading(false);
    }
  };

  const loadNbaPlayers = async () => {
    try {
      setLoading(true);
      const [playersData, statsData, teamsData, positionsData] = await Promise.all([
        nbaPlayersService.getActivePlayers(nbaSelectedPosition || undefined, nbaSelectedTeam || undefined, nbaPlayersPage, 20),
        nbaPlayersService.getStats(),
        nbaPlayersService.getAvailableTeams(),
        nbaPlayersService.getAvailablePositions()
      ]);

      setNbaPlayers(playersData.players);
      setNbaPlayersTotal(playersData.pagination.totalCount);
      setNbaPlayerStats(statsData);
      setNbaAvailableTeams(teamsData);
      setNbaAvailablePositions(positionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NBA players');
    } finally {
      setLoading(false);
    }
  };

  const syncNflPlayers = async () => {
    try {
      setSyncing(true);
      setError('');
      setSyncResult(null);
      
      const result = await nflPlayersService.syncNflPlayers();
      setSyncResult(result);
      
      if (result.success) {
        // Reload the data after successful sync
        loadNflPlayers();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync NFL players');
    } finally {
      setSyncing(false);
    }
  };

  const syncMlbPlayers = async () => {
    try {
      setMlbSyncing(true);
      setError('');
      setMlbSyncResult(null);
      
      const result = await mlbPlayersService.syncMlbPlayers();
      setMlbSyncResult(result);
      
      if (result.success) {
        // Reload the data after successful sync
        loadMlbPlayers();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync MLB players');
    } finally {
      setMlbSyncing(false);
    }
  };

  const syncNbaPlayers = async () => {
    try {
      setNbaSyncing(true);
      setError('');
      setNbaSyncResult(null);
      
      const result = await nbaPlayersService.syncNbaPlayers();
      setNbaSyncResult(result);
      
      if (result.success) {
        // Reload the data after successful sync
        loadNbaPlayers();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync NBA players');
    } finally {
      setNbaSyncing(false);
    }
  };

  const handleTabChange = (tab: 'dashboard' | 'leagues' | 'users' | 'nfl-players' | 'mlb-players' | 'nba-players') => {
    setActiveTab(tab);
    setError('');
    setSyncResult(null);
    
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
      case 'nfl-players':
        loadNflPlayers();
        break;
      case 'mlb-players':
        loadMlbPlayers();
        break;
      case 'nba-players':
        loadNbaPlayers();
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

  if (loading && !dashboardData && !leagues.length && !users.length) {
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
          className={activeTab === 'nfl-players' ? 'active' : ''}
          onClick={() => handleTabChange('nfl-players')}
        >
          🏈 NFL Players ({nflPlayers.length})
        </button>
        <button 
          className={activeTab === 'mlb-players' ? 'active' : ''}
          onClick={() => handleTabChange('mlb-players')}
        >
          ⚾ MLB Players ({mlbPlayers.length})
        </button>
        <button 
          className={activeTab === 'nba-players' ? 'active' : ''}
          onClick={() => handleTabChange('nba-players')}
        >
          🏀 NBA Players ({nbaPlayers.length})
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


        {/* NFL PLAYERS TAB */}
        {activeTab === 'nfl-players' && (
          <div className="nfl-players-management">
            <div className="section-header">
              <h2>🏈 NFL Players Database</h2>
              <p>Manage active NFL players for drafts - only QB, RB, WR, TE, K positions</p>
              
              <div className="nfl-controls">
                <button 
                  className={`sync-button ${syncing ? 'syncing' : ''}`}
                  onClick={syncNflPlayers}
                  disabled={syncing}
                >
                  {syncing ? '🔄 Syncing...' : '🔄 Sync from API'}
                </button>
              </div>
            </div>

            {syncResult && (
              <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
                <h3>{syncResult.success ? '✅ Sync Complete!' : '❌ Sync Failed'}</h3>
                <p>{syncResult.message}</p>
                {syncResult.success && (
                  <div className="sync-details">
                    <span>Added: {syncResult.playersAdded}</span>
                    <span>Updated: {syncResult.playersUpdated}</span>
                    <span>Removed: {syncResult.playersRemoved}</span>
                    <span>Total: {syncResult.totalValidPlayers}</span>
                  </div>
                )}
              </div>
            )}

            {nflPlayerStats && (
              <div className="nfl-stats-grid">
                <div className="stat-card">
                  <h3>Total Players</h3>
                  <div className="stat-number">{nflPlayerStats.totalPlayers}</div>
                </div>
                <div className="stat-card">
                  <h3>Teams</h3>
                  <div className="stat-number">{nflPlayerStats.totalTeams}</div>
                </div>
                <div className="stat-card">
                  <h3>Positions</h3>
                  <div className="stat-number">{nflPlayerStats.totalPositions}</div>
                </div>
                {Object.entries(nflPlayerStats.positionCounts || {}).map(([position, count]) => (
                  <div key={position} className="stat-card">
                    <h3>{position}</h3>
                    <div className="stat-number">{count}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="nfl-filters">
              <div className="filter-group">
                <label>Position:</label>
                <select 
                  value={nflSelectedPosition} 
                  onChange={(e) => {
                    setNflSelectedPosition(e.target.value);
                    setNflPlayersPage(1);
                  }}
                >
                  <option value="">All Positions</option>
                  {nflAvailablePositions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Team:</label>
                <select 
                  value={nflSelectedTeam} 
                  onChange={(e) => {
                    setNflSelectedTeam(e.target.value);
                    setNflPlayersPage(1);
                  }}
                >
                  <option value="">All Teams</option>
                  {nflAvailableTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <button 
                className="apply-filters-button"
                onClick={loadNflPlayers}
                disabled={loading}
              >
                Apply Filters
              </button>
            </div>

            <div className="nfl-players-table">
              <div className="table-header">
                <span>Name</span>
                <span>Position</span>
                <span>Team</span>
                <span>Age</span>
                <span>API ID</span>
                <span>Last Synced</span>
              </div>
              
              {nflPlayers.map(player => (
                <div key={player.id} className="table-row">
                  <span><strong>{player.fullName}</strong></span>
                  <span className={`position-badge ${player.fantasyPosition.toLowerCase()}`}>
                    {player.fantasyPosition}
                  </span>
                  <span>{player.team}</span>
                  <span>{player.age}</span>
                  <span>{player.playerID}</span>
                  <span>{new Date(player.lastSyncedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button 
                onClick={() => {
                  setNflPlayersPage(prev => Math.max(1, prev - 1));
                }}
                disabled={nflPlayersPage === 1 || loading}
              >
                ← Previous
              </button>
              <span>Page {nflPlayersPage} - Total: {nflPlayersTotal} players</span>
              <button 
                onClick={() => {
                  setNflPlayersPage(prev => prev + 1);
                }}
                disabled={nflPlayers.length < 20 || loading}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* MLB PLAYERS TAB */}
        {activeTab === 'mlb-players' && (
          <div className="mlb-players-management">
            <div className="section-header">
              <h2>⚾ MLB Players Database</h2>
              <p>Manage active MLB players for drafts - all positions</p>
              
              <div className="mlb-controls">
                <button 
                  className={`sync-button ${mlbSyncing ? 'syncing' : ''}`}
                  onClick={syncMlbPlayers}
                  disabled={mlbSyncing}
                >
                  {mlbSyncing ? '⏳ Syncing...' : '🔄 Sync Players'}
                </button>

                {mlbSyncResult && (
                  <div className={`sync-result ${mlbSyncResult.success ? 'success' : 'error'}`}>
                    <p>{mlbSyncResult.message}</p>
                    {mlbSyncResult.success && (
                      <div className="sync-stats">
                        <span>Added: {mlbSyncResult.playersAdded}</span>
                        <span>Updated: {mlbSyncResult.playersUpdated}</span>
                        <span>Removed: {mlbSyncResult.playersRemoved}</span>
                        <span>Total: {mlbSyncResult.totalValidPlayers}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {mlbPlayerStats && (
              <div className="stats-overview">
                <div className="stat-card">
                  <h4>Total Players</h4>
                  <span className="stat-number">{mlbPlayerStats.totalPlayers}</span>
                </div>
                <div className="stat-card">
                  <h4>Teams</h4>
                  <span className="stat-number">{mlbPlayerStats.totalTeams}</span>
                </div>
                <div className="stat-card">
                  <h4>Positions</h4>
                  <span className="stat-number">{mlbPlayerStats.totalPositions}</span>
                </div>
                <div className="stat-card">
                  <h4>Position Counts</h4>
                  <div className="position-counts">
                    {Object.entries(mlbPlayerStats.positionCounts || {}).map(([pos, count]) => (
                      <span key={pos} className="position-count">{pos}: {count}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mlb-filters">
              <div className="filter-group">
                <label>Position:</label>
                <select 
                  value={mlbSelectedPosition} 
                  onChange={(e) => {
                    setMlbSelectedPosition(e.target.value);
                    setMlbPlayersPage(1);
                  }}
                >
                  <option value="">All Positions</option>
                  {mlbAvailablePositions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Team:</label>
                <select 
                  value={mlbSelectedTeam} 
                  onChange={(e) => {
                    setMlbSelectedTeam(e.target.value);
                    setMlbPlayersPage(1);
                  }}
                >
                  <option value="">All Teams</option>
                  {mlbAvailableTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <button 
                className="apply-filters-button"
                onClick={loadMlbPlayers}
                disabled={loading}
              >
                🔍 Apply Filters
              </button>
            </div>

            <div className="mlb-players-table">
              <div className="table-header">
                <span>Name</span>
                <span>Position</span>
                <span>Team</span>
                <span>Age</span>
                <span>Birth Date</span>
                <span>Last Synced</span>
              </div>
              {mlbPlayers.map(player => (
                <div key={player.playerID} className="table-row">
                  <span className="player-name">
                    <strong>{player.fullName}</strong>
                  </span>
                  <span className="position">
                    <span className="position-badge position-mlb">{player.position}</span>
                  </span>
                  <span className="team">{player.team}</span>
                  <span className="age">{player.age}</span>
                  <span className="birth-date">{new Date(player.birthDate).toLocaleDateString()}</span>
                  <span className="last-synced">{new Date(player.lastSyncedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button 
                onClick={() => {
                  setMlbPlayersPage(prev => Math.max(1, prev - 1));
                }}
                disabled={mlbPlayersPage <= 1}
              >
                ← Previous
              </button>
              <span>Page {mlbPlayersPage} - Total Players: {mlbPlayersTotal}</span>
              <button 
                onClick={() => {
                  setMlbPlayersPage(prev => prev + 1);
                }}
                disabled={mlbPlayers.length < 20}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* NBA PLAYERS TAB */}
        {activeTab === 'nba-players' && (
          <div className="nba-players-management">
            <div className="section-header">
              <h2>🏀 NBA Players Database</h2>
              <p>Manage active NBA players for drafts - all positions</p>
              
              <div className="nba-controls">
                <button 
                  className={`sync-button ${nbaSyncing ? 'syncing' : ''}`}
                  onClick={syncNbaPlayers}
                  disabled={nbaSyncing}
                >
                  {nbaSyncing ? '🔄 Syncing...' : '🔄 Sync Players'}
                </button>

                {nbaSyncResult && (
                  <div className={`sync-result ${nbaSyncResult.success ? 'success' : 'error'}`}>
                    <p>{nbaSyncResult.message}</p>
                    {nbaSyncResult.success && (
                      <div className="sync-stats">
                        <span>Added: {nbaSyncResult.playersAdded}</span>
                        <span>Updated: {nbaSyncResult.playersUpdated}</span>
                        <span>Removed: {nbaSyncResult.playersRemoved}</span>
                        <span>Total: {nbaSyncResult.totalValidPlayers}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {nbaPlayerStats && (
              <div className="stats-overview nba-stats">
                <div className="stat-card">
                  <h4>Total Players</h4>
                  <span className="stat-number">{nbaPlayerStats.totalPlayers}</span>
                </div>
                <div className="stat-card">
                  <h4>Teams</h4>
                  <span className="stat-number">{nbaPlayerStats.totalTeams}</span>
                </div>
                <div className="stat-card">
                  <h4>Positions</h4>
                  <span className="stat-number">{nbaPlayerStats.totalPositions}</span>
                </div>
                <div className="stat-card">
                  <h4>Position Counts</h4>
                  <div className="position-counts">
                    {Object.entries(nbaPlayerStats.positionCounts || {}).map(([pos, count]) => (
                      <span key={pos} className="position-count">{pos}: {count}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="nba-filters">
              <div className="filter-group">
                <label>Position:</label>
                <select 
                  value={nbaSelectedPosition} 
                  onChange={(e) => {
                    setNbaSelectedPosition(e.target.value);
                    setNbaPlayersPage(1);
                  }}
                >
                  <option value="">All Positions</option>
                  {nbaAvailablePositions.map(position => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Team:</label>
                <select 
                  value={nbaSelectedTeam} 
                  onChange={(e) => {
                    setNbaSelectedTeam(e.target.value);
                    setNbaPlayersPage(1);
                  }}
                >
                  <option value="">All Teams</option>
                  {nbaAvailableTeams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <button 
                className="apply-filters-button"
                onClick={loadNbaPlayers}
                disabled={loading}
              >
                🏀 Apply Filters
              </button>
            </div>

            <div className="nba-players-table">
              <div className="table-header">
                <span>Name</span>
                <span>Position</span>
                <span>Team</span>
                <span>Age</span>
                <span>Birth Date</span>
                <span>Last Synced</span>
              </div>
              {nbaPlayers.map(player => (
                <div key={player.playerID} className="table-row">
                  <span className="player-name">
                    <strong>{player.fullName}</strong>
                  </span>
                  <span className="position">
                    <span className="position-badge position-nba">{player.position}</span>
                  </span>
                  <span className="team">{player.team}</span>
                  <span className="age">{player.age}</span>
                  <span className="birth-date">{new Date(player.birthDate).toLocaleDateString()}</span>
                  <span className="last-synced">{new Date(player.lastSyncedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button 
                onClick={() => {
                  setNbaPlayersPage(prev => Math.max(1, prev - 1));
                }}
                disabled={nbaPlayersPage <= 1}
              >
                ← Previous
              </button>
              <span>Page {nbaPlayersPage} - Total Players: {nbaPlayersTotal}</span>
              <button 
                onClick={() => {
                  setNbaPlayersPage(prev => prev + 1);
                }}
                disabled={nbaPlayers.length < 20}
              >
                Next →
              </button>
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