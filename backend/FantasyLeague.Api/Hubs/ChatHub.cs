using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.DTOs;
using System.Collections.Concurrent;

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
            // Verify user is in the league
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == int.Parse(userId) && u.LeagueId == int.Parse(leagueId));

            if (user != null)
            {
                // Add to group
                await Groups.AddToGroupAsync(Context.ConnectionId, $"League_{leagueId}");
                
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