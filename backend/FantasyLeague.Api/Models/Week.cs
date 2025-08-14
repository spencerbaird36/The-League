using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class Week
    {
        public int Id { get; set; }
        
        [Required]
        public int SeasonId { get; set; }
        public Season Season { get; set; } = null!;
        
        [Required]
        public int WeekNumber { get; set; }
        
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ICollection<Matchup> Matchups { get; set; } = new List<Matchup>();
    }
}