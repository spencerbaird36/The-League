using System.Text.Json;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace FantasyLeague.Api.Services
{
    public class NflProjectionDataService
    {
        private readonly HttpClient _httpClient;
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<NflProjectionDataService> _logger;
        private const string API_KEY = "878201c9c8f8470b83954b7207d599b0";
        private const string BASE_URL = "https://baker-api.sportsdata.io/baker/v2/nfl/projections/players/full-season";

        public NflProjectionDataService(HttpClient httpClient, FantasyLeagueContext context, ILogger<NflProjectionDataService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _logger = logger;
        }

        public async Task<bool> SyncNflProjectionsAsync(string season = "2025REG", int year = 2025)
        {
            try
            {
                _logger.LogInformation($"Starting NFL projections sync for {season}/{year}");

                var url = $"{BASE_URL}/{season}/avg?key={API_KEY}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Failed to fetch NFL projections: {response.StatusCode}");
                    return false;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var projections = JsonSerializer.Deserialize<List<NflProjectionDto>>(jsonContent);

                if (projections == null || projections.Count == 0)
                {
                    _logger.LogWarning("No NFL projections data received from API");
                    return false;
                }

                _logger.LogInformation($"Received {projections.Count} NFL projection records from API");

                // Clear existing data for this season/year to refresh
                var existingProjections = await _context.NflPlayerProjections
                    .Where(p => p.Season == season && p.Year == year)
                    .ToListAsync();

                if (existingProjections.Any())
                {
                    _context.NflPlayerProjections.RemoveRange(existingProjections);
                    _logger.LogInformation($"Removed {existingProjections.Count} existing projection records");
                }

                // Convert DTOs to entities and process in batches to avoid transaction timeouts
                var entities = projections.Select(dto => new NflPlayerProjection
                {
                    PlayerId = dto.PlayerId,
                    Name = dto.Name,
                    Team = dto.Team ?? "FA", // Handle null team values
                    Position = dto.Position,
                    PassingYards = dto.PassingYards,
                    RushingYards = dto.RushingYards,
                    ReceivingYards = dto.ReceivingYards,
                    FieldGoalsMade = dto.FieldGoalsMade,
                    PassingTouchdowns = dto.PassingTouchdowns,
                    RushingTouchdowns = dto.RushingTouchdowns,
                    ReceivingTouchdowns = dto.ReceivingTouchdowns,
                    FantasyPointsYahooSeasonLong = dto.FantasyPointsYahooSeasonLong,
                    Season = season,
                    Year = year,
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
                    await _context.NflPlayerProjections.AddRangeAsync(batch);
                    var savedCount = await _context.SaveChangesAsync();
                    totalSaved += savedCount;
                    _logger.LogInformation($"Processed batch {(i / batchSize) + 1}, saved {savedCount} records");
                    
                    // Clear change tracker to avoid memory issues
                    _context.ChangeTracker.Clear();
                }

                _logger.LogInformation($"Successfully saved {totalSaved} NFL projection records to database");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error syncing NFL projections for {season}/{year}");
                return false;
            }
        }

        public async Task<List<NflPlayerProjection>> GetNflProjectionsAsync(string season = "2025REG", int year = 2025)
        {
            return await _context.NflPlayerProjections
                .Where(p => p.Season == season && p.Year == year)
                .OrderByDescending(p => p.FantasyPointsYahooSeasonLong)
                .ToListAsync();
        }

        public async Task<List<NflPlayerProjection>> GetNflProjectionsByPositionAsync(string position, string season = "2025REG", int year = 2025)
        {
            return await _context.NflPlayerProjections
                .Where(p => p.Position == position && p.Season == season && p.Year == year)
                .OrderByDescending(p => p.FantasyPointsYahooSeasonLong)
                .ToListAsync();
        }

        public async Task<NflPlayerProjection?> GetNflProjectionByPlayerIdAsync(int playerId, string season = "2025REG", int year = 2025)
        {
            return await _context.NflPlayerProjections
                .FirstOrDefaultAsync(p => p.PlayerId == playerId && p.Season == season && p.Year == year);
        }

        public async Task<bool> HasRecentDataAsync(string season = "2025REG", int year = 2025, int maxHoursOld = 24)
        {
            var cutoffTime = DateTime.UtcNow.AddHours(-maxHoursOld);
            return await _context.NflPlayerProjections
                .AnyAsync(p => p.Season == season && p.Year == year && p.LastSyncedAt > cutoffTime);
        }
    }
}