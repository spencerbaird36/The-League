using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NflProjectionsController : ControllerBase
    {
        private readonly NflProjectionDataService _projectionService;
        private readonly ILogger<NflProjectionsController> _logger;

        public NflProjectionsController(NflProjectionDataService projectionService, ILogger<NflProjectionsController> logger)
        {
            _projectionService = projectionService;
            _logger = logger;
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncNflProjections([FromQuery] string season = "2025REG", [FromQuery] int year = 2025)
        {
            try
            {
                var success = await _projectionService.SyncNflProjectionsAsync(season, year);
                
                if (success)
                {
                    return Ok(new { message = $"NFL projections synced successfully for {season}/{year}" });
                }
                
                return BadRequest(new { error = "Failed to sync NFL projections" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in SyncNflProjections endpoint");
                return StatusCode(500, new { error = "Internal server error occurred while syncing NFL projections" });
            }
        }

        [HttpGet]
        public async Task<ActionResult<List<NflPlayerProjection>>> GetNflProjections(
            [FromQuery] string season = "2025REG", 
            [FromQuery] int year = 2025)
        {
            try
            {
                var projections = await _projectionService.GetNflProjectionsAsync(season, year);
                return Ok(projections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NFL projections for {season}/{year}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving NFL projections" });
            }
        }

        [HttpGet("position/{position}")]
        public async Task<ActionResult<List<NflPlayerProjection>>> GetNflProjectionsByPosition(
            string position,
            [FromQuery] string season = "2025REG", 
            [FromQuery] int year = 2025)
        {
            try
            {
                var projections = await _projectionService.GetNflProjectionsByPositionAsync(position, season, year);
                return Ok(projections);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NFL projections for position {position} in {season}/{year}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving NFL projections" });
            }
        }

        [HttpGet("player/{playerId}")]
        public async Task<ActionResult<NflPlayerProjection>> GetNflProjectionByPlayerId(
            int playerId,
            [FromQuery] string season = "2025REG", 
            [FromQuery] int year = 2025)
        {
            try
            {
                var projection = await _projectionService.GetNflProjectionByPlayerIdAsync(playerId, season, year);
                
                if (projection == null)
                {
                    return NotFound(new { error = $"NFL projection not found for player {playerId} in {season}/{year}" });
                }
                
                return Ok(projection);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NFL projection for player {playerId} in {season}/{year}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving NFL projection" });
            }
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetSyncStatus(
            [FromQuery] string season = "2025REG", 
            [FromQuery] int year = 2025,
            [FromQuery] int maxHoursOld = 24)
        {
            try
            {
                var hasRecentData = await _projectionService.HasRecentDataAsync(season, year, maxHoursOld);
                var projections = await _projectionService.GetNflProjectionsAsync(season, year);
                
                return Ok(new 
                { 
                    hasRecentData, 
                    totalRecords = projections.Count,
                    season,
                    year,
                    maxHoursOld,
                    lastSync = projections.FirstOrDefault()?.LastSyncedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NFL projection status for {season}/{year}");
                return StatusCode(500, new { error = "Internal server error occurred while retrieving sync status" });
            }
        }
    }
}