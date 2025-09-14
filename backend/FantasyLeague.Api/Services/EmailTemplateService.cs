using System.Text.RegularExpressions;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class EmailTemplateService : IEmailTemplateService
    {
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<EmailTemplateService> _logger;

        public EmailTemplateService(IWebHostEnvironment environment, ILogger<EmailTemplateService> logger)
        {
            _environment = environment;
            _logger = logger;
        }

        public async Task<string> RenderTradeProposalEmailAsync(User targetUser, User proposingUser, string? message, string appBaseUrl)
        {
            var template = await LoadTemplateAsync("TradeProposalEmail.html");

            var replacements = new Dictionary<string, string>
            {
                {"{{TargetUserName}}", GetDisplayName(targetUser)},
                {"{{ProposingUserName}}", proposingUser.Username},
                {"{{AppBaseUrl}}", appBaseUrl}
            };

            var renderedTemplate = ReplaceTokens(template, replacements);

            // Handle conditional message section
            if (!string.IsNullOrEmpty(message))
            {
                renderedTemplate = renderedTemplate.Replace("{{#if Message}}", "");
                renderedTemplate = renderedTemplate.Replace("{{/if}}", "");
                renderedTemplate = renderedTemplate.Replace("{{Message}}", message);
            }
            else
            {
                // Remove the entire conditional section
                renderedTemplate = RemoveConditionalSection(renderedTemplate, "{{#if Message}}", "{{/if}}");
            }

            return renderedTemplate;
        }

        public async Task<string> RenderTradeAcceptedEmailAsync(User proposingUser, User targetUser, string appBaseUrl)
        {
            var template = await LoadTemplateAsync("TradeAcceptedEmail.html");

            var replacements = new Dictionary<string, string>
            {
                {"{{ProposingUserName}}", GetDisplayName(proposingUser)},
                {"{{TargetUserName}}", targetUser.Username},
                {"{{AppBaseUrl}}", appBaseUrl}
            };

            return ReplaceTokens(template, replacements);
        }

        public async Task<string> RenderTradeRejectedEmailAsync(User proposingUser, User targetUser, string appBaseUrl)
        {
            var template = await LoadTemplateAsync("TradeRejectedEmail.html");

            var replacements = new Dictionary<string, string>
            {
                {"{{ProposingUserName}}", GetDisplayName(proposingUser)},
                {"{{TargetUserName}}", targetUser.Username},
                {"{{AppBaseUrl}}", appBaseUrl}
            };

            return ReplaceTokens(template, replacements);
        }

        public string GeneratePlainTextFromHtml(string htmlContent)
        {
            if (string.IsNullOrEmpty(htmlContent))
                return string.Empty;

            try
            {
                // Remove HTML tags
                var plainText = Regex.Replace(htmlContent, "<[^>]*>", " ");

                // Replace multiple spaces with single space
                plainText = Regex.Replace(plainText, @"\s+", " ");

                // Replace HTML entities
                plainText = plainText.Replace("&nbsp;", " ");
                plainText = plainText.Replace("&amp;", "&");
                plainText = plainText.Replace("&lt;", "<");
                plainText = plainText.Replace("&gt;", ">");
                plainText = plainText.Replace("&quot;", "\"");
                plainText = plainText.Replace("&#39;", "'");

                // Clean up whitespace
                plainText = plainText.Trim();

                // Add basic formatting for readability
                plainText = Regex.Replace(plainText, @"New Trade Proposal", "NEW TRADE PROPOSAL\n");
                plainText = Regex.Replace(plainText, @"Trade Accepted!", "TRADE ACCEPTED!\n");
                plainText = Regex.Replace(plainText, @"Trade Rejected", "TRADE REJECTED\n");

                return plainText;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate plain text from HTML, returning basic fallback");
                return "Please view this email in an HTML-capable email client.";
            }
        }

        private async Task<string> LoadTemplateAsync(string templateName)
        {
            try
            {
                var templatePath = Path.Combine(_environment.ContentRootPath, "Templates", "Email", templateName);

                if (!File.Exists(templatePath))
                {
                    _logger.LogError($"Email template not found: {templatePath}");
                    return GetFallbackTemplate(templateName);
                }

                var template = await File.ReadAllTextAsync(templatePath);
                _logger.LogDebug($"Successfully loaded email template: {templateName}");
                return template;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error loading email template: {templateName}");
                return GetFallbackTemplate(templateName);
            }
        }

        private string ReplaceTokens(string template, Dictionary<string, string> replacements)
        {
            var result = template;

            foreach (var replacement in replacements)
            {
                result = result.Replace(replacement.Key, replacement.Value ?? string.Empty);
            }

            return result;
        }

        private string RemoveConditionalSection(string template, string startTag, string endTag)
        {
            var startIndex = template.IndexOf(startTag);
            if (startIndex == -1) return template;

            var endIndex = template.IndexOf(endTag, startIndex);
            if (endIndex == -1) return template;

            // Remove the entire section including the tags
            endIndex += endTag.Length;
            return template.Remove(startIndex, endIndex - startIndex);
        }

        private string GetDisplayName(User user)
        {
            if (!string.IsNullOrEmpty(user.FirstName))
            {
                return user.FirstName;
            }
            return user.Username;
        }

        private string GetFallbackTemplate(string templateName)
        {
            // Return a basic fallback template if file loading fails
            return templateName switch
            {
                "TradeProposalEmail.html" => @"
                    <html><body>
                    <h1>New Trade Proposal</h1>
                    <p>{{ProposingUserName}} has proposed a trade with you.</p>
                    <p><a href='{{AppBaseUrl}}'>View Trade Proposal</a></p>
                    </body></html>",

                "TradeAcceptedEmail.html" => @"
                    <html><body>
                    <h1>Trade Accepted</h1>
                    <p>{{TargetUserName}} has accepted your trade proposal!</p>
                    <p><a href='{{AppBaseUrl}}'>View Your Roster</a></p>
                    </body></html>",

                "TradeRejectedEmail.html" => @"
                    <html><body>
                    <h1>Trade Rejected</h1>
                    <p>{{TargetUserName}} has rejected your trade proposal.</p>
                    <p><a href='{{AppBaseUrl}}'>Try Another Trade</a></p>
                    </body></html>",

                _ => @"<html><body><p>Email content unavailable.</p></body></html>"
            };
        }
    }
}