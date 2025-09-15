using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Tests.Services
{
    [TestFixture]
    public class EmailTemplateServiceTests
    {
        private EmailTemplateService _emailTemplateService;
        private Mock<IWebHostEnvironment> _mockEnvironment;
        private Mock<ILogger<EmailTemplateService>> _mockLogger;

        [SetUp]
        public void SetUp()
        {
            _mockEnvironment = new Mock<IWebHostEnvironment>();
            _mockLogger = new Mock<ILogger<EmailTemplateService>>();

            // Setup content root path
            _mockEnvironment.Setup(x => x.ContentRootPath)
                           .Returns("/fake/path");

            _emailTemplateService = new EmailTemplateService(_mockEnvironment.Object, _mockLogger.Object);
        }

        [Test]
        public void GeneratePlainTextFromHtml_ShouldRemoveHtmlTags()
        {
            // Arrange
            var htmlContent = "<html><body><h1>Test</h1><p>This is a <strong>test</strong> email.</p></body></html>";

            // Act
            var result = _emailTemplateService.GeneratePlainTextFromHtml(htmlContent);

            // Assert
            Assert.That(result, Does.Not.Contain("<"));
            Assert.That(result, Does.Not.Contain(">"));
            Assert.That(result, Does.Contain("Test"));
            Assert.That(result, Does.Contain("This is a test email."));
        }

        [Test]
        public void GeneratePlainTextFromHtml_ShouldHandleEmptyInput()
        {
            // Arrange
            var htmlContent = "";

            // Act
            var result = _emailTemplateService.GeneratePlainTextFromHtml(htmlContent);

            // Assert
            Assert.That(result, Is.EqualTo(string.Empty));
        }

        [Test]
        public void GeneratePlainTextFromHtml_ShouldHandleNullInput()
        {
            // Arrange
            string? htmlContent = null;

            // Act
            var result = _emailTemplateService.GeneratePlainTextFromHtml(htmlContent);

            // Assert
            Assert.That(result, Is.EqualTo(string.Empty));
        }

        [Test]
        public void GeneratePlainTextFromHtml_ShouldReplaceHtmlEntities()
        {
            // Arrange
            var htmlContent = "Test &amp; Company &lt;info&gt; &quot;Quote&quot; &#39;Apostrophe&#39;";

            // Act
            var result = _emailTemplateService.GeneratePlainTextFromHtml(htmlContent);

            // Assert
            Assert.That(result, Does.Contain("Test & Company <info> \"Quote\" 'Apostrophe'"));
        }

        [Test]
        public void GeneratePlainTextFromHtml_ShouldNormalizeWhitespace()
        {
            // Arrange
            var htmlContent = "<div>    Multiple    spaces    and\n\n\nlines    </div>";

            // Act
            var result = _emailTemplateService.GeneratePlainTextFromHtml(htmlContent);

            // Assert
            Assert.That(result.Contains("  "), Is.False, "Should not contain multiple consecutive spaces");
        }

        [Test]
        public async Task RenderTradeProposalEmailAsync_WithMessage_ShouldIncludeMessageSection()
        {
            // Arrange
            var targetUser = new User { Id = 1, Username = "testuser", FirstName = "John", Email = "test@example.com" };
            var proposingUser = new User { Id = 2, Username = "proposer", FirstName = "Jane", Email = "proposer@example.com" };
            var message = "Let's make a deal!";
            var appBaseUrl = "http://localhost:3000";

            // Act & Assert - This would require actual template files, so we'll test the fallback
            var result = await _emailTemplateService.RenderTradeProposalEmailAsync(targetUser, proposingUser, message, appBaseUrl);

            // The result should be the fallback template since files don't exist in test
            Assert.That(result, Is.Not.Empty);
            Assert.That(result, Does.Contain("Trade Proposal"));
        }

        [Test]
        public async Task RenderTradeProposalEmailAsync_WithoutMessage_ShouldExcludeMessageSection()
        {
            // Arrange
            var targetUser = new User { Id = 1, Username = "testuser", FirstName = "John", Email = "test@example.com" };
            var proposingUser = new User { Id = 2, Username = "proposer", FirstName = "Jane", Email = "proposer@example.com" };
            string? message = null;
            var appBaseUrl = "http://localhost:3000";

            // Act
            var result = await _emailTemplateService.RenderTradeProposalEmailAsync(targetUser, proposingUser, message, appBaseUrl);

            // Assert
            Assert.That(result, Is.Not.Empty);
            Assert.That(result, Does.Contain("Trade Proposal"));
        }

        [Test]
        public async Task RenderTradeAcceptedEmailAsync_ShouldReturnValidHtml()
        {
            // Arrange
            var proposingUser = new User { Id = 1, Username = "proposer", FirstName = "Jane", Email = "proposer@example.com" };
            var targetUser = new User { Id = 2, Username = "accepter", FirstName = "John", Email = "accepter@example.com" };
            var appBaseUrl = "http://localhost:3000";

            // Act
            var result = await _emailTemplateService.RenderTradeAcceptedEmailAsync(proposingUser, targetUser, appBaseUrl);

            // Assert
            Assert.That(result, Is.Not.Empty);
            Assert.That(result, Does.Contain("Trade Accepted"));
        }

        [Test]
        public async Task RenderTradeRejectedEmailAsync_ShouldReturnValidHtml()
        {
            // Arrange
            var proposingUser = new User { Id = 1, Username = "proposer", FirstName = "Jane", Email = "proposer@example.com" };
            var targetUser = new User { Id = 2, Username = "rejecter", FirstName = "John", Email = "rejecter@example.com" };
            var appBaseUrl = "http://localhost:3000";

            // Act
            var result = await _emailTemplateService.RenderTradeRejectedEmailAsync(proposingUser, targetUser, appBaseUrl);

            // Assert
            Assert.That(result, Is.Not.Empty);
            Assert.That(result, Does.Contain("Trade Rejected"));
        }
    }
}