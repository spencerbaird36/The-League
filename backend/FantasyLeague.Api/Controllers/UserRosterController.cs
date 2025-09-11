using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserRosterController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly LeagueConfigurationService _configurationService;

        public UserRosterController(FantasyLeagueContext context, LeagueConfigurationService configurationService)
        {
            _context = context;
            _configurationService = configurationService;
        }

        [HttpGet("user/{userId}/league/{leagueId}")]
        public async Task<IActionResult> GetUserRoster(int userId, int leagueId)
        {
            // Get league configuration to determine which sports are enabled
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
            {
                return BadRequest("League configuration not found");
            }

            var roster = await _context.UserRosters
                .Where(ur => ur.UserId == userId && ur.LeagueId == leagueId)
                .OrderBy(ur => ur.PickNumber)
                .Select(ur => new
                {
                    Id = ur.Id,
                    PlayerName = ur.PlayerName,
                    PlayerPosition = ur.PlayerPosition,
                    PlayerTeam = ur.PlayerTeam,
                    PlayerLeague = ur.PlayerLeague,
                    PickNumber = ur.PickNumber,
                    Round = ur.Round,
                    DraftedAt = ur.DraftedAt,
                    LineupPosition = ur.LineupPosition
                })
                .ToListAsync();

            // Filter roster based on league configuration
            var filteredRoster = roster.Where(r => r.PlayerLeague.ToUpper() switch
            {
                "NFL" => config.IncludeNFL,
                "NBA" => config.IncludeNBA,
                "MLB" => config.IncludeMLB,
                _ => false
            }).ToList();

            return Ok(filteredRoster);
        }

        [HttpGet("league/{leagueId}")]
        public async Task<IActionResult> GetAllRosters(int leagueId)
        {
            // Get league configuration to determine which sports are enabled
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
            {
                return BadRequest("League configuration not found");
            }

            var rosters = await _context.UserRosters
                .Include(ur => ur.User)
                .Where(ur => ur.LeagueId == leagueId)
                .GroupBy(ur => ur.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    Username = g.First().User.Username,
                    FirstName = g.First().User.FirstName,
                    LastName = g.First().User.LastName,
                    Players = g.OrderBy(ur => ur.PickNumber).Select(ur => new
                    {
                        Id = ur.Id,
                        PlayerName = ur.PlayerName,
                        PlayerPosition = ur.PlayerPosition,
                        PlayerTeam = ur.PlayerTeam,
                        PlayerLeague = ur.PlayerLeague,
                        PickNumber = ur.PickNumber,
                        Round = ur.Round,
                        DraftedAt = ur.DraftedAt,
                        LineupPosition = ur.LineupPosition
                    }).ToList()
                })
                .ToListAsync();

            // Filter each user's roster based on league configuration
            var filteredRosters = rosters.Select(roster => new
            {
                roster.UserId,
                roster.Username,
                roster.FirstName,
                roster.LastName,
                Players = roster.Players.Where(p => p.PlayerLeague.ToUpper() switch
                {
                    "NFL" => config.IncludeNFL,
                    "NBA" => config.IncludeNBA,
                    "MLB" => config.IncludeMLB,
                    _ => false
                }).ToList()
            }).ToList();

            return Ok(filteredRosters);
        }

        [HttpPut("{rosterId}/position")]
        public async Task<IActionResult> UpdatePlayerPosition(int rosterId, [FromBody] UpdatePositionRequest request)
        {
            var rosterEntry = await _context.UserRosters.FindAsync(rosterId);
            if (rosterEntry == null)
            {
                return NotFound("Roster entry not found");
            }

            // Validate position compatibility
            if (!IsValidPosition(rosterEntry.PlayerPosition, request.NewPosition, rosterEntry.PlayerLeague))
            {
                return BadRequest($"Player with position {rosterEntry.PlayerPosition} cannot be placed in {request.NewPosition}");
            }

            // Update lineup position
            rosterEntry.LineupPosition = request.NewPosition == "BN" ? null : request.NewPosition;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { message = "Position updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to update position", error = ex.Message });
            }
        }

        private static bool IsValidPosition(string playerPosition, string lineupPosition, string league)
        {
            // Allow bench moves
            if (lineupPosition == "BN") return true;

            // Direct position matches
            if (playerPosition == lineupPosition) return true;

            // League-specific compatibility
            return league switch
            {
                "MLB" => (playerPosition == "CP" && lineupPosition == "CL") ||
                        (playerPosition == "OF" && lineupPosition == "OF"),
                "NFL" => false, // Add NFL-specific rules if needed
                "NBA" => false, // Add NBA-specific rules if needed
                _ => false
            };
        }
    }

    public class UpdatePositionRequest
    {
        public string NewPosition { get; set; } = string.Empty;
        public int PositionIndex { get; set; }
    }
}