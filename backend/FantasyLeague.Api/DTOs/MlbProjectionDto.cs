using System.Text.Json.Serialization;

namespace FantasyLeague.Api.DTOs
{
    public class MlbProjectionDto
    {
        [JsonPropertyName("PlayerID")]
        public int PlayerID { get; set; }
        
        [JsonPropertyName("Name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonPropertyName("Team")]
        public string Team { get; set; } = string.Empty;
        
        [JsonPropertyName("Position")]
        public string Position { get; set; } = string.Empty;
        
        [JsonPropertyName("FantasyPointsYahoo")]
        public double FantasyPointsYahoo { get; set; }
        
        [JsonPropertyName("Runs")]
        public double Runs { get; set; }
        
        [JsonPropertyName("Hits")]
        public double Hits { get; set; }
        
        [JsonPropertyName("HomeRuns")]
        public double HomeRuns { get; set; }
        
        [JsonPropertyName("BattingAverage")]
        public double BattingAverage { get; set; }
        
        [JsonPropertyName("RunsBattedIn")]
        public double RunsBattedIn { get; set; }
        
        [JsonPropertyName("Walks")]
        public double Walks { get; set; }
        
        [JsonPropertyName("StolenBases")]
        public double StolenBases { get; set; }
        
        [JsonPropertyName("OnBasePlusSlugging")]
        public double OnBasePlusSlugging { get; set; }
        
        [JsonPropertyName("Wins")]
        public double Wins { get; set; }
        
        [JsonPropertyName("Losses")]
        public double Losses { get; set; }
        
        [JsonPropertyName("Saves")]
        public double Saves { get; set; }
        
        [JsonPropertyName("PitchingStrikeouts")]
        public double PitchingStrikeouts { get; set; }
        
        [JsonPropertyName("WalksHitsPerInningsPitched")]
        public double WalksHitsPerInningsPitched { get; set; }
    }
}