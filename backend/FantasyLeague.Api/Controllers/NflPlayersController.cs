using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NflPlayersController : ControllerBase
    {
        private readonly NflPlayerDataService _nflPlayerService;
        private readonly ILogger<NflPlayersController> _logger;

        public NflPlayersController(NflPlayerDataService nflPlayerService, ILogger<NflPlayersController> logger)
        {
            _nflPlayerService = nflPlayerService;
            _logger = logger;
        }

        /// <summary>
        /// Sync NFL player data from the external API
        /// </summary>
        [HttpPost("sync")]
        public async Task<IActionResult> SyncNflPlayers()
        {
            try
            {
                _logger.LogInformation("NFL player sync requested");
                var result = await _nflPlayerService.SyncNflPlayersAsync();
                
                if (result.Success)
                {
                    return Ok(result);
                }
                else
                {
                    return BadRequest(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during NFL player sync");
                return StatusCode(500, new { message = "Internal server error during sync", error = ex.Message });
            }
        }

        /// <summary>
        /// Get active NFL players with optional filtering and pagination
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetActivePlayers(
            [FromQuery] string? position = null,
            [FromQuery] string? team = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 50;

                var players = await _nflPlayerService.GetActivePlayersAsync(position, team, page, pageSize);
                var totalCount = await _nflPlayerService.GetActivePlayersCountAsync(position, team);

                var response = new
                {
                    players = players,
                    pagination = new
                    {
                        page = page,
                        pageSize = pageSize,
                        totalCount = totalCount,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active NFL players");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get a specific NFL player by PlayerID
        /// </summary>
        [HttpGet("{playerId}")]
        public async Task<IActionResult> GetPlayerById(int playerId)
        {
            try
            {
                var player = await _nflPlayerService.GetPlayerByIdAsync(playerId);
                
                if (player == null)
                {
                    return NotFound(new { message = $"Player with ID {playerId} not found" });
                }

                return Ok(player);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error retrieving NFL player with ID {playerId}");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get all available teams
        /// </summary>
        [HttpGet("teams")]
        public async Task<IActionResult> GetAvailableTeams()
        {
            try
            {
                var teams = await _nflPlayerService.GetAvailableTeamsAsync();
                return Ok(teams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving available teams");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get all available fantasy positions
        /// </summary>
        [HttpGet("positions")]
        public async Task<IActionResult> GetAvailablePositions()
        {
            try
            {
                var positions = await _nflPlayerService.GetAvailablePositionsAsync();
                return Ok(positions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving available positions");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }

        /// <summary>
        /// Get players by position (convenience endpoint)
        /// </summary>
        [HttpGet("position/{position}")]
        public async Task<IActionResult> GetPlayersByPosition(
            string position,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            return await GetActivePlayers(position, null, page, pageSize);
        }

        /// <summary>
        /// Get players by team (convenience endpoint)
        /// </summary>
        [HttpGet("team/{team}")]
        public async Task<IActionResult> GetPlayersByTeam(
            string team,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            return await GetActivePlayers(null, team, page, pageSize);
        }

        /// <summary>
        /// Get database stats
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var totalCount = await _nflPlayerService.GetActivePlayersCountAsync();
                var teams = await _nflPlayerService.GetAvailableTeamsAsync();
                var positions = await _nflPlayerService.GetAvailablePositionsAsync();

                var positionCounts = new Dictionary<string, int>();
                foreach (var position in positions)
                {
                    positionCounts[position] = await _nflPlayerService.GetActivePlayersCountAsync(position);
                }

                var stats = new
                {
                    totalPlayers = totalCount,
                    totalTeams = teams.Count,
                    totalPositions = positions.Count,
                    teams = teams,
                    positions = positions,
                    positionCounts = positionCounts
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving NFL player stats");
                return StatusCode(500, new { message = "Internal server error", error = ex.Message });
            }
        }
    }
}