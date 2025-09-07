using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using System.Text.Json;

namespace FantasyLeague.Api.Services
{
    public class RegularDraftService
    {
        private readonly FantasyLeagueContext _context;
        private readonly LeagueConfigurationService _configurationService;
        private readonly KeeperDraftService _keeperDraftService;

        public RegularDraftService(FantasyLeagueContext context, LeagueConfigurationService configurationService, KeeperDraftService keeperDraftService)
        {
            _context = context;
            _configurationService = configurationService;
            _keeperDraftService = keeperDraftService;
        }

        public async Task<Draft?> CreateRegularDraftAsync(int leagueId, string sportType)
        {
            // Get the league commissioner to use as the creator
            var league = await _context.Leagues.FirstOrDefaultAsync(l => l.Id == leagueId);
            if (league?.CommissionerId == null)
                return null;

            return await CreateRegularDraftAsync(leagueId, sportType, league.CommissionerId.Value);
        }

        public async Task<Draft?> CreateRegularDraftAsync(int leagueId, string sportType, int createdByUserId)
        {
            // Get league configuration
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
                return null;

            // Validate sport is enabled in league
            var sportEnabled = sportType.ToUpper() switch
            {
                "NFL" => config.IncludeNFL,
                "MLB" => config.IncludeMLB,
                "NBA" => config.IncludeNBA,
                _ => false
            };

            if (!sportEnabled)
                return null;

            // Check if keeper draft exists and is completed (for keeper leagues)
            if (config.IsKeeperLeague)
            {
                var keeperDraft = await _keeperDraftService.GetKeeperDraftForLeagueAsync(leagueId);
                if (keeperDraft == null || !keeperDraft.IsCompleted)
                    return null; // Keeper draft must be completed first
            }

            // Check if regular draft already exists for this sport
            var existingDraft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId && 
                                       d.DraftType == DraftType.Regular && 
                                       d.SportType == sportType.ToUpper());

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

            // Calculate remaining roster spots after keepers
            var remainingRosterSpots = await CalculateRemainingRosterSpotsAsync(leagueId, sportType, config);
            var totalPicks = userIds.Count * remainingRosterSpots;

            var draft = new Draft
            {
                LeagueId = leagueId,
                DraftType = DraftType.Regular,
                SportType = sportType.ToUpper(),
                DraftOrder = draftOrderJson,
                MaxPicks = totalPicks,
                MaxPicksPerSport = remainingRosterSpots, // Per user for this sport
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

        public async Task<bool> CanCreateRegularDraftAsync(int leagueId, string sportType)
        {
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
                return false;

            // Check if sport is enabled
            var sportEnabled = sportType.ToUpper() switch
            {
                "NFL" => config.IncludeNFL,
                "MLB" => config.IncludeMLB,
                "NBA" => config.IncludeNBA,
                _ => false
            };

            if (!sportEnabled)
                return false;

            // For keeper leagues, keeper draft must be completed
            if (config.IsKeeperLeague)
            {
                var keeperDraft = await _keeperDraftService.GetKeeperDraftForLeagueAsync(leagueId);
                if (keeperDraft == null || !keeperDraft.IsCompleted)
                    return false;
            }

            // Check if draft doesn't already exist
            var existingDraft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId && 
                                       d.DraftType == DraftType.Regular && 
                                       d.SportType == sportType.ToUpper());

            return existingDraft == null;
        }

        public async Task<List<Draft>> GetRegularDraftsForLeagueAsync(int leagueId)
        {
            return await _context.Drafts
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .Where(d => d.LeagueId == leagueId && d.DraftType == DraftType.Regular)
                .OrderBy(d => d.CreatedAt)
                .ToListAsync();
        }

        public async Task<Draft?> GetRegularDraftBySportAsync(int leagueId, string sportType)
        {
            return await _context.Drafts
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId && 
                                       d.DraftType == DraftType.Regular && 
                                       d.SportType == sportType.ToUpper());
        }

        public async Task<bool> ValidateRegularDraftPickAsync(int draftId, int userId, string playerLeague)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Regular);

            if (draft == null || !draft.IsActive)
                return false;

            // Check if player is from the correct sport
            if (draft.SportType != playerLeague.ToUpper())
                return false;

            // Check if user has exceeded picks for this sport
            var userPicksInSport = draft.DraftPicks
                .Count(dp => dp.UserId == userId && 
                           dp.PlayerLeague.ToUpper() == playerLeague.ToUpper() && 
                           !dp.IsKeeperPick);

            return userPicksInSport < draft.MaxPicksPerSport;
        }

        private async Task<int> CalculateRemainingRosterSpotsAsync(int leagueId, string sportType, LeagueConfiguration config)
        {
            // For keeper leagues, subtract keeper slots from total roster spots
            if (config.IsKeeperLeague)
            {
                var totalSpotsPerSport = CalculateTotalRosterSpotsPerSport(config);
                return totalSpotsPerSport - config.KeepersPerSport;
            }

            // For non-keeper leagues, use full roster spots
            return CalculateTotalRosterSpotsPerSport(config);
        }

        private int CalculateTotalRosterSpotsPerSport(LeagueConfiguration config)
        {
            // Calculate total roster spots per sport based on league configuration
            // This could be configurable per league in the future
            var totalRosterSpots = config.MaxPlayersPerTeam;
            var enabledSports = 0;

            if (config.IncludeNFL) enabledSports++;
            if (config.IncludeMLB) enabledSports++;
            if (config.IncludeNBA) enabledSports++;

            // Distribute roster spots evenly across enabled sports
            return enabledSports > 0 ? totalRosterSpots / enabledSports : 0;
        }

        public async Task<RegularDraftStatusDto> GetRegularDraftStatusAsync(int leagueId)
        {
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
            {
                return new RegularDraftStatusDto();
            }

            var drafts = await GetRegularDraftsForLeagueAsync(leagueId);
            var keeperDraftCompleted = true;

            if (config.IsKeeperLeague)
            {
                var keeperDraft = await _keeperDraftService.GetKeeperDraftForLeagueAsync(leagueId);
                keeperDraftCompleted = keeperDraft?.IsCompleted == true;
            }

            var sportStatuses = new Dictionary<string, SportDraftStatus>();
            var enabledSports = new List<string>();

            if (config.IncludeNFL) enabledSports.Add("NFL");
            if (config.IncludeMLB) enabledSports.Add("MLB");
            if (config.IncludeNBA) enabledSports.Add("NBA");

            foreach (var sport in enabledSports)
            {
                var draft = drafts.FirstOrDefault(d => d.SportType == sport);
                sportStatuses[sport] = new SportDraftStatus
                {
                    SportType = sport,
                    DraftExists = draft != null,
                    DraftId = draft?.Id,
                    IsActive = draft?.IsActive == true,
                    IsCompleted = draft?.IsCompleted == true,
                    CanCreate = await CanCreateRegularDraftAsync(leagueId, sport),
                    TotalPicks = draft?.MaxPicks ?? 0,
                    CompletedPicks = draft?.DraftPicks.Count(dp => !dp.IsKeeperPick) ?? 0,
                    CreatedAt = draft?.CreatedAt,
                    StartedAt = draft?.StartedAt,
                    CompletedAt = draft?.CompletedAt
                };
            }

            return new RegularDraftStatusDto
            {
                LeagueId = leagueId,
                IsKeeperLeague = config.IsKeeperLeague,
                KeeperDraftCompleted = keeperDraftCompleted,
                EnabledSports = enabledSports,
                SportStatuses = sportStatuses,
                AllDraftsCompleted = sportStatuses.Values.All(s => s.IsCompleted)
            };
        }

        public async Task<bool> StartRegularDraftAsync(int draftId)
        {
            var draft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Regular);

            if (draft == null || draft.IsActive || draft.IsCompleted)
                return false;

            draft.IsActive = true;
            draft.StartedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CompleteRegularDraftAsync(int draftId)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == draftId && d.DraftType == DraftType.Regular);

            if (draft == null)
                return false;

            draft.IsCompleted = true;
            draft.CompletedAt = DateTime.UtcNow;
            draft.IsActive = false;

            await _context.SaveChangesAsync();
            return true;
        }
    }

    public class RegularDraftStatusDto
    {
        public int LeagueId { get; set; }
        public bool IsKeeperLeague { get; set; }
        public bool KeeperDraftCompleted { get; set; }
        public List<string> EnabledSports { get; set; } = new();
        public Dictionary<string, SportDraftStatus> SportStatuses { get; set; } = new();
        public bool AllDraftsCompleted { get; set; }
    }

    public class SportDraftStatus
    {
        public string SportType { get; set; } = string.Empty;
        public bool DraftExists { get; set; }
        public int? DraftId { get; set; }
        public bool IsActive { get; set; }
        public bool IsCompleted { get; set; }
        public bool CanCreate { get; set; }
        public int TotalPicks { get; set; }
        public int CompletedPicks { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}