import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { TradeProposal } from '../types/Trade';
import { tradeProposalService } from '../services/tradeProposalService';
import signalRService from '../services/signalRService';
import './TradeNotifications.css';

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

interface TradeNotificationsProps {
  user: User;
  onTradeUpdate?: () => void;
  refreshTrigger?: number;
}

const TradeNotifications: React.FC<TradeNotificationsProps> = ({ user, onTradeUpdate, refreshTrigger }) => {
  const [tradesIProposed, setTradesIProposed] = useState<TradeProposal[]>([]);
  const [tradesOfferedToMe, setTradesOfferedToMe] = useState<TradeProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const loadTradeData = useCallback(async () => {
    if (!user.id) return;

    try {
      console.log('📊 Loading active trade data for user:', user.id);
      const [proposedData, receivedData] = await Promise.all([
        tradeProposalService.getPendingTradesProposed(user.id),
        tradeProposalService.getPendingTradesReceived(user.id)
      ]);

      console.log('📊 Loaded - Proposed:', proposedData.length, 'Received:', receivedData.length);
      
      setTradesIProposed(proposedData);
      setTradesOfferedToMe(receivedData);
    } catch (error) {
      console.error('Error loading trade data:', error);
    }
  }, [user.id]);

  useEffect(() => {
    if (user.id) {
      loadTradeData();
      
      // Set up SignalR listeners for real-time trade notifications
      const handleTradeProposalReceived = (data: any) => {
        console.log('🤝 Received trade proposal via SignalR:', data);
        loadTradeData(); // Refresh the data when a new trade is received
      };

      const handleTradeProposalAccepted = (data: any) => {
        console.log('✅ Trade proposal accepted via SignalR:', data);
        loadTradeData(); // Refresh the data when a trade is accepted
      };

      const handleTradeProposalRejected = (data: any) => {
        console.log('❌ Trade proposal rejected via SignalR:', data);
        loadTradeData(); // Refresh the data when a trade is rejected
      };

      // Register SignalR event handlers
      signalRService.onTradeProposalReceived(handleTradeProposalReceived);
      signalRService.onTradeProposalAccepted(handleTradeProposalAccepted);
      signalRService.onTradeProposalRejected(handleTradeProposalRejected);
      
      // Fallback polling every 60 seconds (reduced frequency since we have real-time updates)
      const interval = setInterval(loadTradeData, 60000);
      
      return () => {
        // Clean up SignalR listeners and polling
        signalRService.offTradeProposalReceived(handleTradeProposalReceived);
        signalRService.offTradeProposalAccepted(handleTradeProposalAccepted);
        signalRService.offTradeProposalRejected(handleTradeProposalRejected);
        clearInterval(interval);
      };
    }
  }, [user.id, loadTradeData]);

  // Effect to refresh data when refreshTrigger changes (when user proposes a trade)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Refreshing trade notifications due to trigger:', refreshTrigger);
      loadTradeData();
    }
  }, [refreshTrigger, loadTradeData]);

  // Click outside effect to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if the click is outside both the button and the dropdown
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Also check if the click is not inside the dropdown (which is now a portal)
        const dropdownElements = document.querySelectorAll('.notifications-dropdown');
        let clickedInDropdown = false;
        
        dropdownElements.forEach((dropdown) => {
          if (dropdown.contains(target)) {
            clickedInDropdown = true;
          }
        });
        
        if (!clickedInDropdown) {
          setIsExpanded(false);
        }
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleAcceptTrade = async (tradeId: number) => {
    setIsLoading(true);
    try {
      await tradeProposalService.respondToTradeProposal(tradeId, true);
      await loadTradeData();
      onTradeUpdate?.();
    } catch (error) {
      console.error('Error accepting trade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectTrade = async (tradeId: number) => {
    setIsLoading(true);
    try {
      await tradeProposalService.respondToTradeProposal(tradeId, false);
      await loadTradeData();
      onTradeUpdate?.();
    } catch (error) {
      console.error('Error rejecting trade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTrade = async (tradeId: number) => {
    setIsLoading(true);
    try {
      await tradeProposalService.cancelTradeProposal(tradeId);
      await loadTradeData();
      onTradeUpdate?.();
    } catch (error) {
      console.error('Error cancelling trade:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // Show button ONLY if user has active pending trades that require action
  const myActiveTradesCount = tradesIProposed.length + tradesOfferedToMe.length;
  const shouldShowButton = myActiveTradesCount > 0;
  const totalUnread = myActiveTradesCount;

  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      setDropdownStyle({
        position: 'fixed',
        top: buttonRect.bottom + 8,
        right: window.innerWidth - buttonRect.right,
        zIndex: 9999,
      });
    }
  };

  const handleToggleClick = () => {
    console.log('🔄 Toggle clicked, current state:', isExpanded, 'totalUnread:', totalUnread);
    if (!isExpanded) {
      calculateDropdownPosition();
    }
    setIsExpanded(!isExpanded);
  };

  const renderDropdown = () => {
    if (!isExpanded) return null;

    const dropdownContent = (
      <div className="notifications-dropdown" style={dropdownStyle}>
        <div className="notifications-header">
          <h3>Trade Activity</h3>
          <button onClick={() => setIsExpanded(false)}>×</button>
        </div>

          <div className="notifications-content">
            {/* Trades I Proposed - with cancel/edit options */}
            {tradesIProposed.length > 0 && (
              <div className="notification-section">
                <h4>My Trade Proposals</h4>
                {tradesIProposed.map(trade => (
                  <div key={trade.id} className="trade-proposal-notification">
                    <div className="trade-header">
                      Proposed to <strong>{trade.targetUser.username}</strong>
                    </div>
                    
                    <div className="trade-details">
                      <div className="trade-side">
                        <span className="trade-label">I give:</span>
                        {trade.proposingPlayers.map(player => (
                          <div key={player.id} className="trade-player">
                            {player.playerName} ({player.playerPosition})
                          </div>
                        ))}
                      </div>
                      
                      <div className="trade-side">
                        <span className="trade-label">I get:</span>
                        {trade.targetPlayers.map(player => (
                          <div key={player.id} className="trade-player">
                            {player.playerName} ({player.playerPosition})
                          </div>
                        ))}
                      </div>
                    </div>

                    {trade.message && (
                      <div className="trade-message">
                        <strong>Message:</strong> {trade.message}
                      </div>
                    )}

                    <div className="trade-actions">
                      <button 
                        className="cancel-btn"
                        onClick={() => handleCancelTrade(trade.id)}
                        disabled={isLoading}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trades Offered to Me - with accept/reject options */}
            {tradesOfferedToMe.length > 0 && (
              <div className="notification-section">
                <h4>Trade Offers for Me</h4>
                {tradesOfferedToMe.map(trade => (
                  <div key={trade.id} className="trade-proposal-notification">
                    <div className="trade-header">
                      <strong>{trade.proposingUser.username}</strong> wants to trade
                    </div>
                    
                    <div className="trade-details">
                      <div className="trade-side">
                        <span className="trade-label">I give:</span>
                        {trade.targetPlayers.map(player => (
                          <div key={player.id} className="trade-player">
                            {player.playerName} ({player.playerPosition})
                          </div>
                        ))}
                      </div>
                      
                      <div className="trade-side">
                        <span className="trade-label">I get:</span>
                        {trade.proposingPlayers.map(player => (
                          <div key={player.id} className="trade-player">
                            {player.playerName} ({player.playerPosition})
                          </div>
                        ))}
                      </div>
                    </div>

                    {trade.message && (
                      <div className="trade-message">
                        <strong>Message:</strong> {trade.message}
                      </div>
                    )}

                    <div className="trade-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleAcceptTrade(trade.id)}
                        disabled={isLoading}
                      >
                        ✅ Accept
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleRejectTrade(trade.id)}
                        disabled={isLoading}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {myActiveTradesCount === 0 && (
              <div className="no-notifications">
                <p>No active trade requests</p>
              </div>
            )}
          </div>
      </div>
    );

    return ReactDOM.createPortal(dropdownContent, document.body);
  };

  // Only render the button if there are personal notifications/trades OR recent league activity
  if (!shouldShowButton) {
    return null;
  }

  return (
    <>
      <div className="trade-notifications" ref={containerRef}>
        <button 
          ref={buttonRef}
          className={`notification-toggle ${totalUnread > 0 ? 'has-notifications' : 'no-notifications'}`}
          onClick={handleToggleClick}
          aria-label={totalUnread > 0 ? `${totalUnread} trade notifications` : 'Trade activity'}
        >
          🤝 {totalUnread > 0 && <span className="notification-count">{totalUnread}</span>}
        </button>
      </div>
      {renderDropdown()}
    </>
  );
};

export default TradeNotifications;