using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SendGrid;
using SendGrid.Helpers.Mail;
using System.Net;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Tests.Services
{
    [TestFixture]
    public class SendGridEmailServiceTests
    {
        private SendGridEmailService _sendGridEmailService;
        private Mock<ISendGridClient> _mockSendGridClient;
        private Mock<IEmailTemplateService> _mockTemplateService;
        private Mock<ILogger<SendGridEmailService>> _mockLogger;
        private EmailSettings _emailSettings;

        [SetUp]
        public void SetUp()
        {
            _mockSendGridClient = new Mock<ISendGridClient>();
            _mockTemplateService = new Mock<IEmailTemplateService>();
            _mockLogger = new Mock<ILogger<SendGridEmailService>>();

            _emailSettings = new EmailSettings
            {
                ApiKey = "test-api-key",
                FromEmail = "noreply@test.com",
                FromName = "Test Fantasy League",
                AppBaseUrl = "http://localhost:3000"
            };

            var mockOptions = new Mock<IOptions<EmailSettings>>();
            mockOptions.Setup(x => x.Value).Returns(_emailSettings);

            _sendGridEmailService = new SendGridEmailService(
                _mockSendGridClient.Object,
                mockOptions.Object,
                _mockTemplateService.Object,
                _mockLogger.Object
            );
        }

        [Test]
        public async Task SendEmailAsync_Success_ReturnsTrue()
        {
            // Arrange
            var to = "test@example.com";
            var subject = "Test Subject";
            var htmlContent = "<html><body>Test</body></html>";
            var plainTextContent = "Test";

            // Create a concrete Response object - we can't mock sealed/non-virtual properties
            var response = new Response(HttpStatusCode.Accepted, null, null);

            _mockSendGridClient.Setup(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()))
                              .ReturnsAsync(response);

            // Act
            var result = await _sendGridEmailService.SendEmailAsync(to, subject, htmlContent, plainTextContent);

            // Assert
            Assert.That(result, Is.True);
            _mockSendGridClient.Verify(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Test]
        public async Task SendEmailAsync_Failure_ReturnsFalse()
        {
            // Arrange
            var to = "test@example.com";
            var subject = "Test Subject";
            var htmlContent = "<html><body>Test</body></html>";
            var plainTextContent = "Test";

            // Create a concrete Response object for failure case
            var response = new Response(HttpStatusCode.BadRequest, null, null);

            _mockSendGridClient.Setup(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()))
                              .ReturnsAsync(response);

            // Act
            var result = await _sendGridEmailService.SendEmailAsync(to, subject, htmlContent, plainTextContent);

            // Assert
            Assert.That(result, Is.False);
        }

        [Test]
        public async Task SendEmailAsync_Exception_ReturnsFalse()
        {
            // Arrange
            var to = "test@example.com";
            var subject = "Test Subject";
            var htmlContent = "<html><body>Test</body></html>";

            _mockSendGridClient.Setup(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()))
                              .ThrowsAsync(new Exception("SendGrid error"));

            // Act
            var result = await _sendGridEmailService.SendEmailAsync(to, subject, htmlContent);

            // Assert
            Assert.That(result, Is.False);
        }

        [Test]
        public async Task SendTradeProposalNotificationAsync_CallsTemplateService()
        {
            // Arrange
            var targetUser = new User
            {
                Id = 1,
                Username = "target",
                Email = "target@example.com",
                FirstName = "Target"
            };

            var proposingUser = new User
            {
                Id = 2,
                Username = "proposer",
                Email = "proposer@example.com",
                FirstName = "Proposer"
            };

            var message = "Test message";
            var htmlContent = "<html><body>Trade Proposal</body></html>";
            var plainTextContent = "Trade Proposal";

            _mockTemplateService.Setup(x => x.RenderTradeProposalEmailAsync(targetUser, proposingUser, message, _emailSettings.AppBaseUrl))
                               .ReturnsAsync(htmlContent);

            _mockTemplateService.Setup(x => x.GeneratePlainTextFromHtml(htmlContent))
                               .Returns(plainTextContent);

            var response = new Response(HttpStatusCode.Accepted, null, null);
            _mockSendGridClient.Setup(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()))
                              .ReturnsAsync(response);

            // Act
            var result = await _sendGridEmailService.SendTradeProposalNotificationAsync(targetUser, proposingUser, message);

            // Assert
            Assert.That(result, Is.True);
            _mockTemplateService.Verify(x => x.RenderTradeProposalEmailAsync(targetUser, proposingUser, message, _emailSettings.AppBaseUrl), Times.Once);
            _mockTemplateService.Verify(x => x.GeneratePlainTextFromHtml(htmlContent), Times.Once);
        }

        [Test]
        public async Task SendTradeResponseNotificationAsync_Accepted_CallsCorrectTemplate()
        {
            // Arrange
            var proposingUser = new User
            {
                Id = 1,
                Username = "proposer",
                Email = "proposer@example.com",
                FirstName = "Proposer"
            };

            var targetUser = new User
            {
                Id = 2,
                Username = "target",
                Email = "target@example.com",
                FirstName = "Target"
            };

            var accepted = true;
            var message = "Trade accepted!";
            var htmlContent = "<html><body>Trade Accepted</body></html>";
            var plainTextContent = "Trade Accepted";

            _mockTemplateService.Setup(x => x.RenderTradeAcceptedEmailAsync(proposingUser, targetUser, _emailSettings.AppBaseUrl))
                               .ReturnsAsync(htmlContent);

            _mockTemplateService.Setup(x => x.GeneratePlainTextFromHtml(htmlContent))
                               .Returns(plainTextContent);

            var response = new Response(HttpStatusCode.Accepted, null, null);
            _mockSendGridClient.Setup(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()))
                              .ReturnsAsync(response);

            // Act
            var result = await _sendGridEmailService.SendTradeResponseNotificationAsync(proposingUser, targetUser, accepted, message);

            // Assert
            Assert.That(result, Is.True);
            _mockTemplateService.Verify(x => x.RenderTradeAcceptedEmailAsync(proposingUser, targetUser, _emailSettings.AppBaseUrl), Times.Once);
            _mockTemplateService.Verify(x => x.RenderTradeRejectedEmailAsync(It.IsAny<User>(), It.IsAny<User>(), It.IsAny<string>()), Times.Never);
        }

        [Test]
        public async Task SendTradeResponseNotificationAsync_Rejected_CallsCorrectTemplate()
        {
            // Arrange
            var proposingUser = new User
            {
                Id = 1,
                Username = "proposer",
                Email = "proposer@example.com",
                FirstName = "Proposer"
            };

            var targetUser = new User
            {
                Id = 2,
                Username = "target",
                Email = "target@example.com",
                FirstName = "Target"
            };

            var accepted = false;
            var message = "Trade rejected";
            var htmlContent = "<html><body>Trade Rejected</body></html>";
            var plainTextContent = "Trade Rejected";

            _mockTemplateService.Setup(x => x.RenderTradeRejectedEmailAsync(proposingUser, targetUser, _emailSettings.AppBaseUrl))
                               .ReturnsAsync(htmlContent);

            _mockTemplateService.Setup(x => x.GeneratePlainTextFromHtml(htmlContent))
                               .Returns(plainTextContent);

            var response = new Response(HttpStatusCode.Accepted, null, null);
            _mockSendGridClient.Setup(x => x.SendEmailAsync(It.IsAny<SendGridMessage>(), It.IsAny<CancellationToken>()))
                              .ReturnsAsync(response);

            // Act
            var result = await _sendGridEmailService.SendTradeResponseNotificationAsync(proposingUser, targetUser, accepted, message);

            // Assert
            Assert.That(result, Is.True);
            _mockTemplateService.Verify(x => x.RenderTradeRejectedEmailAsync(proposingUser, targetUser, _emailSettings.AppBaseUrl), Times.Once);
            _mockTemplateService.Verify(x => x.RenderTradeAcceptedEmailAsync(It.IsAny<User>(), It.IsAny<User>(), It.IsAny<string>()), Times.Never);
        }
    }
}