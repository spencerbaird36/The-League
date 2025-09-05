import React from 'react';
import theLeagueLogo from '../assets/the_league.png';
import LeagueStandings from './LeagueStandings';
import RecentTransactions from './RecentTransactions';
import UpcomingMatchups from './UpcomingMatchups';
import { useDraft } from '../context/DraftContext';
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
  
  if (!user || !user.league) {
    return null;
  }

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