using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class CreateDraftDto
    {
        [Required(ErrorMessage = "League ID is required")]
        public int LeagueId { get; set; }
        
        [Required(ErrorMessage = "Draft order is required")]
        [MinLength(1, ErrorMessage = "Draft order must contain at least one user")]
        public List<int> DraftOrder { get; set; } = new List<int>();
    }
}