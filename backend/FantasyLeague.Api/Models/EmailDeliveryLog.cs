using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class EmailDeliveryLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        [StringLength(100)]
        public string EmailAddress { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string EmailType { get; set; } = string.Empty; // trade_proposal, trade_accepted, trade_rejected

        [Required]
        [StringLength(200)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "pending"; // pending, sent, failed, bounced, delivered

        public string? SendGridMessageId { get; set; }

        public string? ErrorMessage { get; set; }

        public int RetryCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? SentAt { get; set; }

        public DateTime? DeliveredAt { get; set; }

        // Foreign key
        public User User { get; set; } = null!;

        // Optional foreign keys for context
        public int? TradeProposalId { get; set; }
        public TradeProposal? TradeProposal { get; set; }
    }

    public enum EmailDeliveryStatus
    {
        Pending,
        Sent,
        Failed,
        Bounced,
        Delivered,
        Opened,
        Clicked
    }

    public enum EmailType
    {
        TradeProposal,
        TradeAccepted,
        TradeRejected
    }
}