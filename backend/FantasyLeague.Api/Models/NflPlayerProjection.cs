using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class NflPlayerProjection
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int PlayerId { get; set; }
        
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
        public double PassingYards { get; set; }
        public double RushingYards { get; set; }
        public double ReceivingYards { get; set; }
        public double FieldGoalsMade { get; set; }
        public double PassingTouchdowns { get; set; }
        public double RushingTouchdowns { get; set; }
        public double ReceivingTouchdowns { get; set; }
        public double FantasyPointsYahooSeasonLong { get; set; }
        
        // Season and year for context
        [Required]
        [MaxLength(10)]
        public string Season { get; set; } = "2025REG";
        
        [Required]
        public int Year { get; set; } = 2025;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
    }
}