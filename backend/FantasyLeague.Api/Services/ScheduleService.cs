using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FantasyLeague.Api.Services
{
    public class ScheduleService
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<ScheduleService> _logger;

        public ScheduleService(FantasyLeagueContext context, ILogger<ScheduleService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<Season> GenerateScheduleAsync(int leagueId, string sport, int year)
        {
            // Check if schedule already exists
            var existingSeason = await _context.Seasons
                .Include(s => s.Weeks)
                .ThenInclude(w => w.Matchups)
                .FirstOrDefaultAsync(s => s.LeagueId == leagueId && s.Sport == sport && s.Year == year);

            if (existingSeason != null)
            {
                return existingSeason;
            }

            // Get league members
            var leagueMembers = await _context.Users
                .Where(u => u.LeagueId == leagueId)
                .OrderBy(u => u.Id)
                .ToListAsync();

            _logger.LogInformation($"Found {leagueMembers.Count} league members for league {leagueId}");
            foreach (var member in leagueMembers)
            {
                _logger.LogInformation($"Team: ID={member.Id}, Name={member.FirstName} {member.LastName}");
            }

            if (leagueMembers.Count < 2)
            {
                throw new InvalidOperationException("Need at least 2 teams to generate a schedule");
            }

            // Create season
            var (startDate, endDate, totalWeeks) = GetSeasonDates(sport, year);
            var season = new Season
            {
                LeagueId = leagueId,
                Sport = sport,
                Year = year,
                StartDate = startDate,
                EndDate = endDate,
                IsActive = true
            };

            _context.Seasons.Add(season);
            await _context.SaveChangesAsync();

            // Generate round-robin schedule
            var roundRobinMatches = GenerateRoundRobinSchedule(leagueMembers);
            
            // Create weeks and matchups
            var currentDate = startDate;
            for (int weekNumber = 1; weekNumber <= totalWeeks; weekNumber++)
            {
                var weekStart = currentDate;
                var weekEnd = currentDate.AddDays(6);

                var week = new Week
                {
                    SeasonId = season.Id,
                    WeekNumber = weekNumber,
                    StartDate = weekStart,
                    EndDate = weekEnd
                };

                _context.Weeks.Add(week);
                await _context.SaveChangesAsync();

                // Get matches for this week (cycle through round-robin)
                var roundIndex = (weekNumber - 1) % roundRobinMatches.Count;
                var roundMatches = roundRobinMatches[roundIndex];

                foreach (var match in roundMatches)
                {
                    var gameDate = GetGameDate(sport, weekStart);
                    
                    var matchup = new Matchup
                    {
                        WeekId = week.Id,
                        HomeTeamId = match.HomeTeamId,
                        AwayTeamId = match.AwayTeamId,
                        ScheduledDate = gameDate,
                        Status = "upcoming"
                    };

                    _context.Matchups.Add(matchup);
                }

                await _context.SaveChangesAsync();
                currentDate = currentDate.AddDays(7);
            }

            // Return the complete season with all relationships
            return await _context.Seasons
                .Include(s => s.Weeks)
                .ThenInclude(w => w.Matchups)
                .ThenInclude(m => m.HomeTeam)
                .Include(s => s.Weeks)
                .ThenInclude(w => w.Matchups)
                .ThenInclude(m => m.AwayTeam)
                .FirstAsync(s => s.Id == season.Id);
        }

        public async Task<Season?> GetScheduleAsync(int leagueId, string sport, int year)
        {
            return await _context.Seasons
                .Include(s => s.Weeks)
                .ThenInclude(w => w.Matchups)
                .ThenInclude(m => m.HomeTeam)
                .Include(s => s.Weeks)
                .ThenInclude(w => w.Matchups)
                .ThenInclude(m => m.AwayTeam)
                .FirstOrDefaultAsync(s => s.LeagueId == leagueId && s.Sport == sport && s.Year == year);
        }

        private List<List<(int HomeTeamId, int AwayTeamId)>> GenerateRoundRobinSchedule(List<User> teams)
        {
            var rounds = new List<List<(int HomeTeamId, int AwayTeamId)>>();
            var teamIds = teams.Select(t => t.Id).ToList();
            
            int numTeams = teamIds.Count;
            
            // For debugging - verify all teams are included
            _logger.LogInformation($"Generating round-robin schedule for {teams.Count} teams");
            for (int i = 0; i < teams.Count; i++)
            {
                _logger.LogInformation($"Team {i}: ID={teams[i].Id}, Name={teams[i].FirstName} {teams[i].LastName}");
            }
            
            if (numTeams < 2)
            {
                return rounds;
            }

            // Standard round-robin algorithm: each team plays every other team once
            // With n teams, we need n-1 rounds
            for (int round = 0; round < numTeams - 1; round++)
            {
                var roundMatches = new List<(int HomeTeamId, int AwayTeamId)>();
                
                // Create a rotated list for this round
                // Team at index 0 stays fixed, others rotate
                var rotatedTeams = new List<int> { teamIds[0] };
                for (int i = 1; i < numTeams; i++)
                {
                    int rotatedIndex = ((i + round - 1) % (numTeams - 1)) + 1;
                    rotatedTeams.Add(teamIds[rotatedIndex]);
                }
                
                // Pair teams: first with last, second with second-to-last, etc.
                for (int i = 0; i < numTeams / 2; i++)
                {
                    int homeTeam = rotatedTeams[i];
                    int awayTeam = rotatedTeams[numTeams - 1 - i];
                    
                    roundMatches.Add((homeTeam, awayTeam));
                    _logger.LogInformation($"Round {round + 1}, Match {i + 1}: Team {homeTeam} vs Team {awayTeam}");
                }
                
                rounds.Add(roundMatches);
            }
            
            _logger.LogInformation($"Total rounds generated: {rounds.Count}, Total matches: {rounds.Sum(r => r.Count)}");
            return rounds;
        }

        private (DateTime startDate, DateTime endDate, int totalWeeks) GetSeasonDates(string sport, int year)
        {
            return sport.ToUpper() switch
            {
                "NFL" => (DateTime.SpecifyKind(new DateTime(year, 9, 1), DateTimeKind.Utc), DateTime.SpecifyKind(new DateTime(year, 12, 29), DateTimeKind.Utc), 17),
                "NBA" => (DateTime.SpecifyKind(new DateTime(year, 10, 15), DateTimeKind.Utc), DateTime.SpecifyKind(new DateTime(year + 1, 4, 15), DateTimeKind.Utc), 26),
                "MLB" => (DateTime.SpecifyKind(new DateTime(year, 4, 1), DateTimeKind.Utc), DateTime.SpecifyKind(new DateTime(year, 9, 30), DateTimeKind.Utc), 26),
                _ => throw new ArgumentException($"Unknown sport: {sport}")
            };
        }

        private DateTime GetGameDate(string sport, DateTime weekStart)
        {
            var gameDate = sport.ToUpper() switch
            {
                "NFL" => weekStart.AddDays(6), // Sunday
                "NBA" => weekStart.AddDays(2), // Wednesday
                "MLB" => weekStart.AddDays(1), // Tuesday
                _ => weekStart.AddDays(6) // Default to Sunday
            };
            return DateTime.SpecifyKind(gameDate, DateTimeKind.Utc);
        }
    }
}