using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.Data;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/admin/betting")]
    [Authorize(Roles = "Admin")]
    public class AdminBettingController : ControllerBase
    {
        private readonly BettingService _bettingService;
        private readonly FantasyLeagueContext _context;
        // Removed due to model conflicts - will be re-added in next phase
        // private readonly AutomatedBetSettlementService _settlementService;
        // private readonly RealTimeGameDataService _gameDataService;
        private readonly ILogger<AdminBettingController> _logger;

        public AdminBettingController(
            BettingService bettingService,
            FantasyLeagueContext context,
            ILogger<AdminBettingController> logger)
        {
            _bettingService = bettingService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Get betting system dashboard with basic statistics
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult> GetDashboard()
        {
            try
            {
                // Basic stats that work with current models
                var dashboard = new
                {
                    message = "Betting dashboard - Phase 4 features temporarily disabled due to model conflicts",
                    totalBets = await _context.Bets.CountAsync(),
                    activeBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Active),
                    wonBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Won),
                    lostBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Lost),
                    totalWagered = await _context.Bets.SumAsync(b => b.Amount),
                    lastUpdated = DateTime.UtcNow
                };

                return Ok(dashboard);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting betting dashboard");
                return StatusCode(500, "Error loading dashboard data");
            }
        }

        /// <summary>
        /// Basic system health check - Phase 4 features will be restored later
        /// </summary>
        [HttpGet("health")]
        public async Task<ActionResult> GetSystemHealth()
        {
            try
            {
                var health = new
                {
                    message = "Basic health check - advanced features temporarily disabled",
                    pendingBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Active),
                    totalBets = await _context.Bets.CountAsync(),
                    checkedAt = DateTime.UtcNow,
                    overallStatus = "Healthy"
                };

                return Ok(health);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system health");
                return StatusCode(500, "Error checking system health");
            }
        }

        [HttpPost("matchups")]
        public async Task<ActionResult<MatchupBetDto>> CreateMatchupBet([FromBody] CreateMatchupBetDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var matchupBet = await _bettingService.CreateMatchupBetAsync(request, adminId);
                return Ok(matchupBet);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid matchup bet creation request from admin {AdminId}: {Message}",
                    GetCurrentUserId(), ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating matchup bet for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while creating the matchup bet");
            }
        }

        [HttpPost("games")]
        public async Task<ActionResult<GameBetDto>> CreateGameBet([FromBody] CreateGameBetDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var gameBet = await _bettingService.CreateGameBetAsync(request, adminId);
                return Ok(gameBet);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid game bet creation request from admin {AdminId}: {Message}",
                    GetCurrentUserId(), ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating game bet for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while creating the game bet");
            }
        }

        [HttpPost("bets/{betId}/settle")]
        public async Task<ActionResult<PlaceBetResponseDto>> SettleBet(int betId, [FromBody] SettleBetDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var success = await _bettingService.SettleBetAsync(betId, request.Status, adminId, request.SettlementNotes);

                if (success)
                {
                    return Ok(new PlaceBetResponseDto
                    {
                        Success = true,
                        Message = "Bet settled successfully",
                        BetId = betId
                    });
                }
                else
                {
                    return BadRequest(new PlaceBetResponseDto
                    {
                        Success = false,
                        Message = "Failed to settle bet",
                        ErrorMessage = "Settlement failed"
                    });
                }
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid bet settlement request from admin {AdminId} for bet {BetId}: {Message}",
                    GetCurrentUserId(), betId, ex.Message);
                return BadRequest(new PlaceBetResponseDto
                {
                    Success = false,
                    Message = ex.Message,
                    ErrorMessage = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling bet {BetId} by admin {AdminId}", betId, GetCurrentUserId());
                return StatusCode(500, new PlaceBetResponseDto
                {
                    Success = false,
                    Message = "An error occurred while settling the bet",
                    ErrorMessage = "Internal server error"
                });
            }
        }

        [HttpPost("matchups/{matchupBetId}/settle")]
        public async Task<ActionResult<List<PlaceBetResponseDto>>> SettleMatchupBets(int matchupBetId, [FromBody] SettleMatchupDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var settledCount = await _bettingService.SettleMatchupBetsAsync(matchupBetId, request.Team1Score, request.Team2Score, adminId);
                return Ok(new {
                    message = $"Settled {settledCount} bets for matchup {matchupBetId}",
                    settledCount = settledCount
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid matchup settlement request from admin {AdminId} for matchup {MatchupBetId}: {Message}",
                    GetCurrentUserId(), matchupBetId, ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling matchup {MatchupBetId} by admin {AdminId}", matchupBetId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while settling the matchup bets");
            }
        }

        [HttpPost("games/{gameBetId}/settle")]
        public async Task<ActionResult<List<PlaceBetResponseDto>>> SettleGameBets(int gameBetId, [FromBody] SettleGameDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var settledCount = await _bettingService.SettleGameBetsAsync(gameBetId, request.HomeScore, request.AwayScore, request.GameStatus, adminId);
                return Ok(new {
                    message = $"Settled {settledCount} bets for game {gameBetId}",
                    settledCount = settledCount
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid game settlement request from admin {AdminId} for game {GameBetId}: {Message}",
                    GetCurrentUserId(), gameBetId, ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error settling game {GameBetId} by admin {AdminId}", gameBetId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while settling the game bets");
            }
        }

        [HttpGet("bets")]
        public async Task<ActionResult<List<BetDto>>> GetAllBets(
            [FromQuery] BetStatus? status = null,
            [FromQuery] BetType? type = null,
            [FromQuery] int? leagueId = null,
            [FromQuery] int? userId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var bets = await _bettingService.GetAllBetsAsync(status, type, leagueId, userId, page, pageSize);
                return Ok(bets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all bets for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving bets");
            }
        }

        [HttpGet("bets/{betId}")]
        public async Task<ActionResult<BetDto>> GetBet(int betId)
        {
            try
            {
                var bet = await _bettingService.GetBetAsync(betId);

                if (bet == null)
                {
                    return NotFound("Bet not found");
                }

                return Ok(bet);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving bet {BetId} for admin {AdminId}", betId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving the bet");
            }
        }

        [HttpGet("matchups")]
        public async Task<ActionResult<List<MatchupBetDto>>> GetAllMatchupBets(
            [FromQuery] int? leagueId = null,
            [FromQuery] int? week = null,
            [FromQuery] int? season = null,
            [FromQuery] string? sport = null,
            [FromQuery] bool? isSettled = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var matchups = await _bettingService.GetAllMatchupBetsAsync(leagueId, week, season, sport, isSettled, page, pageSize);
                return Ok(matchups);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving matchup bets for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving matchup bets");
            }
        }

        [HttpGet("games")]
        public async Task<ActionResult<List<GameBetDto>>> GetAllGameBets(
            [FromQuery] int? leagueId = null,
            [FromQuery] string? sport = null,
            [FromQuery] GameStatus? gameStatus = null,
            [FromQuery] bool? isSettled = null,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var games = await _bettingService.GetAllGameBetsAsync(leagueId, sport, gameStatus, isSettled, startDate, endDate, page, pageSize);
                return Ok(games);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving game bets for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving game bets");
            }
        }

        [HttpGet("stats/system")]
        public async Task<ActionResult<object>> GetSystemBettingStats()
        {
            try
            {
                var stats = await _bettingService.GetSystemBettingStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving system betting stats for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving system betting statistics");
            }
        }

        [HttpGet("stats/user/{userId}")]
        public async Task<ActionResult<BettingStatsDto>> GetUserBettingStats(int userId, [FromQuery] int? leagueId = null)
        {
            try
            {
                var stats = await _bettingService.GetUserBettingStatsAsync(userId, leagueId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving betting stats for user {UserId} by admin {AdminId}", userId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving user betting statistics");
            }
        }

        [HttpPut("matchups/{matchupBetId}")]
        public async Task<ActionResult<MatchupBetDto>> UpdateMatchupBet(int matchupBetId, [FromBody] CreateMatchupBetDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var matchupBet = await _bettingService.UpdateMatchupBetAsync(matchupBetId, request, adminId);

                if (matchupBet == null)
                {
                    return NotFound("Matchup bet not found");
                }

                return Ok(matchupBet);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid matchup bet update request from admin {AdminId} for matchup {MatchupBetId}: {Message}",
                    GetCurrentUserId(), matchupBetId, ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating matchup bet {MatchupBetId} by admin {AdminId}", matchupBetId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while updating the matchup bet");
            }
        }

        [HttpPut("games/{gameBetId}")]
        public async Task<ActionResult<GameBetDto>> UpdateGameBet(int gameBetId, [FromBody] CreateGameBetDto request)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var gameBet = await _bettingService.UpdateGameBetAsync(gameBetId, request, adminId);

                if (gameBet == null)
                {
                    return NotFound("Game bet not found");
                }

                return Ok(gameBet);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid game bet update request from admin {AdminId} for game {GameBetId}: {Message}",
                    GetCurrentUserId(), gameBetId, ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating game bet {GameBetId} by admin {AdminId}", gameBetId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while updating the game bet");
            }
        }

        [HttpDelete("matchups/{matchupBetId}")]
        public async Task<ActionResult> DeleteMatchupBet(int matchupBetId)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var success = await _bettingService.DeleteMatchupBetAsync(matchupBetId, adminId);

                if (!success)
                {
                    return NotFound("Matchup bet not found or cannot be deleted");
                }

                return Ok(new { message = "Matchup bet deleted successfully" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Cannot delete matchup bet {MatchupBetId} - has active bets", matchupBetId);
                return BadRequest("Cannot delete matchup bet with active bets");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting matchup bet {MatchupBetId} by admin {AdminId}", matchupBetId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while deleting the matchup bet");
            }
        }

        [HttpDelete("games/{gameBetId}")]
        public async Task<ActionResult> DeleteGameBet(int gameBetId)
        {
            try
            {
                var adminId = GetCurrentUserId();
                var success = await _bettingService.DeleteGameBetAsync(gameBetId, adminId);

                if (!success)
                {
                    return NotFound("Game bet not found or cannot be deleted");
                }

                return Ok(new { message = "Game bet deleted successfully" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Cannot delete game bet {GameBetId} - has active bets", gameBetId);
                return BadRequest("Cannot delete game bet with active bets");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting game bet {GameBetId} by admin {AdminId}", gameBetId, GetCurrentUserId());
                return StatusCode(500, "An error occurred while deleting the game bet");
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }

        // Phase 4 helper methods will be restored after model alignment
    }
}