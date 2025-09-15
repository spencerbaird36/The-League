using FantasyLeague.Api.Services;

namespace FantasyLeague.Api.Services
{
    public class ProjectionSyncService
    {
        private readonly NflProjectionDataService _nflService;
        private readonly MlbProjectionDataService _mlbService;
        private readonly NbaProjectionDataService _nbaService;
        private readonly ILogger<ProjectionSyncService> _logger;

        public ProjectionSyncService(
            NflProjectionDataService nflService,
            MlbProjectionDataService mlbService,
            NbaProjectionDataService nbaService,
            ILogger<ProjectionSyncService> logger)
        {
            _nflService = nflService;
            _mlbService = mlbService;
            _nbaService = nbaService;
            _logger = logger;
        }

        public async Task SyncNflProjectionsAsync()
        {
            try
            {
                var success = await _nflService.SyncNflProjectionsAsync();
                _logger.LogInformation($"NFL projections sync completed: {success}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled NFL projections sync");
            }
        }

        public async Task SyncMlbProjectionsAsync()
        {
            try
            {
                var success = await _mlbService.SyncMlbProjectionsAsync();
                _logger.LogInformation($"MLB projections sync completed: {success}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled MLB projections sync");
            }
        }

        public async Task SyncNbaProjectionsAsync()
        {
            try
            {
                var success = await _nbaService.SyncNbaProjectionsAsync();
                _logger.LogInformation($"NBA projections sync completed: {success}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled NBA projections sync");
            }
        }
    }
}