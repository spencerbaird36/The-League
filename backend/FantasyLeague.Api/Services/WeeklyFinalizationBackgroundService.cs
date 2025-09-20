using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FantasyLeague.Api.Services
{
    public class WeeklyFinalizationBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<WeeklyFinalizationBackgroundService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15); // Check every 15 minutes

        public WeeklyFinalizationBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<WeeklyFinalizationBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Weekly Finalization Background Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndFinalizeMatchupsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while checking for matchups to finalize");
                }

                // Wait for the next check interval
                await Task.Delay(_checkInterval, stoppingToken);
            }
        }

        private async Task CheckAndFinalizeMatchupsAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var weeklyScoreService = scope.ServiceProvider.GetRequiredService<WeeklyScoreService>();

            try
            {
                _logger.LogDebug("Checking for matchups ready for finalization...");

                var readyMatchups = await weeklyScoreService.GetMatchupsReadyForFinalizationAsync();

                if (!readyMatchups.Any())
                {
                    _logger.LogDebug("No matchups ready for finalization");
                    return;
                }

                _logger.LogInformation($"Found {readyMatchups.Count} leagues with matchups ready for finalization");

                foreach (var (leagueId, sport, weekNumber) in readyMatchups)
                {
                    try
                    {
                        _logger.LogInformation($"Finalizing matchups for League {leagueId}, Sport {sport}, Week {weekNumber}");
                        await weeklyScoreService.FinalizeWeeklyMatchupsAsync(leagueId, sport, weekNumber);
                        _logger.LogInformation($"Successfully finalized matchups for League {leagueId}, Sport {sport}, Week {weekNumber}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to finalize matchups for League {leagueId}, Sport {sport}, Week {weekNumber}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CheckAndFinalizeMatchupsAsync");
                throw;
            }
        }

        public override Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Weekly Finalization Background Service stopping");
            return base.StopAsync(cancellationToken);
        }
    }
}