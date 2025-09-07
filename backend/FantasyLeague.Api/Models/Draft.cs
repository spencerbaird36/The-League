using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class Draft
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public int LeagueId { get; set; }
        
        [ForeignKey("LeagueId")]
        public League League { get; set; } = null!;
        
        [Required]
        public string DraftOrder { get; set; } = string.Empty; // JSON array of user IDs
        
        public int CurrentTurn { get; set; } = 0; // Index in the draft order
        
        public int CurrentRound { get; set; } = 1;
        
        public bool IsActive { get; set; } = false;
        
        public bool IsCompleted { get; set; } = false;
        
        // Keeper Draft Properties
        public DraftType DraftType { get; set; } = DraftType.Keeper;
        
        public string? SportType { get; set; } // NFL, MLB, NBA - null for keeper draft (all sports)
        
        public int MaxPicks { get; set; } = 15; // Total picks allowed in this draft
        
        public int MaxPicksPerSport { get; set; } = 5; // For keeper drafts: picks per sport
        
        public bool IsKeeperDraft => DraftType == DraftType.Keeper;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? StartedAt { get; set; }
        
        public DateTime? CompletedAt { get; set; }
        
        // Navigation properties
        public ICollection<DraftPick> DraftPicks { get; set; } = new List<DraftPick>();
    }
}