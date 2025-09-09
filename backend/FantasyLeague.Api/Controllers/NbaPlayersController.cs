using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NbaPlayersController : ControllerBase
    {
        private readonly NbaPlayerDataService _nbaPlayerDataService;
        private readonly ILogger<NbaPlayersController> _logger;

        public NbaPlayersController(NbaPlayerDataService nbaPlayerDataService, ILogger<NbaPlayersController> logger)
        {
            _nbaPlayerDataService = nbaPlayerDataService;
            _logger = logger;
        }

        [HttpPost("sync")]
        public async Task<IActionResult> SyncNbaPlayers()
        {
            try
            {
                _logger.LogInformation("Starting NBA player sync...");
                var result = await _nbaPlayerDataService.SyncNbaPlayersAsync();
                
                if (result.Success)
                {
                    _logger.LogInformation($"NBA player sync completed successfully: {result.Message}");
                    return Ok(result);
                }
                else
                {
                    _logger.LogWarning($"NBA player sync failed: {result.Message}");
                    return BadRequest(result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during NBA player sync");
                return StatusCode(500, new { message = "Internal server error occurred during sync" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetActivePlayers([FromQuery] string? position = null, [FromQuery] string? team = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                // Validate pagination parameters
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 50;

                var players = await _nbaPlayerDataService.GetActivePlayersAsync(position, team, page, pageSize);
                var totalCount = await _nbaPlayerDataService.GetActivePlayersCountAsync(position, team);
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                var result = new
                {
                    players = players,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA players");
                return StatusCode(500, new { message = "Internal server error occurred while retrieving players" });
            }
        }

        [HttpGet("{playerId:int}")]
        public async Task<IActionResult> GetPlayerById(int playerId)
        {
            try
            {
                var player = await _nbaPlayerDataService.GetPlayerByIdAsync(playerId);
                if (player == null)
                {
                    return NotFound(new { message = "Player not found" });
                }

                return Ok(player);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA player {PlayerId}", playerId);
                return StatusCode(500, new { message = "Internal server error occurred while retrieving player" });
            }
        }

        [HttpGet("teams")]
        public async Task<IActionResult> GetAvailableTeams()
        {
            try
            {
                var teams = await _nbaPlayerDataService.GetAvailableTeamsAsync();
                return Ok(teams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA teams");
                return StatusCode(500, new { message = "Internal server error occurred while retrieving teams" });
            }
        }

        [HttpGet("positions")]
        public async Task<IActionResult> GetAvailablePositions()
        {
            try
            {
                var positions = await _nbaPlayerDataService.GetAvailablePositionsAsync();
                return Ok(positions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA positions");
                return StatusCode(500, new { message = "Internal server error occurred while retrieving positions" });
            }
        }

        [HttpGet("position/{position}")]
        public async Task<IActionResult> GetPlayersByPosition(string position, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                // Validate pagination parameters
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 50;

                var players = await _nbaPlayerDataService.GetActivePlayersAsync(position, null, page, pageSize);
                var totalCount = await _nbaPlayerDataService.GetActivePlayersCountAsync(position, null);
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                var result = new
                {
                    players = players,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA players by position {Position}", position);
                return StatusCode(500, new { message = "Internal server error occurred while retrieving players" });
            }
        }

        [HttpGet("team/{team}")]
        public async Task<IActionResult> GetPlayersByTeam(string team, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            try
            {
                // Validate pagination parameters
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 50;

                var players = await _nbaPlayerDataService.GetActivePlayersAsync(null, team, page, pageSize);
                var totalCount = await _nbaPlayerDataService.GetActivePlayersCountAsync(null, team);
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                var result = new
                {
                    players = players,
                    pagination = new
                    {
                        page,
                        pageSize,
                        totalCount,
                        totalPages
                    }
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA players by team {Team}", team);
                return StatusCode(500, new { message = "Internal server error occurred while retrieving players" });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var totalPlayers = await _nbaPlayerDataService.GetActivePlayersCountAsync();
                var teams = await _nbaPlayerDataService.GetAvailableTeamsAsync();
                var positions = await _nbaPlayerDataService.GetAvailablePositionsAsync();

                var positionCounts = new Dictionary<string, int>();
                foreach (var position in positions)
                {
                    var count = await _nbaPlayerDataService.GetActivePlayersCountAsync(position);
                    positionCounts[position] = count;
                }

                var result = new
                {
                    totalPlayers,
                    totalTeams = teams.Count,
                    totalPositions = positions.Count,
                    teams,
                    positions,
                    positionCounts
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving NBA player stats");
                return StatusCode(500, new { message = "Internal server error occurred while retrieving stats" });
            }
        }
    }
}