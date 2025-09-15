using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public interface IEmailService
    {
        Task<bool> SendTradeProposalNotificationAsync(User targetUser, User proposingUser, string message, TradeProposal? tradeProposal = null);
        Task<bool> SendTradeResponseNotificationAsync(User proposingUser, User targetUser, bool accepted, string message);
        Task<bool> SendEmailAsync(string to, string subject, string htmlContent, string? plainTextContent = null);
    }
}