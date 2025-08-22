using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class UpdateLeagueDto
    {
        [StringLength(100, MinimumLength = 3, ErrorMessage = "League name must be between 3 and 100 characters")]
        public string? Name { get; set; }
        
        [StringLength(500, ErrorMessage = "Description must not exceed 500 characters")]
        public string? Description { get; set; }
    }
}