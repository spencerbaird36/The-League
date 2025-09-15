using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/admin/tokens")]
    public class AdminTokenController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly UserWalletService _walletService;
        private readonly ILogger<AdminTokenController> _logger;

        public AdminTokenController(
            FantasyLeagueContext context,
            UserWalletService walletService,
            ILogger<AdminTokenController> logger)
        {
            _context = context;
            _walletService = walletService;
            _logger = logger;
        }

        #region Dashboard

        /// <summary>
        /// Get admin token dashboard with overview statistics
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var systemPool = await _walletService.GetSystemPoolStatsAsync();
                var topWallets = await _walletService.GetAllWalletsAsync(10);
                var recentTransactions = await GetRecentTransactionsInternal(20);
                var statistics = await _walletService.GetTokenStatisticsAsync();

                var dashboard = new AdminTokenDashboardDto
                {
                    SystemPool = systemPool,
                    TopWallets = topWallets,
                    RecentTransactions = recentTransactions,
                    Statistics = statistics
                };

                return Ok(dashboard);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting admin token dashboard");
                return StatusCode(500, new { Message = "Error retrieving dashboard data" });
            }
        }

        /// <summary>
        /// Get system token pool details
        /// </summary>
        [HttpGet("system-pool")]
        public async Task<IActionResult> GetSystemPool()
        {
            try
            {
                var poolStats = await _walletService.GetSystemPoolStatsAsync();
                return Ok(poolStats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system pool stats");
                return StatusCode(500, new { Message = "Error retrieving system pool data" });
            }
        }

        #endregion

        #region User Wallet Management

        /// <summary>
        /// Get all user wallets with pagination
        /// </summary>
        [HttpGet("wallets")]
        public async Task<IActionResult> GetAllWallets([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize > 100)
                    pageSize = 100;

                var query = _context.UserWallets
                    .Include(w => w.User)
                    .OrderByDescending(w => w.TotalBalance);

                var totalCount = await query.CountAsync();
                var wallets = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var walletDtos = wallets.Select(w => new UserWalletSummaryDto
                {
                    UserId = w.UserId,
                    UserName = w.User.Username,
                    FirstName = w.User.FirstName ?? "",
                    LastName = w.User.LastName ?? "",
                    TokenBalance = w.TokenBalance,
                    PendingBalance = w.PendingBalance,
                    TotalBalance = w.TotalBalance,
                    LastTransactionDate = w.UpdatedAt
                }).ToList();

                return Ok(new
                {
                    Wallets = walletDtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    HasNextPage = page * pageSize < totalCount,
                    HasPreviousPage = page > 1
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all wallets");
                return StatusCode(500, new { Message = "Error retrieving wallets" });
            }
        }

        /// <summary>
        /// Get specific user's wallet details
        /// </summary>
        [HttpGet("wallets/{userId}")]
        public async Task<IActionResult> GetUserWallet(int userId)
        {
            try
            {
                var wallet = await _context.UserWallets
                    .Include(w => w.User)
                    .Include(w => w.Transactions)
                        .ThenInclude(t => t.ProcessedByAdmin)
                    .FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null)
                {
                    return NotFound(new { Message = "Wallet not found for user" });
                }

                var walletDto = new UserWalletDto
                {
                    Id = wallet.Id,
                    UserId = wallet.UserId,
                    TokenBalance = wallet.TokenBalance,
                    PendingBalance = wallet.PendingBalance,
                    TotalBalance = wallet.TotalBalance,
                    CreatedAt = wallet.CreatedAt,
                    UpdatedAt = wallet.UpdatedAt
                };

                var recentTransactions = wallet.Transactions
                    .OrderByDescending(t => t.CreatedAt)
                    .Take(10)
                    .Select(t => new TokenTransactionDto
                    {
                        Id = t.Id,
                        UserId = t.UserId,
                        UserName = wallet.User.Username,
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

                return Ok(new
                {
                    Wallet = walletDto,
                    RecentTransactions = recentTransactions
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting wallet for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error retrieving wallet" });
            }
        }

        #endregion

        #region Balance Management

        /// <summary>
        /// Adjust user's token balance (add or remove tokens)
        /// </summary>
        [HttpPost("adjust-balance")]
        public async Task<IActionResult> AdjustBalance([FromBody] AdminAdjustBalanceDto dto, [FromQuery] int adminUserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verify admin user exists
                var adminUser = await _context.Users.FindAsync(adminUserId);
                if (adminUser == null)
                {
                    return BadRequest(new { Message = "Admin user not found" });
                }

                // Verify target user exists
                var targetUser = await _context.Users.FindAsync(dto.UserId);
                if (targetUser == null)
                {
                    return NotFound(new { Message = "Target user not found" });
                }

                bool success;
                if (dto.IsCredit)
                {
                    success = await _walletService.AddTokensAsync(
                        dto.UserId,
                        dto.Amount,
                        dto.Reason,
                        TokenTransactionType.AdminCredit,
                        adminUserId
                    );
                }
                else
                {
                    success = await _walletService.RemoveTokensAsync(
                        dto.UserId,
                        Math.Abs(dto.Amount), // Ensure positive amount for removal
                        dto.Reason,
                        adminUserId
                    );
                }

                if (success)
                {
                    // Record admin action
                    var adminAction = new AdminTokenAction
                    {
                        AdminUserId = adminUserId,
                        TargetUserId = dto.UserId,
                        Type = dto.IsCredit ? AdminActionType.AddTokens : AdminActionType.RemoveTokens,
                        Amount = Math.Abs(dto.Amount),
                        Reason = dto.Reason,
                        Status = AdminActionStatus.Completed,
                        CreatedAt = DateTime.UtcNow,
                        ProcessedAt = DateTime.UtcNow
                    };

                    _context.AdminTokenActions.Add(adminAction);
                    await _context.SaveChangesAsync();

                    var newBalance = await _walletService.GetWalletBalanceAsync(dto.UserId);

                    return Ok(new
                    {
                        Success = true,
                        Message = $"Successfully {(dto.IsCredit ? "added" : "removed")} {Math.Abs(dto.Amount):C} tokens",
                        NewBalance = newBalance,
                        AdminAction = new AdminTokenActionDto
                        {
                            Id = adminAction.Id,
                            AdminUserId = adminAction.AdminUserId,
                            AdminUserName = $"{adminUser.FirstName} {adminUser.LastName}",
                            TargetUserId = adminAction.TargetUserId,
                            TargetUserName = $"{targetUser.FirstName} {targetUser.LastName}",
                            Type = adminAction.Type,
                            TypeDisplayName = adminAction.Type.GetActionTypeDisplayName(),
                            Amount = adminAction.Amount,
                            Reason = adminAction.Reason,
                            Status = adminAction.Status,
                            StatusDisplayName = adminAction.Status.GetActionStatusDisplayName(),
                            CreatedAt = adminAction.CreatedAt,
                            ProcessedAt = adminAction.ProcessedAt
                        }
                    });
                }

                return BadRequest(new { Message = "Failed to adjust balance. Check if user has sufficient balance for removal." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adjusting balance for user {UserId} by admin {AdminUserId}", dto.UserId, adminUserId);
                return StatusCode(500, new { Message = "Error adjusting balance" });
            }
        }

        #endregion

        #region Transaction Management

        /// <summary>
        /// Get all token transactions with filtering and pagination
        /// </summary>
        [HttpGet("transactions")]
        public async Task<IActionResult> GetAllTransactions(
            [FromQuery] int? userId = null,
            [FromQuery] TokenTransactionType? type = null,
            [FromQuery] TokenTransactionStatus? status = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize > 100)
                    pageSize = 100;

                var query = _context.TokenTransactions
                    .Include(t => t.User)
                    .Include(t => t.ProcessedByAdmin)
                    .AsQueryable();

                // Apply filters
                if (userId.HasValue)
                    query = query.Where(t => t.UserId == userId.Value);

                if (type.HasValue)
                    query = query.Where(t => t.Type == type.Value);

                if (status.HasValue)
                    query = query.Where(t => t.Status == status.Value);

                if (startDate.HasValue)
                    query = query.Where(t => t.CreatedAt >= startDate.Value);

                if (endDate.HasValue)
                    query = query.Where(t => t.CreatedAt <= endDate.Value);

                query = query.OrderByDescending(t => t.CreatedAt);

                var totalCount = await query.CountAsync();
                var transactions = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var transactionDtos = transactions.Select(t => new TokenTransactionDto
                {
                    Id = t.Id,
                    UserId = t.UserId,
                    UserName = t.User.Username,
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

                return Ok(new
                {
                    Transactions = transactionDtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    HasNextPage = page * pageSize < totalCount,
                    HasPreviousPage = page > 1,
                    Filters = new
                    {
                        UserId = userId,
                        Type = type,
                        Status = status,
                        StartDate = startDate,
                        EndDate = endDate
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all transactions");
                return StatusCode(500, new { Message = "Error retrieving transactions" });
            }
        }

        #endregion

        #region Admin Actions

        /// <summary>
        /// Get admin action history
        /// </summary>
        [HttpGet("admin-actions")]
        public async Task<IActionResult> GetAdminActions([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize > 100)
                    pageSize = 100;

                var query = _context.AdminTokenActions
                    .Include(a => a.AdminUser)
                    .Include(a => a.TargetUser)
                    .OrderByDescending(a => a.CreatedAt);

                var totalCount = await query.CountAsync();
                var actions = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var actionDtos = actions.Select(a => new AdminTokenActionDto
                {
                    Id = a.Id,
                    AdminUserId = a.AdminUserId,
                    AdminUserName = $"{a.AdminUser.FirstName} {a.AdminUser.LastName}",
                    TargetUserId = a.TargetUserId,
                    TargetUserName = $"{a.TargetUser.FirstName} {a.TargetUser.LastName}",
                    Type = a.Type,
                    TypeDisplayName = a.Type.GetActionTypeDisplayName(),
                    Amount = a.Amount,
                    Reason = a.Reason,
                    Status = a.Status,
                    StatusDisplayName = a.Status.GetActionStatusDisplayName(),
                    CreatedAt = a.CreatedAt,
                    ProcessedAt = a.ProcessedAt,
                    TokenTransactionId = a.TokenTransactionId
                }).ToList();

                return Ok(new
                {
                    Actions = actionDtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    HasNextPage = page * pageSize < totalCount,
                    HasPreviousPage = page > 1
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting admin actions");
                return StatusCode(500, new { Message = "Error retrieving admin actions" });
            }
        }

        #endregion

        #region Statistics

        /// <summary>
        /// Get token system statistics
        /// </summary>
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            try
            {
                var statistics = await _walletService.GetTokenStatisticsAsync();
                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting token statistics");
                return StatusCode(500, new { Message = "Error retrieving statistics" });
            }
        }

        #endregion

        #region Cashout Management

        /// <summary>
        /// Get all cashout requests for admin review
        /// </summary>
        [HttpGet("cashout-requests")]
        public async Task<IActionResult> GetCashoutRequests(
            [FromQuery] CashoutStatus? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize > 100)
                    pageSize = 100;

                var query = _context.CashoutRequests
                    .Include(c => c.User)
                    .Include(c => c.ProcessedByAdmin)
                    .AsQueryable();

                if (status.HasValue)
                    query = query.Where(c => c.Status == status.Value);

                query = query.OrderByDescending(c => c.RequestedAt);

                var totalCount = await query.CountAsync();
                var requests = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var requestDtos = requests.Select(r => new CashoutRequestDetailDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    UserName = r.User.Username,
                    Amount = r.Amount,
                    Method = r.Method,
                    MethodDisplayName = r.Method.GetCashoutMethodDisplayName(),
                    Status = r.Status,
                    StatusDisplayName = r.Status.GetCashoutStatusDisplayName(),
                    RequestedAt = r.RequestedAt,
                    ProcessedAt = r.ProcessedAt,
                    ProcessedByAdminName = r.ProcessedByAdmin != null
                        ? $"{r.ProcessedByAdmin.FirstName} {r.ProcessedByAdmin.LastName}"
                        : null,
                    RejectionReason = r.RejectionReason,
                    RequiresManualReview = r.RequiresManualReview
                }).ToList();

                return Ok(new
                {
                    CashoutRequests = requestDtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    HasNextPage = page * pageSize < totalCount,
                    HasPreviousPage = page > 1,
                    PendingCount = await _context.CashoutRequests.CountAsync(c => c.Status == CashoutStatus.Pending),
                    UnderReviewCount = await _context.CashoutRequests.CountAsync(c => c.Status == CashoutStatus.UnderReview),
                    ProcessingCount = await _context.CashoutRequests.CountAsync(c => c.Status == CashoutStatus.Processing)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cashout requests");
                return StatusCode(500, new { Message = "Error retrieving cashout requests" });
            }
        }

        /// <summary>
        /// Process a cashout request (approve, reject, etc.)
        /// </summary>
        [HttpPost("process-cashout")]
        public async Task<IActionResult> ProcessCashoutRequest([FromBody] ProcessCashoutDto dto, [FromQuery] int adminUserId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verify admin user exists
                var adminUser = await _context.Users.FindAsync(adminUserId);
                if (adminUser == null)
                {
                    return BadRequest(new { Message = "Admin user not found" });
                }

                // Get the cashout request
                var cashoutRequest = await _context.CashoutRequests
                    .Include(c => c.User)
                    .Include(c => c.TokenTransaction)
                    .FirstOrDefaultAsync(c => c.Id == dto.CashoutRequestId);

                if (cashoutRequest == null)
                {
                    return NotFound(new { Message = "Cashout request not found" });
                }

                if (!cashoutRequest.CanBeProcessed)
                {
                    return BadRequest(new { Message = $"Cashout request cannot be processed. Current status: {cashoutRequest.Status}" });
                }

                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    switch (dto.Action.ToLower())
                    {
                        case "approve":
                            await ApproveCashoutAsync(cashoutRequest, adminUserId, dto.Notes);
                            break;

                        case "reject":
                            await RejectCashoutAsync(cashoutRequest, adminUserId, dto.Notes, dto.RejectionReason);
                            break;

                        case "under_review":
                            cashoutRequest.Status = CashoutStatus.UnderReview;
                            cashoutRequest.ProcessedByAdminId = adminUserId;
                            cashoutRequest.ProcessedAt = DateTime.UtcNow;
                            break;

                        default:
                            return BadRequest(new { Message = "Invalid action. Use: approve, reject, or under_review" });
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new
                    {
                        Success = true,
                        Message = $"Cashout request {dto.Action}d successfully",
                        CashoutRequest = new CashoutRequestDetailDto
                        {
                            Id = cashoutRequest.Id,
                            UserId = cashoutRequest.UserId,
                            UserName = cashoutRequest.User.Username,
                            Amount = cashoutRequest.Amount,
                            Method = cashoutRequest.Method,
                            MethodDisplayName = cashoutRequest.Method.GetCashoutMethodDisplayName(),
                            Status = cashoutRequest.Status,
                            StatusDisplayName = cashoutRequest.Status.GetCashoutStatusDisplayName(),
                            RequestedAt = cashoutRequest.RequestedAt,
                            ProcessedAt = cashoutRequest.ProcessedAt,
                            ProcessedByAdminName = $"{adminUser.FirstName} {adminUser.LastName}",
                            RejectionReason = cashoutRequest.RejectionReason,
                            RequiresManualReview = cashoutRequest.RequiresManualReview
                        }
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing cashout request {CashoutRequestId}", dto.CashoutRequestId);
                return StatusCode(500, new { Message = "Error processing cashout request" });
            }
        }

        private async Task ApproveCashoutAsync(CashoutRequest cashoutRequest, int adminUserId, string? notes)
        {
            // Remove tokens from user's balance
            var success = await _walletService.RemoveTokensAsync(
                cashoutRequest.UserId,
                cashoutRequest.Amount,
                $"Cashout approved - Request #{cashoutRequest.Id}",
                adminUserId
            );

            if (!success)
            {
                throw new InvalidOperationException("Failed to remove tokens from user account");
            }

            // Update cashout request status
            cashoutRequest.Status = CashoutStatus.Approved;
            cashoutRequest.ProcessedByAdminId = adminUserId;
            cashoutRequest.ProcessedAt = DateTime.UtcNow;

            // Update the related transaction
            if (cashoutRequest.TokenTransaction != null)
            {
                cashoutRequest.TokenTransaction.Status = TokenTransactionStatus.Completed;
                cashoutRequest.TokenTransaction.ProcessedAt = DateTime.UtcNow;
                cashoutRequest.TokenTransaction.ProcessedByAdminId = adminUserId;
            }

            // In production, here you would:
            // 1. Initiate actual transfer via Stripe, bank, PayPal, etc.
            // 2. Update status to "Processing" if transfer initiated
            // 3. Handle transfer completion via webhooks/callbacks
        }

        private async Task RejectCashoutAsync(CashoutRequest cashoutRequest, int adminUserId, string? notes, string? rejectionReason)
        {
            cashoutRequest.Status = CashoutStatus.Rejected;
            cashoutRequest.ProcessedByAdminId = adminUserId;
            cashoutRequest.ProcessedAt = DateTime.UtcNow;
            cashoutRequest.RejectionReason = rejectionReason;

            // Update the related transaction
            if (cashoutRequest.TokenTransaction != null)
            {
                cashoutRequest.TokenTransaction.Status = TokenTransactionStatus.Cancelled;
                cashoutRequest.TokenTransaction.ProcessedAt = DateTime.UtcNow;
                cashoutRequest.TokenTransaction.ProcessedByAdminId = adminUserId;
            }
        }

        #endregion

        #region Helper Methods

        private async Task<List<TokenTransactionDto>> GetRecentTransactionsInternal(int limit)
        {
            var transactions = await _context.TokenTransactions
                .Include(t => t.User)
                .Include(t => t.ProcessedByAdmin)
                .OrderByDescending(t => t.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return transactions.Select(t => new TokenTransactionDto
            {
                Id = t.Id,
                UserId = t.UserId,
                UserName = t.User.Username,
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
        }

        #endregion
    }
}