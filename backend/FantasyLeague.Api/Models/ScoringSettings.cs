using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class ScoringSettings
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int LeagueId { get; set; }

        [ForeignKey("LeagueId")]
        public virtual League? League { get; set; }

        [Required]
        [StringLength(10)]
        public string Sport { get; set; } = "NFL"; // NFL, NBA, MLB

        // Quarterback Scoring
        [Column(TypeName = "decimal(5,2)")]
        public decimal PassingYardsPerPoint { get; set; } = 25.0m; // 1 point per 25 yards

        [Column(TypeName = "decimal(5,2)")]
        public decimal PassingTouchdownPoints { get; set; } = 4.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal PassingInterceptionPoints { get; set; } = -1.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal PassingTwoPointConversion { get; set; } = 2.0m;

        // Rushing Scoring
        [Column(TypeName = "decimal(5,2)")]
        public decimal RushingYardsPerPoint { get; set; } = 10.0m; // 1 point per 10 yards

        [Column(TypeName = "decimal(5,2)")]
        public decimal RushingTouchdownPoints { get; set; } = 6.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal RushingTwoPointConversion { get; set; } = 2.0m;

        // Receiving Scoring
        [Column(TypeName = "decimal(5,2)")]
        public decimal ReceivingYardsPerPoint { get; set; } = 10.0m; // 1 point per 10 yards

        [Column(TypeName = "decimal(5,2)")]
        public decimal ReceivingTouchdownPoints { get; set; } = 6.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal ReceptionPoints { get; set; } = 0.5m; // Half-PPR default

        [Column(TypeName = "decimal(5,2)")]
        public decimal ReceivingTwoPointConversion { get; set; } = 2.0m;

        // General Offensive
        [Column(TypeName = "decimal(5,2)")]
        public decimal FumbleLostPoints { get; set; } = -2.0m;

        // Kicker Scoring
        [Column(TypeName = "decimal(5,2)")]
        public decimal ExtraPointPoints { get; set; } = 1.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal FieldGoal0to39Points { get; set; } = 3.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal FieldGoal40to49Points { get; set; } = 4.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal FieldGoal50PlusPoints { get; set; } = 5.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal MissedExtraPointPoints { get; set; } = -1.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal MissedFieldGoalPoints { get; set; } = -1.0m;

        // Defense/Special Teams Scoring
        [Column(TypeName = "decimal(5,2)")]
        public decimal DefenseTouchdownPoints { get; set; } = 6.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal SackPoints { get; set; } = 1.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal InterceptionPoints { get; set; } = 2.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal FumbleRecoveryPoints { get; set; } = 2.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal SafetyPoints { get; set; } = 2.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal BlockedKickPoints { get; set; } = 2.0m;

        // Defense Points Allowed (Yahoo standard)
        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed0Points { get; set; } = 10.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed1to6Points { get; set; } = 7.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed7to13Points { get; set; } = 4.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed14to20Points { get; set; } = 1.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed21to27Points { get; set; } = 0.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed28to34Points { get; set; } = -1.0m;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DefensePointsAllowed35PlusPoints { get; set; } = -4.0m;

        // Additional settings
        [Column(TypeName = "decimal(5,2)")]
        public decimal BenchPoints { get; set; } = 0.0m; // Points for bench players

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Helper method to get Yahoo default settings
        public static ScoringSettings GetYahooDefaults(int leagueId)
        {
            return new ScoringSettings
            {
                LeagueId = leagueId,
                Sport = "NFL",
                // Passing
                PassingYardsPerPoint = 25.0m,
                PassingTouchdownPoints = 4.0m,
                PassingInterceptionPoints = -1.0m,
                PassingTwoPointConversion = 2.0m,
                // Rushing
                RushingYardsPerPoint = 10.0m,
                RushingTouchdownPoints = 6.0m,
                RushingTwoPointConversion = 2.0m,
                // Receiving (Half-PPR)
                ReceivingYardsPerPoint = 10.0m,
                ReceivingTouchdownPoints = 6.0m,
                ReceptionPoints = 0.5m,
                ReceivingTwoPointConversion = 2.0m,
                // General
                FumbleLostPoints = -2.0m,
                // Kicking
                ExtraPointPoints = 1.0m,
                FieldGoal0to39Points = 3.0m,
                FieldGoal40to49Points = 4.0m,
                FieldGoal50PlusPoints = 5.0m,
                MissedExtraPointPoints = -1.0m,
                MissedFieldGoalPoints = -1.0m,
                // Defense
                DefenseTouchdownPoints = 6.0m,
                SackPoints = 1.0m,
                InterceptionPoints = 2.0m,
                FumbleRecoveryPoints = 2.0m,
                SafetyPoints = 2.0m,
                BlockedKickPoints = 2.0m,
                // Defense Points Allowed
                DefensePointsAllowed0Points = 10.0m,
                DefensePointsAllowed1to6Points = 7.0m,
                DefensePointsAllowed7to13Points = 4.0m,
                DefensePointsAllowed14to20Points = 1.0m,
                DefensePointsAllowed21to27Points = 0.0m,
                DefensePointsAllowed28to34Points = -1.0m,
                DefensePointsAllowed35PlusPoints = -4.0m,
                BenchPoints = 0.0m,
                IsActive = true
            };
        }
    }
}