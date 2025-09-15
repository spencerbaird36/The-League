import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
import ScoringSettingsSection from '../components/ScoringSettingsSection';
import { commissionerService, CommissionerLeague } from '../services/commissionerService';
import './LeagueSettings.css';

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
}

interface LeagueConfiguration {
  id: number;
  leagueId: number;
  includeNFL: boolean;
  includeMLB: boolean;
  includeNBA: boolean;
  totalKeeperSlots: number;
  keepersPerSport: number;
  isKeeperLeague: boolean;
  maxPlayersPerTeam: number;
  selectedSports: string[];
}

interface LeagueSettingsProps {
  user: User | null;
  onLeagueNameUpdate?: (newName: string) => void;
}

const LeagueSettings: React.FC<LeagueSettingsProps> = ({ user, onLeagueNameUpdate }) => {
  const [leagueName, setLeagueName] = useState(user?.league?.name || '');
  const [originalLeagueName, setOriginalLeagueName] = useState(user?.league?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Commissioner-specific state
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [commissionerData, setCommissionerData] = useState<CommissionerLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // League configuration state
  const [leagueConfig, setLeagueConfig] = useState<LeagueConfiguration | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configEditing, setConfigEditing] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [tempConfig, setTempConfig] = useState<Partial<LeagueConfiguration>>({});

  useEffect(() => {
    if (user?.league?.name) {
      setLeagueName(user.league.name);
      setOriginalLeagueName(user.league.name);
    }
  }, [user?.league?.name]);

  // Check commissioner status and load data
  useEffect(() => {
    const checkCommissionerStatus = async () => {
      if (!user?.id || !user?.league?.id) {
        setLoading(false);
        return;
      }

      try {
        const commissionerCheck = await commissionerService.isCommissioner(user.id, user.league.id);
        setIsCommissioner(commissionerCheck);

        if (commissionerCheck) {
          const data = await commissionerService.getLeagueForCommissioner(user.league.id, user.id);
          setCommissionerData(data);
        }
      } catch (error) {
        console.error('Error checking commissioner status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCommissionerStatus();
  }, [user?.id, user?.league?.id]);

  // Load league configuration
  useEffect(() => {
    const loadLeagueConfiguration = async () => {
      if (!user?.league?.id) return;

      setConfigLoading(true);
      try {
        const response = await apiRequest(`/api/leagues/${user.league.id}/configuration`);
        if (response.ok) {
          const config = await response.json();
          setLeagueConfig(config);
        }
      } catch (error) {
        console.error('Error loading league configuration:', error);
      } finally {
        setConfigLoading(false);
      }
    };

    loadLeagueConfiguration();
  }, [user?.league?.id]);

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveMessage(null);
  };

  const handleCancelEdit = () => {
    setLeagueName(originalLeagueName);
    setIsEditing(false);
    setSaveMessage(null);
  };

  const handleSaveLeagueName = async () => {
    if (!user?.league?.id || !leagueName.trim()) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await apiRequest(`/api/leagues/${user.league.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: leagueName.trim(),
        }),
      });

      if (response.ok) {
        setOriginalLeagueName(leagueName.trim());
        setIsEditing(false);
        setSaveMessage({
          type: 'success',
          text: 'League name updated successfully!'
        });
        
        // Notify parent component about the name change
        if (onLeagueNameUpdate) {
          onLeagueNameUpdate(leagueName.trim());
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage({
          type: 'error',
          text: errorData.message || 'Failed to update league name'
        });
      }
    } catch (error) {
      console.error('Error updating league name:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while updating the league name'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = leagueName.trim() !== originalLeagueName;

  // Configuration handling functions
  const handleConfigEdit = () => {
    if (!leagueConfig) return;

    setTempConfig({
      includeNFL: leagueConfig.includeNFL,
      includeMLB: leagueConfig.includeMLB,
      includeNBA: leagueConfig.includeNBA,
      totalKeeperSlots: leagueConfig.totalKeeperSlots,
      isKeeperLeague: leagueConfig.isKeeperLeague,
      maxPlayersPerTeam: leagueConfig.maxPlayersPerTeam
    });
    setConfigEditing(true);
    setSaveMessage(null);
  };

  const handleConfigCancel = () => {
    setTempConfig({});
    setConfigEditing(false);
    setSaveMessage(null);
  };

  const handleConfigSave = async () => {
    if (!user?.league?.id || !tempConfig) return;

    // Basic validation
    const sportsSelected = [tempConfig.includeNFL, tempConfig.includeMLB, tempConfig.includeNBA].filter(Boolean).length;
    if (sportsSelected === 0) {
      setSaveMessage({
        type: 'error',
        text: 'You must select at least one sport'
      });
      return;
    }

    if (tempConfig.totalKeeperSlots && tempConfig.totalKeeperSlots % sportsSelected !== 0) {
      setSaveMessage({
        type: 'error',
        text: `Total keeper slots (${tempConfig.totalKeeperSlots}) must be evenly divisible by number of selected sports (${sportsSelected})`
      });
      return;
    }

    setConfigSaving(true);
    setSaveMessage(null);

    try {
      const response = await apiRequest(`/api/leagues/${user.league.id}/configuration`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tempConfig),
      });

      if (response.ok) {
        const updatedConfig = await response.json();
        setLeagueConfig(updatedConfig);
        setConfigEditing(false);
        setTempConfig({});
        setSaveMessage({
          type: 'success',
          text: 'League configuration updated successfully!'
        });

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage({
          type: 'error',
          text: errorData.message || 'Failed to update league configuration'
        });
      }
    } catch (error) {
      console.error('Error updating league configuration:', error);
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while updating the configuration'
      });
    } finally {
      setConfigSaving(false);
    }
  };

  const updateTempConfig = (field: keyof LeagueConfiguration, value: any) => {
    setTempConfig(prev => ({ ...prev, [field]: value }));
  };

  const getConfigValue = (field: keyof LeagueConfiguration) => {
    return configEditing ? tempConfig[field] : leagueConfig?.[field];
  };

  const hasConfigChanges = configEditing && Object.keys(tempConfig).some(key =>
    tempConfig[key as keyof LeagueConfiguration] !== leagueConfig?.[key as keyof LeagueConfiguration]
  );

  // Commissioner functions
  const handleInviteUser = async () => {
    if (!user?.league?.id || !inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await commissionerService.inviteUser(user.league.id, user.id, { email: inviteEmail.trim() });
      setInviteEmail('');
      setSaveMessage({
        type: 'success',
        text: 'User invited successfully!'
      });

      // Refresh commissioner data
      if (isCommissioner) {
        const data = await commissionerService.getLeagueForCommissioner(user.league.id, user.id);
        setCommissionerData(data);
      }

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to invite user'
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveUser = async (targetUserId: number) => {
    if (!user?.league?.id || !window.confirm('Are you sure you want to remove this user from the league?')) {
      return;
    }

    try {
      await commissionerService.removeUser(user.league.id, user.id, targetUserId);
      setSaveMessage({
        type: 'success',
        text: 'User removed successfully!'
      });

      // Refresh commissioner data
      if (isCommissioner) {
        const data = await commissionerService.getLeagueForCommissioner(user.league.id, user.id);
        setCommissionerData(data);
      }

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove user'
      });
    }
  };

  if (!user?.league) {
    return (
      <div className="league-settings-container">
        <div className="settings-error">
          <h2>Settings Unavailable</h2>
          <p>You must be part of a league to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="league-settings-container">
      <div className="settings-header">
        <h1 className="settings-title">League Settings</h1>
        <p className="settings-subtitle">Manage your league configuration and preferences</p>
      </div>

      <div className="settings-content">
        {/* League Name Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">⚙️</span>
              League Information
            </h2>
            <p className="section-description">
              Basic league details and identification
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-label-group">
              <label className="setting-label">League Name</label>
              <p className="setting-help">
                The name displayed throughout the application for your league
              </p>
            </div>

            <div className="setting-control">
              {isEditing ? (
                <div className="edit-control">
                  <input
                    type="text"
                    value={leagueName}
                    onChange={(e) => setLeagueName(e.target.value)}
                    className="league-name-input"
                    placeholder="Enter league name"
                    maxLength={50}
                    disabled={isSaving}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button
                      onClick={handleSaveLeagueName}
                      disabled={!hasChanges || !leagueName.trim() || isSaving}
                      className="save-btn"
                    >
                      {isSaving ? (
                        <>
                          <span className="spinner"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">💾</span>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="display-control">
                  <div className="current-value">
                    <span className="league-name-display">{originalLeagueName}</span>
                    <span className="league-code">#{user.league.joinCode}</span>
                  </div>
                  <button onClick={handleEditClick} className="edit-btn">
                    <span className="btn-icon">✏️</span>
                    Edit Name
                  </button>
                </div>
              )}
            </div>
          </div>

          {saveMessage && (
            <div className={`save-message ${saveMessage.type}`}>
              <span className="message-icon">
                {saveMessage.type === 'success' ? '✅' : '❌'}
              </span>
              {saveMessage.text}
            </div>
          )}
        </div>

        {/* Commissioner Management Section */}
        {isCommissioner && commissionerData && (
          <div className="settings-section">
            <div className="section-header">
              <h2 className="section-title">
                <span className="section-icon">👑</span>
                Commissioner Controls
              </h2>
              <p className="section-description">
                Manage league members and settings (Commissioner Only)
              </p>
            </div>

            {/* League Members */}
            <div className="setting-item">
              <div className="setting-label-group">
                <label className="setting-label">League Members ({commissionerData.userCount}/{commissionerData.maxPlayers})</label>
                <p className="setting-help">
                  Current members in your league
                </p>
              </div>

              <div className="members-list">
                {commissionerData.users.map((member) => (
                  <div key={member.id} className="member-item">
                    <div className="member-info">
                      <span className="member-name">
                        {member.firstName} {member.lastName} ({member.username})
                      </span>
                      <span className="member-email">{member.email}</span>
                      {member.id === commissionerData.commissioner?.id && (
                        <span className="commissioner-badge">👑 Commissioner</span>
                      )}
                    </div>
                    {member.id !== user.id && (
                      <button
                        onClick={() => handleRemoveUser(member.id)}
                        className="remove-user-btn"
                        title="Remove user from league"
                      >
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invite New Member */}
            {commissionerData.userCount < commissionerData.maxPlayers && (
              <div className="setting-item">
                <div className="setting-label-group">
                  <label className="setting-label">Invite New Member</label>
                  <p className="setting-help">
                    Enter the email address of the user you want to invite to your league
                  </p>
                </div>

                <div className="setting-control">
                  <div className="invite-control">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="invite-email-input"
                      placeholder="Enter email address"
                      disabled={isInviting}
                    />
                    <button
                      onClick={handleInviteUser}
                      disabled={!inviteEmail.trim() || isInviting}
                      className="invite-btn"
                    >
                      {isInviting ? (
                        <>
                          <span className="spinner"></span>
                          Inviting...
                        </>
                      ) : (
                        <>
                          <span className="btn-icon">📨</span>
                          Send Invite
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sports Configuration Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">🏈</span>
              Sports Configuration
            </h2>
            <p className="section-description">
              Select which sports leagues are included in your fantasy league
            </p>
          </div>

          {configLoading ? (
            <div className="loading-message">Loading configuration...</div>
          ) : leagueConfig ? (
            <>
              {/* Sports Selection */}
              <div className="setting-item">
                <div className="setting-label-group">
                  <label className="setting-label">Included Sports</label>
                  <p className="setting-help">
                    Choose which sports are included in your league. Keeper slots will be distributed evenly across selected sports.
                  </p>
                </div>

                <div className="setting-control">
                  {configEditing ? (
                    <div className="sports-selection">
                      <div className="sports-checkboxes">
                        <label className="sport-checkbox">
                          <input
                            type="checkbox"
                            checked={!!getConfigValue('includeNFL')}
                            onChange={(e) => updateTempConfig('includeNFL', e.target.checked)}
                            disabled={configSaving}
                          />
                          <span className="sport-icon">🏈</span>
                          <span className="sport-name">NFL</span>
                        </label>
                        <label className="sport-checkbox">
                          <input
                            type="checkbox"
                            checked={!!getConfigValue('includeMLB')}
                            onChange={(e) => updateTempConfig('includeMLB', e.target.checked)}
                            disabled={configSaving}
                          />
                          <span className="sport-icon">⚾</span>
                          <span className="sport-name">MLB</span>
                        </label>
                        <label className="sport-checkbox">
                          <input
                            type="checkbox"
                            checked={!!getConfigValue('includeNBA')}
                            onChange={(e) => updateTempConfig('includeNBA', e.target.checked)}
                            disabled={configSaving}
                          />
                          <span className="sport-icon">🏀</span>
                          <span className="sport-name">NBA</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="sports-display">
                      <div className="selected-sports">
                        {leagueConfig.selectedSports.map((sport) => (
                          <span key={sport} className="sport-badge">
                            <span className="sport-icon">
                              {sport === 'NFL' ? '🏈' : sport === 'MLB' ? '⚾' : '🏀'}
                            </span>
                            {sport}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Keeper Configuration */}
              <div className="setting-item">
                <div className="setting-label-group">
                  <label className="setting-label">Keeper Configuration</label>
                  <p className="setting-help">
                    Configure keeper league settings and roster sizes
                  </p>
                </div>

                <div className="setting-control">
                  {configEditing ? (
                    <div className="keeper-config">
                      <div className="config-row">
                        <label className="config-label">
                          <input
                            type="checkbox"
                            checked={!!getConfigValue('isKeeperLeague')}
                            onChange={(e) => updateTempConfig('isKeeperLeague', e.target.checked)}
                            disabled={configSaving}
                          />
                          Enable Keeper League
                        </label>
                      </div>

                      {getConfigValue('isKeeperLeague') && (
                        <div className="config-row">
                          <label className="config-label">
                            Total Keeper Slots:
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={getConfigValue('totalKeeperSlots') || ''}
                              onChange={(e) => updateTempConfig('totalKeeperSlots', parseInt(e.target.value))}
                              disabled={configSaving}
                              className="number-input"
                            />
                          </label>
                          <span className="keeper-info">
                            ({Math.floor((getConfigValue('totalKeeperSlots') || 0) / Math.max(1, [tempConfig.includeNFL, tempConfig.includeMLB, tempConfig.includeNBA].filter(Boolean).length))} per sport)
                          </span>
                        </div>
                      )}

                      <div className="config-row">
                        <label className="config-label">
                          Max Players Per Team:
                          <input
                            type="number"
                            min="10"
                            max="50"
                            value={getConfigValue('maxPlayersPerTeam') || ''}
                            onChange={(e) => updateTempConfig('maxPlayersPerTeam', parseInt(e.target.value))}
                            disabled={configSaving}
                            className="number-input"
                          />
                        </label>
                      </div>

                      <div className="edit-actions">
                        <button
                          onClick={handleConfigSave}
                          disabled={!hasConfigChanges || configSaving}
                          className="save-btn"
                        >
                          {configSaving ? (
                            <>
                              <span className="spinner"></span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <span className="btn-icon">💾</span>
                              Save Configuration
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleConfigCancel}
                          disabled={configSaving}
                          className="cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="keeper-display">
                      <div className="config-summary">
                        <div className="summary-item">
                          <span className="summary-label">League Type:</span>
                          <span className="summary-value">
                            {leagueConfig.isKeeperLeague ? 'Keeper League' : 'Redraft League'}
                          </span>
                        </div>
                        {leagueConfig.isKeeperLeague && (
                          <>
                            <div className="summary-item">
                              <span className="summary-label">Total Keepers:</span>
                              <span className="summary-value">{leagueConfig.totalKeeperSlots}</span>
                            </div>
                            <div className="summary-item">
                              <span className="summary-label">Keepers Per Sport:</span>
                              <span className="summary-value">{leagueConfig.keepersPerSport}</span>
                            </div>
                          </>
                        )}
                        <div className="summary-item">
                          <span className="summary-label">Max Roster Size:</span>
                          <span className="summary-value">{leagueConfig.maxPlayersPerTeam}</span>
                        </div>
                      </div>
                      <button onClick={handleConfigEdit} className="edit-btn">
                        <span className="btn-icon">✏️</span>
                        Edit Configuration
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="error-message">Failed to load league configuration</div>
          )}
        </div>

        {/* Future Settings Sections */}
        <div className="settings-section coming-soon">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">🔒</span>
              Privacy & Access
            </h2>
            <p className="section-description">
              Control who can join and view your league
            </p>
          </div>
          <div className="coming-soon-banner">
            <span className="banner-icon">🚧</span>
            <span>Coming Soon</span>
          </div>
        </div>

        {/* Scoring Settings Section */}
        <div className="settings-section">
          <ScoringSettingsSection 
            leagueId={user.league.id}
            onSave={(settings) => {
              console.log('Scoring settings saved:', settings);
            }}
          />
        </div>

        <div className="settings-section coming-soon">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">📊</span>
              Draft Settings
            </h2>
            <p className="section-description">
              Manage draft order, timing, and automation preferences
            </p>
          </div>
          <div className="coming-soon-banner">
            <span className="banner-icon">🚧</span>
            <span>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeagueSettings;