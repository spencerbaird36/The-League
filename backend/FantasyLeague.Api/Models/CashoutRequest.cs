using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class CashoutRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        public CashoutMethod Method { get; set; }

        [Required]
        [MaxLength(1000)]
        public string PaymentDetails { get; set; } = string.Empty; // Encrypted payment info

        [Required]
        public CashoutStatus Status { get; set; } = CashoutStatus.Pending;

        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        [MaxLength(100)]
        public string? StripeTransferId { get; set; } // For Stripe transfers

        [MaxLength(1000)]
        public string? Metadata { get; set; } // JSON string for additional data

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ProcessedAt { get; set; }

        public int? ProcessedByAdminId { get; set; }

        [ForeignKey("ProcessedByAdminId")]
        public User? ProcessedByAdmin { get; set; }

        // Related token transaction
        public int? TokenTransactionId { get; set; }

        [ForeignKey("TokenTransactionId")]
        public TokenTransaction? TokenTransaction { get; set; }

        // Validation and business logic
        [NotMapped]
        public bool CanBeProcessed => Status == CashoutStatus.Pending;

        [NotMapped]
        public bool RequiresManualReview => Amount >= 1000.00m; // Large amounts need manual review
    }

    public enum CashoutMethod
    {
        BankTransfer = 1,   // ACH transfer to bank account
        PayPal = 2,         // PayPal transfer
        Check = 3,          // Physical check (for large amounts)
        Stripe = 4          // Direct Stripe transfer
    }

    public enum CashoutStatus
    {
        Pending = 1,        // Initial status
        UnderReview = 2,    // Being reviewed by admin
        Approved = 3,       // Approved for processing
        Processing = 4,     // Currently being processed
        Completed = 5,      // Successfully completed
        Rejected = 6,       // Rejected by admin
        Failed = 7,         // Processing failed
        Cancelled = 8       // Cancelled by user or admin
    }
}