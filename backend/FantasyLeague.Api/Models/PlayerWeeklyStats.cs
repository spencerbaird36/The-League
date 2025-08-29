using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class PlayerWeeklyStats
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string PlayerId { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string PlayerName { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string Position { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Team { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string League { get; set; } = string.Empty; // NFL, NBA, MLB

        [Required]
        public int Season { get; set; }

        [Required]
        public int Week { get; set; }

        // Passing Stats
        public int PassingYards { get; set; } = 0;
        public int PassingTouchdowns { get; set; } = 0;
        public int PassingInterceptions { get; set; } = 0;
        public int PassingAttempts { get; set; } = 0;
        public int PassingCompletions { get; set; } = 0;
        public int PassingTwoPointConversions { get; set; } = 0;

        // Rushing Stats
        public int RushingYards { get; set; } = 0;
        public int RushingTouchdowns { get; set; } = 0;
        public int RushingAttempts { get; set; } = 0;
        public int RushingTwoPointConversions { get; set; } = 0;

        // Receiving Stats
        public int ReceivingYards { get; set; } = 0;
        public int ReceivingTouchdowns { get; set; } = 0;
        public int Receptions { get; set; } = 0;
        public int Targets { get; set; } = 0;
        public int ReceivingTwoPointConversions { get; set; } = 0;

        // General Offensive Stats
        public int FumblesLost { get; set; } = 0;
        public int FumblesTotal { get; set; } = 0;

        // Kicking Stats
        public int ExtraPointsMade { get; set; } = 0;
        public int ExtraPointsAttempted { get; set; } = 0;
        public int FieldGoalsMade0to39 { get; set; } = 0;
        public int FieldGoalsAttempted0to39 { get; set; } = 0;
        public int FieldGoalsMade40to49 { get; set; } = 0;
        public int FieldGoalsAttempted40to49 { get; set; } = 0;
        public int FieldGoalsMade50Plus { get; set; } = 0;
        public int FieldGoalsAttempted50Plus { get; set; } = 0;

        // Defense/Special Teams Stats
        public int DefensiveTouchdowns { get; set; } = 0;
        public int Sacks { get; set; } = 0;
        public int InterceptionsDefense { get; set; } = 0;
        public int FumbleRecoveries { get; set; } = 0;
        public int Safeties { get; set; } = 0;
        public int BlockedKicks { get; set; } = 0;
        public int PointsAllowed { get; set; } = 0;
        public int YardsAllowed { get; set; } = 0;

        // Calculated Fantasy Points
        [Column(TypeName = "decimal(8,2)")]
        public decimal FantasyPoints { get; set; } = 0.0m;

        [Column(TypeName = "decimal(8,2)")]
        public decimal FantasyPointsPPR { get; set; } = 0.0m;

        [Column(TypeName = "decimal(8,2)")]
        public decimal FantasyPointsHalfPPR { get; set; } = 0.0m;

        [Column(TypeName = "decimal(8,2)")]
        public decimal FantasyPointsStandard { get; set; } = 0.0m;

        // Game Information
        [StringLength(20)]
        public string? Opponent { get; set; }

        public bool IsHomeGame { get; set; } = false;

        [StringLength(20)]
        public string GameStatus { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Postponed

        public DateTime? GameDate { get; set; }

        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [StringLength(50)]
        public string? DataSource { get; set; } // ESPN, Yahoo, Manual, etc.

        // Method to calculate fantasy points based on scoring settings
        public decimal CalculateFantasyPoints(ScoringSettings scoringSettings)
        {
            decimal points = 0;

            // Passing points
            if (PassingYards > 0)
                points += PassingYards / scoringSettings.PassingYardsPerPoint;
            points += PassingTouchdowns * scoringSettings.PassingTouchdownPoints;
            points += PassingInterceptions * scoringSettings.PassingInterceptionPoints;
            points += PassingTwoPointConversions * scoringSettings.PassingTwoPointConversion;

            // Rushing points
            if (RushingYards > 0)
                points += RushingYards / scoringSettings.RushingYardsPerPoint;
            points += RushingTouchdowns * scoringSettings.RushingTouchdownPoints;
            points += RushingTwoPointConversions * scoringSettings.RushingTwoPointConversion;

            // Receiving points
            if (ReceivingYards > 0)
                points += ReceivingYards / scoringSettings.ReceivingYardsPerPoint;
            points += ReceivingTouchdowns * scoringSettings.ReceivingTouchdownPoints;
            points += Receptions * scoringSettings.ReceptionPoints;
            points += ReceivingTwoPointConversions * scoringSettings.ReceivingTwoPointConversion;

            // General offensive
            points += FumblesLost * scoringSettings.FumbleLostPoints;

            // Kicking points
            points += ExtraPointsMade * scoringSettings.ExtraPointPoints;
            points += FieldGoalsMade0to39 * scoringSettings.FieldGoal0to39Points;
            points += FieldGoalsMade40to49 * scoringSettings.FieldGoal40to49Points;
            points += FieldGoalsMade50Plus * scoringSettings.FieldGoal50PlusPoints;

            // Defense/ST points
            points += DefensiveTouchdowns * scoringSettings.DefenseTouchdownPoints;
            points += Sacks * scoringSettings.SackPoints;
            points += InterceptionsDefense * scoringSettings.InterceptionPoints;
            points += FumbleRecoveries * scoringSettings.FumbleRecoveryPoints;
            points += Safeties * scoringSettings.SafetyPoints;
            points += BlockedKicks * scoringSettings.BlockedKickPoints;

            // Defense points allowed
            points += CalculateDefensePointsAllowed(PointsAllowed, scoringSettings);

            return Math.Round(points, 2);
        }

        private decimal CalculateDefensePointsAllowed(int pointsAllowed, ScoringSettings scoringSettings)
        {
            return pointsAllowed switch
            {
                0 => scoringSettings.DefensePointsAllowed0Points,
                >= 1 and <= 6 => scoringSettings.DefensePointsAllowed1to6Points,
                >= 7 and <= 13 => scoringSettings.DefensePointsAllowed7to13Points,
                >= 14 and <= 20 => scoringSettings.DefensePointsAllowed14to20Points,
                >= 21 and <= 27 => scoringSettings.DefensePointsAllowed21to27Points,
                >= 28 and <= 34 => scoringSettings.DefensePointsAllowed28to34Points,
                >= 35 => scoringSettings.DefensePointsAllowed35PlusPoints,
                _ => 0
            };
        }
    }
}