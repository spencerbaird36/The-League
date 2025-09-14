namespace FantasyLeague.Api.Services
{
    public class EmailMonitoringBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<EmailMonitoringBackgroundService> _logger;
        private readonly TimeSpan _healthCheckInterval = TimeSpan.FromMinutes(15); // Check every 15 minutes
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(24); // Cleanup daily

        public EmailMonitoringBackgroundService(IServiceScopeFactory scopeFactory, ILogger<EmailMonitoringBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Email Monitoring Background Service started");

            var lastCleanup = DateTime.MinValue;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var monitoringService = scope.ServiceProvider.GetRequiredService<IEmailMonitoringService>();

                    // Perform health checks
                    await monitoringService.CheckEmailSystemHealthAsync();

                    // Perform daily cleanup if needed
                    if (DateTime.UtcNow - lastCleanup >= _cleanupInterval)
                    {
                        await monitoringService.CleanupOldEmailLogsAsync();
                        lastCleanup = DateTime.UtcNow;
                    }

                    _logger.LogDebug("Email monitoring cycle completed successfully");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in email monitoring background service");
                }

                // Wait for the next cycle
                await Task.Delay(_healthCheckInterval, stoppingToken);
            }

            _logger.LogInformation("Email Monitoring Background Service stopped");
        }
    }
}