using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class TradeProposal
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int LeagueId { get; set; }
        
        [ForeignKey("LeagueId")]
        public League League { get; set; } = null!;
        
        [Required]
        public int ProposingUserId { get; set; }
        
        [ForeignKey("ProposingUserId")]
        public User ProposingUser { get; set; } = null!;
        
        [Required]
        public int TargetUserId { get; set; }
        
        [ForeignKey("TargetUserId")]
        public User TargetUser { get; set; } = null!;
        
        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "pending"; // pending, accepted, rejected, cancelled, expired
        
        [StringLength(500)]
        public string? Message { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7); // Expires in 7 days
        
        // Navigation property for all players involved in trade (use TradeType to filter)
        public ICollection<TradePlayer> TradePlayers { get; set; } = new List<TradePlayer>();
        
        // Navigation property for notifications
        public ICollection<TradeNotification> Notifications { get; set; } = new List<TradeNotification>();
    }
}