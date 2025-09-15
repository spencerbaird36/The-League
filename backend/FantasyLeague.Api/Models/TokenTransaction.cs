using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class TokenTransaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required]
        public TokenTransactionType Type { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceBefore { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal BalanceAfter { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? PaymentMethodId { get; set; } // For Stripe payment method ID

        [MaxLength(100)]
        public string? PaymentIntentId { get; set; } // For Stripe payment intent ID

        public int? RelatedBetId { get; set; } // For bet-related transactions

        [Required]
        public TokenTransactionStatus Status { get; set; } = TokenTransactionStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ProcessedAt { get; set; }

        // Metadata for additional transaction details
        [MaxLength(1000)]
        public string? Metadata { get; set; } // JSON string for additional data

        // Admin-related fields
        public int? ProcessedByAdminId { get; set; }

        [ForeignKey("ProcessedByAdminId")]
        public User? ProcessedByAdmin { get; set; }
    }

    public enum TokenTransactionType
    {
        Purchase = 1,           // User buys tokens
        AdminCredit = 2,        // Admin adds tokens
        AdminDebit = 3,         // Admin removes tokens
        BetPlaced = 4,          // Tokens moved to pending for bet
        BetWon = 5,             // Tokens returned from winning bet
        BetLost = 6,            // Tokens lost from losing bet
        BetRefunded = 7,        // Tokens returned from cancelled bet
        CashoutRequest = 8,     // Tokens requested for cashout
        CashoutCompleted = 9,   // Tokens cashed out successfully
        CashoutCancelled = 10   // Cashout request cancelled
    }

    public enum TokenTransactionStatus
    {
        Pending = 1,        // Transaction initiated but not processed
        Completed = 2,      // Transaction successfully processed
        Failed = 3,         // Transaction failed
        Cancelled = 4,      // Transaction cancelled
        Refunded = 5        // Transaction was refunded
    }
}