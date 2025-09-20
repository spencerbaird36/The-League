using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using System.Text.Json;

namespace FantasyLeague.Api.Services
{
    public class KeeperDraftService
    {
        private readonly FantasyLeagueContext _context;
        private readonly LeagueConfigurationService _configurationService;

        public KeeperDraftService(FantasyLeagueContext context, LeagueConfigurationService configurationService)
        {
            _context = context;
            _configurationService = configurationService;
        }

        public async Task<Draft?> CreateKeeperDraftAsync(int leagueId, int createdByUserId)
        {
            // Get league configuration
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null || !config.IsKeeperLeague)
                return null;

            // Check if keeper draft already exists
            var existingDraft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId && d.DraftType == DraftType.Keeper);
            
            if (existingDraft != null)
                return existingDraft;

            // Get league members
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == leagueId);

            if (league == null || league.Users.Count == 0)
                return null;

            // Create randomized draft order
            var userIds = league.Users.Select(u => u.Id).ToList();
            var random = new Random();
            var shuffledUserIds = userIds.OrderBy(x => random.Next()).ToList();
            var draftOrderJson = JsonSerializer.Serialize(shuffledUserIds);

            // Calculate total picks needed (keeper slots for all users)
            var totalUsers = userIds.Count;
            var totalKeeperPicks = totalUsers * config.TotalKeeperSlots;

            var draft = new Draft
            {
                LeagueId = leagueId,
                DraftType = DraftType.Keeper,
                SportType = null, // Keeper draft includes all sports
                DraftOrder = draftOrderJson,
                MaxPicks = totalKeeperPicks,
                MaxPicksPerSport = config.KeepersPerSport,
                CurrentTurn = 0,
                CurrentRound = 1,
                IsActive = false,
                IsCompleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Drafts.Add(draft);
            await _context.SaveChangesAsync();

            return draft;
        }

        public async Task<bool> ValidateKeeperPickAsync(int draftId, int userId, string playerLeague)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Keeper);

            if (draft == null)
                return false;

            // Get league configuration
            var config = await _configurationService.GetConfigurationAsync(draft.LeagueId);
            if (config == null)
                return false;

            // Check if sport is enabled in league
            var sportEnabled = playerLeague.ToUpper() switch
            {
                "NFL" => config.IncludeNFL,
                "MLB" => config.IncludeMLB,
                "NBA" => config.IncludeNBA,
                _ => false
            };

            if (!sportEnabled)
                return false;

            // Count existing picks for this user in this sport
            var existingPicksInSport = draft.DraftPicks
                .Count(dp => dp.UserId == userId && 
                           dp.PlayerLeague.ToUpper() == playerLeague.ToUpper() && 
                           dp.IsKeeperPick);

            // Check if user has exceeded picks for this sport
            if (existingPicksInSport >= config.KeepersPerSport)
                return false;

            // Count total picks for this user
            var totalUserPicks = draft.DraftPicks
                .Count(dp => dp.UserId == userId && dp.IsKeeperPick);

            // Check if user has exceeded total keeper slots
            if (totalUserPicks >= config.TotalKeeperSlots)
                return false;

            return true;
        }

        public async Task<Draft?> GetKeeperDraftForLeagueAsync(int leagueId)
        {
            return await _context.Drafts
                .Include(d => d.DraftPicks)
                .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId && d.DraftType == DraftType.Keeper);
        }

        public async Task<Dictionary<string, int>> GetUserKeeperCountsBySportAsync(int draftId, int userId)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Keeper);

            if (draft == null)
                return new Dictionary<string, int>();

            var keeperPicks = draft.DraftPicks
                .Where(dp => dp.UserId == userId && dp.IsKeeperPick)
                .GroupBy(dp => dp.PlayerLeague.ToUpper())
                .ToDictionary(g => g.Key, g => g.Count());

            // Ensure all sports are represented
            var result = new Dictionary<string, int>
            {
                ["NFL"] = keeperPicks.GetValueOrDefault("NFL", 0),
                ["MLB"] = keeperPicks.GetValueOrDefault("MLB", 0),
                ["NBA"] = keeperPicks.GetValueOrDefault("NBA", 0)
            };

            return result;
        }

        public async Task<bool> IsKeeperDraftCompleteAsync(int draftId)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Keeper);

            if (draft == null)
                return false;

            var config = await _configurationService.GetConfigurationAsync(draft.LeagueId);
            if (config == null)
                return false;

            // Get number of users in league
            var userCount = await _context.Users.CountAsync(u => u.LeagueId == draft.LeagueId);
            
            // Calculate expected total picks
            var expectedTotalPicks = userCount * config.TotalKeeperSlots;
            var actualTotalPicks = draft.DraftPicks.Count(dp => dp.IsKeeperPick);

            return actualTotalPicks >= expectedTotalPicks;
        }

        public async Task<bool> CompleteKeeperDraftAsync(int draftId)
        {
            var draft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Keeper);

            if (draft == null)
                return false;

            draft.IsCompleted = true;
            draft.CompletedAt = DateTime.UtcNow;
            draft.IsActive = false;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ShouldPromptForRegularDraftsAsync(int leagueId)
        {
            // TEMPORARY: Always return false to disable regular draft prompts in production
            // All drafts will use keeper-style logic until regular draft functionality is implemented
            return false;

            // Original logic commented out until regular drafts are ready:
            /*
            // Check if keeper draft is completed
            var keeperDraft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId && d.DraftType == DraftType.Keeper && d.IsCompleted);

            if (keeperDraft == null)
                return false;

            // Get league configuration to see which sports are selected
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
                return false;

            // Check if any regular drafts have been created yet
            var existingRegularDrafts = await _context.Drafts
                .Where(d => d.LeagueId == leagueId && d.DraftType == DraftType.Regular)
                .ToListAsync();

            var selectedSports = config.GetSelectedSports();

            // Should prompt if there are fewer regular drafts than selected sports
            return existingRegularDrafts.Count < selectedSports.Count;
            */
        }

        public async Task<List<string>> GetPendingRegularDraftSportsAsync(int leagueId)
        {
            // TEMPORARY: Always return empty list to disable regular draft sports in production
            // All drafts will use keeper-style logic until regular draft functionality is implemented
            return new List<string>();

            // Original logic commented out until regular drafts are ready:
            /*
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
                return new List<string>();

            var selectedSports = config.GetSelectedSports();

            var existingDraftSports = await _context.Drafts
                .Where(d => d.LeagueId == leagueId && d.DraftType == DraftType.Regular)
                .Select(d => d.SportType)
                .ToListAsync();

            return selectedSports.Where(sport => !existingDraftSports.Contains(sport)).ToList();
            */
        }

        public async Task<List<DraftPick>> GetKeeperPicksForUserAsync(int leagueId, int userId)
        {
            var draft = await GetKeeperDraftForLeagueAsync(leagueId);
            if (draft == null)
                return new List<DraftPick>();

            return draft.DraftPicks
                .Where(dp => dp.UserId == userId && dp.IsKeeperPick)
                .OrderBy(dp => dp.PickedAt)
                .ToList();
        }

        public async Task<Dictionary<int, List<DraftPick>>> GetAllKeeperPicksForLeagueAsync(int leagueId)
        {
            var draft = await GetKeeperDraftForLeagueAsync(leagueId);
            if (draft == null)
                return new Dictionary<int, List<DraftPick>>();

            return draft.DraftPicks
                .Where(dp => dp.IsKeeperPick)
                .GroupBy(dp => dp.UserId)
                .ToDictionary(g => g.Key, g => g.OrderBy(dp => dp.PickedAt).ToList());
        }

        public async Task<bool> CanUserMakeKeeperPickAsync(int draftId, int userId)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Keeper);

            if (draft == null || !draft.IsActive)
                return false;

            var config = await _configurationService.GetConfigurationAsync(draft.LeagueId);
            if (config == null)
                return false;

            // Count total keeper picks for user
            var userKeeperPicks = draft.DraftPicks
                .Count(dp => dp.UserId == userId && dp.IsKeeperPick);

            return userKeeperPicks < config.TotalKeeperSlots;
        }
    }
}