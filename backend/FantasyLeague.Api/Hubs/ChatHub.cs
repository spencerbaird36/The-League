using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.DTOs;
using System.Collections.Concurrent;
using System.Text.Json;

namespace FantasyLeague.Api.Hubs
{
    public class ChatHub : Hub
    {
        private readonly FantasyLeagueContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private static readonly ConcurrentDictionary<string, UserConnection> _connections = new();
        private static readonly ConcurrentDictionary<int, Timer> _draftTimers = new();
        private static readonly ConcurrentDictionary<int, DateTime> _timerStartTimes = new();
        private static IServiceProvider? _staticServiceProvider;

        public ChatHub(FantasyLeagueContext context, IHubContext<ChatHub> hubContext, IServiceProvider serviceProvider)
        {
            _context = context;
            _hubContext = hubContext;
        }
        
        public static void InitializeServiceProvider(IServiceProvider serviceProvider)
        {
            _staticServiceProvider = serviceProvider;
            Console.WriteLine("✅ Static service provider initialized for ChatHub timer callbacks");
        }

        // Helper method to calculate current user using snake draft logic
        private static (int currentUserIndex, int currentUserId) GetCurrentDraftUser(List<int> draftOrder, int totalPicks)
        {
            var teamCount = draftOrder.Count;
            
            Console.WriteLine($"🐍 SNAKE DRAFT DEBUG - TotalPicks: {totalPicks}, TeamCount: {teamCount}");
            Console.WriteLine($"🐍 DraftOrder: [{string.Join(", ", draftOrder)}]");
            
            // Create the full snake draft sequence
            var snakeSequence = new List<int>();
            var maxRounds = 34; // Total rounds in the draft
            
            for (int round = 0; round < maxRounds; round++)
            {
                if (round % 2 == 0)
                {
                    // Even rounds: forward order (0, 2, 4...)
                    for (int i = 0; i < teamCount; i++)
                    {
                        snakeSequence.Add(draftOrder[i]);
                    }
                }
                else
                {
                    // Odd rounds: reverse order (1, 3, 5...)
                    for (int i = teamCount - 1; i >= 0; i--)
                    {
                        snakeSequence.Add(draftOrder[i]);
                    }
                }
            }
            
            // Get current user from the sequence
            if (totalPicks < snakeSequence.Count)
            {
                var currentUserId = snakeSequence[totalPicks];
                var currentUserIndex = draftOrder.IndexOf(currentUserId);
                
                Console.WriteLine($"🐍 Pick #{totalPicks} → UserId: {currentUserId} (UserIndex: {currentUserIndex})");
                Console.WriteLine($"🐍 Next few picks: [{string.Join(", ", snakeSequence.Skip(totalPicks).Take(5))}]");
                
                return (currentUserIndex, currentUserId);
            }
            
            // Draft completed
            Console.WriteLine($"🐍 Draft completed - total picks: {totalPicks}");
            return (-1, 0);
        }

        // Simple player class for auto-draft
        public class AutoDraftPlayer
        {
            public string Id { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public string Position { get; set; } = string.Empty;
            public string Team { get; set; } = string.Empty;
            public string League { get; set; } = string.Empty;
        }

        private async Task<List<AutoDraftPlayer>> GetAvailablePlayersFromAPI(string leagueId, FantasyLeagueContext context)
        {
            // Get already drafted players by their IDs - using same logic as DraftController
            var draft = await context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId));

            // Extract player IDs from PlayerName field (format: "playerId:PlayerName (AUTO)" or just "PlayerName")
            var draftedPlayerIds = new HashSet<string>();
            if (draft?.DraftPicks != null)
            {
                foreach (var pick in draft.DraftPicks)
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
                            
                            // Map common player names to IDs (this should match the backend player pool)
                            var nameToIdMap = new Dictionary<string, string>
                            {
                                {"Lamar Jackson", "lamar-jackson"},
                                {"Josh Allen", "josh-allen"},
                                {"Joe Burrow", "joe-burrow"},
                                {"Jared Goff", "jared-goff"},
                                {"Tua Tagovailoa", "tua-tagovailoa"},
                                {"Aaron Rodgers", "aaron-rodgers"},
                                {"Dak Prescott", "dak-prescott"},
                                {"Christian McCaffrey", "christian-mccaffrey"},
                                {"Austin Ekeler", "austin-ekeler"},
                                {"Josh Jacobs", "josh-jacobs"},
                                {"Saquon Barkley", "saquon-barkley"},
                                {"Derrick Henry", "derrick-henry"},
                                {"Nick Chubb", "nick-chubb"},
                                {"Tyreek Hill", "tyreek-hill"},
                                {"Davante Adams", "davante-adams"},
                                {"Stefon Diggs", "stefon-diggs"},
                                {"Amon-Ra St. Brown", "amon-ra-st-brown"},
                                {"CeeDee Lamb", "ceedee-lamb"},
                                {"Ja'Marr Chase", "jamarr-chase"},
                                {"Travis Kelce", "travis-kelce"},
                                {"Mark Andrews", "mark-andrews"},
                                {"T.J. Hockenson", "tj-hockenson"},
                                {"George Kittle", "george-kittle"},
                                {"Sam LaPorta", "sam-laporta"},
                                {"Justin Tucker", "justin-tucker"},
                                {"Harrison Butker", "harrison-butker"},
                                {"Tyler Bass", "tyler-bass"},
                                {"LeBron James", "lebron-james"},
                                {"Stephen Curry", "stephen-curry"},
                                {"Giannis Antetokounmpo", "giannis-antetokounmpo"},
                                {"Luka Doncic", "luka-doncic"},
                                {"Jayson Tatum", "jayson-tatum"},
                                {"Mike Trout", "mike-trout"},
                                {"Mookie Betts", "mookie-betts"},
                                {"Aaron Judge", "aaron-judge"},
                                {"Ronald Acuña Jr.", "ronald-acuna-jr"},
                                {"Shohei Ohtani", "shohei-ohtani"}
                            };
                            
                            if (nameToIdMap.ContainsKey(cleanPlayerName))
                            {
                                draftedPlayerIds.Add(nameToIdMap[cleanPlayerName]);
                            }
                        }
                    }
                }
            }

            // Player pool matching frontend players.ts (subset with same IDs)
            var allPlayers = new List<AutoDraftPlayer>
            {
                // NFL Quarterbacks
                new AutoDraftPlayer { Id = "lamar-jackson", Name = "Lamar Jackson", Position = "QB", Team = "Baltimore Ravens", League = "NFL" },
                new AutoDraftPlayer { Id = "josh-allen", Name = "Josh Allen", Position = "QB", Team = "Buffalo Bills", League = "NFL" },
                new AutoDraftPlayer { Id = "joe-burrow", Name = "Joe Burrow", Position = "QB", Team = "Cincinnati Bengals", League = "NFL" },
                new AutoDraftPlayer { Id = "jared-goff", Name = "Jared Goff", Position = "QB", Team = "Detroit Lions", League = "NFL" },
                new AutoDraftPlayer { Id = "tua-tagovailoa", Name = "Tua Tagovailoa", Position = "QB", Team = "Miami Dolphins", League = "NFL" },
                new AutoDraftPlayer { Id = "aaron-rodgers", Name = "Aaron Rodgers", Position = "QB", Team = "New York Jets", League = "NFL" },
                new AutoDraftPlayer { Id = "dak-prescott", Name = "Dak Prescott", Position = "QB", Team = "Dallas Cowboys", League = "NFL" },
                
                // NFL Running Backs
                new AutoDraftPlayer { Id = "christian-mccaffrey", Name = "Christian McCaffrey", Position = "RB", Team = "San Francisco 49ers", League = "NFL" },
                new AutoDraftPlayer { Id = "austin-ekeler", Name = "Austin Ekeler", Position = "RB", Team = "Washington Commanders", League = "NFL" },
                new AutoDraftPlayer { Id = "josh-jacobs", Name = "Josh Jacobs", Position = "RB", Team = "Green Bay Packers", League = "NFL" },
                new AutoDraftPlayer { Id = "saquon-barkley", Name = "Saquon Barkley", Position = "RB", Team = "Philadelphia Eagles", League = "NFL" },
                new AutoDraftPlayer { Id = "derrick-henry", Name = "Derrick Henry", Position = "RB", Team = "Baltimore Ravens", League = "NFL" },
                new AutoDraftPlayer { Id = "nick-chubb", Name = "Nick Chubb", Position = "RB", Team = "Cleveland Browns", League = "NFL" },
                
                // NFL Wide Receivers
                new AutoDraftPlayer { Id = "tyreek-hill", Name = "Tyreek Hill", Position = "WR", Team = "Miami Dolphins", League = "NFL" },
                new AutoDraftPlayer { Id = "davante-adams", Name = "Davante Adams", Position = "WR", Team = "New York Jets", League = "NFL" },
                new AutoDraftPlayer { Id = "stefon-diggs", Name = "Stefon Diggs", Position = "WR", Team = "Houston Texans", League = "NFL" },
                new AutoDraftPlayer { Id = "amon-ra-st-brown", Name = "Amon-Ra St. Brown", Position = "WR", Team = "Detroit Lions", League = "NFL" },
                new AutoDraftPlayer { Id = "ceedee-lamb", Name = "CeeDee Lamb", Position = "WR", Team = "Dallas Cowboys", League = "NFL" },
                new AutoDraftPlayer { Id = "jamarr-chase", Name = "Ja'Marr Chase", Position = "WR", Team = "Cincinnati Bengals", League = "NFL" },
                
                // NFL Tight Ends
                new AutoDraftPlayer { Id = "travis-kelce", Name = "Travis Kelce", Position = "TE", Team = "Kansas City Chiefs", League = "NFL" },
                new AutoDraftPlayer { Id = "mark-andrews", Name = "Mark Andrews", Position = "TE", Team = "Baltimore Ravens", League = "NFL" },
                new AutoDraftPlayer { Id = "tj-hockenson", Name = "T.J. Hockenson", Position = "TE", Team = "Minnesota Vikings", League = "NFL" },
                new AutoDraftPlayer { Id = "george-kittle", Name = "George Kittle", Position = "TE", Team = "San Francisco 49ers", League = "NFL" },
                new AutoDraftPlayer { Id = "sam-laporta", Name = "Sam LaPorta", Position = "TE", Team = "Detroit Lions", League = "NFL" },
                
                // NFL Kickers
                new AutoDraftPlayer { Id = "justin-tucker", Name = "Justin Tucker", Position = "K", Team = "Baltimore Ravens", League = "NFL" },
                new AutoDraftPlayer { Id = "harrison-butker", Name = "Harrison Butker", Position = "K", Team = "Kansas City Chiefs", League = "NFL" },
                new AutoDraftPlayer { Id = "tyler-bass", Name = "Tyler Bass", Position = "K", Team = "Buffalo Bills", League = "NFL" },
                
                // NBA Players
                new AutoDraftPlayer { Id = "lebron-james", Name = "LeBron James", Position = "SF", Team = "Los Angeles Lakers", League = "NBA" },
                new AutoDraftPlayer { Id = "stephen-curry", Name = "Stephen Curry", Position = "PG", Team = "Golden State Warriors", League = "NBA" },
                new AutoDraftPlayer { Id = "giannis-antetokounmpo", Name = "Giannis Antetokounmpo", Position = "PF", Team = "Milwaukee Bucks", League = "NBA" },
                new AutoDraftPlayer { Id = "luka-doncic", Name = "Luka Doncic", Position = "PG", Team = "Dallas Mavericks", League = "NBA" },
                new AutoDraftPlayer { Id = "jayson-tatum", Name = "Jayson Tatum", Position = "SF", Team = "Boston Celtics", League = "NBA" },
                
                // MLB Players
                new AutoDraftPlayer { Id = "mike-trout", Name = "Mike Trout", Position = "OF", Team = "Los Angeles Angels", League = "MLB" },
                new AutoDraftPlayer { Id = "mookie-betts", Name = "Mookie Betts", Position = "OF", Team = "Los Angeles Dodgers", League = "MLB" },
                new AutoDraftPlayer { Id = "aaron-judge", Name = "Aaron Judge", Position = "OF", Team = "New York Yankees", League = "MLB" },
                new AutoDraftPlayer { Id = "ronald-acuna-jr", Name = "Ronald Acuña Jr.", Position = "OF", Team = "Atlanta Braves", League = "MLB" },
                new AutoDraftPlayer { Id = "shohei-ohtani", Name = "Shohei Ohtani", Position = "DH", Team = "Los Angeles Dodgers", League = "MLB" }
            };

            // Filter out already drafted players by ID
            var availablePlayers = allPlayers.Where(p => !draftedPlayerIds.Contains(p.Id)).ToList();
            
            Console.WriteLine($"🎯 Found {availablePlayers.Count} available players for auto-draft (out of {allPlayers.Count} total)");
            Console.WriteLine($"🎯 Drafted player IDs: [{string.Join(", ", draftedPlayerIds)}]");
            
            return availablePlayers;
        }

        public class UserConnection
        {
            public string ConnectionId { get; set; } = string.Empty;
            public int UserId { get; set; }
            public string Username { get; set; } = string.Empty;
            public int LeagueId { get; set; }
            public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
        }

        public async Task JoinLeague(string leagueId, string userId)
        {
            Console.WriteLine($"🔗🔗🔗 JoinLeague called - League: {leagueId}, User: {userId}");
            Console.WriteLine($"Connection ID: {Context.ConnectionId}");
            
            // Verify user is in the league
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == int.Parse(userId) && u.LeagueId == int.Parse(leagueId));

            if (user != null)
            {
                Console.WriteLine($"✅ User verified: {user.Username} (ID: {user.Id})");
                
                // Add to group
                await Groups.AddToGroupAsync(Context.ConnectionId, $"League_{leagueId}");
                Console.WriteLine($"✅ Added to SignalR group: League_{leagueId}");
                
                // Track connection
                var connection = new UserConnection
                {
                    ConnectionId = Context.ConnectionId,
                    UserId = user.Id,
                    Username = user.Username,
                    LeagueId = int.Parse(leagueId),
                    ConnectedAt = DateTime.UtcNow
                };
                
                _connections[Context.ConnectionId] = connection;
                Console.WriteLine($"✅ Connection tracked. Total connections: {_connections.Count}");
                
                // Notify others that user came online
                await Clients.Group($"League_{leagueId}").SendAsync("UserOnline", new
                {
                    UserId = user.Id,
                    Username = user.Username,
                    ConnectedAt = connection.ConnectedAt
                });
                
                // Send current online users to the new user
                var onlineUsers = GetOnlineUsersInLeague(int.Parse(leagueId));
                await Clients.Caller.SendAsync("OnlineUsers", onlineUsers);
                Console.WriteLine($"✅ UserOnline event sent to League_{leagueId}");
            }
            else
            {
                Console.WriteLine($"❌ User not found or not in league. User ID: {userId}, League ID: {leagueId}");
            }
        }

        public async Task LeaveLeague(string leagueId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"League_{leagueId}");
        }

        public async Task SendMessage(string leagueId, string userId, string message)
        {
            // Verify user is in the league
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == int.Parse(userId) && u.LeagueId == int.Parse(leagueId));

            if (user == null)
            {
                return;
            }

            // Create and save the message
            var chatMessage = new FantasyLeague.Api.Models.ChatMessage
            {
                LeagueId = int.Parse(leagueId),
                UserId = int.Parse(userId),
                Message = message,
                CreatedAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            // Create response DTO
            var messageDto = new ChatMessageDto
            {
                Id = chatMessage.Id,
                LeagueId = chatMessage.LeagueId,
                UserId = chatMessage.UserId,
                Username = user.Username,
                Message = chatMessage.Message,
                CreatedAt = chatMessage.CreatedAt
            };

            // Broadcast to all users in the league
            await Clients.Group($"League_{leagueId}").SendAsync("ReceiveMessage", messageDto);
        }

        private List<object> GetOnlineUsersInLeague(int leagueId)
        {
            return _connections.Values
                .Where(c => c.LeagueId == leagueId)
                .Select(c => new
                {
                    UserId = c.UserId,
                    Username = c.Username,
                    ConnectedAt = c.ConnectedAt
                })
                .Cast<object>()
                .ToList();
        }

        private void StartDraftTimer(int leagueId, int timerDuration = 15)
        {
            // Clear any existing timer for this league
            StopDraftTimer(leagueId);

            var startTime = DateTime.UtcNow;
            _timerStartTimes[leagueId] = startTime;


            var timer = new Timer(async _ =>
            {
                try
                {
                    // Check if timer still exists (not removed by StopDraftTimer)
                    if (!_draftTimers.ContainsKey(leagueId))
                    {
                        return;
                    }

                    var elapsed = DateTime.UtcNow - startTime;
                    var remaining = Math.Max(0, timerDuration - (int)elapsed.TotalSeconds);


                    // Send timer tick to all clients using HubContext (prevents disposed object errors)
                    await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("TimerTick", new
                    {
                        TimeRemaining = remaining,
                        TotalTime = timerDuration
                    });

                    if (remaining <= 0)
                    {
                        
                        // Stop the timer
                        StopDraftTimer(leagueId);
                        
                        // Trigger auto-draft
                        await HandleAutoDraft(leagueId);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error in draft timer for league {leagueId}: {ex.Message}");
                }
            }, null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(1));

            _draftTimers[leagueId] = timer;
        }

        private void StopDraftTimer(int leagueId)
        {
            
            if (_draftTimers.TryRemove(leagueId, out var timer))
            {
                try
                {
                    timer.Dispose();
                    Console.WriteLine($"✅ Successfully disposed timer for league {leagueId}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error disposing timer for league {leagueId}: {ex.Message}");
                }
            }
            else
            {
                Console.WriteLine($"⚠️ No timer found to stop for league {leagueId}");
            }
            
            _timerStartTimes.TryRemove(leagueId, out _);
        }

        private async Task HandleAutoDraft(int leagueId)
        {
            try
            {
                
                if (_staticServiceProvider == null)
                {
                    Console.WriteLine($"❌ Service provider not available for auto-draft in league {leagueId}");
                    return;
                }

                Console.WriteLine($"✅ Service provider available, creating scope for auto-draft");

                // Create a new scope to get a fresh context
                using var scope = _staticServiceProvider.CreateScope();
                using var context = scope.ServiceProvider.GetRequiredService<FantasyLeagueContext>();

                Console.WriteLine($"✅ Database context created for auto-draft");

                var draft = await context.Drafts
                    .Include(d => d.DraftPicks)
                    .FirstOrDefaultAsync(d => d.LeagueId == leagueId && d.IsActive);

                if (draft == null)
                {
                    Console.WriteLine($"❌ No active draft found for league {leagueId}");
                    return;
                }

                var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                var totalPicks = draft.DraftPicks?.Count ?? 0;
                var (currentUserIndex, currentUserId) = GetCurrentDraftUser(draftOrder, totalPicks);


                // Simple auto-draft logic - pick first available player
                // In a real implementation, you'd want more sophisticated logic
                await MakeAutoDraftPick(leagueId.ToString(), currentUserId, context);
                
                // Re-fetch draft to check final state
                var finalDraft = await context.Drafts.FirstOrDefaultAsync(d => d.LeagueId == leagueId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in auto-draft for league {leagueId}: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
            }
        }

        private async Task MakeAutoDraftPick(string leagueId, int userId, FantasyLeagueContext context)
        {
            // Get available players for auto-draft using the same logic as the API endpoint
            var availablePlayers = await GetAvailablePlayersFromAPI(leagueId, context);
            
            if (availablePlayers.Count == 0)
            {
                Console.WriteLine($"❌ No available players for auto-draft in league {leagueId}");
                return;
            }

            var random = new Random();
            var selectedPlayer = availablePlayers[random.Next(availablePlayers.Count)];


            // Simulate the draft pick using existing logic
            var draft = await context.Drafts
                .Include(d => d.DraftPicks)
                .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId) && d.IsActive);

            if (draft != null)
            {
                var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                var totalPicks = draft.DraftPicks?.Count ?? 0;
                var teamCount = draftOrder.Count;
                var currentRoundIndex = totalPicks / teamCount;
                var currentPickInRound = totalPicks % teamCount;
                var actualRound = currentRoundIndex + 1;
                var roundPick = currentPickInRound + 1;
                var pickNumber = totalPicks + 1;
                
                // Create the draft pick (store player ID with name for proper tracking)
                var draftPick = new FantasyLeague.Api.Models.DraftPick
                {
                    DraftId = draft.Id,
                    UserId = userId,
                    PlayerName = $"{selectedPlayer.Id}:{selectedPlayer.Name} (AUTO)",
                    PlayerPosition = selectedPlayer.Position,
                    PlayerTeam = selectedPlayer.Team,
                    PlayerLeague = selectedPlayer.League,
                    Round = actualRound,
                    RoundPick = roundPick,
                    PickNumber = pickNumber,
                    PickedAt = DateTime.UtcNow
                };

                context.DraftPicks.Add(draftPick);

                // Also add to UserRoster table (same as manual picks)
                var userRoster = new FantasyLeague.Api.Models.UserRoster
                {
                    UserId = userId,
                    LeagueId = int.Parse(leagueId),
                    DraftId = draft.Id,
                    PlayerName = $"{selectedPlayer.Id}:{selectedPlayer.Name} (AUTO)",
                    PlayerPosition = selectedPlayer.Position,
                    PlayerTeam = selectedPlayer.Team,
                    PlayerLeague = selectedPlayer.League,
                    PickNumber = draftPick.PickNumber,
                    Round = draftPick.Round
                };

                context.UserRosters.Add(userRoster);
                Console.WriteLine($"🎯 Added auto-drafted player {selectedPlayer.Name} to user {userId}'s roster");

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
                
                Console.WriteLine($"🎯 Snake draft advancement: NextTotalPicks={nextTotalPicks}, NextRound={draft.CurrentRound}, NextUserIndex={nextUserIndex}");

                // Check if draft is complete based on total picks made
                var totalPicksMade = draft.DraftPicks.Count;
                Console.WriteLine($"🎯 Checking draft completion: TotalPicksMade={totalPicksMade}, MaxPicks={draft.MaxPicks}");
                if (draft.MaxPicks > 0 && totalPicksMade >= draft.MaxPicks)
                {
                    Console.WriteLine($"❌ DRAFT COMPLETED! Setting IsActive=false");
                    draft.IsActive = false;
                    draft.IsCompleted = true;
                    draft.CompletedAt = DateTime.UtcNow;
                }
                else
                {
                    Console.WriteLine($"✅ Draft still active: TotalPicksMade={totalPicksMade} < MaxPicks={draft.MaxPicks}");
                }

                Console.WriteLine($"🎯 About to save changes. Draft state: IsActive={draft.IsActive}, IsCompleted={draft.IsCompleted}");
                await context.SaveChangesAsync();
                Console.WriteLine($"🎯 Changes saved successfully");

                // Find username for the user
                var user = await context.Users.FirstOrDefaultAsync(u => u.Id == userId);
                var username = user?.Username ?? "Unknown";

                Console.WriteLine($"🎯 Sending PlayerDrafted event for {selectedPlayer.Name} (AUTO) to League_{leagueId}");
                // Notify all users of the auto-drafted pick
                await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("PlayerDrafted", new
                {
                    UserId = userId,
                    Username = username,
                    PlayerId = selectedPlayer.Id,
                    PlayerName = selectedPlayer.Name + " (AUTO)", // Keep (AUTO) suffix for display
                    Position = selectedPlayer.Position,
                    Team = selectedPlayer.Team,
                    League = selectedPlayer.League,
                    Round = draftPick.Round,
                    Pick = draftPick.RoundPick,
                    PickNumber = draftPick.PickNumber,
                    IsAutoDraft = true
                });

                if (draft.IsCompleted)
                {
                    await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("DraftCompleted", new
                    {
                        DraftId = draft.Id
                    });
                }
                else
                {
                    // Start timer for next user's turn
                    var nextUserId = nextTotalPicks < teamCount * 15 ? draftOrder[nextUserIndex] : 0;
                    
                    await _hubContext.Clients.Group($"League_{leagueId}").SendAsync("TurnChanged", new
                    {
                        CurrentUserId = nextUserId,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        TimeLimit = 15
                    });

                    // Start new timer for next turn
                    StartDraftTimer(int.Parse(leagueId), 15);
                }
            }
        }

        public async Task GetCurrentDraftState(string leagueId)
        {
            Console.WriteLine($"🔍 GetCurrentDraftState called for league {leagueId}");
            
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                var draft = await _context.Drafts
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId));

                if (draft != null && draft.IsActive && !draft.IsCompleted)
                {
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var totalPicks = draft.DraftPicks?.Count ?? 0;
                    var (currentUserIndex, currentUserId) = GetCurrentDraftUser(draftOrder, totalPicks);

                    Console.WriteLine($"📡 Sending current draft state - TotalPicks: {totalPicks}, UserIndex: {currentUserIndex}, User: {currentUserId}");

                    // Send current state to the requesting client
                    await Clients.Caller.SendAsync("DraftStarted", new
                    {
                        DraftId = draft.Id,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        CurrentUserId = currentUserId,
                        DraftOrder = draftOrder,
                        TimeLimit = 15
                    });

                    // Also send current turn info
                    await Clients.Caller.SendAsync("TurnChanged", new
                    {
                        CurrentUserId = currentUserId,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        TimeLimit = 15
                    });

                    // Start timer if not already running
                    if (!_draftTimers.ContainsKey(int.Parse(leagueId)))
                    {
                        StartDraftTimer(int.Parse(leagueId), 15);
                    }
                    else
                    {
                    }
                }
                else
                {
                    Console.WriteLine($"❌ Draft not active. Draft: {draft?.Id}, IsActive: {draft?.IsActive}, IsCompleted: {draft?.IsCompleted}");
                }
            }
        }

        public async Task StartDraft(string leagueId)
        {
            Console.WriteLine($"🚀🚀🚀 StartDraft called for league {leagueId}");
            Console.WriteLine($"Connection ID: {Context.ConnectionId}");
            Console.WriteLine($"Connections count: {_connections.Count}");
            Console.WriteLine($"Available connections: {string.Join(", ", _connections.Keys)}");
            
            // Verify user is in the league and start the draft
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                var draft = await _context.Drafts
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId));

                if (draft != null && !draft.IsCompleted)
                {
                    Console.WriteLine($"✅ Draft found, starting/resuming timer...");
                    
                    // If draft wasn't active before, mark it as active
                    if (!draft.IsActive)
                    {
                        draft.IsActive = true;
                        draft.StartedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }

                    // Get current turn user using snake draft logic
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var totalPicks = draft.DraftPicks?.Count ?? 0;
                    var (currentUserIndex, currentUserId) = GetCurrentDraftUser(draftOrder, totalPicks);

                    Console.WriteLine($"📡 Sending DraftStarted event to League_{leagueId}");
                    Console.WriteLine($"Current user ID: {currentUserId}, TotalPicks: {totalPicks}, UserIndex: {currentUserIndex}");
                    
                    await Clients.Group($"League_{leagueId}").SendAsync("DraftStarted", new
                    {
                        DraftId = draft.Id,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        CurrentUserId = currentUserId,
                        DraftOrder = draftOrder,
                        TimeLimit = 15 // seconds
                    });

                    Console.WriteLine($"📡 Sending TurnChanged event to League_{leagueId}");
                    await Clients.Group($"League_{leagueId}").SendAsync("TurnChanged", new
                    {
                        CurrentUserId = currentUserId,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        TimeLimit = 15 // seconds
                    });

                    // Start the server-side draft timer
                    StartDraftTimer(int.Parse(leagueId), 15);
                    
                    Console.WriteLine($"✅ All WebSocket events sent successfully");
                }
                else
                {
                    Console.WriteLine($"❌ Draft not found or already completed. Draft: {draft?.Id}, IsActive: {draft?.IsActive}, IsCompleted: {draft?.IsCompleted}");
                }
            }
            else
            {
                Console.WriteLine($"❌ User not authorized for StartDraft. Connection found: {_connections.ContainsKey(Context.ConnectionId)}");
                if (_connections.TryGetValue(Context.ConnectionId, out var conn))
                {
                    Console.WriteLine($"Connection league: {conn.LeagueId}, Requested league: {leagueId}");
                }
            }
        }

        public async Task TestDraftPick(string leagueId, string playerName)
        {
            Console.WriteLine($"🧪 TestDraftPick called for league {leagueId}, player: {playerName}");
        }

        public async Task CompleteAutoDraft(string leagueId)
        {
            Console.WriteLine($"🏁 CompleteAutoDraft called for league {leagueId}");
            
            // Verify user is in the league
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                Console.WriteLine($"✅ Connection found: User {connection.UserId} ({connection.Username}) in league {connection.LeagueId}");
                
                var draft = await _context.Drafts
                    .Include(d => d.DraftPicks)
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId) && d.IsActive);

                if (draft != null)
                {
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var totalPicks = draft.DraftPicks?.Count ?? 0;
                    var teamCount = draftOrder.Count;
                    var maxRounds = 34; // Total rounds in draft
                    var totalPicksNeeded = teamCount * maxRounds;
                    
                    Console.WriteLine($"🏁 Starting complete auto-draft: {totalPicks} picks completed, {totalPicksNeeded - totalPicks} picks remaining");
                    
                    // Get all available players
                    var availablePlayers = new List<AutoDraftPlayer>
                    {
                        new AutoDraftPlayer { Id = "josh-allen", Name = "Josh Allen", Position = "QB", Team = "Buffalo Bills", League = "NFL" },
                        new AutoDraftPlayer { Id = "aaron-judge", Name = "Aaron Judge", Position = "OF", Team = "New York Yankees", League = "MLB" },
                        new AutoDraftPlayer { Id = "austin-ekeler", Name = "Austin Ekeler", Position = "RB", Team = "Los Angeles Chargers", League = "NFL" },
                        new AutoDraftPlayer { Id = "tj-hockenson", Name = "T.J. Hockenson", Position = "TE", Team = "Detroit Lions", League = "NFL" },
                        new AutoDraftPlayer { Id = "ronald-acuna-jr", Name = "Ronald Acuña Jr.", Position = "OF", Team = "Atlanta Braves", League = "MLB" },
                        new AutoDraftPlayer { Id = "luka-doncic", Name = "Luka Dončić", Position = "PG", Team = "Dallas Mavericks", League = "NBA" },
                        new AutoDraftPlayer { Id = "stefon-diggs", Name = "Stefon Diggs", Position = "WR", Team = "Buffalo Bills", League = "NFL" },
                        new AutoDraftPlayer { Id = "george-kittle", Name = "George Kittle", Position = "TE", Team = "San Francisco 49ers", League = "NFL" },
                        new AutoDraftPlayer { Id = "lamar-jackson", Name = "Lamar Jackson", Position = "QB", Team = "Baltimore Ravens", League = "NFL" },
                        new AutoDraftPlayer { Id = "jayson-tatum", Name = "Jayson Tatum", Position = "SF", Team = "Boston Celtics", League = "NBA" },
                        new AutoDraftPlayer { Id = "davante-adams", Name = "Davante Adams", Position = "WR", Team = "Las Vegas Raiders", League = "NFL" },
                        new AutoDraftPlayer { Id = "shohei-ohtani", Name = "Shohei Ohtani", Position = "SP", Team = "Los Angeles Angels", League = "MLB" },
                        new AutoDraftPlayer { Id = "jared-goff", Name = "Jared Goff", Position = "QB", Team = "Detroit Lions", League = "NFL" },
                        new AutoDraftPlayer { Id = "nick-chubb", Name = "Nick Chubb", Position = "RB", Team = "Cleveland Browns", League = "NFL" },
                        new AutoDraftPlayer { Id = "joe-burrow", Name = "Joe Burrow", Position = "QB", Team = "Cincinnati Bengals", League = "NFL" },
                        new AutoDraftPlayer { Id = "harrison-butker", Name = "Harrison Butker", Position = "K", Team = "Kansas City Chiefs", League = "NFL" },
                        new AutoDraftPlayer { Id = "mookie-betts", Name = "Mookie Betts", Position = "OF", Team = "Los Angeles Dodgers", League = "MLB" },
                        new AutoDraftPlayer { Id = "justin-tucker", Name = "Justin Tucker", Position = "K", Team = "Baltimore Ravens", League = "NFL" },
                        new AutoDraftPlayer { Id = "sam-laporta", Name = "Sam LaPorta", Position = "TE", Team = "Detroit Lions", League = "NFL" },
                        new AutoDraftPlayer { Id = "amon-ra-st-brown", Name = "Amon-Ra St. Brown", Position = "WR", Team = "Detroit Lions", League = "NFL" },
                        new AutoDraftPlayer { Id = "christian-mccaffrey", Name = "Christian McCaffrey", Position = "RB", Team = "San Francisco 49ers", League = "NFL" },
                        new AutoDraftPlayer { Id = "mike-trout", Name = "Mike Trout", Position = "OF", Team = "Los Angeles Angels", League = "MLB" },
                        new AutoDraftPlayer { Id = "tyler-bass", Name = "Tyler Bass", Position = "K", Team = "Buffalo Bills", League = "NFL" },
                        new AutoDraftPlayer { Id = "justin-jefferson", Name = "Justin Jefferson", Position = "WR", Team = "Minnesota Vikings", League = "NFL" },
                        new AutoDraftPlayer { Id = "tua-tagovailoa", Name = "Tua Tagovailoa", Position = "QB", Team = "Miami Dolphins", League = "NFL" },
                        new AutoDraftPlayer { Id = "derrick-henry", Name = "Derrick Henry", Position = "RB", Team = "Baltimore Ravens", League = "NFL" },
                        new AutoDraftPlayer { Id = "tyreek-hill", Name = "Tyreek Hill", Position = "WR", Team = "Miami Dolphins", League = "NFL" },
                        new AutoDraftPlayer { Id = "cooper-kupp", Name = "Cooper Kupp", Position = "WR", Team = "Los Angeles Rams", League = "NFL" },
                        new AutoDraftPlayer { Id = "travis-kelce", Name = "Travis Kelce", Position = "TE", Team = "Kansas City Chiefs", League = "NFL" },
                        new AutoDraftPlayer { Id = "tarik-skubal", Name = "Tarik Skubal", Position = "SP", Team = "Detroit Tigers", League = "MLB" },
                        new AutoDraftPlayer { Id = "anthony-davis", Name = "Anthony Davis", Position = "C", Team = "Los Angeles Lakers", League = "NBA" },
                        new AutoDraftPlayer { Id = "giannis-antetokounmpo", Name = "Giannis Antetokounmpo", Position = "PF", Team = "Milwaukee Bucks", League = "NBA" },
                        new AutoDraftPlayer { Id = "nikola-jokic", Name = "Nikola Jokić", Position = "C", Team = "Denver Nuggets", League = "NBA" },
                        new AutoDraftPlayer { Id = "stephen-curry", Name = "Stephen Curry", Position = "PG", Team = "Golden State Warriors", League = "NBA" },
                        new AutoDraftPlayer { Id = "lebron-james", Name = "LeBron James", Position = "SF", Team = "Los Angeles Lakers", League = "NBA" },
                        new AutoDraftPlayer { Id = "kevin-durant", Name = "Kevin Durant", Position = "PF", Team = "Phoenix Suns", League = "NBA" },
                        new AutoDraftPlayer { Id = "francisco-lindor", Name = "Francisco Lindor", Position = "SS", Team = "New York Mets", League = "MLB" }
                    };
                    
                    // Filter out already drafted players
                    var draftedPlayerNames = draft.DraftPicks?.Select(dp => dp.PlayerName?.Split(':').FirstOrDefault()).ToHashSet() ?? new HashSet<string>();
                    var availablePlayersList = availablePlayers.Where(p => !draftedPlayerNames.Contains(p.Id)).ToList();
                    
                    var picksToMake = totalPicksNeeded - totalPicks;
                    Console.WriteLine($"🏁 Will make {picksToMake} picks to complete the draft");
                    
                    // Create snake draft sequence for remaining picks
                    var snakeSequence = new List<int>();
                    for (int round = 0; round < maxRounds; round++)
                    {
                        if (round % 2 == 0)
                        {
                            // Even rounds: forward order
                            for (int i = 0; i < teamCount; i++)
                            {
                                snakeSequence.Add(draftOrder[i]);
                            }
                        }
                        else
                        {
                            // Odd rounds: reverse order
                            for (int i = teamCount - 1; i >= 0; i--)
                            {
                                snakeSequence.Add(draftOrder[i]);
                            }
                        }
                    }
                    
                    var allDraftPicks = new List<FantasyLeague.Api.Models.DraftPick>();
                    var allUserRosters = new List<FantasyLeague.Api.Models.UserRoster>();
                    var random = new Random();
                    
                    // Make all remaining picks instantly
                    for (int pickIndex = totalPicks; pickIndex < totalPicksNeeded && availablePlayersList.Count > 0; pickIndex++)
                    {
                        var currentUserId = snakeSequence[pickIndex];
                        
                        // Select random available player
                        var selectedPlayerIndex = random.Next(availablePlayersList.Count);
                        var selectedPlayer = availablePlayersList[selectedPlayerIndex];
                        availablePlayersList.RemoveAt(selectedPlayerIndex);
                        
                        var currentRoundIndex = pickIndex / teamCount;
                        var currentPickInRound = pickIndex % teamCount;
                        var actualRound = currentRoundIndex + 1;
                        var roundPick = currentPickInRound + 1;
                        var pickNumber = pickIndex + 1;
                        
                        // Create the draft pick
                        var draftPick = new FantasyLeague.Api.Models.DraftPick
                        {
                            DraftId = draft.Id,
                            UserId = currentUserId,
                            PlayerName = $"{selectedPlayer.Id}:{selectedPlayer.Name} (AUTO)",
                            PlayerPosition = selectedPlayer.Position,
                            PlayerTeam = selectedPlayer.Team,
                            PlayerLeague = selectedPlayer.League,
                            Round = actualRound,
                            RoundPick = roundPick,
                            PickNumber = pickNumber,
                            PickedAt = DateTime.UtcNow
                        };
                        
                        allDraftPicks.Add(draftPick);
                        
                        // Create user roster entry
                        var userRoster = new FantasyLeague.Api.Models.UserRoster
                        {
                            UserId = currentUserId,
                            LeagueId = int.Parse(leagueId),
                            DraftId = draft.Id,
                            PlayerName = $"{selectedPlayer.Id}:{selectedPlayer.Name} (AUTO)",
                            PlayerPosition = selectedPlayer.Position,
                            PlayerTeam = selectedPlayer.Team,
                            PlayerLeague = selectedPlayer.League,
                            PickNumber = pickNumber,
                            Round = actualRound,
                            DraftedAt = DateTime.UtcNow
                        };
                        
                        allUserRosters.Add(userRoster);
                    }
                    
                    // Save all picks to database in bulk
                    _context.DraftPicks.AddRange(allDraftPicks);
                    _context.UserRosters.AddRange(allUserRosters);
                    
                    // Mark draft as completed
                    draft.IsCompleted = true;
                    draft.CompletedAt = DateTime.UtcNow;
                    draft.IsActive = false;
                    
                    await _context.SaveChangesAsync();
                    
                    Console.WriteLine($"🏁 Complete auto-draft finished: Added {allDraftPicks.Count} picks, draft completed");
                    
                    // Send completion event to all clients
                    await Clients.Group($"League_{leagueId}").SendAsync("DraftCompleted", new
                    {
                        Message = $"Draft completed! {allDraftPicks.Count} players auto-drafted.",
                        TotalPicks = totalPicksNeeded,
                        CompletedAt = DateTime.UtcNow
                    });
                    
                    // Stop any existing timers
                    StopDraftTimer(int.Parse(leagueId));
                }
                else
                {
                    await Clients.Caller.SendAsync("DraftPickError", new
                    {
                        Error = "DRAFT_NOT_FOUND",
                        Message = "No active draft found for this league."
                    });
                }
            }
            else
            {
                await Clients.Caller.SendAsync("DraftPickError", new
                {
                    Error = "UNAUTHORIZED",
                    Message = "You are not authorized to complete auto-draft for this league."
                });
            }
        }


        public async Task MakeDraftPick(string leagueId, string playerId, string playerName, string position, string team, string league, bool isAutoDraft = false)
        {
            Console.WriteLine($"🎯🎯🎯 MakeDraftPick called for league {leagueId}, player: {playerName} ({playerId}), isAutoDraft: {isAutoDraft}");
            Console.WriteLine($"🔍 Connection ID: {Context.ConnectionId}");
            
            // Verify user is in the league and it's their turn
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                Console.WriteLine($"✅ Connection found: User {connection.UserId} ({connection.Username}) in league {connection.LeagueId}");
                var draft = await _context.Drafts
                    .Include(d => d.DraftPicks)
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId) && d.IsActive);

                if (draft != null)
                {
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var totalPicks = draft.DraftPicks?.Count ?? 0;
                    var (currentUserIndex, currentUserId) = GetCurrentDraftUser(draftOrder, totalPicks);

                    Console.WriteLine($"🔍 Turn verification - TotalPicks: {totalPicks}, CurrentUserIndex: {currentUserIndex}, CurrentUserId: {currentUserId}");
                    Console.WriteLine($"🔍 Draft order: [{string.Join(", ", draftOrder)}]");
                    Console.WriteLine($"🔍 Requesting user: {connection.UserId} ({connection.Username})");

                    // Verify it's this user's turn
                    if (currentUserId == connection.UserId)
                    {
                        // Calculate pick numbers using snake draft logic - get fresh count to avoid race conditions
                        var currentPickCount = await _context.DraftPicks.CountAsync(dp => dp.DraftId == draft.Id);
                        var teamCount = draftOrder.Count;
                        var currentRoundIndex = currentPickCount / teamCount;
                        var currentPickInRound = currentPickCount % teamCount;
                        var actualRound = currentRoundIndex + 1;
                        var roundPick = currentPickInRound + 1;
                        var pickNumber = currentPickCount + 1;

                        // Create the draft pick - store player ID with name for proper tracking
                        var draftPick = new FantasyLeague.Api.Models.DraftPick
                        {
                            DraftId = draft.Id,
                            UserId = connection.UserId,
                            PlayerName = $"{playerId}:{playerName}", // Include player ID for proper tracking
                            PlayerPosition = position,
                            PlayerTeam = team,
                            PlayerLeague = league,
                            Round = actualRound,
                            RoundPick = roundPick,
                            PickNumber = pickNumber,
                            PickedAt = DateTime.UtcNow
                        };

                        _context.DraftPicks.Add(draftPick);

                        // Also add to UserRoster table (same as auto-draft picks)
                        var userRoster = new FantasyLeague.Api.Models.UserRoster
                        {
                            UserId = connection.UserId,
                            LeagueId = int.Parse(leagueId),
                            DraftId = draft.Id,
                            PlayerName = $"{playerId}:{playerName}", // Include player ID for consistency
                            PlayerPosition = position,
                            PlayerTeam = team,
                            PlayerLeague = league,
                            PickNumber = draftPick.PickNumber,
                            Round = draftPick.Round
                        };

                        _context.UserRosters.Add(userRoster);
                        Console.WriteLine($"🎯 Added manually drafted player {playerName} to user {connection.UserId}'s roster");

                        // Update draft state for next pick using snake draft logic
                        var nextTotalPicks = currentPickCount + 1; // After this pick
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

                        // Check if draft is complete based on total picks made
                        var totalPicksMade = draft.DraftPicks.Count;
                        if (draft.MaxPicks > 0 && totalPicksMade >= draft.MaxPicks)
                        {
                            draft.IsActive = false;
                            draft.IsCompleted = true;
                            draft.CompletedAt = DateTime.UtcNow;
                        }

                        await _context.SaveChangesAsync();

                        // Stop the current timer since a pick was made
                        StopDraftTimer(int.Parse(leagueId));

                        // Notify all users of the pick
                        await Clients.Group($"League_{leagueId}").SendAsync("PlayerDrafted", new
                        {
                            UserId = connection.UserId,
                            Username = connection.Username,
                            PlayerId = playerId,
                            PlayerName = playerName, // Send clean name to frontend
                            Position = position,
                            Team = team,
                            League = league,
                            Round = draftPick.Round,
                            Pick = draftPick.RoundPick,
                            PickNumber = draftPick.PickNumber,
                            IsAutoDraft = isAutoDraft
                        });

                        if (draft.IsCompleted)
                        {
                            await Clients.Group($"League_{leagueId}").SendAsync("DraftCompleted", new
                            {
                                DraftId = draft.Id
                            });
                        }
                        else
                        {
                            // Notify next user it's their turn
                            var nextUserId = nextTotalPicks < teamCount * 15 ? draftOrder[nextUserIndex] : 0;
                            
                            await Clients.Group($"League_{leagueId}").SendAsync("TurnChanged", new
                            {
                                CurrentUserId = nextUserId,
                                CurrentTurn = draft.CurrentTurn,
                                CurrentRound = draft.CurrentRound,
                                TimeLimit = 15 // seconds
                            });

                            // Start new timer for the next turn
                            StartDraftTimer(int.Parse(leagueId), 15);
                        }
                    }
                    else
                    {
                        // Not this user's turn - send error feedback
                        var currentUserName = "Unknown";
                        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
                        if (currentUser != null)
                        {
                            currentUserName = $"{currentUser.FirstName} {currentUser.LastName}";
                        }
                        
                        await Clients.Caller.SendAsync("DraftPickError", new
                        {
                            Error = "NOT_YOUR_TURN",
                            Message = $"It's currently {currentUserName}'s turn to pick.",
                            CurrentUserId = currentUserId,
                            YourUserId = connection.UserId
                        });
                        
                        Console.WriteLine($"❌ User {connection.UserId} ({connection.Username}) tried to pick when it's User {currentUserId}'s turn");
                    }
                }
                else
                {
                    // No active draft found
                    await Clients.Caller.SendAsync("DraftPickError", new
                    {
                        Error = "NO_ACTIVE_DRAFT",
                        Message = "No active draft found for this league."
                    });
                }
            }
            else
            {
                // User not in league or connection not found
                Console.WriteLine($"❌ Connection lookup failed for ConnectionId: {Context.ConnectionId}");
                Console.WriteLine($"❌ Available connections: {_connections.Count}");
                foreach (var kvp in _connections)
                {
                    Console.WriteLine($"  - {kvp.Key}: User {kvp.Value.UserId} in League {kvp.Value.LeagueId}");
                }
                
                await Clients.Caller.SendAsync("DraftPickError", new
                {
                    Error = "INVALID_CONNECTION", 
                    Message = "Invalid connection or user not in league."
                });
            }
        }

        public async Task PauseDraft(string leagueId)
        {
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                // Stop the timer when draft is paused
                StopDraftTimer(int.Parse(leagueId));

                await Clients.Group($"League_{leagueId}").SendAsync("DraftPaused", new
                {
                    PausedBy = connection.Username
                });
            }
        }

        public async Task ResumeDraft(string leagueId)
        {
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                var draft = await _context.Drafts
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId) && d.IsActive);

                if (draft != null)
                {
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var totalPicks = draft.DraftPicks?.Count ?? 0;
                    var (currentUserIndex, currentUserId) = GetCurrentDraftUser(draftOrder, totalPicks);

                    await Clients.Group($"League_{leagueId}").SendAsync("DraftResumed", new
                    {
                        ResumedBy = connection.Username,
                        CurrentUserId = currentUserId,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        TimeLimit = 15
                    });

                    // Restart the timer when draft is resumed
                    StartDraftTimer(int.Parse(leagueId), 15);
                }
            }
        }

        public async Task ResetDraft(string leagueId)
        {
            Console.WriteLine($"🔄🔄🔄 ResetDraft called for league {leagueId}");
            Console.WriteLine($"🔄 Connection ID: {Context.ConnectionId}");
            Console.WriteLine($"🔄 User: {Context.UserIdentifier}");
            
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                var draft = await _context.Drafts
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId));

                if (draft != null)
                {
                    Console.WriteLine($"🔄 Resetting draft {draft.Id} for league {leagueId}");
                    
                    // Stop any existing timer
                    StopDraftTimer(int.Parse(leagueId));
                    
                    // Reset draft state
                    draft.IsActive = false;
                    draft.IsCompleted = false;
                    draft.CurrentTurn = 0;
                    draft.CurrentRound = 1;
                    draft.StartedAt = null;
                    draft.CompletedAt = null;
                    
                    // Clear all draft picks
                    var existingPicks = await _context.DraftPicks
                        .Where(p => p.DraftId == draft.Id)
                        .ToListAsync();
                    
                    _context.DraftPicks.RemoveRange(existingPicks);
                    
                    // Also clear all user roster entries for this draft
                    var existingRosters = await _context.UserRosters
                        .Where(r => r.DraftId == draft.Id)
                        .ToListAsync();
                    
                    // First clear any TradePlayers that reference these UserRosters to avoid foreign key constraint violations
                    var rosterIds = existingRosters.Select(r => r.Id).ToList();
                    var relatedTradePlayers = await _context.TradePlayers
                        .Where(tp => rosterIds.Contains(tp.UserRosterId))
                        .ToListAsync();
                    
                    if (relatedTradePlayers.Any())
                    {
                        _context.TradePlayers.RemoveRange(relatedTradePlayers);
                        Console.WriteLine($"🔄 Cleared {relatedTradePlayers.Count} trade players to avoid foreign key constraints");
                    }
                    
                    _context.UserRosters.RemoveRange(existingRosters);
                    Console.WriteLine($"🔄 Cleared {existingRosters.Count} user roster entries");
                    
                    await _context.SaveChangesAsync();
                    
                    Console.WriteLine($"✅ Draft reset completed for league {leagueId}");
                    
                    // Notify all clients that draft was reset
                    await Clients.Group($"League_{leagueId}").SendAsync("DraftReset", new
                    {
                        ResetBy = connection.Username,
                        DraftId = draft.Id
                    });
                }
            }
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"🟢 SignalR connection established: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Remove connection and notify others
            if (_connections.TryRemove(Context.ConnectionId, out var connection))
            {
                await Clients.Group($"League_{connection.LeagueId}").SendAsync("UserOffline", new
                {
                    UserId = connection.UserId,
                    Username = connection.Username
                });
            }
            
            await base.OnDisconnectedAsync(exception);
        }
    }
}