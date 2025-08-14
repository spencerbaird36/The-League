using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class Season
    {
        public int Id { get; set; }
        
        [Required]
        public int LeagueId { get; set; }
        public League League { get; set; } = null!;
        
        [Required]
        [StringLength(10)]
        public string Sport { get; set; } = string.Empty; // NFL, NBA, MLB
        
        [Required]
        public int Year { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Week> Weeks { get; set; } = new List<Week>();
    }
}