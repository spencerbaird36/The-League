using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;
using System.Security.Cryptography;
using System.Text;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeaguesController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly LeagueConfigurationService _configurationService;
        private readonly ScheduleService _scheduleService;

        public LeaguesController(FantasyLeagueContext context, LeagueConfigurationService configurationService, ScheduleService scheduleService)
        {
            _context = context;
            _configurationService = configurationService;
            _scheduleService = scheduleService;
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

            // Validate sport configuration
            var validationErrors = createLeagueDto.GetValidationErrors();
            if (validationErrors.Any())
            {
                return BadRequest(new { Message = "Invalid configuration", Errors = validationErrors });
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
                CommissionerId = userId, // Set creator as commissioner
                JoinCode = joinCode,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Leagues.Add(league);
            await _context.SaveChangesAsync();

            // Create custom league configuration based on user selections
            var configuration = new LeagueConfiguration
            {
                LeagueId = league.Id,
                IncludeNFL = createLeagueDto.IncludeNFL,
                IncludeMLB = createLeagueDto.IncludeMLB,
                IncludeNBA = createLeagueDto.IncludeNBA,
                TotalKeeperSlots = createLeagueDto.TotalKeeperSlots,
                IsKeeperLeague = createLeagueDto.IsKeeperLeague,
                MaxPlayersPerTeam = createLeagueDto.MaxPlayersPerTeam,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeagueConfigurations.Add(configuration);
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
                UserCount = 1,
                Configuration = new
                {
                    IncludeNFL = configuration.IncludeNFL,
                    IncludeMLB = configuration.IncludeMLB,
                    IncludeNBA = configuration.IncludeNBA,
                    TotalKeeperSlots = configuration.TotalKeeperSlots,
                    KeepersPerSport = configuration.KeepersPerSport,
                    IsKeeperLeague = configuration.IsKeeperLeague,
                    MaxPlayersPerTeam = configuration.MaxPlayersPerTeam,
                    SelectedSports = configuration.GetSelectedSports()
                }
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

            // Regenerate schedules for all sports if we have an even number of teams now
            var currentYear = DateTime.UtcNow.Year;
            var canGenerateSchedule = await _scheduleService.CanGenerateScheduleAsync(league.Id);
            
            if (canGenerateSchedule)
            {
                // Regenerate schedules for NFL, NBA, and MLB
                var sports = new[] { "NFL", "NBA", "MLB" };
                foreach (var sport in sports)
                {
                    try
                    {
                        await _scheduleService.RegenerateScheduleForMembershipChangeAsync(league.Id, sport, currentYear);
                    }
                    catch (Exception ex)
                    {
                        // Log but don't fail the join operation if schedule generation fails
                        Console.WriteLine($"Failed to regenerate {sport} schedule for league {league.Id}: {ex.Message}");
                    }
                }
            }

            var leagueResponse = new
            {
                Id = league.Id,
                Name = league.Name,
                Description = league.Description,
                MaxPlayers = league.MaxPlayers,
                JoinCode = league.JoinCode,
                CreatedAt = league.CreatedAt,
                UserCount = league.Users.Count + 1,
                CanGenerateSchedule = canGenerateSchedule
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
            Console.WriteLine($"=== GET LEAGUE MEMBERS REQUEST ===");
            Console.WriteLine($"Requested League ID: {id}");
            Console.WriteLine($"Request Time: {DateTime.UtcNow}");
            
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);

            if (league == null)
            {
                Console.WriteLine($"❌ League {id} not found or inactive");
                return NotFound(new { Message = "League not found" });
            }
            
            Console.WriteLine($"✅ Found League: {league.Name} (ID: {league.Id})");

            var members = league.Users.Select(u => new
            {
                Id = u.Id,
                Username = u.Username,
                FirstName = u.FirstName,
                LastName = u.LastName,
                CreatedAt = u.CreatedAt
            }).ToList();

            // Debug logging and integrity check
            Console.WriteLine($"=== LEAGUE MEMBERS DEBUG ===");
            Console.WriteLine($"League {id} ({league.Name}) has {members.Count} members:");
            foreach (var member in members)
            {
                Console.WriteLine($"  - {member.FirstName} {member.LastName} (ID: {member.Id}, Username: {member.Username})");
                
                // Verify the user's LeagueId in database matches the requested league
                var userFromDb = await _context.Users.FirstOrDefaultAsync(u => u.Id == member.Id);
                if (userFromDb?.LeagueId != id)
                {
                    Console.WriteLine($"    🚨 DATABASE INTEGRITY ISSUE: User {member.Id} has LeagueId={userFromDb?.LeagueId} but appears in League {id} members!");
                }
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

        [HttpGet("debug/all-leagues-with-members")]
        public async Task<IActionResult> GetAllLeaguesWithMembers()
        {
            var leagues = await _context.Leagues
                .Include(l => l.Users)
                .Where(l => l.IsActive)
                .ToListAsync();

            var result = leagues.Select(league => new
            {
                Id = league.Id,
                Name = league.Name,
                JoinCode = league.JoinCode,
                MemberCount = league.Users.Count,
                Members = league.Users.Select(u => new
                {
                    Id = u.Id,
                    Username = u.Username,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    LeagueId = u.LeagueId
                }).ToList()
            }).ToList();
            
            Console.WriteLine($"=== ALL LEAGUES DEBUG ===");
            foreach (var league in result)
            {
                Console.WriteLine($"League: {league.Name} (ID: {league.Id}, Code: {league.JoinCode})");
                foreach (var member in league.Members)
                {
                    Console.WriteLine($"  - {member.FirstName} {member.LastName} (ID: {member.Id}, LeagueId: {member.LeagueId})");
                }
            }

            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLeague(int id, [FromBody] UpdateLeagueDto updateLeagueDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var league = await _context.Leagues.FirstOrDefaultAsync(l => l.Id == id && l.IsActive);
            if (league == null)
            {
                return NotFound(new { Message = "League not found" });
            }

            // Update league properties
            if (!string.IsNullOrWhiteSpace(updateLeagueDto.Name))
            {
                league.Name = updateLeagueDto.Name.Trim();
            }

            if (!string.IsNullOrWhiteSpace(updateLeagueDto.Description))
            {
                league.Description = updateLeagueDto.Description.Trim();
            }

            try
            {
                await _context.SaveChangesAsync();

                var response = new
                {
                    Id = league.Id,
                    Name = league.Name,
                    Description = league.Description,
                    MaxPlayers = league.MaxPlayers,
                    JoinCode = league.JoinCode,
                    CreatedAt = league.CreatedAt,
                    UpdatedAt = DateTime.UtcNow
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "An error occurred while updating the league", Error = ex.Message });
            }
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

        [HttpGet("{id}/configuration")]
        public async Task<IActionResult> GetLeagueConfiguration(int id)
        {
            // First check if league exists
            var league = await _context.Leagues.FindAsync(id);
            if (league == null)
            {
                return NotFound(new { Message = "League not found" });
            }

            var config = await _configurationService.GetConfigurationAsync(id);
            
            // If no configuration exists, create a default one
            if (config == null)
            {
                config = await _configurationService.CreateDefaultConfigurationAsync(id);
            }

            return Ok(new
            {
                Id = config.Id,
                LeagueId = config.LeagueId,
                IncludeNFL = config.IncludeNFL,
                IncludeMLB = config.IncludeMLB,
                IncludeNBA = config.IncludeNBA,
                TotalKeeperSlots = config.TotalKeeperSlots,
                KeepersPerSport = config.KeepersPerSport,
                IsKeeperLeague = config.IsKeeperLeague,
                MaxPlayersPerTeam = config.MaxPlayersPerTeam,
                CreatedAt = config.CreatedAt,
                UpdatedAt = config.UpdatedAt,
                SelectedSports = config.GetSelectedSports()
            });
        }

        [HttpPut("{id}/configuration")]
        public async Task<IActionResult> UpdateLeagueConfiguration(int id, [FromBody] UpdateLeagueConfigurationDto configDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // First check if league exists
            var league = await _context.Leagues.FindAsync(id);
            if (league == null)
            {
                return NotFound(new { Message = "League not found" });
            }

            try
            {
                // Get or create configuration
                var existingConfig = await _configurationService.GetConfigurationAsync(id);
                if (existingConfig == null)
                {
                    existingConfig = await _configurationService.CreateDefaultConfigurationAsync(id);
                }

                // Create updated configuration
                var updatedConfig = new LeagueConfiguration
                {
                    IncludeNFL = configDto.IncludeNFL,
                    IncludeMLB = configDto.IncludeMLB,
                    IncludeNBA = configDto.IncludeNBA,
                    TotalKeeperSlots = configDto.TotalKeeperSlots,
                    IsKeeperLeague = configDto.IsKeeperLeague,
                    MaxPlayersPerTeam = configDto.MaxPlayersPerTeam
                };

                // Validate the new configuration
                if (!updatedConfig.IsValidConfiguration())
                {
                    var errors = updatedConfig.GetValidationErrors();
                    return BadRequest(new { Message = "Invalid configuration", Errors = errors });
                }

                // Update the configuration
                var result = await _configurationService.UpdateConfigurationAsync(id, updatedConfig);
                if (result == null)
                {
                    return StatusCode(500, new { Message = "Failed to update configuration" });
                }

                return Ok(new
                {
                    Id = result.Id,
                    LeagueId = result.LeagueId,
                    IncludeNFL = result.IncludeNFL,
                    IncludeMLB = result.IncludeMLB,
                    IncludeNBA = result.IncludeNBA,
                    TotalKeeperSlots = result.TotalKeeperSlots,
                    KeepersPerSport = result.KeepersPerSport,
                    IsKeeperLeague = result.IsKeeperLeague,
                    MaxPlayersPerTeam = result.MaxPlayersPerTeam,
                    CreatedAt = result.CreatedAt,
                    UpdatedAt = result.UpdatedAt,
                    SelectedSports = result.GetSelectedSports(),
                    Message = "League configuration updated successfully"
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "An error occurred while updating the configuration", Error = ex.Message });
            }
        }
    }
}