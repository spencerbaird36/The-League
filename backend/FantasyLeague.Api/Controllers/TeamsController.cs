using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.Data;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TeamsController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public TeamsController(FantasyLeagueContext context)
        {
            _context = context;
        }

        [HttpPost("pickup-player")]
        public async Task<IActionResult> PickupPlayer([FromBody] PickupPlayerRequest request)
        {
            try
            {
                // Debug logging
                Console.WriteLine($"Pickup request - UserId: {request.UserId}, LeagueId: {request.LeagueId}");
                
                // Check if user exists at all
                var userExists = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
                Console.WriteLine($"User exists: {userExists != null}");
                if (userExists != null)
                {
                    Console.WriteLine($"User league ID: {userExists.LeagueId}");
                }
                
                // Check if league exists
                var leagueExists = await _context.Leagues.FirstOrDefaultAsync(l => l.Id == request.LeagueId);
                Console.WriteLine($"League exists: {leagueExists != null}");
                
                // Validate user exists and is part of the league
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == request.UserId && u.LeagueId == request.LeagueId);
                    
                if (user == null)
                {
                    return BadRequest(new { 
                        message = "User not found or not part of the specified league",
                        debug = new {
                            requestedUserId = request.UserId,
                            requestedLeagueId = request.LeagueId,
                            userExists = userExists != null,
                            userLeagueId = userExists?.LeagueId,
                            leagueExists = leagueExists != null
                        }
                    });
                }

                // Check if player is already on any team in the league
                var existingRosterEntry = await _context.UserRosters
                    .FirstOrDefaultAsync(ur => ur.LeagueId == request.LeagueId && 
                                             ur.PlayerName == request.PlayerName);
                                             
                if (existingRosterEntry != null)
                {
                    return BadRequest(new { message = "Player is already on a team in this league" });
                }

                // Get current draft for the league
                var draft = await _context.Drafts
                    .FirstOrDefaultAsync(d => d.LeagueId == request.LeagueId);
                    
                if (draft == null)
                {
                    return BadRequest(new { message = "No draft found for this league" });
                }

                // Add player to user's roster
                var userRoster = new UserRoster
                {
                    UserId = request.UserId,
                    LeagueId = request.LeagueId,
                    DraftId = draft.Id,
                    PlayerName = request.PlayerName,
                    PlayerPosition = request.PlayerPosition,
                    PlayerTeam = request.PlayerTeam,
                    PlayerLeague = request.PlayerLeague,
                    PickNumber = 0, // Free agent pickups don't have a pick number
                    Round = 0, // Free agent pickups don't have a round
                    DraftedAt = DateTime.UtcNow
                };

                _context.UserRosters.Add(userRoster);

                // Create transaction record
                var transaction = new Transaction
                {
                    LeagueId = request.LeagueId,
                    UserId = request.UserId,
                    Type = TransactionType.FreeAgentPickup,
                    Description = $"{user.FirstName} {user.LastName} picked up {request.PlayerName} ({request.PlayerPosition}, {request.PlayerTeam})",
                    PlayerName = request.PlayerName,
                    PlayerPosition = request.PlayerPosition,
                    PlayerTeam = request.PlayerTeam,
                    PlayerLeague = request.PlayerLeague,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Transactions.Add(transaction);

                await _context.SaveChangesAsync();

                return Ok(new { 
                    message = $"Successfully picked up {request.PlayerName}",
                    transactionId = transaction.Id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while processing the pickup", error = ex.Message });
            }
        }

        [HttpGet("transactions/{leagueId}")]
        public async Task<IActionResult> GetRecentTransactions(int leagueId, [FromQuery] int limit = 10)
        {
            try
            {
                var transactions = await _context.Transactions
                    .Include(t => t.User)
                    .Where(t => t.LeagueId == leagueId)
                    .OrderByDescending(t => t.CreatedAt)
                    .Take(limit)
                    .Select(t => new
                    {
                        Id = t.Id,
                        Type = t.Type.ToString(),
                        Description = t.Description,
                        PlayerName = t.PlayerName,
                        PlayerPosition = t.PlayerPosition,
                        PlayerTeam = t.PlayerTeam,
                        PlayerLeague = t.PlayerLeague,
                        CreatedAt = t.CreatedAt,
                        UserName = $"{t.User.FirstName} {t.User.LastName}"
                    })
                    .ToListAsync();

                return Ok(transactions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred while fetching transactions", error = ex.Message });
            }
        }
    }

    public class PickupPlayerRequest
    {
        public int UserId { get; set; }
        public int LeagueId { get; set; }
        public string PlayerId { get; set; } = string.Empty;
        public string PlayerName { get; set; } = string.Empty;
        public string PlayerPosition { get; set; } = string.Empty;
        public string PlayerTeam { get; set; } = string.Empty;
        public string PlayerLeague { get; set; } = string.Empty;
    }
}