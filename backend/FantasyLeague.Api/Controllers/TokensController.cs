using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using System.Security.Claims;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TokensController : ControllerBase
    {
        private readonly UserWalletService _walletService;
        private readonly ILogger<TokensController> _logger;

        public TokensController(
            UserWalletService walletService,
            ILogger<TokensController> logger)
        {
            _walletService = walletService;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                throw new UnauthorizedAccessException("User ID not found in claims");
            }
            return userId;
        }

        [HttpGet("balance")]
        public async Task<ActionResult<object>> GetBalance()
        {
            try
            {
                var userId = GetCurrentUserId();
                var wallet = await _walletService.GetOrCreateWalletAsync(userId);

                return Ok(new
                {
                    totalBalance = wallet.TokenBalance + wallet.PendingBalance,
                    availableBalance = wallet.TokenBalance,
                    lockedBalance = wallet.PendingBalance,
                    lastUpdated = wallet.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting token balance for user");
                return StatusCode(500, new { message = "Error retrieving token balance" });
            }
        }

        [HttpPost("purchase/dev")]
        public async Task<ActionResult<object>> PurchaseTokensDev([FromBody] DevTokenPurchaseRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (request.Amount <= 0 || request.Amount > 10000)
                {
                    return BadRequest(new { message = "Amount must be between 1 and 10,000 tokens" });
                }

                // For development, simulate adding tokens directly
                var success = await _walletService.AddTokensAsync(
                    userId,
                    request.Amount,
                    "Development token purchase",
                    TokenTransactionType.Purchase,
                    null
                );

                if (!success)
                {
                    return BadRequest(new { message = "Failed to add tokens" });
                }

                var wallet = await _walletService.GetOrCreateWalletAsync(userId);

                return Ok(new
                {
                    success = true,
                    tokensAdded = request.Amount,
                    newBalance = wallet.TokenBalance
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in dev token purchase for user");
                return StatusCode(500, new { message = "Error processing token purchase" });
            }
        }

        [HttpGet("transactions")]
        public async Task<ActionResult<object>> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _walletService.GetTransactionHistoryAsync(userId, page, pageSize);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting token transactions for user");
                return StatusCode(500, new { message = "Error retrieving token transactions" });
            }
        }

    }

    public class DevTokenPurchaseRequest
    {
        public decimal Amount { get; set; }
    }
}