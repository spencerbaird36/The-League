using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class CreateLeagueDto
    {
        [Required(ErrorMessage = "League name is required")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "League name must be between 3 and 100 characters")]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500, ErrorMessage = "Description must not exceed 500 characters")]
        public string Description { get; set; } = string.Empty;
        
        [Range(4, 16, ErrorMessage = "Max players must be between 4 and 16")]
        public int MaxPlayers { get; set; } = 10;
    }
}