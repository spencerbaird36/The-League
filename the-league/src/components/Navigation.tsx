import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDraft } from '../context/DraftContext';
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
  createdAt: string;
  lastLoginAt?: string;
  league?: League;
}

interface NavigationProps {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  isAuthenticated, 
  user, 
  login, 
  logout 
}) => {
  const location = useLocation();
  const { state: draftState } = useDraft();
  const [showLoginForm, setShowLoginForm] = useState(false);
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
  };

  // Determine draft navigation text based on draft completion status
  const isDraftCompleted = draftState?.draftState?.isCompleted ?? false;
  const draftNavText = isDraftCompleted ? 'Draft Recap' : 'Draft Now';

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link 
          to="/" 
          className={`nav-logo ${isActive('/') ? 'active' : ''}`}
        >
          THE LEAGUE
        </Link>
        
        {isAuthenticated && user?.league && (
          <ul className="nav-menu">
            <li className="nav-item">
              <Link 
                to="/draft" 
                className={`nav-link ${isActive('/draft') ? 'active' : ''}`}
              >
                {draftNavText}
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/my-team" 
                className={`nav-link ${isActive('/my-team') ? 'active' : ''}`}
              >
                My Team
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/free-agents" 
                className={`nav-link ${isActive('/free-agents') ? 'active' : ''}`}
              >
                Free Agents
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/standings" 
                className={`nav-link ${isActive('/standings') ? 'active' : ''}`}
              >
                Standings
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/schedule" 
                className={`nav-link ${isActive('/schedule') ? 'active' : ''}`}
              >
                Schedule
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                to="/chat" 
                className={`nav-link ${isActive('/chat') ? 'active' : ''}`}
              >
                Chat
              </Link>
            </li>
          </ul>
        )}

        <div className="nav-auth">
          {isAuthenticated ? (
            <div className="auth-section">
              <span className="welcome-text">Welcome, {user?.firstName}!</span>
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
    </nav>
  );
};

export default Navigation;