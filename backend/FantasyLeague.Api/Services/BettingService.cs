using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Services
{
    public class BettingService
    {
        private readonly FantasyLeagueContext _context;
        private readonly UserWalletService _walletService;
        private readonly OddsCalculationService _oddsService;
        private readonly ILogger<BettingService> _logger;

        public BettingService(
            FantasyLeagueContext context,
            UserWalletService walletService,
            OddsCalculationService oddsService,
            ILogger<BettingService> logger)
        {
            _context = context;
            _walletService = walletService;
            _oddsService = oddsService;
            _logger = logger;
        }

        #region Bet Placement

        /// <summary>
        /// Places a bet for a user
        /// </summary>
        public async Task<PlaceBetResponseDto> PlaceBetAsync(int userId, PlaceBetDto dto)
        {
            try
            {
                // Validate user has sufficient balance
                var wallet = await _walletService.GetOrCreateWalletAsync(userId);
                if (wallet.TokenBalance < dto.Amount)
                {
                    return new PlaceBetResponseDto
                    {
                        Success = false,
                        ErrorMessage = $"Insufficient balance. Available: {wallet.TokenBalance:C}, Required: {dto.Amount:C}"
                    };
                }

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Validate and get betting details based on bet type
                    var (isValid, odds, expiresAt, errorMessage) = await ValidateBetAsync(dto);
                    if (!isValid)
                    {
                        return new PlaceBetResponseDto
                        {
                            Success = false,
                            ErrorMessage = errorMessage
                        };
                    }

                    // Calculate potential payout
                    var potentialPayout = _oddsService.CalculatePayout(dto.Amount, odds);

                    // Move tokens to pending balance
                    var success = await _walletService.MoveToPendingAsync(
                        userId,
                        dto.Amount,
                        $"Bet placed: {dto.BetType} - ${dto.Amount}"
                    );

                    if (!success)
                    {
                        await transaction.RollbackAsync();
                        return new PlaceBetResponseDto
                        {
                            Success = false,
                            ErrorMessage = "Failed to reserve tokens for bet"
                        };
                    }

                    // Get the token transaction that was just created
                    var tokenTransaction = await _context.TokenTransactions
                        .OrderByDescending(t => t.CreatedAt)
                        .FirstAsync(t => t.UserId == userId && t.Type == TokenTransactionType.BetPlaced);

                    // Create the bet record
                    var bet = new Bet
                    {
                        UserId = userId,
                        LeagueId = await GetLeagueIdForBetAsync(dto),
                        Type = dto.BetType,
                        Amount = dto.Amount,
                        PotentialPayout = potentialPayout,
                        Odds = odds,
                        Status = BetStatus.Active,
                        ExpiresAt = expiresAt,
                        CreatedAt = DateTime.UtcNow,
                        Notes = dto.Notes,
                        TokenTransactionId = tokenTransaction.Id,
                        MatchupBetId = dto.MatchupBetId,
                        GameBetId = dto.GameBetId
                    };

                    _context.Bets.Add(bet);
                    await _context.SaveChangesAsync();

                    // Update specific bet selection
                    await UpdateBetSelectionAsync(bet.Id, dto);

                    await transaction.CommitAsync();

                    var updatedWallet = await _walletService.GetWalletBalanceAsync(userId);

                    _logger.LogInformation("Bet placed successfully: User {UserId}, Amount {Amount}, Type {BetType}",
                        userId, dto.Amount, dto.BetType);

                    return new PlaceBetResponseDto
                    {
                        Success = true,
                        Message = $"Bet placed successfully! Wagered: {dto.Amount:C}, Potential payout: {potentialPayout:C}",
                        BetId = bet.Id,
                        NewTokenBalance = updatedWallet?.TokenBalance,
                        NewPendingBalance = updatedWallet?.PendingBalance,
                        Bet = await GetBetDtoAsync(bet.Id)
                    };
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error placing bet for user {UserId}", userId);
                return new PlaceBetResponseDto
                {
                    Success = false,
                    ErrorMessage = "An error occurred while placing the bet"
                };
            }
        }

        /// <summary>
        /// Cancels an active bet if allowed
        /// </summary>
        public async Task<bool> CancelBetAsync(int betId, int userId, int? adminUserId = null)
        {
            try
            {
                var bet = await _context.Bets
                    .Include(b => b.TokenTransaction)
                    .FirstOrDefaultAsync(b => b.Id == betId);

                if (bet == null)
                {
                    _logger.LogWarning("Bet {BetId} not found for cancellation", betId);
                    return false;
                }

                // Check permissions
                if (bet.UserId != userId && !adminUserId.HasValue)
                {
                    _logger.LogWarning("User {UserId} attempted to cancel bet {BetId} belonging to user {BetUserId}",
                        userId, betId, bet.UserId);
                    return false;
                }

                if (!bet.CanBeCancelled)
                {
                    _logger.LogWarning("Bet {BetId} cannot be cancelled. Status: {Status}, Expired: {IsExpired}",
                        betId, bet.Status, bet.IsExpired);
                    return false;
                }

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Return tokens from pending to available
                    var success = await _walletService.MoveFromPendingAsync(
                        bet.UserId,
                        bet.Amount,
                        $"Bet cancelled: {bet.Type} - ${bet.Amount}",
                        TokenTransactionType.BetRefunded,
                        bet.Id
                    );

                    if (!success)
                    {
                        await transaction.RollbackAsync();
                        return false;
                    }

                    // Update bet status
                    bet.Status = BetStatus.Cancelled;
                    bet.SettledAt = DateTime.UtcNow;
                    bet.SettledByAdminId = adminUserId;
                    bet.SettlementNotes = adminUserId.HasValue ? "Cancelled by admin" : "Cancelled by user";

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Bet {BetId} cancelled successfully by {CancelledBy}",
                        betId, adminUserId.HasValue ? $"admin {adminUserId}" : $"user {userId}");

                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling bet {BetId}", betId);
                return false;
            }
        }

        #endregion

        #region Bet Settlement

        /// <summary>
        /// Settles a bet with the given outcome
        /// </summary>
        public async Task<bool> SettleBetAsync(int betId, BetStatus outcome, int adminUserId, string? notes = null)
        {
            try
            {
                var bet = await _context.Bets
                    .Include(b => b.TokenTransaction)
                    .FirstOrDefaultAsync(b => b.Id == betId);

                if (bet == null)
                {
                    _logger.LogWarning("Bet {BetId} not found for settlement", betId);
                    return false;
                }

                if (bet.Status != BetStatus.Active)
                {
                    _logger.LogWarning("Bet {BetId} cannot be settled. Current status: {Status}", betId, bet.Status);
                    return false;
                }

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    bool success = false;

                    switch (outcome)
                    {
                        case BetStatus.Won:
                            success = await ProcessWinningBetAsync(bet);
                            break;

                        case BetStatus.Lost:
                            success = await ProcessLosingBetAsync(bet);
                            break;

                        case BetStatus.Push:
                        case BetStatus.Voided:
                            success = await ProcessRefundedBetAsync(bet, outcome);
                            break;

                        default:
                            _logger.LogWarning("Invalid settlement outcome: {Outcome}", outcome);
                            return false;
                    }

                    if (!success)
                    {
                        await transaction.RollbackAsync();
                        return false;
                    }

                    // Update bet status
                    bet.Status = outcome;
                    bet.SettledAt = DateTime.UtcNow;
                    bet.SettledByAdminId = adminUserId;
                    bet.SettlementNotes = notes;

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Bet {BetId} settled as {Outcome} by admin {AdminUserId}",
                        betId, outcome, adminUserId);

                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling bet {BetId}", betId);
                return false;
            }
        }

        /// <summary>
        /// Automatically settles matchup bets based on scores
        /// </summary>
        public async Task<int> SettleMatchupBetsAsync(int matchupBetId, decimal team1Score, decimal team2Score, int adminUserId)
        {
            try
            {
                // Update matchup scores
                var matchupBet = await _context.MatchupBets.FindAsync(matchupBetId);
                if (matchupBet == null)
                {
                    _logger.LogWarning("MatchupBet {MatchupBetId} not found", matchupBetId);
                    return 0;
                }

                matchupBet.Team1Score = team1Score;
                matchupBet.Team2Score = team2Score;
                matchupBet.TotalScore = team1Score + team2Score;
                matchupBet.IsSettled = true;
                matchupBet.SettledAt = DateTime.UtcNow;

                if (team1Score > team2Score)
                    matchupBet.WinnerUserId = matchupBet.Team1UserId;
                else if (team2Score > team1Score)
                    matchupBet.WinnerUserId = matchupBet.Team2UserId;

                // Get all active bets for this matchup
                var bets = await _context.Bets
                    .Where(b => b.MatchupBetId == matchupBetId && b.Status == BetStatus.Active)
                    .ToListAsync();

                int settledCount = 0;

                foreach (var bet in bets)
                {
                    var outcome = matchupBet.DetermineBetOutcome(bet.MatchupSelection!.Value);
                    var status = outcome switch
                    {
                        BetOutcome.Win => BetStatus.Won,
                        BetOutcome.Loss => BetStatus.Lost,
                        BetOutcome.Push => BetStatus.Push,
                        _ => BetStatus.Push
                    };

                    if (await SettleBetAsync(bet.Id, status, adminUserId, "Auto-settled based on matchup results"))
                    {
                        settledCount++;
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Settled {Count} bets for matchup {MatchupBetId}", settledCount, matchupBetId);
                return settledCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling matchup bets for {MatchupBetId}", matchupBetId);
                return 0;
            }
        }

        /// <summary>
        /// Automatically settles game bets based on scores
        /// </summary>
        public async Task<int> SettleGameBetsAsync(int gameBetId, int homeScore, int awayScore, GameStatus gameStatus, int adminUserId)
        {
            try
            {
                // Update game scores
                var gameBet = await _context.GameBets.FindAsync(gameBetId);
                if (gameBet == null)
                {
                    _logger.LogWarning("GameBet {GameBetId} not found", gameBetId);
                    return 0;
                }

                gameBet.HomeScore = homeScore;
                gameBet.AwayScore = awayScore;
                gameBet.GameStatus = gameStatus;
                gameBet.IsSettled = true;
                gameBet.SettledAt = DateTime.UtcNow;
                gameBet.UpdatedAt = DateTime.UtcNow;

                // Get all active bets for this game
                var bets = await _context.Bets
                    .Where(b => b.GameBetId == gameBetId && b.Status == BetStatus.Active)
                    .ToListAsync();

                int settledCount = 0;

                foreach (var bet in bets)
                {
                    BetStatus status;

                    if (gameStatus == GameStatus.Cancelled || gameStatus == GameStatus.Postponed)
                    {
                        status = BetStatus.Voided;
                    }
                    else
                    {
                        var outcome = gameBet.DetermineBetOutcome(bet.GameSelection!.Value);
                        status = outcome switch
                        {
                            BetOutcome.Win => BetStatus.Won,
                            BetOutcome.Loss => BetStatus.Lost,
                            BetOutcome.Push => BetStatus.Push,
                            _ => BetStatus.Push
                        };
                    }

                    if (await SettleBetAsync(bet.Id, status, adminUserId, "Auto-settled based on game results"))
                    {
                        settledCount++;
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Settled {Count} bets for game {GameBetId}", settledCount, gameBetId);
                return settledCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling game bets for {GameBetId}", gameBetId);
                return 0;
            }
        }

        #endregion

        #region Helper Methods

        private async Task<(bool isValid, decimal odds, DateTime expiresAt, string? errorMessage)> ValidateBetAsync(PlaceBetDto dto)
        {
            try
            {
                switch (dto.BetType)
                {
                    case BetType.MatchupSpread:
                    case BetType.MatchupMoneyline:
                    case BetType.MatchupOverUnder:
                        return await ValidateMatchupBetAsync(dto);

                    case BetType.GameSpread:
                    case BetType.GameMoneyline:
                    case BetType.GameOverUnder:
                    case BetType.GameProps:
                        return await ValidateGameBetAsync(dto);

                    default:
                        return (false, 0, DateTime.UtcNow, "Invalid bet type");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating bet");
                return (false, 0, DateTime.UtcNow, "Validation error occurred");
            }
        }

        private async Task<(bool isValid, decimal odds, DateTime expiresAt, string? errorMessage)> ValidateMatchupBetAsync(PlaceBetDto dto)
        {
            if (!dto.MatchupBetId.HasValue || !dto.MatchupSelection.HasValue)
            {
                return (false, 0, DateTime.UtcNow, "Matchup bet ID and selection are required");
            }

            var matchupBet = await _context.MatchupBets.FindAsync(dto.MatchupBetId.Value);
            if (matchupBet == null)
            {
                return (false, 0, DateTime.UtcNow, "Matchup bet not found");
            }

            if (matchupBet.IsSettled)
            {
                return (false, 0, DateTime.UtcNow, "Matchup has already been settled");
            }

            // Calculate odds based on selection
            var odds = _oddsService.CalculateMatchupOdds(dto.BetType, dto.MatchupSelection.Value, matchupBet);

            // Set expiration (e.g., when the week starts)
            var expiresAt = DateTime.UtcNow.AddDays(7); // TODO: Calculate based on actual game times

            return (true, odds, expiresAt, null);
        }

        private async Task<(bool isValid, decimal odds, DateTime expiresAt, string? errorMessage)> ValidateGameBetAsync(PlaceBetDto dto)
        {
            if (!dto.GameBetId.HasValue || !dto.GameSelection.HasValue)
            {
                return (false, 0, DateTime.UtcNow, "Game bet ID and selection are required");
            }

            var gameBet = await _context.GameBets.FindAsync(dto.GameBetId.Value);
            if (gameBet == null)
            {
                return (false, 0, DateTime.UtcNow, "Game bet not found");
            }

            if (gameBet.IsSettled)
            {
                return (false, 0, DateTime.UtcNow, "Game has already been settled");
            }

            if (gameBet.GameStatus != GameStatus.Scheduled)
            {
                return (false, 0, DateTime.UtcNow, $"Game is not available for betting. Status: {gameBet.GameStatus}");
            }

            if (gameBet.IsGameTime)
            {
                return (false, 0, DateTime.UtcNow, "Betting is closed - game has started");
            }

            // Get odds from the game bet record
            var odds = _oddsService.GetGameOdds(dto.BetType, dto.GameSelection.Value, gameBet);

            return (true, odds, gameBet.GameDateTime, null);
        }

        private async Task<int> GetLeagueIdForBetAsync(PlaceBetDto dto)
        {
            if (dto.MatchupBetId.HasValue)
            {
                // For matchup bets, we need to determine the league from the users involved
                // This is a simplified approach - you might want to store league ID directly
                return 1; // TODO: Implement proper league resolution
            }

            // For game bets, you might have league-specific games or a default league
            return 1; // TODO: Implement proper league resolution
        }

        private async Task UpdateBetSelectionAsync(int betId, PlaceBetDto dto)
        {
            // This method would update the specific MatchupBet or GameBet record
            // with the user's selection details
            // Implementation depends on your specific data model needs
        }

        private async Task<bool> ProcessWinningBetAsync(Bet bet)
        {
            // Move tokens from pending to available (original bet amount)
            var refundSuccess = await _walletService.MoveFromPendingAsync(
                bet.UserId,
                bet.Amount,
                $"Winning bet refund: {bet.Type} - ${bet.Amount}",
                TokenTransactionType.BetWon,
                bet.Id
            );

            if (!refundSuccess)
                return false;

            // Add the winnings (payout minus original bet)
            var winnings = bet.PotentialPayout - bet.Amount;
            if (winnings > 0)
            {
                var winningsSuccess = await _walletService.AddTokensAsync(
                    bet.UserId,
                    winnings,
                    $"Bet winnings: {bet.Type} - ${winnings}",
                    TokenTransactionType.BetWon
                );

                return winningsSuccess;
            }

            return true;
        }

        private async Task<bool> ProcessLosingBetAsync(Bet bet)
        {
            // Remove tokens from pending (house keeps the tokens)
            return await _walletService.RemoveFromPendingAsync(
                bet.UserId,
                bet.Amount,
                $"Losing bet: {bet.Type} - ${bet.Amount}",
                bet.Id
            );
        }

        private async Task<bool> ProcessRefundedBetAsync(Bet bet, BetStatus reason)
        {
            // Return tokens from pending to available
            return await _walletService.MoveFromPendingAsync(
                bet.UserId,
                bet.Amount,
                $"Bet refunded ({reason}): {bet.Type} - ${bet.Amount}",
                TokenTransactionType.BetRefunded,
                bet.Id
            );
        }

        private async Task<BetDto?> GetBetDtoAsync(int betId)
        {
            var bet = await _context.Bets
                .Include(b => b.User)
                .Include(b => b.League)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team1User)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team2User)
                .Include(b => b.GameBet)
                .Include(b => b.SettledByAdmin)
                .FirstOrDefaultAsync(b => b.Id == betId);

            if (bet == null)
                return null;

            return new BetDto
            {
                Id = bet.Id,
                UserId = bet.UserId,
                UserName = bet.User.Username,
                LeagueId = bet.LeagueId,
                LeagueName = bet.League.Name,
                Type = bet.Type,
                TypeDisplayName = bet.Type.GetBetTypeDisplayName(),
                Amount = bet.Amount,
                PotentialPayout = bet.PotentialPayout,
                Odds = bet.Odds,
                Status = bet.Status,
                StatusDisplayName = bet.Status.GetBetStatusDisplayName(),
                ExpiresAt = bet.ExpiresAt,
                CreatedAt = bet.CreatedAt,
                SettledAt = bet.SettledAt,
                Notes = bet.Notes,
                SettlementNotes = bet.SettlementNotes,
                SettledByAdminName = bet.SettledByAdmin != null
                    ? $"{bet.SettledByAdmin.FirstName} {bet.SettledByAdmin.LastName}"
                    : null,
                CanBeCancelled = bet.CanBeCancelled,
                IsExpired = bet.IsExpired,
                ImpliedProbability = bet.ImpliedProbability,
                // TODO: Map MatchupBet and GameBet details
            };
        }

        #endregion

        #region Additional API Methods

        /// <summary>
        /// Gets available bets for a user
        /// </summary>
        public async Task<AvailableBetsDto> GetAvailableBetsAsync(int userId)
        {
            var matchups = await GetAvailableMatchupBetsAsync(userId);
            var games = await GetAvailableGameBetsAsync(userId);

            return new AvailableBetsDto
            {
                MatchupBets = matchups,
                GameBets = games,
                TotalAvailable = matchups.Count + games.Count
            };
        }

        /// <summary>
        /// Gets available matchup bets for a user
        /// </summary>
        public async Task<List<MatchupBetOptionDto>> GetAvailableMatchupBetsAsync(int userId, int? leagueId = null)
        {
            var query = _context.MatchupBets
                .Where(mb => !mb.IsSettled)
                .AsQueryable();

            if (leagueId.HasValue)
            {
                query = query.Where(mb => mb.LeagueId == leagueId.Value);
            }

            var matchups = await query
                .Include(mb => mb.Team1User)
                .Include(mb => mb.Team2User)
                .Include(mb => mb.League)
                .OrderByDescending(mb => mb.CreatedAt)
                .ToListAsync();

            var result = new List<MatchupBetOptionDto>();

            foreach (var matchup in matchups)
            {
                var options = new List<BettingOptionDto>();

                // Add spread options
                if (matchup.PointSpread.HasValue)
                {
                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.MatchupSpread,
                        BetTypeDisplayName = "Spread",
                        Description = $"{matchup.Team1User.Username} {matchup.PointSpread:+0;-0}",
                        Odds = _oddsService.CalculateMatchupOdds(BetType.MatchupSpread, MatchupBetSelection.Team1Spread, matchup),
                        Selection = MatchupBetSelection.Team1Spread,
                        SelectionDisplayName = $"{matchup.Team1User.Username} {matchup.PointSpread:+0;-0}",
                        Line = matchup.PointSpread,
                        IsAvailable = true
                    });

                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.MatchupSpread,
                        BetTypeDisplayName = "Spread",
                        Description = $"{matchup.Team2User.Username} {-matchup.PointSpread:+0;-0}",
                        Odds = _oddsService.CalculateMatchupOdds(BetType.MatchupSpread, MatchupBetSelection.Team2Spread, matchup),
                        Selection = MatchupBetSelection.Team2Spread,
                        SelectionDisplayName = $"{matchup.Team2User.Username} {-matchup.PointSpread:+0;-0}",
                        Line = -matchup.PointSpread,
                        IsAvailable = true
                    });
                }

                // Add moneyline options
                options.Add(new BettingOptionDto
                {
                    BetType = BetType.MatchupMoneyline,
                    BetTypeDisplayName = "Moneyline",
                    Description = $"{matchup.Team1User.Username} to Win",
                    Odds = _oddsService.CalculateMatchupOdds(BetType.MatchupMoneyline, MatchupBetSelection.Team1Moneyline, matchup),
                    Selection = MatchupBetSelection.Team1Moneyline,
                    SelectionDisplayName = $"{matchup.Team1User.Username}",
                    IsAvailable = true
                });

                options.Add(new BettingOptionDto
                {
                    BetType = BetType.MatchupMoneyline,
                    BetTypeDisplayName = "Moneyline",
                    Description = $"{matchup.Team2User.Username} to Win",
                    Odds = _oddsService.CalculateMatchupOdds(BetType.MatchupMoneyline, MatchupBetSelection.Team2Moneyline, matchup),
                    Selection = MatchupBetSelection.Team2Moneyline,
                    SelectionDisplayName = $"{matchup.Team2User.Username}",
                    IsAvailable = true
                });

                // Add over/under options if line is set
                if (matchup.OverUnderLine.HasValue)
                {
                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.MatchupOverUnder,
                        BetTypeDisplayName = "Total",
                        Description = $"Over {matchup.OverUnderLine}",
                        Odds = _oddsService.CalculateMatchupOdds(BetType.MatchupOverUnder, MatchupBetSelection.Over, matchup),
                        Selection = MatchupBetSelection.Over,
                        SelectionDisplayName = "Over",
                        Line = matchup.OverUnderLine,
                        IsAvailable = true
                    });

                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.MatchupOverUnder,
                        BetTypeDisplayName = "Total",
                        Description = $"Under {matchup.OverUnderLine}",
                        Odds = _oddsService.CalculateMatchupOdds(BetType.MatchupOverUnder, MatchupBetSelection.Under, matchup),
                        Selection = MatchupBetSelection.Under,
                        SelectionDisplayName = "Under",
                        Line = matchup.OverUnderLine,
                        IsAvailable = true
                    });
                }

                // Calculate implied probabilities
                foreach (var option in options)
                {
                    option.ImpliedProbability = _oddsService.CalculateImpliedProbability(option.Odds);
                }

                result.Add(new MatchupBetOptionDto
                {
                    Id = matchup.Id,
                    LeagueId = matchup.LeagueId,
                    LeagueName = matchup.League.Name,
                    Week = matchup.Week,
                    Season = matchup.Season,
                    Sport = matchup.Sport,
                    Team1UserName = matchup.Team1User.Username,
                    Team2UserName = matchup.Team2User.Username,
                    PointSpread = matchup.PointSpread,
                    OverUnderLine = matchup.OverUnderLine,
                    BettingOptions = options,
                    ExpiresAt = matchup.ExpiresAt,
                    IsActive = !matchup.IsSettled && (matchup.ExpiresAt == null || matchup.ExpiresAt > DateTime.UtcNow)
                });
            }

            return result;
        }

        /// <summary>
        /// Gets available game bets for a user
        /// </summary>
        public async Task<List<GameBetOptionDto>> GetAvailableGameBetsAsync(int userId, int? leagueId = null)
        {
            var query = _context.GameBets
                .Where(gb => !gb.IsSettled && gb.GameStatus == GameStatus.Scheduled)
                .AsQueryable();

            if (leagueId.HasValue)
            {
                query = query.Where(gb => gb.LeagueId == leagueId.Value);
            }

            var games = await query
                .Include(gb => gb.League)
                .OrderBy(gb => gb.GameDateTime)
                .ToListAsync();

            var result = new List<GameBetOptionDto>();

            foreach (var game in games)
            {
                var options = new List<BettingOptionDto>();

                // Add spread options
                if (game.PointSpread.HasValue)
                {
                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.GameSpread,
                        BetTypeDisplayName = "Spread",
                        Description = $"{game.HomeTeam} {game.PointSpread:+0;-0}",
                        Odds = _oddsService.GetGameOdds(BetType.GameSpread, GameBetSelection.HomeSpread, game),
                        Selection = GameBetSelection.HomeSpread,
                        SelectionDisplayName = $"{game.HomeTeam} {game.PointSpread:+0;-0}",
                        Line = game.PointSpread,
                        IsAvailable = true
                    });

                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.GameSpread,
                        BetTypeDisplayName = "Spread",
                        Description = $"{game.AwayTeam} {-game.PointSpread:+0;-0}",
                        Odds = _oddsService.GetGameOdds(BetType.GameSpread, GameBetSelection.AwaySpread, game),
                        Selection = GameBetSelection.AwaySpread,
                        SelectionDisplayName = $"{game.AwayTeam} {-game.PointSpread:+0;-0}",
                        Line = -game.PointSpread,
                        IsAvailable = true
                    });
                }

                // Add moneyline options
                if (game.HomeMoneylineOdds.HasValue && game.AwayMoneylineOdds.HasValue)
                {
                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.GameMoneyline,
                        BetTypeDisplayName = "Moneyline",
                        Description = $"{game.HomeTeam} to Win",
                        Odds = game.HomeMoneylineOdds.Value,
                        Selection = GameBetSelection.HomeMoneyline,
                        SelectionDisplayName = game.HomeTeam,
                        IsAvailable = true
                    });

                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.GameMoneyline,
                        BetTypeDisplayName = "Moneyline",
                        Description = $"{game.AwayTeam} to Win",
                        Odds = game.AwayMoneylineOdds.Value,
                        Selection = GameBetSelection.AwayMoneyline,
                        SelectionDisplayName = game.AwayTeam,
                        IsAvailable = true
                    });
                }

                // Add over/under options
                if (game.OverUnderLine.HasValue)
                {
                    var overOdds = game.OverOdds ?? -110m;
                    var underOdds = game.UnderOdds ?? -110m;

                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.GameOverUnder,
                        BetTypeDisplayName = "Total",
                        Description = $"Over {game.OverUnderLine}",
                        Odds = overOdds,
                        Selection = GameBetSelection.Over,
                        SelectionDisplayName = "Over",
                        Line = game.OverUnderLine,
                        IsAvailable = true
                    });

                    options.Add(new BettingOptionDto
                    {
                        BetType = BetType.GameOverUnder,
                        BetTypeDisplayName = "Total",
                        Description = $"Under {game.OverUnderLine}",
                        Odds = underOdds,
                        Selection = GameBetSelection.Under,
                        SelectionDisplayName = "Under",
                        Line = game.OverUnderLine,
                        IsAvailable = true
                    });
                }

                // Calculate implied probabilities
                foreach (var option in options)
                {
                    option.ImpliedProbability = _oddsService.CalculateImpliedProbability(option.Odds);
                }

                result.Add(new GameBetOptionDto
                {
                    Id = game.Id,
                    LeagueId = game.LeagueId,
                    LeagueName = game.League.Name,
                    ExternalGameId = game.ExternalGameId,
                    Sport = game.Sport,
                    HomeTeam = game.HomeTeam,
                    AwayTeam = game.AwayTeam,
                    GameDateTime = game.GameDateTime,
                    Week = game.Week,
                    Season = game.Season,
                    GameStatus = game.GameStatus,
                    BettingOptions = options,
                    ExpiresAt = game.ExpiresAt,
                    IsActive = !game.IsSettled && !game.IsGameTime
                });
            }

            return result;
        }

        /// <summary>
        /// Gets user's bets with filtering
        /// </summary>
        public async Task<List<BetDto>> GetUserBetsAsync(int userId, BetStatus? status = null, BetType? type = null, int? leagueId = null, int page = 1, int pageSize = 50)
        {
            var query = _context.Bets
                .Where(b => b.UserId == userId)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(b => b.Status == status.Value);

            if (type.HasValue)
                query = query.Where(b => b.Type == type.Value);

            if (leagueId.HasValue)
                query = query.Where(b => b.LeagueId == leagueId.Value);

            var bets = await query
                .Include(b => b.User)
                .Include(b => b.League)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team1User)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team2User)
                .Include(b => b.GameBet)
                .Include(b => b.SettledByAdmin)
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return bets.Select(ConvertToBetDto).ToList();
        }

        /// <summary>
        /// Gets a specific bet for a user
        /// </summary>
        public async Task<BetDto?> GetUserBetAsync(int userId, int betId)
        {
            var bet = await _context.Bets
                .Include(b => b.User)
                .Include(b => b.League)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team1User)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team2User)
                .Include(b => b.GameBet)
                .Include(b => b.SettledByAdmin)
                .FirstOrDefaultAsync(b => b.Id == betId && b.UserId == userId);

            return bet != null ? ConvertToBetDto(bet) : null;
        }

        /// <summary>
        /// Cancels a user's bet
        /// </summary>
        public async Task<PlaceBetResponseDto> CancelBetAsync(int userId, int betId)
        {
            var bet = await _context.Bets.FirstOrDefaultAsync(b => b.Id == betId && b.UserId == userId);

            if (bet == null)
            {
                return new PlaceBetResponseDto
                {
                    Success = false,
                    ErrorMessage = "Bet not found or you don't have permission to cancel it"
                };
            }

            if (!bet.CanBeCancelled)
            {
                return new PlaceBetResponseDto
                {
                    Success = false,
                    ErrorMessage = "This bet cannot be cancelled"
                };
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                bet.Status = BetStatus.Cancelled;
                bet.SettledAt = DateTime.UtcNow;

                // Return tokens from pending to available
                var success = await ProcessRefundedBetAsync(bet, BetStatus.Cancelled);
                if (!success)
                {
                    await transaction.RollbackAsync();
                    return new PlaceBetResponseDto
                    {
                        Success = false,
                        ErrorMessage = "Failed to refund tokens"
                    };
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var wallet = await _walletService.GetOrCreateWalletAsync(userId);

                return new PlaceBetResponseDto
                {
                    Success = true,
                    Message = "Bet cancelled successfully",
                    BetId = betId,
                    NewTokenBalance = wallet.TokenBalance,
                    NewPendingBalance = wallet.PendingBalance
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error cancelling bet {BetId} for user {UserId}", betId, userId);
                return new PlaceBetResponseDto
                {
                    Success = false,
                    ErrorMessage = "An error occurred while cancelling the bet"
                };
            }
        }

        /// <summary>
        /// Gets user betting statistics
        /// </summary>
        public async Task<BettingStatsDto> GetUserBettingStatsAsync(int userId, int? leagueId = null)
        {
            var query = _context.Bets.Where(b => b.UserId == userId).AsQueryable();

            if (leagueId.HasValue)
                query = query.Where(b => b.LeagueId == leagueId.Value);

            var bets = await query.ToListAsync();

            var totalBets = bets.Count;
            var activeBets = bets.Count(b => b.Status == BetStatus.Active);
            var wonBets = bets.Count(b => b.Status == BetStatus.Won);
            var lostBets = bets.Count(b => b.Status == BetStatus.Lost);
            var totalWagered = bets.Sum(b => b.Amount);
            var totalWon = bets.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout);
            var totalLost = bets.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount);

            return new BettingStatsDto
            {
                TotalBets = totalBets,
                ActiveBets = activeBets,
                WonBets = wonBets,
                LostBets = lostBets,
                TotalWagered = totalWagered,
                TotalWon = totalWon,
                TotalLost = totalLost,
                NetProfit = totalWon - totalLost,
                WinPercentage = (wonBets + lostBets) > 0 ? (decimal)wonBets / (wonBets + lostBets) * 100 : 0,
                ROI = totalWagered > 0 ? ((totalWon - totalLost) / totalWagered) * 100 : 0,
                AverageBetSize = totalBets > 0 ? totalWagered / totalBets : 0,
                LargestWin = bets.Where(b => b.Status == BetStatus.Won).DefaultIfEmpty().Max(b => b?.PotentialPayout ?? 0),
                LargestLoss = bets.Where(b => b.Status == BetStatus.Lost).DefaultIfEmpty().Max(b => b?.Amount ?? 0)
            };
        }

        /// <summary>
        /// Calculates odds for a specific bet selection
        /// </summary>
        public async Task<decimal> CalculateOddsAsync(BetType betType, int? matchupBetId = null, MatchupBetSelection? matchupSelection = null, int? gameBetId = null, GameBetSelection? gameSelection = null)
        {
            if (matchupBetId.HasValue && matchupSelection.HasValue)
            {
                var matchup = await _context.MatchupBets.FindAsync(matchupBetId.Value);
                if (matchup == null) throw new ArgumentException("Matchup bet not found");

                return _oddsService.CalculateMatchupOdds(betType, matchupSelection.Value, matchup);
            }

            if (gameBetId.HasValue && gameSelection.HasValue)
            {
                var game = await _context.GameBets.FindAsync(gameBetId.Value);
                if (game == null) throw new ArgumentException("Game bet not found");

                return _oddsService.GetGameOdds(betType, gameSelection.Value, game);
            }

            throw new ArgumentException("Invalid bet parameters provided");
        }

        /// <summary>
        /// Calculates potential payout for a bet
        /// </summary>
        public async Task<decimal> CalculatePayoutAsync(decimal betAmount, decimal odds)
        {
            return _oddsService.CalculatePayout(betAmount, odds);
        }

        /// <summary>
        /// Calculates Kelly criterion bet size
        /// </summary>
        public async Task<decimal> CalculateKellyBetSizeAsync(decimal bankroll, decimal odds, decimal winProbability)
        {
            return _oddsService.CalculateKellyBetSize(bankroll, odds, winProbability);
        }

        #endregion

        #region Admin Methods

        /// <summary>
        /// Creates a new matchup bet (admin only)
        /// </summary>
        public async Task<MatchupBetDto> CreateMatchupBetAsync(CreateMatchupBetDto dto, int adminUserId)
        {
            var matchup = new MatchupBet
            {
                LeagueId = dto.LeagueId,
                Week = dto.Week,
                Season = dto.Season,
                Sport = dto.Sport,
                Team1UserId = dto.Team1UserId,
                Team2UserId = dto.Team2UserId,
                PointSpread = dto.PointSpread,
                OverUnderLine = dto.OverUnderLine,
                Team1MoneylineOdds = dto.Team1MoneylineOdds,
                Team2MoneylineOdds = dto.Team2MoneylineOdds,
                ExpiresAt = dto.ExpiresAt,
                Notes = dto.Notes,
                CreatedByAdminId = adminUserId,
                CreatedAt = DateTime.UtcNow
            };

            _context.MatchupBets.Add(matchup);
            await _context.SaveChangesAsync();

            return await ConvertToMatchupBetDto(matchup);
        }

        /// <summary>
        /// Creates a new game bet (admin only)
        /// </summary>
        public async Task<GameBetDto> CreateGameBetAsync(CreateGameBetDto dto, int adminUserId)
        {
            var game = new GameBet
            {
                LeagueId = dto.LeagueId,
                ExternalGameId = dto.ExternalGameId,
                Sport = dto.Sport,
                HomeTeam = dto.HomeTeam,
                AwayTeam = dto.AwayTeam,
                GameDateTime = dto.GameDateTime,
                Week = dto.Week,
                Season = dto.Season,
                PointSpread = dto.PointSpread,
                OverUnderLine = dto.OverUnderLine,
                HomeMoneylineOdds = dto.HomeMoneylineOdds,
                AwayMoneylineOdds = dto.AwayMoneylineOdds,
                OverOdds = dto.OverOdds,
                UnderOdds = dto.UnderOdds,
                ExpiresAt = dto.ExpiresAt,
                ExternalDataSource = dto.ExternalDataSource,
                CreatedByAdminId = adminUserId,
                CreatedAt = DateTime.UtcNow,
                GameStatus = GameStatus.Scheduled
            };

            _context.GameBets.Add(game);
            await _context.SaveChangesAsync();

            return ConvertToGameBetDto(game);
        }

        /// <summary>
        /// Gets all bets (admin only)
        /// </summary>
        public async Task<List<BetDto>> GetAllBetsAsync(BetStatus? status = null, BetType? type = null, int? leagueId = null, int? userId = null, int page = 1, int pageSize = 50)
        {
            var query = _context.Bets.AsQueryable();

            if (status.HasValue)
                query = query.Where(b => b.Status == status.Value);

            if (type.HasValue)
                query = query.Where(b => b.Type == type.Value);

            if (leagueId.HasValue)
                query = query.Where(b => b.LeagueId == leagueId.Value);

            if (userId.HasValue)
                query = query.Where(b => b.UserId == userId.Value);

            var bets = await query
                .Include(b => b.User)
                .Include(b => b.League)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team1User)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team2User)
                .Include(b => b.GameBet)
                .Include(b => b.SettledByAdmin)
                .OrderByDescending(b => b.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return bets.Select(ConvertToBetDto).ToList();
        }

        /// <summary>
        /// Gets a bet by ID (admin only)
        /// </summary>
        public async Task<BetDto?> GetBetAsync(int betId)
        {
            var bet = await _context.Bets
                .Include(b => b.User)
                .Include(b => b.League)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team1User)
                .Include(b => b.MatchupBet)
                    .ThenInclude(mb => mb!.Team2User)
                .Include(b => b.GameBet)
                .Include(b => b.SettledByAdmin)
                .FirstOrDefaultAsync(b => b.Id == betId);

            return bet != null ? ConvertToBetDto(bet) : null;
        }

        /// <summary>
        /// Gets all matchup bets (admin only)
        /// </summary>
        public async Task<List<MatchupBetDto>> GetAllMatchupBetsAsync(int? leagueId = null, int? week = null, int? season = null, string? sport = null, bool? isSettled = null, int page = 1, int pageSize = 50)
        {
            var query = _context.MatchupBets.AsQueryable();

            if (leagueId.HasValue)
                query = query.Where(mb => mb.LeagueId == leagueId.Value);

            if (week.HasValue)
                query = query.Where(mb => mb.Week == week.Value);

            if (season.HasValue)
                query = query.Where(mb => mb.Season == season.Value);

            if (!string.IsNullOrEmpty(sport))
                query = query.Where(mb => mb.Sport == sport);

            if (isSettled.HasValue)
                query = query.Where(mb => mb.IsSettled == isSettled.Value);

            var matchups = await query
                .Include(mb => mb.League)
                .Include(mb => mb.Team1User)
                .Include(mb => mb.Team2User)
                .Include(mb => mb.CreatedByAdmin)
                .OrderByDescending(mb => mb.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<MatchupBetDto>();
            foreach (var matchup in matchups)
            {
                result.Add(await ConvertToMatchupBetDto(matchup));
            }

            return result;
        }

        /// <summary>
        /// Gets all game bets (admin only)
        /// </summary>
        public async Task<List<GameBetDto>> GetAllGameBetsAsync(int? leagueId = null, string? sport = null, GameStatus? gameStatus = null, bool? isSettled = null, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 50)
        {
            var query = _context.GameBets.AsQueryable();

            if (leagueId.HasValue)
                query = query.Where(gb => gb.LeagueId == leagueId.Value);

            if (!string.IsNullOrEmpty(sport))
                query = query.Where(gb => gb.Sport == sport);

            if (gameStatus.HasValue)
                query = query.Where(gb => gb.GameStatus == gameStatus.Value);

            if (isSettled.HasValue)
                query = query.Where(gb => gb.IsSettled == isSettled.Value);

            if (startDate.HasValue)
                query = query.Where(gb => gb.GameDateTime >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(gb => gb.GameDateTime <= endDate.Value);

            var games = await query
                .Include(gb => gb.League)
                .Include(gb => gb.CreatedByAdmin)
                .OrderBy(gb => gb.GameDateTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return games.Select(game => ConvertToGameBetDto(game)).ToList();
        }

        /// <summary>
        /// Gets system betting statistics (admin only)
        /// </summary>
        public async Task<object> GetSystemBettingStatsAsync()
        {
            var totalBets = await _context.Bets.CountAsync();
            var activeBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Active);
            var settledBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Won || b.Status == BetStatus.Lost);
            var totalWagered = await _context.Bets.SumAsync(b => b.Amount);
            var totalPayouts = await _context.Bets.Where(b => b.Status == BetStatus.Won).SumAsync(b => b.PotentialPayout);
            var houseProfit = await _context.Bets.Where(b => b.Status == BetStatus.Lost).SumAsync(b => b.Amount) - totalPayouts;

            return new
            {
                TotalBets = totalBets,
                ActiveBets = activeBets,
                SettledBets = settledBets,
                TotalWagered = totalWagered,
                TotalPayouts = totalPayouts,
                HouseProfit = houseProfit,
                TotalMatchupBets = await _context.MatchupBets.CountAsync(),
                TotalGameBets = await _context.GameBets.CountAsync(),
                PendingSettlements = await _context.Bets.CountAsync(b => b.Status == BetStatus.Pending)
            };
        }

        /// <summary>
        /// Updates a matchup bet (admin only)
        /// </summary>
        public async Task<MatchupBetDto?> UpdateMatchupBetAsync(int matchupBetId, CreateMatchupBetDto dto, int adminUserId)
        {
            var matchup = await _context.MatchupBets.FindAsync(matchupBetId);
            if (matchup == null) return null;

            // Don't allow updates if there are active bets
            var hasBets = await _context.Bets.AnyAsync(b => b.MatchupBetId == matchupBetId && b.Status == BetStatus.Active);
            if (hasBets)
            {
                throw new InvalidOperationException("Cannot update matchup with active bets");
            }

            matchup.PointSpread = dto.PointSpread;
            matchup.OverUnderLine = dto.OverUnderLine;
            matchup.Team1MoneylineOdds = dto.Team1MoneylineOdds;
            matchup.Team2MoneylineOdds = dto.Team2MoneylineOdds;
            matchup.ExpiresAt = dto.ExpiresAt;
            matchup.Notes = dto.Notes;

            await _context.SaveChangesAsync();

            return await ConvertToMatchupBetDto(matchup);
        }

        /// <summary>
        /// Updates a game bet (admin only)
        /// </summary>
        public async Task<GameBetDto?> UpdateGameBetAsync(int gameBetId, CreateGameBetDto dto, int adminUserId)
        {
            var game = await _context.GameBets.FindAsync(gameBetId);
            if (game == null) return null;

            // Don't allow updates if there are active bets
            var hasBets = await _context.Bets.AnyAsync(b => b.GameBetId == gameBetId && b.Status == BetStatus.Active);
            if (hasBets)
            {
                throw new InvalidOperationException("Cannot update game with active bets");
            }

            game.PointSpread = dto.PointSpread;
            game.OverUnderLine = dto.OverUnderLine;
            game.HomeMoneylineOdds = dto.HomeMoneylineOdds;
            game.AwayMoneylineOdds = dto.AwayMoneylineOdds;
            game.OverOdds = dto.OverOdds;
            game.UnderOdds = dto.UnderOdds;
            game.ExpiresAt = dto.ExpiresAt;

            await _context.SaveChangesAsync();

            return ConvertToGameBetDto(game);
        }

        /// <summary>
        /// Deletes a matchup bet (admin only)
        /// </summary>
        public async Task<bool> DeleteMatchupBetAsync(int matchupBetId, int adminUserId)
        {
            var matchup = await _context.MatchupBets.FindAsync(matchupBetId);
            if (matchup == null) return false;

            // Don't allow deletion if there are any bets
            var hasBets = await _context.Bets.AnyAsync(b => b.MatchupBetId == matchupBetId);
            if (hasBets)
            {
                throw new InvalidOperationException("Cannot delete matchup with existing bets");
            }

            _context.MatchupBets.Remove(matchup);
            await _context.SaveChangesAsync();

            return true;
        }

        /// <summary>
        /// Deletes a game bet (admin only)
        /// </summary>
        public async Task<bool> DeleteGameBetAsync(int gameBetId, int adminUserId)
        {
            var game = await _context.GameBets.FindAsync(gameBetId);
            if (game == null) return false;

            // Don't allow deletion if there are any bets
            var hasBets = await _context.Bets.AnyAsync(b => b.GameBetId == gameBetId);
            if (hasBets)
            {
                throw new InvalidOperationException("Cannot delete game with existing bets");
            }

            _context.GameBets.Remove(game);
            await _context.SaveChangesAsync();

            return true;
        }

        #endregion

        #region Helper Methods - DTO Conversion

        private BetDto ConvertToBetDto(Bet bet)
        {
            var dto = new BetDto
            {
                Id = bet.Id,
                UserId = bet.UserId,
                UserName = bet.User.Username,
                LeagueId = bet.LeagueId,
                LeagueName = bet.League.Name,
                Type = bet.Type,
                TypeDisplayName = bet.Type.GetBetTypeDisplayName(),
                Amount = bet.Amount,
                PotentialPayout = bet.PotentialPayout,
                Odds = bet.Odds,
                Status = bet.Status,
                StatusDisplayName = bet.Status.GetBetStatusDisplayName(),
                ExpiresAt = bet.ExpiresAt,
                CreatedAt = bet.CreatedAt,
                SettledAt = bet.SettledAt,
                Notes = bet.Notes,
                SettlementNotes = bet.SettlementNotes,
                SettledByAdminName = bet.SettledByAdmin != null
                    ? $"{bet.SettledByAdmin.FirstName} {bet.SettledByAdmin.LastName}"
                    : null,
                CanBeCancelled = bet.CanBeCancelled,
                IsExpired = bet.IsExpired,
                ImpliedProbability = _oddsService.CalculateImpliedProbability(bet.Odds)
            };

            // Add specific bet details
            if (bet.MatchupBet != null)
            {
                dto.MatchupBet = ConvertToMatchupBetDto(bet.MatchupBet, bet).Result;
            }
            else if (bet.GameBet != null)
            {
                dto.GameBet = ConvertToGameBetDto(bet.GameBet, bet);
            }

            return dto;
        }

        private async Task<MatchupBetDto> ConvertToMatchupBetDto(MatchupBet matchup, Bet? userBet = null)
        {
            // Load related entities if not already loaded
            if (matchup.Team1User == null || matchup.Team2User == null)
            {
                await _context.Entry(matchup)
                    .Reference(m => m.Team1User)
                    .LoadAsync();
                await _context.Entry(matchup)
                    .Reference(m => m.Team2User)
                    .LoadAsync();
            }

            return new MatchupBetDto
            {
                Id = matchup.Id,
                Week = matchup.Week,
                Season = matchup.Season,
                Sport = matchup.Sport,
                Team1UserId = matchup.Team1UserId,
                Team1UserName = matchup.Team1User.Username,
                Team2UserId = matchup.Team2UserId,
                Team2UserName = matchup.Team2User.Username,
                PointSpread = matchup.PointSpread,
                OverUnderLine = matchup.OverUnderLine,
                UserSelection = userBet?.MatchupSelection,
                SelectionDisplayName = userBet?.MatchupSelection?.GetMatchupSelectionDisplayName(),
                Team1Score = matchup.Team1Score,
                Team2Score = matchup.Team2Score,
                TotalScore = matchup.TotalScore,
                IsSettled = matchup.IsSettled,
                SettledAt = matchup.SettledAt,
                WinnerUserId = matchup.WinnerUserId,
                WinnerUserName = matchup.WinnerUserId.HasValue
                    ? (matchup.WinnerUserId == matchup.Team1UserId ? matchup.Team1User.Username : matchup.Team2User.Username)
                    : null,
                CanBeSettled = !matchup.IsSettled
            };
        }

        private GameBetDto ConvertToGameBetDto(GameBet game, Bet? userBet = null)
        {
            return new GameBetDto
            {
                Id = game.Id,
                ExternalGameId = game.ExternalGameId,
                Sport = game.Sport,
                HomeTeam = game.HomeTeam,
                AwayTeam = game.AwayTeam,
                GameDateTime = game.GameDateTime,
                Week = game.Week,
                Season = game.Season,
                PointSpread = game.PointSpread,
                OverUnderLine = game.OverUnderLine,
                HomeMoneylineOdds = game.HomeMoneylineOdds,
                AwayMoneylineOdds = game.AwayMoneylineOdds,
                OverOdds = game.OverOdds,
                UnderOdds = game.UnderOdds,
                UserSelection = userBet?.GameSelection,
                SelectionDisplayName = userBet?.GameSelection?.GetGameSelectionDisplayName(),
                HomeScore = game.HomeScore,
                AwayScore = game.AwayScore,
                GameStatus = game.GameStatus,
                GameStatusDisplayName = game.GameStatus.GetGameStatusDisplayName(),
                IsSettled = game.IsSettled,
                SettledAt = game.SettledAt,
                ExternalDataSource = game.ExternalDataSource,
                LastExternalUpdate = game.LastExternalUpdate,
                CanBeSettled = !game.IsSettled && game.GameStatus == GameStatus.Final,
                IsLive = game.GameStatus == GameStatus.InProgress,
                IsGameTime = game.IsGameTime
            };
        }

        #endregion
    }
}