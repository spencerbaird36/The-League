using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommissionerController : ControllerBase
    {
        private readonly ICommissionerService _commissionerService;
        private readonly KeeperDraftService _keeperDraftService;
        private readonly RegularDraftService _regularDraftService;

        public CommissionerController(ICommissionerService commissionerService, KeeperDraftService keeperDraftService, RegularDraftService regularDraftService)
        {
            _commissionerService = commissionerService;
            _keeperDraftService = keeperDraftService;
            _regularDraftService = regularDraftService;
        }

        [HttpGet("verify/{leagueId}")]
        public async Task<IActionResult> VerifyCommissioner(int leagueId, [FromQuery] int userId)
        {
            var isCommissioner = await _commissionerService.IsCommissioner(userId, leagueId);
            return Ok(new { isCommissioner });
        }

        [HttpGet("league/{leagueId}")]
        public async Task<IActionResult> GetLeagueForCommissioner(int leagueId, [FromQuery] int commissionerId)
        {
            var league = await _commissionerService.GetLeagueForCommissioner(leagueId, commissionerId);
            if (league == null)
            {
                return Forbid("You are not the commissioner of this league");
            }

            var response = new
            {
                Id = league.Id,
                Name = league.Name,
                Description = league.Description,
                MaxPlayers = league.MaxPlayers,
                JoinCode = league.JoinCode,
                IsActive = league.IsActive,
                CreatedAt = league.CreatedAt,
                CreatedBy = new
                {
                    Id = league.CreatedBy.Id,
                    Username = league.CreatedBy.Username,
                    Email = league.CreatedBy.Email,
                    FirstName = league.CreatedBy.FirstName,
                    LastName = league.CreatedBy.LastName
                },
                Commissioner = league.Commissioner != null ? new
                {
                    Id = league.Commissioner.Id,
                    Username = league.Commissioner.Username,
                    Email = league.Commissioner.Email,
                    FirstName = league.Commissioner.FirstName,
                    LastName = league.Commissioner.LastName
                } : null,
                Users = league.Users.Select(u => new
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt
                }).ToList(),
                UserCount = league.Users.Count
            };

            return Ok(response);
        }

        [HttpPut("league/{leagueId}/settings")]
        public async Task<IActionResult> UpdateLeagueSettings(int leagueId, [FromQuery] int commissionerId, [FromBody] UpdateLeagueSettingsDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var success = await _commissionerService.UpdateLeagueSettings(
                leagueId, 
                commissionerId, 
                dto.Name, 
                dto.Description, 
                dto.MaxPlayers
            );

            if (!success)
            {
                return BadRequest(new { message = "Failed to update league settings. Check permissions and constraints." });
            }

            return Ok(new { message = "League settings updated successfully" });
        }

        [HttpPost("league/{leagueId}/invite")]
        public async Task<IActionResult> InviteUser(int leagueId, [FromQuery] int commissionerId, [FromBody] InviteUserDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var success = await _commissionerService.InviteUser(leagueId, commissionerId, dto.Email);

            if (!success)
            {
                return BadRequest(new { message = "Failed to invite user. They may already be in a league or the league may be full." });
            }

            return Ok(new { message = "User invited successfully" });
        }

        [HttpDelete("league/{leagueId}/users/{targetUserId}")]
        public async Task<IActionResult> RemoveUser(int leagueId, int targetUserId, [FromQuery] int commissionerId)
        {
            var success = await _commissionerService.RemoveUser(leagueId, commissionerId, targetUserId);

            if (!success)
            {
                return BadRequest(new { message = "Failed to remove user. Check permissions." });
            }

            return Ok(new { message = "User removed successfully" });
        }

        [HttpPost("league/{leagueId}/transfer")]
        public async Task<IActionResult> TransferCommissioner(int leagueId, [FromQuery] int currentCommissionerId, [FromBody] TransferCommissionerDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var success = await _commissionerService.TransferCommissioner(leagueId, currentCommissionerId, dto.NewCommissionerId);

            if (!success)
            {
                return BadRequest(new { message = "Failed to transfer commissioner role. Check permissions." });
            }

            return Ok(new { message = "Commissioner role transferred successfully" });
        }

        [HttpGet("league/{leagueId}/draft-status")]
        public async Task<IActionResult> GetDraftStatus(int leagueId, [FromQuery] int commissionerId)
        {
            if (!await _commissionerService.IsCommissioner(commissionerId, leagueId))
            {
                return Forbid("You are not the commissioner of this league");
            }

            var shouldPrompt = await _keeperDraftService.ShouldPromptForRegularDraftsAsync(leagueId);
            var pendingSports = await _keeperDraftService.GetPendingRegularDraftSportsAsync(leagueId);

            return Ok(new 
            { 
                shouldPromptForRegularDrafts = shouldPrompt,
                pendingSports = pendingSports,
                message = shouldPrompt ? $"Keeper draft complete! Set up regular drafts for: {string.Join(", ", pendingSports)}" : null
            });
        }

        [HttpPost("league/{leagueId}/create-regular-draft")]
        public async Task<IActionResult> CreateRegularDraft(int leagueId, [FromQuery] int commissionerId, [FromBody] CreateRegularDraftRequest dto)
        {
            if (!await _commissionerService.IsCommissioner(commissionerId, leagueId))
            {
                return Forbid("You are not the commissioner of this league");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var draft = await _regularDraftService.CreateRegularDraftAsync(leagueId, dto.SportType);
            
            if (draft == null)
            {
                return BadRequest(new { message = $"Failed to create regular draft for {dto.SportType}. Check if sport is enabled and draft doesn't already exist." });
            }

            return Ok(new 
            { 
                draftId = draft.Id,
                sportType = draft.SportType,
                message = $"Regular draft for {dto.SportType} created successfully" 
            });
        }

        [HttpPost("league/{leagueId}/create-all-regular-drafts")]
        public async Task<IActionResult> CreateAllRegularDrafts(int leagueId, [FromQuery] int commissionerId)
        {
            if (!await _commissionerService.IsCommissioner(commissionerId, leagueId))
            {
                return Forbid("You are not the commissioner of this league");
            }

            var pendingSports = await _keeperDraftService.GetPendingRegularDraftSportsAsync(leagueId);
            var createdDrafts = new List<object>();
            var errors = new List<string>();

            foreach (var sport in pendingSports)
            {
                var draft = await _regularDraftService.CreateRegularDraftAsync(leagueId, sport);
                if (draft != null)
                {
                    createdDrafts.Add(new { draftId = draft.Id, sportType = draft.SportType });
                }
                else
                {
                    errors.Add($"Failed to create draft for {sport}");
                }
            }

            if (errors.Any())
            {
                return BadRequest(new { 
                    message = "Some drafts could not be created", 
                    errors = errors,
                    created = createdDrafts
                });
            }

            return Ok(new { 
                message = $"Created regular drafts for all pending sports: {string.Join(", ", pendingSports)}", 
                created = createdDrafts 
            });
        }
    }

    // DTOs
    public class UpdateLeagueSettingsDto
    {
        public required string Name { get; set; }
        public required string Description { get; set; }
        public int MaxPlayers { get; set; }
    }

    public class InviteUserDto
    {
        public required string Email { get; set; }
    }

    public class TransferCommissionerDto
    {
        public int NewCommissionerId { get; set; }
    }

    public class CreateRegularDraftRequest
    {
        public required string SportType { get; set; }
    }
}