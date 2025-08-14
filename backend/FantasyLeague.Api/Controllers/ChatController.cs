using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;

        public ChatController(FantasyLeagueContext context)
        {
            _context = context;
        }

        // GET: api/chat/league/{leagueId}/messages
        [HttpGet("league/{leagueId}/messages")]
        public async Task<ActionResult<IEnumerable<ChatMessageDto>>> GetMessages(int leagueId, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
        {
            var messages = await _context.ChatMessages
                .Where(m => m.LeagueId == leagueId && !m.IsDeleted)
                .Include(m => m.User)
                .OrderByDescending(m => m.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    LeagueId = m.LeagueId,
                    UserId = m.UserId,
                    Username = m.User.Username,
                    Message = m.Message,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            // Reverse to show newest messages at bottom
            messages.Reverse();
            return Ok(messages);
        }

        // POST: api/chat/league/{leagueId}/messages
        [HttpPost("league/{leagueId}/messages")]
        public async Task<ActionResult<ChatMessageDto>> CreateMessage(int leagueId, CreateChatMessageDto createMessageDto, [FromQuery] int userId)
        {
            // Verify user is in the league
            var userInLeague = await _context.Users
                .AnyAsync(u => u.Id == userId && u.LeagueId == leagueId);

            if (!userInLeague)
            {
                return BadRequest("User is not a member of this league");
            }

            var chatMessage = new ChatMessage
            {
                LeagueId = leagueId,
                UserId = userId,
                Message = createMessageDto.Message,
                CreatedAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            // Get the created message with user info
            var createdMessage = await _context.ChatMessages
                .Where(m => m.Id == chatMessage.Id)
                .Include(m => m.User)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    LeagueId = m.LeagueId,
                    UserId = m.UserId,
                    Username = m.User.Username,
                    Message = m.Message,
                    CreatedAt = m.CreatedAt
                })
                .FirstAsync();

            return CreatedAtAction(nameof(GetMessages), new { leagueId = leagueId }, createdMessage);
        }

        // GET: api/chat/league/{leagueId}/unread-count
        [HttpGet("league/{leagueId}/unread-count")]
        public async Task<ActionResult<ChatReadStatusDto>> GetUnreadCount(int leagueId, [FromQuery] int userId)
        {
            // Verify user is in the league
            var userInLeague = await _context.Users
                .AnyAsync(u => u.Id == userId && u.LeagueId == leagueId);

            if (!userInLeague)
            {
                return BadRequest("User is not a member of this league");
            }

            var readStatus = await _context.ChatReadStatuses
                .Where(rs => rs.UserId == userId && rs.LeagueId == leagueId)
                .FirstOrDefaultAsync();

            int unreadCount;
            if (readStatus == null)
            {
                // User has never read any messages, count all messages in league
                unreadCount = await _context.ChatMessages
                    .Where(m => m.LeagueId == leagueId && !m.IsDeleted)
                    .CountAsync();
            }
            else
            {
                // Count messages created after the last read message
                unreadCount = await _context.ChatMessages
                    .Where(m => m.LeagueId == leagueId && !m.IsDeleted && m.Id > readStatus.LastReadMessageId)
                    .CountAsync();
            }

            return Ok(new ChatReadStatusDto
            {
                UnreadCount = unreadCount,
                LastReadMessageId = readStatus?.LastReadMessageId
            });
        }

        // PUT: api/chat/league/{leagueId}/mark-read
        [HttpPut("league/{leagueId}/mark-read")]
        public async Task<IActionResult> MarkAsRead(int leagueId, [FromQuery] int userId, [FromQuery] int lastMessageId)
        {
            // Verify user is in the league
            var userInLeague = await _context.Users
                .AnyAsync(u => u.Id == userId && u.LeagueId == leagueId);

            if (!userInLeague)
            {
                return BadRequest("User is not a member of this league");
            }

            // Verify the message exists and belongs to the league
            var messageExists = await _context.ChatMessages
                .AnyAsync(m => m.Id == lastMessageId && m.LeagueId == leagueId);

            if (!messageExists)
            {
                return BadRequest("Message not found in this league");
            }

            var readStatus = await _context.ChatReadStatuses
                .Where(rs => rs.UserId == userId && rs.LeagueId == leagueId)
                .FirstOrDefaultAsync();

            if (readStatus == null)
            {
                // Create new read status
                readStatus = new ChatReadStatus
                {
                    UserId = userId,
                    LeagueId = leagueId,
                    LastReadMessageId = lastMessageId,
                    LastReadAt = DateTime.UtcNow
                };
                _context.ChatReadStatuses.Add(readStatus);
            }
            else
            {
                // Update existing read status
                readStatus.LastReadMessageId = lastMessageId;
                readStatus.LastReadAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/chat/messages/{messageId}
        [HttpDelete("messages/{messageId}")]
        public async Task<IActionResult> DeleteMessage(int messageId, [FromQuery] int userId)
        {
            var message = await _context.ChatMessages
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null)
            {
                return NotFound();
            }

            // Only allow users to delete their own messages
            if (message.UserId != userId)
            {
                return Forbid("You can only delete your own messages");
            }

            message.IsDeleted = true;
            message.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}