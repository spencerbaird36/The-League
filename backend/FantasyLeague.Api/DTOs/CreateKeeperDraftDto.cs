using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class CreateKeeperDraftDto
    {
        [Required]
        public int LeagueId { get; set; }
        
        [Required]
        public int CreatedByUserId { get; set; }
    }
}