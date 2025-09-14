using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.HealthChecks
{
    public class EmailSystemHealthCheck : IHealthCheck
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<EmailSystemHealthCheck> _logger;

        public EmailSystemHealthCheck(FantasyLeagueContext context, ILogger<EmailSystemHealthCheck> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            try
            {
                var healthData = new Dictionary<string, object>();
                var now = DateTime.UtcNow;
                var oneDayAgo = now.AddDays(-1);
                var oneHourAgo = now.AddHours(-1);

                // Check recent email activity
                var recentEmails = await _context.EmailDeliveryLogs
                    .Where(e => e.CreatedAt >= oneDayAgo)
                    .ToListAsync(cancellationToken);

                var totalEmails = recentEmails.Count;
                var sentEmails = recentEmails.Count(e => e.Status == EmailDeliveryStatus.Sent.ToString() || e.Status == EmailDeliveryStatus.Delivered.ToString());
                var failedEmails = recentEmails.Count(e => e.Status == EmailDeliveryStatus.Failed.ToString());
                var pendingEmails = recentEmails.Count(e => e.Status == EmailDeliveryStatus.Pending.ToString());

                // Check for stuck emails (pending for more than 1 hour)
                var stuckEmails = await _context.EmailDeliveryLogs
                    .Where(e => e.Status == EmailDeliveryStatus.Pending.ToString() && e.CreatedAt <= oneHourAgo)
                    .CountAsync(cancellationToken);

                // Check for high failure rate
                var failureRate = totalEmails > 0 ? (double)failedEmails / totalEmails * 100 : 0;
                var deliveryRate = totalEmails > 0 ? (double)sentEmails / totalEmails * 100 : 100;

                // Check for emails with excessive retry attempts
                var emailsWithHighRetryCount = await _context.EmailDeliveryLogs
                    .Where(e => e.RetryCount >= 3 && e.CreatedAt >= oneDayAgo)
                    .CountAsync(cancellationToken);

                healthData.Add("TotalEmailsLast24Hours", totalEmails);
                healthData.Add("SentEmailsLast24Hours", sentEmails);
                healthData.Add("FailedEmailsLast24Hours", failedEmails);
                healthData.Add("PendingEmailsLast24Hours", pendingEmails);
                healthData.Add("DeliveryRatePercentage", Math.Round(deliveryRate, 2));
                healthData.Add("FailureRatePercentage", Math.Round(failureRate, 2));
                healthData.Add("StuckEmailsCount", stuckEmails);
                healthData.Add("EmailsWithHighRetryCount", emailsWithHighRetryCount);

                // Determine health status
                var status = HealthStatus.Healthy;
                var issues = new List<string>();

                // Critical issues (Unhealthy)
                if (failureRate > 50)
                {
                    status = HealthStatus.Unhealthy;
                    issues.Add($"High failure rate: {failureRate:F1}%");
                }

                if (stuckEmails > 10)
                {
                    status = HealthStatus.Unhealthy;
                    issues.Add($"Too many stuck emails: {stuckEmails}");
                }

                // Warning issues (Degraded)
                if (status == HealthStatus.Healthy)
                {
                    if (failureRate > 20)
                    {
                        status = HealthStatus.Degraded;
                        issues.Add($"Elevated failure rate: {failureRate:F1}%");
                    }

                    if (stuckEmails > 5)
                    {
                        status = HealthStatus.Degraded;
                        issues.Add($"Some stuck emails: {stuckEmails}");
                    }

                    if (emailsWithHighRetryCount > 5)
                    {
                        status = HealthStatus.Degraded;
                        issues.Add($"Multiple emails requiring retries: {emailsWithHighRetryCount}");
                    }
                }

                var description = issues.Any()
                    ? string.Join("; ", issues)
                    : "Email system is operating normally";

                _logger.LogInformation($"Email system health check: {status} - {description}");

                return new HealthCheckResult(status, description, data: healthData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email system health check failed");
                return new HealthCheckResult(HealthStatus.Unhealthy, "Email system health check failed", ex);
            }
        }
    }
}