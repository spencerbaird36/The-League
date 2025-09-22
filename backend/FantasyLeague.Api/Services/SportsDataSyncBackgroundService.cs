using FantasyLeague.Api.Services;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Services
{
    public class SportsDataSyncBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SportsDataSyncBackgroundService> _logger;
        private readonly TimeSpan _fullSyncInterval = TimeSpan.FromHours(6); // Full sync every 6 hours
        private readonly TimeSpan _scoreSyncInterval = TimeSpan.FromMinutes(5); // Score updates every 5 minutes

        public SportsDataSyncBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<SportsDataSyncBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Sports Data Sync Background Service started");

            var lastFullSync = DateTime.MinValue;

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.UtcNow;
                var shouldFullSync = now - lastFullSync >= _fullSyncInterval;

                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var espnService = scope.ServiceProvider.GetRequiredService<IEspnSportsDataService>();

                    if (shouldFullSync)
                    {
                        _logger.LogInformation("Starting full sports data sync...");
                        await PerformFullSyncAsync(espnService);
                        lastFullSync = now;
                        _logger.LogInformation("Full sports data sync completed");
                    }
                    else
                    {
                        _logger.LogDebug("Starting score updates...");
                        await PerformScoreUpdatesAsync(espnService);
                        _logger.LogDebug("Score updates completed");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during sports data sync");
                }

                // Wait for next iteration
                var delay = _scoreSyncInterval;
                await Task.Delay(delay, stoppingToken);
            }
        }

        private async Task PerformFullSyncAsync(IEspnSportsDataService espnService)
        {
            try
            {
                // Sync all sports sequentially to avoid DbContext conflicts
                var results = new List<SportsDataSyncResult>();

                results.Add(await espnService.SyncNflGamesAsync());
                results.Add(await espnService.SyncNbaGamesAsync());
                results.Add(await espnService.SyncMlbGamesAsync());

                foreach (var result in results)
                {
                    if (result.Success)
                    {
                        _logger.LogInformation("Sync result: {Message}", result.Message);
                    }
                    else
                    {
                        _logger.LogWarning("Sync failed: {Message}", result.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during full sync");
            }
        }

        private async Task PerformScoreUpdatesAsync(IEspnSportsDataService espnService)
        {
            try
            {
                // Only update scores for active/recent games
                var sports = new[] { "NFL", "NBA", "MLB" };

                foreach (var sport in sports)
                {
                    var result = await espnService.UpdateGameScoresAsync(sport);
                    if (!result.Success)
                    {
                        _logger.LogWarning("Score update failed for {Sport}: {Message}", sport, result.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during score updates");
            }
        }
    }
}