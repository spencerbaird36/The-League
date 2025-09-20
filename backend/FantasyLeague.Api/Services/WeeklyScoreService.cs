using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FantasyLeague.Api.Services
{
    public class WeeklyScoreService
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<WeeklyScoreService> _logger;

        public WeeklyScoreService(FantasyLeagueContext context, ILogger<WeeklyScoreService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Calculates the correct scoring period for a given sport
        /// NFL: Thursday to Monday night (finalized Tuesday 12:30 AM EST)
        /// MLB/NBA: Monday to Sunday night (finalized Monday 12:30 AM EST)
        /// </summary>
        public (DateTime startDate, DateTime endDate) GetScoringPeriod(string sport, DateTime baseDate)
        {
            var estTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");

            return sport.ToUpper() switch
            {
                "NFL" => GetNflScoringPeriod(baseDate, estTimeZone),
                "MLB" or "NBA" => GetMlbNbaScoringPeriod(baseDate, estTimeZone),
                _ => throw new ArgumentException($"Unknown sport: {sport}")
            };
        }

        /// <summary>
        /// Gets the next finalization time for matchups
        /// NFL: Tuesday 12:30 AM EST after Monday Night Football
        /// MLB/NBA: Monday 12:30 AM EST after Sunday games
        /// </summary>
        public DateTime GetNextFinalizationTime(string sport, DateTime currentTime)
        {
            var estTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
            var estTime = TimeZoneInfo.ConvertTimeFromUtc(currentTime, estTimeZone);

            return sport.ToUpper() switch
            {
                "NFL" => GetNflFinalizationTime(estTime, estTimeZone),
                "MLB" or "NBA" => GetMlbNbaFinalizationTime(estTime, estTimeZone),
                _ => throw new ArgumentException($"Unknown sport: {sport}")
            };
        }

        /// <summary>
        /// Finalizes all matchups for a given week and updates standings
        /// </summary>
        public async Task FinalizeWeeklyMatchupsAsync(int leagueId, string sport, int weekNumber)
        {
            try
            {
                _logger.LogInformation($"Starting weekly matchup finalization for League {leagueId}, Sport {sport}, Week {weekNumber}");

                // Get the current season for this sport
                var currentYear = DateTime.Now.Year;
                var season = await _context.Seasons
                    .Include(s => s.Weeks)
                    .ThenInclude(w => w.Matchups)
                    .ThenInclude(m => m.HomeTeam)
                    .Include(s => s.Weeks)
                    .ThenInclude(w => w.Matchups)
                    .ThenInclude(m => m.AwayTeam)
                    .FirstOrDefaultAsync(s => s.LeagueId == leagueId && s.Sport == sport && s.Year == currentYear);

                if (season == null)
                {
                    _logger.LogWarning($"No season found for League {leagueId}, Sport {sport}, Year {currentYear}");
                    return;
                }

                // Find the specific week
                var week = season.Weeks.FirstOrDefault(w => w.WeekNumber == weekNumber);
                if (week == null)
                {
                    _logger.LogWarning($"No week {weekNumber} found for League {leagueId}, Sport {sport}");
                    return;
                }

                // Get matchups that aren't already completed
                var matchupsToFinalize = week.Matchups.Where(m => m.Status != "completed").ToList();

                if (!matchupsToFinalize.Any())
                {
                    _logger.LogInformation($"No matchups to finalize for League {leagueId}, Sport {sport}, Week {weekNumber}");
                    return;
                }

                // Calculate scores for each matchup
                foreach (var matchup in matchupsToFinalize)
                {
                    var (homeScore, awayScore) = await CalculateMatchupScoreAsync(matchup, week);

                    matchup.HomeScore = homeScore;
                    matchup.AwayScore = awayScore;
                    matchup.Status = "completed";
                    matchup.CompletedAt = DateTime.UtcNow;

                    _logger.LogInformation($"Finalized matchup {matchup.Id}: {matchup.HomeTeam.FirstName} {matchup.HomeTeam.LastName} ({homeScore}) vs {matchup.AwayTeam.FirstName} {matchup.AwayTeam.LastName} ({awayScore})");
                }

                await _context.SaveChangesAsync();

                // Update league standings
                await UpdateLeagueStandingsAsync(leagueId, sport);

                _logger.LogInformation($"Successfully finalized {matchupsToFinalize.Count} matchups for League {leagueId}, Sport {sport}, Week {weekNumber}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error finalizing weekly matchups for League {leagueId}, Sport {sport}, Week {weekNumber}");
                throw;
            }
        }

        /// <summary>
        /// Checks if it's time to finalize matchups for any active leagues
        /// </summary>
        public async Task<List<(int LeagueId, string Sport, int WeekNumber)>> GetMatchupsReadyForFinalizationAsync()
        {
            var readyMatchups = new List<(int LeagueId, string Sport, int WeekNumber)>();
            var currentTime = DateTime.UtcNow;

            // Get all active seasons
            var activeSeasons = await _context.Seasons
                .Include(s => s.Weeks)
                .ThenInclude(w => w.Matchups)
                .Where(s => s.IsActive)
                .ToListAsync();

            foreach (var season in activeSeasons)
            {
                var finalizationTime = GetNextFinalizationTime(season.Sport, currentTime);

                // Check if current time is past the finalization time
                if (currentTime >= finalizationTime)
                {
                    // Find the current week that should be finalized
                    var currentWeek = GetCurrentWeekForFinalization(season, currentTime);
                    if (currentWeek != null && currentWeek.Matchups.Any(m => m.Status != "completed"))
                    {
                        readyMatchups.Add((season.LeagueId, season.Sport, currentWeek.WeekNumber));
                    }
                }
            }

            return readyMatchups;
        }

        private (DateTime startDate, DateTime endDate) GetNflScoringPeriod(DateTime baseDate, TimeZoneInfo estTimeZone)
        {
            // NFL scoring period: Thursday to Monday night
            // Find the Thursday of the current week
            var dayOfWeek = (int)baseDate.DayOfWeek;
            var daysToThursday = ((int)DayOfWeek.Thursday - dayOfWeek + 7) % 7;
            if (dayOfWeek < (int)DayOfWeek.Thursday) daysToThursday -= 7;

            var thursday = baseDate.AddDays(daysToThursday);
            var mondayNight = thursday.AddDays(4); // Monday after Thursday

            // Set times in EST
            var startDate = new DateTime(thursday.Year, thursday.Month, thursday.Day, 20, 0, 0); // 8:00 PM EST Thursday
            var endDate = new DateTime(mondayNight.Year, mondayNight.Month, mondayNight.Day, 23, 59, 59); // 11:59 PM EST Monday

            // Convert to UTC
            return (
                TimeZoneInfo.ConvertTimeToUtc(startDate, estTimeZone),
                TimeZoneInfo.ConvertTimeToUtc(endDate, estTimeZone)
            );
        }

        private (DateTime startDate, DateTime endDate) GetMlbNbaScoringPeriod(DateTime baseDate, TimeZoneInfo estTimeZone)
        {
            // MLB/NBA scoring period: Monday to Sunday night
            var dayOfWeek = (int)baseDate.DayOfWeek;
            var daysToMonday = ((int)DayOfWeek.Monday - dayOfWeek + 7) % 7;
            if (dayOfWeek != (int)DayOfWeek.Sunday) daysToMonday -= 7;

            var monday = baseDate.AddDays(daysToMonday);
            var sunday = monday.AddDays(6);

            // Set times in EST
            var startDate = new DateTime(monday.Year, monday.Month, monday.Day, 0, 0, 0); // 12:00 AM EST Monday
            var endDate = new DateTime(sunday.Year, sunday.Month, sunday.Day, 23, 59, 59); // 11:59 PM EST Sunday

            // Convert to UTC
            return (
                TimeZoneInfo.ConvertTimeToUtc(startDate, estTimeZone),
                TimeZoneInfo.ConvertTimeToUtc(endDate, estTimeZone)
            );
        }

        private DateTime GetNflFinalizationTime(DateTime estTime, TimeZoneInfo estTimeZone)
        {
            // NFL finalizes on Tuesday 12:30 AM EST after Monday Night Football
            var dayOfWeek = (int)estTime.DayOfWeek;
            var daysToTuesday = ((int)DayOfWeek.Tuesday - dayOfWeek + 7) % 7;
            if (dayOfWeek >= (int)DayOfWeek.Tuesday && estTime.Hour >= 0 && estTime.Minute >= 30)
                daysToTuesday = 7; // Next Tuesday if we've already passed this week's finalization

            var tuesday = estTime.Date.AddDays(daysToTuesday);
            var finalizationTime = new DateTime(tuesday.Year, tuesday.Month, tuesday.Day, 0, 30, 0); // 12:30 AM EST

            return TimeZoneInfo.ConvertTimeToUtc(finalizationTime, estTimeZone);
        }

        private DateTime GetMlbNbaFinalizationTime(DateTime estTime, TimeZoneInfo estTimeZone)
        {
            // MLB/NBA finalizes on Monday 12:30 AM EST after Sunday games
            var dayOfWeek = (int)estTime.DayOfWeek;
            var daysToMonday = ((int)DayOfWeek.Monday - dayOfWeek + 7) % 7;
            if (dayOfWeek >= (int)DayOfWeek.Monday && estTime.Hour >= 0 && estTime.Minute >= 30)
                daysToMonday = 7; // Next Monday if we've already passed this week's finalization

            var monday = estTime.Date.AddDays(daysToMonday);
            var finalizationTime = new DateTime(monday.Year, monday.Month, monday.Day, 0, 30, 0); // 12:30 AM EST

            return TimeZoneInfo.ConvertTimeToUtc(finalizationTime, estTimeZone);
        }

        private async Task<(int homeScore, int awayScore)> CalculateMatchupScoreAsync(Matchup matchup, Week week)
        {
            // TODO: Implement actual scoring calculation based on player stats
            // For now, return 0-0 as specified in requirements

            // This is where you would:
            // 1. Get all players on home team roster for this week
            // 2. Get all players on away team roster for this week
            // 3. Calculate fantasy points based on player stats during scoring period
            // 4. Sum up total points for each team

            return (0, 0);
        }

        private async Task UpdateLeagueStandingsAsync(int leagueId, string sport)
        {
            try
            {
                _logger.LogInformation($"Starting standings update for League {leagueId}, Sport {sport}");

                // Get all completed matchups for this league and sport
                var currentYear = DateTime.Now.Year;
                var season = await _context.Seasons
                    .Include(s => s.Weeks)
                    .ThenInclude(w => w.Matchups)
                    .ThenInclude(m => m.HomeTeam)
                    .Include(s => s.Weeks)
                    .ThenInclude(w => w.Matchups)
                    .ThenInclude(m => m.AwayTeam)
                    .FirstOrDefaultAsync(s => s.LeagueId == leagueId && s.Sport == sport && s.Year == currentYear);

                if (season == null)
                {
                    _logger.LogWarning($"No season found for standings update: League {leagueId}, Sport {sport}");
                    return;
                }

                // Get all completed matchups for the season
                var completedMatchups = season.Weeks
                    .SelectMany(w => w.Matchups)
                    .Where(m => m.Status == "completed")
                    .ToList();

                // Calculate standings for each team
                var teamStandings = new Dictionary<int, (int wins, int losses, int ties, int pointsFor, int pointsAgainst)>();

                // Get all teams in this league for this sport
                var teams = await _context.Users
                    .Where(u => u.LeagueId == leagueId)
                    .ToListAsync();

                // Initialize standings for all teams
                foreach (var team in teams)
                {
                    teamStandings[team.Id] = (0, 0, 0, 0, 0);
                }

                // Process each completed matchup
                foreach (var matchup in completedMatchups)
                {
                    var homeTeamId = matchup.HomeTeamId;
                    var awayTeamId = matchup.AwayTeamId;
                    var homeScore = matchup.HomeScore ?? 0;
                    var awayScore = matchup.AwayScore ?? 0;

                    // Update home team stats
                    if (teamStandings.ContainsKey(homeTeamId))
                    {
                        var homeStats = teamStandings[homeTeamId];
                        homeStats.pointsFor += homeScore;
                        homeStats.pointsAgainst += awayScore;

                        if (homeScore > awayScore)
                            homeStats.wins++;
                        else if (homeScore < awayScore)
                            homeStats.losses++;
                        else
                            homeStats.ties++;

                        teamStandings[homeTeamId] = homeStats;
                    }

                    // Update away team stats
                    if (teamStandings.ContainsKey(awayTeamId))
                    {
                        var awayStats = teamStandings[awayTeamId];
                        awayStats.pointsFor += awayScore;
                        awayStats.pointsAgainst += homeScore;

                        if (awayScore > homeScore)
                            awayStats.wins++;
                        else if (awayScore < homeScore)
                            awayStats.losses++;
                        else
                            awayStats.ties++;

                        teamStandings[awayTeamId] = awayStats;
                    }
                }

                // Update or create standings records in database using TeamStats
                foreach (var (teamId, stats) in teamStandings)
                {
                    var existing = await _context.TeamStats
                        .FirstOrDefaultAsync(ts => ts.LeagueId == leagueId && ts.UserId == teamId);

                    if (existing != null)
                    {
                        // Update existing TeamStats record
                        existing.Wins = stats.wins;
                        existing.Losses = stats.losses;
                        existing.Ties = stats.ties;
                        existing.PointsFor = stats.pointsFor;
                        existing.PointsAgainst = stats.pointsAgainst;
                        existing.LastUpdated = DateTime.UtcNow;
                    }
                    else
                    {
                        // Create new TeamStats record
                        var newTeamStats = new TeamStats
                        {
                            LeagueId = leagueId,
                            UserId = teamId,
                            Wins = stats.wins,
                            Losses = stats.losses,
                            Ties = stats.ties,
                            PointsFor = stats.pointsFor,
                            PointsAgainst = stats.pointsAgainst,
                            LastUpdated = DateTime.UtcNow
                        };
                        _context.TeamStats.Add(newTeamStats);
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation($"Successfully updated standings for League {leagueId}, Sport {sport}. Processed {completedMatchups.Count} matchups for {teamStandings.Count} teams");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating standings for League {leagueId}, Sport {sport}");
                throw;
            }
        }

        private Week? GetCurrentWeekForFinalization(Season season, DateTime currentTime)
        {
            // Find the week that should be finalized based on current time
            foreach (var week in season.Weeks.OrderBy(w => w.WeekNumber))
            {
                var (startDate, endDate) = GetScoringPeriod(season.Sport, week.StartDate);
                var finalizationTime = GetNextFinalizationTime(season.Sport, endDate.AddDays(1));

                if (currentTime >= finalizationTime && week.Matchups.Any(m => m.Status != "completed"))
                {
                    return week;
                }
            }

            return null;
        }
    }
}