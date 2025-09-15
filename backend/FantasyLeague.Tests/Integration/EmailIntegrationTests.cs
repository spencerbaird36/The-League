using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SendGrid;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.Services;

namespace FantasyLeague.Tests.Integration
{
    [TestFixture]
    public class EmailIntegrationTests
    {
        private ServiceProvider _serviceProvider;
        private FantasyLeagueContext _context;
        private IBackgroundEmailService _backgroundEmailService;

        [SetUp]
        public void SetUp()
        {
            var services = new ServiceCollection();

            // Add In-Memory Database
            services.AddDbContext<FantasyLeagueContext>(options =>
                options.UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()));

            // Mock SendGrid client
            var mockSendGridClient = new Mock<ISendGridClient>();
            services.AddSingleton(mockSendGridClient.Object);

            // Configure email settings
            var emailSettings = new EmailSettings
            {
                ApiKey = "test-key",
                FromEmail = "test@example.com",
                FromName = "Test League",
                AppBaseUrl = "http://localhost:3000"
            };
            services.Configure<EmailSettings>(options =>
            {
                options.ApiKey = emailSettings.ApiKey;
                options.FromEmail = emailSettings.FromEmail;
                options.FromName = emailSettings.FromName;
                options.AppBaseUrl = emailSettings.AppBaseUrl;
            });

            // Add required services
            services.AddLogging(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Warning));
            services.AddScoped<IEmailTemplateService, EmailTemplateService>();
            services.AddScoped<IEmailService, SendGridEmailService>();
            // Service scope factory is added automatically by the service collection
            services.AddScoped<IBackgroundEmailService, BackgroundEmailService>();

            // Mock web host environment
            var mockEnvironment = new Mock<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
            mockEnvironment.Setup(x => x.ContentRootPath).Returns("/fake/path");
            services.AddSingleton(mockEnvironment.Object);

            _serviceProvider = services.BuildServiceProvider();
            _context = _serviceProvider.GetRequiredService<FantasyLeagueContext>();
            _backgroundEmailService = _serviceProvider.GetRequiredService<IBackgroundEmailService>();
        }

        [TearDown]
        public void TearDown()
        {
            _context?.Dispose();
            _serviceProvider?.Dispose();
        }

        [Test]
        public async Task QueueTradeProposalEmailAsync_WithValidUsers_CreatesEmailLog()
        {
            // Arrange
            var league = new League
            {
                Id = 1,
                Name = "Test League",
                CreatedAt = DateTime.UtcNow
            };

            var targetUser = new User
            {
                Id = 1,
                Username = "target",
                Email = "target@test.com",
                FirstName = "Target",
                EmailNotificationsEnabled = true,
                TradeProposalEmailsEnabled = true,
                LeagueId = 1
            };

            var proposingUser = new User
            {
                Id = 2,
                Username = "proposer",
                Email = "proposer@test.com",
                FirstName = "Proposer",
                LeagueId = 1
            };

            var tradeProposal = new TradeProposal
            {
                Id = 1,
                LeagueId = 1,
                ProposingUserId = 2,
                TargetUserId = 1,
                Status = "pending",
                Message = "Test trade",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _context.Leagues.Add(league);
            _context.Users.AddRange(targetUser, proposingUser);
            _context.TradeProposals.Add(tradeProposal);
            await _context.SaveChangesAsync();

            // Act
            await _backgroundEmailService.QueueTradeProposalEmailAsync(1, 2, "Test message", 1);

            // Assert
            var emailLog = await _context.EmailDeliveryLogs.FirstOrDefaultAsync();
            Assert.That(emailLog, Is.Not.Null);
            Assert.That(emailLog.UserId, Is.EqualTo(1));
            Assert.That(emailLog.EmailAddress, Is.EqualTo("target@test.com"));
            Assert.That(emailLog.EmailType, Is.EqualTo("TradeProposal"));
            Assert.That(emailLog.Status, Is.EqualTo("pending"));
            Assert.That(emailLog.TradeProposalId, Is.EqualTo(1));
        }

        [Test]
        public async Task QueueTradeProposalEmailAsync_UserNotificationsDisabled_DoesNotCreateEmailLog()
        {
            // Arrange
            var league = new League
            {
                Id = 1,
                Name = "Test League",
                CreatedAt = DateTime.UtcNow
            };

            var targetUser = new User
            {
                Id = 1,
                Username = "target",
                Email = "target@test.com",
                FirstName = "Target",
                EmailNotificationsEnabled = false, // Disabled
                TradeProposalEmailsEnabled = true,
                LeagueId = 1
            };

            var proposingUser = new User
            {
                Id = 2,
                Username = "proposer",
                Email = "proposer@test.com",
                FirstName = "Proposer",
                LeagueId = 1
            };

            _context.Leagues.Add(league);
            _context.Users.AddRange(targetUser, proposingUser);
            await _context.SaveChangesAsync();

            // Act
            await _backgroundEmailService.QueueTradeProposalEmailAsync(1, 2, "Test message", 1);

            // Assert
            var emailLog = await _context.EmailDeliveryLogs.FirstOrDefaultAsync();
            Assert.That(emailLog, Is.Null);
        }

        [Test]
        public async Task QueueTradeResponseEmailAsync_WithValidUsers_CreatesEmailLog()
        {
            // Arrange
            var league = new League
            {
                Id = 1,
                Name = "Test League",
                CreatedAt = DateTime.UtcNow
            };

            var proposingUser = new User
            {
                Id = 1,
                Username = "proposer",
                Email = "proposer@test.com",
                FirstName = "Proposer",
                EmailNotificationsEnabled = true,
                TradeResponseEmailsEnabled = true,
                LeagueId = 1
            };

            var targetUser = new User
            {
                Id = 2,
                Username = "target",
                Email = "target@test.com",
                FirstName = "Target",
                LeagueId = 1
            };

            var tradeProposal = new TradeProposal
            {
                Id = 1,
                LeagueId = 1,
                ProposingUserId = 1,
                TargetUserId = 2,
                Status = "accepted",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _context.Leagues.Add(league);
            _context.Users.AddRange(proposingUser, targetUser);
            _context.TradeProposals.Add(tradeProposal);
            await _context.SaveChangesAsync();

            // Act
            await _backgroundEmailService.QueueTradeResponseEmailAsync(1, 2, true, "Trade accepted", 1);

            // Assert
            var emailLog = await _context.EmailDeliveryLogs.FirstOrDefaultAsync();
            Assert.That(emailLog, Is.Not.Null);
            Assert.That(emailLog.UserId, Is.EqualTo(1)); // Proposing user gets the notification
            Assert.That(emailLog.EmailAddress, Is.EqualTo("proposer@test.com"));
            Assert.That(emailLog.EmailType, Is.EqualTo("TradeAccepted"));
            Assert.That(emailLog.Status, Is.EqualTo("pending"));
            Assert.That(emailLog.TradeProposalId, Is.EqualTo(1));
        }

        [Test]
        public async Task QueueTradeResponseEmailAsync_Rejected_CreatesCorrectEmailType()
        {
            // Arrange
            var league = new League
            {
                Id = 1,
                Name = "Test League",
                CreatedAt = DateTime.UtcNow
            };

            var proposingUser = new User
            {
                Id = 1,
                Username = "proposer",
                Email = "proposer@test.com",
                FirstName = "Proposer",
                EmailNotificationsEnabled = true,
                TradeResponseEmailsEnabled = true,
                LeagueId = 1
            };

            var targetUser = new User
            {
                Id = 2,
                Username = "target",
                Email = "target@test.com",
                FirstName = "Target",
                LeagueId = 1
            };

            _context.Leagues.Add(league);
            _context.Users.AddRange(proposingUser, targetUser);
            await _context.SaveChangesAsync();

            // Act
            await _backgroundEmailService.QueueTradeResponseEmailAsync(1, 2, false, "Trade rejected", 1);

            // Assert
            var emailLog = await _context.EmailDeliveryLogs.FirstOrDefaultAsync();
            Assert.That(emailLog, Is.Not.Null);
            Assert.That(emailLog.EmailType, Is.EqualTo("TradeRejected"));
            Assert.That(emailLog.Subject, Does.Contain("Rejected"));
        }

        [Test]
        public async Task QueueTradeResponseEmailAsync_UserNotificationsDisabled_DoesNotCreateEmailLog()
        {
            // Arrange
            var league = new League
            {
                Id = 1,
                Name = "Test League",
                CreatedAt = DateTime.UtcNow
            };

            var proposingUser = new User
            {
                Id = 1,
                Username = "proposer",
                Email = "proposer@test.com",
                FirstName = "Proposer",
                EmailNotificationsEnabled = false, // Disabled
                TradeResponseEmailsEnabled = true,
                LeagueId = 1
            };

            var targetUser = new User
            {
                Id = 2,
                Username = "target",
                Email = "target@test.com",
                FirstName = "Target",
                LeagueId = 1
            };

            _context.Leagues.Add(league);
            _context.Users.AddRange(proposingUser, targetUser);
            await _context.SaveChangesAsync();

            // Act
            await _backgroundEmailService.QueueTradeResponseEmailAsync(1, 2, true, "Trade accepted", 1);

            // Assert
            var emailLog = await _context.EmailDeliveryLogs.FirstOrDefaultAsync();
            Assert.That(emailLog, Is.Null);
        }

        [Test]
        public async Task ProcessEmailQueueAsync_WithValidEmailLog_UpdatesStatusToFailed()
        {
            // Arrange - This test will fail because SendGrid is mocked to not respond successfully
            var league = new League { Id = 1, Name = "Test League" };
            var user = new User
            {
                Id = 1,
                Username = "test",
                Email = "test@test.com",
                FirstName = "Test",
                LeagueId = 1
            };

            var proposingUser = new User
            {
                Id = 2,
                Username = "proposer",
                Email = "proposer@test.com",
                FirstName = "Proposer",
                LeagueId = 1
            };

            var tradeProposal = new TradeProposal
            {
                Id = 1,
                LeagueId = 1,
                ProposingUserId = 2,
                TargetUserId = 1,
                Status = "pending",
                ProposingUser = proposingUser,
                TargetUser = user,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            var emailLog = new EmailDeliveryLog
            {
                Id = 1,
                UserId = 1,
                EmailAddress = "test@test.com",
                EmailType = "TradeProposal",
                Subject = "Test Subject",
                Status = "pending",
                TradeProposalId = 1,
                User = user,
                TradeProposal = tradeProposal
            };

            _context.Leagues.Add(league);
            _context.Users.AddRange(user, proposingUser);
            _context.TradeProposals.Add(tradeProposal);
            _context.EmailDeliveryLogs.Add(emailLog);
            await _context.SaveChangesAsync();

            // Act
            await _backgroundEmailService.ProcessEmailQueueAsync(1);

            // Assert
            var updatedEmailLog = await _context.EmailDeliveryLogs.FindAsync(1);
            Assert.That(updatedEmailLog, Is.Not.Null);
            Assert.That(updatedEmailLog.Status, Is.EqualTo("failed")); // Will fail because SendGrid is mocked
            Assert.That(updatedEmailLog.RetryCount, Is.EqualTo(1));
        }
    }
}