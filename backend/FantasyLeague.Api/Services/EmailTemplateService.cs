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

        public async Task<string> RenderTradeProposalEmailAsync(User targetUser, User proposingUser, string? message, string appBaseUrl, TradeProposal? tradeProposal = null)
        {
            var template = await LoadTemplateAsync("TradeProposalEmail.html");

            var tradeDetailsHtml = GenerateTradeDetailsTable(tradeProposal);

            var replacements = new Dictionary<string, string>
            {
                {"{{TargetUserName}}", GetDisplayName(targetUser)},
                {"{{ProposingUserName}}", proposingUser.Username},
                {"{{AppBaseUrl}}", appBaseUrl + "/my-team"},
                {"{{TradeDetails}}", tradeDetailsHtml}
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
                _logger.LogInformation($"Attempting to load email template: {templateName} from path: {templatePath}");
                _logger.LogInformation($"ContentRootPath: {_environment.ContentRootPath}");

                // Log directory contents for debugging
                var templateDir = Path.Combine(_environment.ContentRootPath, "Templates", "Email");
                if (Directory.Exists(templateDir))
                {
                    var files = Directory.GetFiles(templateDir);
                    _logger.LogInformation($"Templates directory contains: {string.Join(", ", files.Select(Path.GetFileName))}");
                }
                else
                {
                    _logger.LogWarning($"Templates directory does not exist: {templateDir}");
                }

                if (!File.Exists(templatePath))
                {
                    _logger.LogError($"Email template file not found: {templatePath}");
                    return GetFallbackTemplate(templateName);
                }

                var template = await File.ReadAllTextAsync(templatePath);
                var templateLength = template.Length;
                var templatePreview = template.Substring(0, Math.Min(200, template.Length));

                _logger.LogInformation($"Successfully loaded email template: {templateName} (Length: {templateLength} chars, Preview: {templatePreview.Replace('\n', ' ').Replace("\r", "")}...)");
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

        private string GenerateTradeDetailsTable(TradeProposal? tradeProposal)
        {
            if (tradeProposal == null)
            {
                return "<p>Trade details unavailable.</p>";
            }

            // Get all trade players for this proposal and filter by trade type
            var allTradePlayers = tradeProposal.TradePlayers.ToList();

            var proposingPlayers = allTradePlayers.Where(p => p.TradeType == "offering").ToList();
            var targetPlayers = allTradePlayers.Where(p => p.TradeType == "receiving").ToList();

            var html = @"
                <div class='trade-details'>
                    <table class='trade-table'>
                        <thead>
                            <tr>
                                <th style='text-align: center; background-color: #4CAF50; color: white; padding: 12px;'>
                                    " + tradeProposal.ProposingUser?.Username + @" Offers
                                </th>
                                <th style='text-align: center; background-color: #2196F3; color: white; padding: 12px;'>
                                    " + tradeProposal.TargetUser?.Username + @" Receives
                                </th>
                            </tr>
                        </thead>
                        <tbody>";

            var maxRows = Math.Max(proposingPlayers.Count, targetPlayers.Count);
            maxRows = Math.Max(maxRows, 1); // At least one row

            for (int i = 0; i < maxRows; i++)
            {
                var proposingPlayer = i < proposingPlayers.Count ? proposingPlayers[i] : null;
                var targetPlayer = i < targetPlayers.Count ? targetPlayers[i] : null;

                html += "<tr>";

                // Proposing player cell
                if (proposingPlayer != null)
                {
                    html += $@"
                        <td style='padding: 12px; border-bottom: 1px solid #ddd; text-align: center;'>
                            <div style='font-weight: bold; color: #2c3e50;'>{proposingPlayer.PlayerName}</div>
                            <div style='font-size: 14px; color: #666;'>{proposingPlayer.PlayerPosition} - {proposingPlayer.PlayerTeam} ({proposingPlayer.PlayerLeague})</div>
                        </td>";
                }
                else
                {
                    html += "<td style='padding: 12px; border-bottom: 1px solid #ddd;'>&nbsp;</td>";
                }

                // Target player cell
                if (targetPlayer != null)
                {
                    html += $@"
                        <td style='padding: 12px; border-bottom: 1px solid #ddd; text-align: center;'>
                            <div style='font-weight: bold; color: #2c3e50;'>{targetPlayer.PlayerName}</div>
                            <div style='font-size: 14px; color: #666;'>{targetPlayer.PlayerPosition} - {targetPlayer.PlayerTeam} ({targetPlayer.PlayerLeague})</div>
                        </td>";
                }
                else
                {
                    html += "<td style='padding: 12px; border-bottom: 1px solid #ddd;'>&nbsp;</td>";
                }

                html += "</tr>";
            }

            html += @"
                        </tbody>
                    </table>
                </div>";

            return html;
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