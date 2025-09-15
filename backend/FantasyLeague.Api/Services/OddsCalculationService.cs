using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class OddsCalculationService
    {
        private readonly ILogger<OddsCalculationService> _logger;

        public OddsCalculationService(ILogger<OddsCalculationService> logger)
        {
            _logger = logger;
        }

        #region Payout Calculations

        /// <summary>
        /// Calculates the potential payout for a bet amount and odds
        /// </summary>
        public decimal CalculatePayout(decimal betAmount, decimal americanOdds)
        {
            if (americanOdds > 0)
            {
                // Positive odds: +150 means win $150 for every $100 bet
                return betAmount + (betAmount * (americanOdds / 100m));
            }
            else
            {
                // Negative odds: -150 means bet $150 to win $100
                return betAmount + (betAmount * (100m / Math.Abs(americanOdds)));
            }
        }

        /// <summary>
        /// Calculates the implied probability from American odds
        /// </summary>
        public decimal CalculateImpliedProbability(decimal americanOdds)
        {
            if (americanOdds > 0)
            {
                return 100m / (americanOdds + 100m);
            }
            else
            {
                return Math.Abs(americanOdds) / (Math.Abs(americanOdds) + 100m);
            }
        }

        /// <summary>
        /// Converts decimal odds to American odds
        /// </summary>
        public decimal ConvertDecimalToAmericanOdds(decimal decimalOdds)
        {
            if (decimalOdds >= 2.0m)
            {
                return (decimalOdds - 1) * 100;
            }
            else
            {
                return -100 / (decimalOdds - 1);
            }
        }

        /// <summary>
        /// Converts American odds to decimal odds
        /// </summary>
        public decimal ConvertAmericanToDecimalOdds(decimal americanOdds)
        {
            if (americanOdds > 0)
            {
                return (americanOdds / 100m) + 1;
            }
            else
            {
                return (100m / Math.Abs(americanOdds)) + 1;
            }
        }

        #endregion

        #region Matchup Odds

        /// <summary>
        /// Calculates odds for a matchup bet selection
        /// </summary>
        public decimal CalculateMatchupOdds(BetType betType, MatchupBetSelection selection, MatchupBet matchupBet)
        {
            switch (betType)
            {
                case BetType.MatchupSpread:
                    return CalculateMatchupSpreadOdds(selection, matchupBet.PointSpread);

                case BetType.MatchupMoneyline:
                    return CalculateMatchupMoneylineOdds(selection, matchupBet);

                case BetType.MatchupOverUnder:
                    return CalculateMatchupOverUnderOdds(selection, matchupBet.OverUnderLine);

                default:
                    _logger.LogWarning("Unknown matchup bet type: {BetType}", betType);
                    return -110; // Default odds
            }
        }

        private decimal CalculateMatchupSpreadOdds(MatchupBetSelection selection, decimal? pointSpread)
        {
            // Standard spread odds are typically -110 for both sides
            // You can implement more sophisticated odds calculation here
            // based on historical data, current form, etc.

            return -110m; // Standard spread odds
        }

        private decimal CalculateMatchupMoneylineOdds(MatchupBetSelection selection, MatchupBet matchupBet)
        {
            // Calculate moneyline odds based on implied strength
            // This is a simplified implementation - you'd want to use
            // actual player/team performance data

            // Example: Use point spread to derive moneyline odds
            if (matchupBet.PointSpread.HasValue)
            {
                var spread = Math.Abs(matchupBet.PointSpread.Value);

                // Convert point spread to approximate moneyline odds
                decimal favoriteOdds, underdogOdds;

                if (spread <= 1)
                {
                    favoriteOdds = -110m;
                    underdogOdds = -110m;
                }
                else if (spread <= 3)
                {
                    favoriteOdds = -150m;
                    underdogOdds = +130m;
                }
                else if (spread <= 7)
                {
                    favoriteOdds = -200m;
                    underdogOdds = +170m;
                }
                else if (spread <= 10)
                {
                    favoriteOdds = -300m;
                    underdogOdds = +250m;
                }
                else
                {
                    favoriteOdds = -500m;
                    underdogOdds = +400m;
                }

                // Determine which team is favored based on spread sign
                bool team1Favored = matchupBet.PointSpread.Value < 0;

                return selection switch
                {
                    MatchupBetSelection.Team1Moneyline => team1Favored ? favoriteOdds : underdogOdds,
                    MatchupBetSelection.Team2Moneyline => team1Favored ? underdogOdds : favoriteOdds,
                    _ => -110m
                };
            }

            // Default to pick'em odds if no spread
            return -110m;
        }

        private decimal CalculateMatchupOverUnderOdds(MatchupBetSelection selection, decimal? overUnderLine)
        {
            // Standard over/under odds are typically -110 for both sides
            return -110m;
        }

        #endregion

        #region Game Odds

        /// <summary>
        /// Gets odds for a game bet selection from the stored game data
        /// </summary>
        public decimal GetGameOdds(BetType betType, GameBetSelection selection, GameBet gameBet)
        {
            switch (betType)
            {
                case BetType.GameSpread:
                    return -110m; // Standard spread odds

                case BetType.GameMoneyline:
                    return selection switch
                    {
                        GameBetSelection.HomeMoneyline => gameBet.HomeMoneylineOdds ?? -110m,
                        GameBetSelection.AwayMoneyline => gameBet.AwayMoneylineOdds ?? -110m,
                        _ => -110m
                    };

                case BetType.GameOverUnder:
                    return selection switch
                    {
                        GameBetSelection.Over => gameBet.OverOdds ?? -110m,
                        GameBetSelection.Under => gameBet.UnderOdds ?? -110m,
                        _ => -110m
                    };

                default:
                    _logger.LogWarning("Unknown game bet type: {BetType}", betType);
                    return -110m;
            }
        }

        #endregion

        #region Dynamic Odds Adjustment

        /// <summary>
        /// Adjusts odds based on betting volume and exposure
        /// </summary>
        public decimal AdjustOddsForVolume(decimal baseOdds, decimal totalVolume, decimal volumeOnSide, decimal maxExposure)
        {
            if (totalVolume == 0)
                return baseOdds;

            // Calculate the percentage of bets on this side
            var percentageOnSide = volumeOnSide / totalVolume;

            // If more than 70% of volume is on one side, adjust odds
            if (percentageOnSide > 0.7m)
            {
                // Make this side less attractive (worse odds)
                var adjustmentFactor = (percentageOnSide - 0.5m) * 20m; // Up to 10 point adjustment

                if (baseOdds > 0)
                {
                    return Math.Max(baseOdds - adjustmentFactor, 100m); // Don't go below +100
                }
                else
                {
                    return Math.Min(baseOdds - adjustmentFactor, -300m); // Don't go below -300
                }
            }

            return baseOdds;
        }

        /// <summary>
        /// Calculates the house edge percentage
        /// </summary>
        public decimal CalculateHouseEdge(decimal odds1, decimal odds2)
        {
            var prob1 = CalculateImpliedProbability(odds1);
            var prob2 = CalculateImpliedProbability(odds2);

            var totalProbability = prob1 + prob2;

            // House edge is the amount over 100% (1.0)
            return totalProbability - 1.0m;
        }

        /// <summary>
        /// Suggests optimal odds to maintain target house edge
        /// </summary>
        public (decimal odds1, decimal odds2) SuggestOptimalOdds(decimal trueProbability1, decimal targetHouseEdge = 0.05m)
        {
            var trueProbability2 = 1.0m - trueProbability1;

            // Adjust probabilities to include house edge
            var totalAdjustedProb = 1.0m + targetHouseEdge;
            var adjustedProb1 = trueProbability1 * totalAdjustedProb;
            var adjustedProb2 = trueProbability2 * totalAdjustedProb;

            // Convert to American odds
            var decimalOdds1 = 1.0m / adjustedProb1;
            var decimalOdds2 = 1.0m / adjustedProb2;

            var americanOdds1 = ConvertDecimalToAmericanOdds(decimalOdds1);
            var americanOdds2 = ConvertDecimalToAmericanOdds(decimalOdds2);

            return (americanOdds1, americanOdds2);
        }

        #endregion

        #region Historical Analysis

        /// <summary>
        /// Calculates odds based on historical matchup data
        /// </summary>
        public decimal CalculateHistoricalOdds(int user1Id, int user2Id, string sport, int recentWeeks = 10)
        {
            // This would analyze historical performance between these users
            // For now, return default odds
            // TODO: Implement historical analysis using past matchup data

            _logger.LogInformation("Calculating historical odds for users {User1} vs {User2} in {Sport}",
                user1Id, user2Id, sport);

            return -110m; // Default until historical analysis is implemented
        }

        /// <summary>
        /// Adjusts odds based on recent form/momentum
        /// </summary>
        public decimal AdjustForMomentum(decimal baseOdds, decimal recentPerformanceScore)
        {
            // Adjust odds based on recent performance
            // Performance score could be calculated from recent weeks' results

            if (recentPerformanceScore > 1.2m) // Hot streak
            {
                return Math.Max(baseOdds * 0.9m, -300m); // Better odds (more attractive)
            }
            else if (recentPerformanceScore < 0.8m) // Cold streak
            {
                return Math.Min(baseOdds * 1.1m, +300m); // Worse odds (less attractive)
            }

            return baseOdds;
        }

        #endregion

        #region Utility Methods

        /// <summary>
        /// Rounds odds to standard increments (typically 5 or 10)
        /// </summary>
        public decimal RoundOdds(decimal odds, int increment = 5)
        {
            if (odds > 0)
            {
                return Math.Round(odds / increment) * increment;
            }
            else
            {
                return -Math.Round(Math.Abs(odds) / increment) * increment;
            }
        }

        /// <summary>
        /// Validates that odds are within reasonable ranges
        /// </summary>
        public bool AreOddsValid(decimal odds)
        {
            // Odds should be between -10000 and +10000
            return odds >= -10000m && odds <= 10000m && odds != 0;
        }

        /// <summary>
        /// Calculates the maximum recommended bet size based on Kelly Criterion
        /// </summary>
        public decimal CalculateKellyBetSize(decimal bankroll, decimal odds, decimal winProbability)
        {
            var decimalOdds = ConvertAmericanToDecimalOdds(odds);
            var b = decimalOdds - 1; // Net fractional odds received
            var p = winProbability; // Probability of winning
            var q = 1 - p; // Probability of losing

            var kellyFraction = (p * b - q) / b;

            // Never recommend more than 25% of bankroll
            kellyFraction = Math.Min(kellyFraction, 0.25m);

            // Never recommend negative bet sizes
            kellyFraction = Math.Max(kellyFraction, 0m);

            return bankroll * kellyFraction;
        }

        #endregion
    }
}