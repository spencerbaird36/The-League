using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NbaProjectionsController : ControllerBase
    {
        private readonly NbaProjectionDataService _projectionService;
        private readonly ILogger<NbaProjectionsController> _logger;

        public NbaProjectionsController(NbaProjectionDataService projectionService, ILogger<NbaProjectionsController> logger)
        {
            _projectionService = projectionService;
            _logger = logger;
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncNbaProjections([FromQuery] int season = 2025)
        {
            try
            {
                var success = await _projectionService.SyncNbaProjectionsAsync(season);
                
                if (success)
                {
                    return Ok(new { message = $"NBA projections synced successfully for {season}" });
                }
                
                return BadRequest(new { error = "Failed to sync NBA projections" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in SyncNbaProjections endpoint");
                return StatusCode(500, new { error = "Internal server error occurred while syncing NBA projections" });
            }
        }

        [HttpGet]
        public async Task<ActionResult<List<NbaPlayerProjection>>> GetNbaProjections([FromQuery] int season = 2025)
        {
            try
            {
                var projections = await _projectionService.GetNbaProjectionsAsync(season);
                return Ok(projections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NBA projections for {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving NBA projections" });
            }
        }

        [HttpGet("position/{position}")]
        public async Task<ActionResult<List<NbaPlayerProjection>>> GetNbaProjectionsByPosition(
            string position,
            [FromQuery] int season = 2025)
        {
            try
            {
                var projections = await _projectionService.GetNbaProjectionsByPositionAsync(position, season);
                return Ok(projections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NBA projections for position {position} in {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving NBA projections" });
            }
        }

        [HttpGet("player/{playerId}")]
        public async Task<ActionResult<NbaPlayerProjection>> GetNbaProjectionByPlayerId(
            int playerId,
            [FromQuery] int season = 2025)
        {
            try
            {
                var projection = await _projectionService.GetNbaProjectionByPlayerIdAsync(playerId, season);
                
                if (projection == null)
                {
                    return NotFound(new { error = $"NBA projection not found for player {playerId} in {season}" });
                }
                
                return Ok(projection);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NBA projection for player {playerId} in {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving NBA projection" });
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
                var projections = await _projectionService.GetNbaProjectionsAsync(season);
                
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
                _logger.LogError(ex, $"Error retrieving NBA projection status for {season}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving sync status" });
            }
        }
    }
}