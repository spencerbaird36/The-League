using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class League
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;
        
        public int CreatedById { get; set; }
        public User CreatedBy { get; set; } = null!;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public int MaxPlayers { get; set; } = 10;
        
        public bool IsActive { get; set; } = true;
        
        [Required]
        [StringLength(20)]
        public string JoinCode { get; set; } = string.Empty;
        
        // Navigation property for users in this league
        public ICollection<User> Users { get; set; } = new List<User>();
        
        // Navigation property for team stats in this league
        public ICollection<TeamStats> TeamStats { get; set; } = new List<TeamStats>();
    }
}