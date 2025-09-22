import React, { useState, useEffect } from 'react';
import { bettingService, BetType, MatchupBetSelection, MatchupBetOption, PlaceBetRequest } from '../services/bettingService';
import { useTokens } from '../hooks/useTokens';
import './MatchupBetting.css';

interface MatchupBettingProps {
  matchupId: string | number;
  homeTeamName: string;
  awayTeamName: string;
  isUpcoming: boolean;
  onBetPlaced?: () => void;
}

const MatchupBetting: React.FC<MatchupBettingProps> = ({
  matchupId,
  homeTeamName,
  awayTeamName,
  isUpcoming,
  onBetPlaced
}) => {
  const { balance, refreshBalance } = useTokens();
  const [matchupBet, setMatchupBet] = useState<MatchupBetOption | null>(null);
  const [selectedBet, setSelectedBet] = useState<MatchupBetSelection | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [potentialPayout, setPotentialPayout] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchMatchupBet = async () => {
      try {
        const availableMatchups = await bettingService.getAvailableMatchups();
        const numericMatchupId = typeof matchupId === 'string' ? parseInt(matchupId) : matchupId;
        const found = availableMatchups.find(m => m.id === numericMatchupId);
        setMatchupBet(found || null);
      } catch (err) {
        console.error('Error fetching matchup bet:', err);
      }
    };

    if (isUpcoming) {
      fetchMatchupBet();
    }
  }, [matchupId, isUpcoming]);

  useEffect(() => {
    const calculatePayout = async () => {
      if (!selectedBet || !matchupBet || betAmount <= 0) {
        setPotentialPayout(0);
        return;
      }

      try {
        const payout = await bettingService.calculatePayout(
          betAmount,
          BetType.MatchupMoneyline,
          matchupBet.id,
          selectedBet
        );
        setPotentialPayout(payout);
      } catch (err) {
        console.error('Error calculating payout:', err);
        setPotentialPayout(0);
      }
    };

    calculatePayout();
  }, [selectedBet, matchupBet, betAmount]);

  const handlePlaceBet = async () => {
    if (!selectedBet || !matchupBet || betAmount <= 0) {
      setError('Please select a bet and amount');
      return;
    }

    if (!balance || balance.availableBalance < betAmount) {
      setError('Insufficient token balance');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const request: PlaceBetRequest = {
        betType: BetType.MatchupMoneyline,
        amount: betAmount,
        matchupBetId: matchupBet.id,
        matchupSelection: selectedBet
      };

      const result = await bettingService.placeBet(request);

      if (result.success) {
        setSuccess(`Bet placed successfully! Potential payout: ${result.potentialPayout?.toFixed(2)} tokens`);
        refreshBalance();
        setSelectedBet(null);
        setBetAmount(10);
        setIsExpanded(false);

        if (onBetPlaced) {
          onBetPlaced();
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error placing bet:', err);
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setIsLoading(false);
    }
  };

  const getBetLabel = (selection: MatchupBetSelection): string => {
    switch (selection) {
      case MatchupBetSelection.Team1Spread:
        return `${awayTeamName} ${matchupBet?.pointSpread ? (matchupBet.pointSpread > 0 ? '+' : '') + matchupBet.pointSpread : ''}`;
      case MatchupBetSelection.Team2Spread:
        return `${homeTeamName} ${matchupBet?.pointSpread ? (matchupBet.pointSpread < 0 ? '+' : '-') + Math.abs(matchupBet.pointSpread) : ''}`;
      case MatchupBetSelection.Team1Moneyline:
        return `${awayTeamName} ML`;
      case MatchupBetSelection.Team2Moneyline:
        return `${homeTeamName} ML`;
      case MatchupBetSelection.Over:
        return `Over ${matchupBet?.overUnderLine || ''}`;
      case MatchupBetSelection.Under:
        return `Under ${matchupBet?.overUnderLine || ''}`;
      default:
        return '';
    }
  };

  const getOddsDisplay = (selection: MatchupBetSelection): string => {
    switch (selection) {
      case MatchupBetSelection.Team1Moneyline:
        return matchupBet?.team1MoneylineOdds ? `${matchupBet.team1MoneylineOdds > 0 ? '+' : ''}${matchupBet.team1MoneylineOdds}` : '';
      case MatchupBetSelection.Team2Moneyline:
        return matchupBet?.team2MoneylineOdds ? `${matchupBet.team2MoneylineOdds > 0 ? '+' : ''}${matchupBet.team2MoneylineOdds}` : '';
      default:
        return '-110';
    }
  };

  if (!isUpcoming || !matchupBet) {
    return null;
  }

  return (
    <div className="matchup-betting">
      <button
        className="betting-toggle"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        <span className="betting-icon">🎯</span>
        Bet on this matchup
      </button>

      {isExpanded && (
        <div className="betting-panel" onClick={(e) => e.stopPropagation()}>
          <div className="betting-header">
            <h4>Place Your Bet</h4>
            <div className="balance-display">
              Balance: {balance?.availableBalance?.toFixed(0) || '0'} tokens
            </div>
          </div>

          <div className="betting-options">
            {/* Spread Betting */}
            {matchupBet.pointSpread !== null && (
              <div className="bet-group">
                <h5>Point Spread</h5>
                <div className="bet-buttons">
                  <button
                    className={`bet-option ${selectedBet === MatchupBetSelection.Team1Spread ? 'selected' : ''}`}
                    onClick={() => setSelectedBet(MatchupBetSelection.Team1Spread)}
                  >
                    <div className="bet-team">{getBetLabel(MatchupBetSelection.Team1Spread)}</div>
                    <div className="bet-odds">-110</div>
                  </button>
                  <button
                    className={`bet-option ${selectedBet === MatchupBetSelection.Team2Spread ? 'selected' : ''}`}
                    onClick={() => setSelectedBet(MatchupBetSelection.Team2Spread)}
                  >
                    <div className="bet-team">{getBetLabel(MatchupBetSelection.Team2Spread)}</div>
                    <div className="bet-odds">-110</div>
                  </button>
                </div>
              </div>
            )}

            {/* Moneyline Betting */}
            <div className="bet-group">
              <h5>Moneyline</h5>
              <div className="bet-buttons">
                <button
                  className={`bet-option ${selectedBet === MatchupBetSelection.Team1Moneyline ? 'selected' : ''}`}
                  onClick={() => setSelectedBet(MatchupBetSelection.Team1Moneyline)}
                >
                  <div className="bet-team">{getBetLabel(MatchupBetSelection.Team1Moneyline)}</div>
                  <div className="bet-odds">{getOddsDisplay(MatchupBetSelection.Team1Moneyline)}</div>
                </button>
                <button
                  className={`bet-option ${selectedBet === MatchupBetSelection.Team2Moneyline ? 'selected' : ''}`}
                  onClick={() => setSelectedBet(MatchupBetSelection.Team2Moneyline)}
                >
                  <div className="bet-team">{getBetLabel(MatchupBetSelection.Team2Moneyline)}</div>
                  <div className="bet-odds">{getOddsDisplay(MatchupBetSelection.Team2Moneyline)}</div>
                </button>
              </div>
            </div>

            {/* Over/Under Betting */}
            {matchupBet.overUnderLine !== null && (
              <div className="bet-group">
                <h5>Total Points</h5>
                <div className="bet-buttons">
                  <button
                    className={`bet-option ${selectedBet === MatchupBetSelection.Over ? 'selected' : ''}`}
                    onClick={() => setSelectedBet(MatchupBetSelection.Over)}
                  >
                    <div className="bet-team">{getBetLabel(MatchupBetSelection.Over)}</div>
                    <div className="bet-odds">-110</div>
                  </button>
                  <button
                    className={`bet-option ${selectedBet === MatchupBetSelection.Under ? 'selected' : ''}`}
                    onClick={() => setSelectedBet(MatchupBetSelection.Under)}
                  >
                    <div className="bet-team">{getBetLabel(MatchupBetSelection.Under)}</div>
                    <div className="bet-odds">-110</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedBet && (
            <div className="bet-amount-section">
              <label htmlFor="bet-amount">Bet Amount (tokens):</label>
              <input
                id="bet-amount"
                type="number"
                min="1"
                max={balance?.availableBalance || 0}
                value={betAmount}
                onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
              />
              <div className="payout-display">
                Potential Payout: {potentialPayout.toFixed(2)} tokens
              </div>
            </div>
          )}

          {error && (
            <div className="betting-error">
              {error}
            </div>
          )}

          {success && (
            <div className="betting-success">
              {success}
            </div>
          )}

          <div className="betting-actions">
            <button
              className="place-bet-btn"
              onClick={handlePlaceBet}
              disabled={!selectedBet || betAmount <= 0 || isLoading || !balance || balance.availableBalance < betAmount}
            >
              {isLoading ? 'Placing Bet...' : 'Place Bet'}
            </button>
            <button
              className="cancel-bet-btn"
              onClick={() => setIsExpanded(false)}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchupBetting;