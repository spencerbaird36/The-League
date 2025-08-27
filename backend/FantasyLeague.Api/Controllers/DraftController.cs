using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Data;
using System.Text.Json;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DraftController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public DraftController(FantasyLeagueContext context)
        {
            _context = context;
        }

        // Helper method to clean player names for frontend display
        private static string CleanPlayerNameForDisplay(string playerName)
        {
            if (string.IsNullOrEmpty(playerName)) return playerName;
            
            // Remove ID prefix if present (e.g., "aaron-rodgers:Aaron Rodgers" -> "Aaron Rodgers")
            var idPrefixMatch = playerName.Split(':', 2);
            if (idPrefixMatch.Length == 2)
            {
                playerName = idPrefixMatch[1].Trim();
            }
            
            // Remove "(AUTO)" suffix for auto-drafted players
            playerName = playerName.Replace(" (AUTO)", "").Trim();
            
            return playerName;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateDraft([FromBody] CreateDraftDto createDraftDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Check if draft already exists for this league
            var existingDraft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == createDraftDto.LeagueId);

            if (existingDraft != null)
            {
                return BadRequest(new { Message = "Draft already exists for this league" });
            }

            // Verify league exists
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == createDraftDto.LeagueId && l.IsActive);

            if (league == null)
            {
                return BadRequest(new { Message = "League not found" });
            }

            // Verify all draft order user IDs are valid league members
            var leagueUserIds = league.Users.Select(u => u.Id).ToHashSet();
            if (!createDraftDto.DraftOrder.All(userId => leagueUserIds.Contains(userId)))
            {
                return BadRequest(new { Message = "All users in draft order must be league members" });
            }

            var draft = new Draft
            {
                LeagueId = createDraftDto.LeagueId,
                DraftOrder = JsonSerializer.Serialize(createDraftDto.DraftOrder),
                CurrentTurn = 0,
                CurrentRound = 1,
                IsActive = false,
                IsCompleted = false
            };

            _context.Drafts.Add(draft);
            await _context.SaveChangesAsync();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                DraftOrder = createDraftDto.DraftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt
            };

            return CreatedAtAction(nameof(GetDraft), new { id = draft.Id }, response);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDraft(int id)
        {
            var draft = await _context.Drafts
                .Include(d => d.League)
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                LeagueName = draft.League.Name,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                DraftPicks = draft.DraftPicks.Select(dp => new
                {
                    Id = dp.Id,
                    UserId = dp.UserId,
                    UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                    Username = dp.User.Username,
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    PickedAt = dp.PickedAt
                }).OrderBy(dp => dp.PickNumber).ToList()
            };

            return Ok(response);
        }

        [HttpGet("league/{leagueId}")]
        public async Task<IActionResult> GetDraftByLeague(int leagueId)
        {
            var draft = await _context.Drafts
                .Include(d => d.League)
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId);

            if (draft == null)
            {
                return NotFound(new { Message = "No draft found for this league" });
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                LeagueName = draft.League.Name,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                DraftPicks = draft.DraftPicks.Select(dp => new
                {
                    Id = dp.Id,
                    UserId = dp.UserId,
                    UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                    Username = dp.User.Username,
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    PickedAt = dp.PickedAt
                }).OrderBy(dp => dp.PickNumber).ToList()
            };

            return Ok(response);
        }

        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartDraft(int id)
        {
            var draft = await _context.Drafts
                .Include(d => d.League)
                .Include(d => d.DraftPicks)
                    .ThenInclude(dp => dp.User)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            if (draft.IsActive)
            {
                return BadRequest(new { Message = "Draft is already active" });
            }

            if (draft.IsCompleted)
            {
                return BadRequest(new { Message = "Draft is already completed" });
            }

            draft.IsActive = true;
            draft.StartedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                LeagueName = draft.League.Name,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                DraftPicks = draft.DraftPicks.Select(dp => new
                {
                    Id = dp.Id,
                    UserId = dp.UserId,
                    UserFullName = dp.User.FirstName + " " + dp.User.LastName,
                    Username = dp.User.Username,
                    PlayerName = CleanPlayerNameForDisplay(dp.PlayerName),
                    PlayerPosition = dp.PlayerPosition,
                    PlayerTeam = dp.PlayerTeam,
                    PlayerLeague = dp.PlayerLeague,
                    PickNumber = dp.PickNumber,
                    Round = dp.Round,
                    RoundPick = dp.RoundPick,
                    PickedAt = dp.PickedAt
                }).OrderBy(dp => dp.PickNumber).ToList()
            };

            return Ok(response);
        }

        [HttpPost("{id}/pick")]
        public async Task<IActionResult> MakeDraftPick(int id, [FromBody] DraftPickDto draftPickDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            if (!draft.IsActive)
            {
                return BadRequest(new { Message = "Draft is not active" });
            }

            if (draft.IsCompleted)
            {
                return BadRequest(new { Message = "Draft is already completed" });
            }

            var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();

            // Calculate current picker using snake draft logic
            var totalPicks = draft.DraftPicks.Count;
            var teamCount = draftOrder.Count;
            var currentRoundIndex = totalPicks / teamCount; // 0-based round index
            var currentPickInRound = totalPicks % teamCount; // 0-based pick in round
            
            // For snake draft: even rounds (0, 2, 4...) go forward, odd rounds (1, 3, 5...) go backward
            int currentUserIndex;
            if (currentRoundIndex % 2 == 0)
            {
                // Even round (0, 2, 4...): forward order
                currentUserIndex = currentPickInRound;
            }
            else
            {
                // Odd round (1, 3, 5...): reverse order
                currentUserIndex = teamCount - 1 - currentPickInRound;
            }

            var currentUserId = draftOrder[currentUserIndex];
            if (currentUserId != draftPickDto.UserId)
            {
                return BadRequest(new { Message = "It's not your turn to pick" });
            }

            // Check if player is already drafted
            var existingPick = await _context.DraftPicks
                .FirstOrDefaultAsync(dp => dp.Draft.LeagueId == draft.LeagueId && 
                                         dp.PlayerName == draftPickDto.PlayerName);

            if (existingPick != null)
            {
                return BadRequest(new { Message = "Player has already been drafted" });
            }

            // Calculate pick numbers using snake draft logic
            var pickNumber = draft.DraftPicks.Count + 1;
            var roundPick = currentPickInRound + 1; // 1-based pick in round
            var actualRound = currentRoundIndex + 1; // 1-based round number

            var draftPick = new DraftPick
            {
                DraftId = draft.Id,
                UserId = draftPickDto.UserId,
                PlayerName = draftPickDto.PlayerName,
                PlayerPosition = draftPickDto.PlayerPosition,
                PlayerTeam = draftPickDto.PlayerTeam,
                PlayerLeague = draftPickDto.PlayerLeague,
                PickNumber = pickNumber,
                Round = actualRound,
                RoundPick = roundPick
            };

            _context.DraftPicks.Add(draftPick);

            // Also add to UserRoster table
            var userRoster = new UserRoster
            {
                UserId = draftPickDto.UserId,
                LeagueId = draft.LeagueId,
                DraftId = draft.Id,
                PlayerName = draftPickDto.PlayerName,
                PlayerPosition = draftPickDto.PlayerPosition,
                PlayerTeam = draftPickDto.PlayerTeam,
                PlayerLeague = draftPickDto.PlayerLeague,
                PickNumber = pickNumber,
                Round = actualRound
            };

            _context.UserRosters.Add(userRoster);

            // Update draft state for next pick using snake draft logic
            var nextTotalPicks = totalPicks + 1; // After this pick
            var nextRoundIndex = nextTotalPicks / teamCount;
            var nextPickInRound = nextTotalPicks % teamCount;
            
            // Calculate next picker index
            int nextUserIndex;
            if (nextRoundIndex % 2 == 0)
            {
                // Even round: forward order
                nextUserIndex = nextPickInRound;
            }
            else
            {
                // Odd round: reverse order
                nextUserIndex = teamCount - 1 - nextPickInRound;
            }
            
            // Update draft state
            draft.CurrentTurn = nextUserIndex;
            draft.CurrentRound = nextRoundIndex + 1; // 1-based round

            // Check if draft should be completed (simplified - you can add more complex logic)
            var maxRounds = 15; // Adjust based on your league settings
            if (draft.CurrentRound > maxRounds)
            {
                draft.IsActive = false;
                draft.IsCompleted = true;
                draft.CompletedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(draftPickDto.UserId);

            var response = new
            {
                Id = draftPick.Id,
                UserId = draftPick.UserId,
                UserFullName = user?.FirstName + " " + user?.LastName,
                Username = user?.Username,
                PlayerName = draftPick.PlayerName,
                PlayerPosition = draftPick.PlayerPosition,
                PlayerTeam = draftPick.PlayerTeam,
                PlayerLeague = draftPick.PlayerLeague,
                PickNumber = draftPick.PickNumber,
                Round = draftPick.Round,
                RoundPick = draftPick.RoundPick,
                PickedAt = draftPick.PickedAt,
                Draft = new
                {
                    CurrentTurn = draft.CurrentTurn,
                    CurrentRound = draft.CurrentRound,
                    IsCompleted = draft.IsCompleted,
                    NextUserId = draft.IsCompleted ? (int?)null : (nextTotalPicks < teamCount * 15 ? draftOrder[nextUserIndex] : (int?)null)
                }
            };

            return Ok(response);
        }

        [HttpPost("{id}/reset")]
        public async Task<IActionResult> ResetDraft(int id)
        {
            var draft = await _context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (draft == null)
            {
                return NotFound();
            }

            // Remove all draft picks
            _context.DraftPicks.RemoveRange(draft.DraftPicks);

            // Remove all user roster entries for this draft
            var userRosters = await _context.UserRosters
                .Where(ur => ur.DraftId == draft.Id)
                .ToListAsync();
            _context.UserRosters.RemoveRange(userRosters);

            // Remove all transactions for this league (free agent pickups and any future transaction types)
            var transactions = await _context.Transactions
                .Where(t => t.LeagueId == draft.LeagueId)
                .ToListAsync();
            _context.Transactions.RemoveRange(transactions);

            // Get current league members to update draft order with any new members
            var league = await _context.Leagues
                .Include(l => l.Users)
                .FirstOrDefaultAsync(l => l.Id == draft.LeagueId && l.IsActive);

            if (league == null)
            {
                return BadRequest(new { Message = "League not found" });
            }

            // Create new randomized draft order with current league members
            var currentMembers = league.Users.Select(u => u.Id).ToList();
            var random = new Random();
            var randomizedOrder = currentMembers.OrderBy(x => random.Next()).ToList();

            // Update draft with new order and reset state
            draft.DraftOrder = JsonSerializer.Serialize(randomizedOrder);
            draft.CurrentTurn = 0;
            draft.CurrentRound = 1;
            draft.IsActive = false;
            draft.IsCompleted = false;
            draft.StartedAt = null;
            draft.CompletedAt = null;

            await _context.SaveChangesAsync();

            var draftOrder = randomizedOrder;

            var response = new
            {
                Id = draft.Id,
                LeagueId = draft.LeagueId,
                DraftOrder = draftOrder,
                CurrentTurn = draft.CurrentTurn,
                CurrentRound = draft.CurrentRound,
                IsActive = draft.IsActive,
                IsCompleted = draft.IsCompleted,
                CreatedAt = draft.CreatedAt,
                StartedAt = draft.StartedAt,
                CompletedAt = draft.CompletedAt,
                Message = "Draft has been reset successfully"
            };

            return Ok(response);
        }

        [HttpGet("league/{leagueId}/available-players")]
        public async Task<IActionResult> GetAvailablePlayersForDraft(int leagueId)
        {
            var draft = await _context.Drafts
                .FirstOrDefaultAsync(d => d.LeagueId == leagueId);

            if (draft == null)
            {
                return NotFound(new { Message = "No draft found for this league" });
            }

            // Get draft picks separately to avoid Include issues
            var draftPicks = await _context.DraftPicks
                .Where(dp => dp.DraftId == draft.Id)
                .ToListAsync();

            // Extract player IDs from PlayerName field (format: "playerId:PlayerName (AUTO)" or just "PlayerName")
            var draftedPlayerIds = new HashSet<string>();
            if (draftPicks != null)
            {
                foreach (var pick in draftPicks)
                {
                    if (!string.IsNullOrEmpty(pick.PlayerName))
                    {
                        if (pick.PlayerName.Contains(":"))
                        {
                            // Format: "playerId:PlayerName (AUTO)"
                            var playerId = pick.PlayerName.Split(':')[0];
                            draftedPlayerIds.Add(playerId);
                        }
                        else
                        {
                            // For manual picks, we need to match by name to find the player ID
                            // Extract player name (remove (AUTO) if present)
                            var cleanPlayerName = pick.PlayerName.Replace(" (AUTO)", "").Trim();
                            
                            // Map player names to IDs (comprehensive mapping matching backend player pool)
                            var nameToIdMap = new Dictionary<string, string>
                            {
                                // NFL QBs
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
                                // NFL RBs
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
                                // NFL WRs
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
                                // NFL TEs
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
                            
                            if (nameToIdMap.ContainsKey(cleanPlayerName))
                            {
                                draftedPlayerIds.Add(nameToIdMap[cleanPlayerName]);
                            }
                        }
                    }
                }
            }

            // Complete player pool from frontend players.ts (all players)
            var allPlayers = new List<object>
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

            // Filter out already drafted players by ID
            var availablePlayers = allPlayers.Where(p => 
            {
                var playerId = p.GetType().GetProperty("id")?.GetValue(p)?.ToString();
                return playerId != null && !draftedPlayerIds.Contains(playerId);
            }).ToList();

            return Ok(new
            {
                TotalPlayers = allPlayers.Count,
                DraftedPlayers = draftedPlayerIds.Count,
                AvailablePlayers = availablePlayers.Count,
                Players = availablePlayers
            });
        }
    }
}