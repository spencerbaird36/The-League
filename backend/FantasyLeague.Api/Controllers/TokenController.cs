using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TokenController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly UserWalletService _walletService;
        private readonly ILogger<TokenController> _logger;

        public TokenController(
            FantasyLeagueContext context,
            UserWalletService walletService,
            ILogger<TokenController> logger)
        {
            _context = context;
            _walletService = walletService;
            _logger = logger;
        }

        #region Wallet Balance

        /// <summary>
        /// Get user's current token balance
        /// </summary>
        [HttpGet("balance")]
        public async Task<IActionResult> GetBalance([FromQuery] int? userId)
        {
            if (!userId.HasValue)
            {
                return BadRequest(new { Message = "userId parameter is required" });
            }

            try
            {
                var balance = await _walletService.GetWalletBalanceAsync(userId.Value);
                if (balance == null)
                {
                    // Create wallet if it doesn't exist
                    await _walletService.GetOrCreateWalletAsync(userId.Value);
                    balance = await _walletService.GetWalletBalanceAsync(userId.Value);
                }

                return Ok(balance);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting balance for user {UserId}", userId.Value);
                return StatusCode(500, new { Message = "Error retrieving balance" });
            }
        }

        /// <summary>
        /// Get user's wallet details with transaction summary
        /// </summary>
        [HttpGet("wallet/{userId}")]
        public async Task<IActionResult> GetWallet(int userId)
        {
            try
            {
                var wallet = await _context.UserWallets
                    .Include(w => w.User)
                    .FirstOrDefaultAsync(w => w.UserId == userId);

                if (wallet == null)
                {
                    wallet = await _walletService.GetOrCreateWalletAsync(userId);
                    wallet = await _context.UserWallets
                        .Include(w => w.User)
                        .FirstOrDefaultAsync(w => w.UserId == userId);
                }

                var walletDto = new UserWalletDto
                {
                    Id = wallet!.Id,
                    UserId = wallet.UserId,
                    TokenBalance = wallet.TokenBalance,
                    PendingBalance = wallet.PendingBalance,
                    TotalBalance = wallet.TotalBalance,
                    CreatedAt = wallet.CreatedAt,
                    UpdatedAt = wallet.UpdatedAt
                };

                return Ok(walletDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting wallet for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error retrieving wallet" });
            }
        }

        #endregion

        #region Token Purchase with Stripe Integration

        /// <summary>
        /// Create payment intent for token purchase
        /// </summary>
        [HttpPost("purchase")]
        public async Task<IActionResult> CreateTokenPurchase([FromBody] PurchaseTokensDto dto, [FromQuery] int userId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verify user exists
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { Message = "User not found" });
                }

                // Get StripePaymentService from DI
                var stripeService = HttpContext.RequestServices.GetRequiredService<StripePaymentService>();

                // Create payment intent
                var description = dto.Description ?? $"Token purchase - {dto.Amount:C}";
                var paymentResult = await stripeService.CreatePaymentIntentAsync(userId, dto.Amount, description);

                if (!paymentResult.Success)
                {
                    return BadRequest(new PurchaseTokensResponseDto
                    {
                        Success = false,
                        Message = paymentResult.ErrorMessage ?? "Failed to create payment",
                        Amount = dto.Amount
                    });
                }

                // Create pending transaction record
                var transaction = new TokenTransaction
                {
                    UserId = userId,
                    Type = TokenTransactionType.Purchase,
                    Amount = dto.Amount,
                    BalanceBefore = 0, // Will be updated when payment is confirmed
                    BalanceAfter = 0,  // Will be updated when payment is confirmed
                    Description = description,
                    PaymentIntentId = paymentResult.PaymentIntentId,
                    Status = TokenTransactionStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };

                _context.TokenTransactions.Add(transaction);
                await _context.SaveChangesAsync();

                return Ok(new PurchaseTokensResponseDto
                {
                    Success = true,
                    Message = "Payment intent created successfully",
                    TransactionId = transaction.Id,
                    PaymentIntentClientSecret = paymentResult.ClientSecret,
                    PaymentIntentId = paymentResult.PaymentIntentId,
                    Amount = dto.Amount,
                    Currency = paymentResult.Currency
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating token purchase for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error creating purchase" });
            }
        }

        /// <summary>
        /// Confirm payment and add tokens to user account
        /// </summary>
        [HttpPost("purchase/confirm")]
        public async Task<IActionResult> ConfirmTokenPurchase([FromBody] ConfirmPaymentDto dto, [FromQuery] int userId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Get StripePaymentService from DI
                var stripeService = HttpContext.RequestServices.GetRequiredService<StripePaymentService>();

                // Confirm payment with Stripe
                var confirmResult = await stripeService.ConfirmPaymentIntentAsync(dto.PaymentIntentId, dto.PaymentMethodId);

                // Find the pending transaction
                var transaction = await _context.TokenTransactions
                    .FirstOrDefaultAsync(t => t.PaymentIntentId == dto.PaymentIntentId && t.UserId == userId);

                if (transaction == null)
                {
                    return NotFound(new { Message = "Transaction not found" });
                }

                if (confirmResult.Success && confirmResult.Status == "succeeded")
                {
                    // Payment successful - add tokens to user account
                    var success = await _walletService.AddTokensAsync(
                        userId,
                        confirmResult.Amount,
                        $"Token purchase confirmed - Payment Intent: {dto.PaymentIntentId}",
                        TokenTransactionType.Purchase
                    );

                    if (success)
                    {
                        // Update the transaction status
                        transaction.Status = TokenTransactionStatus.Completed;
                        transaction.ProcessedAt = DateTime.UtcNow;

                        // Update balance info
                        var wallet = await _walletService.GetOrCreateWalletAsync(userId);
                        transaction.BalanceBefore = wallet.TokenBalance - confirmResult.Amount;
                        transaction.BalanceAfter = wallet.TokenBalance;

                        await _context.SaveChangesAsync();

                        var newBalance = await _walletService.GetWalletBalanceAsync(userId);

                        return Ok(new PaymentConfirmationResponseDto
                        {
                            Success = true,
                            Message = $"Payment confirmed! Added {confirmResult.Amount:C} tokens to your account.",
                            PaymentIntentId = dto.PaymentIntentId,
                            Status = confirmResult.Status,
                            Amount = confirmResult.Amount,
                            TransactionId = transaction.Id,
                            NewBalance = newBalance?.TokenBalance
                        });
                    }
                    else
                    {
                        // Payment succeeded but token addition failed
                        transaction.Status = TokenTransactionStatus.Failed;
                        await _context.SaveChangesAsync();

                        return StatusCode(500, new PaymentConfirmationResponseDto
                        {
                            Success = false,
                            Message = "Payment succeeded but failed to add tokens. Please contact support.",
                            PaymentIntentId = dto.PaymentIntentId,
                            ErrorMessage = "Token addition failed"
                        });
                    }
                }
                else
                {
                    // Payment failed
                    transaction.Status = TokenTransactionStatus.Failed;
                    await _context.SaveChangesAsync();

                    return BadRequest(new PaymentConfirmationResponseDto
                    {
                        Success = false,
                        Message = "Payment confirmation failed",
                        PaymentIntentId = dto.PaymentIntentId,
                        Status = confirmResult.Status,
                        ErrorMessage = confirmResult.ErrorMessage
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming token purchase for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error confirming purchase" });
            }
        }

        #endregion

        #region Development/Testing Endpoints

        /// <summary>
        /// Add test tokens to a user's account (for development/testing)
        /// </summary>
        [HttpPost("dev/add-test-tokens")]
        public async Task<IActionResult> AddTestTokens([FromBody] AddTestTokensDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verify user exists
                var user = await _context.Users.FindAsync(dto.UserId);
                if (user == null)
                {
                    return NotFound(new { Message = "User not found" });
                }

                var success = await _walletService.AddTokensAsync(
                    dto.UserId,
                    dto.Amount,
                    $"Test tokens added: {dto.Reason}",
                    TokenTransactionType.AdminCredit
                );

                if (success)
                {
                    var newBalance = await _walletService.GetWalletBalanceAsync(dto.UserId);
                    return Ok(new
                    {
                        Success = true,
                        Message = $"Successfully added {dto.Amount:C} test tokens",
                        NewBalance = newBalance
                    });
                }

                return BadRequest(new { Message = "Failed to add test tokens" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding test tokens to user {UserId}", dto.UserId);
                return StatusCode(500, new { Message = "Error adding test tokens" });
            }
        }

        /// <summary>
        /// Remove test tokens from a user's account (for development/testing)
        /// </summary>
        [HttpPost("dev/remove-test-tokens")]
        public async Task<IActionResult> RemoveTestTokens([FromBody] AddTestTokensDto dto, [FromQuery] int adminUserId = 1)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verify user exists
                var user = await _context.Users.FindAsync(dto.UserId);
                if (user == null)
                {
                    return NotFound(new { Message = "User not found" });
                }

                var success = await _walletService.RemoveTokensAsync(
                    dto.UserId,
                    dto.Amount,
                    $"Test tokens removed: {dto.Reason}",
                    adminUserId
                );

                if (success)
                {
                    var newBalance = await _walletService.GetWalletBalanceAsync(dto.UserId);
                    return Ok(new
                    {
                        Success = true,
                        Message = $"Successfully removed {dto.Amount:C} test tokens",
                        NewBalance = newBalance
                    });
                }

                return BadRequest(new { Message = "Failed to remove test tokens. Check if user has sufficient balance." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing test tokens from user {UserId}", dto.UserId);
                return StatusCode(500, new { Message = "Error removing test tokens" });
            }
        }

        /// <summary>
        /// Get Stripe test cards for development
        /// </summary>
        [HttpGet("dev/stripe-test-cards")]
        public IActionResult GetStripeTestCards()
        {
            try
            {
                var testCards = StripePaymentService.GetTestCards();
                return Ok(new
                {
                    TestCards = testCards,
                    Instructions = new
                    {
                        Message = "Use these test card numbers in Stripe test mode",
                        ExpiryDate = "Any future date (e.g., 12/25)",
                        CVC = "Any 3-digit number (e.g., 123)",
                        PostalCode = "Any valid postal code (e.g., 12345)"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Stripe test cards");
                return StatusCode(500, new { Message = "Error retrieving test cards" });
            }
        }

        /// <summary>
        /// Simulate webhook event for development/testing
        /// </summary>
        [HttpPost("dev/simulate-webhook")]
        public async Task<IActionResult> SimulateWebhook([FromBody] SimulateWebhookDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Get the webhook controller to process the simulated event
                var webhookController = HttpContext.RequestServices.GetRequiredService<StripeWebhookController>();

                // Create a mock webhook result
                var mockResult = new WebhookProcessResult
                {
                    Success = true,
                    EventType = dto.EventType,
                    EventId = $"evt_test_{Guid.NewGuid().ToString("N")[..16]}",
                    PaymentIntentId = dto.PaymentIntentId,
                    UserId = dto.UserId,
                    Amount = dto.Amount
                };

                // Simulate webhook processing based on event type
                switch (dto.EventType.ToLower())
                {
                    case "payment_intent.succeeded":
                        // Find the pending transaction
                        var transaction = await _context.TokenTransactions
                            .FirstOrDefaultAsync(t => t.PaymentIntentId == dto.PaymentIntentId);

                        if (transaction != null && transaction.Status == TokenTransactionStatus.Pending)
                        {
                            // Add tokens to user account
                            var success = await _walletService.AddTokensAsync(
                                dto.UserId,
                                dto.Amount,
                                $"Token purchase confirmed via simulated webhook - Payment Intent: {dto.PaymentIntentId}",
                                TokenTransactionType.Purchase
                            );

                            if (success)
                            {
                                transaction.Status = TokenTransactionStatus.Completed;
                                transaction.ProcessedAt = DateTime.UtcNow;
                                await _context.SaveChangesAsync();

                                return Ok(new
                                {
                                    Success = true,
                                    Message = "Webhook simulation successful - tokens added to user account",
                                    EventType = dto.EventType,
                                    Amount = dto.Amount,
                                    NewBalance = await _walletService.GetWalletBalanceAsync(dto.UserId)
                                });
                            }
                        }
                        break;

                    case "payment_intent.payment_failed":
                    case "payment_intent.canceled":
                        // Mark transaction as failed/cancelled
                        var failedTransaction = await _context.TokenTransactions
                            .FirstOrDefaultAsync(t => t.PaymentIntentId == dto.PaymentIntentId);

                        if (failedTransaction != null && failedTransaction.Status == TokenTransactionStatus.Pending)
                        {
                            failedTransaction.Status = dto.EventType.Contains("failed")
                                ? TokenTransactionStatus.Failed
                                : TokenTransactionStatus.Cancelled;
                            failedTransaction.ProcessedAt = DateTime.UtcNow;
                            await _context.SaveChangesAsync();

                            return Ok(new
                            {
                                Success = true,
                                Message = $"Webhook simulation successful - transaction marked as {failedTransaction.Status}",
                                EventType = dto.EventType
                            });
                        }
                        break;

                    default:
                        return BadRequest(new { Message = $"Unsupported event type for simulation: {dto.EventType}" });
                }

                return Ok(new
                {
                    Success = false,
                    Message = "No pending transaction found for the provided payment intent ID",
                    EventType = dto.EventType
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error simulating webhook event {EventType}", dto.EventType);
                return StatusCode(500, new { Message = "Error simulating webhook" });
            }
        }

        #endregion

        #region Transaction History

        /// <summary>
        /// Get transaction history with pagination (requires userId parameter)
        /// </summary>
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] int? userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            if (!userId.HasValue)
            {
                return BadRequest(new { Message = "userId parameter is required" });
            }

            return await GetUserTransactions(userId.Value, page, pageSize);
        }

        /// <summary>
        /// Get user's transaction history with pagination
        /// </summary>
        [HttpGet("transactions/{userId}")]
        public async Task<IActionResult> GetUserTransactions(int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                if (pageSize > 100)
                    pageSize = 100; // Limit max page size

                var history = await _walletService.GetTransactionHistoryAsync(userId, page, pageSize);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error retrieving transactions" });
            }
        }

        /// <summary>
        /// Get recent transactions across all users (admin view)
        /// </summary>
        [HttpGet("transactions/recent")]
        public async Task<IActionResult> GetRecentTransactions([FromQuery] int limit = 50)
        {
            try
            {
                if (limit > 100)
                    limit = 100; // Limit max results

                var transactions = await _context.TokenTransactions
                    .Include(t => t.User)
                    .Include(t => t.ProcessedByAdmin)
                    .OrderByDescending(t => t.CreatedAt)
                    .Take(limit)
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

                return Ok(transactionDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recent transactions");
                return StatusCode(500, new { Message = "Error retrieving recent transactions" });
            }
        }

        #endregion

        #region Cashout System

        /// <summary>
        /// Request token cashout
        /// </summary>
        [HttpPost("cashout")]
        public async Task<IActionResult> RequestCashout([FromBody] CashoutRequestDto dto, [FromQuery] int userId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Verify user exists
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { Message = "User not found" });
                }

                // Check if user has sufficient balance
                var wallet = await _walletService.GetOrCreateWalletAsync(userId);
                if (wallet.TokenBalance < dto.Amount)
                {
                    return BadRequest(new CashoutResponseDto
                    {
                        Success = false,
                        Message = $"Insufficient balance. Available: {wallet.TokenBalance:C}, Requested: {dto.Amount:C}"
                    });
                }

                // Check for existing pending cashout requests
                var existingPendingRequest = await _context.Set<CashoutRequest>()
                    .FirstOrDefaultAsync(c => c.UserId == userId &&
                                            (c.Status == CashoutStatus.Pending ||
                                             c.Status == CashoutStatus.UnderReview ||
                                             c.Status == CashoutStatus.Processing));

                if (existingPendingRequest != null)
                {
                    return BadRequest(new CashoutResponseDto
                    {
                        Success = false,
                        Message = "You already have a pending cashout request. Please wait for it to be processed."
                    });
                }

                // Create cashout request
                var cashoutRequest = new CashoutRequest
                {
                    UserId = userId,
                    Amount = dto.Amount,
                    Method = dto.Method,
                    PaymentDetails = dto.PaymentDetails, // In production, this should be encrypted
                    Status = CashoutStatus.Pending,
                    RequestedAt = DateTime.UtcNow,
                    Metadata = dto.Notes != null ? $"{{\"notes\":\"{dto.Notes}\"}}" : null
                };

                _context.Set<CashoutRequest>().Add(cashoutRequest);

                // Create corresponding transaction to track the cashout
                var transaction = new TokenTransaction
                {
                    UserId = userId,
                    Type = TokenTransactionType.CashoutRequest,
                    Amount = dto.Amount,
                    BalanceBefore = wallet.TokenBalance,
                    BalanceAfter = wallet.TokenBalance, // Balance doesn't change until approved
                    Description = $"Cashout request via {dto.Method.GetCashoutMethodDisplayName()}",
                    Status = TokenTransactionStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };

                _context.TokenTransactions.Add(transaction);
                await _context.SaveChangesAsync();

                // Link the transaction to the cashout request
                cashoutRequest.TokenTransactionId = transaction.Id;
                await _context.SaveChangesAsync();

                // Calculate estimated processing time
                var estimatedProcessingTime = dto.Method switch
                {
                    CashoutMethod.Stripe => DateTime.UtcNow.AddDays(1),
                    CashoutMethod.BankTransfer => DateTime.UtcNow.AddDays(3),
                    CashoutMethod.PayPal => DateTime.UtcNow.AddDays(2),
                    CashoutMethod.Check => DateTime.UtcNow.AddDays(7),
                    _ => DateTime.UtcNow.AddDays(5)
                };

                return Ok(new CashoutResponseDto
                {
                    Success = true,
                    Message = $"Cashout request submitted successfully. You will receive {dto.Amount:C} via {dto.Method.GetCashoutMethodDisplayName()}.",
                    CashoutRequestId = cashoutRequest.Id,
                    Status = cashoutRequest.Status,
                    EstimatedProcessingTime = estimatedProcessingTime
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing cashout request for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error processing cashout request" });
            }
        }

        /// <summary>
        /// Get user's cashout requests
        /// </summary>
        [HttpGet("cashout/history/{userId}")]
        public async Task<IActionResult> GetCashoutHistory(int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                if (pageSize > 50)
                    pageSize = 50;

                var query = _context.Set<CashoutRequest>()
                    .Where(c => c.UserId == userId)
                    .Include(c => c.ProcessedByAdmin)
                    .OrderByDescending(c => c.RequestedAt);

                var totalCount = await query.CountAsync();
                var requests = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var requestDtos = requests.Select(r => new CashoutRequestDetailDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
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
                    HasPreviousPage = page > 1
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cashout history for user {UserId}", userId);
                return StatusCode(500, new { Message = "Error retrieving cashout history" });
            }
        }

        #endregion

        #region System Health

        /// <summary>
        /// Get system token pool status
        /// </summary>
        [HttpGet("system/status")]
        public async Task<IActionResult> GetSystemStatus()
        {
            try
            {
                var poolStats = await _walletService.GetSystemPoolStatsAsync();
                var tokenStats = await _walletService.GetTokenStatisticsAsync();

                return Ok(new
                {
                    SystemPool = poolStats,
                    Statistics = tokenStats
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system status");
                return StatusCode(500, new { Message = "Error retrieving system status" });
            }
        }

        #endregion
    }
}