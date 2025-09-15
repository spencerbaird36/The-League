using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class MatchupBet
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int LeagueId { get; set; }

        [ForeignKey("LeagueId")]
        public League League { get; set; } = null!;

        [Required]
        public int Week { get; set; } // NFL week, MLB week, etc.

        [Required]
        public int Season { get; set; }

        [Required]
        [MaxLength(10)]
        public string Sport { get; set; } = string.Empty; // NFL, MLB, NBA

        [Required]
        public int Team1UserId { get; set; }

        [ForeignKey("Team1UserId")]
        public User Team1User { get; set; } = null!;

        [Required]
        public int Team2UserId { get; set; }

        [ForeignKey("Team2UserId")]
        public User Team2User { get; set; } = null!;

        // Betting line information
        [Column(TypeName = "decimal(6,1)")]
        public decimal? PointSpread { get; set; } // +/- points for Team1

        [Column(TypeName = "decimal(6,1)")]
        public decimal? OverUnderLine { get; set; } // Total points line

        [Column(TypeName = "decimal(10,2)")]
        public decimal? Team1MoneylineOdds { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? Team2MoneylineOdds { get; set; }

        public DateTime? ExpiresAt { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public int CreatedByAdminId { get; set; }

        [ForeignKey("CreatedByAdminId")]
        public User CreatedByAdmin { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Actual results (populated after games are played)
        [Column(TypeName = "decimal(6,1)")]
        public decimal? Team1Score { get; set; }

        [Column(TypeName = "decimal(6,1)")]
        public decimal? Team2Score { get; set; }

        [Column(TypeName = "decimal(6,1)")]
        public decimal? TotalScore { get; set; }

        public bool IsSettled { get; set; } = false;

        public DateTime? SettledAt { get; set; }

        public int? WinnerUserId { get; set; } // Actual winner for moneyline bets

        [ForeignKey("WinnerUserId")]
        public User? WinnerUser { get; set; }

        // Calculated properties
        [NotMapped]
        public decimal ScoreDifference => (Team1Score ?? 0) - (Team2Score ?? 0);

        [NotMapped]
        public bool Team1Wins => ScoreDifference > 0;

        [NotMapped]
        public bool Team2Wins => ScoreDifference < 0;

        [NotMapped]
        public bool IsTie => ScoreDifference == 0;

        [NotMapped]
        public bool CanBeSettled => Team1Score.HasValue && Team2Score.HasValue && !IsSettled;

        // Determine bet outcome based on specific selection
        public BetOutcome DetermineBetOutcome(MatchupBetSelection selection)
        {
            if (!CanBeSettled)
                throw new InvalidOperationException("Matchup cannot be settled yet");

            return selection switch
            {
                MatchupBetSelection.Team1Spread => DetermineSpreadOutcome(true),
                MatchupBetSelection.Team2Spread => DetermineSpreadOutcome(false),
                MatchupBetSelection.Team1Moneyline => Team1Wins ? BetOutcome.Win : (IsTie ? BetOutcome.Push : BetOutcome.Loss),
                MatchupBetSelection.Team2Moneyline => Team2Wins ? BetOutcome.Win : (IsTie ? BetOutcome.Push : BetOutcome.Loss),
                MatchupBetSelection.Over => (TotalScore ?? 0) > (OverUnderLine ?? 0) ? BetOutcome.Win :
                                          (TotalScore ?? 0) == (OverUnderLine ?? 0) ? BetOutcome.Push : BetOutcome.Loss,
                MatchupBetSelection.Under => (TotalScore ?? 0) < (OverUnderLine ?? 0) ? BetOutcome.Win :
                                           (TotalScore ?? 0) == (OverUnderLine ?? 0) ? BetOutcome.Push : BetOutcome.Loss,
                _ => BetOutcome.Push
            };
        }

        private BetOutcome DetermineSpreadOutcome(bool bettingOnTeam1)
        {
            if (!PointSpread.HasValue)
                return BetOutcome.Push;

            var adjustedScore = bettingOnTeam1
                ? ScoreDifference + PointSpread.Value  // If betting Team1 +3, add 3 to their score difference
                : -ScoreDifference + PointSpread.Value; // If betting Team2 +3, add 3 to their score difference

            if (adjustedScore > 0)
                return BetOutcome.Win;
            else if (adjustedScore == 0)
                return BetOutcome.Push;
            else
                return BetOutcome.Loss;
        }

    }
}