using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Services
{
    public interface IBettingNotificationService
    {
        // Core notification methods
        Task<BettingNotification> CreateNotificationAsync(
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
            string? metadata = null);

        Task<bool> MarkAsReadAsync(int notificationId, int userId);
        Task<bool> MarkAllAsReadAsync(int userId);
        Task<bool> DeleteNotificationAsync(int notificationId, int userId);
        Task<int> DeleteExpiredNotificationsAsync();

        // Retrieval methods
        Task<List<BettingNotificationDto>> GetUserNotificationsAsync(int userId, bool unreadOnly = false, int page = 1, int pageSize = 50);
        Task<int> GetUnreadCountAsync(int userId);
        Task<BettingNotificationDto?> GetNotificationAsync(int notificationId, int userId);

        // Betting event-specific notification methods
        Task NotifyBetPlacedAsync(Bet bet);
        Task NotifyBetSettledAsync(Bet bet, BetStatus previousStatus);
        Task NotifyNewBettingOpportunityAsync(int userId, MatchupBet? matchupBet = null, GameBet? gameBet = null);
        Task NotifyBettingLineUpdateAsync(int userId, MatchupBet? matchupBet = null, GameBet? gameBet = null);
        Task NotifyExpirationWarningAsync(Bet bet, TimeSpan timeUntilExpiry);
        Task NotifyLimitWarningAsync(int userId, string limitType, decimal currentAmount, decimal limit);
        Task NotifyBalanceAlertAsync(int userId, decimal currentBalance, decimal recommendedMinimum);
        Task NotifyWinStreakAsync(int userId, int streakCount, decimal totalWinnings);
        Task NotifyLossStreakAsync(int userId, int streakCount, decimal totalLosses);
        Task NotifyBigWinAsync(Bet bet);
        Task NotifyBigLossAsync(Bet bet);
        Task NotifySystemMessageAsync(string title, string message, BettingNotificationPriority priority = BettingNotificationPriority.Normal, int? specificUserId = null);

        // Batch notification methods
        Task NotifyMultipleUsersAsync(List<int> userIds, BettingNotificationType type, string title, string message, BettingNotificationPriority priority = BettingNotificationPriority.Normal);
        Task NotifyAllUsersAsync(BettingNotificationType type, string title, string message, BettingNotificationPriority priority = BettingNotificationPriority.Normal);

        // Analytics and management
        Task<object> GetNotificationStatsAsync(int? userId = null, DateTime? startDate = null, DateTime? endDate = null);
        Task<List<BettingNotificationDto>> GetRecentSystemNotificationsAsync(int count = 10);
    }
}