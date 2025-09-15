using FantasyLeague.Api.Services;

namespace FantasyLeague.Api.Services
{
    public class ProjectionSyncService
    {
        private readonly NflProjectionDataService _nflService;
        private readonly MlbProjectionDataService _mlbService;
        private readonly NbaProjectionDataService _nbaService;
        private readonly NflPlayerDataService _nflPlayerService;
        private readonly MlbPlayerDataService _mlbPlayerService;
        private readonly NbaPlayerDataService _nbaPlayerService;
        private readonly ILogger<ProjectionSyncService> _logger;

        public ProjectionSyncService(
            NflProjectionDataService nflService,
            MlbProjectionDataService mlbService,
            NbaProjectionDataService nbaService,
            NflPlayerDataService nflPlayerService,
            MlbPlayerDataService mlbPlayerService,
            NbaPlayerDataService nbaPlayerService,
            ILogger<ProjectionSyncService> logger)
        {
            _nflService = nflService;
            _mlbService = mlbService;
            _nbaService = nbaService;
            _nflPlayerService = nflPlayerService;
            _mlbPlayerService = mlbPlayerService;
            _nbaPlayerService = nbaPlayerService;
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

        public async Task SyncNflPlayersAsync()
        {
            try
            {
                var result = await _nflPlayerService.SyncNflPlayersAsync();
                _logger.LogInformation($"NFL players sync completed: {result.Success} - {result.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled NFL players sync");
            }
        }

        public async Task SyncMlbPlayersAsync()
        {
            try
            {
                var result = await _mlbPlayerService.SyncMlbPlayersAsync();
                _logger.LogInformation($"MLB players sync completed: {result.Success} - {result.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled MLB players sync");
            }
        }

        public async Task SyncNbaPlayersAsync()
        {
            try
            {
                var result = await _nbaPlayerService.SyncNbaPlayersAsync();
                _logger.LogInformation($"NBA players sync completed: {result.Success} - {result.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in scheduled NBA players sync");
            }
        }
    }
}