using System.Text.Json.Serialization;

namespace FantasyLeague.Api.DTOs
{
    public class NflProjectionDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonPropertyName("team")]
        public string Team { get; set; } = string.Empty;
        
        [JsonPropertyName("position")]
        public string Position { get; set; } = string.Empty;
        
        [JsonPropertyName("player_id")]
        public int PlayerId { get; set; }
        
        [JsonPropertyName("passing_yards")]
        public double PassingYards { get; set; }
        
        [JsonPropertyName("rushing_yards")]
        public double RushingYards { get; set; }
        
        [JsonPropertyName("receiving_yards")]
        public double ReceivingYards { get; set; }
        
        [JsonPropertyName("field_goals_made")]
        public double FieldGoalsMade { get; set; }
        
        [JsonPropertyName("passing_touchdowns")]
        public double PassingTouchdowns { get; set; }
        
        [JsonPropertyName("rushing_touchdowns")]
        public double RushingTouchdowns { get; set; }
        
        [JsonPropertyName("receiving_touchdowns")]
        public double ReceivingTouchdowns { get; set; }
        
        [JsonPropertyName("fantasy_points_yahoo_season_long")]
        public double FantasyPointsYahooSeasonLong { get; set; }
    }
}