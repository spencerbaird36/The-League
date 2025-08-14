using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class Matchup
    {
        public int Id { get; set; }
        
        [Required]
        public int WeekId { get; set; }
        public Week Week { get; set; } = null!;
        
        [Required]
        public int HomeTeamId { get; set; }
        public User HomeTeam { get; set; } = null!;
        
        [Required]
        public int AwayTeamId { get; set; }
        public User AwayTeam { get; set; } = null!;
        
        public DateTime ScheduledDate { get; set; }
        
        public int? HomeScore { get; set; }
        public int? AwayScore { get; set; }
        
        [StringLength(20)]
        public string Status { get; set; } = "upcoming"; // upcoming, in_progress, completed
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
    }
}