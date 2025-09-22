using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FantasyLeague.Api.Services
{
    public interface IEspnSportsDataService
    {
        Task<SportsDataSyncResult> SyncNflGamesAsync();
        Task<SportsDataSyncResult> SyncNbaGamesAsync();
        Task<SportsDataSyncResult> SyncMlbGamesAsync();
        Task<List<GameDataDto>> GetUpcomingGamesAsync(string sport, int days = 7);
        Task<SportsDataSyncResult> UpdateGameScoresAsync(string sport);
    }

    public class EspnSportsDataService : IEspnSportsDataService
    {
        private readonly FantasyLeagueContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<EspnSportsDataService> _logger;

        // ESPN API endpoints
        private const string ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports";
        private const string NFL_SCOREBOARD = "football/nfl/scoreboard";
        private const string NBA_SCOREBOARD = "basketball/nba/scoreboard";
        private const string MLB_SCOREBOARD = "baseball/mlb/scoreboard";

        // Sport identifiers
        private const string NFL_SPORT = "NFL";
        private const string NBA_SPORT = "NBA";
        private const string MLB_SPORT = "MLB";

        public EspnSportsDataService(
            FantasyLeagueContext context,
            HttpClient httpClient,
            ILogger<EspnSportsDataService> logger)
        {
            _context = context;
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<SportsDataSyncResult> SyncNflGamesAsync()
        {
            return await SyncSportGamesAsync(NFL_SPORT, NFL_SCOREBOARD);
        }

        public async Task<SportsDataSyncResult> SyncNbaGamesAsync()
        {
            return await SyncSportGamesAsync(NBA_SPORT, NBA_SCOREBOARD);
        }

        public async Task<SportsDataSyncResult> SyncMlbGamesAsync()
        {
            return await SyncSportGamesAsync(MLB_SPORT, MLB_SCOREBOARD);
        }

        public async Task<List<GameDataDto>> GetUpcomingGamesAsync(string sport, int days = 7)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(days);
            var startDate = DateTime.UtcNow.AddDays(-1); // Include games from the last day

            // Debug: Log current filter criteria
            _logger.LogInformation("GetUpcomingGamesAsync - Sport: {Sport}, StartDate: {StartDate}, CutoffDate: {CutoffDate}", sport, startDate, cutoffDate);

            var allGames = await _context.GameBets
                .Where(g => g.Sport == sport)
                .ToListAsync();

            _logger.LogInformation("Found {Count} total games for {Sport}", allGames.Count, sport);

            foreach (var game in allGames)
            {
                _logger.LogInformation("Game: {Game} - DateTime: {DateTime}, Status: {Status}",
                    $"{game.AwayTeam} vs {game.HomeTeam}", game.GameDateTime, game.GameStatus);
            }

            return await _context.GameBets
                .Where(g => g.Sport == sport &&
                           g.GameDateTime >= startDate &&
                           g.GameDateTime <= cutoffDate)
                .Select(g => new GameDataDto
                {
                    ExternalGameId = g.ExternalGameId,
                    Sport = g.Sport,
                    HomeTeam = g.HomeTeam,
                    AwayTeam = g.AwayTeam,
                    GameDateTime = g.GameDateTime,
                    Week = g.Week,
                    Season = g.Season,
                    PointSpread = g.PointSpread,
                    OverUnderLine = g.OverUnderLine,
                    HomeMoneylineOdds = g.HomeMoneylineOdds,
                    AwayMoneylineOdds = g.AwayMoneylineOdds,
                    OverOdds = g.OverOdds,
                    UnderOdds = g.UnderOdds,
                    HomeScore = g.HomeScore,
                    AwayScore = g.AwayScore,
                    GameStatus = g.GameStatus.ToString()
                })
                .OrderBy(g => g.GameDateTime)
                .ToListAsync();
        }

        public async Task<SportsDataSyncResult> UpdateGameScoresAsync(string sport)
        {
            var endpoint = sport.ToUpper() switch
            {
                NFL_SPORT => NFL_SCOREBOARD,
                NBA_SPORT => NBA_SCOREBOARD,
                MLB_SPORT => MLB_SCOREBOARD,
                _ => throw new ArgumentException($"Unsupported sport: {sport}")
            };

            return await SyncSportGamesAsync(sport, endpoint, scoresOnly: true);
        }

        private async Task<SportsDataSyncResult> SyncSportGamesAsync(string sport, string endpoint, bool scoresOnly = false)
        {
            var result = new SportsDataSyncResult { Success = true };

            try
            {
                _logger.LogInformation("Starting {Sport} game sync from ESPN API...", sport);

                // Build ESPN API URL
                var apiUrl = $"{ESPN_BASE_URL}/{endpoint}";

                // Get response from ESPN
                var response = await _httpClient.GetAsync(apiUrl);
                if (!response.IsSuccessStatusCode)
                {
                    var error = $"ESPN API request failed with status: {response.StatusCode}";
                    _logger.LogError(error);
                    result.Success = false;
                    result.Message = error;
                    return result;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var espnResponse = JsonSerializer.Deserialize<EspnScoreboardResponse>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (espnResponse?.Events == null)
                {
                    result.Success = false;
                    result.Message = "No events found in ESPN response";
                    return result;
                }

                // Process each game with transaction isolation
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    foreach (var espnEvent in espnResponse.Events)
                    {
                        try
                        {
                            var gameData = ConvertEspnEventToGameData(espnEvent, sport);
                            if (gameData == null)
                            {
                                continue;
                            }

                            await ProcessGameDataAsync(gameData, scoresOnly);
                            result.GamesProcessed++;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing ESPN event {EventId}", espnEvent.Id);
                            result.Errors.Add($"Event {espnEvent.Id}: {ex.Message}");
                        }
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }

                result.Message = $"Successfully synced {result.GamesProcessed} {sport} games";
                _logger.LogInformation("Completed {Sport} sync: {GamesProcessed} games processed",
                    sport, result.GamesProcessed);

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing {Sport} games from ESPN", sport);
                result.Success = false;
                result.Message = $"Error syncing {sport} games: {ex.Message}";
            }

            return result;
        }

        private GameDataDto? ConvertEspnEventToGameData(EspnEvent espnEvent, string sport)
        {
            if (espnEvent.Competitions?.FirstOrDefault() is not EspnCompetition competition)
                return null;

            if (competition.Competitors?.Count != 2)
                return null;

            var homeCompetitor = competition.Competitors.FirstOrDefault(c => c.HomeAway?.ToLower() == "home");
            var awayCompetitor = competition.Competitors.FirstOrDefault(c => c.HomeAway?.ToLower() == "away");

            if (homeCompetitor?.Team == null || awayCompetitor?.Team == null)
                return null;

            // Get odds data
            var odds = competition.Odds?.FirstOrDefault();

            // Convert ESPN status to our GameStatus
            var gameStatus = ConvertEspnStatusToGameStatus(competition.Status);

            return new GameDataDto
            {
                ExternalGameId = espnEvent.Id,
                Sport = sport,
                HomeTeam = homeCompetitor.Team.DisplayName,
                AwayTeam = awayCompetitor.Team.DisplayName,
                GameDateTime = competition.Date,
                Week = espnEvent.Week?.Number.ToString(),
                Season = espnEvent.Season?.Year.ToString(),
                PointSpread = odds?.Spread,
                OverUnderLine = odds?.OverUnder,
                HomeMoneylineOdds = odds?.HomeTeamOdds?.MoneyLine,
                AwayMoneylineOdds = odds?.AwayTeamOdds?.MoneyLine,
                OverOdds = -110, // Default ESPN over/under odds
                UnderOdds = -110,
                HomeScore = int.TryParse(homeCompetitor.Score, out var homeScore) ? homeScore : null,
                AwayScore = int.TryParse(awayCompetitor.Score, out var awayScore) ? awayScore : null,
                GameStatus = gameStatus.ToString(),
                DataSource = "ESPN"
            };
        }

        private GameStatus ConvertEspnStatusToGameStatus(EspnStatus? status)
        {
            if (status?.Type == null)
                return GameStatus.Scheduled;

            return status.Type.State?.ToLower() switch
            {
                "pre" => GameStatus.Scheduled,
                "in" => GameStatus.InProgress,
                "post" => GameStatus.Final,
                _ => status.Type.Name?.ToLower() switch
                {
                    "scheduled" => GameStatus.Scheduled,
                    "in progress" => GameStatus.InProgress,
                    "final" => GameStatus.Final,
                    "postponed" => GameStatus.Postponed,
                    "canceled" => GameStatus.Cancelled,
                    "cancelled" => GameStatus.Cancelled,
                    "suspended" => GameStatus.Suspended,
                    _ => GameStatus.Scheduled
                }
            };
        }

        private async Task ProcessGameDataAsync(GameDataDto gameData, bool scoresOnly = false)
        {
            // Find existing game
            var existingGame = await _context.GameBets
                .FirstOrDefaultAsync(g => g.ExternalGameId == gameData.ExternalGameId);

            if (existingGame == null && !scoresOnly)
            {
                // Create new game
                var newGame = CreateGameBetFromData(gameData);
                _context.GameBets.Add(newGame);
                _logger.LogInformation("Created new {Sport} game: {HomeTeam} vs {AwayTeam}",
                    gameData.Sport, gameData.HomeTeam, gameData.AwayTeam);
            }
            else if (existingGame != null)
            {
                // Update existing game
                UpdateGameBetFromData(existingGame, gameData, scoresOnly);
                _logger.LogDebug("Updated {Sport} game: {HomeTeam} vs {AwayTeam}",
                    gameData.Sport, gameData.HomeTeam, gameData.AwayTeam);
            }
        }

        private GameBet CreateGameBetFromData(GameDataDto data)
        {
            // Get the first league (you might want to make this configurable)
            var defaultLeagueId = 1; // TODO: Make this configurable or dynamic

            return new GameBet
            {
                ExternalGameId = data.ExternalGameId,
                Sport = data.Sport,
                HomeTeam = data.HomeTeam,
                AwayTeam = data.AwayTeam,
                GameDateTime = data.GameDateTime,
                Week = data.Week,
                Season = data.Season,
                PointSpread = data.PointSpread,
                OverUnderLine = data.OverUnderLine,
                HomeMoneylineOdds = data.HomeMoneylineOdds,
                AwayMoneylineOdds = data.AwayMoneylineOdds,
                OverOdds = data.OverOdds,
                UnderOdds = data.UnderOdds,
                HomeScore = data.HomeScore,
                AwayScore = data.AwayScore,
                GameStatus = Enum.Parse<GameStatus>(data.GameStatus),
                ExternalDataSource = data.DataSource,
                LastExternalUpdate = DateTime.UtcNow,
                LeagueId = defaultLeagueId,
                CreatedByAdminId = 1, // System user - TODO: Make configurable
                ExpiresAt = data.GameDateTime.AddMinutes(-15) // Stop betting 15 mins before game
            };
        }

        private void UpdateGameBetFromData(GameBet existingGame, GameDataDto data, bool scoresOnly = false)
        {
            // Always update scores and game status
            existingGame.HomeScore = data.HomeScore;
            existingGame.AwayScore = data.AwayScore;
            existingGame.GameStatus = Enum.Parse<GameStatus>(data.GameStatus);
            existingGame.LastExternalUpdate = DateTime.UtcNow;
            existingGame.UpdatedAt = DateTime.UtcNow;

            // If game is final and not yet settled, mark as ready for settlement
            if (existingGame.GameStatus == GameStatus.Final && !existingGame.IsSettled)
            {
                _logger.LogInformation("Game {ExternalGameId} is final and ready for settlement",
                    existingGame.ExternalGameId);
            }

            // Only update odds if not scores-only mode and game hasn't started
            if (!scoresOnly && existingGame.GameStatus == GameStatus.Scheduled)
            {
                existingGame.PointSpread = data.PointSpread;
                existingGame.OverUnderLine = data.OverUnderLine;
                existingGame.HomeMoneylineOdds = data.HomeMoneylineOdds;
                existingGame.AwayMoneylineOdds = data.AwayMoneylineOdds;
                existingGame.OverOdds = data.OverOdds;
                existingGame.UnderOdds = data.UnderOdds;
            }
        }
    }
}