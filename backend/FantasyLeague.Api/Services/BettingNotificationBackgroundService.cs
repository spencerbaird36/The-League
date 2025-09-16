using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class BettingNotificationBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BettingNotificationBackgroundService> _logger;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(1); // Run cleanup every hour
        private readonly TimeSpan _warningInterval = TimeSpan.FromMinutes(30); // Check for expiration warnings every 30 minutes

        public BettingNotificationBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<BettingNotificationBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Betting Notification Background Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessNotificationTasksAsync();
                    await Task.Delay(_cleanupInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Betting Notification Background Service is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Betting Notification Background Service");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Wait 5 minutes before retrying
                }
            }
        }

        private async Task ProcessNotificationTasksAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var notificationService = scope.ServiceProvider.GetRequiredService<IBettingNotificationService>();

            await CleanupExpiredNotificationsAsync(notificationService);
            await CheckForExpirationWarningsAsync(scope);
            await CheckForBettingOpportunitiesAsync(scope);
        }

        private async Task CleanupExpiredNotificationsAsync(IBettingNotificationService notificationService)
        {
            try
            {
                var deletedCount = await notificationService.DeleteExpiredNotificationsAsync();
                if (deletedCount > 0)
                {
                    _logger.LogInformation($"Cleaned up {deletedCount} expired betting notifications");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired notifications");
            }
        }

        private async Task CheckForExpirationWarningsAsync(IServiceScope scope)
        {
            try
            {
                var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();
                var notificationService = scope.ServiceProvider.GetRequiredService<IBettingNotificationService>();

                // Find bets that expire within the next 24 hours but haven't received a warning
                var warningThreshold = DateTime.UtcNow.AddHours(24);
                var betsNearExpiry = await context.Bets
                    .Where(b => b.Status == BetStatus.Active &&
                               b.ExpiresAt <= warningThreshold &&
                               b.ExpiresAt > DateTime.UtcNow)
                    .ToListAsync();

                foreach (var bet in betsNearExpiry)
                {
                    // Check if we've already sent an expiration warning for this bet
                    var existingWarning = await context.BettingNotifications
                        .AnyAsync(n => n.BetId == bet.Id &&
                                      n.Type == BettingNotificationType.ExpirationWarning &&
                                      n.CreatedAt >= DateTime.UtcNow.AddDays(-1));

                    if (!existingWarning)
                    {
                        var timeUntilExpiry = bet.ExpiresAt - DateTime.UtcNow;
                        await notificationService.NotifyExpirationWarningAsync(bet, timeUntilExpiry);
                    }
                }

                if (betsNearExpiry.Count > 0)
                {
                    _logger.LogInformation($"Processed {betsNearExpiry.Count} bets for expiration warnings");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking for expiration warnings");
            }
        }

        private async Task CheckForBettingOpportunitiesAsync(IServiceScope scope)
        {
            try
            {
                var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();
                var notificationService = scope.ServiceProvider.GetRequiredService<IBettingNotificationService>();

                // Find new matchup bets created in the last hour
                var oneHourAgo = DateTime.UtcNow.AddHours(-1);
                var newMatchupBets = await context.MatchupBets
                    .Where(mb => mb.CreatedAt >= oneHourAgo)
                    .ToListAsync();

                // Find new game bets created in the last hour
                var newGameBets = await context.GameBets
                    .Where(gb => gb.CreatedAt >= oneHourAgo)
                    .ToListAsync();

                if (newMatchupBets.Count > 0 || newGameBets.Count > 0)
                {
                    // Get active users who might be interested in betting
                    var activeUsers = await context.Users
                        .Where(u => u.IsActive)
                        .Select(u => u.Id)
                        .ToListAsync();

                    // Notify users about new betting opportunities (but don't spam them)
                    foreach (var userId in activeUsers)
                    {
                        // Check if we've already notified this user about new opportunities today
                        var recentOpportunityNotification = await context.BettingNotifications
                            .AnyAsync(n => n.UserId == userId &&
                                          n.Type == BettingNotificationType.NewBettingOpportunity &&
                                          n.CreatedAt >= DateTime.UtcNow.Date);

                        if (!recentOpportunityNotification)
                        {
                            if (newMatchupBets.Count > 0)
                            {
                                await notificationService.NotifyNewBettingOpportunityAsync(userId, newMatchupBets.First());
                            }
                            else if (newGameBets.Count > 0)
                            {
                                await notificationService.NotifyNewBettingOpportunityAsync(userId, null, newGameBets.First());
                            }
                        }
                    }

                    _logger.LogInformation($"Processed new betting opportunities: {newMatchupBets.Count} matchups, {newGameBets.Count} games");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking for new betting opportunities");
            }
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Betting Notification Background Service is stopping");
            await base.StopAsync(stoppingToken);
        }
    }
}