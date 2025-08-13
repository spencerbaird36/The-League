using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class DraftPickDto
    {
        [Required(ErrorMessage = "Draft ID is required")]
        public int DraftId { get; set; }
        
        [Required(ErrorMessage = "User ID is required")]
        public int UserId { get; set; }
        
        [Required(ErrorMessage = "Player name is required")]
        [StringLength(100, ErrorMessage = "Player name cannot exceed 100 characters")]
        public string PlayerName { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Player position is required")]
        [StringLength(10, ErrorMessage = "Player position cannot exceed 10 characters")]
        public string PlayerPosition { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Player team is required")]
        [StringLength(50, ErrorMessage = "Player team cannot exceed 50 characters")]
        public string PlayerTeam { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "Player league is required")]
        [StringLength(10, ErrorMessage = "Player league cannot exceed 10 characters")]
        public string PlayerLeague { get; set; } = string.Empty;
    }
}