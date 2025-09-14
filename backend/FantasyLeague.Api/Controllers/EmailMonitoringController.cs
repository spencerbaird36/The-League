using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmailMonitoringController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<EmailMonitoringController> _logger;

        public EmailMonitoringController(FantasyLeagueContext context, ILogger<EmailMonitoringController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("delivery-logs")]
        public async Task<ActionResult<List<EmailDeliveryLogDto>>> GetEmailDeliveryLogs(
            [FromQuery] int? userId = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var query = _context.EmailDeliveryLogs
                    .Include(el => el.User)
                    .AsQueryable();

                if (userId.HasValue)
                {
                    query = query.Where(el => el.UserId == userId.Value);
                }

                if (!string.IsNullOrEmpty(status))
                {
                    query = query.Where(el => el.Status == status);
                }

                var logs = await query
                    .OrderByDescending(el => el.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(el => new EmailDeliveryLogDto
                    {
                        Id = el.Id,
                        UserId = el.UserId,
                        Username = el.User.Username,
                        EmailAddress = el.EmailAddress,
                        EmailType = el.EmailType,
                        Subject = el.Subject,
                        Status = el.Status,
                        RetryCount = el.RetryCount,
                        ErrorMessage = el.ErrorMessage,
                        CreatedAt = el.CreatedAt,
                        SentAt = el.SentAt,
                        DeliveredAt = el.DeliveredAt,
                        TradeProposalId = el.TradeProposalId
                    })
                    .ToListAsync();

                return Ok(logs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving email delivery logs");
                return StatusCode(500, "An error occurred while retrieving email delivery logs");
            }
        }

        [HttpGet("delivery-stats")]
        public async Task<ActionResult<EmailDeliveryStatsDto>> GetEmailDeliveryStats(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                var stats = await _context.EmailDeliveryLogs
                    .Where(el => el.CreatedAt >= start && el.CreatedAt <= end)
                    .GroupBy(el => 1)
                    .Select(g => new EmailDeliveryStatsDto
                    {
                        TotalEmails = g.Count(),
                        SentEmails = g.Count(el => el.Status == "sent" || el.Status == "delivered"),
                        FailedEmails = g.Count(el => el.Status == "failed"),
                        PendingEmails = g.Count(el => el.Status == "pending"),
                        DeliveredEmails = g.Count(el => el.Status == "delivered"),
                        AverageRetryCount = g.Average(el => (double?)el.RetryCount) ?? 0,
                        StartDate = start,
                        EndDate = end
                    })
                    .FirstOrDefaultAsync();

                if (stats == null)
                {
                    stats = new EmailDeliveryStatsDto
                    {
                        StartDate = start,
                        EndDate = end
                    };
                }

                // Calculate delivery rate
                if (stats.TotalEmails > 0)
                {
                    stats.DeliveryRate = (double)stats.SentEmails / stats.TotalEmails * 100;
                    stats.FailureRate = (double)stats.FailedEmails / stats.TotalEmails * 100;
                }

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving email delivery stats");
                return StatusCode(500, "An error occurred while retrieving email delivery stats");
            }
        }

        [HttpGet("delivery-logs/{id}")]
        public async Task<ActionResult<EmailDeliveryLogDto>> GetEmailDeliveryLog(int id)
        {
            try
            {
                var log = await _context.EmailDeliveryLogs
                    .Include(el => el.User)
                    .Include(el => el.TradeProposal)
                    .FirstOrDefaultAsync(el => el.Id == id);

                if (log == null)
                {
                    return NotFound("Email delivery log not found");
                }

                var logDto = new EmailDeliveryLogDto
                {
                    Id = log.Id,
                    UserId = log.UserId,
                    Username = log.User.Username,
                    EmailAddress = log.EmailAddress,
                    EmailType = log.EmailType,
                    Subject = log.Subject,
                    Status = log.Status,
                    RetryCount = log.RetryCount,
                    ErrorMessage = log.ErrorMessage,
                    SendGridMessageId = log.SendGridMessageId,
                    CreatedAt = log.CreatedAt,
                    SentAt = log.SentAt,
                    DeliveredAt = log.DeliveredAt,
                    TradeProposalId = log.TradeProposalId
                };

                return Ok(logDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving email delivery log {id}");
                return StatusCode(500, "An error occurred while retrieving email delivery log");
            }
        }

        [HttpPost("delivery-logs/{id}/retry")]
        public async Task<ActionResult> RetryEmailDelivery(int id)
        {
            try
            {
                var log = await _context.EmailDeliveryLogs.FindAsync(id);
                if (log == null)
                {
                    return NotFound("Email delivery log not found");
                }

                if (log.Status == "sent" || log.Status == "delivered")
                {
                    return BadRequest("Cannot retry email that has already been sent");
                }

                if (log.RetryCount >= 3)
                {
                    return BadRequest("Maximum retry count exceeded");
                }

                // Reset status and schedule retry
                log.Status = "pending";
                log.ErrorMessage = null;
                await _context.SaveChangesAsync();

                // You would queue the retry job here
                // BackgroundJob.Enqueue(() => _backgroundEmailService.ProcessEmailQueueAsync(id));

                _logger.LogInformation($"Manually triggered retry for email delivery log {id}");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrying email delivery {id}");
                return StatusCode(500, "An error occurred while retrying email delivery");
            }
        }
    }

    public class EmailDeliveryLogDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string EmailAddress { get; set; } = string.Empty;
        public string EmailType { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int RetryCount { get; set; }
        public string? ErrorMessage { get; set; }
        public string? SendGridMessageId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime? DeliveredAt { get; set; }
        public int? TradeProposalId { get; set; }
    }

    public class EmailDeliveryStatsDto
    {
        public int TotalEmails { get; set; }
        public int SentEmails { get; set; }
        public int FailedEmails { get; set; }
        public int PendingEmails { get; set; }
        public int DeliveredEmails { get; set; }
        public double DeliveryRate { get; set; }
        public double FailureRate { get; set; }
        public double AverageRetryCount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}