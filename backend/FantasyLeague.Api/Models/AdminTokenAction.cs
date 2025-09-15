using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class AdminTokenAction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AdminUserId { get; set; }

        [ForeignKey("AdminUserId")]
        public User AdminUser { get; set; } = null!;

        [Required]
        public int TargetUserId { get; set; }

        [ForeignKey("TargetUserId")]
        public User TargetUser { get; set; } = null!;

        [Required]
        public AdminActionType Type { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        public AdminActionStatus Status { get; set; } = AdminActionStatus.Completed;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ProcessedAt { get; set; }

        // Reference to the resulting transaction
        public int? TokenTransactionId { get; set; }

        [ForeignKey("TokenTransactionId")]
        public TokenTransaction? TokenTransaction { get; set; }

        // Additional metadata
        [MaxLength(1000)]
        public string? Metadata { get; set; } // JSON string for additional data
    }

    public enum AdminActionType
    {
        AddTokens = 1,          // Add tokens to user account
        RemoveTokens = 2,       // Remove tokens from user account
        FreezeBetting = 3,      // Prevent user from placing bets
        UnfreezeBetting = 4,    // Allow user to place bets again
        RefundBet = 5,          // Refund a specific bet
        AdjustSystemPool = 6,   // Adjust system token pool
        ManualCashout = 7       // Process manual cashout
    }

    public enum AdminActionStatus
    {
        Pending = 1,        // Action initiated but not processed
        Completed = 2,      // Action successfully completed
        Failed = 3,         // Action failed
        Cancelled = 4       // Action was cancelled
    }
}