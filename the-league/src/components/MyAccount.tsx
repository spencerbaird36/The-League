import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../config/api';
import './MyAccount.css';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  teamLogo?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface MyAccountProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (updatedUser: User) => void;
}

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

const MyAccount: React.FC<MyAccountProps> = ({ user, isOpen, onClose, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    teamLogo: user.teamLogo || ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const resetMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      const response = await apiRequest(`/api/users/${user.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setSuccess('Profile updated successfully!');
        onUserUpdate({ ...user, ...updatedUser });
        
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      setIsLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        })
      });

      if (response.ok) {
        setSuccess('Password updated successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update password');
      }
    } catch (err) {
      setError('Failed to update password');
      console.error('Password update error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
    resetMessages();
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    resetMessages();
  };

  const handleLogoSelect = (logoId: string) => {
    setProfileForm(prev => ({
      ...prev,
      teamLogo: logoId
    }));
    resetMessages();
  };

  const getSelectedLogo = () => {
    return TEAM_LOGOS.find(logo => logo.id === profileForm.teamLogo);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="account-modal-overlay" onClick={onClose}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <h2>My Account</h2>
          <button className="account-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="account-tabs">
          <button
            className={`account-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`account-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Password
          </button>
        </div>

        <div className="account-content">
          {error && <div className="account-error">{error}</div>}
          {success && <div className="account-success">{success}</div>}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="account-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={profileForm.username}
                  onChange={handleProfileInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileForm.firstName}
                    onChange={handleProfileInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileForm.lastName}
                    onChange={handleProfileInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Team Logo</label>
                <div className="selected-logo">
                  {getSelectedLogo() && (
                    <div className="logo-display">
                      <span className="logo-emoji">{getSelectedLogo()?.emoji}</span>
                      <span className="logo-name">{getSelectedLogo()?.name}</span>
                    </div>
                  )}
                  {!getSelectedLogo() && (
                    <div className="no-logo">No logo selected</div>
                  )}
                </div>
                <div className="logo-grid">
                  {TEAM_LOGOS.map((logo) => (
                    <button
                      key={logo.id}
                      type="button"
                      className={`logo-option ${profileForm.teamLogo === logo.id ? 'selected' : ''}`}
                      onClick={() => handleLogoSelect(logo.id)}
                      title={logo.name}
                    >
                      <span className="logo-emoji">{logo.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="account-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="account-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordInputChange}
                  required
                  minLength={6}
                />
                <small className="form-help">Minimum 6 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordInputChange}
                  required
                  minLength={6}
                />
              </div>

              <button 
                type="submit" 
                className="account-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MyAccount;