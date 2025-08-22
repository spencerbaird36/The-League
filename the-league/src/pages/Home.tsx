import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import theLeagueLogo from '../assets/the_league.png';
import UserDashboard from '../components/UserDashboard';
import './MyTeam.css';
import { apiRequest } from '../config/api';

const leagueStyles = `
  .main-logo {
    text-align: center;
    margin-bottom: 40px;
    z-index: 10;
    position: relative;
  }
  
  .the-league-logo {
    max-width: 500px;
    width: 90%;
    height: auto;
    filter: drop-shadow(0 8px 32px rgba(218, 165, 32, 0.4));
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    animation: logoFloat 6s ease-in-out infinite;
  }
  
  .the-league-logo:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 12px 48px rgba(218, 165, 32, 0.6));
  }
  
  @keyframes logoFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  
  @media (max-width: 768px) {
    .the-league-logo {
      max-width: 400px;
    }
  }
  
  @media (max-width: 480px) {
    .the-league-logo {
      max-width: 300px;
    }
  }
  
  .league-selection-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 60px 40px;
    color: var(--text-cream);
    background: linear-gradient(135deg, 
      rgba(30, 58, 95, 0.05) 0%, 
      rgba(42, 74, 107, 0.02) 100%
    );
    border-radius: 24px;
    backdrop-filter: blur(10px);
  }
  
  .league-selection-header {
    text-align: center;
    margin-bottom: 50px;
  }
  
  .league-selection-header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 20px;
    background: var(--gradient-gold);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 4px 8px rgba(30, 58, 95, 0.3);
    letter-spacing: -1px;
  }
  
  .league-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 40px;
  }
  
  @media (max-width: 768px) {
    .league-options {
      grid-template-columns: 1fr;
    }
  }
  
  .league-option {
    background: linear-gradient(135deg, 
      rgba(30, 58, 95, 0.9) 0%, 
      rgba(42, 74, 107, 0.8) 100%
    );
    padding: 40px;
    border-radius: 20px;
    border: 2px solid var(--border-light);
    text-align: center;
    backdrop-filter: blur(15px);
    box-shadow: var(--shadow-deep);
    transition: all 0.3s ease;
  }
  
  .league-option:hover {
    transform: translateY(-4px);
    border-color: var(--accent-gold);
    box-shadow: 0 20px 40px rgba(218, 165, 32, 0.15);
  }
  
  .league-option h3 {
    font-family: 'Poppins', sans-serif;
    color: var(--accent-gold);
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 16px;
    letter-spacing: -0.5px;
  }
  
  .league-option p {
    color: var(--text-cream);
    margin-bottom: 25px;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  
  .league-action-btn {
    background: var(--gradient-gold);
    color: var(--primary-navy);
    border: none;
    padding: 16px 32px;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: var(--shadow-premium);
    position: relative;
    overflow: hidden;
  }
  
  .league-action-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }
  
  .league-action-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 30px rgba(218, 165, 32, 0.4);
  }
  
  .league-action-btn:hover::before {
    left: 100%;
  }
  
  .league-form {
    margin-top: 20px;
    text-align: left;
  }
  
  .league-form .form-group {
    margin-bottom: 20px;
  }
  
  .league-form label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-white);
  }
  
  .league-form input,
  .league-form textarea,
  .league-form select {
    width: 100%;
    padding: 12px;
    background: var(--surface-dark);
    border: 1px solid var(--border-light);
    border-radius: 8px;
    color: var(--text-white);
    font-size: 1rem;
  }
  
  .league-form input:focus,
  .league-form textarea:focus,
  .league-form select:focus {
    outline: none;
    border-color: var(--accent-gold);
    box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
  }
  
  .form-buttons {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }
  
  .league-error {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 0.9rem;
  }
  
  .tab-navigation {
    display: flex;
    border-bottom: 2px solid var(--border-light);
    margin-bottom: 24px;
  }
  
  .tab-button {
    background: transparent;
    border: none;
    padding: 12px 20px;
    cursor: pointer;
    color: var(--accent-platinum);
    font-size: 1rem;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: all 0.3s ease;
  }
  
  .tab-button:hover {
    color: var(--accent-gold);
  }
  
  .tab-button.active {
    color: var(--accent-gold);
    border-bottom-color: var(--accent-gold);
  }
  
  .tab-content {
    min-height: 200px;
  }
  
  .tab-panel h3 {
    color: var(--accent-gold);
    margin-bottom: 16px;
  }
  
  .tab-panel ul {
    list-style: none;
    padding: 0;
  }
  
  .tab-panel li {
    padding: 8px 0;
    color: var(--accent-platinum);
  }
  
  .faq-item {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .faq-item:last-child {
    border-bottom: none;
  }
  
  .faq-item strong {
    color: var(--text-white);
    display: block;
    margin-bottom: 8px;
    font-size: 1.1rem;
  }
  
  .faq-item p {
    color: var(--accent-platinum);
    margin: 0;
    line-height: 1.5;
  }
  
  .join-option-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .join-option-buttons .league-action-btn.secondary {
    background: transparent;
    color: var(--accent-gold);
    border: 2px solid var(--accent-gold);
  }
  
  .join-option-buttons .league-action-btn.secondary:hover {
    background: var(--accent-gold);
    color: var(--primary-navy);
  }
  
  .available-leagues {
    text-align: left;
    margin-top: 20px;
  }
  
  .leagues-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 20px;
  }
  
  .league-item {
    background: var(--surface-dark);
    border: 1px solid var(--border-light);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: all 0.3s ease;
  }
  
  .league-item:hover {
    border-color: var(--accent-gold);
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.15);
  }
  
  .league-info {
    flex: 1;
    margin-right: 16px;
  }
  
  .league-info h4 {
    color: var(--text-white);
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .league-description {
    color: var(--accent-platinum);
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  .league-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .league-creator {
    color: var(--accent-platinum);
    font-size: 0.85rem;
  }
  
  .league-players {
    color: var(--accent-gold);
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .join-league-btn {
    background: var(--gradient-gold);
    color: var(--primary-navy);
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    min-width: 60px;
  }
  
  .join-league-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
  }
  
  .join-league-btn.disabled {
    background: #555;
    color: #888;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .join-league-btn.disabled:hover {
    transform: none;
    box-shadow: none;
  }
  
  @media (max-width: 768px) {
    .league-item {
      flex-direction: column;
      align-items: stretch;
    }
    
    .league-info {
      margin-right: 0;
      margin-bottom: 12px;
    }
    
    .join-option-buttons {
      flex-direction: column;
    }
  }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.innerText = leagueStyles;
document.head.appendChild(styleSheet);

interface League {
  id: number;
  name: string;
  joinCode: string;
}

interface AvailableLeague {
  id: number;
  name: string;
  description: string;
  maxPlayers: number;
  currentPlayers: number;
  createdBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  hasSpace: boolean;
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

interface HomeProps {
  registerAndLogin: (userData: User) => void;
  isAuthenticated: boolean;
  user: User | null;
  isDrafting: boolean;
  isPaused: boolean;
  timeRemaining: number;
  timeoutMessage: string;
  togglePause: () => void;
  timerStartTime: number | null;
}

const Home: React.FC<HomeProps> = ({ 
  registerAndLogin, 
  isAuthenticated, 
  user, 
  isDrafting,
  isPaused,
  timeRemaining,
  timeoutMessage,
  togglePause,
  timerStartTime
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const [successMessage, setSuccessMessage] = useState('');
  
  // League management state
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showJoinLeague, setShowJoinLeague] = useState(false);
  const [leagueFormData, setLeagueFormData] = useState({
    name: '',
    description: '',
    maxPlayers: 10,
    joinCode: ''
  });
  const [leagueError, setLeagueError] = useState('');
  
  // Available leagues state
  const [availableLeagues, setAvailableLeagues] = useState<AvailableLeague[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [showAvailableLeagues, setShowAvailableLeagues] = useState(false);
  
  // Tab state for the features section
  const [activeTab, setActiveTab] = useState<'how' | 'faq'>('how');

  // Home page doesn't need roster data

  // Home page helper functions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleLeagueInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLeagueFormData({
      ...leagueFormData,
      [e.target.name]: e.target.value
    });
  };
  const fetchAvailableLeagues = async () => {
    setLoadingLeagues(true);
    setLeagueError('');
    
    try {
      const response = await apiRequest('/api/leagues/available');
      if (response.ok) {
        const leagues = await response.json();
        setAvailableLeagues(leagues);
      } else {
        setLeagueError('Failed to load available leagues');
      }
    } catch (error) {
      console.error('Error fetching available leagues:', error);
      setLeagueError('Network error. Please try again later.');
    } finally {
      setLoadingLeagues(false);
    }
  };

  const joinLeagueById = async (leagueId: number) => {
    setLeagueError('');
    
    try {
      const response = await apiRequest(`/api/leagues/join-by-id?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leagueId: leagueId
        }),
      });

      if (response.ok) {
        const leagueData = await response.json();
        // Update user with new league info
        if (user) {
          const updatedUser = {
            ...user,
            league: {
              id: leagueData.id,
              name: leagueData.name,
              joinCode: leagueData.joinCode
            }
          };
          registerAndLogin(updatedUser);
        }
        setSuccessMessage(`Successfully joined league "${leagueData.name}"!`);
        setShowAvailableLeagues(false);
      } else {
        const errorData = await response.json();
        setLeagueError(errorData.message || 'Failed to join league');
      }
    } catch (error) {
      console.error('Error joining league:', error);
      setLeagueError('Network error. Please try again later.');
    }
  };

  const createLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeagueError('');
    
    try {
      const response = await apiRequest(`/api/leagues/create?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: leagueFormData.name,
          description: leagueFormData.description,
          maxPlayers: leagueFormData.maxPlayers
        }),
      });

      if (response.ok) {
        const leagueData = await response.json();
        // Update user with new league info
        if (user) {
          const updatedUser = {
            ...user,
            league: {
              id: leagueData.id,
              name: leagueData.name,
              joinCode: leagueData.joinCode
            }
          };
          registerAndLogin(updatedUser);
        }
        setSuccessMessage(`League "${leagueData.name}" created successfully! Join code: ${leagueData.joinCode}`);
        setShowCreateLeague(false);
      } else {
        const errorData = await response.json();
        setLeagueError(errorData.message || 'Failed to create league');
      }
    } catch (error) {
      console.error('Error creating league:', error);
      setLeagueError('Network error. Please try again later.');
    }
  };

  const joinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeagueError('');
    
    try {
      const response = await apiRequest(`/api/leagues/join?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode: leagueFormData.joinCode
        }),
      });

      if (response.ok) {
        const leagueData = await response.json();
        // Update user with new league info
        if (user) {
          const updatedUser = {
            ...user,
            league: {
              id: leagueData.id,
              name: leagueData.name,
              joinCode: leagueData.joinCode
            }
          };
          registerAndLogin(updatedUser);
        }
        setSuccessMessage(`Successfully joined league "${leagueData.name}"!`);
        setShowJoinLeague(false);
      } else {
        const errorData = await response.json();
        setLeagueError(errorData.message || 'Failed to join league');
      }
    } catch (error) {
      console.error('Error joining league:', error);
      setLeagueError('Network error. Please try again later.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await apiRequest('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          firstName: formData.firstName,
          lastName: formData.lastName
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setSuccessMessage(`Welcome to The League, ${userData.firstName} ${userData.lastName}! Your account has been successfully created.`);
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: ''
        });
        
        // Auto-login the user after successful registration
        registerAndLogin(userData);
      } else {
        const errorData = await response.json();
        console.error('Registration failed:', errorData);
        
        // Extract error messages from the response
        let errorMessage = 'Registration failed. ';
        if (errorData.message) {
          errorMessage += errorData.message;
        } else if (errorData.errors) {
          const errors = Object.values(errorData.errors).flat();
          errorMessage += errors.join('. ');
        } else {
          errorMessage += 'Please try again.';
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Network error. Please try again later.');
    }
  };

  if (isAuthenticated) {
    if (!user?.league) {
      // Authenticated user but no league - show league selection
      return (
        <div className="league-selection-container">
          <div className="league-selection-header">
            <h1>Welcome, {user?.firstName}!</h1>
            <p>To get started, you need to join or create a fantasy league.</p>
            
            {successMessage && (
              <div style={{ 
                padding: '15px', 
                marginBottom: '20px', 
                backgroundColor: '#d4edda', 
                color: '#155724', 
                border: '1px solid #c3e6cb', 
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                {successMessage}
              </div>
            )}
          </div>

          <div className="league-options">
            <div className="league-option">
              <h3>Join Existing League</h3>
              <p>Browse available leagues or join with an invite code</p>
              
              {!showJoinLeague && !showAvailableLeagues ? (
                <div className="join-option-buttons">
                  <button 
                    onClick={() => {
                      setShowAvailableLeagues(true); 
                      setShowCreateLeague(false);
                      fetchAvailableLeagues();
                    }}
                    className="league-action-btn"
                  >
                    Browse Leagues
                  </button>
                  <button 
                    onClick={() => {setShowJoinLeague(true); setShowCreateLeague(false); setShowAvailableLeagues(false);}}
                    className="league-action-btn secondary"
                  >
                    Join by Code
                  </button>
                </div>
              ) : showJoinLeague ? (
                <form onSubmit={joinLeague} className="league-form">
                  {leagueError && <div className="league-error">{leagueError}</div>}
                  <div className="form-group">
                    <label htmlFor="joinCode">League Join Code</label>
                    <input
                      type="text"
                      id="joinCode"
                      name="joinCode"
                      value={leagueFormData.joinCode}
                      onChange={handleLeagueInputChange}
                      required
                      placeholder="Enter join code"
                      style={{textTransform: 'uppercase'}}
                    />
                  </div>
                  <div className="form-buttons">
                    <button type="submit" className="league-action-btn">Join League</button>
                    <button 
                      type="button" 
                      onClick={() => setShowJoinLeague(false)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : showAvailableLeagues ? (
                <div className="available-leagues">
                  {leagueError && <div className="league-error">{leagueError}</div>}
                  {loadingLeagues ? (
                    <p>Loading available leagues...</p>
                  ) : availableLeagues.length > 0 ? (
                    <div className="leagues-list">
                      {availableLeagues.map((league) => (
                        <div key={league.id} className="league-item">
                          <div className="league-info">
                            <h4>{league.name}</h4>
                            {league.description && <p className="league-description">{league.description}</p>}
                            <div className="league-meta">
                              <span className="league-creator">Created by {league.createdBy.firstName} {league.createdBy.lastName}</span>
                              <span className="league-players">{league.currentPlayers}/{league.maxPlayers} players</span>
                            </div>
                          </div>
                          <button
                            onClick={() => joinLeagueById(league.id)}
                            className={`join-league-btn ${!league.hasSpace ? 'disabled' : ''}`}
                            disabled={!league.hasSpace}
                          >
                            {league.hasSpace ? 'Join' : 'Full'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No available leagues found. Create one or join with a code!</p>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setShowAvailableLeagues(false)}
                    className="cancel-btn"
                  >
                    Back
                  </button>
                </div>
              ) : null}
            </div>

            <div className="league-option">
              <h3>Create New League</h3>
              <p>Start your own league and invite friends!</p>
              {!showCreateLeague ? (
                <button 
                  onClick={() => {setShowCreateLeague(true); setShowJoinLeague(false);}}
                  className="league-action-btn"
                >
                  Create League
                </button>
              ) : (
                <form onSubmit={createLeague} className="league-form">
                  {leagueError && <div className="league-error">{leagueError}</div>}
                  <div className="form-group">
                    <label htmlFor="name">League Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={leagueFormData.name}
                      onChange={handleLeagueInputChange}
                      required
                      placeholder="Enter league name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="description">Description (Optional)</label>
                    <textarea
                      id="description"
                      name="description"
                      value={leagueFormData.description}
                      onChange={handleLeagueInputChange}
                      placeholder="Describe your league..."
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="maxPlayers">Max Players</label>
                    <select
                      id="maxPlayers"
                      name="maxPlayers"
                      value={leagueFormData.maxPlayers}
                      onChange={(e) => setLeagueFormData({...leagueFormData, maxPlayers: parseInt(e.target.value)})}
                    >
                      {[4,6,8,10,12,14,16].map(num => (
                        <option key={num} value={num}>{num} players</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-buttons">
                    <button type="submit" className="league-action-btn">Create League</button>
                    <button 
                      type="button" 
                      onClick={() => setShowCreateLeague(false)}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // Authenticated user with league - show dashboard
    return <UserDashboard user={user} />;
  }

  // Unauthenticated user - show registration form
  return (
    <>
      <div className="hero-section">
        <div className="main-logo">
          <img src={theLeagueLogo} alt="The League" className="the-league-logo" />
        </div>
        <div className="sports-icons">
          <img src="https://1000logos.net/wp-content/uploads/2017/05/NFL-logo-500x338.png" alt="NFL Logo" className="league-logo" />
          <img src="https://loodibee.com/wp-content/uploads/Major_League_Baseball_MLB_transparent_logo.png" alt="MLB Logo" className="league-logo" />
          <img src="https://loodibee.com/wp-content/uploads/nba-logo-transparent.png" alt="NBA Logo" className="league-logo" />
        </div>
        <p className="subtitle">Join the Ultimate Fantasy Sports Experience</p>
      </div>

      <div className="signup-container">
        <div className="signup-form">
          <h2>Sign Up Now</h2>
          {successMessage && (
            <div style={{ 
              padding: '15px', 
              marginBottom: '20px', 
              backgroundColor: '#d4edda', 
              color: '#155724', 
              border: '1px solid #c3e6cb', 
              borderRadius: '5px',
              fontWeight: 'bold'
            }}>
              {successMessage}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Choose a username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                placeholder="Enter your first name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                placeholder="Enter your last name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Create a password"
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your password"
              />
            </div>

            <button type="submit" className="signup-btn">
              Join The League
            </button>
          </form>
        </div>

        <div className="features">
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'how' ? 'active' : ''}`}
              onClick={() => setActiveTab('how')}
            >
              How it Works
            </button>
            <button 
              className={`tab-button ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              FAQ
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'how' && (
              <div className="tab-panel">
                <h3>How it Works</h3>
                <ul>
                  <li>📝 Create or join a league with friends</li>
                  <li>🏀 Draft players from NFL, MLB, and NBA</li>
                  <li>⚡ Use our smart auto-draft feature</li>
                  <li>📈 Track performance with real-time stats</li>
                  <li>🏁 Compete for the championship</li>
                </ul>
              </div>
            )}
            
            {activeTab === 'faq' && (
              <div className="tab-panel">
                <h3>Frequently Asked Questions</h3>
                <div className="faq-item">
                  <strong>How many players can join a league?</strong>
                  <p>Leagues can have between 4-16 players depending on your settings.</p>
                </div>
                <div className="faq-item">
                  <strong>Can I draft from multiple sports?</strong>
                  <p>Yes! Our unique multi-sport format lets you draft from NFL, MLB, and NBA.</p>
                </div>
                <div className="faq-item">
                  <strong>What if I miss the draft?</strong>
                  <p>Our smart auto-draft will build a competitive team for you automatically.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;