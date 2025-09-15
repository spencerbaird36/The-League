using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailTestController : ControllerBase
    {
        private readonly IBackgroundEmailService _backgroundEmailService;
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<EmailTestController> _logger;

        public EmailTestController(
            IBackgroundEmailService backgroundEmailService,
            FantasyLeagueContext context,
            ILogger<EmailTestController> logger)
        {
            _backgroundEmailService = backgroundEmailService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Test trade proposal email notification
        /// </summary>
        [HttpPost("trade-proposal")]
        public async Task<ActionResult> TestTradeProposalEmail([FromBody] TestEmailRequest request)
        {
            try
            {
                // Find the target user by email
                var targetUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == request.TargetEmail);

                if (targetUser == null)
                {
                    return NotFound($"User with email {request.TargetEmail} not found");
                }

                // Find a proposing user (use any other user in the same league)
                var proposingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.LeagueId == targetUser.LeagueId && u.Id != targetUser.Id);

                if (proposingUser == null)
                {
                    return NotFound($"No other users found in league {targetUser.LeagueId} to send test from");
                }

                _logger.LogInformation($"Testing trade proposal email: from {proposingUser.Email} to {targetUser.Email}");

                // Check user preferences
                _logger.LogInformation($"Target user email settings - EmailNotifications: {targetUser.EmailNotificationsEnabled}, TradeProposals: {targetUser.TradeProposalEmailsEnabled}");

                // Queue test trade proposal email
                await _backgroundEmailService.QueueTradeProposalEmailAsync(
                    targetUser.Id,
                    proposingUser.Id,
                    "This is a test trade proposal email",
                    null // no trade proposal ID for test
                );

                return Ok(new
                {
                    message = "Test trade proposal email queued successfully",
                    targetUser = new { targetUser.Email, targetUser.Username },
                    proposingUser = new { proposingUser.Email, proposingUser.Username },
                    emailNotificationsEnabled = targetUser.EmailNotificationsEnabled,
                    tradeProposalEmailsEnabled = targetUser.TradeProposalEmailsEnabled
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending test trade proposal email");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Check user email settings
        /// </summary>
        [HttpGet("user-settings/{email}")]
        public async Task<ActionResult> GetUserEmailSettings(string email)
        {
            try
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (user == null)
                {
                    return NotFound($"User with email {email} not found");
                }

                return Ok(new
                {
                    user.Id,
                    user.Email,
                    user.Username,
                    user.FirstName,
                    user.LastName,
                    user.EmailNotificationsEnabled,
                    user.TradeProposalEmailsEnabled,
                    user.TradeResponseEmailsEnabled,
                    user.LeagueId
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting user email settings for {email}");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Update user email settings
        /// </summary>
        [HttpPut("user-settings/{email}")]
        public async Task<ActionResult> UpdateUserEmailSettings(string email, [FromBody] UpdateEmailSettingsRequest request)
        {
            try
            {
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == email);

                if (user == null)
                {
                    return NotFound($"User with email {email} not found");
                }

                user.EmailNotificationsEnabled = request.EmailNotificationsEnabled;
                user.TradeProposalEmailsEnabled = request.TradeProposalEmailsEnabled;
                user.TradeResponseEmailsEnabled = request.TradeResponseEmailsEnabled;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Updated email settings for {email}");

                return Ok(new
                {
                    message = "Email settings updated successfully",
                    user.Email,
                    user.EmailNotificationsEnabled,
                    user.TradeProposalEmailsEnabled,
                    user.TradeResponseEmailsEnabled
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating email settings for {email}");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get recent email delivery logs
        /// </summary>
        [HttpGet("delivery-logs")]
        public async Task<ActionResult> GetEmailDeliveryLogs([FromQuery] int limit = 10)
        {
            try
            {
                var logs = await _context.EmailDeliveryLogs
                    .Include(e => e.User)
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(limit)
                    .Select(e => new
                    {
                        e.Id,
                        e.EmailAddress,
                        e.EmailType,
                        e.Subject,
                        e.Status,
                        e.CreatedAt,
                        e.SentAt,
                        e.DeliveredAt,
                        e.ErrorMessage,
                        e.RetryCount,
                        UserName = e.User != null ? e.User.Username : null
                    })
                    .ToListAsync();

                return Ok(logs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting email delivery logs");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }
    }

    public class TestEmailRequest
    {
        public string TargetEmail { get; set; } = string.Empty;
    }

    public class UpdateEmailSettingsRequest
    {
        public bool EmailNotificationsEnabled { get; set; } = true;
        public bool TradeProposalEmailsEnabled { get; set; } = true;
        public bool TradeResponseEmailsEnabled { get; set; } = true;
    }
}