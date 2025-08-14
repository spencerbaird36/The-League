using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class ChatMessageDto
    {
        public int Id { get; set; }
        public int LeagueId { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
    
    public class CreateChatMessageDto
    {
        [Required]
        [StringLength(1000, MinimumLength = 1)]
        public string Message { get; set; } = string.Empty;
    }
    
    public class ChatReadStatusDto
    {
        public int UnreadCount { get; set; }
        public int? LastReadMessageId { get; set; }
    }
}