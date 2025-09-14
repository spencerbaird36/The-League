using System.Text.Json.Serialization;

namespace FantasyLeague.Api.DTOs
{
    public class NbaProjectionDto
    {
        [JsonPropertyName("PlayerID")]
        public int PlayerID { get; set; }
        
        [JsonPropertyName("Name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonPropertyName("Team")]
        public string Team { get; set; } = string.Empty;
        
        [JsonPropertyName("Position")]
        public string Position { get; set; } = string.Empty;
        
        [JsonPropertyName("FieldGoalsMade")]
        public double FieldGoalsMade { get; set; }
        
        [JsonPropertyName("FieldGoalsPercentage")]
        public double FieldGoalsPercentage { get; set; }
        
        [JsonPropertyName("ThreePointersMade")]
        public double ThreePointersMade { get; set; }
        
        [JsonPropertyName("FreeThrowsMade")]
        public double FreeThrowsMade { get; set; }
        
        [JsonPropertyName("Rebounds")]
        public double Rebounds { get; set; }
        
        [JsonPropertyName("Assists")]
        public double Assists { get; set; }
        
        [JsonPropertyName("Steals")]
        public double Steals { get; set; }
        
        [JsonPropertyName("BlockedShots")]
        public double BlockedShots { get; set; }
        
        [JsonPropertyName("Turnovers")]
        public double Turnovers { get; set; }
        
        [JsonPropertyName("Points")]
        public double Points { get; set; }
        
        [JsonPropertyName("FantasyPointsYahoo")]
        public double FantasyPointsYahoo { get; set; }
    }
}