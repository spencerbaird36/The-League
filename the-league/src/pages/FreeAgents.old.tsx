import React from 'react';

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

interface FreeAgentsProps {
  user: User | null;
}

const FreeAgents: React.FC<FreeAgentsProps> = ({ user }) => {
  return (
    <div className="free-agents-container">
      <div className="page-header free-agents-header">
        <h1 className="page-title">Free Agents</h1>
        <p className="page-subtitle">Pick up available players to strengthen your team</p>
      </div>

      <div className="content">
        <p>Free Agents page is loading...</p>
        <p>User: {user?.firstName} {user?.lastName}</p>
        <p>League: {user?.league?.name}</p>
      </div>
    </div>
  );
};

export default FreeAgents;