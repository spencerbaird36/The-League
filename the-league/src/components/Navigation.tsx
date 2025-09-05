import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDraft } from '../context/DraftContext';
import OfflineIndicator from './OfflineIndicator';
import MyAccount from './MyAccount';
import './Navigation.css';

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
  teamLogo?: string;
  createdAt: string;
  lastLoginAt?: string;
  league?: League;
}

interface NavigationProps {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  onUserUpdate?: (updatedUser: User) => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  isAuthenticated, 
  user, 
  login, 
  logout,
  onUserUpdate
}) => {
  const location = useLocation();
  const { state: draftState } = useDraft();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = useState('');
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return path !== '/' && location.pathname.startsWith(path);
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const success = await login(loginData.username, loginData.password);
    if (success) {
      setShowLoginForm(false);
      setLoginData({ username: '', password: '' });
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleLogout = () => {
    logout();
    setShowLoginForm(false);
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Determine draft navigation text based on draft completion status
  const isDraftCompleted = draftState?.draftState?.isCompleted ?? false;
  const draftNavText = isDraftCompleted ? 'Draft Recap' : 'Draft Now';

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

  const handleUserUpdate = (updatedUser: User) => {
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link 
          to="/" 
          className={`nav-logo ${isActive('/') ? 'active' : ''}`}
          onClick={closeMobileMenu}
        >
          THE LEAGUE
        </Link>

        {/* Mobile menu button */}
        {isAuthenticated && user?.league && (
          <button 
            className={`mobile-menu-button ${mobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        )}
        
        {isAuthenticated && user?.league && (
          <ul className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li className="nav-item">
              <Link 
                to="/draft" 
                className={`nav-link ${isActive('/draft') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                {draftNavText}
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/my-team" 
                className={`nav-link ${isActive('/my-team') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                My Team
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/free-agents" 
                className={`nav-link ${isActive('/free-agents') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Free Agents
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/standings" 
                className={`nav-link ${isActive('/standings') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Standings
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/schedule" 
                className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Schedule
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/chat" 
                className={`nav-link ${isActive('/chat') ? 'active' : ''}`}
                onClick={closeMobileMenu}
              >
                Chat
              </Link>
            </li>
          </ul>
        )}

        <div className="nav-auth">
          <OfflineIndicator />
          {isAuthenticated ? (
            <div className="auth-section">
              <Link 
                to="/league-settings" 
                className={`settings-link ${isActive('/league-settings') ? 'active' : ''}`}
                onClick={closeMobileMenu}
                title="League Settings"
              >
                <span className="settings-icon">⚙️</span>
              </Link>
              <button 
                className="welcome-text clickable"
                onClick={() => setIsAccountModalOpen(true)}
                title="My Account"
              >
                {getUserLogo() && <span className="nav-user-logo">{getUserLogo()}</span>}
                Welcome, {user?.firstName}!
              </button>
              <button onClick={handleLogout} className="auth-button logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-section">
              {showLoginForm ? (
                <form onSubmit={handleLoginSubmit} className="login-form">
                  {loginError && <div className="login-error">{loginError}</div>}
                  <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={loginData.username}
                    onChange={handleLoginInputChange}
                    required
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={handleLoginInputChange}
                    required
                  />
                  <button type="submit" className="auth-button login-btn">
                    Login
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowLoginForm(false)}
                    className="auth-button cancel-btn"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button 
                  onClick={() => setShowLoginForm(true)}
                  className="auth-button login-btn"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && user && (
        <MyAccount
          user={user}
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </nav>
  );
};

export default Navigation;