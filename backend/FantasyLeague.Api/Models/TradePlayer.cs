using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class TradePlayer
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int TradeProposalId { get; set; }
        
        [ForeignKey("TradeProposalId")]
        public TradeProposal TradeProposal { get; set; } = null!;
        
        [Required]
        public int UserRosterId { get; set; }
        
        [ForeignKey("UserRosterId")]
        public UserRoster UserRoster { get; set; } = null!;
        
        [Required]
        public int UserId { get; set; } // The user who owns this player
        
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
        
        [Required]
        [StringLength(10)]
        public string TradeType { get; set; } = string.Empty; // "offering" or "receiving"
        
        // Denormalized player info for faster queries and historical tracking
        [Required]
        public string PlayerName { get; set; } = string.Empty;
        
        [Required]
        public string PlayerPosition { get; set; } = string.Empty;
        
        [Required]
        public string PlayerTeam { get; set; } = string.Empty;
        
        [Required]
        public string PlayerLeague { get; set; } = string.Empty;
        
        public int PickNumber { get; set; }
        
        public int Round { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}