using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using System.Text.Json;

namespace FantasyLeague.Api.Services
{
    public class BettingNotificationService : IBettingNotificationService
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<BettingNotificationService> _logger;

        public BettingNotificationService(FantasyLeagueContext context, ILogger<BettingNotificationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        #region Core Notification Methods

        public async Task<BettingNotification> CreateNotificationAsync(
            int userId,
            BettingNotificationType type,
            string title,
            string message,
            BettingNotificationPriority priority = BettingNotificationPriority.Normal,
            int? betId = null,
            int? matchupBetId = null,
            int? gameBetId = null,
            string? actionUrl = null,
            string? actionText = null,
            DateTime? expiresAt = null,
            string? metadata = null)
        {
            try
            {
                var notification = new BettingNotification
                {
                    UserId = userId,
                    Type = type,
                    Title = title,
                    Message = message,
                    Priority = priority,
                    BetId = betId,
                    MatchupBetId = matchupBetId,
                    GameBetId = gameBetId,
                    ActionUrl = actionUrl,
                    ActionText = actionText,
                    ExpiresAt = expiresAt,
                    Metadata = metadata,
                    CreatedAt = DateTime.UtcNow
                };

                _context.BettingNotifications.Add(notification);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Created betting notification {notification.Id} for user {userId}: {type}");
                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating betting notification for user {userId}");
                throw;
            }
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
        {
            try
            {
                var notification = await _context.BettingNotifications
                    .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

                if (notification == null)
                    return false;

                if (!notification.IsRead)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error marking notification {notificationId} as read");
                return false;
            }
        }

        public async Task<bool> MarkAllAsReadAsync(int userId)
        {
            try
            {
                var unreadNotifications = await _context.BettingNotifications
                    .Where(n => n.UserId == userId && !n.IsRead)
                    .ToListAsync();

                foreach (var notification in unreadNotifications)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                _logger.LogInformation($"Marked {unreadNotifications.Count} notifications as read for user {userId}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error marking all notifications as read for user {userId}");
                return false;
            }
        }

        public async Task<bool> DeleteNotificationAsync(int notificationId, int userId)
        {
            try
            {
                var notification = await _context.BettingNotifications
                    .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

                if (notification == null)
                    return false;

                _context.BettingNotifications.Remove(notification);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error deleting notification {notificationId}");
                return false;
            }
        }

        public async Task<int> DeleteExpiredNotificationsAsync()
        {
            try
            {
                var expiredNotifications = await _context.BettingNotifications
                    .Where(n => n.ExpiresAt.HasValue && n.ExpiresAt.Value < DateTime.UtcNow)
                    .ToListAsync();

                _context.BettingNotifications.RemoveRange(expiredNotifications);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Deleted {expiredNotifications.Count} expired betting notifications");
                return expiredNotifications.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting expired notifications");
                return 0;
            }
        }

        #endregion

        #region Retrieval Methods

        public async Task<List<BettingNotificationDto>> GetUserNotificationsAsync(int userId, bool unreadOnly = false, int page = 1, int pageSize = 50)
        {
            try
            {
                var query = _context.BettingNotifications
                    .Include(n => n.Bet)
                    .Include(n => n.MatchupBet)
                    .Include(n => n.GameBet)
                    .Where(n => n.UserId == userId);

                if (unreadOnly)
                    query = query.Where(n => !n.IsRead);

                var notifications = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(n => new BettingNotificationDto
                    {
                        Id = n.Id,
                        UserId = n.UserId,
                        Type = n.Type,
                        TypeDisplayName = n.Type.GetBettingNotificationTypeDisplayName(),
                        Title = n.Title,
                        Message = n.Message,
                        Priority = n.Priority,
                        PriorityDisplayName = n.Priority.GetBettingNotificationPriorityDisplayName(),
                        IsRead = n.IsRead,
                        CreatedAt = n.CreatedAt,
                        ReadAt = n.ReadAt,
                        ExpiresAt = n.ExpiresAt,
                        IsExpired = n.ExpiresAt.HasValue && DateTime.UtcNow > n.ExpiresAt.Value,
                        TimeToExpiry = n.ExpiresAt.HasValue ? n.ExpiresAt.Value - DateTime.UtcNow : null,
                        BetId = n.BetId,
                        MatchupBetId = n.MatchupBetId,
                        GameBetId = n.GameBetId,
                        ActionUrl = n.ActionUrl,
                        ActionText = n.ActionText,
                        Metadata = n.Metadata
                    })
                    .ToListAsync();

                return notifications;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting notifications for user {userId}");
                return new List<BettingNotificationDto>();
            }
        }

        public async Task<int> GetUnreadCountAsync(int userId)
        {
            try
            {
                return await _context.BettingNotifications
                    .CountAsync(n => n.UserId == userId && !n.IsRead);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting unread count for user {userId}");
                return 0;
            }
        }

        public async Task<BettingNotificationDto?> GetNotificationAsync(int notificationId, int userId)
        {
            try
            {
                var notification = await _context.BettingNotifications
                    .Include(n => n.Bet)
                    .Include(n => n.MatchupBet)
                    .Include(n => n.GameBet)
                    .Where(n => n.Id == notificationId && n.UserId == userId)
                    .Select(n => new BettingNotificationDto
                    {
                        Id = n.Id,
                        UserId = n.UserId,
                        Type = n.Type,
                        TypeDisplayName = n.Type.GetBettingNotificationTypeDisplayName(),
                        Title = n.Title,
                        Message = n.Message,
                        Priority = n.Priority,
                        PriorityDisplayName = n.Priority.GetBettingNotificationPriorityDisplayName(),
                        IsRead = n.IsRead,
                        CreatedAt = n.CreatedAt,
                        ReadAt = n.ReadAt,
                        ExpiresAt = n.ExpiresAt,
                        IsExpired = n.ExpiresAt.HasValue && DateTime.UtcNow > n.ExpiresAt.Value,
                        TimeToExpiry = n.ExpiresAt.HasValue ? n.ExpiresAt.Value - DateTime.UtcNow : null,
                        BetId = n.BetId,
                        MatchupBetId = n.MatchupBetId,
                        GameBetId = n.GameBetId,
                        ActionUrl = n.ActionUrl,
                        ActionText = n.ActionText,
                        Metadata = n.Metadata
                    })
                    .FirstOrDefaultAsync();

                return notification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting notification {notificationId}");
                return null;
            }
        }

        #endregion

        #region Betting Event-Specific Notifications

        public async Task NotifyBetPlacedAsync(Bet bet)
        {
            var title = $"Bet Placed - ${bet.Amount:F2}";
            var message = $"Your bet of ${bet.Amount:F2} has been successfully placed. Potential payout: ${bet.PotentialPayout:F2}";

            await CreateNotificationAsync(
                bet.UserId,
                BettingNotificationType.BetPlaced,
                title,
                message,
                BettingNotificationPriority.Normal,
                betId: bet.Id,
                actionUrl: $"/betting/my-bets/{bet.Id}",
                actionText: "View Bet"
            );
        }

        public async Task NotifyBetSettledAsync(Bet bet, BetStatus previousStatus)
        {
            var (type, title, message, priority) = bet.Status switch
            {
                BetStatus.Won => (
                    BettingNotificationType.BetWon,
                    $"🎉 Bet Won - ${bet.PotentialPayout:F2}",
                    $"Congratulations! Your bet has won and ${bet.PotentialPayout:F2} has been added to your account.",
                    BettingNotificationPriority.High
                ),
                BetStatus.Lost => (
                    BettingNotificationType.BetLost,
                    $"Bet Lost - ${bet.Amount:F2}",
                    $"Your bet has been settled as a loss. Better luck next time!",
                    BettingNotificationPriority.Normal
                ),
                BetStatus.Push => (
                    BettingNotificationType.BetPush,
                    $"Bet Push - ${bet.Amount:F2} Refunded",
                    $"Your bet resulted in a push. Your ${bet.Amount:F2} has been refunded to your account.",
                    BettingNotificationPriority.Normal
                ),
                BetStatus.Cancelled => (
                    BettingNotificationType.BetCancelled,
                    $"Bet Cancelled - ${bet.Amount:F2} Refunded",
                    $"Your bet has been cancelled and ${bet.Amount:F2} has been refunded to your account.",
                    BettingNotificationPriority.Normal
                ),
                BetStatus.Voided => (
                    BettingNotificationType.BetVoided,
                    $"Bet Voided - ${bet.Amount:F2} Refunded",
                    $"Your bet has been voided by an administrator and ${bet.Amount:F2} has been refunded.",
                    BettingNotificationPriority.High
                ),
                BetStatus.Expired => (
                    BettingNotificationType.BetExpired,
                    $"Bet Expired - ${bet.Amount:F2} Refunded",
                    $"Your bet expired before the event started. ${bet.Amount:F2} has been refunded to your account.",
                    BettingNotificationPriority.Normal
                ),
                _ => (
                    BettingNotificationType.BetSettled,
                    "Bet Settled",
                    "Your bet has been settled.",
                    BettingNotificationPriority.Normal
                )
            };

            await CreateNotificationAsync(
                bet.UserId,
                type,
                title,
                message,
                priority,
                betId: bet.Id,
                actionUrl: $"/betting/my-bets/{bet.Id}",
                actionText: "View Details"
            );
        }

        public async Task NotifyNewBettingOpportunityAsync(int userId, MatchupBet? matchupBet = null, GameBet? gameBet = null)
        {
            string title, message, actionUrl;

            if (matchupBet != null)
            {
                title = "New League Matchup Available";
                message = $"A new betting opportunity is available for {matchupBet.Team1User?.Username ?? "Team 1"} vs {matchupBet.Team2User?.Username ?? "Team 2"}";
                actionUrl = $"/betting/matchups/{matchupBet.Id}";
            }
            else if (gameBet != null)
            {
                title = "New Game Available";
                message = $"A new betting opportunity is available for {gameBet.HomeTeam} vs {gameBet.AwayTeam}";
                actionUrl = $"/betting/games/{gameBet.Id}";
            }
            else
            {
                title = "New Betting Opportunities";
                message = "New betting opportunities are now available!";
                actionUrl = "/betting";
            }

            await CreateNotificationAsync(
                userId,
                BettingNotificationType.NewBettingOpportunity,
                title,
                message,
                BettingNotificationPriority.Normal,
                matchupBetId: matchupBet?.Id,
                gameBetId: gameBet?.Id,
                actionUrl: actionUrl,
                actionText: "Place Bet"
            );
        }

        public async Task NotifyBettingLineUpdateAsync(int userId, MatchupBet? matchupBet = null, GameBet? gameBet = null)
        {
            string title, message;

            if (matchupBet != null)
            {
                title = "Line Update";
                message = $"Betting lines have been updated for {matchupBet.Team1User?.Username ?? "Team 1"} vs {matchupBet.Team2User?.Username ?? "Team 2"}";
            }
            else if (gameBet != null)
            {
                title = "Line Update";
                message = $"Betting lines have been updated for {gameBet.HomeTeam} vs {gameBet.AwayTeam}";
            }
            else
            {
                title = "Lines Updated";
                message = "Betting lines have been updated. Check for new opportunities!";
            }

            await CreateNotificationAsync(
                userId,
                BettingNotificationType.BettingLineUpdate,
                title,
                message,
                BettingNotificationPriority.Low,
                matchupBetId: matchupBet?.Id,
                gameBetId: gameBet?.Id,
                actionUrl: "/betting",
                actionText: "View Lines"
            );
        }

        public async Task NotifyExpirationWarningAsync(Bet bet, TimeSpan timeUntilExpiry)
        {
            var hoursLeft = Math.Max(1, (int)timeUntilExpiry.TotalHours);
            var title = $"⏰ Bet Expiring in {hoursLeft}h";
            var message = $"Your bet of ${bet.Amount:F2} will expire in {hoursLeft} hours. Make sure to check the latest updates!";

            await CreateNotificationAsync(
                bet.UserId,
                BettingNotificationType.ExpirationWarning,
                title,
                message,
                BettingNotificationPriority.High,
                betId: bet.Id,
                actionUrl: $"/betting/my-bets/{bet.Id}",
                actionText: "View Bet",
                expiresAt: bet.ExpiresAt
            );
        }

        public async Task NotifyLimitWarningAsync(int userId, string limitType, decimal currentAmount, decimal limit)
        {
            var percentage = Math.Round((currentAmount / limit) * 100, 1);
            var title = $"⚠️ {limitType} Limit Warning";
            var message = $"You've reached {percentage}% of your {limitType.ToLower()} limit (${currentAmount:F2} of ${limit:F2}).";

            await CreateNotificationAsync(
                userId,
                BettingNotificationType.LimitWarning,
                title,
                message,
                BettingNotificationPriority.High,
                actionUrl: "/settings/betting-limits",
                actionText: "Manage Limits"
            );
        }

        public async Task NotifyBalanceAlertAsync(int userId, decimal currentBalance, decimal recommendedMinimum)
        {
            var title = "💰 Low Balance Alert";
            var message = $"Your token balance is ${currentBalance:F2}. Consider adding more tokens to continue betting.";

            await CreateNotificationAsync(
                userId,
                BettingNotificationType.BalanceAlert,
                title,
                message,
                BettingNotificationPriority.High,
                actionUrl: "/tokens/purchase",
                actionText: "Buy Tokens"
            );
        }

        public async Task NotifyWinStreakAsync(int userId, int streakCount, decimal totalWinnings)
        {
            var title = $"🔥 {streakCount} Win Streak!";
            var message = $"You're on fire! You've won {streakCount} bets in a row and earned ${totalWinnings:F2}. Keep it up!";

            await CreateNotificationAsync(
                userId,
                BettingNotificationType.WinStreak,
                title,
                message,
                BettingNotificationPriority.High,
                actionUrl: "/betting/my-bets",
                actionText: "View Bets"
            );
        }

        public async Task NotifyLossStreakAsync(int userId, int streakCount, decimal totalLosses)
        {
            var title = $"📉 {streakCount} Loss Streak";
            var message = $"You've had {streakCount} losses in a row totaling ${totalLosses:F2}. Consider taking a break or reviewing your strategy.";

            await CreateNotificationAsync(
                userId,
                BettingNotificationType.LossStreak,
                title,
                message,
                BettingNotificationPriority.Normal,
                actionUrl: "/betting/analytics",
                actionText: "View Stats"
            );
        }

        public async Task NotifyBigWinAsync(Bet bet)
        {
            var title = $"🎉 Big Win - ${bet.PotentialPayout:F2}!";
            var message = $"Congratulations on your big win! You've earned ${bet.PotentialPayout:F2} from your ${bet.Amount:F2} bet.";

            await CreateNotificationAsync(
                bet.UserId,
                BettingNotificationType.BigWin,
                title,
                message,
                BettingNotificationPriority.High,
                betId: bet.Id,
                actionUrl: $"/betting/my-bets/{bet.Id}",
                actionText: "View Bet"
            );
        }

        public async Task NotifyBigLossAsync(Bet bet)
        {
            var title = $"📉 Significant Loss - ${bet.Amount:F2}";
            var message = $"You've lost a significant bet of ${bet.Amount:F2}. Remember to bet responsibly.";

            await CreateNotificationAsync(
                bet.UserId,
                BettingNotificationType.BigLoss,
                title,
                message,
                BettingNotificationPriority.Normal,
                betId: bet.Id,
                actionUrl: "/responsible-gambling",
                actionText: "Get Help"
            );
        }

        public async Task NotifySystemMessageAsync(string title, string message, BettingNotificationPriority priority = BettingNotificationPriority.Normal, int? specificUserId = null)
        {
            if (specificUserId.HasValue)
            {
                await CreateNotificationAsync(
                    specificUserId.Value,
                    BettingNotificationType.SystemMessage,
                    title,
                    message,
                    priority,
                    actionUrl: "/announcements",
                    actionText: "View Details"
                );
            }
            else
            {
                await NotifyAllUsersAsync(BettingNotificationType.SystemMessage, title, message, priority);
            }
        }

        #endregion

        #region Batch Notification Methods

        public async Task NotifyMultipleUsersAsync(List<int> userIds, BettingNotificationType type, string title, string message, BettingNotificationPriority priority = BettingNotificationPriority.Normal)
        {
            try
            {
                var notifications = userIds.Select(userId => new BettingNotification
                {
                    UserId = userId,
                    Type = type,
                    Title = title,
                    Message = message,
                    Priority = priority,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.BettingNotifications.AddRange(notifications);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Created {notifications.Count} batch notifications of type {type}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating batch notifications for {userIds.Count} users");
                throw;
            }
        }

        public async Task NotifyAllUsersAsync(BettingNotificationType type, string title, string message, BettingNotificationPriority priority = BettingNotificationPriority.Normal)
        {
            try
            {
                var userIds = await _context.Users.Select(u => u.Id).ToListAsync();
                await NotifyMultipleUsersAsync(userIds, type, title, message, priority);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notifications for all users");
                throw;
            }
        }

        #endregion

        #region Analytics and Management

        public async Task<object> GetNotificationStatsAsync(int? userId = null, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                var query = _context.BettingNotifications.AsQueryable();

                if (userId.HasValue)
                    query = query.Where(n => n.UserId == userId.Value);

                if (startDate.HasValue)
                    query = query.Where(n => n.CreatedAt >= startDate.Value);

                if (endDate.HasValue)
                    query = query.Where(n => n.CreatedAt <= endDate.Value);

                var totalNotifications = await query.CountAsync();
                var unreadNotifications = await query.CountAsync(n => !n.IsRead);
                var readNotifications = totalNotifications - unreadNotifications;
                var expiredNotifications = await query.CountAsync(n => n.ExpiresAt.HasValue && n.ExpiresAt.Value < DateTime.UtcNow);

                var notificationsByType = await query
                    .GroupBy(n => n.Type)
                    .Select(g => new { Type = g.Key.ToString(), Count = g.Count() })
                    .ToDictionaryAsync(x => x.Type, x => x.Count);

                var notificationsByPriority = await query
                    .GroupBy(n => n.Priority)
                    .Select(g => new { Priority = g.Key.ToString(), Count = g.Count() })
                    .ToDictionaryAsync(x => x.Priority, x => x.Count);

                var lastNotificationAt = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => (DateTime?)n.CreatedAt)
                    .FirstOrDefaultAsync();

                var lastReadAt = await query
                    .Where(n => n.ReadAt.HasValue)
                    .OrderByDescending(n => n.ReadAt)
                    .Select(n => n.ReadAt)
                    .FirstOrDefaultAsync();

                return new
                {
                    totalNotifications,
                    unreadNotifications,
                    readNotifications,
                    expiredNotifications,
                    notificationsByType,
                    notificationsByPriority,
                    lastNotificationAt,
                    lastReadAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notification stats");
                throw;
            }
        }

        public async Task<List<BettingNotificationDto>> GetRecentSystemNotificationsAsync(int count = 10)
        {
            try
            {
                var notifications = await _context.BettingNotifications
                    .Where(n => n.Type == BettingNotificationType.SystemMessage)
                    .OrderByDescending(n => n.CreatedAt)
                    .Take(count)
                    .Select(n => new BettingNotificationDto
                    {
                        Id = n.Id,
                        UserId = n.UserId,
                        Type = n.Type,
                        TypeDisplayName = n.Type.GetBettingNotificationTypeDisplayName(),
                        Title = n.Title,
                        Message = n.Message,
                        Priority = n.Priority,
                        PriorityDisplayName = n.Priority.GetBettingNotificationPriorityDisplayName(),
                        IsRead = n.IsRead,
                        CreatedAt = n.CreatedAt,
                        ReadAt = n.ReadAt,
                        ExpiresAt = n.ExpiresAt,
                        IsExpired = n.ExpiresAt.HasValue && DateTime.UtcNow > n.ExpiresAt.Value,
                        TimeToExpiry = n.ExpiresAt.HasValue ? n.ExpiresAt.Value - DateTime.UtcNow : null,
                        ActionUrl = n.ActionUrl,
                        ActionText = n.ActionText,
                        Metadata = n.Metadata
                    })
                    .ToListAsync();

                return notifications;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recent system notifications");
                return new List<BettingNotificationDto>();
            }
        }

        #endregion
    }
}