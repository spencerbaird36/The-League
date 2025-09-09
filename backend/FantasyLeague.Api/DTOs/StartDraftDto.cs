using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class StartDraftDto
    {
        [Required]
        public int UserId { get; set; }
    }
}