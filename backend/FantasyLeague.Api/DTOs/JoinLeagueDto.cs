using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class JoinLeagueDto
    {
        [Required(ErrorMessage = "Join code is required")]
        [StringLength(20, ErrorMessage = "Join code is invalid")]
        public string JoinCode { get; set; } = string.Empty;
    }
}