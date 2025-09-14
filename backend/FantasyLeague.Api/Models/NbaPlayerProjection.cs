using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class NbaPlayerProjection
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int PlayerID { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string Team { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(10)]
        public string Position { get; set; } = string.Empty;
        
        // Projection fields from API
        public double FieldGoalsMade { get; set; }
        public double FieldGoalsPercentage { get; set; }
        public double ThreePointersMade { get; set; }
        public double FreeThrowsMade { get; set; }
        public double Rebounds { get; set; }
        public double Assists { get; set; }
        public double Steals { get; set; }
        public double BlockedShots { get; set; }
        public double Turnovers { get; set; }
        public double Points { get; set; }
        public double FantasyPointsYahoo { get; set; }
        
        // Season and year for context
        [Required]
        public int Season { get; set; } = 2025;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
    }
}