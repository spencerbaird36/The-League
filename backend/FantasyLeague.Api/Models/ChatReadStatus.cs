using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class ChatReadStatus
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
        
        [Required]
        public int LeagueId { get; set; }
        
        [ForeignKey("LeagueId")]
        public League League { get; set; } = null!;
        
        [Required]
        public int LastReadMessageId { get; set; }
        
        [ForeignKey("LastReadMessageId")]
        public ChatMessage LastReadMessage { get; set; } = null!;
        
        public DateTime LastReadAt { get; set; } = DateTime.UtcNow;
    }
}