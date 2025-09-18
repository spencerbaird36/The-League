using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class TradeNotification
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
        
        [Required]
        public int TradeProposalId { get; set; }
        
        [ForeignKey("TradeProposalId")]
        public TradeProposal TradeProposal { get; set; } = null!;

        public int? LeagueId { get; set; }

        [ForeignKey("LeagueId")]
        public League? League { get; set; }

        [Required]
        [StringLength(50)]
        public string Type { get; set; } = string.Empty; // trade_proposal_received, trade_proposal_accepted, trade_proposal_rejected
        
        [Required]
        [StringLength(255)]
        public string Message { get; set; } = string.Empty;
        
        public bool IsRead { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ReadAt { get; set; }
    }
}