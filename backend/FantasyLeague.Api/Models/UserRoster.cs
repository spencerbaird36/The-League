using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class UserRoster
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
        
        [Required]
        public int LeagueId { get; set; }
        
        [ForeignKey("LeagueId")]
        public League League { get; set; } = null!;
        
        [Required]
        public int DraftId { get; set; }
        
        [ForeignKey("DraftId")]
        public Draft Draft { get; set; } = null!;
        
        [Required]
        public string PlayerName { get; set; } = string.Empty;
        
        [Required]
        public string PlayerPosition { get; set; } = string.Empty;
        
        [Required]
        public string PlayerTeam { get; set; } = string.Empty;
        
        [Required]
        public string PlayerLeague { get; set; } = string.Empty; // NFL, MLB, NBA
        
        public int PickNumber { get; set; } // Overall pick number in draft
        
        public int Round { get; set; }
        
        public DateTime DraftedAt { get; set; } = DateTime.UtcNow;
        
        public string? LineupPosition { get; set; } = null; // Position in lineup (QB, RB, BN, etc.) - null means on bench
    }
}