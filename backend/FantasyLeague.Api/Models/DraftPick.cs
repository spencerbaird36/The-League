using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class DraftPick
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int DraftId { get; set; }
        
        [ForeignKey("DraftId")]
        public Draft Draft { get; set; } = null!;
        
        [Required]
        public int UserId { get; set; }
        
        [ForeignKey("UserId")]
        public User User { get; set; } = null!;
        
        [Required]
        public string PlayerName { get; set; } = string.Empty;
        
        [Required]
        public string PlayerPosition { get; set; } = string.Empty;
        
        [Required]
        public string PlayerTeam { get; set; } = string.Empty;
        
        [Required]
        public string PlayerLeague { get; set; } = string.Empty; // NFL, MLB, NBA
        
        public int PickNumber { get; set; } // Overall pick number (1, 2, 3, etc.)
        
        public int Round { get; set; }
        
        public int RoundPick { get; set; } // Pick within the round (1, 2, 3, etc.)
        
        public DateTime PickedAt { get; set; } = DateTime.UtcNow;
    }
}