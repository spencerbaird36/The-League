using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class EmailMonitoringService : IEmailMonitoringService
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<EmailMonitoringService> _logger;

        // Configurable thresholds
        private const double HIGH_FAILURE_RATE_THRESHOLD = 25.0; // 25%
        private const int STUCK_EMAIL_THRESHOLD = 5;
        private const int STUCK_EMAIL_HOURS = 2; // Hours to consider an email "stuck"
        private const int EMAIL_LOG_RETENTION_DAYS = 30; // Days to keep email logs

        public EmailMonitoringService(FantasyLeagueContext context, ILogger<EmailMonitoringService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task CheckEmailSystemHealthAsync()
        {
            try
            {
                var metrics = await GetEmailSystemMetricsAsync(DateTime.UtcNow.AddHours(-24));

                _logger.LogInformation($"Email System Health Check - " +
                    $"Total: {metrics.TotalEmails}, " +
                    $"Sent: {metrics.SentEmails}, " +
                    $"Failed: {metrics.FailedEmails}, " +
                    $"Pending: {metrics.PendingEmails}, " +
                    $"Delivery Rate: {metrics.DeliveryRate:F1}%, " +
                    $"Stuck: {metrics.StuckEmails}");

                // Check for issues and alert
                await AlertOnHighFailureRateAsync();
                await AlertOnStuckEmailsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during email system health check");
            }
        }

        public async Task AlertOnHighFailureRateAsync()
        {
            try
            {
                var oneDayAgo = DateTime.UtcNow.AddDays(-1);
                var recentEmails = await _context.EmailDeliveryLogs
                    .Where(e => e.CreatedAt >= oneDayAgo)
                    .ToListAsync();

                if (recentEmails.Count == 0) return;

                var failedEmails = recentEmails.Count(e => e.Status == EmailDeliveryStatus.Failed.ToString());
                var failureRate = (double)failedEmails / recentEmails.Count * 100;

                if (failureRate > HIGH_FAILURE_RATE_THRESHOLD)
                {
                    var alertMessage = $"🚨 HIGH EMAIL FAILURE RATE ALERT: " +
                        $"{failureRate:F1}% failure rate in the last 24 hours " +
                        $"({failedEmails}/{recentEmails.Count} emails failed). " +
                        $"Threshold: {HIGH_FAILURE_RATE_THRESHOLD}%";

                    _logger.LogError(alertMessage);

                    // In a production environment, you would send this alert to:
                    // - Slack/Teams webhook
                    // - PagerDuty
                    // - Email to administrators
                    // - SMS alerts

                    await LogSystemAlertAsync("HIGH_FAILURE_RATE", alertMessage, failureRate);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking failure rate for alerts");
            }
        }

        public async Task AlertOnStuckEmailsAsync()
        {
            try
            {
                var stuckThreshold = DateTime.UtcNow.AddHours(-STUCK_EMAIL_HOURS);
                var stuckEmails = await _context.EmailDeliveryLogs
                    .Where(e => e.Status == EmailDeliveryStatus.Pending.ToString() && e.CreatedAt <= stuckThreshold)
                    .CountAsync();

                if (stuckEmails > STUCK_EMAIL_THRESHOLD)
                {
                    var alertMessage = $"⚠️ STUCK EMAILS ALERT: " +
                        $"{stuckEmails} emails have been pending for more than {STUCK_EMAIL_HOURS} hours. " +
                        $"Threshold: {STUCK_EMAIL_THRESHOLD} emails";

                    _logger.LogWarning(alertMessage);

                    await LogSystemAlertAsync("STUCK_EMAILS", alertMessage, stuckEmails);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking for stuck emails");
            }
        }

        public async Task CleanupOldEmailLogsAsync()
        {
            try
            {
                var cutoffDate = DateTime.UtcNow.AddDays(-EMAIL_LOG_RETENTION_DAYS);

                var oldLogs = await _context.EmailDeliveryLogs
                    .Where(e => e.CreatedAt < cutoffDate)
                    .ToListAsync();

                if (oldLogs.Count > 0)
                {
                    _context.EmailDeliveryLogs.RemoveRange(oldLogs);
                    await _context.SaveChangesAsync();

                    _logger.LogInformation($"🧹 Cleaned up {oldLogs.Count} old email logs older than {EMAIL_LOG_RETENTION_DAYS} days");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during email log cleanup");
            }
        }

        public async Task<EmailSystemMetrics> GetEmailSystemMetricsAsync(DateTime? startDate = null, DateTime? endDate = null)
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-7);
            var end = endDate ?? DateTime.UtcNow;

            var emailLogs = await _context.EmailDeliveryLogs
                .Where(e => e.CreatedAt >= start && e.CreatedAt <= end)
                .ToListAsync();

            var totalEmails = emailLogs.Count;
            var sentEmails = emailLogs.Count(e => e.Status == EmailDeliveryStatus.Sent.ToString() || e.Status == EmailDeliveryStatus.Delivered.ToString());
            var failedEmails = emailLogs.Count(e => e.Status == EmailDeliveryStatus.Failed.ToString());
            var pendingEmails = emailLogs.Count(e => e.Status == EmailDeliveryStatus.Pending.ToString());

            // Check for stuck emails
            var stuckThreshold = DateTime.UtcNow.AddHours(-STUCK_EMAIL_HOURS);
            var stuckEmails = emailLogs.Count(e => e.Status == EmailDeliveryStatus.Pending.ToString() && e.CreatedAt <= stuckThreshold);

            var deliveryRate = totalEmails > 0 ? (double)sentEmails / totalEmails * 100 : 100;
            var failureRate = totalEmails > 0 ? (double)failedEmails / totalEmails * 100 : 0;
            var averageRetryCount = emailLogs.Count > 0 ? emailLogs.Average(e => (double)e.RetryCount) : 0;

            // Email type breakdown
            var emailTypeBreakdown = emailLogs
                .GroupBy(e => e.EmailType)
                .ToDictionary(g => g.Key, g => g.Count());

            // Status breakdown
            var statusBreakdown = emailLogs
                .GroupBy(e => e.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            return new EmailSystemMetrics
            {
                TotalEmails = totalEmails,
                SentEmails = sentEmails,
                FailedEmails = failedEmails,
                PendingEmails = pendingEmails,
                DeliveryRate = deliveryRate,
                FailureRate = failureRate,
                StuckEmails = stuckEmails,
                AverageRetryCount = averageRetryCount,
                StartDate = start,
                EndDate = end,
                EmailTypeBreakdown = emailTypeBreakdown,
                StatusBreakdown = statusBreakdown
            };
        }

        private async Task LogSystemAlertAsync(string alertType, string message, double value)
        {
            try
            {
                // In a production system, you might want to store alerts in a separate table
                // or send them to an external monitoring system

                var logMessage = $"[ALERT:{alertType}] {message} (Value: {value})";
                _logger.LogCritical(logMessage);

                // Here you could:
                // 1. Store in database alert table
                // 2. Send to external monitoring (DataDog, New Relic, etc.)
                // 3. Send Slack/Teams notification
                // 4. Trigger PagerDuty incident
                // 5. Send SMS/email to administrators

                // Example: Simple database logging (you'd need to create an AlertLog table)
                /*
                var alert = new AlertLog
                {
                    AlertType = alertType,
                    Message = message,
                    Value = value,
                    CreatedAt = DateTime.UtcNow,
                    Severity = GetAlertSeverity(alertType)
                };

                _context.AlertLogs.Add(alert);
                await _context.SaveChangesAsync();
                */
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to log system alert: {alertType}");
            }
        }
    }
}