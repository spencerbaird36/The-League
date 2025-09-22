import React, { useState, useEffect } from 'react';
import { bettingService, BetType, GameBetSelection, PlaceBetRequest, PlaceBetResponse, GameBetOption, ParlayLeg, ParlayBetRequest } from '../../services/bettingService';
import { useTokens } from '../../hooks/useTokens';
import './GamesAccordion.css';

interface GamesAccordionProps {
  onBetPlaced?: () => void;
}

interface SportFilter {
  NFL: boolean;
  NBA: boolean;
  MLB: boolean;
}

const GamesAccordion: React.FC<GamesAccordionProps> = ({ onBetPlaced }) => {
  const { balance, refreshBalance } = useTokens();
  const [isExpanded, setIsExpanded] = useState(false);
  const [gameBets, setGameBets] = useState<GameBetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedGameBet, setSelectedGameBet] = useState<GameBetOption | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<BetType | null>(null);
  const [selectedSelection, setSelectedSelection] = useState<GameBetSelection | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [potentialPayout, setPotentialPayout] = useState<number>(0);
  const [placingBet, setPlacingBet] = useState(false);
  const [betSuccess, setBetSuccess] = useState<string>('');

  // Parlay state
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>([]);
  const [parlayAmount, setParlayAmount] = useState<number>(10);
  const [parlayPayout, setParlayPayout] = useState<number>(0);
  const [combinedOdds, setCombinedOdds] = useState<number>(0);
  const [placingParlay, setPlacingParlay] = useState(false);
  const [parlaySuccess, setParlaySuccess] = useState<string>('');
  const [bettingMode, setBettingMode] = useState<'single' | 'parlay'>('single');

  const [sportFilters, setSportFilters] = useState<SportFilter>({
    NFL: true,
    NBA: true,
    MLB: true
  });

  useEffect(() => {
    if (isExpanded) {
      loadGameBets();
    }
  }, [isExpanded]);

  useEffect(() => {
    calculatePayout();
  }, [selectedGameBet, selectedBetType, selectedSelection, betAmount]);

  useEffect(() => {
    calculateParlayPayout();
  }, [parlayLegs, parlayAmount]);

  const loadGameBets = async () => {
    setLoading(true);
    setError('');
    try {
      const availableGames = await bettingService.getAvailableGames();
      setGameBets(availableGames);
    } catch (err) {
      console.error('Error loading game bets:', err);
      setError('Failed to load available bets');
    } finally {
      setLoading(false);
    }
  };

  const calculatePayout = async () => {
    if (!selectedGameBet || !selectedBetType || !selectedSelection || betAmount <= 0) {
      setPotentialPayout(0);
      return;
    }

    try {
      const payout = await bettingService.calculatePayout(
        betAmount,
        selectedBetType,
        undefined,
        undefined,
        selectedGameBet.id,
        selectedSelection
      );
      setPotentialPayout(payout);
    } catch (err) {
      console.error('Error calculating payout:', err);
      setPotentialPayout(0);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedGameBet || !selectedBetType || !selectedSelection || betAmount <= 0) {
      setError('Please select a game, bet type, and amount');
      return;
    }

    if (!balance || balance.availableBalance < betAmount) {
      setError('Insufficient token balance');
      return;
    }

    setPlacingBet(true);
    setError('');
    setBetSuccess('');

    try {
      const request: PlaceBetRequest = {
        betType: selectedBetType,
        amount: betAmount,
        gameBetId: selectedGameBet.id,
        gameSelection: selectedSelection
      };

      const result: PlaceBetResponse = await bettingService.placeBet(request);

      if (result.success) {
        setBetSuccess(`Bet placed successfully! Potential payout: ${potentialPayout.toFixed(2)} tokens`);
        refreshBalance();
        setSelectedGameBet(null);
        setSelectedBetType(null);
        setSelectedSelection(null);
        setBetAmount(10);

        if (onBetPlaced) {
          onBetPlaced();
        }

        setTimeout(() => setBetSuccess(''), 3000);
      } else {
        setError(result.errorMessage || result.message || 'Failed to place bet');
      }
    } catch (err) {
      console.error('Error placing bet:', err);
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setPlacingBet(false);
    }
  };

  const calculateParlayPayout = async () => {
    if (parlayLegs.length < 2 || parlayAmount <= 0) {
      setParlayPayout(0);
      setCombinedOdds(0);
      return;
    }

    try {
      const payout = await bettingService.calculateParlayPayout(parlayLegs, parlayAmount);
      const oddsData = await bettingService.calculateParlayOdds(parlayLegs);
      setParlayPayout(payout);
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
      setParlayPayout(parlayAmount * totalOdds);
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

    if (!balance || balance.availableBalance < parlayAmount) {
      setError('Insufficient token balance');
      return;
    }

    setPlacingParlay(true);
    setError('');
    setParlaySuccess('');

    try {
      const request: ParlayBetRequest = {
        legs: parlayLegs,
        amount: parlayAmount
      };

      const result = await bettingService.placeParlayBet(request);

      if (result.success) {
        setParlaySuccess(`Parlay placed successfully! Potential payout: ${parlayPayout.toFixed(2)} tokens`);
        refreshBalance();
        setParlayLegs([]);
        setParlayAmount(10);

        if (onBetPlaced) {
          onBetPlaced();
        }

        setTimeout(() => setParlaySuccess(''), 3000);
      } else {
        setError(result.errorMessage || result.message || 'Failed to place parlay');
      }
    } catch (err) {
      console.error('Error placing parlay:', err);
      setError(err instanceof Error ? err.message : 'Failed to place parlay');
    } finally {
      setPlacingParlay(false);
    }
  };

  const clearParlay = () => {
    setParlayLegs([]);
    setParlayAmount(10);
    setError('');
    setParlaySuccess('');
  };

  const toggleSportFilter = (sport: keyof SportFilter) => {
    setSportFilters(prev => ({
      ...prev,
      [sport]: !prev[sport]
    }));
  };

  const getFilteredGames = (): GameBetOption[] => {
    if (!gameBets) return [];

    const filtered = gameBets.filter(game => {
      if (sportFilters.NFL && game.sport === 'NFL') return true;
      if (sportFilters.NBA && game.sport === 'NBA') return true;
      if (sportFilters.MLB && game.sport === 'MLB') return true;
      return false;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date((a as any).gameDateTime || a.gameDate);
      const dateB = new Date((b as any).gameDateTime || b.gameDate);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const formatGameTime = (gameDate: string): string => {
    if (!gameDate) return 'TBD';
    const date = new Date(gameDate);
    if (isNaN(date.getTime())) return 'TBD';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOddsDisplay = (odds: number): string => {
    if (!odds) return '';
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  // Helper functions to extract betting data from the new API structure
  const getMoneylineOdds = (game: any, isAway: boolean): number | null => {
    if (!game.bettingOptions) return null;
    const selection = isAway ? 4 : 3; // Away=4, Home=3 based on API data
    const option = game.bettingOptions.find((opt: any) => opt.betType === 5 && opt.selection === selection);
    return option?.odds || null;
  };

  const getSpreadData = (game: any): { spread: number | null, awaySpread: number | null } => {
    if (!game.bettingOptions) return { spread: null, awaySpread: null };
    const homeSpread = game.bettingOptions.find((opt: any) => opt.betType === 4 && opt.selection === 1);
    const awaySpread = game.bettingOptions.find((opt: any) => opt.betType === 4 && opt.selection === 2);
    return {
      spread: homeSpread?.line || null,
      awaySpread: awaySpread?.line || null
    };
  };

  const getOverUnderData = (game: any): { line: number | null, overOdds: number | null, underOdds: number | null } => {
    if (!game.bettingOptions) return { line: null, overOdds: null, underOdds: null };
    const over = game.bettingOptions.find((opt: any) => opt.betType === 6 && opt.selection === 5);
    const under = game.bettingOptions.find((opt: any) => opt.betType === 6 && opt.selection === 6);
    return {
      line: over?.line || under?.line || null,
      overOdds: over?.odds || null,
      underOdds: under?.odds || null
    };
  };

  const hasAnyBettingOptions = (game: any): boolean => {
    return game.bettingOptions && game.bettingOptions.length > 0;
  };

  const getBetSelectionDisplay = (betType: BetType, selection: GameBetSelection, game: GameBetOption): string => {
    switch (betType) {
      case BetType.GameMoneyline:
        return selection === GameBetSelection.AwayMoneyline ? `${game.team1Name} ML` : `${game.team2Name} ML`;
      case BetType.GameSpread:
        if (selection === GameBetSelection.AwaySpread) {
          return `${game.team1Name} ${game.pointSpread && game.pointSpread > 0 ? '+' : ''}${game.pointSpread || ''}`;
        } else {
          return `${game.team2Name} ${game.pointSpread && game.pointSpread < 0 ? '+' : '-'}${Math.abs(game.pointSpread || 0)}`;
        }
      case BetType.GameOverUnder:
        return selection === GameBetSelection.Over ? `Over ${game.overUnderLine}` : `Under ${game.overUnderLine}`;
      default:
        return '';
    }
  };

  return (
    <div className="games-accordion">
      <button
        className="games-accordion-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="games-accordion-icon">🎲</span>
        <span>Live Sports Betting</span>
        {gameBets && (
          <span className="games-count">
            {getFilteredGames().length} games
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="games-accordion-panel">
          <div className="games-header">
            <h4>Live Sports Games</h4>
            <div className="header-controls">
              <div className="betting-mode-toggle">
                <button
                  className={`mode-btn ${bettingMode === 'single' ? 'active' : ''}`}
                  onClick={() => setBettingMode('single')}
                >
                  Single Bets
                </button>
                <button
                  className={`mode-btn ${bettingMode === 'parlay' ? 'active' : ''}`}
                  onClick={() => setBettingMode('parlay')}
                >
                  Parlay ({parlayLegs.length})
                </button>
              </div>
              <div className="balance-display">
                Balance: {balance?.availableBalance?.toFixed(0) || '0'} tokens
              </div>
            </div>
          </div>

          {/* Sport Filters */}
          <div className="sport-filters">
            {Object.entries(sportFilters).map(([sport, isActive]) => (
              <button
                key={sport}
                className={`sport-filter ${isActive ? 'active' : ''}`}
                onClick={() => toggleSportFilter(sport as keyof SportFilter)}
              >
                {sport}
              </button>
            ))}
            <button className="refresh-games" onClick={loadGameBets} disabled={loading}>
              🔄 Refresh
            </button>
          </div>

          {loading && <div className="loading">Loading games...</div>}

          {error && <div className="error-message">{error}</div>}

          {gameBets && (
            <div className="games-list">
              {getFilteredGames().map((game) => (
                <div key={game.id} className="game-card">
                  <div className="game-header">
                    <div className="game-teams">
                      <span className="sport-tag">{game.sport}</span>
                      <strong>{(game as any).awayTeam || game.team1Name} @ {(game as any).homeTeam || game.team2Name}</strong>
                    </div>
                    <div className="game-time">
                      {formatGameTime((game as any).gameDateTime || game.gameDate)}
                    </div>
                  </div>

                  <div className="betting-options">
                    {/* Moneyline Betting */}
                    {(getMoneylineOdds(game, true) || getMoneylineOdds(game, false)) && (
                      <div className="bet-group">
                        <h6>Moneyline</h6>
                        <div className="bet-buttons">
                          {getMoneylineOdds(game, true) && (
                            <button
                              className={`bet-option ${selectedGameBet?.id === game.id && selectedBetType === BetType.GameMoneyline && selectedSelection === GameBetSelection.AwayMoneyline ? 'selected' : ''}`}
                              onClick={() => {
                                if (bettingMode === 'single') {
                                  setSelectedGameBet(game);
                                  setSelectedBetType(BetType.GameMoneyline);
                                  setSelectedSelection(GameBetSelection.AwayMoneyline);
                                } else {
                                  addLegToParlay(game, BetType.GameMoneyline, GameBetSelection.AwayMoneyline);
                                }
                              }}
                            >
                              <div className="bet-team">{(game as any).awayTeam || game.team1Name}</div>
                              <div className="bet-odds">{getOddsDisplay(getMoneylineOdds(game, true)!)}</div>
                              {bettingMode === 'parlay' && <div className="add-parlay">+</div>}
                            </button>
                          )}
                          {getMoneylineOdds(game, false) && (
                            <button
                              className={`bet-option ${selectedGameBet?.id === game.id && selectedBetType === BetType.GameMoneyline && selectedSelection === GameBetSelection.HomeMoneyline ? 'selected' : ''}`}
                              onClick={() => {
                                if (bettingMode === 'single') {
                                  setSelectedGameBet(game);
                                  setSelectedBetType(BetType.GameMoneyline);
                                  setSelectedSelection(GameBetSelection.HomeMoneyline);
                                } else {
                                  addLegToParlay(game, BetType.GameMoneyline, GameBetSelection.HomeMoneyline);
                                }
                              }}
                            >
                              <div className="bet-team">{(game as any).homeTeam || game.team2Name}</div>
                              <div className="bet-odds">{getOddsDisplay(getMoneylineOdds(game, false)!)}</div>
                              {bettingMode === 'parlay' && <div className="add-parlay">+</div>}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Point Spread Betting */}
                    {getSpreadData(game).spread && (
                      <div className="bet-group">
                        <h6>Point Spread</h6>
                        <div className="bet-buttons">
                          <button
                            className={`bet-option ${selectedGameBet?.id === game.id && selectedBetType === BetType.GameSpread && selectedSelection === GameBetSelection.AwaySpread ? 'selected' : ''}`}
                            onClick={() => {
                              if (bettingMode === 'single') {
                                setSelectedGameBet(game);
                                setSelectedBetType(BetType.GameSpread);
                                setSelectedSelection(GameBetSelection.AwaySpread);
                              } else {
                                addLegToParlay(game, BetType.GameSpread, GameBetSelection.AwaySpread);
                              }
                            }}
                          >
                            <div className="bet-team">{(game as any).awayTeam || game.team1Name} {getSpreadData(game).awaySpread && getSpreadData(game).awaySpread! > 0 ? '+' : ''}{getSpreadData(game).awaySpread}</div>
                            <div className="bet-odds">-110</div>
                            {bettingMode === 'parlay' && <div className="add-parlay">+</div>}
                          </button>
                          <button
                            className={`bet-option ${selectedGameBet?.id === game.id && selectedBetType === BetType.GameSpread && selectedSelection === GameBetSelection.HomeSpread ? 'selected' : ''}`}
                            onClick={() => {
                              if (bettingMode === 'single') {
                                setSelectedGameBet(game);
                                setSelectedBetType(BetType.GameSpread);
                                setSelectedSelection(GameBetSelection.HomeSpread);
                              } else {
                                addLegToParlay(game, BetType.GameSpread, GameBetSelection.HomeSpread);
                              }
                            }}
                          >
                            <div className="bet-team">{(game as any).homeTeam || game.team2Name} {getSpreadData(game).spread && getSpreadData(game).spread! > 0 ? '+' : ''}{getSpreadData(game).spread}</div>
                            <div className="bet-odds">-110</div>
                            {bettingMode === 'parlay' && <div className="add-parlay">+</div>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Over/Under Betting */}
                    {getOverUnderData(game).line && (
                      <div className="bet-group">
                        <h6>Total Points</h6>
                        <div className="bet-buttons">
                          <button
                            className={`bet-option ${selectedGameBet?.id === game.id && selectedBetType === BetType.GameOverUnder && selectedSelection === GameBetSelection.Over ? 'selected' : ''}`}
                            onClick={() => {
                              if (bettingMode === 'single') {
                                setSelectedGameBet(game);
                                setSelectedBetType(BetType.GameOverUnder);
                                setSelectedSelection(GameBetSelection.Over);
                              } else {
                                addLegToParlay(game, BetType.GameOverUnder, GameBetSelection.Over);
                              }
                            }}
                          >
                            <div className="bet-team">Over {getOverUnderData(game).line}</div>
                            <div className="bet-odds">{getOddsDisplay(getOverUnderData(game).overOdds || -110)}</div>
                            {bettingMode === 'parlay' && <div className="add-parlay">+</div>}
                          </button>
                          <button
                            className={`bet-option ${selectedGameBet?.id === game.id && selectedBetType === BetType.GameOverUnder && selectedSelection === GameBetSelection.Under ? 'selected' : ''}`}
                            onClick={() => {
                              if (bettingMode === 'single') {
                                setSelectedGameBet(game);
                                setSelectedBetType(BetType.GameOverUnder);
                                setSelectedSelection(GameBetSelection.Under);
                              } else {
                                addLegToParlay(game, BetType.GameOverUnder, GameBetSelection.Under);
                              }
                            }}
                          >
                            <div className="bet-team">Under {getOverUnderData(game).line}</div>
                            <div className="bet-odds">{getOddsDisplay(getOverUnderData(game).underOdds || -110)}</div>
                            {bettingMode === 'parlay' && <div className="add-parlay">+</div>}
                          </button>
                        </div>
                      </div>
                    )}

                    {!hasAnyBettingOptions(game) && (
                      <div className="game-status">
                        <span className="no-betting">Betting not available</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {getFilteredGames().length === 0 && !loading && (
                <div className="no-games">
                  No upcoming games found. Try refreshing or adjusting your sport filters.
                </div>
              )}
            </div>
          )}

          {/* Single Bet Placement Panel */}
          {bettingMode === 'single' && selectedGameBet && selectedBetType && selectedSelection && (
            <div className="bet-placement-panel">
              <div className="selected-bet-info">
                <h5>Place Bet</h5>
                <div className="bet-details">
                  <strong>{(selectedGameBet as any).awayTeam || selectedGameBet.team1Name} @ {(selectedGameBet as any).homeTeam || selectedGameBet.team2Name}</strong>
                  <br />
                  <span>{getBetSelectionDisplay(selectedBetType, selectedSelection, selectedGameBet)}</span>
                </div>
              </div>

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

              {betSuccess && (
                <div className="bet-success">
                  {betSuccess}
                </div>
              )}

              <div className="bet-actions">
                <button
                  className="place-bet-btn"
                  onClick={handlePlaceBet}
                  disabled={betAmount <= 0 || placingBet || !balance || balance.availableBalance < betAmount}
                >
                  {placingBet ? 'Placing Bet...' : 'Place Bet'}
                </button>
                <button
                  className="cancel-bet-btn"
                  onClick={() => {
                    setSelectedGameBet(null);
                    setSelectedBetType(null);
                    setSelectedSelection(null);
                  }}
                  disabled={placingBet}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Parlay Management Panel */}
          {bettingMode === 'parlay' && (
            <div className="parlay-panel">
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
                          value={parlayAmount}
                          onChange={(e) => setParlayAmount(parseInt(e.target.value) || 0)}
                        />
                        <div className="payout-display">
                          Potential Payout: {parlayPayout.toFixed(2)} tokens
                        </div>
                      </div>

                      <div className="parlay-actions">
                        <button
                          className="place-parlay-btn"
                          onClick={handlePlaceParlay}
                          disabled={placingParlay || parlayAmount <= 0 || !balance || balance.availableBalance < parlayAmount}
                        >
                          {placingParlay ? 'Placing Parlay...' : 'Place Parlay'}
                        </button>
                        <button
                          className="clear-parlay-btn"
                          onClick={clearParlay}
                          disabled={placingParlay}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {parlayLegs.length === 0 && (
                <div className="parlay-empty">
                  <h5>Build Your Parlay</h5>
                  <p>Select bets from the games above to add them to your parlay. A parlay requires at least 2 legs.</p>
                </div>
              )}

              {parlayLegs.length === 1 && (
                <div className="parlay-incomplete">
                  <p>Add at least one more leg to create a parlay bet.</p>
                </div>
              )}

              {(parlaySuccess || error) && (
                <div className={parlaySuccess ? "bet-success" : "error-message"}>
                  {parlaySuccess || error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamesAccordion;