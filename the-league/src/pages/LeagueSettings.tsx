import React, { useState, useEffect } from 'react';
import { apiRequest } from '../config/api';
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

  useEffect(() => {
    if (user?.league?.name) {
      setLeagueName(user.league.name);
      setOriginalLeagueName(user.league.name);
    }
  }, [user?.league?.name]);

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

        <div className="settings-section coming-soon">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">🏆</span>
              Scoring & Rules
            </h2>
            <p className="section-description">
              Configure league scoring system and game rules
            </p>
          </div>
          <div className="coming-soon-banner">
            <span className="banner-icon">🚧</span>
            <span>Coming Soon</span>
          </div>
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