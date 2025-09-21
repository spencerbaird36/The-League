using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Services;
using System.Collections.Concurrent;
using System.Text.Json;

namespace FantasyLeague.Api.Hubs
{
    public class ChatHub : Hub
    {
        private readonly FantasyLeagueContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly PlayerPoolService _playerPoolService;
        private static readonly ConcurrentDictionary<string, UserConnection> _connections = new();
        private static readonly ConcurrentDictionary<int, Timer> _draftTimers = new();
        private static readonly ConcurrentDictionary<int, DateTime> _timerStartTimes = new();
        private static IServiceProvider? _staticServiceProvider;

        public ChatHub(FantasyLeagueContext context, IHubContext<ChatHub> hubContext, PlayerPoolService playerPoolService)
        {
            _context = context;
            _hubContext = hubContext;
            _playerPoolService = playerPoolService;
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
            try
            {
                Console.WriteLine($"🔍 GetAvailablePlayersFromAPI called for league {leagueId}");
                Console.WriteLine($"🔍 PlayerPoolService is null: {_playerPoolService == null}");
                
                // Use the same PlayerPoolService logic as the regular draft interface
                var availablePlayersResponse = await _playerPoolService.GetAvailablePlayersForLeagueAsync(int.Parse(leagueId));
                
                Console.WriteLine($"🔍 PlayerPoolService returned {availablePlayersResponse.Count} available players");
                
                // Convert the PlayerPoolService response to AutoDraftPlayer format
                var availablePlayers = availablePlayersResponse.Select(p => {
                    var playerObj = p as dynamic;
                    return new AutoDraftPlayer
                    {
                        Id = playerObj.id?.ToString() ?? "",
                        Name = playerObj.name?.ToString() ?? "",
                        Position = playerObj.position?.ToString() ?? "",
                        Team = playerObj.team?.ToString() ?? "",
                        League = playerObj.league?.ToString() ?? ""
                    };
                }).ToList();
                
                Console.WriteLine($"🎯 Found {availablePlayers.Count} available players for auto-draft using PlayerPoolService");
                
                return availablePlayers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting available players from PlayerPoolService: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
                // Fallback to empty list to prevent crashes
                return new List<AutoDraftPlayer>();
            }
        }

        private async Task<List<AutoDraftPlayer>> GetAvailablePlayersUsingService(string leagueId, PlayerPoolService playerPoolService)
        {
            try
            {
                Console.WriteLine($"🔍 GetAvailablePlayersUsingService called for league {leagueId}");
                Console.WriteLine($"🔍 PlayerPoolService parameter is null: {playerPoolService == null}");
                
                // Use the PlayerPoolService directly
                var availablePlayersResponse = await playerPoolService.GetAvailablePlayersForLeagueAsync(int.Parse(leagueId));
                
                Console.WriteLine($"🔍 PlayerPoolService returned {availablePlayersResponse.Count} available players");
                
                // Convert the PlayerPoolService response to AutoDraftPlayer format
                var availablePlayers = availablePlayersResponse.Select(p => {
                    var playerObj = p as dynamic;
                    return new AutoDraftPlayer
                    {
                        Id = playerObj.id?.ToString() ?? "",
                        Name = playerObj.name?.ToString() ?? "",
                        Position = playerObj.position?.ToString() ?? "",
                        Team = playerObj.team?.ToString() ?? "",
                        League = playerObj.league?.ToString() ?? ""
                    };
                }).ToList();
                
                Console.WriteLine($"🎯 Found {availablePlayers.Count} available players for auto-draft using PlayerPoolService");
                
                return availablePlayers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting available players from PlayerPoolService: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
                // Fallback to empty list to prevent crashes
                return new List<AutoDraftPlayer>();
            }
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


                // Get PlayerPoolService from the scoped service provider
                var playerPoolService = scope.ServiceProvider.GetRequiredService<PlayerPoolService>();
                
                // Simple auto-draft logic - pick first available player
                await MakeAutoDraftPick(leagueId.ToString(), currentUserId, context, playerPoolService);
                
                // Re-fetch draft to check final state
                var finalDraft = await context.Drafts.FirstOrDefaultAsync(d => d.LeagueId == leagueId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in auto-draft for league {leagueId}: {ex.Message}");
                Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
            }
        }

        private async Task MakeAutoDraftPick(string leagueId, int userId, FantasyLeagueContext context, PlayerPoolService playerPoolService)
        {
            // Get available players for auto-draft using the PlayerPoolService directly
            var availablePlayers = await GetAvailablePlayersUsingService(leagueId, playerPoolService);
            
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
                    var nextUserId = nextTotalPicks < draft.MaxPicks ? draftOrder[nextUserIndex] : 0;
                    
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
                    var totalPicksNeeded = draft.MaxPicks;
                    
                    Console.WriteLine($"🏁 Starting complete auto-draft: {totalPicks} picks completed, {totalPicksNeeded - totalPicks} picks remaining");
                    
                    // Get PlayerPoolService from scoped services (since CompleteAutoDraft runs in scoped context)
                    var availablePlayersList = await GetAvailablePlayersFromAPI(leagueId, _context);
                    
                    var picksToMake = totalPicksNeeded - totalPicks;
                    Console.WriteLine($"🏁 Will make {picksToMake} picks to complete the draft");
                    
                    // Create snake draft sequence for remaining picks
                    var snakeSequence = new List<int>();
                    var maxRounds = totalPicksNeeded / teamCount; // Calculate rounds based on total picks needed
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
                        
                        // Select best available player using smart algorithm
                        var selectedPlayer = SelectBestAvailablePlayer(availablePlayersList, currentUserId, allDraftPicks);
                        availablePlayersList.Remove(selectedPlayer);
                        
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
                            var nextUserId = nextTotalPicks < draft.MaxPicks ? draftOrder[nextUserIndex] : 0;
                            
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

        // Smart auto-draft algorithm - prioritizes fantasy points with position bonuses
        private AutoDraftPlayer SelectBestAvailablePlayer(List<AutoDraftPlayer> availablePlayers, int currentUserId, List<FantasyLeague.Api.Models.DraftPick> draftedPicks)
        {
            Console.WriteLine($"🎯 SelectBestAvailablePlayer called for user {currentUserId}, {availablePlayers.Count} available players");

            if (availablePlayers.Count == 0)
            {
                throw new InvalidOperationException("No available players for auto-draft");
            }

            // High priority positions: RB, WR, SF, C, SS, 2B
            var highPriorityPositions = new[] { "RB", "WR", "SF", "C", "SS", "2B" };
            var mediumPriorityPositions = new[] { "QB", "TE", "OF", "SP", "CP", "PG", "SG", "PF" };

            // Count league distribution for balance
            var leagueCounts = draftedPicks
                .GroupBy(p => p.PlayerLeague)
                .ToDictionary(g => g.Key, g => g.Count());

            var totalDrafted = draftedPicks.Count;

            // Calculate score for each player
            var playerScores = availablePlayers.Select(player => new
            {
                Player = player,
                Score = CalculatePlayerScore(player, leagueCounts, totalDrafted, highPriorityPositions, mediumPriorityPositions)
            }).ToList();

            // Sort by score (highest first) and log top candidates
            var sortedPlayers = playerScores.OrderByDescending(ps => ps.Score).ToList();

            Console.WriteLine($"🏆 Top 5 candidates for user {currentUserId}:");
            for (int i = 0; i < Math.Min(5, sortedPlayers.Count); i++)
            {
                var candidate = sortedPlayers[i];
                Console.WriteLine($"   {i + 1}. {candidate.Player.Name} ({candidate.Player.Position}, {candidate.Player.League}): Score {candidate.Score:F1}");
            }

            var selectedPlayer = sortedPlayers.First().Player;
            Console.WriteLine($"🎯 Selected: {selectedPlayer.Name} ({selectedPlayer.Position}, {selectedPlayer.League}) with score {sortedPlayers.First().Score:F1}");

            return selectedPlayer;
        }

        private double CalculatePlayerScore(AutoDraftPlayer player, Dictionary<string, int> leagueCounts, int totalDrafted, string[] highPriorityPositions, string[] mediumPriorityPositions)
        {
            // Get fantasy points (this should be populated from projections)
            // For now, use a simple fallback based on player data
            double fantasyPoints = GetFantasyPointsEstimate(player);

            // Fantasy points as primary factor (multiply by 100 to make dominant)
            double baseScore = fantasyPoints * 100;

            // Position priority bonus (additive)
            double positionBonus = 0;
            if (highPriorityPositions.Contains(player.Position))
            {
                positionBonus = 50; // 50 point bonus for high priority
            }
            else if (mediumPriorityPositions.Contains(player.Position))
            {
                positionBonus = 20; // 20 point bonus for medium priority
            }

            // League balance bonus (smaller impact, max 30 points)
            double leagueBonus = 0;
            if (totalDrafted > 0)
            {
                var currentCount = leagueCounts.GetValueOrDefault(player.League, 0);
                var expectedPercentage = 0.33; // Aim for equal distribution
                var actualPercentage = (double)currentCount / totalDrafted;
                var underrepresentation = expectedPercentage - actualPercentage;
                leagueBonus = Math.Min(Math.Max(0, underrepresentation * 30), 30);
            }

            return baseScore + positionBonus + leagueBonus;
        }

        private double GetFantasyPointsEstimate(AutoDraftPlayer player)
        {
            // This is a simplified estimate. In a full implementation, this would come from projection data
            // For now, assign rough estimates based on position and league to prioritize better players

            var positionTierMap = new Dictionary<string, double>
            {
                // NFL high-value positions
                { "RB", 180 }, { "WR", 170 }, { "QB", 250 }, { "TE", 120 },
                // NBA positions
                { "PG", 180 }, { "SG", 170 }, { "SF", 160 }, { "PF", 150 }, { "C", 140 },
                // MLB positions
                { "OF", 160 }, { "SS", 150 }, { "2B", 140 }, { "3B", 135 }, { "1B", 130 },
                { "C", 125 }, { "SP", 140 }, { "CP", 100 }
            };

            // Get base value for position, default to 100 if not found
            double baseValue = positionTierMap.GetValueOrDefault(player.Position, 100);

            // Add some randomness to simulate player quality differences (±30%)
            var random = new Random(player.Name.GetHashCode()); // Consistent seed based on name
            double variance = (random.NextDouble() - 0.5) * 0.6; // -30% to +30%

            return baseValue * (1 + variance);
        }
    }
}