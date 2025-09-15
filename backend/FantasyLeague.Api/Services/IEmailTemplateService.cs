using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public interface IEmailTemplateService
    {
        Task<string> RenderTradeProposalEmailAsync(User targetUser, User proposingUser, string? message, string appBaseUrl, TradeProposal? tradeProposal = null);
        Task<string> RenderTradeAcceptedEmailAsync(User proposingUser, User targetUser, string appBaseUrl);
        Task<string> RenderTradeRejectedEmailAsync(User proposingUser, User targetUser, string appBaseUrl);
        string GeneratePlainTextFromHtml(string htmlContent);
    }
}