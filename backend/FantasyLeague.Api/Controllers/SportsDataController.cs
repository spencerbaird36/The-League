using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SportsDataController : ControllerBase
    {
        private readonly IEspnSportsDataService _espnService;
        private readonly ILogger<SportsDataController> _logger;

        public SportsDataController(
            IEspnSportsDataService espnService,
            ILogger<SportsDataController> logger)
        {
            _espnService = espnService;
            _logger = logger;
        }

        /// <summary>
        /// Manually sync NFL games from ESPN
        /// </summary>
        [HttpPost("sync/nfl")]
        public async Task<ActionResult<SportsDataSyncResult>> SyncNflGames()
        {
            try
            {
                var result = await _espnService.SyncNflGamesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing NFL games");
                return StatusCode(500, new SportsDataSyncResult
                {
                    Success = false,
                    Message = "Internal server error during NFL sync"
                });
            }
        }

        /// <summary>
        /// Manually sync NBA games from ESPN
        /// </summary>
        [HttpPost("sync/nba")]
        public async Task<ActionResult<SportsDataSyncResult>> SyncNbaGames()
        {
            try
            {
                var result = await _espnService.SyncNbaGamesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing NBA games");
                return StatusCode(500, new SportsDataSyncResult
                {
                    Success = false,
                    Message = "Internal server error during NBA sync"
                });
            }
        }

        /// <summary>
        /// Manually sync MLB games from ESPN
        /// </summary>
        [HttpPost("sync/mlb")]
        public async Task<ActionResult<SportsDataSyncResult>> SyncMlbGames()
        {
            try
            {
                var result = await _espnService.SyncMlbGamesAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing MLB games");
                return StatusCode(500, new SportsDataSyncResult
                {
                    Success = false,
                    Message = "Internal server error during MLB sync"
                });
            }
        }

        /// <summary>
        /// Sync all sports at once
        /// </summary>
        [HttpPost("sync/all")]
        public async Task<ActionResult<List<SportsDataSyncResult>>> SyncAllSports()
        {
            try
            {
                var tasks = new[]
                {
                    _espnService.SyncNflGamesAsync(),
                    _espnService.SyncNbaGamesAsync(),
                    _espnService.SyncMlbGamesAsync()
                };

                var results = await Task.WhenAll(tasks);
                return Ok(results);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing all sports");
                return StatusCode(500, new SportsDataSyncResult
                {
                    Success = false,
                    Message = "Internal server error during full sync"
                });
            }
        }

        /// <summary>
        /// Get upcoming games for a specific sport
        /// </summary>
        [HttpGet("upcoming/{sport}")]
        public async Task<ActionResult<List<GameDataDto>>> GetUpcomingGames(
            string sport,
            [FromQuery] int days = 7)
        {
            try
            {
                var games = await _espnService.GetUpcomingGamesAsync(sport.ToUpper(), days);
                return Ok(games);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting upcoming {Sport} games", sport);
                return StatusCode(500, "Internal server error");
            }
        }

        /// <summary>
        /// Update game scores for a specific sport
        /// </summary>
        [HttpPost("scores/{sport}")]
        public async Task<ActionResult<SportsDataSyncResult>> UpdateGameScores(string sport)
        {
            try
            {
                var result = await _espnService.UpdateGameScoresAsync(sport.ToUpper());
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating {Sport} scores", sport);
                return StatusCode(500, new SportsDataSyncResult
                {
                    Success = false,
                    Message = $"Internal server error during {sport} score update"
                });
            }
        }

        /// <summary>
        /// Get all upcoming games across all sports for betting display
        /// </summary>
        [HttpGet("upcoming")]
        public async Task<ActionResult<AllUpcomingGamesResponse>> GetAllUpcomingGames([FromQuery] int days = 7)
        {
            try
            {
                var nflGames = await _espnService.GetUpcomingGamesAsync("NFL", days);
                var nbaGames = await _espnService.GetUpcomingGamesAsync("NBA", days);
                var mlbGames = await _espnService.GetUpcomingGamesAsync("MLB", days);

                var response = new AllUpcomingGamesResponse
                {
                    NFL = nflGames,
                    NBA = nbaGames,
                    MLB = mlbGames,
                    TotalGames = nflGames.Count + nbaGames.Count + mlbGames.Count
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all upcoming games");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}