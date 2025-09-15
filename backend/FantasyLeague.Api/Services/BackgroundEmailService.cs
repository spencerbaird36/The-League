using Microsoft.EntityFrameworkCore;
using Hangfire;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class BackgroundEmailService : IBackgroundEmailService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<BackgroundEmailService> _logger;

        public BackgroundEmailService(IServiceScopeFactory scopeFactory, ILogger<BackgroundEmailService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public async Task QueueTradeProposalEmailAsync(int targetUserId, int proposingUserId, string? message, int? tradeProposalId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();

            try
            {
                var targetUser = await context.Users.FindAsync(targetUserId);
                var proposingUser = await context.Users.FindAsync(proposingUserId);

                if (targetUser == null || proposingUser == null)
                {
                    _logger.LogWarning($"Failed to queue trade proposal email - users not found: target={targetUserId}, proposing={proposingUserId}");
                    return;
                }

                // Check user preferences
                if (!targetUser.EmailNotificationsEnabled || !targetUser.TradeProposalEmailsEnabled)
                {
                    _logger.LogDebug($"Skipping trade proposal email for user {targetUserId} - notifications disabled");
                    return;
                }

                // Create email delivery log
                var emailLog = new EmailDeliveryLog
                {
                    UserId = targetUserId,
                    EmailAddress = targetUser.Email,
                    EmailType = EmailType.TradeProposal.ToString(),
                    Subject = $"New Trade Proposal from {proposingUser.Username}",
                    Status = EmailDeliveryStatus.Pending.ToString(),
                    TradeProposalId = tradeProposalId,
                    CreatedAt = DateTime.UtcNow
                };

                context.EmailDeliveryLogs.Add(emailLog);
                await context.SaveChangesAsync();

                // Since Hangfire is disabled, process email immediately
                // BackgroundJob.Enqueue(() => ProcessEmailQueueAsync(emailLog.Id));
                _ = Task.Run(async () => await ProcessEmailQueueAsync(emailLog.Id));

                _logger.LogInformation($"Queued trade proposal email for user {targetUserId} with log ID {emailLog.Id}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error queueing trade proposal email for users {targetUserId}, {proposingUserId}");
            }
        }

        public async Task QueueTradeResponseEmailAsync(int proposingUserId, int targetUserId, bool accepted, string message, int? tradeProposalId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();

            try
            {
                var proposingUser = await context.Users.FindAsync(proposingUserId);
                var targetUser = await context.Users.FindAsync(targetUserId);

                if (proposingUser == null || targetUser == null)
                {
                    _logger.LogWarning($"Failed to queue trade response email - users not found: proposing={proposingUserId}, target={targetUserId}");
                    return;
                }

                // Check user preferences
                if (!proposingUser.EmailNotificationsEnabled || !proposingUser.TradeResponseEmailsEnabled)
                {
                    _logger.LogDebug($"Skipping trade response email for user {proposingUserId} - notifications disabled");
                    return;
                }

                // Create email delivery log
                var emailType = accepted ? EmailType.TradeAccepted : EmailType.TradeRejected;
                var emailLog = new EmailDeliveryLog
                {
                    UserId = proposingUserId,
                    EmailAddress = proposingUser.Email,
                    EmailType = emailType.ToString(),
                    Subject = $"Trade Proposal {(accepted ? "Accepted" : "Rejected")} by {targetUser.Username}",
                    Status = EmailDeliveryStatus.Pending.ToString(),
                    TradeProposalId = tradeProposalId,
                    CreatedAt = DateTime.UtcNow
                };

                context.EmailDeliveryLogs.Add(emailLog);
                await context.SaveChangesAsync();

                // Since Hangfire is disabled, process email immediately
                // BackgroundJob.Enqueue(() => ProcessEmailQueueAsync(emailLog.Id));
                _ = Task.Run(async () => await ProcessEmailQueueAsync(emailLog.Id));

                _logger.LogInformation($"Queued trade response email for user {proposingUserId} with log ID {emailLog.Id}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error queueing trade response email for users {proposingUserId}, {targetUserId}");
            }
        }

        [Queue("emails")]
        public async Task ProcessEmailQueueAsync(int emailLogId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            try
            {
                var emailLog = await context.EmailDeliveryLogs
                    .Include(el => el.User)
                    .Include(el => el.TradeProposal)
                        .ThenInclude(tp => tp.ProposingUser)
                    .Include(el => el.TradeProposal)
                        .ThenInclude(tp => tp.TargetUser)
                    .FirstOrDefaultAsync(el => el.Id == emailLogId);

                if (emailLog == null)
                {
                    _logger.LogWarning($"Email log not found: {emailLogId}");
                    return;
                }

                if (emailLog.Status != EmailDeliveryStatus.Pending.ToString())
                {
                    _logger.LogWarning($"Email log {emailLogId} is not in pending status: {emailLog.Status}");
                    return;
                }

                _logger.LogInformation($"Processing email queue item {emailLogId} for user {emailLog.UserId}");

                bool success = false;

                // Process different email types
                switch (emailLog.EmailType)
                {
                    case nameof(EmailType.TradeProposal):
                        if (emailLog.TradeProposal != null)
                        {
                            success = await emailService.SendTradeProposalNotificationAsync(
                                emailLog.User,
                                emailLog.TradeProposal.ProposingUser,
                                emailLog.TradeProposal.Message ?? ""
                            );
                        }
                        break;

                    case nameof(EmailType.TradeAccepted):
                        if (emailLog.TradeProposal != null)
                        {
                            success = await emailService.SendTradeResponseNotificationAsync(
                                emailLog.TradeProposal.ProposingUser,
                                emailLog.TradeProposal.TargetUser,
                                true,
                                $"{emailLog.TradeProposal.TargetUser.Username} has accepted your trade proposal"
                            );
                        }
                        break;

                    case nameof(EmailType.TradeRejected):
                        if (emailLog.TradeProposal != null)
                        {
                            success = await emailService.SendTradeResponseNotificationAsync(
                                emailLog.TradeProposal.ProposingUser,
                                emailLog.TradeProposal.TargetUser,
                                false,
                                $"{emailLog.TradeProposal.TargetUser.Username} has rejected your trade proposal"
                            );
                        }
                        break;

                    default:
                        _logger.LogWarning($"Unknown email type: {emailLog.EmailType}");
                        return;
                }

                // Update email log status
                if (success)
                {
                    emailLog.Status = EmailDeliveryStatus.Sent.ToString();
                    emailLog.SentAt = DateTime.UtcNow;
                    _logger.LogInformation($"Successfully sent email {emailLogId} to {emailLog.EmailAddress}");
                }
                else
                {
                    emailLog.Status = EmailDeliveryStatus.Failed.ToString();
                    emailLog.ErrorMessage = "Email sending failed";
                    emailLog.RetryCount++;

                    _logger.LogWarning($"Failed to send email {emailLogId} to {emailLog.EmailAddress}");

                    // Schedule retry if retry count is less than 3 (using Task.Delay instead of Hangfire)
                    if (emailLog.RetryCount < 3)
                    {
                        var retryDelay = TimeSpan.FromMinutes(Math.Pow(2, emailLog.RetryCount)); // Exponential backoff: 2, 4, 8 minutes
                        _ = Task.Run(async () =>
                        {
                            await Task.Delay(retryDelay);
                            await RetryFailedEmailAsync(emailLogId);
                        });
                        _logger.LogInformation($"Scheduled retry for email {emailLogId} in {retryDelay.TotalMinutes} minutes (attempt {emailLog.RetryCount + 1})");
                    }
                }

                await context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing email queue item {emailLogId}");

                // Update status to failed
                try
                {
                    var emailLog = await context.EmailDeliveryLogs.FindAsync(emailLogId);
                    if (emailLog != null)
                    {
                        emailLog.Status = EmailDeliveryStatus.Failed.ToString();
                        emailLog.ErrorMessage = ex.Message;
                        emailLog.RetryCount++;
                        await context.SaveChangesAsync();
                    }
                }
                catch (Exception updateEx)
                {
                    _logger.LogError(updateEx, $"Failed to update email log status for {emailLogId}");
                }
            }
        }

        [Queue("emails")]
        public async Task RetryFailedEmailAsync(int emailLogId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();

            try
            {
                var emailLog = await context.EmailDeliveryLogs.FindAsync(emailLogId);
                if (emailLog == null)
                {
                    _logger.LogWarning($"Email log not found for retry: {emailLogId}");
                    return;
                }

                if (emailLog.RetryCount >= 3)
                {
                    _logger.LogWarning($"Maximum retry count reached for email {emailLogId}");
                    return;
                }

                // Reset to pending and process again
                emailLog.Status = EmailDeliveryStatus.Pending.ToString();
                emailLog.ErrorMessage = null;
                await context.SaveChangesAsync();

                _logger.LogInformation($"Retrying failed email {emailLogId} (attempt {emailLog.RetryCount + 1})");

                // Process the email again
                await ProcessEmailQueueAsync(emailLogId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrying failed email {emailLogId}");
            }
        }

        [Queue("emails")]
        public async Task ProcessEmailDeliveryStatusAsync(string sendGridMessageId)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();

            try
            {
                var emailLog = await context.EmailDeliveryLogs
                    .FirstOrDefaultAsync(el => el.SendGridMessageId == sendGridMessageId);

                if (emailLog == null)
                {
                    _logger.LogWarning($"Email log not found for SendGrid message ID: {sendGridMessageId}");
                    return;
                }

                // Update delivery status (this would be called from webhook)
                emailLog.Status = EmailDeliveryStatus.Delivered.ToString();
                emailLog.DeliveredAt = DateTime.UtcNow;

                await context.SaveChangesAsync();

                _logger.LogInformation($"Updated delivery status for email {emailLog.Id} to delivered");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing delivery status for SendGrid message {sendGridMessageId}");
            }
        }
    }
}