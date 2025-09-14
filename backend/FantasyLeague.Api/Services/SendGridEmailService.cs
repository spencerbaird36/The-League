using SendGrid;
using SendGrid.Helpers.Mail;
using FantasyLeague.Api.Models;
using Microsoft.Extensions.Options;

namespace FantasyLeague.Api.Services
{
    public class SendGridEmailService : IEmailService
    {
        private readonly ISendGridClient _sendGridClient;
        private readonly EmailSettings _emailSettings;
        private readonly IEmailTemplateService _templateService;
        private readonly ILogger<SendGridEmailService> _logger;

        public SendGridEmailService(ISendGridClient sendGridClient, IOptions<EmailSettings> emailSettings, IEmailTemplateService templateService, ILogger<SendGridEmailService> logger)
        {
            _sendGridClient = sendGridClient;
            _emailSettings = emailSettings.Value;
            _templateService = templateService;
            _logger = logger;
        }

        public async Task<bool> SendTradeProposalNotificationAsync(User targetUser, User proposingUser, string message)
        {
            var subject = $"New Trade Proposal from {proposingUser.Username}";
            var htmlContent = await _templateService.RenderTradeProposalEmailAsync(targetUser, proposingUser, message, _emailSettings.AppBaseUrl);
            var plainTextContent = _templateService.GeneratePlainTextFromHtml(htmlContent);

            return await SendEmailAsync(targetUser.Email, subject, htmlContent, plainTextContent);
        }

        public async Task<bool> SendTradeResponseNotificationAsync(User proposingUser, User targetUser, bool accepted, string message)
        {
            var subject = $"Trade Proposal {(accepted ? "Accepted" : "Rejected")} by {targetUser.Username}";

            string htmlContent;
            if (accepted)
            {
                htmlContent = await _templateService.RenderTradeAcceptedEmailAsync(proposingUser, targetUser, _emailSettings.AppBaseUrl);
            }
            else
            {
                htmlContent = await _templateService.RenderTradeRejectedEmailAsync(proposingUser, targetUser, _emailSettings.AppBaseUrl);
            }

            var plainTextContent = _templateService.GeneratePlainTextFromHtml(htmlContent);

            return await SendEmailAsync(proposingUser.Email, subject, htmlContent, plainTextContent);
        }

        public async Task<bool> SendEmailAsync(string to, string subject, string htmlContent, string? plainTextContent = null)
        {
            try
            {
                var from = new EmailAddress(_emailSettings.FromEmail, _emailSettings.FromName);
                var toAddress = new EmailAddress(to);

                var msg = MailHelper.CreateSingleEmail(from, toAddress, subject, plainTextContent, htmlContent);

                var response = await _sendGridClient.SendEmailAsync(msg);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"📧 Email sent successfully to {to} with subject: {subject}");
                    return true;
                }
                else
                {
                    var responseBody = await response.Body.ReadAsStringAsync();
                    _logger.LogError($"❌ Failed to send email to {to}. Status: {response.StatusCode}, Response: {responseBody}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Exception occurred while sending email to {to}");
                return false;
            }
        }
    }

    public class EmailSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string FromEmail { get; set; } = string.Empty;
        public string FromName { get; set; } = string.Empty;
        public string AppBaseUrl { get; set; } = string.Empty;
    }
}