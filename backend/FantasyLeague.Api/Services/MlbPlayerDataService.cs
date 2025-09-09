using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FantasyLeague.Api.Services
{
    public class MlbPlayerDataService
    {
        private readonly FantasyLeagueContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<MlbPlayerDataService> _logger;
        private const string API_KEY = "878201c9c8f8470b83954b7207d599b0";
        private const string API_URL = "https://api.sportsdata.io/v3/mlb/scores/json/PlayersByActive";
        private static readonly HashSet<string> ValidPositions = new() { "C", "1B", "2B", "3B", "SS", "OF", "DH", "SP", "RP", "P" };

        public MlbPlayerDataService(FantasyLeagueContext context, HttpClient httpClient, ILogger<MlbPlayerDataService> logger)
        {
            _context = context;
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<SyncResult> SyncMlbPlayersAsync()
        {
            try
            {
                _logger.LogInformation("Starting MLB player data sync...");

                // Fetch data from API
                var apiUrl = $"{API_URL}?key={API_KEY}";
                var response = await _httpClient.GetAsync(apiUrl);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"API request failed with status: {response.StatusCode}");
                    return new SyncResult { Success = false, Message = $"API request failed: {response.StatusCode}" };
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var players = JsonSerializer.Deserialize<List<ApiMlbPlayerData>>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (players == null)
                {
                    _logger.LogError("Failed to deserialize API response");
                    return new SyncResult { Success = false, Message = "Failed to parse API response" };
                }

                // Filter for active players only
                var validPlayers = players.Where(p => 
                    p.Status == "Active" && 
                    !string.IsNullOrEmpty(p.Team) && 
                    !string.IsNullOrEmpty(p.FirstName) && 
                    !string.IsNullOrEmpty(p.LastName) && 
                    !string.IsNullOrEmpty(p.Position) &&
                    p.BirthDate.HasValue
                ).ToList();

                _logger.LogInformation($"Found {validPlayers.Count} valid active players out of {players.Count} total players");

                // Get existing players for comparison
                var existingPlayers = await _context.ActiveMlbPlayers.ToDictionaryAsync(p => p.PlayerID);

                int addedCount = 0;
                int updatedCount = 0;
                int removedCount = 0;

                var currentPlayerIds = new HashSet<int>(validPlayers.Select(p => p.PlayerID));

                // Add or update players
                foreach (var apiPlayer in validPlayers)
                {
                    if (existingPlayers.TryGetValue(apiPlayer.PlayerID, out var existingPlayer))
                    {
                        // Update existing player if data has changed
                        var hasChanges = false;
                        
                        if (existingPlayer.Team != apiPlayer.Team)
                        {
                            existingPlayer.Team = apiPlayer.Team;
                            hasChanges = true;
                        }
                        
                        if (existingPlayer.FirstName != apiPlayer.FirstName)
                        {
                            existingPlayer.FirstName = apiPlayer.FirstName;
                            hasChanges = true;
                        }
                        
                        if (existingPlayer.LastName != apiPlayer.LastName)
                        {
                            existingPlayer.LastName = apiPlayer.LastName;
                            hasChanges = true;
                        }
                        
                        if (existingPlayer.Position != apiPlayer.Position)
                        {
                            existingPlayer.Position = apiPlayer.Position;
                            hasChanges = true;
                        }
                        
                        if (existingPlayer.BirthDate.Date != apiPlayer.BirthDate.GetValueOrDefault().Date)
                        {
                            existingPlayer.BirthDate = apiPlayer.BirthDate.GetValueOrDefault();
                            hasChanges = true;
                        }

                        if (hasChanges)
                        {
                            existingPlayer.UpdatedAt = DateTime.UtcNow;
                            existingPlayer.LastSyncedAt = DateTime.UtcNow;
                            updatedCount++;
                        }
                        else
                        {
                            existingPlayer.LastSyncedAt = DateTime.UtcNow;
                        }
                    }
                    else
                    {
                        // Add new player
                        var newPlayer = new ActiveMlbPlayer
                        {
                            PlayerID = apiPlayer.PlayerID,
                            Team = apiPlayer.Team,
                            FirstName = apiPlayer.FirstName,
                            LastName = apiPlayer.LastName,
                            Position = apiPlayer.Position,
                            BirthDate = apiPlayer.BirthDate.GetValueOrDefault(),
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                            LastSyncedAt = DateTime.UtcNow
                        };

                        _context.ActiveMlbPlayers.Add(newPlayer);
                        addedCount++;
                    }
                }

                // Remove players no longer in the API response (inactive or cut)
                var playersToRemove = existingPlayers.Values
                    .Where(p => !currentPlayerIds.Contains(p.PlayerID))
                    .ToList();

                if (playersToRemove.Any())
                {
                    _context.ActiveMlbPlayers.RemoveRange(playersToRemove);
                    removedCount = playersToRemove.Count;
                }

                // Save changes
                await _context.SaveChangesAsync();

                var message = $"Sync completed: {addedCount} added, {updatedCount} updated, {removedCount} removed";
                _logger.LogInformation(message);

                return new SyncResult
                {
                    Success = true,
                    Message = message,
                    PlayersAdded = addedCount,
                    PlayersUpdated = updatedCount,
                    PlayersRemoved = removedCount,
                    TotalValidPlayers = validPlayers.Count
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during MLB player data sync");
                return new SyncResult { Success = false, Message = $"Error during sync: {ex.Message}" };
            }
        }

        public async Task<List<ActiveMlbPlayer>> GetActivePlayersAsync(string? position = null, string? team = null, int page = 1, int pageSize = 50)
        {
            var query = _context.ActiveMlbPlayers.AsQueryable();

            if (!string.IsNullOrEmpty(position))
            {
                query = query.Where(p => p.Position == position.ToUpper());
            }

            if (!string.IsNullOrEmpty(team))
            {
                query = query.Where(p => p.Team == team.ToUpper());
            }

            return await query
                .OrderBy(p => p.LastName)
                .ThenBy(p => p.FirstName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetActivePlayersCountAsync(string? position = null, string? team = null)
        {
            var query = _context.ActiveMlbPlayers.AsQueryable();

            if (!string.IsNullOrEmpty(position))
            {
                query = query.Where(p => p.Position == position.ToUpper());
            }

            if (!string.IsNullOrEmpty(team))
            {
                query = query.Where(p => p.Team == team.ToUpper());
            }

            return await query.CountAsync();
        }

        public async Task<ActiveMlbPlayer?> GetPlayerByIdAsync(int playerId)
        {
            return await _context.ActiveMlbPlayers
                .FirstOrDefaultAsync(p => p.PlayerID == playerId);
        }

        public async Task<List<string>> GetAvailableTeamsAsync()
        {
            return await _context.ActiveMlbPlayers
                .Select(p => p.Team)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();
        }

        public async Task<List<string>> GetAvailablePositionsAsync()
        {
            return await _context.ActiveMlbPlayers
                .Select(p => p.Position)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();
        }
    }

    // API response model
    public class ApiMlbPlayerData
    {
        public int PlayerID { get; set; }
        public string Team { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public DateTime? BirthDate { get; set; }
        public string Status { get; set; } = string.Empty;
    }

}