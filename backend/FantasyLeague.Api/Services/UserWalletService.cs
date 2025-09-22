using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Services
{
    public class UserWalletService
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<UserWalletService> _logger;

        public UserWalletService(FantasyLeagueContext context, ILogger<UserWalletService> logger)
        {
            _context = context;
            _logger = logger;
        }

        #region Wallet Management

        /// <summary>
        /// Gets or creates a wallet for the specified user
        /// </summary>
        public async Task<UserWallet> GetOrCreateWalletAsync(int userId)
        {
            var wallet = await _context.UserWallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null)
            {
                // Check if user exists before creating wallet
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (!userExists)
                {
                    _logger.LogError("Cannot create wallet for user {UserId} - user does not exist", userId);
                    throw new InvalidOperationException($"User with ID {userId} does not exist");
                }

                wallet = new UserWallet
                {
                    UserId = userId,
                    TokenBalance = 0.00m,
                    PendingBalance = 0.00m,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.UserWallets.Add(wallet);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created new wallet for user {UserId}", userId);
            }

            return wallet;
        }

        /// <summary>
        /// Gets wallet balance for a user
        /// </summary>
        public async Task<TokenBalanceResponseDto?> GetWalletBalanceAsync(int userId)
        {
            var wallet = await _context.UserWallets
                .FirstOrDefaultAsync(w => w.UserId == userId);

            if (wallet == null)
                return null;

            return new TokenBalanceResponseDto
            {
                TokenBalance = wallet.TokenBalance,
                PendingBalance = wallet.PendingBalance,
                TotalBalance = wallet.TotalBalance,
                LastUpdated = wallet.UpdatedAt
            };
        }

        #endregion

        #region Token Transactions

        /// <summary>
        /// Adds tokens to a user's wallet (for testing or admin purposes)
        /// </summary>
        public async Task<bool> AddTokensAsync(int userId, decimal amount, string description,
            TokenTransactionType type = TokenTransactionType.AdminCredit, int? adminUserId = null)
        {
            if (amount <= 0)
            {
                _logger.LogWarning("Attempted to add non-positive amount {Amount} to user {UserId}", amount, userId);
                return false;
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);
                var balanceBefore = wallet.TokenBalance;

                // Update wallet balance
                wallet.TokenBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                // Create transaction record
                var tokenTransaction = new TokenTransaction
                {
                    UserId = userId,
                    Type = type,
                    Amount = amount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = wallet.TokenBalance,
                    Description = description,
                    Status = TokenTransactionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    ProcessedAt = DateTime.UtcNow,
                    ProcessedByAdminId = adminUserId
                };

                _context.TokenTransactions.Add(tokenTransaction);

                // Update system pool
                await UpdateSystemPoolAsync(amount, 0, type);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Added {Amount} tokens to user {UserId}. New balance: {NewBalance}",
                    amount, userId, wallet.TokenBalance);

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to add tokens to user {UserId}", userId);
                return false;
            }
        }

        /// <summary>
        /// Removes tokens from a user's wallet (admin purposes)
        /// </summary>
        public async Task<bool> RemoveTokensAsync(int userId, decimal amount, string description, int adminUserId)
        {
            if (amount <= 0)
            {
                _logger.LogWarning("Attempted to remove non-positive amount {Amount} from user {UserId}", amount, userId);
                return false;
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);

                if (wallet.TokenBalance < amount)
                {
                    _logger.LogWarning("Insufficient balance to remove {Amount} from user {UserId}. Current balance: {Balance}",
                        amount, userId, wallet.TokenBalance);
                    return false;
                }

                var balanceBefore = wallet.TokenBalance;

                // Update wallet balance
                wallet.TokenBalance -= amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                // Create transaction record
                var tokenTransaction = new TokenTransaction
                {
                    UserId = userId,
                    Type = TokenTransactionType.AdminDebit,
                    Amount = amount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = wallet.TokenBalance,
                    Description = description,
                    Status = TokenTransactionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    ProcessedAt = DateTime.UtcNow,
                    ProcessedByAdminId = adminUserId
                };

                _context.TokenTransactions.Add(tokenTransaction);

                // Update system pool
                await UpdateSystemPoolAsync(-amount, 0, TokenTransactionType.AdminDebit);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Removed {Amount} tokens from user {UserId}. New balance: {NewBalance}",
                    amount, userId, wallet.TokenBalance);

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to remove tokens from user {UserId}", userId);
                return false;
            }
        }

        /// <summary>
        /// Moves tokens from available balance to pending (for bet placement)
        /// </summary>
        public async Task<bool> MoveToPendingAsync(int userId, decimal amount, string description, int? betId = null)
        {
            if (amount <= 0)
                return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var (success, _) = await MoveToPendingInternalAsync(userId, amount, description, betId);
                if (!success)
                {
                    await transaction.RollbackAsync();
                    return false;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to move tokens to pending for user {UserId}", userId);
                return false;
            }
        }

        /// <summary>
        /// Internal method to move tokens to pending without creating a transaction (for use within existing transactions)
        /// </summary>
        public async Task<(bool success, TokenTransaction? transaction)> MoveToPendingInternalAsync(int userId, decimal amount, string description, int? betId = null)
        {
            if (amount <= 0)
                return (false, null);

            var wallet = await GetOrCreateWalletAsync(userId);

            if (wallet.TokenBalance < amount)
                return (false, null);

            var balanceBefore = wallet.TokenBalance;

            // Move tokens from available to pending
            wallet.TokenBalance -= amount;
            wallet.PendingBalance += amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            // Create transaction record
            var tokenTransaction = new TokenTransaction
            {
                UserId = userId,
                Type = TokenTransactionType.BetPlaced,
                Amount = amount,
                BalanceBefore = balanceBefore,
                BalanceAfter = wallet.TokenBalance,
                Description = description,
                Status = TokenTransactionStatus.Completed,
                CreatedAt = DateTime.UtcNow,
                ProcessedAt = DateTime.UtcNow,
                RelatedBetId = betId
            };

            _context.TokenTransactions.Add(tokenTransaction);
            return (true, tokenTransaction);
        }

        /// <summary>
        /// Moves tokens from pending back to available (bet win/refund)
        /// </summary>
        public async Task<bool> MoveFromPendingAsync(int userId, decimal amount, string description,
            TokenTransactionType type, int? betId = null)
        {
            if (amount <= 0)
                return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);

                if (wallet.PendingBalance < amount)
                    return false;

                var balanceBefore = wallet.TokenBalance;

                // Move tokens from pending to available
                wallet.PendingBalance -= amount;
                wallet.TokenBalance += amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                // Create transaction record
                var tokenTransaction = new TokenTransaction
                {
                    UserId = userId,
                    Type = type,
                    Amount = amount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = wallet.TokenBalance,
                    Description = description,
                    Status = TokenTransactionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    ProcessedAt = DateTime.UtcNow,
                    RelatedBetId = betId
                };

                _context.TokenTransactions.Add(tokenTransaction);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to move tokens from pending for user {UserId}", userId);
                return false;
            }
        }

        /// <summary>
        /// Removes tokens from pending (bet loss)
        /// </summary>
        public async Task<bool> RemoveFromPendingAsync(int userId, decimal amount, string description, int? betId = null)
        {
            if (amount <= 0)
                return false;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var wallet = await GetOrCreateWalletAsync(userId);

                if (wallet.PendingBalance < amount)
                    return false;

                var balanceBefore = wallet.TokenBalance;

                // Remove tokens from pending (lost bet)
                wallet.PendingBalance -= amount;
                wallet.UpdatedAt = DateTime.UtcNow;

                // Create transaction record
                var tokenTransaction = new TokenTransaction
                {
                    UserId = userId,
                    Type = TokenTransactionType.BetLost,
                    Amount = amount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = wallet.TokenBalance,
                    Description = description,
                    Status = TokenTransactionStatus.Completed,
                    CreatedAt = DateTime.UtcNow,
                    ProcessedAt = DateTime.UtcNow,
                    RelatedBetId = betId
                };

                _context.TokenTransactions.Add(tokenTransaction);

                // Update system pool (house wins)
                await UpdateSystemPoolAsync(0, amount, TokenTransactionType.BetLost);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to remove tokens from pending for user {UserId}", userId);
                return false;
            }
        }

        #endregion

        #region Transaction History

        /// <summary>
        /// Gets transaction history for a user with pagination
        /// </summary>
        public async Task<TokenTransactionHistoryDto> GetTransactionHistoryAsync(int userId, int page = 1, int pageSize = 50)
        {
            var query = _context.TokenTransactions
                .Where(t => t.UserId == userId)
                .Include(t => t.ProcessedByAdmin)
                .OrderByDescending(t => t.CreatedAt);

            var totalCount = await query.CountAsync();
            var transactions = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var transactionDtos = transactions.Select(t => new TokenTransactionDto
            {
                Id = t.Id,
                UserId = t.UserId,
                Type = t.Type,
                TypeDisplayName = t.Type.GetTypeDisplayName(),
                Amount = t.Amount,
                BalanceBefore = t.BalanceBefore,
                BalanceAfter = t.BalanceAfter,
                Description = t.Description,
                Status = t.Status,
                StatusDisplayName = t.Status.GetStatusDisplayName(),
                CreatedAt = t.CreatedAt,
                ProcessedAt = t.ProcessedAt,
                RelatedBetId = t.RelatedBetId,
                ProcessedByAdminName = t.ProcessedByAdmin != null
                    ? $"{t.ProcessedByAdmin.FirstName} {t.ProcessedByAdmin.LastName}"
                    : null
            }).ToList();

            return new TokenTransactionHistoryDto
            {
                Transactions = transactionDtos,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                HasNextPage = page * pageSize < totalCount,
                HasPreviousPage = page > 1
            };
        }

        #endregion

        #region System Pool Management

        /// <summary>
        /// Gets or creates the system token pool
        /// </summary>
        public async Task<SystemTokenPool> GetOrCreateSystemPoolAsync()
        {
            var pool = await _context.SystemTokenPools.FirstOrDefaultAsync();

            if (pool == null)
            {
                pool = new SystemTokenPool
                {
                    TotalTokensIssued = 0.00m,
                    TotalTokensInCirculation = 0.00m,
                    TotalCashedOut = 0.00m,
                    HouseBalance = 0.00m,
                    TotalRevenue = 0.00m,
                    TotalPayouts = 0.00m,
                    LastUpdated = DateTime.UtcNow
                };

                _context.SystemTokenPools.Add(pool);
                await _context.SaveChangesAsync();
            }

            return pool;
        }

        /// <summary>
        /// Updates the system token pool
        /// </summary>
        private async Task UpdateSystemPoolAsync(decimal issuedChange, decimal houseChange, TokenTransactionType type)
        {
            var pool = await GetOrCreateSystemPoolAsync();

            switch (type)
            {
                case TokenTransactionType.Purchase:
                    pool.TotalTokensIssued += issuedChange;
                    pool.TotalTokensInCirculation += issuedChange;
                    pool.TotalRevenue += issuedChange;
                    break;

                case TokenTransactionType.AdminCredit:
                    pool.TotalTokensIssued += issuedChange;
                    pool.TotalTokensInCirculation += issuedChange;
                    break;

                case TokenTransactionType.AdminDebit:
                    pool.TotalTokensInCirculation += issuedChange; // issuedChange will be negative
                    break;

                case TokenTransactionType.BetLost:
                    pool.HouseBalance += houseChange;
                    break;

                case TokenTransactionType.CashoutCompleted:
                    pool.TotalTokensInCirculation += issuedChange; // issuedChange will be negative
                    pool.TotalCashedOut -= issuedChange; // issuedChange will be negative, so this increases TotalCashedOut
                    pool.TotalPayouts -= issuedChange; // issuedChange will be negative, so this increases TotalPayouts
                    break;
            }

            pool.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// Gets system token pool statistics
        /// </summary>
        public async Task<SystemTokenPoolDto> GetSystemPoolStatsAsync()
        {
            var pool = await GetOrCreateSystemPoolAsync();

            return new SystemTokenPoolDto
            {
                Id = pool.Id,
                TotalTokensIssued = pool.TotalTokensIssued,
                TotalTokensInCirculation = pool.TotalTokensInCirculation,
                TotalCashedOut = pool.TotalCashedOut,
                HouseBalance = pool.HouseBalance,
                TotalRevenue = pool.TotalRevenue,
                TotalPayouts = pool.TotalPayouts,
                NetRevenue = pool.NetRevenue,
                TokenUtilizationRate = pool.TokenUtilizationRate,
                LastUpdated = pool.LastUpdated
            };
        }

        #endregion

        #region Admin Functions

        /// <summary>
        /// Gets all user wallets for admin dashboard
        /// </summary>
        public async Task<List<UserWalletSummaryDto>> GetAllWalletsAsync(int limit = 100)
        {
            var wallets = await _context.UserWallets
                .Include(w => w.User)
                .Include(w => w.Transactions)
                .OrderByDescending(w => w.TotalBalance)
                .Take(limit)
                .ToListAsync();

            return wallets.Select(w => new UserWalletSummaryDto
            {
                UserId = w.UserId,
                UserName = w.User.Username,
                FirstName = w.User.FirstName ?? "",
                LastName = w.User.LastName ?? "",
                TokenBalance = w.TokenBalance,
                PendingBalance = w.PendingBalance,
                TotalBalance = w.TotalBalance,
                LastTransactionDate = w.Transactions.Any()
                    ? w.Transactions.Max(t => t.CreatedAt)
                    : w.CreatedAt
            }).ToList();
        }

        /// <summary>
        /// Gets token statistics for admin dashboard
        /// </summary>
        public async Task<TokenStatisticsDto> GetTokenStatisticsAsync()
        {
            var now = DateTime.UtcNow;
            var today = now.Date;
            var weekStart = today.AddDays(-(int)today.DayOfWeek);
            var monthStart = new DateTime(today.Year, today.Month, 1);

            var wallets = await _context.UserWallets.ToListAsync();
            var transactions = await _context.TokenTransactions
                .Where(t => t.Status == TokenTransactionStatus.Completed)
                .ToListAsync();

            var todayTransactions = transactions.Where(t => t.CreatedAt.Date == today).ToList();
            var weekTransactions = transactions.Where(t => t.CreatedAt.Date >= weekStart).ToList();
            var monthTransactions = transactions.Where(t => t.CreatedAt.Date >= monthStart).ToList();

            var activeWallets = wallets.Where(w => w.TotalBalance > 0).ToList();
            var balances = activeWallets.Select(w => w.TotalBalance).OrderBy(b => b).ToList();

            return new TokenStatisticsDto
            {
                TotalActiveWallets = activeWallets.Count,
                TransactionsToday = todayTransactions.Count,
                VolumeToday = todayTransactions.Sum(t => t.Amount),
                TransactionsThisWeek = weekTransactions.Count,
                VolumeThisWeek = weekTransactions.Sum(t => t.Amount),
                TransactionsThisMonth = monthTransactions.Count,
                VolumeThisMonth = monthTransactions.Sum(t => t.Amount),
                AverageWalletBalance = activeWallets.Any() ? activeWallets.Average(w => w.TotalBalance) : 0,
                MedianWalletBalance = balances.Any()
                    ? balances.Count % 2 == 0
                        ? (balances[balances.Count / 2 - 1] + balances[balances.Count / 2]) / 2
                        : balances[balances.Count / 2]
                    : 0
            };
        }

        #endregion
    }
}