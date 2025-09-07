using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class CreateRegularDraftDto
    {
        [Required]
        public int LeagueId { get; set; }
        
        [Required]
        [StringLength(10)]
        public string SportType { get; set; } = string.Empty; // NFL, MLB, NBA
        
        [Required]
        public int CreatedByUserId { get; set; }
    }
}