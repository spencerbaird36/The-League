using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using System.Security.Cryptography;
using System.Text;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaguesController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public LeaguesController(FantasyLeagueContext context)
        {
            _context = context;
        }

        private string GenerateJoinCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 8)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateLeague([FromBody] CreateLeagueDto createLeagueDto, [FromQuery] int userId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return BadRequest(new { Message = "User not found" });
            }

            if (user.LeagueId != null)
            {
                return BadRequest(new { Message = "User is already in a league" });
            }

            // Generate unique join code
            string joinCode;
            do
            {
                joinCode = GenerateJoinCode();
            }
            while (await _context.Leagues.AnyAsync(l => l.JoinCode == joinCode));

            var league = new League
            {
                Name = createLeagueDto.Name,
                Description = createLeagueDto.Description,
                MaxPlayers = createLeagueDto.MaxPlayers,
                CreatedById = userId,
                JoinCode = joinCode,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Leagues.Add(league);
            await _context.SaveChangesAsync();

            // Add creator to the league
            user.LeagueId = league.Id;
            await _context.SaveChangesAsync();

            var leagueResponse = new
            {
                Id = league.Id,
                Name = league.Name,
                Description = league.Description,
                MaxPlayers = league.MaxPlayers,
                JoinCode = league.JoinCode,
                CreatedAt = league.CreatedAt,
                UserCount = 1
            };

            return CreatedAtAction(nameof(GetLeague), new { id = league.Id }, leagueResponse);
        }

        [HttpPost("join")]
        public async Task<IActionResult> JoinLeague([FromBody] JoinLeagueDto joinLeagueDto, [FromQuery] int userId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return BadRequest(new { Message = "User not found" });
            }

            if (user.LeagueId != null)
            {
                return BadRequest(new { Message = "User is already in a league" });
            }

            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.JoinCode == joinLeagueDto.JoinCode && l.IsActive);

            if (league == null)
            {
                return BadRequest(new { Message = "Invalid join code" });
            }

            if (league.Users.Count >= league.MaxPlayers)
            {
                return BadRequest(new { Message = "League is full" });
            }

            user.LeagueId = league.Id;
            await _context.SaveChangesAsync();

            var leagueResponse = new
            {
                Id = league.Id,
                Name = league.Name,
                Description = league.Description,
                MaxPlayers = league.MaxPlayers,
                JoinCode = league.JoinCode,
                CreatedAt = league.CreatedAt,
                UserCount = league.Users.Count + 1
            };

            return Ok(leagueResponse);
        }

        [HttpGet("available")]
        public async Task<IActionResult> GetAvailableLeagues()
        {
            var leagues = await _context.Leagues
                .Include(l => l.Users)
                .Include(l => l.CreatedBy)
                .Where(l => l.IsActive)
                .Select(l => new
                {
                    Id = l.Id,
                    Name = l.Name,
                    Description = l.Description,
                    MaxPlayers = l.MaxPlayers,
                    CurrentPlayers = l.Users.Count,
                    CreatedBy = new
                    {
                        Id = l.CreatedBy.Id,
                        Username = l.CreatedBy.Username,
                        FirstName = l.CreatedBy.FirstName,
                        LastName = l.CreatedBy.LastName
                    },
                    CreatedAt = l.CreatedAt,
                    HasSpace = l.Users.Count < l.MaxPlayers
                })
                .OrderByDescending(l => l.HasSpace)
                .ThenByDescending(l => l.CreatedAt)
                .ToListAsync();

            return Ok(leagues);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetLeague(int id)
        {
            var league = await _context.Leagues
                .Include(l => l.Users)
                .Include(l => l.CreatedBy)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (league == null)
            {
                return NotFound();
            }

            var leagueResponse = new
            {
                Id = league.Id,
                Name = league.Name,
                Description = league.Description,
                MaxPlayers = league.MaxPlayers,
                JoinCode = league.JoinCode,
                CreatedAt = league.CreatedAt,
                CreatedBy = new
                {
                    Id = league.CreatedBy.Id,
                    Username = league.CreatedBy.Username,
                    FirstName = league.CreatedBy.FirstName,
                    LastName = league.CreatedBy.LastName
                },
                Users = league.Users.Select(u => new
                {
                    Id = u.Id,
                    Username = u.Username,
                    FirstName = u.FirstName,
                    LastName = u.LastName
                }).ToList(),
                UserCount = league.Users.Count
            };

            return Ok(leagueResponse);
        }

        [HttpPost("join-by-id")]
        public async Task<IActionResult> JoinLeagueById([FromBody] JoinLeagueByIdDto joinDto, [FromQuery] int userId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return BadRequest(new { Message = "User not found" });
            }

            if (user.LeagueId != null)
            {
                return BadRequest(new { Message = "User is already in a league" });
            }

            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == joinDto.LeagueId && l.IsActive);

            if (league == null)
            {
                return BadRequest(new { Message = "League not found" });
            }

            if (league.Users.Count >= league.MaxPlayers)
            {
                return BadRequest(new { Message = "League is full" });
            }

            user.LeagueId = league.Id;
            await _context.SaveChangesAsync();

            var leagueResponse = new
            {
                Id = league.Id,
                Name = league.Name,
                Description = league.Description,
                MaxPlayers = league.MaxPlayers,
                JoinCode = league.JoinCode,
                CreatedAt = league.CreatedAt,
                UserCount = league.Users.Count + 1
            };

            return Ok(leagueResponse);
        }

        [HttpGet("{id}/standings")]
        public async Task<IActionResult> GetStandings(int id)
        {
            var league = await _context.Leagues
                .Include(l => l.Users)
                    .ThenInclude(u => u.TeamStats)
                .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);

            if (league == null)
            {
                return NotFound(new { Message = "League not found" });
            }

            // Create team stats for users who don't have them yet
            foreach (var user in league.Users.Where(u => u.TeamStats == null))
            {
                var teamStats = new TeamStats
                {
                    UserId = user.Id,
                    LeagueId = league.Id,
                    Wins = 0,
                    Losses = 0,
                    Ties = 0,
                    PointsFor = 0,
                    PointsAgainst = 0
                };
                _context.TeamStats.Add(teamStats);
            }
            await _context.SaveChangesAsync();

            // Reload with the new team stats
            league = await _context.Leagues
                .Include(l => l.Users)
                    .ThenInclude(u => u.TeamStats)
                .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);

            // Calculate games behind and create standings
            var standings = league.Users
                .Where(u => u.TeamStats != null)
                .Select(u => new
                {
                    UserId = u.Id,
                    Username = u.Username,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Wins = u.TeamStats!.Wins,
                    Losses = u.TeamStats!.Losses,
                    Ties = u.TeamStats!.Ties,
                    PointsFor = u.TeamStats!.PointsFor,
                    PointsAgainst = u.TeamStats!.PointsAgainst,
                    WinPercentage = u.TeamStats!.WinPercentage,
                    GamesPlayed = u.TeamStats!.GamesPlayed
                })
                .OrderByDescending(s => s.WinPercentage)
                .ThenByDescending(s => s.PointsFor)
                .ToList();

            // Calculate games behind first place
            var firstPlaceWinPct = standings.FirstOrDefault()?.WinPercentage ?? 0;
            var standingsWithGamesBehind = standings.Select((s, index) => new
            {
                Rank = index + 1,
                s.UserId,
                s.Username,
                s.FirstName,
                s.LastName,
                s.Wins,
                s.Losses,
                s.Ties,
                s.PointsFor,
                s.PointsAgainst,
                s.WinPercentage,
                s.GamesPlayed,
                GamesBehind = s.WinPercentage == firstPlaceWinPct ? 0 : 
                    Math.Round((double)(firstPlaceWinPct - s.WinPercentage) * s.GamesPlayed, 1)
            }).ToList();

            var response = new
            {
                LeagueId = league.Id,
                LeagueName = league.Name,
                Standings = standingsWithGamesBehind
            };

            return Ok(response);
        }

        [HttpGet("{id}/members")]
        public async Task<IActionResult> GetLeagueMembers(int id)
        {
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);

            if (league == null)
            {
                return NotFound(new { Message = "League not found" });
            }

            var members = league.Users.Select(u => new
            {
                Id = u.Id,
                Username = u.Username,
                FirstName = u.FirstName,
                LastName = u.LastName,
                CreatedAt = u.CreatedAt
            }).ToList();

            // Debug logging
            Console.WriteLine($"=== LEAGUE MEMBERS DEBUG ===");
            Console.WriteLine($"League {id} has {members.Count} members:");
            foreach (var member in members)
            {
                Console.WriteLine($"  - {member.FirstName} {member.LastName} (ID: {member.Id}, Username: {member.Username})");
            }
            
            // Check for Chloe Baird specifically
            var chloe = members.FirstOrDefault(m => 
                m.FirstName.ToLower().Contains("chloe") || 
                m.LastName.ToLower().Contains("baird"));
            Console.WriteLine($"Chloe Baird found in API response: {chloe != null}");
            if (chloe != null)
            {
                Console.WriteLine($"Chloe details: {chloe.FirstName} {chloe.LastName} (ID: {chloe.Id})");
            }

            return Ok(members);
        }

        [HttpGet("debug/users")]
        public async Task<IActionResult> DebugAllUsers()
        {
            var users = await _context.Users.ToListAsync();
            Console.WriteLine($"=== ALL USERS DEBUG ===");
            Console.WriteLine($"Total users in database: {users.Count}");
            
            foreach (var user in users)
            {
                Console.WriteLine($"User: {user.FirstName} {user.LastName} (ID: {user.Id}, Username: {user.Username}, LeagueId: {user.LeagueId})");
            }
            
            var chloeUsers = users.Where(u => 
                u.FirstName.ToLower().Contains("chloe") || 
                u.LastName.ToLower().Contains("baird")).ToList();
            
            Console.WriteLine($"Found {chloeUsers.Count} Chloe/Baird users:");
            foreach (var chloe in chloeUsers)
            {
                Console.WriteLine($"  - {chloe.FirstName} {chloe.LastName} (ID: {chloe.Id}, LeagueId: {chloe.LeagueId})");
            }

            return Ok(new { TotalUsers = users.Count, ChloeUsers = chloeUsers });
        }
    }
}