using Microsoft.AspNetCore.Mvc;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScheduleController : ControllerBase
    {
        private readonly ScheduleService _scheduleService;

        public ScheduleController(ScheduleService scheduleService)
        {
            _scheduleService = scheduleService;
        }

        [HttpGet("league/{leagueId}/sport/{sport}/year/{year}")]
        public async Task<ActionResult<SeasonResponseDto>> GetSchedule(int leagueId, string sport, int year)
        {
            try
            {
                var season = await _scheduleService.GetScheduleAsync(leagueId, sport, year);
                
                if (season == null)
                {
                    // Generate new schedule if it doesn't exist
                    season = await _scheduleService.GenerateScheduleAsync(leagueId, sport, year);
                }

                var response = new SeasonResponseDto
                {
                    League = sport,
                    Season = year,
                    Weeks = season.Weeks.OrderBy(w => w.WeekNumber).Select(w => new WeekResponseDto
                    {
                        Week = w.WeekNumber,
                        StartDate = w.StartDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        EndDate = w.EndDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        Matchups = w.Matchups.Select(m => new MatchupResponseDto
                        {
                            Id = $"{sport.ToLower()}-{w.WeekNumber}-{m.HomeTeamId}-{m.AwayTeamId}",
                            Week = w.WeekNumber,
                            HomeTeamId = m.HomeTeamId,
                            AwayTeamId = m.AwayTeamId,
                            HomeTeamName = $"{m.HomeTeam.FirstName} {m.HomeTeam.LastName}",
                            AwayTeamName = $"{m.AwayTeam.FirstName} {m.AwayTeam.LastName}",
                            Date = m.ScheduledDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                            League = sport,
                            Status = m.Status,
                            HomeScore = m.HomeScore,
                            AwayScore = m.AwayScore
                        }).ToList()
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("league/{leagueId}/sport/{sport}/year/{year}/generate")]
        public async Task<ActionResult<SeasonResponseDto>> GenerateSchedule(int leagueId, string sport, int year)
        {
            try
            {
                var season = await _scheduleService.GenerateScheduleAsync(leagueId, sport, year);

                var response = new SeasonResponseDto
                {
                    League = sport,
                    Season = year,
                    Weeks = season.Weeks.OrderBy(w => w.WeekNumber).Select(w => new WeekResponseDto
                    {
                        Week = w.WeekNumber,
                        StartDate = w.StartDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        EndDate = w.EndDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        Matchups = w.Matchups.Select(m => new MatchupResponseDto
                        {
                            Id = $"{sport.ToLower()}-{w.WeekNumber}-{m.HomeTeamId}-{m.AwayTeamId}",
                            Week = w.WeekNumber,
                            HomeTeamId = m.HomeTeamId,
                            AwayTeamId = m.AwayTeamId,
                            HomeTeamName = $"{m.HomeTeam.FirstName} {m.HomeTeam.LastName}",
                            AwayTeamName = $"{m.AwayTeam.FirstName} {m.AwayTeam.LastName}",
                            Date = m.ScheduledDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                            League = sport,
                            Status = m.Status,
                            HomeScore = m.HomeScore,
                            AwayScore = m.AwayScore
                        }).ToList()
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("league/{leagueId}/sport/{sport}/year/{year}/regenerate")]
        public async Task<ActionResult<SeasonResponseDto>> RegenerateSchedule(int leagueId, string sport, int year)
        {
            try
            {
                var season = await _scheduleService.RegenerateScheduleForMembershipChangeAsync(leagueId, sport, year);
                
                if (season == null)
                {
                    return BadRequest(new { message = "Unable to regenerate schedule. League may not have enough members or an even number of members." });
                }

                var response = new SeasonResponseDto
                {
                    League = sport,
                    Season = year,
                    Weeks = season.Weeks.OrderBy(w => w.WeekNumber).Select(w => new WeekResponseDto
                    {
                        Week = w.WeekNumber,
                        StartDate = w.StartDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        EndDate = w.EndDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        Matchups = w.Matchups.Select(m => new MatchupResponseDto
                        {
                            Id = $"{sport.ToLower()}-{w.WeekNumber}-{m.HomeTeamId}-{m.AwayTeamId}",
                            Week = w.WeekNumber,
                            HomeTeamId = m.HomeTeamId,
                            AwayTeamId = m.AwayTeamId,
                            HomeTeamName = $"{m.HomeTeam.FirstName} {m.HomeTeam.LastName}",
                            AwayTeamName = $"{m.AwayTeam.FirstName} {m.AwayTeam.LastName}",
                            Date = m.ScheduledDate.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                            League = sport,
                            Status = m.Status,
                            HomeScore = m.HomeScore,
                            AwayScore = m.AwayScore
                        }).ToList()
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    // DTOs for API responses
    public class SeasonResponseDto
    {
        public string League { get; set; } = string.Empty;
        public int Season { get; set; }
        public List<WeekResponseDto> Weeks { get; set; } = new();
    }

    public class WeekResponseDto
    {
        public int Week { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string EndDate { get; set; } = string.Empty;
        public List<MatchupResponseDto> Matchups { get; set; } = new();
    }

    public class MatchupResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public int Week { get; set; }
        public int HomeTeamId { get; set; }
        public int AwayTeamId { get; set; }
        public string HomeTeamName { get; set; } = string.Empty;
        public string AwayTeamName { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string League { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? HomeScore { get; set; }
        public int? AwayScore { get; set; }
    }
}