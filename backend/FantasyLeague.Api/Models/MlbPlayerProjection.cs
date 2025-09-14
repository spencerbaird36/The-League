using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class MlbPlayerProjection
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int PlayerID { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [MaxLength(50)]
        public string? Team { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string Position { get; set; } = string.Empty;
        
        // Projection fields from API
        public double FantasyPointsYahoo { get; set; }
        public double Runs { get; set; }
        public double Hits { get; set; }
        public double HomeRuns { get; set; }
        public double BattingAverage { get; set; }
        public double RunsBattedIn { get; set; }
        public double Walks { get; set; }
        public double StolenBases { get; set; }
        public double OnBasePlusSlugging { get; set; }
        
        // Pitching stats
        public double Wins { get; set; }
        public double Losses { get; set; }
        public double Saves { get; set; }
        public double PitchingStrikeouts { get; set; }
        public double WalksHitsPerInningsPitched { get; set; }
        
        // Season and year for context
        [Required]
        public int Season { get; set; } = 2025;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
    }
}