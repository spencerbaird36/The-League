using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public interface IBackgroundEmailService
    {
        Task QueueTradeProposalEmailAsync(int targetUserId, int proposingUserId, string? message, int? tradeProposalId);
        Task QueueTradeResponseEmailAsync(int proposingUserId, int targetUserId, bool accepted, string message, int? tradeProposalId);
        Task ProcessEmailQueueAsync(int emailLogId);
        Task ProcessEmailDeliveryStatusAsync(string sendGridMessageId);
        Task RetryFailedEmailAsync(int emailLogId);
    }
}