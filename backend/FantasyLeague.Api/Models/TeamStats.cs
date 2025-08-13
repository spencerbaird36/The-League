using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class TeamStats
    {
        public int Id { get; set; }
        
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        
        public int LeagueId { get; set; }
        public League League { get; set; } = null!;
        
        public int Wins { get; set; } = 0;
        public int Losses { get; set; } = 0;
        public int Ties { get; set; } = 0;
        
        public decimal PointsFor { get; set; } = 0;
        public decimal PointsAgainst { get; set; } = 0;
        
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        
        // Calculated properties
        public int GamesPlayed => Wins + Losses + Ties;
        public decimal WinPercentage => GamesPlayed > 0 ? (decimal)Wins / GamesPlayed : 0;
    }
}