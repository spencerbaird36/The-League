using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class GameBet
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string ExternalGameId { get; set; } = string.Empty; // ID from external API

        [Required]
        [MaxLength(10)]
        public string Sport { get; set; } = string.Empty; // NFL, MLB, NBA, NHL, etc.

        [Required]
        [MaxLength(100)]
        public string HomeTeam { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string AwayTeam { get; set; } = string.Empty;

        [Required]
        public DateTime GameDateTime { get; set; }

        [MaxLength(20)]
        public string? Week { get; set; } // NFL Week 1, etc.

        [MaxLength(20)]
        public string? Season { get; set; } // 2024, 2024-25, etc.

        // Betting lines (updated from external sources)
        [Column(TypeName = "decimal(6,1)")]
        public decimal? PointSpread { get; set; } // + favors away team, - favors home team

        [Column(TypeName = "decimal(6,1)")]
        public decimal? OverUnderLine { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? HomeMoneylineOdds { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? AwayMoneylineOdds { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? OverOdds { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? UnderOdds { get; set; }

        public int LeagueId { get; set; }

        [ForeignKey("LeagueId")]
        public League League { get; set; } = null!;

        public DateTime? ExpiresAt { get; set; }

        public int CreatedByAdminId { get; set; }

        [ForeignKey("CreatedByAdminId")]
        public User CreatedByAdmin { get; set; } = null!;

        // Game results (populated after game completion)
        public int? HomeScore { get; set; }

        public int? AwayScore { get; set; }

        public GameStatus GameStatus { get; set; } = GameStatus.Scheduled;

        public bool IsSettled { get; set; } = false;

        public DateTime? SettledAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // External API tracking
        [MaxLength(100)]
        public string? ExternalDataSource { get; set; } // ESPN, The Odds API, etc.

        public DateTime? LastExternalUpdate { get; set; }

        // Calculated properties
        [NotMapped]
        public int ScoreDifference => (HomeScore ?? 0) - (AwayScore ?? 0);

        [NotMapped]
        public int TotalScore => (HomeScore ?? 0) + (AwayScore ?? 0);

        [NotMapped]
        public bool HomeTeamWins => ScoreDifference > 0;

        [NotMapped]
        public bool AwayTeamWins => ScoreDifference < 0;

        [NotMapped]
        public bool IsTie => ScoreDifference == 0;

        [NotMapped]
        public bool CanBeSettled => HomeScore.HasValue && AwayScore.HasValue &&
                                  GameStatus == GameStatus.Final && !IsSettled;

        [NotMapped]
        public bool IsLive => GameStatus == GameStatus.InProgress;

        [NotMapped]
        public bool IsGameTime => DateTime.UtcNow >= GameDateTime;

        // Determine bet outcome based on specific selection
        public BetOutcome DetermineBetOutcome(GameBetSelection selection)
        {
            if (!CanBeSettled)
                throw new InvalidOperationException("Game cannot be settled yet");

            return selection switch
            {
                GameBetSelection.HomeSpread => DetermineSpreadOutcome(true),
                GameBetSelection.AwaySpread => DetermineSpreadOutcome(false),
                GameBetSelection.HomeMoneyline => HomeTeamWins ? BetOutcome.Win : (IsTie ? BetOutcome.Push : BetOutcome.Loss),
                GameBetSelection.AwayMoneyline => AwayTeamWins ? BetOutcome.Win : (IsTie ? BetOutcome.Push : BetOutcome.Loss),
                GameBetSelection.Over => TotalScore > (OverUnderLine ?? 0) ? BetOutcome.Win :
                                       TotalScore == (OverUnderLine ?? 0) ? BetOutcome.Push : BetOutcome.Loss,
                GameBetSelection.Under => TotalScore < (OverUnderLine ?? 0) ? BetOutcome.Win :
                                        TotalScore == (OverUnderLine ?? 0) ? BetOutcome.Push : BetOutcome.Loss,
                _ => BetOutcome.Push
            };
        }

        private BetOutcome DetermineSpreadOutcome(bool bettingOnHome)
        {
            if (!PointSpread.HasValue)
                return BetOutcome.Push;

            // Point spread is from home team perspective
            // Positive spread means home team is underdog
            var adjustedScore = bettingOnHome
                ? ScoreDifference + PointSpread.Value  // Home team getting points
                : -ScoreDifference - PointSpread.Value; // Away team giving/getting points

            if (adjustedScore > 0)
                return BetOutcome.Win;
            else if (adjustedScore == 0)
                return BetOutcome.Push;
            else
                return BetOutcome.Loss;
        }

    }
}