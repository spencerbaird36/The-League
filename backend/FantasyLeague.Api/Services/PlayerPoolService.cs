using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Services
{
    public class PlayerPoolService
    {
        private readonly FantasyLeagueContext _context;
        private readonly LeagueConfigurationService _configurationService;

        public PlayerPoolService(FantasyLeagueContext context, LeagueConfigurationService configurationService)
        {
            _context = context;
            _configurationService = configurationService;
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

            // Get all players from the master pool
            var allPlayers = GetMasterPlayerPool();

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

        public List<object> GetMasterPlayerPool()
        {
            return new List<object>
            {
                // NFL Players - Quarterbacks
                new { id = "lamar-jackson", name = "Lamar Jackson", position = "QB", team = "Baltimore Ravens", league = "NFL" },
                new { id = "josh-allen", name = "Josh Allen", position = "QB", team = "Buffalo Bills", league = "NFL" },
                new { id = "joe-burrow", name = "Joe Burrow", position = "QB", team = "Cincinnati Bengals", league = "NFL" },
                new { id = "jared-goff", name = "Jared Goff", position = "QB", team = "Detroit Lions", league = "NFL" },
                new { id = "sam-darnold", name = "Sam Darnold", position = "QB", team = "Minnesota Vikings", league = "NFL" },
                new { id = "baker-mayfield", name = "Baker Mayfield", position = "QB", team = "Tampa Bay Buccaneers", league = "NFL" },
                new { id = "jayden-daniels", name = "Jayden Daniels", position = "QB", team = "Washington Commanders", league = "NFL" },
                new { id = "patrick-mahomes", name = "Patrick Mahomes", position = "QB", team = "Kansas City Chiefs", league = "NFL" },
                new { id = "justin-herbert", name = "Justin Herbert", position = "QB", team = "Los Angeles Chargers", league = "NFL" },
                new { id = "geno-smith", name = "Geno Smith", position = "QB", team = "Seattle Seahawks", league = "NFL" },
                new { id = "dak-prescott", name = "Dak Prescott", position = "QB", team = "Dallas Cowboys", league = "NFL" },
                new { id = "tua-tagovailoa", name = "Tua Tagovailoa", position = "QB", team = "Miami Dolphins", league = "NFL" },
                new { id = "jordan-love", name = "Jordan Love", position = "QB", team = "Green Bay Packers", league = "NFL" },
                new { id = "caleb-williams", name = "Caleb Williams", position = "QB", team = "Chicago Bears", league = "NFL" },
                new { id = "anthony-richardson", name = "Anthony Richardson", position = "QB", team = "Indianapolis Colts", league = "NFL" },
                new { id = "brock-purdy", name = "Brock Purdy", position = "QB", team = "San Francisco 49ers", league = "NFL" },
                new { id = "kyler-murray", name = "Kyler Murray", position = "QB", team = "Arizona Cardinals", league = "NFL" },
                
                // NFL Running Backs
                new { id = "saquon-barkley", name = "Saquon Barkley", position = "RB", team = "Philadelphia Eagles", league = "NFL" },
                new { id = "derrick-henry", name = "Derrick Henry", position = "RB", team = "Baltimore Ravens", league = "NFL" },
                new { id = "bijan-robinson", name = "Bijan Robinson", position = "RB", team = "Atlanta Falcons", league = "NFL" },
                new { id = "josh-jacobs", name = "Josh Jacobs", position = "RB", team = "Green Bay Packers", league = "NFL" },
                new { id = "jahmyr-gibbs", name = "Jahmyr Gibbs", position = "RB", team = "Detroit Lions", league = "NFL" },
                new { id = "christian-mccaffrey", name = "Christian McCaffrey", position = "RB", team = "San Francisco 49ers", league = "NFL" },
                new { id = "alvin-kamara", name = "Alvin Kamara", position = "RB", team = "New Orleans Saints", league = "NFL" },
                new { id = "kenneth-walker", name = "Kenneth Walker III", position = "RB", team = "Seattle Seahawks", league = "NFL" },
                new { id = "de-von-achane", name = "De'Von Achane", position = "RB", team = "Miami Dolphins", league = "NFL" },
                new { id = "aaron-jones", name = "Aaron Jones", position = "RB", team = "Minnesota Vikings", league = "NFL" },
                new { id = "james-cook", name = "James Cook", position = "RB", team = "Buffalo Bills", league = "NFL" },
                
                // NFL Wide Receivers
                new { id = "jamarr-chase", name = "Ja'Marr Chase", position = "WR", team = "Cincinnati Bengals", league = "NFL" },
                new { id = "justin-jefferson", name = "Justin Jefferson", position = "WR", team = "Minnesota Vikings", league = "NFL" },
                new { id = "ceedee-lamb", name = "CeeDee Lamb", position = "WR", team = "Dallas Cowboys", league = "NFL" },
                new { id = "tyreek-hill", name = "Tyreek Hill", position = "WR", team = "Miami Dolphins", league = "NFL" },
                new { id = "amon-ra-st-brown", name = "Amon-Ra St. Brown", position = "WR", team = "Detroit Lions", league = "NFL" },
                new { id = "aj-brown", name = "A.J. Brown", position = "WR", team = "Philadelphia Eagles", league = "NFL" },
                new { id = "mike-evans", name = "Mike Evans", position = "WR", team = "Tampa Bay Buccaneers", league = "NFL" },
                new { id = "cooper-kupp", name = "Cooper Kupp", position = "WR", team = "Los Angeles Rams", league = "NFL" },
                new { id = "davante-adams", name = "Davante Adams", position = "WR", team = "New York Jets", league = "NFL" },
                new { id = "terry-mclaurin", name = "Terry McLaurin", position = "WR", team = "Washington Commanders", league = "NFL" },
                new { id = "deebo-samuel", name = "Deebo Samuel", position = "WR", team = "San Francisco 49ers", league = "NFL" },
                new { id = "dj-moore", name = "DJ Moore", position = "WR", team = "Chicago Bears", league = "NFL" },
                new { id = "jaylen-waddle", name = "Jaylen Waddle", position = "WR", team = "Miami Dolphins", league = "NFL" },
                new { id = "malik-nabers", name = "Malik Nabers", position = "WR", team = "New York Giants", league = "NFL" },
                new { id = "jordan-addison", name = "Jordan Addison", position = "WR", team = "Minnesota Vikings", league = "NFL" },
                
                // NFL Tight Ends
                new { id = "brock-bowers", name = "Brock Bowers", position = "TE", team = "Las Vegas Raiders", league = "NFL" },
                new { id = "travis-kelce", name = "Travis Kelce", position = "TE", team = "Kansas City Chiefs", league = "NFL" },
                new { id = "george-kittle", name = "George Kittle", position = "TE", team = "San Francisco 49ers", league = "NFL" },
                new { id = "trey-mcbride", name = "Trey McBride", position = "TE", team = "Arizona Cardinals", league = "NFL" },
                new { id = "tj-hockenson", name = "T.J. Hockenson", position = "TE", team = "Minnesota Vikings", league = "NFL" },
                new { id = "mark-andrews", name = "Mark Andrews", position = "TE", team = "Baltimore Ravens", league = "NFL" },
                new { id = "jake-ferguson", name = "Jake Ferguson", position = "TE", team = "Dallas Cowboys", league = "NFL" },
                new { id = "taysom-hill", name = "Taysom Hill", position = "TE", team = "New Orleans Saints", league = "NFL" },
                
                // NBA Players
                new { id = "giannis-antetokounmpo", name = "Giannis Antetokounmpo", position = "PF", team = "Milwaukee Bucks", league = "NBA" },
                new { id = "shai-gilgeous-alexander", name = "Shai Gilgeous-Alexander", position = "PG", team = "Oklahoma City Thunder", league = "NBA" },
                new { id = "nikola-jokic", name = "Nikola Jokić", position = "C", team = "Denver Nuggets", league = "NBA" },
                new { id = "lebron-james", name = "LeBron James", position = "SF", team = "Los Angeles Lakers", league = "NBA" },
                new { id = "stephen-curry", name = "Stephen Curry", position = "PG", team = "Golden State Warriors", league = "NBA" },
                new { id = "kevin-durant", name = "Kevin Durant", position = "PF", team = "Phoenix Suns", league = "NBA" },
                new { id = "jalen-brunson", name = "Jalen Brunson", position = "PG", team = "New York Knicks", league = "NBA" },
                new { id = "karl-anthony-towns", name = "Karl-Anthony Towns", position = "C", team = "New York Knicks", league = "NBA" },
                new { id = "victor-wembanyama", name = "Victor Wembanyama", position = "C", team = "San Antonio Spurs", league = "NBA" },
                new { id = "evan-mobley", name = "Evan Mobley", position = "PF", team = "Cleveland Cavaliers", league = "NBA" },
                new { id = "cade-cunningham", name = "Cade Cunningham", position = "PG", team = "Detroit Pistons", league = "NBA" },
                new { id = "tyler-herro", name = "Tyler Herro", position = "SG", team = "Miami Heat", league = "NBA" },
                new { id = "alperen-sengun", name = "Alperen Şengün", position = "C", team = "Houston Rockets", league = "NBA" },
                new { id = "anthony-davis", name = "Anthony Davis", position = "PF", team = "Los Angeles Lakers", league = "NBA" },
                new { id = "jayson-tatum", name = "Jayson Tatum", position = "SF", team = "Boston Celtics", league = "NBA" },
                new { id = "jaylen-brown", name = "Jaylen Brown", position = "SG", team = "Boston Celtics", league = "NBA" },
                new { id = "luka-doncic", name = "Luka Dončić", position = "PG", team = "Dallas Mavericks", league = "NBA" },
                new { id = "joel-embiid", name = "Joel Embiid", position = "C", team = "Philadelphia 76ers", league = "NBA" },
                new { id = "donovan-mitchell", name = "Donovan Mitchell", position = "SG", team = "Cleveland Cavaliers", league = "NBA" },
                new { id = "darius-garland", name = "Darius Garland", position = "PG", team = "Cleveland Cavaliers", league = "NBA" },
                
                // MLB Players
                new { id = "aaron-judge", name = "Aaron Judge", position = "OF", team = "New York Yankees", league = "MLB" },
                new { id = "juan-soto", name = "Juan Soto", position = "OF", team = "New York Yankees", league = "MLB" },
                new { id = "vladimir-guerrero-jr", name = "Vladimir Guerrero Jr.", position = "1B", team = "Toronto Blue Jays", league = "MLB" },
                new { id = "jose-altuve", name = "José Altuve", position = "2B", team = "Houston Astros", league = "MLB" },
                new { id = "yordan-alvarez", name = "Yordan Alvarez", position = "DH", team = "Houston Astros", league = "MLB" },
                new { id = "corey-seager", name = "Corey Seager", position = "SS", team = "Texas Rangers", league = "MLB" },
                new { id = "adley-rutschman", name = "Adley Rutschman", position = "C", team = "Baltimore Orioles", league = "MLB" },
                new { id = "gunnar-henderson", name = "Gunnar Henderson", position = "SS", team = "Baltimore Orioles", league = "MLB" },
                new { id = "bobby-witt-jr", name = "Bobby Witt Jr.", position = "SS", team = "Kansas City Royals", league = "MLB" },
                new { id = "shohei-ohtani", name = "Shohei Ohtani", position = "DH", team = "Los Angeles Dodgers", league = "MLB" },
                new { id = "mookie-betts", name = "Mookie Betts", position = "OF", team = "Los Angeles Dodgers", league = "MLB" },
                new { id = "freddie-freeman", name = "Freddie Freeman", position = "1B", team = "Los Angeles Dodgers", league = "MLB" },
                new { id = "ronald-acuna-jr", name = "Ronald Acuña Jr.", position = "OF", team = "Atlanta Braves", league = "MLB" },
                new { id = "francisco-lindor", name = "Francisco Lindor", position = "SS", team = "New York Mets", league = "MLB" },
                new { id = "pete-alonso", name = "Pete Alonso", position = "1B", team = "New York Mets", league = "MLB" },
                new { id = "manny-machado", name = "Manny Machado", position = "3B", team = "San Diego Padres", league = "MLB" },
                new { id = "christian-yelich", name = "Christian Yelich", position = "OF", team = "Milwaukee Brewers", league = "MLB" },
                new { id = "ketel-marte", name = "Ketel Marte", position = "2B", team = "Arizona Diamondbacks", league = "MLB" },
                new { id = "tarik-skubal", name = "Tarik Skubal", position = "SP", team = "Detroit Tigers", league = "MLB" },
                new { id = "chris-sale", name = "Chris Sale", position = "SP", team = "Atlanta Braves", league = "MLB" },
                new { id = "corbin-burnes", name = "Corbin Burnes", position = "SP", team = "Baltimore Orioles", league = "MLB" },
                new { id = "seth-lugo", name = "Seth Lugo", position = "SP", team = "Kansas City Royals", league = "MLB" },
                new { id = "emmanuel-clase", name = "Emmanuel Clase", position = "CP", team = "Cleveland Guardians", league = "MLB" },
                new { id = "gerrit-cole", name = "Gerrit Cole", position = "SP", team = "New York Yankees", league = "MLB" },
                new { id = "zack-wheeler", name = "Zack Wheeler", position = "SP", team = "Philadelphia Phillies", league = "MLB" },
                new { id = "spencer-strider", name = "Spencer Strider", position = "SP", team = "Atlanta Braves", league = "MLB" }
            };
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

            var totalPlayers = GetMasterPlayerPool()
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