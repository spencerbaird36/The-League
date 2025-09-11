using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class PlayerPoolService
    {
        private readonly FantasyLeagueContext _context;
        private readonly LeagueConfigurationService _configurationService;
        private readonly NflPlayerDataService _nflPlayerService;
        private readonly NbaPlayerDataService _nbaPlayerService;
        private readonly MlbPlayerDataService _mlbPlayerService;

        public PlayerPoolService(
            FantasyLeagueContext context, 
            LeagueConfigurationService configurationService,
            NflPlayerDataService nflPlayerService,
            NbaPlayerDataService nbaPlayerService,
            MlbPlayerDataService mlbPlayerService)
        {
            _context = context;
            _configurationService = configurationService;
            _nflPlayerService = nflPlayerService;
            _nbaPlayerService = nbaPlayerService;
            _mlbPlayerService = mlbPlayerService;
        }

        public async Task<List<object>> GetAvailablePlayersForLeagueAsync(int leagueId)
        {
            // Get league configuration to determine which sports are enabled
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
            {
                return new List<object>();
            }

            // Get all keeper picks for this league
            var keeperPicks = await GetKeeperPicksForLeagueAsync(leagueId);
            var keeperPlayerIds = ExtractPlayerIdsFromPicks(keeperPicks);

            // Get all regular draft picks for this league (non-keeper picks)
            var regularDraftPicks = await GetRegularDraftPicksForLeagueAsync(leagueId);
            var draftedPlayerIds = ExtractPlayerIdsFromPicks(regularDraftPicks);

            // Combine all unavailable players
            var unavailablePlayerIds = new HashSet<string>(keeperPlayerIds.Union(draftedPlayerIds));

            // Get all players from the actual sport databases
            var allPlayers = await GetMasterPlayerPoolAsync(config);

            // Filter players based on league configuration and availability
            var availablePlayers = allPlayers.Where(p =>
            {
                var playerId = p.GetType().GetProperty("id")?.GetValue(p)?.ToString();
                var playerLeague = p.GetType().GetProperty("league")?.GetValue(p)?.ToString()?.ToUpper();

                if (playerId == null || playerLeague == null)
                    return false;

                // Check if player is already taken
                if (unavailablePlayerIds.Contains(playerId))
                    return false;

                // Check if player's sport is enabled in league
                return playerLeague switch
                {
                    "NFL" => config.IncludeNFL,
                    "MLB" => config.IncludeMLB,
                    "NBA" => config.IncludeNBA,
                    _ => false
                };
            }).ToList();

            return availablePlayers;
        }

        public async Task<List<DraftPick>> GetKeeperPicksForLeagueAsync(int leagueId)
        {
            return await _context.DraftPicks
                .Include(dp => dp.Draft)
                .Where(dp => dp.Draft.LeagueId == leagueId && dp.IsKeeperPick)
                .ToListAsync();
        }

        public async Task<List<DraftPick>> GetRegularDraftPicksForLeagueAsync(int leagueId)
        {
            return await _context.DraftPicks
                .Include(dp => dp.Draft)
                .Where(dp => dp.Draft.LeagueId == leagueId && !dp.IsKeeperPick)
                .ToListAsync();
        }

        public HashSet<string> ExtractPlayerIdsFromPicks(List<DraftPick> picks)
        {
            var playerIds = new HashSet<string>();

            foreach (var pick in picks)
            {
                if (!string.IsNullOrEmpty(pick.PlayerName))
                {
                    // Check if player name contains ID (format: "playerId:PlayerName")
                    if (pick.PlayerName.Contains(":"))
                    {
                        var playerId = pick.PlayerName.Split(':')[0];
                        playerIds.Add(playerId);
                    }
                    else
                    {
                        // For manual picks without ID format, try to map name to ID
                        var cleanPlayerName = pick.PlayerName.Replace(" (AUTO)", "").Trim();
                        var playerId = GetPlayerIdFromName(cleanPlayerName);
                        if (!string.IsNullOrEmpty(playerId))
                        {
                            playerIds.Add(playerId);
                        }
                    }
                }
            }

            return playerIds;
        }

        public string? GetPlayerIdFromName(string playerName)
        {
            // Comprehensive mapping of player names to IDs
            var nameToIdMap = new Dictionary<string, string>
            {
                // NFL Players
                {"Lamar Jackson", "lamar-jackson"},
                {"Josh Allen", "josh-allen"},
                {"Joe Burrow", "joe-burrow"},
                {"Jared Goff", "jared-goff"},
                {"Sam Darnold", "sam-darnold"},
                {"Baker Mayfield", "baker-mayfield"},
                {"Jayden Daniels", "jayden-daniels"},
                {"Patrick Mahomes", "patrick-mahomes"},
                {"Justin Herbert", "justin-herbert"},
                {"Geno Smith", "geno-smith"},
                {"Dak Prescott", "dak-prescott"},
                {"Tua Tagovailoa", "tua-tagovailoa"},
                {"Jordan Love", "jordan-love"},
                {"Caleb Williams", "caleb-williams"},
                {"Anthony Richardson", "anthony-richardson"},
                {"Brock Purdy", "brock-purdy"},
                {"Kyler Murray", "kyler-murray"},
                {"Saquon Barkley", "saquon-barkley"},
                {"Derrick Henry", "derrick-henry"},
                {"Bijan Robinson", "bijan-robinson"},
                {"Josh Jacobs", "josh-jacobs"},
                {"Jahmyr Gibbs", "jahmyr-gibbs"},
                {"Christian McCaffrey", "christian-mccaffrey"},
                {"Alvin Kamara", "alvin-kamara"},
                {"Kenneth Walker III", "kenneth-walker"},
                {"De'Von Achane", "de-von-achane"},
                {"Aaron Jones", "aaron-jones"},
                {"James Cook", "james-cook"},
                {"Ja'Marr Chase", "jamarr-chase"},
                {"Justin Jefferson", "justin-jefferson"},
                {"CeeDee Lamb", "ceedee-lamb"},
                {"Tyreek Hill", "tyreek-hill"},
                {"Amon-Ra St. Brown", "amon-ra-st-brown"},
                {"A.J. Brown", "aj-brown"},
                {"Mike Evans", "mike-evans"},
                {"Cooper Kupp", "cooper-kupp"},
                {"Davante Adams", "davante-adams"},
                {"Terry McLaurin", "terry-mclaurin"},
                {"Deebo Samuel", "deebo-samuel"},
                {"DJ Moore", "dj-moore"},
                {"Jaylen Waddle", "jaylen-waddle"},
                {"Malik Nabers", "malik-nabers"},
                {"Jordan Addison", "jordan-addison"},
                {"Brock Bowers", "brock-bowers"},
                {"Travis Kelce", "travis-kelce"},
                {"George Kittle", "george-kittle"},
                {"Trey McBride", "trey-mcbride"},
                {"T.J. Hockenson", "tj-hockenson"},
                {"Mark Andrews", "mark-andrews"},
                {"Jake Ferguson", "jake-ferguson"},
                {"Taysom Hill", "taysom-hill"},

                // NBA Players
                {"Giannis Antetokounmpo", "giannis-antetokounmpo"},
                {"Shai Gilgeous-Alexander", "shai-gilgeous-alexander"},
                {"Nikola Jokić", "nikola-jokic"},
                {"LeBron James", "lebron-james"},
                {"Stephen Curry", "stephen-curry"},
                {"Kevin Durant", "kevin-durant"},
                {"Jalen Brunson", "jalen-brunson"},
                {"Karl-Anthony Towns", "karl-anthony-towns"},
                {"Victor Wembanyama", "victor-wembanyama"},
                {"Evan Mobley", "evan-mobley"},
                {"Cade Cunningham", "cade-cunningham"},
                {"Tyler Herro", "tyler-herro"},
                {"Alperen Şengün", "alperen-sengun"},
                {"Anthony Davis", "anthony-davis"},
                {"Jayson Tatum", "jayson-tatum"},
                {"Jaylen Brown", "jaylen-brown"},
                {"Luka Dončić", "luka-doncic"},
                {"Joel Embiid", "joel-embiid"},
                {"Donovan Mitchell", "donovan-mitchell"},
                {"Darius Garland", "darius-garland"},

                // MLB Players
                {"Aaron Judge", "aaron-judge"},
                {"Juan Soto", "juan-soto"},
                {"Vladimir Guerrero Jr.", "vladimir-guerrero-jr"},
                {"José Altuve", "jose-altuve"},
                {"Yordan Alvarez", "yordan-alvarez"},
                {"Corey Seager", "corey-seager"},
                {"Adley Rutschman", "adley-rutschman"},
                {"Gunnar Henderson", "gunnar-henderson"},
                {"Bobby Witt Jr.", "bobby-witt-jr"},
                {"Shohei Ohtani", "shohei-ohtani"},
                {"Mookie Betts", "mookie-betts"},
                {"Freddie Freeman", "freddie-freeman"},
                {"Ronald Acuña Jr.", "ronald-acuna-jr"},
                {"Francisco Lindor", "francisco-lindor"},
                {"Pete Alonso", "pete-alonso"},
                {"Manny Machado", "manny-machado"},
                {"Christian Yelich", "christian-yelich"},
                {"Ketel Marte", "ketel-marte"},
                {"Tarik Skubal", "tarik-skubal"},
                {"Chris Sale", "chris-sale"},
                {"Corbin Burnes", "corbin-burnes"},
                {"Seth Lugo", "seth-lugo"},
                {"Emmanuel Clase", "emmanuel-clase"},
                {"Gerrit Cole", "gerrit-cole"},
                {"Zack Wheeler", "zack-wheeler"},
                {"Spencer Strider", "spencer-strider"}
            };

            return nameToIdMap.GetValueOrDefault(playerName);
        }

        public async Task<List<object>> GetMasterPlayerPoolAsync(LeagueConfiguration config)
        {
            var allPlayers = new List<object>();

            try
            {
                // Add NFL players if enabled
                if (config.IncludeNFL)
                {
                    var nflPlayers = await _nflPlayerService.GetActivePlayersAsync(pageSize: int.MaxValue);
                    foreach (var player in nflPlayers)
                    {
                        allPlayers.Add(new 
                        { 
                            id = player.PlayerID.ToString(),
                            name = player.FullName,
                            position = player.FantasyPosition,
                            team = player.Team,
                            league = "NFL"
                        });
                    }
                }

                // Add NBA players if enabled
                if (config.IncludeNBA)
                {
                    var nbaPlayers = await _nbaPlayerService.GetActivePlayersAsync(pageSize: int.MaxValue);
                    foreach (var player in nbaPlayers)
                    {
                        allPlayers.Add(new 
                        { 
                            id = player.PlayerID.ToString(),
                            name = player.FullName,
                            position = player.Position,
                            team = player.Team,
                            league = "NBA"
                        });
                    }
                }

                // Add MLB players if enabled
                if (config.IncludeMLB)
                {
                    var mlbPlayers = await _mlbPlayerService.GetActivePlayersAsync(pageSize: int.MaxValue);
                    foreach (var player in mlbPlayers)
                    {
                        allPlayers.Add(new 
                        { 
                            id = player.PlayerID.ToString(),
                            name = player.FullName,
                            position = player.Position,
                            team = player.Team,
                            league = "MLB"
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't throw to prevent draft from breaking
                // Could add logging here if needed
                Console.WriteLine($"Error loading player data: {ex.Message}");
            }

            return allPlayers;
        }

        public async Task<PlayerPoolStatsDto> GetPlayerPoolStatsAsync(int leagueId)
        {
            var config = await _configurationService.GetConfigurationAsync(leagueId);
            if (config == null)
            {
                return new PlayerPoolStatsDto();
            }

            var keeperPicks = await GetKeeperPicksForLeagueAsync(leagueId);
            var regularDraftPicks = await GetRegularDraftPicksForLeagueAsync(leagueId);
            var availablePlayers = await GetAvailablePlayersForLeagueAsync(leagueId);

            var allPlayersForStats = await GetMasterPlayerPoolAsync(config);
            var totalPlayers = allPlayersForStats
                .Count(p => 
                {
                    var playerLeague = p.GetType().GetProperty("league")?.GetValue(p)?.ToString()?.ToUpper();
                    return playerLeague switch
                    {
                        "NFL" => config.IncludeNFL,
                        "MLB" => config.IncludeMLB,
                        "NBA" => config.IncludeNBA,
                        _ => false
                    };
                });

            return new PlayerPoolStatsDto
            {
                TotalPlayers = totalPlayers,
                KeeperPicks = keeperPicks.Count,
                RegularDraftPicks = regularDraftPicks.Count,
                AvailablePlayers = availablePlayers.Count,
                KeeperPicksBySport = GetPickCountsBySport(keeperPicks),
                RegularDraftPicksBySport = GetPickCountsBySport(regularDraftPicks)
            };
        }

        private Dictionary<string, int> GetPickCountsBySport(List<DraftPick> picks)
        {
            return picks
                .GroupBy(p => p.PlayerLeague.ToUpper())
                .ToDictionary(g => g.Key, g => g.Count());
        }
    }

    public class PlayerPoolStatsDto
    {
        public int TotalPlayers { get; set; }
        public int KeeperPicks { get; set; }
        public int RegularDraftPicks { get; set; }
        public int AvailablePlayers { get; set; }
        public Dictionary<string, int> KeeperPicksBySport { get; set; } = new();
        public Dictionary<string, int> RegularDraftPicksBySport { get; set; } = new();
    }
}