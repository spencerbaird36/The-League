import React, { useState, useEffect } from 'react';
import { bettingService, UserBet, BetStatus, BetType } from '../../services/bettingService';
import './BetSlip.css';

interface BetSlipProps {
  onBetCancelled?: () => void;
}

const BetSlip: React.FC<BetSlipProps> = ({ onBetCancelled }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<BetStatus | undefined>(undefined);
  const [cancellingBetId, setCancellingBetId] = useState<number | null>(null);
  const [hasActiveBets, setHasActiveBets] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadUserBets();
    }
  }, [isExpanded, selectedStatus]);

  // Check for active bets on component mount and when bets change
  useEffect(() => {
    checkForActiveBets();
  }, []);

  // Listen for bet placed events and check for active bets
  useEffect(() => {
    const handleBetPlaced = () => {
      checkForActiveBets();
      if (isExpanded) {
        loadUserBets();
      }
    };

    window.addEventListener('betPlaced', handleBetPlaced);
    return () => {
      window.removeEventListener('betPlaced', handleBetPlaced);
    };
  }, [isExpanded]);


  const checkForActiveBets = async () => {
    try {
      console.log('Checking for active bets with status:', BetStatus.Active);
      const activeBets = await bettingService.getUserBets(BetStatus.Active, undefined, undefined, 1, 1);
      console.log('Active bets response:', activeBets);
      setHasActiveBets(activeBets.length > 0);
    } catch (err) {
      console.error('Error checking for active bets:', err);
      setHasActiveBets(false);
    }
  };

  const generateBetDescription = (bet: UserBet): string => {
    if (bet.gameBet) {
      return `${bet.gameBet.awayTeam} @ ${bet.gameBet.homeTeam}`;
    } else if (bet.matchupBet) {
      return `${bet.matchupBet.team1UserName} vs ${bet.matchupBet.team2UserName}`;
    }
    return bet.typeDisplayName || 'Unknown Bet';
  };

  const generateBetSelection = (bet: UserBet): string => {
    if (bet.gameBet) {
      // Determine selection based on bet type and spread/odds
      if (bet.type === BetType.GameSpread) {
        return bet.gameBet.pointSpread && bet.gameBet.pointSpread < 0
          ? `${bet.gameBet.homeTeam} ${bet.gameBet.pointSpread}`
          : `${bet.gameBet.awayTeam} +${Math.abs(bet.gameBet.pointSpread || 0)}`;
      } else if (bet.type === BetType.GameMoneyline) {
        return 'Moneyline'; // Would need actual selection data from API
      } else if (bet.type === BetType.GameOverUnder) {
        return `O/U ${bet.gameBet.overUnderLine}`;
      }
    } else if (bet.matchupBet) {
      // Similar logic for matchup bets
      if (bet.type === BetType.MatchupSpread && bet.matchupBet.pointSpread) {
        return `Spread ${bet.matchupBet.pointSpread}`;
      } else if (bet.type === BetType.MatchupMoneyline) {
        return 'Moneyline';
      } else if (bet.type === BetType.MatchupOverUnder && bet.matchupBet.overUnderLine) {
        return `O/U ${bet.matchupBet.overUnderLine}`;
      }
    }
    return bet.typeDisplayName || 'Unknown Selection';
  };

  const loadUserBets = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Loading user bets with selectedStatus:', selectedStatus);
      const bets = await bettingService.getUserBets(selectedStatus, undefined, undefined, 1, 50);
      console.log('Raw bets from API:', bets);

      // Transform bets to include computed properties for backward compatibility
      const transformedBets = bets.map(bet => ({
        ...bet,
        betType: bet.type, // Map type to betType for compatibility
        placedAt: bet.createdAt, // Map createdAt to placedAt for compatibility
        description: generateBetDescription(bet),
        selection: generateBetSelection(bet)
      }));

      console.log('Transformed bets:', transformedBets);
      setUserBets(transformedBets);
      // Update hasActiveBets when we load bets
      const activeBets = transformedBets.filter(bet => bet.status === BetStatus.Active);
      console.log('Active bets filtered:', activeBets);
      setHasActiveBets(activeBets.length > 0);
    } catch (err) {
      console.error('Error loading user bets:', err);
      setError('Failed to load your bets: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBet = async (betId: number) => {
    setCancellingBetId(betId);
    try {
      const result = await bettingService.cancelBet(betId);
      if (result.success) {
        await loadUserBets(); // Refresh the list
        await checkForActiveBets(); // Check if there are still active bets
        if (onBetCancelled) {
          onBetCancelled();
        }
      } else {
        setError(result.errorMessage || result.message || 'Failed to cancel bet');
      }
    } catch (err) {
      console.error('Error cancelling bet:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel bet');
    } finally {
      setCancellingBetId(null);
    }
  };

  const getStatusBadgeClass = (status: BetStatus): string => {
    switch (status) {
      case BetStatus.Active:
        return 'status-active';
      case BetStatus.Won:
        return 'status-won';
      case BetStatus.Lost:
        return 'status-lost';
      case BetStatus.Push:
        return 'status-pushed';
      case BetStatus.Cancelled:
        return 'status-cancelled';
      case BetStatus.Voided:
        return 'status-voided';
      case BetStatus.Expired:
        return 'status-expired';
      default:
        return 'status-default';
    }
  };

  const getStatusDisplayName = (status: BetStatus): string => {
    switch (status) {
      case BetStatus.Active:
        return 'Active';
      case BetStatus.Won:
        return 'Won';
      case BetStatus.Lost:
        return 'Lost';
      case BetStatus.Push:
        return 'Push';
      case BetStatus.Cancelled:
        return 'Cancelled';
      case BetStatus.Voided:
        return 'Voided';
      case BetStatus.Expired:
        return 'Expired';
      case BetStatus.Pending:
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const formatDateTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActiveBets = () => userBets.filter(bet => bet.status === BetStatus.Active);
  const getCompletedBets = () => userBets.filter(bet => bet.status !== BetStatus.Active);

  const getTotalActive = () => {
    return getActiveBets().reduce((total, bet) => total + bet.amount, 0);
  };

  const getTotalPotentialPayout = () => {
    return getActiveBets().reduce((total, bet) => total + bet.potentialPayout, 0);
  };

  // Always render bet slip, but change appearance based on active bets
  // if (!hasActiveBets) {
  //   return null;
  // }

  return (
    <div className="bet-slip">
      <button
        className="bet-slip-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="bet-slip-icon">🎫</span>
        <span>My Bet Slip</span>
        <span className="bet-count">
          {hasActiveBets ? `${getActiveBets().length} active` : '0 active'}
        </span>
      </button>

      {isExpanded && (
        <div className="bet-slip-panel">
          <div className="bet-slip-header">
            <h4>My Bets</h4>
            <div className="bet-summary">
              <div className="summary-item">
                <span>Active: {getTotalActive().toFixed(0)} tokens</span>
              </div>
              <div className="summary-item">
                <span>Potential: {getTotalPotentialPayout().toFixed(0)} tokens</span>
              </div>
            </div>
          </div>

          {/* Status Filters */}
          <div className="status-filters">
            <button
              className={`status-filter ${selectedStatus === undefined ? 'active' : ''}`}
              onClick={() => setSelectedStatus(undefined)}
            >
              All
            </button>
            {Object.values(BetStatus).filter(status => typeof status === 'number').map((status) => (
              <button
                key={status}
                className={`status-filter ${selectedStatus === status ? 'active' : ''}`}
                onClick={() => setSelectedStatus(status as BetStatus)}
              >
                {getStatusDisplayName(status as BetStatus)}
              </button>
            ))}
            <button className="refresh-bets" onClick={loadUserBets} disabled={loading}>
              🔄 Refresh
            </button>
          </div>

          {loading && <div className="loading">Loading bets...</div>}

          {error && <div className="error-message">{error}</div>}

          {userBets.length > 0 ? (
            <div className="bets-list">
              {/* Active Bets Section */}
              {getActiveBets().length > 0 && (
                <div className="bets-section">
                  <h5 className="section-title">Active Bets ({getActiveBets().length})</h5>
                  {getActiveBets().map((bet) => (
                    <div key={bet.id} className="bet-card active-bet">
                      <div className="bet-header">
                        <div className="bet-description">
                          <strong>{bet.description}</strong>
                        </div>
                        <div className={`bet-status ${getStatusBadgeClass(bet.status)}`}>
                          {bet.statusDisplayName || getStatusDisplayName(bet.status)}
                        </div>
                      </div>

                      <div className="bet-details">
                        <div className="bet-amounts">
                          <span className="bet-amount">Wagered: {bet.amount.toFixed(0)} tokens</span>
                          <span className="potential-payout">Potential: {bet.potentialPayout.toFixed(0)} tokens</span>
                        </div>
                        <div className="bet-selection">
                          Selection: {bet.selection}
                        </div>
                        <div className="bet-date">
                          Placed: {formatDateTime(bet.placedAt || bet.createdAt)}
                        </div>
                      </div>

                      {bet.status === BetStatus.Active && (
                        <div className="bet-actions">
                          <button
                            className="cancel-bet-btn"
                            onClick={() => handleCancelBet(bet.id)}
                            disabled={cancellingBetId === bet.id}
                          >
                            {cancellingBetId === bet.id ? 'Cancelling...' : 'Cancel Bet'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed Bets Section */}
              {getCompletedBets().length > 0 && selectedStatus === undefined && (
                <div className="bets-section">
                  <h5 className="section-title">Recent Completed Bets ({getCompletedBets().length})</h5>
                  {getCompletedBets().slice(0, 10).map((bet) => (
                    <div key={bet.id} className={`bet-card completed-bet status-${bet.status}`}>
                      <div className="bet-header">
                        <div className="bet-description">
                          <strong>{bet.description}</strong>
                        </div>
                        <div className={`bet-status ${getStatusBadgeClass(bet.status)}`}>
                          {bet.statusDisplayName || getStatusDisplayName(bet.status)}
                        </div>
                      </div>

                      <div className="bet-details">
                        <div className="bet-amounts">
                          <span className="bet-amount">Wagered: {bet.amount.toFixed(0)} tokens</span>
                          {bet.status === BetStatus.Won && (
                            <span className="payout-received">Won: {bet.potentialPayout.toFixed(0)} tokens</span>
                          )}
                          {bet.status === BetStatus.Lost && (
                            <span className="payout-lost">Lost: {bet.amount.toFixed(0)} tokens</span>
                          )}
                          {bet.status === BetStatus.Push && (
                            <span className="payout-pushed">Pushed: {bet.amount.toFixed(0)} tokens</span>
                          )}
                        </div>
                        <div className="bet-selection">
                          Selection: {bet.selection}
                        </div>
                        <div className="bet-dates">
                          <div>Placed: {formatDateTime(bet.placedAt || bet.createdAt)}</div>
                          {bet.settledAt && <div>Settled: {formatDateTime(bet.settledAt)}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Filtered Bets */}
              {selectedStatus !== undefined && (
                <div className="bets-section">
                  <h5 className="section-title">{getStatusDisplayName(selectedStatus)} Bets ({userBets.length})</h5>
                  {userBets.map((bet) => (
                    <div key={bet.id} className={`bet-card ${bet.status === BetStatus.Active ? 'active-bet' : 'completed-bet'} status-${bet.status}`}>
                      <div className="bet-header">
                        <div className="bet-description">
                          <strong>{bet.description}</strong>
                        </div>
                        <div className={`bet-status ${getStatusBadgeClass(bet.status)}`}>
                          {bet.statusDisplayName || getStatusDisplayName(bet.status)}
                        </div>
                      </div>

                      <div className="bet-details">
                        <div className="bet-amounts">
                          <span className="bet-amount">Wagered: {bet.amount.toFixed(0)} tokens</span>
                          {bet.status === BetStatus.Active && (
                            <span className="potential-payout">Potential: {bet.potentialPayout.toFixed(0)} tokens</span>
                          )}
                          {bet.status === BetStatus.Won && (
                            <span className="payout-received">Won: {bet.potentialPayout.toFixed(0)} tokens</span>
                          )}
                          {bet.status === BetStatus.Lost && (
                            <span className="payout-lost">Lost: {bet.amount.toFixed(0)} tokens</span>
                          )}
                          {bet.status === BetStatus.Push && (
                            <span className="payout-pushed">Pushed: {bet.amount.toFixed(0)} tokens</span>
                          )}
                        </div>
                        <div className="bet-selection">
                          Selection: {bet.selection}
                        </div>
                        <div className="bet-dates">
                          <div>Placed: {formatDateTime(bet.placedAt || bet.createdAt)}</div>
                          {bet.settledAt && <div>Settled: {formatDateTime(bet.settledAt)}</div>}
                        </div>
                      </div>

                      {bet.status === BetStatus.Active && (
                        <div className="bet-actions">
                          <button
                            className="cancel-bet-btn"
                            onClick={() => handleCancelBet(bet.id)}
                            disabled={cancellingBetId === bet.id}
                          >
                            {cancellingBetId === bet.id ? 'Cancelling...' : 'Cancel Bet'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            !loading && (
              <div className="no-bets">
                {selectedStatus
                  ? `No ${getStatusDisplayName(selectedStatus).toLowerCase()} bets found.`
                  : 'No bets placed yet. Start betting on some games!'
                }
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default BetSlip;