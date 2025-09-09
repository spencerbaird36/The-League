using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class ActiveNflPlayer
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int PlayerID { get; set; } // API PlayerID
        
        [Required]
        [MaxLength(10)]
        public string Team { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(5)]
        public string FantasyPosition { get; set; } = string.Empty; // QB, RB, WR, TE, K
        
        public int Age { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;
        
        // Full name property for convenience
        public string FullName => $"{FirstName} {LastName}";
    }
}