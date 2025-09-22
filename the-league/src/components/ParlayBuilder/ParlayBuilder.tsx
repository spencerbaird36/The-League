import React, { useState, useEffect } from 'react';
import { bettingService, BetType, GameBetSelection, MatchupBetSelection, ParlayLeg, ParlayBetRequest, GameBetOption } from '../../services/bettingService';
import { useTokens } from '../../hooks/useTokens';
import './ParlayBuilder.css';

interface ParlayBuilderProps {
  onBetPlaced?: () => void;
}

const ParlayBuilder: React.FC<ParlayBuilderProps> = ({ onBetPlaced }) => {
  const { balance, refreshBalance } = useTokens();
  const [isExpanded, setIsExpanded] = useState(false);
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([]);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [potentialPayout, setPotentialPayout] = useState<number>(0);
  const [combinedOdds, setCombinedOdds] = useState<number>(0);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [availableGames, setAvailableGames] = useState<GameBetOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      loadAvailableGames();
    }
  }, [isExpanded]);

  useEffect(() => {
    calculateParlayPayout();
  }, [parlayLegs, betAmount]);

  const loadAvailableGames = async () => {
    setLoading(true);
    try {
      const games = await bettingService.getAvailableGames();
      setAvailableGames(games);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load available games');
    } finally {
      setLoading(false);
    }
  };

  const calculateParlayPayout = async () => {
    if (parlayLegs.length < 2 || betAmount <= 0) {
      setPotentialPayout(0);
      setCombinedOdds(0);
      return;
    }

    try {
      const payout = await bettingService.calculateParlayPayout(parlayLegs, betAmount);
      const oddsData = await bettingService.calculateParlayOdds(parlayLegs);
      setPotentialPayout(payout);
      setCombinedOdds(oddsData.combinedOdds);
    } catch (err) {
      console.error('Error calculating parlay payout:', err);
      // Fallback calculation
      const totalOdds = parlayLegs.reduce((acc, leg) => {
        const decimal = leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
        return acc * decimal;
      }, 1);
      const americanOdds = totalOdds >= 2 ? Math.round((totalOdds - 1) * 100) : Math.round(-100 / (totalOdds - 1));
      setCombinedOdds(americanOdds);
      setPotentialPayout(betAmount * totalOdds);
    }
  };

  const addLegToParlay = (game: GameBetOption, betType: BetType, selection: GameBetSelection) => {
    let odds = -110; // Default odds
    let description = '';

    // Calculate odds and description based on bet type and selection
    switch (betType) {
      case BetType.GameMoneyline:
        if (selection === GameBetSelection.AwayMoneyline) {
          odds = game.team1MoneylineOdds || -110;
          description = `${game.team1Name} ML`;
        } else {
          odds = game.team2MoneylineOdds || -110;
          description = `${game.team2Name} ML`;
        }
        break;
      case BetType.GameSpread:
        odds = -110;
        if (selection === GameBetSelection.AwaySpread) {
          description = `${game.team1Name} ${game.pointSpread && game.pointSpread > 0 ? '+' : ''}${game.pointSpread}`;
        } else {
          description = `${game.team2Name} ${game.pointSpread && game.pointSpread < 0 ? '+' : '-'}${Math.abs(game.pointSpread || 0)}`;
        }
        break;
      case BetType.GameOverUnder:
        odds = -110;
        description = selection === GameBetSelection.Over ? `Over ${game.overUnderLine}` : `Under ${game.overUnderLine}`;
        break;
    }

    const newLeg: ParlayLeg = {
      betType,
      gameBetId: game.id,
      gameSelection: selection,
      odds,
      description: `${description} (${game.team1Name} @ ${game.team2Name})`
    };

    // Check if this leg already exists
    const legExists = parlayLegs.some(leg =>
      leg.gameBetId === game.id &&
      leg.betType === betType &&
      leg.gameSelection === selection
    );

    if (!legExists) {
      setParlayLegs([...parlayLegs, newLeg]);
    }
  };

  const removeLegFromParlay = (index: number) => {
    const newLegs = parlayLegs.filter((_, i) => i !== index);
    setParlayLegs(newLegs);
  };

  const handlePlaceParlay = async () => {
    if (parlayLegs.length < 2) {
      setError('Parlay must have at least 2 legs');
      return;
    }

    if (!balance || balance.availableBalance < betAmount) {
      setError('Insufficient token balance');
      return;
    }

    setIsPlacingBet(true);
    setError('');
    setSuccess('');

    try {
      const request: ParlayBetRequest = {
        legs: parlayLegs,
        amount: betAmount
      };

      const result = await bettingService.placeParlayBet(request);

      if (result.success) {
        setSuccess(`Parlay placed successfully! Potential payout: ${potentialPayout.toFixed(2)} tokens`);
        refreshBalance();
        setParlayLegs([]);
        setBetAmount(10);

        if (onBetPlaced) {
          onBetPlaced();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.errorMessage || result.message || 'Failed to place parlay');
      }
    } catch (err) {
      console.error('Error placing parlay:', err);
      setError(err instanceof Error ? err.message : 'Failed to place parlay');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const clearParlay = () => {
    setParlayLegs([]);
    setBetAmount(10);
    setError('');
    setSuccess('');
  };

  const getOddsDisplay = (odds: number): string => {
    if (!odds) return '';
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  const formatGameTime = (gameDate: string): string => {
    const date = new Date(gameDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="parlay-builder">
      <button
        className="parlay-builder-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="parlay-builder-icon">🎯</span>
        <span>Parlay Builder</span>
        {parlayLegs.length > 0 && (
          <span className="parlay-legs-count">
            {parlayLegs.length} legs
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="parlay-builder-panel">
          <div className="parlay-header">
            <h4>Build Your Parlay</h4>
            <div className="balance-display">
              Balance: {balance?.availableBalance?.toFixed(0) || '0'} tokens
            </div>
          </div>

          {/* Current Parlay Legs */}
          {parlayLegs.length > 0 && (
            <div className="current-parlay">
              <h5>Current Parlay ({parlayLegs.length} legs)</h5>
              <div className="parlay-legs">
                {parlayLegs.map((leg, index) => (
                  <div key={index} className="parlay-leg">
                    <div className="leg-description">{leg.description}</div>
                    <div className="leg-odds">{getOddsDisplay(leg.odds)}</div>
                    <button
                      className="remove-leg-btn"
                      onClick={() => removeLegFromParlay(index)}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {parlayLegs.length >= 2 && (
                <div className="parlay-summary">
                  <div className="combined-odds">
                    Combined Odds: {getOddsDisplay(combinedOdds)}
                  </div>

                  <div className="bet-amount-section">
                    <label htmlFor="parlay-amount">Bet Amount (tokens):</label>
                    <input
                      id="parlay-amount"
                      type="number"
                      min="1"
                      max={balance?.availableBalance || 0}
                      value={betAmount}
                      onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                    />
                    <div className="potential-payout">
                      Potential Payout: {potentialPayout.toFixed(2)} tokens
                    </div>
                  </div>

                  <div className="parlay-actions">
                    <button
                      className="place-parlay-btn"
                      onClick={handlePlaceParlay}
                      disabled={isPlacingBet || betAmount <= 0 || !balance || balance.availableBalance < betAmount}
                    >
                      {isPlacingBet ? 'Placing Parlay...' : 'Place Parlay'}
                    </button>
                    <button
                      className="clear-parlay-btn"
                      onClick={clearParlay}
                      disabled={isPlacingBet}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Available Games */}
          <div className="available-games">
            <h5>Add Games to Parlay</h5>
            {loading && <div className="loading">Loading games...</div>}

            {availableGames.length > 0 && (
              <div className="games-list">
                {availableGames.slice(0, 5).map((game) => (
                  <div key={game.id} className="game-card">
                    <div className="game-header">
                      <div className="game-teams">
                        <span className="sport-tag">{game.sport}</span>
                        <strong>{game.team1Name} @ {game.team2Name}</strong>
                      </div>
                      <div className="game-time">
                        {formatGameTime(game.gameDate)}
                      </div>
                    </div>

                    <div className="quick-add-options">
                      {/* Moneyline */}
                      {(game.team1MoneylineOdds || game.team2MoneylineOdds) && (
                        <div className="bet-group">
                          <h6>Moneyline</h6>
                          <div className="add-buttons">
                            {game.team1MoneylineOdds && (
                              <button
                                className="add-leg-btn"
                                onClick={() => addLegToParlay(game, BetType.GameMoneyline, GameBetSelection.AwayMoneyline)}
                              >
                                {game.team1Name} {getOddsDisplay(game.team1MoneylineOdds)}
                              </button>
                            )}
                            {game.team2MoneylineOdds && (
                              <button
                                className="add-leg-btn"
                                onClick={() => addLegToParlay(game, BetType.GameMoneyline, GameBetSelection.HomeMoneyline)}
                              >
                                {game.team2Name} {getOddsDisplay(game.team2MoneylineOdds)}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Spread */}
                      {game.pointSpread && (
                        <div className="bet-group">
                          <h6>Spread</h6>
                          <div className="add-buttons">
                            <button
                              className="add-leg-btn"
                              onClick={() => addLegToParlay(game, BetType.GameSpread, GameBetSelection.AwaySpread)}
                            >
                              {game.team1Name} {game.pointSpread > 0 ? '+' : ''}{game.pointSpread}
                            </button>
                            <button
                              className="add-leg-btn"
                              onClick={() => addLegToParlay(game, BetType.GameSpread, GameBetSelection.HomeSpread)}
                            >
                              {game.team2Name} {game.pointSpread < 0 ? '+' : '-'}{Math.abs(game.pointSpread)}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Over/Under */}
                      {game.overUnderLine && (
                        <div className="bet-group">
                          <h6>Total</h6>
                          <div className="add-buttons">
                            <button
                              className="add-leg-btn"
                              onClick={() => addLegToParlay(game, BetType.GameOverUnder, GameBetSelection.Over)}
                            >
                              Over {game.overUnderLine}
                            </button>
                            <button
                              className="add-leg-btn"
                              onClick={() => addLegToParlay(game, BetType.GameOverUnder, GameBetSelection.Under)}
                            >
                              Under {game.overUnderLine}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParlayBuilder;