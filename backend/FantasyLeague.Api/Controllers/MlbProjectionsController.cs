using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MlbProjectionsController : ControllerBase
    {
        private readonly MlbProjectionDataService _projectionService;
        private readonly ILogger<MlbProjectionsController> _logger;

        public MlbProjectionsController(MlbProjectionDataService projectionService, ILogger<MlbProjectionsController> logger)
        {
            _projectionService = projectionService;
            _logger = logger;
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncMlbProjections([FromQuery] int season = 2025)
        {
            try
            {
                var success = await _projectionService.SyncMlbProjectionsAsync(season);
                
                if (success)
                {
                    return Ok(new { message = $"MLB projections synced successfully for {season}" });
                }
                
                return BadRequest(new { error = "Failed to sync MLB projections" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in SyncMlbProjections endpoint");
                return StatusCode(500, new { error = "Internal server error occurred while syncing MLB projections" });
            }
        }

        [HttpGet]
        public async Task<ActionResult<List<MlbPlayerProjection>>> GetMlbProjections([FromQuery] int season = 2025)
        {
            try
            {
                var projections = await _projectionService.GetMlbProjectionsAsync(season);
                return Ok(projections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving MLB projections for {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving MLB projections" });
            }
        }

        [HttpGet("position/{position}")]
        public async Task<ActionResult<List<MlbPlayerProjection>>> GetMlbProjectionsByPosition(
            string position,
            [FromQuery] int season = 2025)
        {
            try
            {
                var projections = await _projectionService.GetMlbProjectionsByPositionAsync(position, season);
                return Ok(projections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving MLB projections for position {position} in {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving MLB projections" });
            }
        }

        [HttpGet("player/{playerId}")]
        public async Task<ActionResult<MlbPlayerProjection>> GetMlbProjectionByPlayerId(
            int playerId,
            [FromQuery] int season = 2025)
        {
            try
            {
                var projection = await _projectionService.GetMlbProjectionByPlayerIdAsync(playerId, season);
                
                if (projection == null)
                {
                    return NotFound(new { error = $"MLB projection not found for player {playerId} in {season}" });
                }
                
                return Ok(projection);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving MLB projection for player {playerId} in {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving MLB projection" });
            }
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetSyncStatus(
            [FromQuery] int season = 2025,
            [FromQuery] int maxHoursOld = 24)
        {
            try
            {
                var hasRecentData = await _projectionService.HasRecentDataAsync(season, maxHoursOld);
                var projections = await _projectionService.GetMlbProjectionsAsync(season);
                
                return Ok(new 
                { 
                    hasRecentData, 
                    totalRecords = projections.Count,
                    season,
                    maxHoursOld,
                    lastSync = projections.FirstOrDefault()?.LastSyncedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving MLB projection status for {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving sync status" });
            }
        }

        [HttpDelete("clear")]
        public async Task<IActionResult> ClearMlbProjections([FromQuery] int season = 2025)
        {
            try
            {
                var cleared = await _projectionService.ClearMlbProjectionsAsync(season);
                return Ok(new { message = $"Cleared {cleared} MLB projection records for season {season}" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error clearing MLB projections for {season}");
                return StatusCode(500, new { error = "Internal server error occurred while clearing MLB projections" });
            }
        }
    }
}