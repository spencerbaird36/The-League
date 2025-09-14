using System.Text.Json;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FantasyLeague.Api.Services
{
    public class MlbProjectionDataService
    {
        private readonly HttpClient _httpClient;
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<MlbProjectionDataService> _logger;
        private const string API_KEY = "878201c9c8f8470b83954b7207d599b0";
        private const string BASE_URL = "https://api.sportsdata.io/v3/mlb/projections/json/PlayerSeasonProjectionStats";

        public MlbProjectionDataService(HttpClient httpClient, FantasyLeagueContext context, ILogger<MlbProjectionDataService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _logger = logger;
        }

        public async Task<bool> SyncMlbProjectionsAsync(int season = 2025)
        {
            try
            {
                _logger.LogInformation($"Starting MLB projections sync for {season}");

                // First, clear any existing corrupt data using raw SQL to avoid Entity Framework issues
                var deleteCount = await _context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM \"MlbPlayerProjections\" WHERE \"Season\" = {0}", season);
                
                if (deleteCount > 0)
                {
                    _logger.LogInformation($"Removed {deleteCount} existing projection records to prevent corruption");
                }

                var url = $"{BASE_URL}/{season}?key={API_KEY}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch MLB projections: {response.StatusCode}");
                    return false;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var projections = JsonSerializer.Deserialize<List<MlbProjectionDto>>(jsonContent);

                if (projections == null || projections.Count == 0)
                {
                    _logger.LogWarning("No MLB projections data received from API");
                    return false;
                }

                _logger.LogInformation($"Received {projections.Count} MLB projection records from API");

                // Convert DTOs to entities and process in batches
                var entities = projections.Select(dto => new MlbPlayerProjection
                {
                    PlayerID = dto.PlayerID,
                    Name = dto.Name,
                    Team = dto.Team ?? string.Empty,
                    Position = dto.Position,
                    FantasyPointsYahoo = dto.FantasyPointsYahoo,
                    Runs = dto.Runs,
                    Hits = dto.Hits,
                    HomeRuns = dto.HomeRuns,
                    BattingAverage = dto.BattingAverage,
                    RunsBattedIn = dto.RunsBattedIn,
                    Walks = dto.Walks,
                    StolenBases = dto.StolenBases,
                    OnBasePlusSlugging = dto.OnBasePlusSlugging,
                    Wins = dto.Wins,
                    Losses = dto.Losses,
                    Saves = dto.Saves,
                    PitchingStrikeouts = dto.PitchingStrikeouts,
                    WalksHitsPerInningsPitched = dto.WalksHitsPerInningsPitched,
                    Season = season,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastSyncedAt = DateTime.UtcNow
                }).ToList();

                // Process in smaller batches to avoid transaction timeouts  
                const int batchSize = 50;  // Reduced batch size
                var totalSaved = 0;
                
                for (int i = 0; i < entities.Count; i += batchSize)
                {
                    var batch = entities.Skip(i).Take(batchSize).ToList();
                    await _context.MlbPlayerProjections.AddRangeAsync(batch);
                    var savedCount = await _context.SaveChangesAsync();
                    totalSaved += savedCount;
                    _logger.LogInformation($"Processed batch {(i / batchSize) + 1}, saved {savedCount} records");
                    
                    // Clear change tracker to avoid memory issues
                    _context.ChangeTracker.Clear();
                }

                _logger.LogInformation($"Successfully saved {totalSaved} MLB projection records to database");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error syncing MLB projections for {season}");
                return false;
            }
        }

        public async Task<List<MlbPlayerProjection>> GetMlbProjectionsAsync(int season = 2025)
        {
            try
            {
                return await _context.MlbPlayerProjections
                    .Where(p => p.Season == season)
                    .OrderByDescending(p => p.FantasyPointsYahoo)
                    .ToListAsync();
            }
            catch (Exception ex) when (ex.Message.Contains("Column 'Team' is null"))
            {
                // Handle corrupt data by clearing it and returning empty list
                _logger.LogWarning("Corrupt MLB projection data detected, clearing it");
                await _context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM \"MlbPlayerProjections\" WHERE \"Season\" = {0}", season);
                return new List<MlbPlayerProjection>();
            }
        }

        public async Task<List<MlbPlayerProjection>> GetMlbProjectionsByPositionAsync(string position, int season = 2025)
        {
            return await _context.MlbPlayerProjections
                .Where(p => p.Position == position && p.Season == season)
                .OrderByDescending(p => p.FantasyPointsYahoo)
                .ToListAsync();
        }

        public async Task<MlbPlayerProjection?> GetMlbProjectionByPlayerIdAsync(int playerId, int season = 2025)
        {
            return await _context.MlbPlayerProjections
                .FirstOrDefaultAsync(p => p.PlayerID == playerId && p.Season == season);
        }

        public async Task<bool> HasRecentDataAsync(int season = 2025, int maxHoursOld = 24)
        {
            var cutoffTime = DateTime.UtcNow.AddHours(-maxHoursOld);
            return await _context.MlbPlayerProjections
                .AnyAsync(p => p.Season == season && p.LastSyncedAt > cutoffTime);
        }

        public async Task<int> ClearMlbProjectionsAsync(int season = 2025)
        {
            try
            {
                var projectionsToDelete = await _context.MlbPlayerProjections
                    .Where(p => p.Season == season)
                    .ToListAsync();

                _context.MlbPlayerProjections.RemoveRange(projectionsToDelete);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Cleared {projectionsToDelete.Count} MLB projection records for season {season}");
                return projectionsToDelete.Count;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error clearing MLB projections for season {season}");
                throw;
            }
        }
    }
}