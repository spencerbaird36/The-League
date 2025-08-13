using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using System.Text.Json;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DraftController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public DraftController(FantasyLeagueContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateDraft([FromBody] CreateDraftDto createDraftDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if draft already exists for this league
            var existingDraft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == createDraftDto.LeagueId);

            if (existingDraft != null)
            {
                return BadRequest(new { Message = "Draft already exists for this league" });
            }

            // Verify league exists
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == createDraftDto.LeagueId && l.IsActive);

            if (league == null)
            {
                return BadRequest(new { Message = "League not found" });
            }

            // Verify all draft order user IDs are valid league members
            var leagueUserIds = league.Users.Select(u => u.Id).ToHashSet();
            if (!createDraftDto.DraftOrder.All(userId => leagueUserIds.Contains(userId)))
            {
                return BadRequest(new { Message = "All users in draft order must be league members" });
            }

            var draft = new Draft
            {
                LeagueId = createDraftDto.LeagueId,
                DraftOrder = JsonSerializer.Serialize(createDraftDto.DraftOrder),
                CurrentTurn = 0,
                CurrentRound = 1,
                IsActive = false,
                IsCompleted = false
            };

            _context.Drafts.Add(draft);
            await _context.SaveChangesAsync();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                DraftOrder = createDraftDto.DraftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt
            };

            return CreatedAtAction(nameof(GetDraft), new { id = draft.Id }, response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDraft(int id)
        {
            var draft = await _context.Drafts
                .Include(d => d.League)
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                LeagueName = draft.League.Name,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                DraftPicks = draft.DraftPicks.Select(dp => new
                {
                    Id = dp.Id,
                    UserId = dp.UserId,
                    UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                    Username = dp.User.Username,
                    PlayerName = dp.PlayerName,
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    PickedAt = dp.PickedAt
                }).OrderBy(dp => dp.PickNumber).ToList()
            };

            return Ok(response);
        }

        [HttpGet("league/{leagueId}")]
        public async Task<IActionResult> GetDraftByLeague(int leagueId)
        {
            var draft = await _context.Drafts
                .Include(d => d.League)
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId);

            if (draft == null)
            {
                return NotFound(new { Message = "No draft found for this league" });
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                LeagueName = draft.League.Name,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                DraftPicks = draft.DraftPicks.Select(dp => new
                {
                    Id = dp.Id,
                    UserId = dp.UserId,
                    UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                    Username = dp.User.Username,
                    PlayerName = dp.PlayerName,
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    PickedAt = dp.PickedAt
                }).OrderBy(dp => dp.PickNumber).ToList()
            };

            return Ok(response);
        }

        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartDraft(int id)
        {
            var draft = await _context.Drafts
                .Include(d => d.League)
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            if (draft.IsActive)
            {
                return BadRequest(new { Message = "Draft is already active" });
            }

            if (draft.IsCompleted)
            {
                return BadRequest(new { Message = "Draft is already completed" });
            }

            draft.IsActive = true;
            draft.StartedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                LeagueName = draft.League.Name,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                DraftPicks = draft.DraftPicks.Select(dp => new
                {
                    Id = dp.Id,
                    UserId = dp.UserId,
                    UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                    Username = dp.User.Username,
                    PlayerName = dp.PlayerName,
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    PickedAt = dp.PickedAt
                }).OrderBy(dp => dp.PickNumber).ToList()
            };

            return Ok(response);
        }

        [HttpPost("{id}/pick")]
        public async Task<IActionResult> MakeDraftPick(int id, [FromBody] DraftPickDto draftPickDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            if (!draft.IsActive)
            {
                return BadRequest(new { Message = "Draft is not active" });
            }

            if (draft.IsCompleted)
            {
                return BadRequest(new { Message = "Draft is already completed" });
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            // Check if it's the correct user's turn
            if (draft.CurrentTurn >= draftOrder.Count)
            {
                return BadRequest(new { Message = "Invalid turn" });
            }

            var currentUserId = draftOrder[draft.CurrentTurn];
            if (currentUserId != draftPickDto.UserId)
            {
                return BadRequest(new { Message = "It's not your turn to pick" });
            }

            // Check if player is already drafted
            var existingPick = await _context.DraftPicks
                .FirstOrDefaultAsync(dp => dp.Draft.LeagueId == draft.LeagueId && 
                                         dp.PlayerName == draftPickDto.PlayerName);

            if (existingPick != null)
            {
                return BadRequest(new { Message = "Player has already been drafted" });
            }

            // Calculate pick numbers
            var pickNumber = draft.DraftPicks.Count + 1;
            var roundPick = (draft.CurrentTurn % draftOrder.Count) + 1;

            var draftPick = new DraftPick
            {
                DraftId = draft.Id,
                UserId = draftPickDto.UserId,
                PlayerName = draftPickDto.PlayerName,
                PlayerPosition = draftPickDto.PlayerPosition,
                PlayerTeam = draftPickDto.PlayerTeam,
                PlayerLeague = draftPickDto.PlayerLeague,
                PickNumber = pickNumber,
                Round = draft.CurrentRound,
                RoundPick = roundPick
            };

            _context.DraftPicks.Add(draftPick);

            // Also add to UserRoster table
            var userRoster = new UserRoster
            {
                UserId = draftPickDto.UserId,
                LeagueId = draft.LeagueId,
                DraftId = draft.Id,
                PlayerName = draftPickDto.PlayerName,
                PlayerPosition = draftPickDto.PlayerPosition,
                PlayerTeam = draftPickDto.PlayerTeam,
                PlayerLeague = draftPickDto.PlayerLeague,
                PickNumber = pickNumber,
                Round = draft.CurrentRound
            };

            _context.UserRosters.Add(userRoster);

            // Advance to next turn
            draft.CurrentTurn++;
            if (draft.CurrentTurn >= draftOrder.Count)
            {
                draft.CurrentTurn = 0;
                draft.CurrentRound++;
            }

            // Check if draft should be completed (simplified - you can add more complex logic)
            var maxRounds = 15; // Adjust based on your league settings
            if (draft.CurrentRound > maxRounds)
            {
                draft.IsActive = false;
                draft.IsCompleted = true;
                draft.CompletedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(draftPickDto.UserId);

            var response = new
            {
                Id = draftPick.Id,
                UserId = draftPick.UserId,
                UserFullName = user?.FirstName + " " + user?.LastName,
                Username = user?.Username,
                PlayerName = draftPick.PlayerName,
                PlayerPosition = draftPick.PlayerPosition,
                PlayerTeam = draftPick.PlayerTeam,
                PlayerLeague = draftPick.PlayerLeague,
                PickNumber = draftPick.PickNumber,
                Round = draftPick.Round,
                RoundPick = draftPick.RoundPick,
                PickedAt = draftPick.PickedAt,
                Draft = new
                {
                    CurrentTurn = draft.CurrentTurn,
                    CurrentRound = draft.CurrentRound,
                    IsCompleted = draft.IsCompleted,
                    NextUserId = draft.IsCompleted ? (int?)null : draftOrder[draft.CurrentTurn]
                }
            };

            return Ok(response);
        }

        [HttpPost("{id}/reset")]
        public async Task<IActionResult> ResetDraft(int id)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            // Remove all draft picks
            _context.DraftPicks.RemoveRange(draft.DraftPicks);

            // Remove all user roster entries for this draft
            var userRosters = await _context.UserRosters
                .Where(ur => ur.DraftId == draft.Id)
                .ToListAsync();
            _context.UserRosters.RemoveRange(userRosters);

            // Get current league members to update draft order with any new members
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == draft.LeagueId && l.IsActive);

            if (league == null)
            {
                return BadRequest(new { Message = "League not found" });
            }

            // Create new randomized draft order with current league members
            var currentMembers = league.Users.Select(u => u.Id).ToList();
            var random = new Random();
            var randomizedOrder = currentMembers.OrderBy(x => random.Next()).ToList();

            // Update draft with new order and reset state
            draft.DraftOrder = JsonSerializer.Serialize(randomizedOrder);
            draft.CurrentTurn = 0;
            draft.CurrentRound = 1;
            draft.IsActive = false;
            draft.IsCompleted = false;
            draft.StartedAt = null;
            draft.CompletedAt = null;

            await _context.SaveChangesAsync();

            var draftOrder = randomizedOrder;

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                Message = "Draft has been reset successfully"
            };

            return Ok(response);
        }
    }
}