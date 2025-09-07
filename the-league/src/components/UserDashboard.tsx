import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import theLeagueLogo from '../assets/the_league.png';
import LeagueStandings from './LeagueStandings';
import RecentTransactions from './RecentTransactions';
import UpcomingMatchups from './UpcomingMatchups';
import { useDraft } from '../context/DraftContext';
import { adminService } from '../services/adminService';
import { commissionerService, DraftStatus } from '../services/commissionerService';
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
  const [isCommissioner, setIsCommissioner] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [creatingDrafts, setCreatingDrafts] = useState(false);

  // Check commissioner status and draft status
  useEffect(() => {
    const checkCommissionerStatus = async () => {
      if (!user?.id || !user?.league?.id) return;

      try {
        const commissionerCheck = await commissionerService.isCommissioner(user.id, user.league.id);
        setIsCommissioner(commissionerCheck);

        // If user is commissioner, check draft status
        if (commissionerCheck) {
          const status = await commissionerService.getDraftStatus(user.league.id, user.id);
          setDraftStatus(status);
          
          // Show prompt if keeper draft is complete and regular drafts are pending
          if (status.shouldPromptForRegularDrafts) {
            setShowDraftPrompt(true);
          }
        }
      } catch (error) {
        console.error('Error checking commissioner/draft status:', error);
      }
    };

    checkCommissionerStatus();
  }, [user?.id, user?.league?.id]);

  if (!user || !user.league) {
    return null;
  }

  const isAdmin = adminService.isAdmin(user.email);

  const handleCreateAllDrafts = async () => {
    if (!user?.id || !user?.league?.id) return;

    setCreatingDrafts(true);
    try {
      await commissionerService.createAllRegularDrafts(user.league.id, user.id);
      
      // Refresh draft status
      const status = await commissionerService.getDraftStatus(user.league.id, user.id);
      setDraftStatus(status);
      setShowDraftPrompt(false);
      
      alert('Regular drafts created successfully! You can now start drafting for each sport.');
    } catch (error) {
      console.error('Error creating drafts:', error);
      alert('Failed to create drafts. Please try again.');
    } finally {
      setCreatingDrafts(false);
    }
  };

  const handleCreateSingleDraft = async (sportType: string) => {
    if (!user?.id || !user?.league?.id) return;

    setCreatingDrafts(true);
    try {
      await commissionerService.createRegularDraft(user.league.id, user.id, { sportType });
      
      // Refresh draft status
      const status = await commissionerService.getDraftStatus(user.league.id, user.id);
      setDraftStatus(status);
      
      // Hide prompt if no more drafts are pending
      if (!status.shouldPromptForRegularDrafts) {
        setShowDraftPrompt(false);
      }
      
      alert(`${sportType} draft created successfully!`);
    } catch (error) {
      console.error('Error creating draft:', error);
      alert(`Failed to create ${sportType} draft. Please try again.`);
    } finally {
      setCreatingDrafts(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="logo-container">
          <img src={theLeagueLogo} alt="The League" className="dashboard-main-logo" />
        </div>
        <h1 className="welcome-title">
          Welcome to <span className="league-name">{user!.league!.name}</span>
        </h1>
        <div className="user-status-container">
          <p className="welcome-subtitle">
            {user!.firstName}, here's your league overview
          </p>
          
          {isCommissioner && (
            <div className="commissioner-badge-container">
              <span className="commissioner-badge-main">
                👑 League Commissioner
              </span>
            </div>
          )}
        </div>
        
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
        
        {/* Draft Setup Prompt for Commissioner */}
        {showDraftPrompt && draftStatus && (
          <div className="draft-prompt-container">
            <div className="draft-prompt-overlay" onClick={() => setShowDraftPrompt(false)} />
            <div className="draft-prompt-modal">
              <div className="draft-prompt-header">
                <h3>🎯 Set Up Regular Drafts</h3>
                <button 
                  className="draft-prompt-close"
                  onClick={() => setShowDraftPrompt(false)}
                  disabled={creatingDrafts}
                >
                  ✖️
                </button>
              </div>
              
              <div className="draft-prompt-content">
                <p className="draft-prompt-message">{draftStatus.message}</p>
                
                <div className="pending-sports-list">
                  <h4>Pending Sports:</h4>
                  <ul>
                    {draftStatus.pendingSports.map(sport => (
                      <li key={sport} className="pending-sport-item">
                        <span>{sport}</span>
                        <button
                          className="create-single-draft-btn"
                          onClick={() => handleCreateSingleDraft(sport)}
                          disabled={creatingDrafts}
                        >
                          Create {sport} Draft
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="draft-prompt-actions">
                  <button
                    className="create-all-drafts-btn"
                    onClick={handleCreateAllDrafts}
                    disabled={creatingDrafts}
                  >
                    {creatingDrafts ? 'Creating...' : `Create All Drafts (${draftStatus.pendingSports.length})`}
                  </button>
                  
                  <button
                    className="draft-prompt-dismiss"
                    onClick={() => setShowDraftPrompt(false)}
                    disabled={creatingDrafts}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
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