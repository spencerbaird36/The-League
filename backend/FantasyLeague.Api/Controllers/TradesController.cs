using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Hubs;
using FantasyLeague.Api.Services;

namespace FantasyLeague.Api.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class TradesController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly ILogger<TradesController> _logger;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly IBackgroundEmailService _backgroundEmailService;

        public TradesController(FantasyLeagueContext context, ILogger<TradesController> logger, IHubContext<ChatHub> hubContext, IBackgroundEmailService backgroundEmailService)
        {
            _context = context;
            _logger = logger;
            _hubContext = hubContext;
            _backgroundEmailService = backgroundEmailService;
        }

        // GET: api/trades/league/{leagueId}/teams
        [HttpGet("league/{leagueId}/teams")]
        public async Task<ActionResult<List<LeagueTeamDto>>> GetLeagueTeams(int leagueId)
        {
            try
            {
                _logger.LogInformation($"🤝 Getting league teams for league {leagueId}");

                var league = await _context.Leagues.FindAsync(leagueId);
                if (league == null)
                {
                    return NotFound($"League {leagueId} not found");
                }

                // Get all users in the league with their rosters
                var users = await _context.Users
                    .Where(u => u.LeagueId == leagueId && u.IsActive)
                    .ToListAsync();

                var teams = new List<LeagueTeamDto>();

                foreach (var user in users)
                {
                    var roster = await _context.UserRosters
                        .Where(ur => ur.UserId == user.Id && ur.LeagueId == leagueId)
                        .OrderBy(ur => ur.PickNumber)
                        .ToListAsync();

                    var team = new LeagueTeamDto
                    {
                        UserId = user.Id,
                        Username = user.Username,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        TeamName = null, // Could be extended to include team names
                        Roster = roster.Select(ur => new TradePlayerDto
                        {
                            Id = ur.Id,
                            PlayerName = CleanPlayerName(ur.PlayerName),
                            PlayerPosition = ur.PlayerPosition,
                            PlayerTeam = ur.PlayerTeam,
                            PlayerLeague = ur.PlayerLeague,
                            PickNumber = ur.PickNumber,
                            Round = ur.Round
                        }).ToList()
                    };

                    teams.Add(team);
                }

                _logger.LogInformation($"✅ Retrieved {teams.Count} teams for league {leagueId}");
                return Ok(teams);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error getting league teams for league {leagueId}");
                return StatusCode(500, "An error occurred while retrieving league teams");
            }
        }

        // POST: api/trades/proposals
        [HttpPost("proposals")]
        public async Task<ActionResult<TradeProposalResponseDto>> CreateTradeProposal(CreateTradeProposalDto request)
        {
            try
            {
                _logger.LogInformation($"🤝 Creating trade proposal from user {request.ProposingUserId} to user {request.TargetUserId}");

                // Validate league exists
                var league = await _context.Leagues.FindAsync(request.LeagueId);
                if (league == null)
                {
                    return BadRequest("League not found");
                }

                // Validate users exist and are in the league
                var proposingUser = await _context.Users.FindAsync(request.ProposingUserId);
                var targetUser = await _context.Users.FindAsync(request.TargetUserId);

                if (proposingUser == null || targetUser == null)
                {
                    return BadRequest("One or both users not found");
                }

                if (proposingUser.LeagueId != request.LeagueId || targetUser.LeagueId != request.LeagueId)
                {
                    return BadRequest("Users must be in the specified league");
                }

                if (request.ProposingUserId == request.TargetUserId)
                {
                    return BadRequest("Cannot propose trade to yourself");
                }

                // Validate player ownership
                var proposingPlayers = await _context.UserRosters
                    .Where(ur => request.ProposingPlayerIds.Contains(ur.Id) && 
                                ur.UserId == request.ProposingUserId && 
                                ur.LeagueId == request.LeagueId)
                    .ToListAsync();

                var targetPlayers = await _context.UserRosters
                    .Where(ur => request.TargetPlayerIds.Contains(ur.Id) && 
                                ur.UserId == request.TargetUserId && 
                                ur.LeagueId == request.LeagueId)
                    .ToListAsync();

                if (proposingPlayers.Count != request.ProposingPlayerIds.Count)
                {
                    return BadRequest("Invalid player selection for proposing user");
                }

                if (targetPlayers.Count != request.TargetPlayerIds.Count)
                {
                    return BadRequest("Invalid player selection for target user");
                }

                // Create trade proposal
                var tradeProposal = new TradeProposal
                {
                    LeagueId = request.LeagueId,
                    ProposingUserId = request.ProposingUserId,
                    TargetUserId = request.TargetUserId,
                    Status = "pending",
                    Message = request.Message,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(7)
                };

                _context.TradeProposals.Add(tradeProposal);
                await _context.SaveChangesAsync();

                // Create trade player entries
                var tradePlayers = new List<TradePlayer>();

                // Add proposing players
                foreach (var player in proposingPlayers)
                {
                    tradePlayers.Add(new TradePlayer
                    {
                        TradeProposalId = tradeProposal.Id,
                        UserRosterId = player.Id,
                        UserId = request.ProposingUserId,
                        TradeType = "offering",
                        PlayerName = player.PlayerName,
                        PlayerPosition = player.PlayerPosition,
                        PlayerTeam = player.PlayerTeam,
                        PlayerLeague = player.PlayerLeague,
                        PickNumber = player.PickNumber,
                        Round = player.Round
                    });
                }

                // Add target players
                foreach (var player in targetPlayers)
                {
                    tradePlayers.Add(new TradePlayer
                    {
                        TradeProposalId = tradeProposal.Id,
                        UserRosterId = player.Id,
                        UserId = request.TargetUserId,
                        TradeType = "receiving",
                        PlayerName = player.PlayerName,
                        PlayerPosition = player.PlayerPosition,
                        PlayerTeam = player.PlayerTeam,
                        PlayerLeague = player.PlayerLeague,
                        PickNumber = player.PickNumber,
                        Round = player.Round
                    });
                }

                _context.TradePlayers.AddRange(tradePlayers);

                // Create notification for target user
                var notification = new TradeNotification
                {
                    UserId = request.TargetUserId,
                    TradeProposalId = tradeProposal.Id,
                    Type = "trade_proposal_received",
                    Message = $"{proposingUser.Username} has proposed a trade with you",
                    IsRead = false
                };

                _context.TradeNotifications.Add(notification);
                await _context.SaveChangesAsync();

                // Send SignalR notification to the target user
                await _hubContext.Clients.Group($"League_{request.LeagueId}")
                    .SendAsync("TradeProposalReceived", new
                    {
                        TradeProposalId = tradeProposal.Id,
                        TargetUserId = request.TargetUserId,
                        ProposingUserId = request.ProposingUserId,
                        ProposingUserName = proposingUser.Username,
                        Message = notification.Message
                    });

                // Queue email notification to the target user
                try
                {
                    await _backgroundEmailService.QueueTradeProposalEmailAsync(request.TargetUserId, request.ProposingUserId, request.Message, tradeProposal.Id);
                    _logger.LogInformation($"📧 Email notification queued for user {targetUser.Email} for trade proposal {tradeProposal.Id}");
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, $"⚠️ Failed to queue email notification for trade proposal {tradeProposal.Id}, but trade proposal was created successfully");
                }

                // Return the created trade proposal
                var createdTradeDto = await GetTradeProposalDto(tradeProposal.Id);

                _logger.LogInformation($"✅ Created trade proposal with ID {tradeProposal.Id} and sent notifications");
                
                return Ok(new TradeProposalResponseDto
                {
                    Success = true,
                    TradeProposal = createdTradeDto,
                    Message = "Trade proposal created successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error creating trade proposal");
                return StatusCode(500, new TradeProposalResponseDto
                {
                    Success = false,
                    Message = "An error occurred while creating the trade proposal"
                });
            }
        }

        // GET: api/trades/proposals/user/{userId}
        [HttpGet("proposals/user/{userId}")]
        public async Task<ActionResult<List<TradeProposalDto>>> GetUserTradeProposals(int userId)
        {
            try
            {
                _logger.LogInformation($"📋 Getting trade proposals for user {userId}");

                var tradeProposals = await _context.TradeProposals
                    .Where(tp => tp.ProposingUserId == userId || tp.TargetUserId == userId)
                    .OrderByDescending(tp => tp.CreatedAt)
                    .ToListAsync();

                var tradeDtos = new List<TradeProposalDto>();
                foreach (var trade in tradeProposals)
                {
                    var tradeDto = await GetTradeProposalDto(trade.Id);
                    if (tradeDto != null)
                    {
                        tradeDtos.Add(tradeDto);
                    }
                }

                _logger.LogInformation($"✅ Retrieved {tradeDtos.Count} trade proposals for user {userId}");
                return Ok(tradeDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error getting trade proposals for user {userId}");
                return StatusCode(500, "An error occurred while retrieving trade proposals");
            }
        }

        // GET: api/trades/proposals/user/{userId}/received/pending
        [HttpGet("proposals/user/{userId}/received/pending")]
        public async Task<ActionResult<List<TradeProposalDto>>> GetPendingTradesReceived(int userId)
        {
            try
            {
                _logger.LogInformation($"📋 Getting pending trades received for user {userId}");

                var tradeProposals = await _context.TradeProposals
                    .Where(tp => tp.TargetUserId == userId && tp.Status == "pending" && tp.ExpiresAt > DateTime.UtcNow)
                    .OrderByDescending(tp => tp.CreatedAt)
                    .ToListAsync();

                var tradeDtos = new List<TradeProposalDto>();
                foreach (var trade in tradeProposals)
                {
                    var tradeDto = await GetTradeProposalDto(trade.Id);
                    if (tradeDto != null)
                    {
                        tradeDtos.Add(tradeDto);
                    }
                }

                _logger.LogInformation($"✅ Retrieved {tradeDtos.Count} pending trades for user {userId}");
                return Ok(tradeDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error getting pending trades for user {userId}");
                return StatusCode(500, "An error occurred while retrieving pending trades");
            }
        }

        // GET: api/trades/proposals/user/{userId}/proposed/pending
        [HttpGet("proposals/user/{userId}/proposed/pending")]
        public async Task<ActionResult<List<TradeProposalDto>>> GetPendingTradesProposed(int userId)
        {
            try
            {
                _logger.LogInformation($"📋 Getting pending trades proposed by user {userId}");

                var tradeProposals = await _context.TradeProposals
                    .Where(tp => tp.ProposingUserId == userId && tp.Status == "pending" && tp.ExpiresAt > DateTime.UtcNow)
                    .OrderByDescending(tp => tp.CreatedAt)
                    .ToListAsync();

                var tradeDtos = new List<TradeProposalDto>();
                foreach (var trade in tradeProposals)
                {
                    var tradeDto = await GetTradeProposalDto(trade.Id);
                    if (tradeDto != null)
                    {
                        tradeDtos.Add(tradeDto);
                    }
                }

                _logger.LogInformation($"✅ Retrieved {tradeDtos.Count} pending trades proposed by user {userId}");
                return Ok(tradeDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error getting pending trades proposed by user {userId}");
                return StatusCode(500, "An error occurred while retrieving pending trades");
            }
        }

        // PUT: api/trades/proposals/{tradeId}/respond
        [HttpPut("proposals/{tradeId}/respond")]
        public async Task<ActionResult<TradeProposalResponseDto>> RespondToTradeProposal(int tradeId, RespondToTradeDto request)
        {
            try
            {
                _logger.LogInformation($"🤝 {(request.Accept ? "Accepting" : "Rejecting")} trade proposal {tradeId}");

                var tradeProposal = await _context.TradeProposals
                    .Include(tp => tp.ProposingUser)
                    .Include(tp => tp.TargetUser)
                    .FirstOrDefaultAsync(tp => tp.Id == tradeId);

                if (tradeProposal == null)
                {
                    return NotFound("Trade proposal not found");
                }

                if (tradeProposal.Status != "pending")
                {
                    return BadRequest($"Trade proposal is already {tradeProposal.Status}");
                }

                if (tradeProposal.ExpiresAt <= DateTime.UtcNow)
                {
                    tradeProposal.Status = "expired";
                    tradeProposal.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return BadRequest("Trade proposal has expired");
                }

                // Update trade proposal status
                tradeProposal.Status = request.Accept ? "accepted" : "rejected";
                tradeProposal.UpdatedAt = DateTime.UtcNow;

                if (request.Accept)
                {
                    // Execute the trade - swap players between rosters
                    await ExecuteTrade(tradeProposal);
                }

                // Mark all existing notifications related to this trade proposal as read
                // This prevents old notifications from showing up after the trade is resolved
                var relatedNotifications = await _context.TradeNotifications
                    .Where(tn => tn.TradeProposalId == tradeProposal.Id && !tn.IsRead)
                    .ToListAsync();

                foreach (var relatedNotification in relatedNotifications)
                {
                    relatedNotification.IsRead = true;
                    relatedNotification.ReadAt = DateTime.UtcNow;
                }

                // Create notification for proposing user
                var notificationType = request.Accept ? "trade_proposal_accepted" : "trade_proposal_rejected";
                var notificationMessage = request.Accept 
                    ? $"{tradeProposal.TargetUser.Username} has accepted your trade proposal"
                    : $"{tradeProposal.TargetUser.Username} has rejected your trade proposal";

                var notification = new TradeNotification
                {
                    UserId = tradeProposal.ProposingUserId,
                    TradeProposalId = tradeProposal.Id,
                    Type = notificationType,
                    Message = notificationMessage,
                    IsRead = false
                };

                _context.TradeNotifications.Add(notification);
                await _context.SaveChangesAsync();

                // Send SignalR notification to the proposing user
                var signalREventName = request.Accept ? "TradeProposalAccepted" : "TradeProposalRejected";
                await _hubContext.Clients.Group($"League_{tradeProposal.LeagueId}")
                    .SendAsync(signalREventName, new
                    {
                        TradeProposalId = tradeProposal.Id,
                        ProposingUserId = tradeProposal.ProposingUserId,
                        TargetUserId = tradeProposal.TargetUserId,
                        RespondingUserName = tradeProposal.TargetUser.Username,
                        Message = notificationMessage,
                        Accepted = request.Accept
                    });

                // Queue email notification to the proposing user
                try
                {
                    await _backgroundEmailService.QueueTradeResponseEmailAsync(tradeProposal.ProposingUserId, tradeProposal.TargetUserId, request.Accept, notificationMessage, tradeProposal.Id);
                    _logger.LogInformation($"📧 Email notification queued for user {tradeProposal.ProposingUser.Email} for trade response {tradeProposal.Id}");
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, $"⚠️ Failed to queue email notification for trade response {tradeProposal.Id}, but trade response was processed successfully");
                }

                var updatedTradeDto = await GetTradeProposalDto(tradeProposal.Id);

                _logger.LogInformation($"✅ {(request.Accept ? "Accepted" : "Rejected")} trade proposal {tradeId} and sent notifications");

                return Ok(new TradeProposalResponseDto
                {
                    Success = true,
                    TradeProposal = updatedTradeDto,
                    Message = $"Trade proposal {(request.Accept ? "accepted" : "rejected")} successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error responding to trade proposal {tradeId}");
                return StatusCode(500, new TradeProposalResponseDto
                {
                    Success = false,
                    Message = "An error occurred while responding to the trade proposal"
                });
            }
        }

        // PUT: api/trades/proposals/{tradeId}/cancel
        [HttpPut("proposals/{tradeId}/cancel")]
        public async Task<ActionResult<TradeProposalResponseDto>> CancelTradeProposal(int tradeId)
        {
            try
            {
                _logger.LogInformation($"❌ Cancelling trade proposal {tradeId}");

                var tradeProposal = await _context.TradeProposals.FindAsync(tradeId);
                if (tradeProposal == null)
                {
                    return NotFound("Trade proposal not found");
                }

                if (tradeProposal.Status != "pending")
                {
                    return BadRequest($"Cannot cancel trade proposal that is {tradeProposal.Status}");
                }

                tradeProposal.Status = "cancelled";
                tradeProposal.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                var updatedTradeDto = await GetTradeProposalDto(tradeProposal.Id);

                _logger.LogInformation($"✅ Cancelled trade proposal {tradeId}");

                return Ok(new TradeProposalResponseDto
                {
                    Success = true,
                    TradeProposal = updatedTradeDto,
                    Message = "Trade proposal cancelled successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error cancelling trade proposal {tradeId}");
                return StatusCode(500, new TradeProposalResponseDto
                {
                    Success = false,
                    Message = "An error occurred while cancelling the trade proposal"
                });
            }
        }

        // GET: api/trades/activity/league/{leagueId}
        [HttpGet("activity/league/{leagueId}")]
        public async Task<ActionResult<List<TradeActivityDto>>> GetLeagueTradeActivity(int leagueId)
        {
            try
            {
                _logger.LogInformation($"🏆 Getting league trade activity for league {leagueId}");

                // Get recent completed trades (accepted) in the last 7 days
                var completedTrades = await _context.TradeProposals
                    .Include(tp => tp.ProposingUser)
                    .Include(tp => tp.TargetUser)
                    .Where(tp => tp.LeagueId == leagueId && 
                                tp.Status == "accepted" && 
                                tp.UpdatedAt >= DateTime.UtcNow.AddDays(-7))
                    .OrderByDescending(tp => tp.UpdatedAt)
                    .Take(10)
                    .ToListAsync();

                var activities = completedTrades.Select(tp => new TradeActivityDto
                {
                    Id = tp.Id,
                    ProposingUser = tp.ProposingUser.Username,
                    TargetUser = tp.TargetUser.Username,
                    CompletedAt = tp.UpdatedAt,
                    Message = $"{tp.ProposingUser.Username} and {tp.TargetUser.Username} completed a trade"
                }).ToList();

                _logger.LogInformation($"✅ Retrieved {activities.Count} league trade activities");
                return Ok(activities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error getting league trade activity for league {leagueId}");
                return StatusCode(500, "An error occurred while retrieving league trade activity");
            }
        }

        // GET: api/trades/notifications/user/{userId}
        [HttpGet("notifications/user/{userId}")]
        public async Task<ActionResult<List<TradeNotificationDto>>> GetTradeNotifications(int userId)
        {
            try
            {
                _logger.LogInformation($"🔔 Getting trade notifications for user {userId}");

                var notifications = await _context.TradeNotifications
                    .Where(tn => tn.UserId == userId)
                    .OrderByDescending(tn => tn.CreatedAt)
                    .Select(tn => new TradeNotificationDto
                    {
                        Id = tn.Id,
                        UserId = tn.UserId,
                        Type = tn.Type,
                        TradeProposalId = tn.TradeProposalId,
                        Message = tn.Message,
                        IsRead = tn.IsRead,
                        CreatedAt = tn.CreatedAt
                    })
                    .ToListAsync();

                _logger.LogInformation($"✅ Retrieved {notifications.Count} trade notifications for user {userId}");
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error getting trade notifications for user {userId}");
                return StatusCode(500, "An error occurred while retrieving trade notifications");
            }
        }

        // PUT: api/trades/notifications/{notificationId}/read
        [HttpPut("notifications/{notificationId}/read")]
        public async Task<ActionResult> MarkNotificationAsRead(int notificationId)
        {
            try
            {
                _logger.LogInformation($"✅ Marking trade notification {notificationId} as read");

                var notification = await _context.TradeNotifications.FindAsync(notificationId);
                if (notification == null)
                {
                    return NotFound("Notification not found");
                }

                notification.IsRead = true;
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation($"✅ Marked notification {notificationId} as read");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error marking notification {notificationId} as read");
                return StatusCode(500, "An error occurred while marking notification as read");
            }
        }

        // Private helper methods
        private async Task<TradeProposalDto?> GetTradeProposalDto(int tradeProposalId)
        {
            var tradeProposal = await _context.TradeProposals
                .Include(tp => tp.ProposingUser)
                .Include(tp => tp.TargetUser)
                .FirstOrDefaultAsync(tp => tp.Id == tradeProposalId);

            if (tradeProposal == null) return null;

            var proposingPlayersData = await _context.TradePlayers
                .Where(tp => tp.TradeProposalId == tradeProposalId && tp.TradeType == "offering")
                .ToListAsync();

            var proposingPlayers = proposingPlayersData.Select(tp => new TradePlayerDto
            {
                Id = tp.UserRosterId,
                PlayerName = CleanPlayerName(tp.PlayerName),
                PlayerPosition = tp.PlayerPosition,
                PlayerTeam = tp.PlayerTeam,
                PlayerLeague = tp.PlayerLeague,
                PickNumber = tp.PickNumber,
                Round = tp.Round
            }).ToList();

            var targetPlayersData = await _context.TradePlayers
                .Where(tp => tp.TradeProposalId == tradeProposalId && tp.TradeType == "receiving")
                .ToListAsync();

            var targetPlayers = targetPlayersData.Select(tp => new TradePlayerDto
            {
                Id = tp.UserRosterId,
                PlayerName = CleanPlayerName(tp.PlayerName),
                PlayerPosition = tp.PlayerPosition,
                PlayerTeam = tp.PlayerTeam,
                PlayerLeague = tp.PlayerLeague,
                PickNumber = tp.PickNumber,
                Round = tp.Round
            }).ToList();

            return new TradeProposalDto
            {
                Id = tradeProposal.Id,
                LeagueId = tradeProposal.LeagueId,
                ProposingUserId = tradeProposal.ProposingUserId,
                TargetUserId = tradeProposal.TargetUserId,
                ProposingUser = new TradeParticipantDto
                {
                    UserId = tradeProposal.ProposingUser.Id,
                    Username = tradeProposal.ProposingUser.Username,
                    FirstName = tradeProposal.ProposingUser.FirstName,
                    LastName = tradeProposal.ProposingUser.LastName
                },
                TargetUser = new TradeParticipantDto
                {
                    UserId = tradeProposal.TargetUser.Id,
                    Username = tradeProposal.TargetUser.Username,
                    FirstName = tradeProposal.TargetUser.FirstName,
                    LastName = tradeProposal.TargetUser.LastName
                },
                ProposingPlayers = proposingPlayers,
                TargetPlayers = targetPlayers,
                Status = tradeProposal.Status,
                Message = tradeProposal.Message,
                CreatedAt = tradeProposal.CreatedAt,
                UpdatedAt = tradeProposal.UpdatedAt,
                ExpiresAt = tradeProposal.ExpiresAt
            };
        }

        private async Task ExecuteTrade(TradeProposal tradeProposal)
        {
            // Get all players involved in the trade
            var tradePlayers = await _context.TradePlayers
                .Where(tp => tp.TradeProposalId == tradeProposal.Id)
                .ToListAsync();

            var proposingPlayerIds = tradePlayers
                .Where(tp => tp.TradeType == "offering")
                .Select(tp => tp.UserRosterId)
                .ToList();

            var targetPlayerIds = tradePlayers
                .Where(tp => tp.TradeType == "receiving")
                .Select(tp => tp.UserRosterId)
                .ToList();

            // Get the actual roster entries
            var proposingRosterPlayers = await _context.UserRosters
                .Where(ur => proposingPlayerIds.Contains(ur.Id))
                .ToListAsync();

            var targetRosterPlayers = await _context.UserRosters
                .Where(ur => targetPlayerIds.Contains(ur.Id))
                .ToListAsync();

            // Swap ownership
            foreach (var player in proposingRosterPlayers)
            {
                player.UserId = tradeProposal.TargetUserId;
            }

            foreach (var player in targetRosterPlayers)
            {
                player.UserId = tradeProposal.ProposingUserId;
            }

            // Create a single transaction record for the entire trade
            var proposingPlayerNames = proposingRosterPlayers.Select(p => CleanPlayerName(p.PlayerName)).ToList();
            var targetPlayerNames = targetRosterPlayers.Select(p => CleanPlayerName(p.PlayerName)).ToList();
            
            var proposingPlayersStr = string.Join(", ", proposingPlayerNames);
            var targetPlayersStr = string.Join(", ", targetPlayerNames);
            
            var tradeDescription = $"Trade completed: {tradeProposal.ProposingUser.Username} traded {proposingPlayersStr} to {tradeProposal.TargetUser.Username} for {targetPlayersStr}";
            
            var tradeTransaction = new Transaction
            {
                LeagueId = tradeProposal.LeagueId,
                UserId = tradeProposal.ProposingUserId, // Use proposing user as the primary user for the transaction
                Type = TransactionType.Trade,
                Description = tradeDescription,
                PlayerName = null, // No single player since this represents the entire trade
                PlayerPosition = null,
                PlayerTeam = null,
                PlayerLeague = null
            };

            _context.Transactions.Add(tradeTransaction);
            _logger.LogInformation($"🔄 Executed trade between users {tradeProposal.ProposingUserId} and {tradeProposal.TargetUserId}");
        }

        private static string CleanPlayerName(string playerName)
        {
            if (string.IsNullOrEmpty(playerName)) return playerName;
            
            // Format: "player-id:Player Name (AUTO)"
            var parts = playerName.Split(':', 2);
            if (parts.Length > 1)
            {
                // Remove "(AUTO)" suffix and trim
                return parts[1].Replace(" (AUTO)", "").Trim();
            }
            
            return playerName;
        }
    }
}