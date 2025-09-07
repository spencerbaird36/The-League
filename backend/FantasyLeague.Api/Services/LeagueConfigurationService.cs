using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class LeagueConfigurationService
    {
        private readonly FantasyLeagueContext _context;

        public LeagueConfigurationService(FantasyLeagueContext context)
        {
            _context = context;
        }

        public async Task<LeagueConfiguration?> GetConfigurationAsync(int leagueId)
        {
            return await _context.LeagueConfigurations
                .FirstOrDefaultAsync(lc => lc.LeagueId == leagueId);
        }

        public async Task<LeagueConfiguration> CreateDefaultConfigurationAsync(int leagueId)
        {
            var configuration = new LeagueConfiguration
            {
                LeagueId = leagueId,
                IncludeNFL = true,
                IncludeMLB = false,
                IncludeNBA = false,
                TotalKeeperSlots = 15,
                IsKeeperLeague = true,
                MaxPlayersPerTeam = 25,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.LeagueConfigurations.Add(configuration);
            await _context.SaveChangesAsync();

            return configuration;
        }

        public async Task<LeagueConfiguration?> UpdateConfigurationAsync(int leagueId, LeagueConfiguration updatedConfig)
        {
            var existingConfig = await _context.LeagueConfigurations
                .FirstOrDefaultAsync(lc => lc.LeagueId == leagueId);

            if (existingConfig == null)
                return null;

            // Update properties
            existingConfig.IncludeNFL = updatedConfig.IncludeNFL;
            existingConfig.IncludeMLB = updatedConfig.IncludeMLB;
            existingConfig.IncludeNBA = updatedConfig.IncludeNBA;
            existingConfig.TotalKeeperSlots = updatedConfig.TotalKeeperSlots;
            existingConfig.IsKeeperLeague = updatedConfig.IsKeeperLeague;
            existingConfig.MaxPlayersPerTeam = updatedConfig.MaxPlayersPerTeam;
            existingConfig.UpdatedAt = DateTime.UtcNow;

            // Validate configuration before saving
            if (!existingConfig.IsValidConfiguration())
            {
                throw new InvalidOperationException(
                    $"Invalid configuration: {string.Join(", ", existingConfig.GetValidationErrors())}"
                );
            }

            await _context.SaveChangesAsync();
            return existingConfig;
        }

        public async Task<bool> DeleteConfigurationAsync(int leagueId)
        {
            var configuration = await _context.LeagueConfigurations
                .FirstOrDefaultAsync(lc => lc.LeagueId == leagueId);

            if (configuration == null)
                return false;

            _context.LeagueConfigurations.Remove(configuration);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<LeagueConfiguration> GetOrCreateConfigurationAsync(int leagueId)
        {
            var existing = await GetConfigurationAsync(leagueId);
            if (existing != null)
                return existing;

            return await CreateDefaultConfigurationAsync(leagueId);
        }

        public async Task<bool> ValidateConfigurationAsync(LeagueConfiguration configuration)
        {
            // Basic validation
            if (!configuration.IsValidConfiguration())
                return false;

            // Additional business logic validation can be added here
            // For example, checking if the league has existing drafts that would be affected
            
            return true;
        }

        public async Task<Dictionary<string, int>> GetSportsBreakdownAsync(int leagueId)
        {
            var config = await GetConfigurationAsync(leagueId);
            if (config == null)
                return new Dictionary<string, int>();

            var breakdown = new Dictionary<string, int>();
            var keepersPerSport = config.KeepersPerSport;

            if (config.IncludeNFL)
                breakdown["NFL"] = keepersPerSport;
            if (config.IncludeMLB)
                breakdown["MLB"] = keepersPerSport;
            if (config.IncludeNBA)
                breakdown["NBA"] = keepersPerSport;

            return breakdown;
        }

        public async Task<List<string>> GetAvailableSportsAsync(int leagueId)
        {
            var config = await GetConfigurationAsync(leagueId);
            return config?.GetSelectedSports() ?? new List<string> { "NFL" };
        }

        public async Task<bool> IsSportEnabledAsync(int leagueId, string sport)
        {
            var config = await GetConfigurationAsync(leagueId);
            if (config == null)
                return sport == "NFL"; // Default to NFL only

            return sport.ToUpper() switch
            {
                "NFL" => config.IncludeNFL,
                "MLB" => config.IncludeMLB,
                "NBA" => config.IncludeNBA,
                _ => false
            };
        }

        public async Task<int> GetKeeperSlotsForSportAsync(int leagueId, string sport)
        {
            var config = await GetConfigurationAsync(leagueId);
            if (config == null || !await IsSportEnabledAsync(leagueId, sport))
                return 0;

            return config.KeepersPerSport;
        }

        public async Task<bool> IsKeeperLeagueAsync(int leagueId)
        {
            var config = await GetConfigurationAsync(leagueId);
            return config?.IsKeeperLeague ?? true; // Default to true
        }
    }
}