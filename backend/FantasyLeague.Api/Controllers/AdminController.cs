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
                    DraftCount = 0,
                    Users = l.Users.Select(u => new
                    {
                        Id = u.Id,
                        Username = u.Username,
                        Email = u.Email,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        IsActive = u.IsActive,
                        LastLoginAt = u.LastLoginAt,
                        CreatedAt = u.CreatedAt
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

            try
            {

                // Remove league association from users
                foreach (var user in league.Users)
                {
                    user.LeagueId = null;
                }

                // Remove the league
                _context.Leagues.Remove(league);

                await _context.SaveChangesAsync();

                return Ok(new { Message = $"League '{league.Name}' and all associated data deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Failed to delete league", Error = ex.Message });
            }
        }

        // USERS MANAGEMENT
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers([FromQuery] int userId)
        {
            var users = await _context.Users
                .Include(u => u.League)
                .Include(u => u.TeamStats)
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
                    LastLoginAt = u.LastLoginAt,
                    TeamLogo = u.TeamLogo,
                    League = u.League != null ? new
                    {
                        Id = u.League.Id,
                        Name = u.League.Name,
                        JoinCode = u.League.JoinCode
                    } : null,
                    TeamStats = u.TeamStats != null ? new
                    {
                        Wins = u.TeamStats.Wins,
                        Losses = u.TeamStats.Losses,
                        Ties = u.TeamStats.Ties,
                        PointsFor = u.TeamStats.PointsFor,
                        PointsAgainst = u.TeamStats.PointsAgainst,
                        WinPercentage = u.TeamStats.WinPercentage
                    } : null
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpDelete("users/{targetUserId}")]
        public async Task<IActionResult> DeleteUser(int targetUserId, [FromQuery] int userId)
        {
            if (targetUserId == userId)
            {
                return BadRequest(new { Message = "Cannot delete your own admin account" });
            }

            var user = await _context.Users
                .Include(u => u.TeamStats)
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
            {
                return NotFound(new { Message = "User not found" });
            }

            try
            {
                // Remove team stats
                if (user.TeamStats != null)
                {
                    _context.TeamStats.Remove(user.TeamStats);
                }

                // Remove user
                _context.Users.Remove(user);

                await _context.SaveChangesAsync();

                return Ok(new { Message = $"User '{user.Username}' and all associated data deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Failed to delete user", Error = ex.Message });
            }
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
                    League = p.League
                })
                .ToListAsync();

            return Ok(players);
        }

        [HttpPost("players")]
        public async Task<IActionResult> CreatePlayer([FromQuery] int userId, [FromBody] CreatePlayerDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var player = new Player
            {
                Name = createDto.Name,
                Position = createDto.Position,
                Team = createDto.Team,
                League = createDto.League
            };

            _context.Players.Add(player);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPlayerById), new { playerId = player.Id, userId }, player);
        }

        [HttpGet("players/{playerId}")]
        public async Task<IActionResult> GetPlayerById(int playerId, [FromQuery] int userId)
        {
            var player = await _context.Players.FindAsync(playerId);
            if (player == null)
            {
                return NotFound(new { Message = "Player not found" });
            }

            return Ok(player);
        }

        [HttpPut("players/{playerId}")]
        public async Task<IActionResult> UpdatePlayer(int playerId, [FromQuery] int userId, [FromBody] UpdatePlayerDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var player = await _context.Players.FindAsync(playerId);
            if (player == null)
            {
                return NotFound(new { Message = "Player not found" });
            }

            // Update only provided fields
            if (!string.IsNullOrEmpty(updateDto.Name))
                player.Name = updateDto.Name;
            if (!string.IsNullOrEmpty(updateDto.Position))
                player.Position = updateDto.Position;
            if (!string.IsNullOrEmpty(updateDto.Team))
                player.Team = updateDto.Team;
            if (!string.IsNullOrEmpty(updateDto.League))
                player.League = updateDto.League;

            await _context.SaveChangesAsync();

            return Ok(player);
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

            return Ok(new { Message = $"Player '{player.Name}' deleted successfully" });
        }

        // DASHBOARD DATA
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardData([FromQuery] int userId)
        {
            var totalUsers = await _context.Users.CountAsync();
            var activeUsers = await _context.Users.CountAsync(u => u.IsActive);
            var totalLeagues = await _context.Leagues.CountAsync();
            var activeLeagues = await _context.Leagues.CountAsync(l => l.IsActive);
            var totalPlayers = await _context.Players.CountAsync();
            var activePlayers = totalPlayers;

            var playersByLeague = await _context.Players
                .GroupBy(p => p.League)
                .Select(g => new { League = g.Key, Count = g.Count() })
                .ToListAsync();

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

            return Ok(new
            {
                Stats = new
                {
                    TotalUsers = totalUsers,
                    ActiveUsers = activeUsers,
                    TotalLeagues = totalLeagues,
                    ActiveLeagues = activeLeagues,
                    TotalPlayers = totalPlayers,
                    ActivePlayers = activePlayers
                },
                PlayersByLeague = playersByLeague,
                RecentUsers = recentUsers,
                RecentLeagues = recentLeagues
            });
        }
    }

    // DTOs for player management
    public class CreatePlayerDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string Position { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Team { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string League { get; set; } = string.Empty;
    }

    public class UpdatePlayerDto
    {
        [StringLength(100)]
        public string? Name { get; set; }

        [StringLength(10)]
        public string? Position { get; set; }

        [StringLength(50)]
        public string? Team { get; set; }

        [StringLength(10)]
        public string? League { get; set; }
    }
}