using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class BettingLine
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public BettingLineType Type { get; set; }

        public int? LeagueId { get; set; }

        [ForeignKey("LeagueId")]
        public League? League { get; set; }

        // References to what this line is for
        public int? MatchupBetId { get; set; }

        [ForeignKey("MatchupBetId")]
        public MatchupBet? MatchupBet { get; set; }

        public int? GameBetId { get; set; }

        [ForeignKey("GameBetId")]
        public GameBet? GameBet { get; set; }

        // Line details
        [Column(TypeName = "decimal(6,1)")]
        public decimal? PointSpread { get; set; }

        [Column(TypeName = "decimal(6,1)")]
        public decimal? OverUnderLine { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? FavoriteOdds { get; set; } // American odds format

        [Column(TypeName = "decimal(10,2)")]
        public decimal? UnderdogOdds { get; set; } // American odds format

        [Column(TypeName = "decimal(10,2)")]
        public decimal? OverOdds { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? UnderOdds { get; set; }

        // Line management
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ExpiresAt { get; set; }

        public int CreatedByAdminId { get; set; }

        [ForeignKey("CreatedByAdminId")]
        public User CreatedByAdmin { get; set; } = null!;

        // Betting limits
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MinBetAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MaxBetAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? MaxTotalExposure { get; set; } // Max total bets on this line

        // Tracking
        [Column(TypeName = "decimal(18,2)")]
        public decimal CurrentExposure { get; set; } = 0.00m; // Current total bets

        public int BetCount { get; set; } = 0; // Number of bets placed

        [MaxLength(500)]
        public string? Notes { get; set; }

        // Calculated properties
        [NotMapped]
        public bool IsExpired => ExpiresAt.HasValue && DateTime.UtcNow > ExpiresAt.Value;

        [NotMapped]
        public bool AcceptingBets => IsActive && !IsExpired &&
                                   (MaxTotalExposure == null || CurrentExposure < MaxTotalExposure);

        [NotMapped]
        public decimal RemainingCapacity => MaxTotalExposure.HasValue ?
                                          Math.Max(0, MaxTotalExposure.Value - CurrentExposure) :
                                          decimal.MaxValue;
    }

    public enum BettingLineType
    {
        MatchupSpread = 1,      // Fantasy league matchup point spread
        MatchupMoneyline = 2,   // Fantasy league matchup moneyline
        MatchupOverUnder = 3,   // Fantasy league matchup over/under
        GameSpread = 4,         // External game point spread
        GameMoneyline = 5,      // External game moneyline
        GameOverUnder = 6,      // External game over/under
        GameProps = 7           // External game proposition bets
    }
}