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
        /// Get comprehensive betting system analytics dashboard
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult> GetDashboard()
        {
            try
            {
                var systemStats = await GetSystemBettingStatsAsync();
                var userStats = await GetUserAnalyticsAsync();
                var revenueStats = await GetRevenueAnalyticsAsync();
                var betTypeStats = await GetBetTypeAnalyticsAsync();
                var trendStats = await GetTrendAnalyticsAsync();

                var dashboard = new
                {
                    systemOverview = systemStats,
                    userAnalytics = userStats,
                    revenueAnalytics = revenueStats,
                    betTypeBreakdown = betTypeStats,
                    trends = trendStats,
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

        [HttpGet("analytics/revenue")]
        public async Task<ActionResult> GetRevenueAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var analytics = await GetRevenueAnalyticsAsync();
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving revenue analytics for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving revenue analytics");
            }
        }

        [HttpGet("analytics/users")]
        public async Task<ActionResult> GetUserAnalytics()
        {
            try
            {
                var analytics = await GetUserAnalyticsAsync();
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user analytics for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving user analytics");
            }
        }

        [HttpGet("analytics/bet-types")]
        public async Task<ActionResult> GetBetTypeAnalytics()
        {
            try
            {
                var analytics = await GetBetTypeAnalyticsAsync();
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving bet type analytics for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving bet type analytics");
            }
        }

        [HttpGet("analytics/trends")]
        public async Task<ActionResult> GetTrendAnalytics()
        {
            try
            {
                var analytics = await GetTrendAnalyticsAsync();
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving trend analytics for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving trend analytics");
            }
        }

        [HttpGet("analytics/leaderboard")]
        public async Task<ActionResult> GetLeaderboard([FromQuery] string type = "profit", [FromQuery] int limit = 10)
        {
            try
            {
                var leaderboard = await GetLeaderboardAsync(type, limit);
                return Ok(leaderboard);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving leaderboard for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving leaderboard");
            }
        }

        [HttpGet("analytics/risk-management")]
        public async Task<ActionResult> GetRiskManagementAnalytics()
        {
            try
            {
                var analytics = await GetRiskManagementAnalyticsAsync();
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving risk management analytics for admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving risk management analytics");
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

        #region Analytics Helper Methods

        private async Task<object> GetSystemBettingStatsAsync()
        {
            var totalBets = await _context.Bets.CountAsync();
            var activeBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Active);
            var settledBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Won || b.Status == BetStatus.Lost);
            var totalWagered = await _context.Bets.SumAsync(b => b.Amount);
            var totalPayouts = await _context.Bets.Where(b => b.Status == BetStatus.Won).SumAsync(b => b.PotentialPayout);
            var houseRevenue = await _context.Bets.Where(b => b.Status == BetStatus.Lost).SumAsync(b => b.Amount);
            var houseProfit = houseRevenue - totalPayouts;

            var settledBetsCount = await _context.Bets.CountAsync(b => b.Status == BetStatus.Won || b.Status == BetStatus.Lost);
            var wonBetsCount = await _context.Bets.CountAsync(b => b.Status == BetStatus.Won);
            var houseWinRate = settledBetsCount > 0 ? Math.Round((decimal)(settledBetsCount - wonBetsCount) / settledBetsCount * 100, 2) : 0;

            return new
            {
                totalBets,
                activeBets,
                settledBets,
                totalWagered = Math.Round(totalWagered, 2),
                totalPayouts = Math.Round(totalPayouts, 2),
                houseRevenue = Math.Round(houseRevenue, 2),
                houseProfit = Math.Round(houseProfit, 2),
                houseWinRate,
                totalMatchupBets = await _context.MatchupBets.CountAsync(),
                totalGameBets = await _context.GameBets.CountAsync(),
                pendingSettlements = await _context.Bets.CountAsync(b => b.Status == BetStatus.Pending),
                expiredBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Expired),
                cancelledBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Cancelled),
                voidedBets = await _context.Bets.CountAsync(b => b.Status == BetStatus.Voided)
            };
        }

        private async Task<object> GetUserAnalyticsAsync()
        {
            var totalUsers = await _context.Users.CountAsync();
            var usersWithBets = await _context.Bets.Select(b => b.UserId).Distinct().CountAsync();
            var activeUsersLast30Days = await _context.Bets
                .Where(b => b.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                .Select(b => b.UserId)
                .Distinct()
                .CountAsync();

            var userBetStats = await _context.Bets
                .GroupBy(b => b.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    TotalBets = g.Count(),
                    TotalWagered = g.Sum(b => b.Amount),
                    TotalWon = g.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout),
                    TotalLost = g.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount)
                })
                .ToListAsync();

            var topWinners = userBetStats
                .OrderByDescending(u => u.TotalWon - u.TotalLost)
                .Take(10)
                .ToList();

            var biggestLosers = userBetStats
                .OrderBy(u => u.TotalWon - u.TotalLost)
                .Take(10)
                .ToList();

            return new
            {
                totalUsers,
                usersWithBets,
                activeUsersLast30Days,
                userParticipationRate = totalUsers > 0 ? Math.Round((decimal)usersWithBets / totalUsers * 100, 2) : 0,
                averageBetsPerUser = usersWithBets > 0 ? Math.Round((decimal)await _context.Bets.CountAsync() / usersWithBets, 2) : 0,
                topWinners = topWinners.Select(u => new
                {
                    userId = u.UserId,
                    netProfit = Math.Round(u.TotalWon - u.TotalLost, 2),
                    totalBets = u.TotalBets,
                    totalWagered = Math.Round(u.TotalWagered, 2)
                }),
                biggestLosers = biggestLosers.Select(u => new
                {
                    userId = u.UserId,
                    netLoss = Math.Round(u.TotalLost - u.TotalWon, 2),
                    totalBets = u.TotalBets,
                    totalWagered = Math.Round(u.TotalWagered, 2)
                })
            };
        }

        private async Task<object> GetRevenueAnalyticsAsync()
        {
            var last30Days = DateTime.UtcNow.AddDays(-30);
            var last7Days = DateTime.UtcNow.AddDays(-7);
            var today = DateTime.UtcNow.Date;

            var revenueToday = await _context.Bets
                .Where(b => b.CreatedAt >= today && b.Status == BetStatus.Lost)
                .SumAsync(b => b.Amount);

            var revenueLast7Days = await _context.Bets
                .Where(b => b.CreatedAt >= last7Days && b.Status == BetStatus.Lost)
                .SumAsync(b => b.Amount);

            var revenueLast30Days = await _context.Bets
                .Where(b => b.CreatedAt >= last30Days && b.Status == BetStatus.Lost)
                .SumAsync(b => b.Amount);

            var payoutsLast30Days = await _context.Bets
                .Where(b => b.CreatedAt >= last30Days && b.Status == BetStatus.Won)
                .SumAsync(b => b.PotentialPayout);

            var profitLast30Days = revenueLast30Days - payoutsLast30Days;

            // Daily revenue breakdown for the last 30 days
            var dailyRevenue = await _context.Bets
                .Where(b => b.CreatedAt >= last30Days && (b.Status == BetStatus.Won || b.Status == BetStatus.Lost))
                .GroupBy(b => b.CreatedAt.Date)
                .Select(g => new
                {
                    date = g.Key,
                    revenue = g.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount),
                    payouts = g.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout),
                    volume = g.Sum(b => b.Amount),
                    betCount = g.Count()
                })
                .OrderBy(x => x.date)
                .ToListAsync();

            return new
            {
                revenueToday = Math.Round(revenueToday, 2),
                revenueLast7Days = Math.Round(revenueLast7Days, 2),
                revenueLast30Days = Math.Round(revenueLast30Days, 2),
                payoutsLast30Days = Math.Round(payoutsLast30Days, 2),
                profitLast30Days = Math.Round(profitLast30Days, 2),
                profitMargin = revenueLast30Days > 0 ? Math.Round(profitLast30Days / revenueLast30Days * 100, 2) : 0,
                dailyBreakdown = dailyRevenue.Select(d => new
                {
                    date = d.date.ToString("yyyy-MM-dd"),
                    revenue = Math.Round(d.revenue, 2),
                    payouts = Math.Round(d.payouts, 2),
                    profit = Math.Round(d.revenue - d.payouts, 2),
                    volume = Math.Round(d.volume, 2),
                    betCount = d.betCount
                })
            };
        }

        private async Task<object> GetBetTypeAnalyticsAsync()
        {
            var betTypeStats = await _context.Bets
                .GroupBy(b => b.Type)
                .Select(g => new
                {
                    betType = g.Key,
                    totalBets = g.Count(),
                    totalWagered = g.Sum(b => b.Amount),
                    activeBets = g.Count(b => b.Status == BetStatus.Active),
                    wonBets = g.Count(b => b.Status == BetStatus.Won),
                    lostBets = g.Count(b => b.Status == BetStatus.Lost),
                    totalPayouts = g.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout),
                    revenue = g.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount)
                })
                .ToListAsync();

            var betStatusStats = await _context.Bets
                .GroupBy(b => b.Status)
                .Select(g => new
                {
                    status = g.Key,
                    count = g.Count(),
                    totalAmount = g.Sum(b => b.Amount)
                })
                .ToListAsync();

            return new
            {
                byBetType = betTypeStats.Select(s => new
                {
                    betType = s.betType.ToString(),
                    totalBets = s.totalBets,
                    totalWagered = Math.Round(s.totalWagered, 2),
                    activeBets = s.activeBets,
                    wonBets = s.wonBets,
                    lostBets = s.lostBets,
                    winRate = (s.wonBets + s.lostBets) > 0 ? Math.Round((decimal)s.wonBets / (s.wonBets + s.lostBets) * 100, 2) : 0,
                    totalPayouts = Math.Round(s.totalPayouts, 2),
                    revenue = Math.Round(s.revenue, 2),
                    profit = Math.Round(s.revenue - s.totalPayouts, 2)
                }),
                byStatus = betStatusStats.Select(s => new
                {
                    status = s.status.ToString(),
                    count = s.count,
                    totalAmount = Math.Round(s.totalAmount, 2),
                    percentage = betStatusStats.Sum(x => x.count) > 0 ? Math.Round((decimal)s.count / betStatusStats.Sum(x => x.count) * 100, 2) : 0
                })
            };
        }

        private async Task<object> GetTrendAnalyticsAsync()
        {
            var last30Days = DateTime.UtcNow.AddDays(-30);
            var last60Days = DateTime.UtcNow.AddDays(-60);

            // Weekly trends for the last 8 weeks
            var weeklyTrends = new List<object>();
            for (int i = 0; i < 8; i++)
            {
                var weekStart = DateTime.UtcNow.Date.AddDays(-7 * (i + 1));
                var weekEnd = weekStart.AddDays(7);

                var weekStats = await _context.Bets
                    .Where(b => b.CreatedAt >= weekStart && b.CreatedAt < weekEnd)
                    .GroupBy(b => 1)
                    .Select(g => new
                    {
                        totalBets = g.Count(),
                        totalWagered = g.Sum(b => b.Amount),
                        revenue = g.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount),
                        payouts = g.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout)
                    })
                    .FirstOrDefaultAsync();

                weeklyTrends.Add(new
                {
                    weekStart = weekStart.ToString("yyyy-MM-dd"),
                    weekEnd = weekEnd.AddDays(-1).ToString("yyyy-MM-dd"),
                    totalBets = weekStats?.totalBets ?? 0,
                    totalWagered = Math.Round(weekStats?.totalWagered ?? 0, 2),
                    revenue = Math.Round(weekStats?.revenue ?? 0, 2),
                    payouts = Math.Round(weekStats?.payouts ?? 0, 2),
                    profit = Math.Round((weekStats?.revenue ?? 0) - (weekStats?.payouts ?? 0), 2)
                });
            }

            // Growth metrics
            var current30DayStats = await _context.Bets
                .Where(b => b.CreatedAt >= last30Days)
                .GroupBy(b => 1)
                .Select(g => new
                {
                    totalBets = g.Count(),
                    totalWagered = g.Sum(b => b.Amount),
                    uniqueUsers = g.Select(b => b.UserId).Distinct().Count()
                })
                .FirstOrDefaultAsync();

            var previous30DayStats = await _context.Bets
                .Where(b => b.CreatedAt >= last60Days && b.CreatedAt < last30Days)
                .GroupBy(b => 1)
                .Select(g => new
                {
                    totalBets = g.Count(),
                    totalWagered = g.Sum(b => b.Amount),
                    uniqueUsers = g.Select(b => b.UserId).Distinct().Count()
                })
                .FirstOrDefaultAsync();

            return new
            {
                weeklyTrends = weeklyTrends.OrderBy(w => ((dynamic)w).weekStart),
                growthMetrics = new
                {
                    betVolumeGrowth = previous30DayStats?.totalBets > 0
                        ? Math.Round((decimal)((current30DayStats?.totalBets ?? 0) - (previous30DayStats?.totalBets ?? 0)) / (previous30DayStats?.totalBets ?? 1) * 100, 2)
                        : 0,
                    wagerVolumeGrowth = previous30DayStats?.totalWagered > 0
                        ? Math.Round(((current30DayStats?.totalWagered ?? 0) - (previous30DayStats?.totalWagered ?? 0)) / (previous30DayStats?.totalWagered ?? 1) * 100, 2)
                        : 0,
                    userGrowth = previous30DayStats?.uniqueUsers > 0
                        ? Math.Round((decimal)((current30DayStats?.uniqueUsers ?? 0) - (previous30DayStats?.uniqueUsers ?? 0)) / (previous30DayStats?.uniqueUsers ?? 1) * 100, 2)
                        : 0,
                    currentPeriod = new
                    {
                        totalBets = current30DayStats?.totalBets ?? 0,
                        totalWagered = Math.Round(current30DayStats?.totalWagered ?? 0, 2),
                        uniqueUsers = current30DayStats?.uniqueUsers ?? 0
                    },
                    previousPeriod = new
                    {
                        totalBets = previous30DayStats?.totalBets ?? 0,
                        totalWagered = Math.Round(previous30DayStats?.totalWagered ?? 0, 2),
                        uniqueUsers = previous30DayStats?.uniqueUsers ?? 0
                    }
                }
            };
        }

        private async Task<object> GetLeaderboardAsync(string type, int limit)
        {
            switch (type.ToLower())
            {
                case "profit":
                    var profitLeaders = await _context.Bets
                        .GroupBy(b => b.UserId)
                        .Select(g => new
                        {
                            UserId = g.Key,
                            NetProfit = g.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout) - g.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount),
                            TotalBets = g.Count(),
                            TotalWagered = g.Sum(b => b.Amount)
                        })
                        .OrderByDescending(u => u.NetProfit)
                        .Take(limit)
                        .ToListAsync();

                    return new
                    {
                        type = "profit",
                        leaders = profitLeaders.Select(l => new
                        {
                            userId = l.UserId,
                            netProfit = Math.Round(l.NetProfit, 2),
                            totalBets = l.TotalBets,
                            totalWagered = Math.Round(l.TotalWagered, 2)
                        })
                    };

                case "volume":
                    var volumeLeaders = await _context.Bets
                        .GroupBy(b => b.UserId)
                        .Select(g => new
                        {
                            UserId = g.Key,
                            TotalWagered = g.Sum(b => b.Amount),
                            TotalBets = g.Count(),
                            NetProfit = g.Where(b => b.Status == BetStatus.Won).Sum(b => b.PotentialPayout) - g.Where(b => b.Status == BetStatus.Lost).Sum(b => b.Amount)
                        })
                        .OrderByDescending(u => u.TotalWagered)
                        .Take(limit)
                        .ToListAsync();

                    return new
                    {
                        type = "volume",
                        leaders = volumeLeaders.Select(l => new
                        {
                            userId = l.UserId,
                            totalWagered = Math.Round(l.TotalWagered, 2),
                            totalBets = l.TotalBets,
                            netProfit = Math.Round(l.NetProfit, 2)
                        })
                    };

                case "winrate":
                    var winRateLeaders = await _context.Bets
                        .Where(b => b.Status == BetStatus.Won || b.Status == BetStatus.Lost)
                        .GroupBy(b => b.UserId)
                        .Select(g => new
                        {
                            UserId = g.Key,
                            TotalBets = g.Count(),
                            WonBets = g.Count(b => b.Status == BetStatus.Won),
                            WinRate = (decimal)g.Count(b => b.Status == BetStatus.Won) / g.Count() * 100,
                            TotalWagered = g.Sum(b => b.Amount)
                        })
                        .Where(u => u.TotalBets >= 5) // Only users with at least 5 settled bets
                        .OrderByDescending(u => u.WinRate)
                        .Take(limit)
                        .ToListAsync();

                    return new
                    {
                        type = "winrate",
                        leaders = winRateLeaders.Select(l => new
                        {
                            userId = l.UserId,
                            winRate = Math.Round(l.WinRate, 2),
                            totalBets = l.TotalBets,
                            wonBets = l.WonBets,
                            totalWagered = Math.Round(l.TotalWagered, 2)
                        })
                    };

                default:
                    throw new ArgumentException($"Invalid leaderboard type: {type}");
            }
        }

        private async Task<object> GetRiskManagementAnalyticsAsync()
        {
            var activeBets = await _context.Bets
                .Where(b => b.Status == BetStatus.Active)
                .ToListAsync();

            var potentialPayouts = activeBets.Sum(b => b.PotentialPayout);
            var activeBetAmounts = activeBets.Sum(b => b.Amount);

            var largestActiveBets = activeBets
                .OrderByDescending(b => b.Amount)
                .Take(10)
                .Select(b => new
                {
                    betId = b.Id,
                    userId = b.UserId,
                    amount = Math.Round(b.Amount, 2),
                    potentialPayout = Math.Round(b.PotentialPayout, 2),
                    betType = b.Type.ToString(),
                    createdAt = b.CreatedAt,
                    expiresAt = b.ExpiresAt
                })
                .ToList();

            var highRiskUsers = await _context.Bets
                .Where(b => b.Status == BetStatus.Active)
                .GroupBy(b => b.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    ActiveBets = g.Count(),
                    TotalAtRisk = g.Sum(b => b.Amount),
                    PotentialPayouts = g.Sum(b => b.PotentialPayout)
                })
                .OrderByDescending(u => u.TotalAtRisk)
                .Take(10)
                .ToListAsync();

            var expiringBets = await _context.Bets
                .Where(b => b.Status == BetStatus.Active && b.ExpiresAt <= DateTime.UtcNow.AddHours(24))
                .OrderBy(b => b.ExpiresAt)
                .Select(b => new
                {
                    betId = b.Id,
                    userId = b.UserId,
                    amount = Math.Round(b.Amount, 2),
                    betType = b.Type.ToString(),
                    expiresAt = b.ExpiresAt,
                    hoursUntilExpiry = Math.Round((b.ExpiresAt - DateTime.UtcNow).TotalHours, 1)
                })
                .ToListAsync();

            var betTypeExposure = await _context.Bets
                .Where(b => b.Status == BetStatus.Active)
                .GroupBy(b => b.Type)
                .Select(g => new
                {
                    betType = g.Key.ToString(),
                    activeBets = g.Count(),
                    totalAtRisk = Math.Round(g.Sum(b => b.Amount), 2),
                    potentialPayouts = Math.Round(g.Sum(b => b.PotentialPayout), 2),
                    maxExposure = Math.Round(g.Sum(b => b.PotentialPayout) - g.Sum(b => b.Amount), 2)
                })
                .ToListAsync();

            return new
            {
                overview = new
                {
                    totalActiveBets = activeBets.Count,
                    totalAtRisk = Math.Round(activeBetAmounts, 2),
                    totalPotentialPayouts = Math.Round(potentialPayouts, 2),
                    maxPotentialLoss = Math.Round(potentialPayouts - activeBetAmounts, 2),
                    averageBetSize = activeBets.Count > 0 ? Math.Round(activeBetAmounts / activeBets.Count, 2) : 0
                },
                largestActiveBets,
                highRiskUsers = highRiskUsers.Select(u => new
                {
                    userId = u.UserId,
                    activeBets = u.ActiveBets,
                    totalAtRisk = Math.Round(u.TotalAtRisk, 2),
                    potentialPayouts = Math.Round(u.PotentialPayouts, 2),
                    maxExposure = Math.Round(u.PotentialPayouts - u.TotalAtRisk, 2)
                }),
                expiringBets,
                betTypeExposure
            };
        }

        #endregion
    }
}