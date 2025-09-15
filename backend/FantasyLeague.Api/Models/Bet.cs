using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class Bet
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
        public BetType Type { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PotentialPayout { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Odds { get; set; } // American odds format (-110, +150, etc.)

        [Required]
        public BetStatus Status { get; set; } = BetStatus.Active;

        public DateTime ExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? SettledAt { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        // Reference to the token transaction that placed this bet
        public int TokenTransactionId { get; set; }

        [ForeignKey("TokenTransactionId")]
        public TokenTransaction TokenTransaction { get; set; } = null!;

        // Polymorphic betting - one of these will be populated
        public int? MatchupBetId { get; set; }

        [ForeignKey("MatchupBetId")]
        public MatchupBet? MatchupBet { get; set; }

        public int? GameBetId { get; set; }

        [ForeignKey("GameBetId")]
        public GameBet? GameBet { get; set; }

        // User's bet selections
        public MatchupBetSelection? MatchupSelection { get; set; }
        public GameBetSelection? GameSelection { get; set; }

        // Settlement information
        public int? SettledByAdminId { get; set; }

        [ForeignKey("SettledByAdminId")]
        public User? SettledByAdmin { get; set; }

        [MaxLength(500)]
        public string? SettlementNotes { get; set; }

        // Calculated properties
        [NotMapped]
        public bool IsExpired => DateTime.UtcNow > ExpiresAt;

        [NotMapped]
        public bool CanBeCancelled => Status == BetStatus.Active && !IsExpired;

        [NotMapped]
        public decimal ImpliedProbability => CalculateImpliedProbability(Odds);

        private static decimal CalculateImpliedProbability(decimal americanOdds)
        {
            if (americanOdds > 0)
            {
                return 100m / (americanOdds + 100m);
            }
            else
            {
                return Math.Abs(americanOdds) / (Math.Abs(americanOdds) + 100m);
            }
        }
    }

    public enum BetType
    {
        MatchupSpread = 1,      // League matchup with point spread
        MatchupMoneyline = 2,   // League matchup straight win/loss
        MatchupOverUnder = 3,   // League matchup total points over/under
        GameSpread = 4,         // External game with point spread
        GameMoneyline = 5,      // External game straight win/loss
        GameOverUnder = 6,      // External game total points over/under
        GameProps = 7           // External game prop bets (player stats, etc.)
    }

    public enum BetStatus
    {
        Active = 1,         // Bet is active and can win/lose
        Won = 2,            // Bet won, payout processed
        Lost = 3,           // Bet lost, tokens forfeited
        Push = 4,           // Tie/push, tokens refunded
        Cancelled = 5,      // Bet cancelled, tokens refunded
        Voided = 6,         // Bet voided by admin, tokens refunded
        Expired = 7,        // Bet expired before event, tokens refunded
        Pending = 8         // Bet placed but not yet confirmed
    }

    public enum MatchupBetSelection
    {
        Team1Spread = 1,        // Team1 +/- spread
        Team2Spread = 2,        // Team2 +/- spread
        Team1Moneyline = 3,     // Team1 straight win
        Team2Moneyline = 4,     // Team2 straight win
        Over = 5,               // Total points over the line
        Under = 6               // Total points under the line
    }

    public enum GameBetSelection
    {
        HomeSpread = 1,         // Home team +/- spread
        AwaySpread = 2,         // Away team +/- spread
        HomeMoneyline = 3,      // Home team straight win
        AwayMoneyline = 4,      // Away team straight win
        Over = 5,               // Total score over the line
        Under = 6               // Total score under the line
    }

    public enum BetOutcome
    {
        Win = 1,    // Bet wins, payout user
        Loss = 2,   // Bet loses, keep tokens
        Push = 3    // Tie, refund tokens
    }

    public enum GameStatus
    {
        Scheduled = 1,      // Game scheduled but not started
        InProgress = 2,     // Game in progress
        Final = 3,          // Game completed
        Postponed = 4,      // Game postponed
        Cancelled = 5,      // Game cancelled
        Suspended = 6       // Game suspended
    }
}