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