using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class KeeperPickDto
    {
        [Required]
        public int UserId { get; set; }
        
        [Required]
        public string PlayerName { get; set; } = string.Empty;
        
        [Required]
        public string PlayerPosition { get; set; } = string.Empty;
        
        [Required]
        public string PlayerTeam { get; set; } = string.Empty;
        
        [Required]
        public string PlayerLeague { get; set; } = string.Empty; // NFL, MLB, NBA
    }
}