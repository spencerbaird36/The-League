using System.Text.Json;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FantasyLeague.Api.Services
{
    public class NbaProjectionDataService
    {
        private readonly HttpClient _httpClient;
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<NbaProjectionDataService> _logger;
        private const string API_KEY = "878201c9c8f8470b83954b7207d599b0";
        private const string BASE_URL = "https://api.sportsdata.io/v3/nba/projections/json/PlayerSeasonProjectionStats";

        public NbaProjectionDataService(HttpClient httpClient, FantasyLeagueContext context, ILogger<NbaProjectionDataService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _logger = logger;
        }

        public async Task<bool> SyncNbaProjectionsAsync(int season = 2025)
        {
            try
            {
                _logger.LogInformation($"Starting NBA projections sync for {season}");

                var url = $"{BASE_URL}/{season}?key={API_KEY}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch NBA projections: {response.StatusCode}");
                    return false;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var projections = JsonSerializer.Deserialize<List<NbaProjectionDto>>(jsonContent);

                if (projections == null || projections.Count == 0)
                {
                    _logger.LogWarning("No NBA projections data received from API");
                    return false;
                }

                _logger.LogInformation($"Received {projections.Count} NBA projection records from API");

                // Clear existing data for this season to refresh
                var existingProjections = await _context.NbaPlayerProjections
                    .Where(p => p.Season == season)
                    .ToListAsync();

                if (existingProjections.Any())
                {
                    _context.NbaPlayerProjections.RemoveRange(existingProjections);
                    _logger.LogInformation($"Removed {existingProjections.Count} existing projection records");
                }

                // Convert DTOs to entities and process in batches to avoid transaction timeouts
                var entities = projections.Select(dto => new NbaPlayerProjection
                {
                    PlayerID = dto.PlayerID,
                    Name = dto.Name,
                    Team = dto.Team ?? string.Empty,
                    Position = dto.Position,
                    FieldGoalsMade = dto.FieldGoalsMade,
                    FieldGoalsPercentage = dto.FieldGoalsPercentage,
                    ThreePointersMade = dto.ThreePointersMade,
                    FreeThrowsMade = dto.FreeThrowsMade,
                    Rebounds = dto.Rebounds,
                    Assists = dto.Assists,
                    Steals = dto.Steals,
                    BlockedShots = dto.BlockedShots,
                    Turnovers = dto.Turnovers,
                    Points = dto.Points,
                    FantasyPointsYahoo = dto.FantasyPointsYahoo,
                    Season = season,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastSyncedAt = DateTime.UtcNow
                }).ToList();

                // Process in batches to avoid transaction timeouts
                const int batchSize = 100;
                var totalSaved = 0;
                
                for (int i = 0; i < entities.Count; i += batchSize)
                {
                    var batch = entities.Skip(i).Take(batchSize).ToList();
                    await _context.NbaPlayerProjections.AddRangeAsync(batch);
                    var savedCount = await _context.SaveChangesAsync();
                    totalSaved += savedCount;
                    _logger.LogInformation($"Processed batch {(i / batchSize) + 1}, saved {savedCount} records");
                }

                _logger.LogInformation($"Successfully saved {totalSaved} NBA projection records to database");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error syncing NBA projections for {season}");
                return false;
            }
        }

        public async Task<List<NbaPlayerProjection>> GetNbaProjectionsAsync(int season = 2025)
        {
            return await _context.NbaPlayerProjections
                .Where(p => p.Season == season)
                .OrderByDescending(p => p.FantasyPointsYahoo)
                .ToListAsync();
        }

        public async Task<List<NbaPlayerProjection>> GetNbaProjectionsByPositionAsync(string position, int season = 2025)
        {
            return await _context.NbaPlayerProjections
                .Where(p => p.Position == position && p.Season == season)
                .OrderByDescending(p => p.FantasyPointsYahoo)
                .ToListAsync();
        }

        public async Task<NbaPlayerProjection?> GetNbaProjectionByPlayerIdAsync(int playerId, int season = 2025)
        {
            return await _context.NbaPlayerProjections
                .FirstOrDefaultAsync(p => p.PlayerID == playerId && p.Season == season);
        }

        public async Task<bool> HasRecentDataAsync(int season = 2025, int maxHoursOld = 24)
        {
            var cutoffTime = DateTime.UtcNow.AddHours(-maxHoursOld);
            return await _context.NbaPlayerProjections
                .AnyAsync(p => p.Season == season && p.LastSyncedAt > cutoffTime);
        }
    }
}