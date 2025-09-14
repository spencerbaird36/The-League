using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class User
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string Password { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string FirstName { get; set; } = string.Empty;
        
        [StringLength(50)]
        public string LastName { get; set; } = string.Empty;
        
        [StringLength(100)]
        public string? TeamLogo { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? LastLoginAt { get; set; }
        
        public bool IsActive { get; set; } = true;

        // Email notification preferences
        public bool EmailNotificationsEnabled { get; set; } = true;
        public bool TradeProposalEmailsEnabled { get; set; } = true;
        public bool TradeResponseEmailsEnabled { get; set; } = true;

        // League association
        public int? LeagueId { get; set; }
        public League? League { get; set; }

        // Team stats
        public TeamStats? TeamStats { get; set; }
    }
}