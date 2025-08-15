using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class Player
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string Position { get; set; } = string.Empty;
        
        [Required]
        public string Team { get; set; } = string.Empty;
        
        [Required]
        public string League { get; set; } = string.Empty; // NFL, MLB, NBA
        
        // NFL Stats
        public int? PassingYards { get; set; }
        public int? PassingTouchdowns { get; set; }
        public int? Interceptions { get; set; }
        public int? RushingYards { get; set; }
        public int? RushingTouchdowns { get; set; }
        public int? ReceivingYards { get; set; }
        public int? ReceivingTouchdowns { get; set; }
        public int? Receptions { get; set; }
        
        // NBA Stats
        public double? PointsPerGame { get; set; }
        public double? ReboundsPerGame { get; set; }
        public double? AssistsPerGame { get; set; }
        public double? FieldGoalPercentage { get; set; }
        public double? ThreePointPercentage { get; set; }
        public double? FreeThrowPercentage { get; set; }
        public double? StealsPerGame { get; set; }
        public double? BlocksPerGame { get; set; }
        
        // MLB Stats
        public double? BattingAverage { get; set; }
        public int? HomeRuns { get; set; }
        public int? RunsBattedIn { get; set; }
        public int? Runs { get; set; }
        public int? Hits { get; set; }
        public int? StolenBases { get; set; }
        
        // Pitcher stats
        public double? EarnedRunAverage { get; set; }
        public int? Wins { get; set; }
        public int? Losses { get; set; }
        public int? Strikeouts { get; set; }
        public int? Saves { get; set; }
        public double? WHIP { get; set; } // Walks + Hits per Innings Pitched
        
        public int? GamesPlayed { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}