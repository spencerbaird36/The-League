using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    public class PlayerLookupRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Position { get; set; } = string.Empty;
        public string Team { get; set; } = string.Empty;
        public string League { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class PlayerController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<PlayerController> _logger;

        public PlayerController(FantasyLeagueContext context, ILogger<PlayerController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetPlayerStats(int id)
        {
            try
            {
                var player = await _context.Players.FirstOrDefaultAsync(p => p.Id == id);

                if (player == null)
                {
                    return NotFound(new { error = "Player not found" });
                }

                // Transform player entity to stats object based on league
                var stats = GenerateStatsFromPlayer(player);
                
                return Ok(new
                {
                    id = player.Id.ToString(),
                    name = player.Name,
                    position = player.Position,
                    team = player.Team,
                    league = player.League,
                    stats = stats
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching stats for player ID: {PlayerId}", id);
                return StatusCode(500, new { error = "Failed to fetch player stats" });
            }
        }

        [HttpPost("get-or-create")]
        public async Task<ActionResult<object>> GetOrCreatePlayer([FromBody] PlayerLookupRequest request)
        {
            try
            {
                // First try to find existing player
                var existingPlayer = await _context.Players
                    .FirstOrDefaultAsync(p => p.Name.ToLower() == request.Name.ToLower() 
                                            && p.League.ToLower() == request.League.ToLower());

                if (existingPlayer != null)
                {
                    var existingStats = GenerateStatsFromPlayer(existingPlayer);
                    return Ok(new
                    {
                        id = existingPlayer.Id.ToString(),
                        name = existingPlayer.Name,
                        position = existingPlayer.Position,
                        team = existingPlayer.Team,
                        league = existingPlayer.League,
                        stats = existingStats
                    });
                }

                // Create new player with mock stats
                var newPlayer = new Player
                {
                    Name = request.Name,
                    Position = request.Position,
                    Team = request.Team,
                    League = request.League
                };

                // Generate and populate mock stats based on league and position
                PopulateMockStatsForPlayer(newPlayer);

                _context.Players.Add(newPlayer);
                await _context.SaveChangesAsync();

                var newStats = GenerateStatsFromPlayer(newPlayer);
                return Ok(new
                {
                    id = newPlayer.Id.ToString(),
                    name = newPlayer.Name,
                    position = newPlayer.Position,
                    team = newPlayer.Team,
                    league = newPlayer.League,
                    stats = newStats
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting or creating player: {PlayerName}", request.Name);
                return StatusCode(500, new { error = "Failed to get or create player" });
            }
        }

        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<object>>> SearchPlayers([FromQuery] string query, [FromQuery] string? league = null)
        {
            try
            {
                var playersQuery = _context.Players.AsQueryable();
                
                // Search by name (case-insensitive)
                if (!string.IsNullOrEmpty(query))
                {
                    playersQuery = playersQuery.Where(p => p.Name.ToLower().Contains(query.ToLower()));
                }
                
                // Optional league filter
                if (!string.IsNullOrEmpty(league))
                {
                    playersQuery = playersQuery.Where(p => p.League.ToLower() == league.ToLower());
                }

                var players = await playersQuery
                    .Take(20) // Limit results
                    .Select(p => new
                    {
                        id = p.Id.ToString(),
                        name = p.Name,
                        position = p.Position,
                        team = p.Team,
                        league = p.League
                    })
                    .ToListAsync();

                return Ok(players);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching players with query: {Query}", query);
                return StatusCode(500, new { error = "Failed to search players" });
            }
        }

        private Dictionary<string, object> GenerateStatsFromPlayer(Player player)
        {
            var stats = new Dictionary<string, object>();

            switch (player.League.ToUpper())
            {
                case "NFL":
                    if (player.PassingYards.HasValue) stats["Passing Yards"] = player.PassingYards.Value;
                    if (player.PassingTouchdowns.HasValue) stats["Passing TDs"] = player.PassingTouchdowns.Value;
                    if (player.Interceptions.HasValue) stats["Interceptions"] = player.Interceptions.Value;
                    if (player.RushingYards.HasValue) stats["Rushing Yards"] = player.RushingYards.Value;
                    if (player.RushingTouchdowns.HasValue) stats["Rushing TDs"] = player.RushingTouchdowns.Value;
                    if (player.ReceivingYards.HasValue) stats["Receiving Yards"] = player.ReceivingYards.Value;
                    if (player.ReceivingTouchdowns.HasValue) stats["Receiving TDs"] = player.ReceivingTouchdowns.Value;
                    if (player.Receptions.HasValue) stats["Receptions"] = player.Receptions.Value;
                    break;

                case "NBA":
                    if (player.PointsPerGame.HasValue) stats["PPG"] = player.PointsPerGame.Value;
                    if (player.ReboundsPerGame.HasValue) stats["RPG"] = player.ReboundsPerGame.Value;
                    if (player.AssistsPerGame.HasValue) stats["APG"] = player.AssistsPerGame.Value;
                    if (player.FieldGoalPercentage.HasValue) stats["FG%"] = $"{player.FieldGoalPercentage.Value:P1}";
                    if (player.ThreePointPercentage.HasValue) stats["3P%"] = $"{player.ThreePointPercentage.Value:P1}";
                    if (player.StealsPerGame.HasValue) stats["SPG"] = player.StealsPerGame.Value;
                    if (player.BlocksPerGame.HasValue) stats["BPG"] = player.BlocksPerGame.Value;
                    break;

                case "MLB":
                    if (player.Position == "SP" || player.Position == "CP")
                    {
                        // Pitcher stats
                        if (player.EarnedRunAverage.HasValue) stats["ERA"] = player.EarnedRunAverage.Value;
                        if (player.Wins.HasValue) stats["Wins"] = player.Wins.Value;
                        if (player.Losses.HasValue) stats["Losses"] = player.Losses.Value;
                        if (player.Strikeouts.HasValue) stats["Strikeouts"] = player.Strikeouts.Value;
                        if (player.Saves.HasValue && player.Position == "CP") stats["Saves"] = player.Saves.Value;
                        if (player.WHIP.HasValue) stats["WHIP"] = player.WHIP.Value;
                    }
                    else
                    {
                        // Batter stats
                        if (player.BattingAverage.HasValue) stats["BA"] = player.BattingAverage.Value.ToString("F3");
                        if (player.HomeRuns.HasValue) stats["HR"] = player.HomeRuns.Value;
                        if (player.RunsBattedIn.HasValue) stats["RBI"] = player.RunsBattedIn.Value;
                        if (player.Runs.HasValue) stats["Runs"] = player.Runs.Value;
                        if (player.Hits.HasValue) stats["Hits"] = player.Hits.Value;
                        if (player.StolenBases.HasValue) stats["SB"] = player.StolenBases.Value;
                    }
                    break;
            }

            if (player.GamesPlayed.HasValue) stats["Games"] = player.GamesPlayed.Value;

            return stats;
        }

        private void PopulateMockStatsForPlayer(Player player)
        {
            var random = new Random(player.Name.GetHashCode()); // Consistent mock data based on name

            switch (player.League.ToUpper())
            {
                case "NFL":
                    switch (player.Position)
                    {
                        case "QB":
                            player.PassingYards = random.Next(2500, 5000);
                            player.PassingTouchdowns = random.Next(15, 40);
                            player.Interceptions = random.Next(5, 18);
                            break;
                        case "RB":
                            player.RushingYards = random.Next(400, 1800);
                            player.RushingTouchdowns = random.Next(2, 20);
                            player.Receptions = random.Next(20, 80);
                            player.ReceivingYards = random.Next(100, 800);
                            break;
                        case "WR":
                        case "TE":
                            player.ReceivingYards = random.Next(300, 1600);
                            player.ReceivingTouchdowns = random.Next(2, 18);
                            player.Receptions = random.Next(30, 120);
                            break;
                    }
                    player.GamesPlayed = random.Next(12, 17);
                    break;

                case "NBA":
                    player.PointsPerGame = Math.Round(random.NextDouble() * 25 + 5, 1);
                    player.ReboundsPerGame = Math.Round(random.NextDouble() * 12 + 2, 1);
                    player.AssistsPerGame = Math.Round(random.NextDouble() * 10 + 1, 1);
                    player.FieldGoalPercentage = Math.Round(random.NextDouble() * 0.25 + 0.35, 3);
                    player.ThreePointPercentage = Math.Round(random.NextDouble() * 0.2 + 0.25, 3);
                    player.StealsPerGame = Math.Round(random.NextDouble() * 2.5 + 0.5, 1);
                    player.BlocksPerGame = Math.Round(random.NextDouble() * 2.5 + 0.2, 1);
                    player.GamesPlayed = random.Next(60, 82);
                    break;

                case "MLB":
                    if (player.Position == "SP" || player.Position == "CP")
                    {
                        // Pitcher stats
                        player.EarnedRunAverage = Math.Round(random.NextDouble() * 3 + 2, 2);
                        player.Wins = random.Next(5, 20);
                        player.Losses = random.Next(2, 15);
                        player.Strikeouts = random.Next(80, 250);
                        player.WHIP = Math.Round(random.NextDouble() * 0.8 + 1.0, 2);
                        if (player.Position == "CP") player.Saves = random.Next(10, 45);
                    }
                    else
                    {
                        // Batter stats
                        player.BattingAverage = Math.Round(random.NextDouble() * 0.15 + 0.22, 3);
                        player.HomeRuns = random.Next(5, 45);
                        player.RunsBattedIn = random.Next(30, 120);
                        player.Runs = random.Next(40, 110);
                        player.Hits = random.Next(80, 200);
                        player.StolenBases = random.Next(2, 30);
                    }
                    player.GamesPlayed = random.Next(120, 162);
                    break;
            }
        }

        private object GenerateMockStats(string name, string? league)
        {
            // Generate realistic mock stats for demonstration
            var random = new Random(name.GetHashCode()); // Consistent mock data based on name
            var stats = new Dictionary<string, object>();

            switch (league?.ToUpper())
            {
                case "NFL":
                    // Generate different stats based on common positions
                    var nflPositions = new[] { "QB", "RB", "WR", "TE" };
                    var position = nflPositions[random.Next(nflPositions.Length)];
                    
                    switch (position)
                    {
                        case "QB":
                            stats["Passing Yards"] = random.Next(2500, 5000);
                            stats["Passing TDs"] = random.Next(15, 40);
                            stats["Interceptions"] = random.Next(5, 18);
                            break;
                        case "RB":
                            stats["Rushing Yards"] = random.Next(400, 1800);
                            stats["Rushing TDs"] = random.Next(2, 20);
                            stats["Receptions"] = random.Next(20, 80);
                            break;
                        case "WR":
                        case "TE":
                            stats["Receiving Yards"] = random.Next(300, 1600);
                            stats["Receiving TDs"] = random.Next(2, 18);
                            stats["Receptions"] = random.Next(30, 120);
                            break;
                    }
                    stats["Games"] = random.Next(12, 17);
                    
                    return new
                    {
                        id = random.Next(1000, 9999).ToString(),
                        name,
                        position,
                        team = "TBD",
                        league = "NFL",
                        stats
                    };

                case "NBA":
                    var nbaPositions = new[] { "PG", "SG", "SF", "PF", "C" };
                    var nbaPosition = nbaPositions[random.Next(nbaPositions.Length)];
                    
                    stats["PPG"] = Math.Round(random.NextDouble() * 25 + 5, 1);
                    stats["RPG"] = Math.Round(random.NextDouble() * 12 + 2, 1);
                    stats["APG"] = Math.Round(random.NextDouble() * 10 + 1, 1);
                    stats["FG%"] = $"{random.Next(35, 60)}%";
                    stats["3P%"] = $"{random.Next(25, 45)}%";
                    stats["Games"] = random.Next(60, 82);
                    
                    return new
                    {
                        id = random.Next(1000, 9999).ToString(),
                        name,
                        position = nbaPosition,
                        team = "TBD",
                        league = "NBA",
                        stats
                    };

                case "MLB":
                    var mlbPositions = new[] { "SP", "CP", "1B", "2B", "3B", "SS", "OF" };
                    var mlbPosition = mlbPositions[random.Next(mlbPositions.Length)];
                    
                    if (mlbPosition == "SP" || mlbPosition == "CP")
                    {
                        // Pitcher stats
                        stats["ERA"] = Math.Round(random.NextDouble() * 3 + 2, 2);
                        stats["Wins"] = random.Next(5, 20);
                        stats["Strikeouts"] = random.Next(80, 250);
                        stats["WHIP"] = Math.Round(random.NextDouble() * 0.8 + 1.0, 2);
                        if (mlbPosition == "CP") stats["Saves"] = random.Next(10, 45);
                    }
                    else
                    {
                        // Batter stats
                        stats["BA"] = (random.NextDouble() * 0.15 + 0.22).ToString("F3");
                        stats["HR"] = random.Next(5, 45);
                        stats["RBI"] = random.Next(30, 120);
                        stats["Runs"] = random.Next(40, 110);
                        stats["SB"] = random.Next(2, 30);
                    }
                    stats["Games"] = random.Next(120, 162);
                    
                    return new
                    {
                        id = random.Next(1000, 9999).ToString(),
                        name,
                        position = mlbPosition,
                        team = "TBD",
                        league = "MLB",
                        stats
                    };

                default:
                    // Unknown league, return basic info
                    return new
                    {
                        id = random.Next(1000, 9999).ToString(),
                        name,
                        position = "UNKNOWN",
                        team = "TBD", 
                        league = league ?? "UNKNOWN",
                        stats = new Dictionary<string, object> { ["Info"] = "Stats not available" }
                    };
            }
        }
    }
}