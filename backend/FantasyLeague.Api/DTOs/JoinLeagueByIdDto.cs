using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class JoinLeagueByIdDto
    {
        [Required(ErrorMessage = "League ID is required")]
        public int LeagueId { get; set; }
    }
}