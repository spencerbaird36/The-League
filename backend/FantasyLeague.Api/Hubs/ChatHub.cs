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
        private static readonly ConcurrentDictionary<string, UserConnection> _connections = new();

        public ChatHub(FantasyLeagueContext context)
        {
            _context = context;
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

                if (draft != null && !draft.IsActive)
                {
                    Console.WriteLine($"✅ Draft found and not active, starting draft...");
                    draft.IsActive = true;
                    draft.StartedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    // Get current turn user
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var currentUserId = draftOrder.Count > draft.CurrentTurn ? draftOrder[draft.CurrentTurn] : 0;

                    Console.WriteLine($"📡 Sending DraftStarted event to League_{leagueId}");
                    Console.WriteLine($"Current user ID: {currentUserId}, Turn: {draft.CurrentTurn}");
                    
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
                    
                    Console.WriteLine($"✅ All WebSocket events sent successfully");
                }
                else
                {
                    Console.WriteLine($"❌ Draft not found or already active. Draft: {draft?.Id}, IsActive: {draft?.IsActive}");
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

        public async Task MakeDraftPick(string leagueId, string playerId, string playerName, string position, string team, string league)
        {
            // Verify user is in the league and it's their turn
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
                var draft = await _context.Drafts
                    .FirstOrDefaultAsync(d => d.LeagueId == int.Parse(leagueId) && d.IsActive);

                if (draft != null)
                {
                    var draftOrder = JsonSerializer.Deserialize<List<int>>(draft.DraftOrder) ?? new List<int>();
                    var currentUserId = draftOrder.Count > draft.CurrentTurn ? draftOrder[draft.CurrentTurn] : 0;

                    // Verify it's this user's turn
                    if (currentUserId == connection.UserId)
                    {
                        // Create the draft pick
                        var draftPick = new FantasyLeague.Api.Models.DraftPick
                        {
                            DraftId = draft.Id,
                            UserId = connection.UserId,
                            PlayerName = playerName,
                            PlayerPosition = position,
                            PlayerTeam = team,
                            PlayerLeague = league,
                            Round = draft.CurrentRound,
                            RoundPick = draft.CurrentTurn + 1,
                            PickNumber = (draft.CurrentRound - 1) * draftOrder.Count + draft.CurrentTurn + 1,
                            PickedAt = DateTime.UtcNow
                        };

                        _context.DraftPicks.Add(draftPick);

                        // Advance to next turn
                        draft.CurrentTurn++;
                        
                        // Check if round is complete
                        if (draft.CurrentTurn >= draftOrder.Count)
                        {
                            draft.CurrentRound++;
                            draft.CurrentTurn = 0;
                        }

                        // Check if draft is complete (adjust max rounds as needed)
                        const int maxRounds = 15; // Adjust based on roster requirements
                        if (draft.CurrentRound > maxRounds)
                        {
                            draft.IsActive = false;
                            draft.IsCompleted = true;
                            draft.CompletedAt = DateTime.UtcNow;
                        }

                        await _context.SaveChangesAsync();

                        // Notify all users of the pick
                        await Clients.Group($"League_{leagueId}").SendAsync("PlayerDrafted", new
                        {
                            UserId = connection.UserId,
                            Username = connection.Username,
                            PlayerId = playerId,
                            PlayerName = playerName,
                            Position = position,
                            Team = team,
                            League = league,
                            Round = draftPick.Round,
                            Pick = draftPick.RoundPick,
                            PickNumber = draftPick.PickNumber
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
                            var nextUserId = draftOrder.Count > draft.CurrentTurn ? draftOrder[draft.CurrentTurn] : 0;
                            
                            await Clients.Group($"League_{leagueId}").SendAsync("TurnChanged", new
                            {
                                CurrentUserId = nextUserId,
                                CurrentTurn = draft.CurrentTurn,
                                CurrentRound = draft.CurrentRound,
                                TimeLimit = 15 // seconds
                            });
                        }
                    }
                }
            }
        }

        public async Task PauseDraft(string leagueId)
        {
            if (_connections.TryGetValue(Context.ConnectionId, out var connection) && 
                connection.LeagueId == int.Parse(leagueId))
            {
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
                    var currentUserId = draftOrder.Count > draft.CurrentTurn ? draftOrder[draft.CurrentTurn] : 0;

                    await Clients.Group($"League_{leagueId}").SendAsync("DraftResumed", new
                    {
                        ResumedBy = connection.Username,
                        CurrentUserId = currentUserId,
                        CurrentTurn = draft.CurrentTurn,
                        CurrentRound = draft.CurrentRound,
                        TimeLimit = 15
                    });
                }
            }
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