using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class BettingNotification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Required]
        public BettingNotificationType Type { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        [Required]
        public BettingNotificationPriority Priority { get; set; } = BettingNotificationPriority.Normal;

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }

        public DateTime? ExpiresAt { get; set; }

        // Related entity IDs for context
        public int? BetId { get; set; }

        [ForeignKey("BetId")]
        public Bet? Bet { get; set; }

        public int? MatchupBetId { get; set; }

        [ForeignKey("MatchupBetId")]
        public MatchupBet? MatchupBet { get; set; }

        public int? GameBetId { get; set; }

        [ForeignKey("GameBetId")]
        public GameBet? GameBet { get; set; }

        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        [MaxLength(100)]
        public string? ActionText { get; set; }

        // JSON metadata for additional context
        [MaxLength(2000)]
        public string? Metadata { get; set; }

        // Calculated properties
        [NotMapped]
        public bool IsExpired => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;

        [NotMapped]
        public TimeSpan? TimeToExpiry => ExpiresAt.HasValue ? ExpiresAt.Value - DateTime.UtcNow : null;
    }

    public enum BettingNotificationType
    {
        BetPlaced = 1,              // Bet successfully placed
        BetWon = 2,                 // Bet won, payout processed
        BetLost = 3,                // Bet lost
        BetPush = 4,                // Bet pushed/tied, refunded
        BetCancelled = 5,           // Bet cancelled by user
        BetVoided = 6,              // Bet voided by admin
        BetExpired = 7,             // Bet expired before event
        BetSettled = 8,             // General bet settlement notification
        NewBettingOpportunity = 9,  // New matchup/game available for betting
        BettingLineUpdate = 10,     // Odds/lines updated for active bet
        ExpirationWarning = 11,     // Bet expiring soon
        LimitWarning = 12,          // Approaching betting limits
        BalanceAlert = 13,          // Low token balance warning
        WinStreak = 14,             // Win streak milestone
        LossStreak = 15,            // Loss streak warning
        BigWin = 16,                // Large win notification
        BigLoss = 17,               // Large loss notification
        SystemMessage = 18          // System-wide betting announcements
    }

    public enum BettingNotificationPriority
    {
        Low = 1,        // General information, can be ignored
        Normal = 2,     // Standard notifications
        High = 3,       // Important but not urgent
        Urgent = 4,     // Requires immediate attention
        Critical = 5    // Critical system alerts
    }
}