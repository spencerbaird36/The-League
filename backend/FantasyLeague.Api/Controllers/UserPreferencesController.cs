using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserPreferencesController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<UserPreferencesController> _logger;

        public UserPreferencesController(FantasyLeagueContext context, ILogger<UserPreferencesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("{userId}/email-preferences")]
        public async Task<ActionResult<EmailPreferencesDto>> GetEmailPreferences(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound("User not found");
                }

                var preferences = new EmailPreferencesDto
                {
                    UserId = user.Id,
                    EmailNotificationsEnabled = user.EmailNotificationsEnabled,
                    TradeProposalEmailsEnabled = user.TradeProposalEmailsEnabled,
                    TradeResponseEmailsEnabled = user.TradeResponseEmailsEnabled
                };

                return Ok(preferences);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting email preferences for user {userId}");
                return StatusCode(500, "An error occurred while retrieving email preferences");
            }
        }

        [HttpPut("{userId}/email-preferences")]
        public async Task<ActionResult> UpdateEmailPreferences(int userId, EmailPreferencesDto preferences)
        {
            try
            {
                if (userId != preferences.UserId)
                {
                    return BadRequest("User ID mismatch");
                }

                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound("User not found");
                }

                user.EmailNotificationsEnabled = preferences.EmailNotificationsEnabled;
                user.TradeProposalEmailsEnabled = preferences.TradeProposalEmailsEnabled;
                user.TradeResponseEmailsEnabled = preferences.TradeResponseEmailsEnabled;

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Updated email preferences for user {userId}");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating email preferences for user {userId}");
                return StatusCode(500, "An error occurred while updating email preferences");
            }
        }
    }

    public class EmailPreferencesDto
    {
        public int UserId { get; set; }
        public bool EmailNotificationsEnabled { get; set; }
        public bool TradeProposalEmailsEnabled { get; set; }
        public bool TradeResponseEmailsEnabled { get; set; }
    }
}