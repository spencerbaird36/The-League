using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;
using System.Text.Json;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DraftController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly KeeperDraftService _keeperDraftService;
        private readonly PlayerPoolService _playerPoolService;
        private readonly RegularDraftService _regularDraftService;

        public DraftController(FantasyLeagueContext context, KeeperDraftService keeperDraftService, PlayerPoolService playerPoolService, RegularDraftService regularDraftService)
        {
            _context = context;
            _keeperDraftService = keeperDraftService;
            _playerPoolService = playerPoolService;
            _regularDraftService = regularDraftService;
        }

        // Helper method to clean player names for frontend display
        private static string CleanPlayerNameForDisplay(string playerName)
        {
            if (string.IsNullOrEmpty(playerName)) return playerName;
            
            // Remove ID prefix if present (e.g., "aaron-rodgers:Aaron Rodgers" -> "Aaron Rodgers")
            var idPrefixMatch = playerName.Split(':', 2);
            if (idPrefixMatch.Length == 2)
            {
                playerName = idPrefixMatch[1].Trim();
            }
            
            // Remove "(AUTO)" suffix for auto-drafted players
            playerName = playerName.Replace(" (AUTO)", "").Trim();
            
            return playerName;
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
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
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
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
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
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
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

            // Calculate current picker using snake draft logic
            var totalPicks = draft.DraftPicks.Count;
            var teamCount = draftOrder.Count;
            var currentRoundIndex = totalPicks / teamCount; // 0-based round index
            var currentPickInRound = totalPicks % teamCount; // 0-based pick in round
            
            // For snake draft: even rounds (0, 2, 4...) go forward, odd rounds (1, 3, 5...) go backward
            int currentUserIndex;
            if (currentRoundIndex % 2 == 0)
            {
                // Even round (0, 2, 4...): forward order
                currentUserIndex = currentPickInRound;
            }
            else
            {
                // Odd round (1, 3, 5...): reverse order
                currentUserIndex = teamCount - 1 - currentPickInRound;
            }

            var currentUserId = draftOrder[currentUserIndex];
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

            // Calculate pick numbers using snake draft logic
            var pickNumber = draft.DraftPicks.Count + 1;
            var roundPick = currentPickInRound + 1; // 1-based pick in round
            var actualRound = currentRoundIndex + 1; // 1-based round number

            var draftPick = new DraftPick
            {
                DraftId = draft.Id,
                UserId = draftPickDto.UserId,
                PlayerName = draftPickDto.PlayerName,
                PlayerPosition = draftPickDto.PlayerPosition,
                PlayerTeam = draftPickDto.PlayerTeam,
                PlayerLeague = draftPickDto.PlayerLeague,
                PickNumber = pickNumber,
                Round = actualRound,
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
                Round = actualRound
            };

            _context.UserRosters.Add(userRoster);

            // Update draft state for next pick using snake draft logic
            var nextTotalPicks = totalPicks + 1; // After this pick
            var nextRoundIndex = nextTotalPicks / teamCount;
            var nextPickInRound = nextTotalPicks % teamCount;
            
            // Calculate next picker index
            int nextUserIndex;
            if (nextRoundIndex % 2 == 0)
            {
                // Even round: forward order
                nextUserIndex = nextPickInRound;
            }
            else
            {
                // Odd round: reverse order
                nextUserIndex = teamCount - 1 - nextPickInRound;
            }
            
            // Update draft state
            draft.CurrentTurn = nextUserIndex;
            draft.CurrentRound = nextRoundIndex + 1; // 1-based round

            // Check if draft should be completed based on total picks made
            var totalPicksMade = draft.DraftPicks.Count;
            if (draft.MaxPicks > 0 && totalPicksMade >= draft.MaxPicks)
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
                    NextUserId = draft.IsCompleted ? (int?)null : (nextTotalPicks < teamCount * 15 ? draftOrder[nextUserIndex] : (int?)null)
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

            // Remove all transactions for this league (free agent pickups and any future transaction types)
            var transactions = await _context.Transactions
                .Where(t => t.LeagueId == draft.LeagueId)
                .ToListAsync();
            _context.Transactions.RemoveRange(transactions);

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

        [HttpGet("league/{leagueId}/available-players")]
        public async Task<IActionResult> GetAvailablePlayersForDraft(int leagueId)
        {
            try
            {
                var availablePlayers = await _playerPoolService.GetAvailablePlayersForLeagueAsync(leagueId);
                var stats = await _playerPoolService.GetPlayerPoolStatsAsync(leagueId);

                return Ok(new
                {
                    TotalPlayers = stats.TotalPlayers,
                    KeeperPicks = stats.KeeperPicks,
                    DraftedPlayers = stats.RegularDraftPicks,
                    AvailablePlayers = stats.AvailablePlayers,
                    Players = availablePlayers,
                    KeeperPicksBySport = stats.KeeperPicksBySport,
                    DraftedPlayersBySport = stats.RegularDraftPicksBySport
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving available players", Error = ex.Message });
            }
        }

        // Keeper Draft Endpoints
        [HttpPost("keeper/create")]
        public async Task<IActionResult> CreateKeeperDraft([FromBody] CreateKeeperDraftDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var draft = await _keeperDraftService.CreateKeeperDraftAsync(dto.LeagueId, dto.CreatedByUserId);
            if (draft == null)
            {
                return BadRequest(new { Message = "Unable to create keeper draft. League not found or not configured as keeper league." });
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            return CreatedAtAction(nameof(GetDraft), new { id = draft.Id }, new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                DraftType = draft.DraftType.ToString(),
                DraftOrder = draftOrder,
                MaxPicks = draft.MaxPicks,
                MaxPicksPerSport = draft.MaxPicksPerSport,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt
            });
        }

        [HttpGet("keeper/league/{leagueId}")]
        public async Task<IActionResult> GetKeeperDraftForLeague(int leagueId)
        {
            var draft = await _keeperDraftService.GetKeeperDraftForLeagueAsync(leagueId);
            if (draft == null)
            {
                return NotFound(new { Message = "No keeper draft found for this league" });
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            return Ok(new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                DraftType = draft.DraftType.ToString(),
                DraftOrder = draftOrder,
                MaxPicks = draft.MaxPicks,
                MaxPicksPerSport = draft.MaxPicksPerSport,
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
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    IsKeeperPick = dp.IsKeeperPick,
                    PickedAt = dp.PickedAt
                }).Where(dp => dp.IsKeeperPick).OrderBy(dp => dp.PickedAt).ToList()
            });
        }

        [HttpPost("keeper/{id}/pick")]
        public async Task<IActionResult> MakeKeeperPick(int id, [FromBody] KeeperPickDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Validate the keeper pick
            var isValid = await _keeperDraftService.ValidateKeeperPickAsync(id, dto.UserId, dto.PlayerLeague);
            if (!isValid)
            {
                return BadRequest(new { Message = "Invalid keeper pick. Check sport limits and total keeper slots." });
            }

            // Check if user can make a keeper pick
            var canMakePick = await _keeperDraftService.CanUserMakeKeeperPickAsync(id, dto.UserId);
            if (!canMakePick)
            {
                return BadRequest(new { Message = "User cannot make more keeper picks or draft is not active." });
            }

            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == id && d.DraftType == DraftType.Keeper);

            if (draft == null)
            {
                return NotFound(new { Message = "Keeper draft not found" });
            }

            // Check if player is already a keeper pick
            var existingKeeperPick = await _context.DraftPicks
                .FirstOrDefaultAsync(dp => dp.Draft.LeagueId == draft.LeagueId && 
                                         dp.PlayerName == dto.PlayerName && 
                                         dp.IsKeeperPick);

            if (existingKeeperPick != null)
            {
                return BadRequest(new { Message = "Player has already been selected as a keeper" });
            }

            var keeperPick = new DraftPick
            {
                DraftId = draft.Id,
                UserId = dto.UserId,
                PlayerName = dto.PlayerName,
                PlayerPosition = dto.PlayerPosition,
                PlayerTeam = dto.PlayerTeam,
                PlayerLeague = dto.PlayerLeague,
                PickNumber = 0, // Keeper picks don't have traditional pick numbers
                Round = 0,      // Keeper picks don't have rounds
                RoundPick = 0,  // Keeper picks don't have round picks
                IsKeeperPick = true
            };

            _context.DraftPicks.Add(keeperPick);

            // Also add to UserRoster table
            var userRoster = new UserRoster
            {
                UserId = dto.UserId,
                LeagueId = draft.LeagueId,
                DraftId = draft.Id,
                PlayerName = dto.PlayerName,
                PlayerPosition = dto.PlayerPosition,
                PlayerTeam = dto.PlayerTeam,
                PlayerLeague = dto.PlayerLeague,
                PickNumber = 0,
                Round = 0
            };

            _context.UserRosters.Add(userRoster);

            // Check if keeper draft should be completed
            var isComplete = await _keeperDraftService.IsKeeperDraftCompleteAsync(id);
            if (isComplete)
            {
                await _keeperDraftService.CompleteKeeperDraftAsync(id);
            }

            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(dto.UserId);

            return Ok(new
            {
                Id = keeperPick.Id,
                UserId = keeperPick.UserId,
                UserFullName = user?.FirstName + " " + user?.LastName,
                Username = user?.Username,
                PlayerName = keeperPick.PlayerName,
                PlayerPosition = keeperPick.PlayerPosition,
                PlayerTeam = keeperPick.PlayerTeam,
                PlayerLeague = keeperPick.PlayerLeague,
                IsKeeperPick = keeperPick.IsKeeperPick,
                PickedAt = keeperPick.PickedAt,
                Draft = new
                {
                    IsCompleted = draft.IsCompleted
                }
            });
        }

        [HttpGet("keeper/{draftId}/user/{userId}/counts")]
        public async Task<IActionResult> GetUserKeeperCounts(int draftId, int userId)
        {
            var counts = await _keeperDraftService.GetUserKeeperCountsBySportAsync(draftId, userId);
            return Ok(counts);
        }

        [HttpGet("keeper/league/{leagueId}/picks")]
        public async Task<IActionResult> GetAllKeeperPicksForLeague(int leagueId)
        {
            var allPicks = await _keeperDraftService.GetAllKeeperPicksForLeagueAsync(leagueId);
            return Ok(allPicks);
        }

        [HttpGet("keeper/league/{leagueId}/user/{userId}/picks")]
        public async Task<IActionResult> GetKeeperPicksForUser(int leagueId, int userId)
        {
            var picks = await _keeperDraftService.GetKeeperPicksForUserAsync(leagueId, userId);
            return Ok(picks.Select(p => new
            {
                Id = p.Id,
                PlayerName = CleanPlayerNameForDisplay(p.PlayerName),
                PlayerPosition = p.PlayerPosition,
                PlayerTeam = p.PlayerTeam,
                PlayerLeague = p.PlayerLeague,
                PickedAt = p.PickedAt
            }));
        }

        // Player Pool Management Endpoints
        [HttpGet("league/{leagueId}/player-pool-stats")]
        public async Task<IActionResult> GetPlayerPoolStats(int leagueId)
        {
            try
            {
                var stats = await _playerPoolService.GetPlayerPoolStatsAsync(leagueId);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving player pool stats", Error = ex.Message });
            }
        }

        [HttpGet("league/{leagueId}/keeper-picks")]
        public async Task<IActionResult> GetKeeperPicksForLeague(int leagueId)
        {
            try
            {
                var keeperPicks = await _playerPoolService.GetKeeperPicksForLeagueAsync(leagueId);
                return Ok(keeperPicks.Select(kp => new
                {
                    Id = kp.Id,
                    UserId = kp.UserId,
                    PlayerName = CleanPlayerNameForDisplay(kp.PlayerName),
                    PlayerPosition = kp.PlayerPosition,
                    PlayerTeam = kp.PlayerTeam,
                    PlayerLeague = kp.PlayerLeague,
                    PickedAt = kp.PickedAt
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving keeper picks", Error = ex.Message });
            }
        }

        [HttpGet("league/{leagueId}/regular-draft-picks")]
        public async Task<IActionResult> GetRegularDraftPicksForLeague(int leagueId)
        {
            try
            {
                var regularPicks = await _playerPoolService.GetRegularDraftPicksForLeagueAsync(leagueId);
                return Ok(regularPicks.Select(rp => new
                {
                    Id = rp.Id,
                    UserId = rp.UserId,
                    PlayerName = CleanPlayerNameForDisplay(rp.PlayerName),
                    PlayerPosition = rp.PlayerPosition,
                    PlayerTeam = rp.PlayerTeam,
                    PlayerLeague = rp.PlayerLeague,
                    PickNumber = rp.PickNumber,
                    Round = rp.Round,
                    RoundPick = rp.RoundPick,
                    PickedAt = rp.PickedAt
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving regular draft picks", Error = ex.Message });
            }
        }

        // Regular Draft Endpoints
        [HttpPost("regular/create")]
        public async Task<IActionResult> CreateRegularDraft([FromBody] CreateRegularDraftDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var canCreate = await _regularDraftService.CanCreateRegularDraftAsync(dto.LeagueId, dto.SportType);
                if (!canCreate)
                {
                    return BadRequest(new { Message = $"Cannot create {dto.SportType} draft. Check if sport is enabled, keeper draft is completed (if applicable), or if draft already exists." });
                }

                var draft = await _regularDraftService.CreateRegularDraftAsync(dto.LeagueId, dto.SportType, dto.CreatedByUserId);
                if (draft == null)
                {
                    return BadRequest(new { Message = "Failed to create regular draft" });
                }

                var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

                return CreatedAtAction(nameof(GetDraft), new { id = draft.Id }, new
                {
                    Id = draft.Id,
                    LeagueId = draft.LeagueId,
                    DraftType = draft.DraftType.ToString(),
                    SportType = draft.SportType,
                    DraftOrder = draftOrder,
                    MaxPicks = draft.MaxPicks,
                    MaxPicksPerSport = draft.MaxPicksPerSport,
                    CurrentTurn = draft.CurrentTurn,
                    CurrentRound = draft.CurrentRound,
                    IsActive = draft.IsActive,
                    IsCompleted = draft.IsCompleted,
                    CreatedAt = draft.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error creating regular draft", Error = ex.Message });
            }
        }

        [HttpGet("regular/league/{leagueId}")]
        public async Task<IActionResult> GetRegularDraftsForLeague(int leagueId)
        {
            try
            {
                var drafts = await _regularDraftService.GetRegularDraftsForLeagueAsync(leagueId);
                
                return Ok(drafts.Select(draft => new
                {
                    Id = draft.Id,
                    LeagueId = draft.LeagueId,
                    DraftType = draft.DraftType.ToString(),
                    SportType = draft.SportType,
                    DraftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>(),
                    MaxPicks = draft.MaxPicks,
                    MaxPicksPerSport = draft.MaxPicksPerSport,
                    CurrentTurn = draft.CurrentTurn,
                    CurrentRound = draft.CurrentRound,
                    IsActive = draft.IsActive,
                    IsCompleted = draft.IsCompleted,
                    CreatedAt = draft.CreatedAt,
                    StartedAt = draft.StartedAt,
                    CompletedAt = draft.CompletedAt,
                    CompletedPicks = draft.DraftPicks.Count(dp => !dp.IsKeeperPick),
                    DraftPicks = draft.DraftPicks.Where(dp => !dp.IsKeeperPick).Select(dp => new
                    {
                        Id = dp.Id,
                        UserId = dp.UserId,
                        UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                        Username = dp.User.Username,
                        PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
                        PlayerPosition = dp.PlayerPosition,
                        PlayerTeam = dp.PlayerTeam,
                        PlayerLeague = dp.PlayerLeague,
                        PickNumber = dp.PickNumber,
                        Round = dp.Round,
                        RoundPick = dp.RoundPick,
                        PickedAt = dp.PickedAt
                    }).OrderBy(dp => dp.PickNumber).ToList()
                }));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving regular drafts", Error = ex.Message });
            }
        }

        [HttpGet("regular/league/{leagueId}/sport/{sportType}")]
        public async Task<IActionResult> GetRegularDraftBySport(int leagueId, string sportType)
        {
            try
            {
                var draft = await _regularDraftService.GetRegularDraftBySportAsync(leagueId, sportType);
                if (draft == null)
                {
                    return NotFound(new { Message = $"No {sportType} draft found for this league" });
                }

                var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

                return Ok(new
                {
                    Id = draft.Id,
                    LeagueId = draft.LeagueId,
                    DraftType = draft.DraftType.ToString(),
                    SportType = draft.SportType,
                    DraftOrder = draftOrder,
                    MaxPicks = draft.MaxPicks,
                    MaxPicksPerSport = draft.MaxPicksPerSport,
                    CurrentTurn = draft.CurrentTurn,
                    CurrentRound = draft.CurrentRound,
                    IsActive = draft.IsActive,
                    IsCompleted = draft.IsCompleted,
                    CreatedAt = draft.CreatedAt,
                    StartedAt = draft.StartedAt,
                    CompletedAt = draft.CompletedAt,
                    CompletedPicks = draft.DraftPicks.Count(dp => !dp.IsKeeperPick),
                    DraftPicks = draft.DraftPicks.Where(dp => !dp.IsKeeperPick).Select(dp => new
                    {
                        Id = dp.Id,
                        UserId = dp.UserId,
                        UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                        Username = dp.User.Username,
                        PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
                        PlayerPosition = dp.PlayerPosition,
                        PlayerTeam = dp.PlayerTeam,
                        PlayerLeague = dp.PlayerLeague,
                        PickNumber = dp.PickNumber,
                        Round = dp.Round,
                        RoundPick = dp.RoundPick,
                        PickedAt = dp.PickedAt
                    }).OrderBy(dp => dp.PickNumber).ToList()
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving regular draft", Error = ex.Message });
            }
        }

        [HttpGet("regular/league/{leagueId}/status")]
        public async Task<IActionResult> GetRegularDraftStatus(int leagueId)
        {
            try
            {
                var status = await _regularDraftService.GetRegularDraftStatusAsync(leagueId);
                return Ok(status);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error retrieving draft status", Error = ex.Message });
            }
        }

        [HttpPost("regular/{id}/start")]
        public async Task<IActionResult> StartRegularDraft(int id)
        {
            try
            {
                var success = await _regularDraftService.StartRegularDraftAsync(id);
                if (!success)
                {
                    return BadRequest(new { Message = "Cannot start draft. Check if draft exists and is not already started or completed." });
                }

                return Ok(new { Message = "Draft started successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error starting draft", Error = ex.Message });
            }
        }

        [HttpPost("regular/{id}/pick")]
        public async Task<IActionResult> MakeRegularDraftPick(int id, [FromBody] DraftPickDto draftPickDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                // Validate the regular draft pick
                var isValid = await _regularDraftService.ValidateRegularDraftPickAsync(id, draftPickDto.UserId, draftPickDto.PlayerLeague);
                if (!isValid)
                {
                    return BadRequest(new { Message = "Invalid draft pick. Check sport type and pick limits." });
                }

                var draft = await _context.Drafts
                    .Include(d => d.DraftPicks)
                    .FirstOrDefaultAsync(d => d.Id == id && d.DraftType == DraftType.Regular);

                if (draft == null)
                {
                    return NotFound(new { Message = "Regular draft not found" });
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

                // Calculate current picker using snake draft logic (same as existing logic)
                var totalPicks = draft.DraftPicks.Count(dp => !dp.IsKeeperPick);
                var teamCount = draftOrder.Count;
                var currentRoundIndex = totalPicks / teamCount;
                var currentPickInRound = totalPicks % teamCount;
                
                int currentUserIndex;
                if (currentRoundIndex % 2 == 0)
                {
                    currentUserIndex = currentPickInRound;
                }
                else
                {
                    currentUserIndex = teamCount - 1 - currentPickInRound;
                }

                var currentUserId = draftOrder[currentUserIndex];
                if (currentUserId != draftPickDto.UserId)
                {
                    return BadRequest(new { Message = "It's not your turn to pick" });
                }

                // Check if player is already drafted (including keepers)
                var existingPick = await _context.DraftPicks
                    .FirstOrDefaultAsync(dp => dp.Draft.LeagueId == draft.LeagueId && 
                                             dp.PlayerName == draftPickDto.PlayerName);

                if (existingPick != null)
                {
                    return BadRequest(new { Message = "Player has already been drafted" });
                }

                var pickNumber = totalPicks + 1;
                var roundPick = currentPickInRound + 1;
                var actualRound = currentRoundIndex + 1;

                var draftPick = new DraftPick
                {
                    DraftId = draft.Id,
                    UserId = draftPickDto.UserId,
                    PlayerName = draftPickDto.PlayerName,
                    PlayerPosition = draftPickDto.PlayerPosition,
                    PlayerTeam = draftPickDto.PlayerTeam,
                    PlayerLeague = draftPickDto.PlayerLeague,
                    PickNumber = pickNumber,
                    Round = actualRound,
                    RoundPick = roundPick,
                    IsKeeperPick = false
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
                    Round = actualRound
                };

                _context.UserRosters.Add(userRoster);

                // Update draft state
                var nextTotalPicks = totalPicks + 1;
                var nextRoundIndex = nextTotalPicks / teamCount;
                var nextPickInRound = nextTotalPicks % teamCount;
                
                int nextUserIndex;
                if (nextRoundIndex % 2 == 0)
                {
                    nextUserIndex = nextPickInRound;
                }
                else
                {
                    nextUserIndex = teamCount - 1 - nextPickInRound;
                }
                
                draft.CurrentTurn = nextUserIndex;
                draft.CurrentRound = nextRoundIndex + 1;

                // Check if draft should be completed
                if (nextTotalPicks >= draft.MaxPicks)
                {
                    await _regularDraftService.CompleteRegularDraftAsync(id);
                }

                await _context.SaveChangesAsync();

                var user = await _context.Users.FindAsync(draftPickDto.UserId);

                return Ok(new
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
                        NextUserId = draft.IsCompleted ? (int?)null : (nextTotalPicks < draft.MaxPicks ? draftOrder[nextUserIndex] : (int?)null)
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error making draft pick", Error = ex.Message });
            }
        }
    }
}