using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScoringSettingsController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<ScoringSettingsController> _logger;

        public ScoringSettingsController(FantasyLeagueContext context, ILogger<ScoringSettingsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/scoringsettings/league/{leagueId}
        [HttpGet("league/{leagueId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetLeagueScoringSettings(int leagueId)
        {
            try
            {
                _logger.LogInformation("=== GET SCORING SETTINGS REQUEST ===");
                _logger.LogInformation("Requested League ID: {LeagueId}", leagueId);
                _logger.LogInformation("Request Time: {RequestTime}", DateTime.UtcNow);

                var scoringSettings = await _context.ScoringSettings
                    .AsNoTracking()
                    .Where(s => s.LeagueId == leagueId && s.IsActive)
                    .OrderBy(s => s.Sport)
                    .ToListAsync();

                _logger.LogInformation("Found {Count} scoring settings for league {LeagueId}", scoringSettings.Count, leagueId);

                // Return as anonymous objects to avoid circular reference
                var response = scoringSettings.Select(s => new
                {
                    s.Id,
                    s.LeagueId,
                    s.Sport,
                    s.PassingYardsPerPoint,
                    s.PassingTouchdownPoints,
                    s.PassingInterceptionPoints,
                    s.PassingTwoPointConversion,
                    s.RushingYardsPerPoint,
                    s.RushingTouchdownPoints,
                    s.RushingTwoPointConversion,
                    s.ReceivingYardsPerPoint,
                    s.ReceivingTouchdownPoints,
                    s.ReceptionPoints,
                    s.ReceivingTwoPointConversion,
                    s.FumbleLostPoints,
                    s.ExtraPointPoints,
                    s.FieldGoal0to39Points,
                    s.FieldGoal40to49Points,
                    s.FieldGoal50PlusPoints,
                    s.MissedExtraPointPoints,
                    s.MissedFieldGoalPoints,
                    s.DefenseTouchdownPoints,
                    s.SackPoints,
                    s.InterceptionPoints,
                    s.FumbleRecoveryPoints,
                    s.SafetyPoints,
                    s.BlockedKickPoints,
                    s.DefensePointsAllowed0Points,
                    s.DefensePointsAllowed1to6Points,
                    s.DefensePointsAllowed7to13Points,
                    s.DefensePointsAllowed14to20Points,
                    s.DefensePointsAllowed21to27Points,
                    s.DefensePointsAllowed28to34Points,
                    s.DefensePointsAllowed35PlusPoints,
                    s.BenchPoints,
                    s.IsActive,
                    s.CreatedAt,
                    s.UpdatedAt
                }).ToList();

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting scoring settings for league {LeagueId}", leagueId);
                return StatusCode(500, new { message = "Error retrieving scoring settings", error = ex.Message });
            }
        }

        // GET: api/scoringsettings/league/{leagueId}/sport/{sport}
        [HttpGet("league/{leagueId}/sport/{sport}")]
        public async Task<ActionResult<object>> GetLeagueScoringSettingsBySport(int leagueId, string sport)
        {
            try
            {
                _logger.LogInformation("Getting scoring settings for league {LeagueId}, sport {Sport}", leagueId, sport);

                var scoringSettings = await _context.ScoringSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.LeagueId == leagueId && s.Sport == sport.ToUpper() && s.IsActive);

                if (scoringSettings == null)
                {
                    _logger.LogInformation("No scoring settings found for league {LeagueId}, sport {Sport}", leagueId, sport);
                    return NotFound(new { message = $"No scoring settings found for league {leagueId} and sport {sport}" });
                }

                // Return as anonymous object to avoid circular reference
                var response = new
                {
                    scoringSettings.Id,
                    scoringSettings.LeagueId,
                    scoringSettings.Sport,
                    scoringSettings.PassingYardsPerPoint,
                    scoringSettings.PassingTouchdownPoints,
                    scoringSettings.PassingInterceptionPoints,
                    scoringSettings.PassingTwoPointConversion,
                    scoringSettings.RushingYardsPerPoint,
                    scoringSettings.RushingTouchdownPoints,
                    scoringSettings.RushingTwoPointConversion,
                    scoringSettings.ReceivingYardsPerPoint,
                    scoringSettings.ReceivingTouchdownPoints,
                    scoringSettings.ReceptionPoints,
                    scoringSettings.ReceivingTwoPointConversion,
                    scoringSettings.FumbleLostPoints,
                    scoringSettings.ExtraPointPoints,
                    scoringSettings.FieldGoal0to39Points,
                    scoringSettings.FieldGoal40to49Points,
                    scoringSettings.FieldGoal50PlusPoints,
                    scoringSettings.MissedExtraPointPoints,
                    scoringSettings.MissedFieldGoalPoints,
                    scoringSettings.DefenseTouchdownPoints,
                    scoringSettings.SackPoints,
                    scoringSettings.InterceptionPoints,
                    scoringSettings.FumbleRecoveryPoints,
                    scoringSettings.SafetyPoints,
                    scoringSettings.BlockedKickPoints,
                    scoringSettings.DefensePointsAllowed0Points,
                    scoringSettings.DefensePointsAllowed1to6Points,
                    scoringSettings.DefensePointsAllowed7to13Points,
                    scoringSettings.DefensePointsAllowed14to20Points,
                    scoringSettings.DefensePointsAllowed21to27Points,
                    scoringSettings.DefensePointsAllowed28to34Points,
                    scoringSettings.DefensePointsAllowed35PlusPoints,
                    scoringSettings.BenchPoints,
                    scoringSettings.IsActive,
                    scoringSettings.CreatedAt,
                    scoringSettings.UpdatedAt
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting scoring settings for league {LeagueId}, sport {Sport}", leagueId, sport);
                return StatusCode(500, new { message = "Error retrieving scoring settings", error = ex.Message });
            }
        }

        // POST: api/scoringsettings
        [HttpPost]
        public async Task<ActionResult<object>> CreateScoringSettings(ScoringSettings scoringSettings)
        {
            try
            {
                _logger.LogInformation("Creating new scoring settings for league {LeagueId}, sport {Sport}", scoringSettings.LeagueId, scoringSettings.Sport);

                // Validate league exists
                var league = await _context.Leagues.FindAsync(scoringSettings.LeagueId);
                if (league == null)
                {
                    return NotFound(new { message = $"League with ID {scoringSettings.LeagueId} not found" });
                }

                // Check if settings already exist for this league and sport
                var existingSettings = await _context.ScoringSettings
                    .FirstOrDefaultAsync(s => s.LeagueId == scoringSettings.LeagueId && s.Sport == scoringSettings.Sport && s.IsActive);

                if (existingSettings != null)
                {
                    return Conflict(new { message = $"Scoring settings already exist for league {scoringSettings.LeagueId} and sport {scoringSettings.Sport}" });
                }

                // Set timestamps
                scoringSettings.CreatedAt = DateTime.UtcNow;
                scoringSettings.UpdatedAt = DateTime.UtcNow;

                _context.ScoringSettings.Add(scoringSettings);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created scoring settings with ID {Id}", scoringSettings.Id);

                // Return as anonymous object to avoid circular reference
                var response = new
                {
                    scoringSettings.Id,
                    scoringSettings.LeagueId,
                    scoringSettings.Sport,
                    scoringSettings.PassingYardsPerPoint,
                    scoringSettings.PassingTouchdownPoints,
                    scoringSettings.PassingInterceptionPoints,
                    scoringSettings.PassingTwoPointConversion,
                    scoringSettings.RushingYardsPerPoint,
                    scoringSettings.RushingTouchdownPoints,
                    scoringSettings.RushingTwoPointConversion,
                    scoringSettings.ReceivingYardsPerPoint,
                    scoringSettings.ReceivingTouchdownPoints,
                    scoringSettings.ReceptionPoints,
                    scoringSettings.ReceivingTwoPointConversion,
                    scoringSettings.FumbleLostPoints,
                    scoringSettings.ExtraPointPoints,
                    scoringSettings.FieldGoal0to39Points,
                    scoringSettings.FieldGoal40to49Points,
                    scoringSettings.FieldGoal50PlusPoints,
                    scoringSettings.MissedExtraPointPoints,
                    scoringSettings.MissedFieldGoalPoints,
                    scoringSettings.DefenseTouchdownPoints,
                    scoringSettings.SackPoints,
                    scoringSettings.InterceptionPoints,
                    scoringSettings.FumbleRecoveryPoints,
                    scoringSettings.SafetyPoints,
                    scoringSettings.BlockedKickPoints,
                    scoringSettings.DefensePointsAllowed0Points,
                    scoringSettings.DefensePointsAllowed1to6Points,
                    scoringSettings.DefensePointsAllowed7to13Points,
                    scoringSettings.DefensePointsAllowed14to20Points,
                    scoringSettings.DefensePointsAllowed21to27Points,
                    scoringSettings.DefensePointsAllowed28to34Points,
                    scoringSettings.DefensePointsAllowed35PlusPoints,
                    scoringSettings.BenchPoints,
                    scoringSettings.IsActive,
                    scoringSettings.CreatedAt,
                    scoringSettings.UpdatedAt
                };

                return CreatedAtAction(nameof(GetLeagueScoringSettingsBySport), 
                    new { leagueId = scoringSettings.LeagueId, sport = scoringSettings.Sport }, 
                    response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating scoring settings for league {LeagueId}", scoringSettings.LeagueId);
                return StatusCode(500, new { message = "Error creating scoring settings", error = ex.Message });
            }
        }

        // PUT: api/scoringsettings/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateScoringSettings(int id, ScoringSettings scoringSettings)
        {
            if (id != scoringSettings.Id)
            {
                return BadRequest(new { message = "ID mismatch" });
            }

            try
            {
                _logger.LogInformation("Updating scoring settings {Id} for league {LeagueId}", id, scoringSettings.LeagueId);

                var existingSettings = await _context.ScoringSettings.FindAsync(id);
                if (existingSettings == null)
                {
                    return NotFound(new { message = $"Scoring settings with ID {id} not found" });
                }

                // Update properties (excluding timestamps and ID)
                existingSettings.Sport = scoringSettings.Sport;
                existingSettings.PassingYardsPerPoint = scoringSettings.PassingYardsPerPoint;
                existingSettings.PassingTouchdownPoints = scoringSettings.PassingTouchdownPoints;
                existingSettings.PassingInterceptionPoints = scoringSettings.PassingInterceptionPoints;
                existingSettings.PassingTwoPointConversion = scoringSettings.PassingTwoPointConversion;
                existingSettings.RushingYardsPerPoint = scoringSettings.RushingYardsPerPoint;
                existingSettings.RushingTouchdownPoints = scoringSettings.RushingTouchdownPoints;
                existingSettings.RushingTwoPointConversion = scoringSettings.RushingTwoPointConversion;
                existingSettings.ReceivingYardsPerPoint = scoringSettings.ReceivingYardsPerPoint;
                existingSettings.ReceivingTouchdownPoints = scoringSettings.ReceivingTouchdownPoints;
                existingSettings.ReceptionPoints = scoringSettings.ReceptionPoints;
                existingSettings.ReceivingTwoPointConversion = scoringSettings.ReceivingTwoPointConversion;
                existingSettings.FumbleLostPoints = scoringSettings.FumbleLostPoints;
                existingSettings.ExtraPointPoints = scoringSettings.ExtraPointPoints;
                existingSettings.FieldGoal0to39Points = scoringSettings.FieldGoal0to39Points;
                existingSettings.FieldGoal40to49Points = scoringSettings.FieldGoal40to49Points;
                existingSettings.FieldGoal50PlusPoints = scoringSettings.FieldGoal50PlusPoints;
                existingSettings.MissedExtraPointPoints = scoringSettings.MissedExtraPointPoints;
                existingSettings.MissedFieldGoalPoints = scoringSettings.MissedFieldGoalPoints;
                existingSettings.DefenseTouchdownPoints = scoringSettings.DefenseTouchdownPoints;
                existingSettings.SackPoints = scoringSettings.SackPoints;
                existingSettings.InterceptionPoints = scoringSettings.InterceptionPoints;
                existingSettings.FumbleRecoveryPoints = scoringSettings.FumbleRecoveryPoints;
                existingSettings.SafetyPoints = scoringSettings.SafetyPoints;
                existingSettings.BlockedKickPoints = scoringSettings.BlockedKickPoints;
                existingSettings.DefensePointsAllowed0Points = scoringSettings.DefensePointsAllowed0Points;
                existingSettings.DefensePointsAllowed1to6Points = scoringSettings.DefensePointsAllowed1to6Points;
                existingSettings.DefensePointsAllowed7to13Points = scoringSettings.DefensePointsAllowed7to13Points;
                existingSettings.DefensePointsAllowed14to20Points = scoringSettings.DefensePointsAllowed14to20Points;
                existingSettings.DefensePointsAllowed21to27Points = scoringSettings.DefensePointsAllowed21to27Points;
                existingSettings.DefensePointsAllowed28to34Points = scoringSettings.DefensePointsAllowed28to34Points;
                existingSettings.DefensePointsAllowed35PlusPoints = scoringSettings.DefensePointsAllowed35PlusPoints;
                existingSettings.BenchPoints = scoringSettings.BenchPoints;
                existingSettings.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated scoring settings {Id}", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating scoring settings {Id}", id);
                return StatusCode(500, new { message = "Error updating scoring settings", error = ex.Message });
            }
        }

        // POST: api/scoringsettings/league/{leagueId}/initialize-defaults
        [HttpPost("league/{leagueId}/initialize-defaults")]
        public async Task<ActionResult<object>> InitializeDefaultScoringSettings(int leagueId)
        {
            try
            {
                _logger.LogInformation("Initializing default scoring settings for league {LeagueId}", leagueId);

                // Validate league exists
                var league = await _context.Leagues.FindAsync(leagueId);
                if (league == null)
                {
                    return NotFound(new { message = $"League with ID {leagueId} not found" });
                }

                // Check if NFL settings already exist
                var existingSettings = await _context.ScoringSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.LeagueId == leagueId && s.Sport == "NFL" && s.IsActive);

                if (existingSettings != null)
                {
                    _logger.LogInformation("Default NFL scoring settings already exist for league {LeagueId}", leagueId);
                    
                    // Return as anonymous object to avoid circular reference
                    var existingResponse = new
                    {
                        existingSettings.Id,
                        existingSettings.LeagueId,
                        existingSettings.Sport,
                        existingSettings.PassingYardsPerPoint,
                        existingSettings.PassingTouchdownPoints,
                        existingSettings.PassingInterceptionPoints,
                        existingSettings.PassingTwoPointConversion,
                        existingSettings.RushingYardsPerPoint,
                        existingSettings.RushingTouchdownPoints,
                        existingSettings.RushingTwoPointConversion,
                        existingSettings.ReceivingYardsPerPoint,
                        existingSettings.ReceivingTouchdownPoints,
                        existingSettings.ReceptionPoints,
                        existingSettings.ReceivingTwoPointConversion,
                        existingSettings.FumbleLostPoints,
                        existingSettings.ExtraPointPoints,
                        existingSettings.FieldGoal0to39Points,
                        existingSettings.FieldGoal40to49Points,
                        existingSettings.FieldGoal50PlusPoints,
                        existingSettings.MissedExtraPointPoints,
                        existingSettings.MissedFieldGoalPoints,
                        existingSettings.DefenseTouchdownPoints,
                        existingSettings.SackPoints,
                        existingSettings.InterceptionPoints,
                        existingSettings.FumbleRecoveryPoints,
                        existingSettings.SafetyPoints,
                        existingSettings.BlockedKickPoints,
                        existingSettings.DefensePointsAllowed0Points,
                        existingSettings.DefensePointsAllowed1to6Points,
                        existingSettings.DefensePointsAllowed7to13Points,
                        existingSettings.DefensePointsAllowed14to20Points,
                        existingSettings.DefensePointsAllowed21to27Points,
                        existingSettings.DefensePointsAllowed28to34Points,
                        existingSettings.DefensePointsAllowed35PlusPoints,
                        existingSettings.BenchPoints,
                        existingSettings.IsActive,
                        existingSettings.CreatedAt,
                        existingSettings.UpdatedAt
                    };
                    
                    return Ok(existingResponse);
                }

                // Create Yahoo default NFL settings
                var defaultSettings = ScoringSettings.GetYahooDefaults(leagueId);
                
                _context.ScoringSettings.Add(defaultSettings);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully initialized default NFL scoring settings for league {LeagueId} with ID {Id}", leagueId, defaultSettings.Id);

                // Return the settings without navigation properties to avoid circular reference
                var response = new
                {
                    defaultSettings.Id,
                    defaultSettings.LeagueId,
                    defaultSettings.Sport,
                    defaultSettings.PassingYardsPerPoint,
                    defaultSettings.PassingTouchdownPoints,
                    defaultSettings.PassingInterceptionPoints,
                    defaultSettings.PassingTwoPointConversion,
                    defaultSettings.RushingYardsPerPoint,
                    defaultSettings.RushingTouchdownPoints,
                    defaultSettings.RushingTwoPointConversion,
                    defaultSettings.ReceivingYardsPerPoint,
                    defaultSettings.ReceivingTouchdownPoints,
                    defaultSettings.ReceptionPoints,
                    defaultSettings.ReceivingTwoPointConversion,
                    defaultSettings.FumbleLostPoints,
                    defaultSettings.ExtraPointPoints,
                    defaultSettings.FieldGoal0to39Points,
                    defaultSettings.FieldGoal40to49Points,
                    defaultSettings.FieldGoal50PlusPoints,
                    defaultSettings.MissedExtraPointPoints,
                    defaultSettings.MissedFieldGoalPoints,
                    defaultSettings.DefenseTouchdownPoints,
                    defaultSettings.SackPoints,
                    defaultSettings.InterceptionPoints,
                    defaultSettings.FumbleRecoveryPoints,
                    defaultSettings.SafetyPoints,
                    defaultSettings.BlockedKickPoints,
                    defaultSettings.DefensePointsAllowed0Points,
                    defaultSettings.DefensePointsAllowed1to6Points,
                    defaultSettings.DefensePointsAllowed7to13Points,
                    defaultSettings.DefensePointsAllowed14to20Points,
                    defaultSettings.DefensePointsAllowed21to27Points,
                    defaultSettings.DefensePointsAllowed28to34Points,
                    defaultSettings.DefensePointsAllowed35PlusPoints,
                    defaultSettings.BenchPoints,
                    defaultSettings.IsActive,
                    defaultSettings.CreatedAt,
                    defaultSettings.UpdatedAt
                };

                return Created($"/api/scoringsettings/league/{leagueId}/sport/{defaultSettings.Sport}", response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initializing default scoring settings for league {LeagueId}", leagueId);
                return StatusCode(500, new { message = "Error initializing default scoring settings", error = ex.Message });
            }
        }

        // GET: api/scoringsettings/presets/{sport}
        [HttpGet("presets/{sport}")]
        public ActionResult<object> GetScoringPresets(string sport)
        {
            try
            {
                _logger.LogInformation("Getting scoring presets for sport {Sport}", sport);

                if (sport.ToUpper() != "NFL")
                {
                    return BadRequest(new { message = "Only NFL presets are currently available" });
                }

                var presets = new
                {
                    sport = "NFL",
                    presets = new[]
                    {
                        new
                        {
                            name = "Yahoo Half-PPR (Default)",
                            description = "Yahoo Fantasy Football default scoring with half-point per reception",
                            settings = ScoringSettings.GetYahooDefaults(0) // Temporary league ID
                        },
                        new
                        {
                            name = "Full PPR",
                            description = "Full point per reception scoring system",
                            settings = CreateFullPPRPreset()
                        },
                        new
                        {
                            name = "Standard (No PPR)",
                            description = "Traditional fantasy football scoring with no points per reception",
                            settings = CreateStandardPreset()
                        }
                    }
                };

                return Ok(presets);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting scoring presets for sport {Sport}", sport);
                return StatusCode(500, new { message = "Error retrieving scoring presets", error = ex.Message });
            }
        }

        private ScoringSettings CreateFullPPRPreset()
        {
            var settings = ScoringSettings.GetYahooDefaults(0);
            settings.ReceptionPoints = 1.0m; // Full PPR
            return settings;
        }

        private ScoringSettings CreateStandardPreset()
        {
            var settings = ScoringSettings.GetYahooDefaults(0);
            settings.ReceptionPoints = 0.0m; // No PPR
            return settings;
        }

        // DELETE: api/scoringsettings/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteScoringSettings(int id)
        {
            try
            {
                var scoringSettings = await _context.ScoringSettings.FindAsync(id);
                if (scoringSettings == null)
                {
                    return NotFound(new { message = $"Scoring settings with ID {id} not found" });
                }

                // Soft delete by marking as inactive
                scoringSettings.IsActive = false;
                scoringSettings.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully deleted scoring settings {Id}", id);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting scoring settings {Id}", id);
                return StatusCode(500, new { message = "Error deleting scoring settings", error = ex.Message });
            }
        }
    }
}