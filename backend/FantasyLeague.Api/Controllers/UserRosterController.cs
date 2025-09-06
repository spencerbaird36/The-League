using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.Data;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserRosterController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public UserRosterController(FantasyLeagueContext context)
        {
            _context = context;
        }

        [HttpGet("user/{userId}/league/{leagueId}")]
        public async Task<IActionResult> GetUserRoster(int userId, int leagueId)
        {
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

            return Ok(roster);
        }

        [HttpGet("league/{leagueId}")]
        public async Task<IActionResult> GetAllRosters(int leagueId)
        {
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

            return Ok(rosters);
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