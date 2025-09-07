using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Attributes;
using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AdminOnly]
    public class AdminController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public AdminController(FantasyLeagueContext context)
        {
            _context = context;
        }

        // LEAGUES MANAGEMENT
        [HttpGet("leagues")]
        public async Task<IActionResult> GetAllLeagues([FromQuery] int userId)
        {
            var leagues = await _context.Leagues
                .Include(l => l.Users)
                .Include(l => l.CreatedBy)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    MaxPlayers = l.MaxPlayers,
                    JoinCode = l.JoinCode,
                    IsActive = l.IsActive,
                    CreatedAt = l.CreatedAt,
                    CreatedBy = new
                    {
                        Id = l.CreatedBy.Id,
                        Username = l.CreatedBy.Username,
                        Email = l.CreatedBy.Email,
                        FirstName = l.CreatedBy.FirstName,
                        LastName = l.CreatedBy.LastName
                    },
                    UserCount = l.Users.Count,
                    Users = l.Users.Select(u => new
                    {
                        Id = u.Id,
                        Username = u.Username,
                        Email = u.Email,
                        FirstName = u.FirstName,
                        LastName = u.LastName
                    }).ToList()
                })
                .ToListAsync();

            return Ok(leagues);
        }

        [HttpDelete("leagues/{leagueId}")]
        public async Task<IActionResult> DeleteLeague(int leagueId, [FromQuery] int userId)
        {
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == leagueId);

            if (league == null)
            {
                return NotFound(new { Message = "League not found" });
            }

            // Check if league has users
            if (league.Users != null && league.Users.Any())
            {
                // Remove users from league before deleting
                foreach (var user in league.Users)
                {
                    user.LeagueId = null;
                }
            }

            // Also check for any related data that might prevent deletion
            try
            {
                _context.Leagues.Remove(league);
                await _context.SaveChangesAsync();
                return Ok(new { Message = "League deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = "Cannot delete league: " + ex.Message });
            }
        }

        // USERS MANAGEMENT
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int userId)
        {
            var users = await _context.Users
                .Include(u => u.League)
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    League = u.League != null ? new
                    {
                        Id = u.League.Id,
                        Name = u.League.Name
                    } : null
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpDelete("users/{targetUserId}")]
        public async Task<IActionResult> DeleteUser(int targetUserId, [FromQuery] int userId)
        {
            var user = await _context.Users.FindAsync(targetUserId);
            if (user == null)
            {
                return NotFound(new { Message = "User not found" });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User deleted successfully" });
        }

        // DASHBOARD DATA
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardData([FromQuery] int userId)
        {
            var totalUsers = await _context.Users.CountAsync();
            var activeUsers = await _context.Users.CountAsync(u => u.IsActive);
            var totalLeagues = await _context.Leagues.CountAsync();
            var activeLeagues = await _context.Leagues.CountAsync(l => l.IsActive);

            var recentUsers = await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .Select(u => new
                {
                    Id = u.Id,
                    Username = u.Username,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            var recentLeagues = await _context.Leagues
                .Include(l => l.CreatedBy)
                .Include(l => l.Users)
                .OrderByDescending(l => l.CreatedAt)
                .Take(5)
                .Select(l => new
                {
                    Id = l.Id,
                    Name = l.Name,
                    CreatedBy = l.CreatedBy.FirstName + " " + l.CreatedBy.LastName,
                    CreatedAt = l.CreatedAt,
                    UserCount = l.Users.Count
                })
                .ToListAsync();

            var dashboardData = new
            {
                Stats = new
                {
                    TotalUsers = totalUsers,
                    ActiveUsers = activeUsers,
                    TotalLeagues = totalLeagues,
                    ActiveLeagues = activeLeagues,
                    TotalPlayers = 0, // We don't have a Player model
                    ActivePlayers = 0
                },
                PlayersByLeague = new[]
                {
                    new { League = "NFL", Count = 0 },
                    new { League = "MLB", Count = 0 },
                    new { League = "NBA", Count = 0 }
                },
                RecentUsers = recentUsers,
                RecentLeagues = recentLeagues
            };

            return Ok(dashboardData);
        }

        // PLAYERS MANAGEMENT
        [HttpGet("players")]
        public async Task<IActionResult> GetAllPlayers([FromQuery] int userId, [FromQuery] string? league = null)
        {
            var query = _context.Players.AsQueryable();
            
            if (!string.IsNullOrEmpty(league))
            {
                query = query.Where(p => p.League.ToLower() == league.ToLower());
            }
            
            var players = await query
                .OrderBy(p => p.League)
                .ThenBy(p => p.Team)
                .ThenBy(p => p.Name)
                .Select(p => new
                {
                    Id = p.Id,
                    Name = p.Name,
                    Position = p.Position,
                    Team = p.Team,
                    League = p.League,
                    GamesPlayed = p.GamesPlayed,
                    // NFL Stats
                    PassingYards = p.PassingYards,
                    PassingTouchdowns = p.PassingTouchdowns,
                    Interceptions = p.Interceptions,
                    RushingYards = p.RushingYards,
                    RushingTouchdowns = p.RushingTouchdowns,
                    ReceivingYards = p.ReceivingYards,
                    ReceivingTouchdowns = p.ReceivingTouchdowns,
                    Receptions = p.Receptions,
                    // NBA Stats
                    PointsPerGame = p.PointsPerGame,
                    ReboundsPerGame = p.ReboundsPerGame,
                    AssistsPerGame = p.AssistsPerGame,
                    FieldGoalPercentage = p.FieldGoalPercentage,
                    ThreePointPercentage = p.ThreePointPercentage,
                    FreeThrowPercentage = p.FreeThrowPercentage,
                    StealsPerGame = p.StealsPerGame,
                    BlocksPerGame = p.BlocksPerGame,
                    // MLB Stats
                    BattingAverage = p.BattingAverage,
                    HomeRuns = p.HomeRuns,
                    RunsBattedIn = p.RunsBattedIn,
                    Runs = p.Runs,
                    Hits = p.Hits,
                    StolenBases = p.StolenBases,
                    EarnedRunAverage = p.EarnedRunAverage,
                    Wins = p.Wins,
                    Losses = p.Losses,
                    Strikeouts = p.Strikeouts,
                    Saves = p.Saves,
                    WHIP = p.WHIP,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                })
                .ToListAsync();
            
            return Ok(players);
        }

        [HttpDelete("players/{playerId}")]
        public async Task<IActionResult> DeletePlayer(int playerId, [FromQuery] int userId)
        {
            var player = await _context.Players.FindAsync(playerId);
            if (player == null)
            {
                return NotFound(new { Message = "Player not found" });
            }

            _context.Players.Remove(player);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Player deleted successfully" });
        }
    }
}