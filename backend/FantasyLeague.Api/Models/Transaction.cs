using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public enum TransactionType
    {
        FreeAgentPickup,
        Trade,
        Drop,
        Waiver
    }

    public class Transaction
    {
        public int Id { get; set; }
        
        [Required]
        public int LeagueId { get; set; }
        public League League { get; set; } = null!;
        
        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        [Required]
        public TransactionType Type { get; set; }
        
        [Required]
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;
        
        // Player information for pickup/drop transactions
        [StringLength(100)]
        public string? PlayerName { get; set; }
        
        [StringLength(10)]
        public string? PlayerPosition { get; set; }
        
        [StringLength(50)]
        public string? PlayerTeam { get; set; }
        
        [StringLength(10)]
        public string? PlayerLeague { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // For trades, this could link to another transaction
        public int? RelatedTransactionId { get; set; }
        public Transaction? RelatedTransaction { get; set; }
    }
}