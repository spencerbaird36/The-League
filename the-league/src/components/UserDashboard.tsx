import React from 'react';
import { useNavigate } from 'react-router-dom';
import theLeagueLogo from '../assets/the_league.png';
import LeagueStandings from './LeagueStandings';
import RecentTransactions from './RecentTransactions';
import UpcomingMatchups from './UpcomingMatchups';
import { useDraft } from '../context/DraftContext';
import { adminService } from '../services/adminService';
import './UserDashboard.css';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  teamLogo?: string;
  createdAt: string;
  lastLoginAt?: string;
  league?: {
    id: number;
    name: string;
    joinCode: string;
  };
}

interface UserDashboardProps {
  user: User | null;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const { state } = useDraft();
  const navigate = useNavigate();
  
  if (!user || !user.league) {
    return null;
  }

  const isAdmin = adminService.isAdmin(user.email);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="logo-container">
          <img src={theLeagueLogo} alt="The League" className="dashboard-main-logo" />
        </div>
        <h1 className="welcome-title">
          Welcome to <span className="league-name">{user.league.name}</span>
        </h1>
        <p className="welcome-subtitle">
          {user.firstName}, here's your league overview
        </p>
        
        {isAdmin && (
          <div className="admin-access">
            <button 
              className="admin-button"
              onClick={() => navigate('/admin-dashboard')}
              title="Access master admin dashboard"
            >
              🛠️ Admin Dashboard
            </button>
          </div>
        )}
      </div>

      <div className="dashboard-simple-grid">
        <LeagueStandings user={user} />
        <RecentTransactions user={user} refreshTrigger={state.draftResetTrigger} />
        <UpcomingMatchups user={user} />
      </div>
    </div>
  );
};

export default UserDashboard;