using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.DTOs;
using FantasyLeague.Api.Models;
using System.Security.Claims;

namespace FantasyLeague.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class BettingNotificationsController : ControllerBase
    {
        private readonly IBettingNotificationService _notificationService;
        private readonly ILogger<BettingNotificationsController> _logger;

        public BettingNotificationsController(
            IBettingNotificationService notificationService,
            ILogger<BettingNotificationsController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Get user's betting notifications with pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<BettingNotificationDto>>> GetNotifications(
            [FromQuery] bool unreadOnly = false,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            try
            {
                var userId = GetCurrentUserId();
                var notifications = await _notificationService.GetUserNotificationsAsync(userId, unreadOnly, page, pageSize);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving notifications");
            }
        }

        /// <summary>
        /// Get count of unread notifications
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            try
            {
                var userId = GetCurrentUserId();
                var count = await _notificationService.GetUnreadCountAsync(userId);
                return Ok(count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread count for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving unread count");
            }
        }

        /// <summary>
        /// Get specific notification by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<BettingNotificationDto>> GetNotification(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var notification = await _notificationService.GetNotificationAsync(id, userId);

                if (notification == null)
                    return NotFound("Notification not found");

                return Ok(notification);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notification {NotificationId} for user {UserId}", id, GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving the notification");
            }
        }

        /// <summary>
        /// Mark notification as read
        /// </summary>
        [HttpPut("{id}/read")]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _notificationService.MarkAsReadAsync(id, userId);

                if (!success)
                    return NotFound("Notification not found");

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification {NotificationId} as read for user {UserId}", id, GetCurrentUserId());
                return StatusCode(500, "An error occurred while marking notification as read");
            }
        }

        /// <summary>
        /// Mark all notifications as read for the current user
        /// </summary>
        [HttpPut("mark-all-read")]
        public async Task<ActionResult> MarkAllAsRead()
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _notificationService.MarkAllAsReadAsync(userId);

                if (!success)
                    return BadRequest("Failed to mark notifications as read");

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while marking notifications as read");
            }
        }

        /// <summary>
        /// Delete a specific notification
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteNotification(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _notificationService.DeleteNotificationAsync(id, userId);

                if (!success)
                    return NotFound("Notification not found");

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification {NotificationId} for user {UserId}", id, GetCurrentUserId());
                return StatusCode(500, "An error occurred while deleting the notification");
            }
        }

        /// <summary>
        /// Get notification statistics for the current user
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult> GetStats([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                var stats = await _notificationService.GetNotificationStatsAsync(userId, startDate, endDate);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notification stats for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving notification statistics");
            }
        }

        /// <summary>
        /// Create a custom notification (for testing or special cases)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<BettingNotificationDto>> CreateNotification([FromBody] CreateBettingNotificationDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var notification = await _notificationService.CreateNotificationAsync(
                    userId,
                    request.Type,
                    request.Title,
                    request.Message,
                    request.Priority,
                    request.BetId,
                    request.MatchupBetId,
                    request.GameBetId,
                    request.ActionUrl,
                    request.ActionText,
                    request.ExpiresAt,
                    request.Metadata
                );

                var dto = new BettingNotificationDto
                {
                    Id = notification.Id,
                    UserId = notification.UserId,
                    Type = notification.Type,
                    TypeDisplayName = notification.Type.GetBettingNotificationTypeDisplayName(),
                    Title = notification.Title,
                    Message = notification.Message,
                    Priority = notification.Priority,
                    PriorityDisplayName = notification.Priority.GetBettingNotificationPriorityDisplayName(),
                    IsRead = notification.IsRead,
                    CreatedAt = notification.CreatedAt,
                    ReadAt = notification.ReadAt,
                    ExpiresAt = notification.ExpiresAt,
                    IsExpired = notification.IsExpired,
                    TimeToExpiry = notification.TimeToExpiry,
                    BetId = notification.BetId,
                    MatchupBetId = notification.MatchupBetId,
                    GameBetId = notification.GameBetId,
                    ActionUrl = notification.ActionUrl,
                    ActionText = notification.ActionText,
                    Metadata = notification.Metadata
                };

                return CreatedAtAction(nameof(GetNotification), new { id = notification.Id }, dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating notification for user {UserId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while creating the notification");
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }
    }

    /// <summary>
    /// Admin controller for managing betting notifications system-wide
    /// </summary>
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/admin/betting-notifications")]
    public class AdminBettingNotificationsController : ControllerBase
    {
        private readonly IBettingNotificationService _notificationService;
        private readonly ILogger<AdminBettingNotificationsController> _logger;

        public AdminBettingNotificationsController(
            IBettingNotificationService notificationService,
            ILogger<AdminBettingNotificationsController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Send notification to multiple users
        /// </summary>
        [HttpPost("bulk")]
        public async Task<ActionResult> SendBulkNotification([FromBody] BulkNotificationDto request)
        {
            try
            {
                await _notificationService.NotifyMultipleUsersAsync(
                    request.UserIds,
                    request.Type,
                    request.Title,
                    request.Message,
                    request.Priority
                );

                _logger.LogInformation($"Admin {GetCurrentUserId()} sent bulk notification to {request.UserIds.Count} users");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending bulk notification by admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while sending bulk notification");
            }
        }

        /// <summary>
        /// Send notification to all users
        /// </summary>
        [HttpPost("broadcast")]
        public async Task<ActionResult> BroadcastNotification([FromBody] CreateBettingNotificationDto request)
        {
            try
            {
                await _notificationService.NotifyAllUsersAsync(
                    request.Type,
                    request.Title,
                    request.Message,
                    request.Priority
                );

                _logger.LogInformation($"Admin {GetCurrentUserId()} broadcast notification to all users");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting notification by admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while broadcasting notification");
            }
        }

        /// <summary>
        /// Send system message
        /// </summary>
        [HttpPost("system-message")]
        public async Task<ActionResult> SendSystemMessage([FromBody] CreateBettingNotificationDto request)
        {
            try
            {
                await _notificationService.NotifySystemMessageAsync(
                    request.Title,
                    request.Message,
                    request.Priority
                );

                _logger.LogInformation($"Admin {GetCurrentUserId()} sent system message");
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending system message by admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while sending system message");
            }
        }

        /// <summary>
        /// Get system-wide notification statistics
        /// </summary>
        [HttpGet("stats")]
        public async Task<ActionResult> GetSystemStats([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var stats = await _notificationService.GetNotificationStatsAsync(null, startDate, endDate);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system notification stats by admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving system notification statistics");
            }
        }

        /// <summary>
        /// Get recent system notifications
        /// </summary>
        [HttpGet("recent-system")]
        public async Task<ActionResult<List<BettingNotificationDto>>> GetRecentSystemNotifications([FromQuery] int count = 10)
        {
            try
            {
                var notifications = await _notificationService.GetRecentSystemNotificationsAsync(count);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recent system notifications by admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while retrieving recent system notifications");
            }
        }

        /// <summary>
        /// Delete expired notifications system-wide
        /// </summary>
        [HttpDelete("expired")]
        public async Task<ActionResult> DeleteExpiredNotifications()
        {
            try
            {
                var deletedCount = await _notificationService.DeleteExpiredNotificationsAsync();
                _logger.LogInformation($"Admin {GetCurrentUserId()} deleted {deletedCount} expired notifications");
                return Ok(new { deletedCount });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting expired notifications by admin {AdminId}", GetCurrentUserId());
                return StatusCode(500, "An error occurred while deleting expired notifications");
            }
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new UnauthorizedAccessException("Invalid user ID in token");
            }
            return userId;
        }
    }
}