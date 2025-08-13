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
                    DraftedAt = ur.DraftedAt
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
                        DraftedAt = ur.DraftedAt
                    }).ToList()
                })
                .ToListAsync();

            return Ok(rosters);
        }
    }
}