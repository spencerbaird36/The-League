using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class LeagueConfiguration
    {
        public int Id { get; set; }
        
        public int LeagueId { get; set; }
        public League League { get; set; } = null!;
        
        // Sport selections
        public bool IncludeNFL { get; set; } = true;
        public bool IncludeMLB { get; set; } = false;
        public bool IncludeNBA { get; set; } = false;
        
        // Keeper settings
        public int TotalKeeperSlots { get; set; } = 15;
        
        // Calculated property for keepers per sport
        public int KeepersPerSport 
        { 
            get 
            { 
                var selectedSportsCount = GetSelectedSportsCount();
                return selectedSportsCount > 0 ? TotalKeeperSlots / selectedSportsCount : 0;
            } 
        }
        
        // Draft configuration
        public bool IsKeeperLeague { get; set; } = true;
        public int MaxPlayersPerTeam { get; set; } = 25;
        
        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Helper method to get selected sports count
        public int GetSelectedSportsCount()
        {
            int count = 0;
            if (IncludeNFL) count++;
            if (IncludeMLB) count++;
            if (IncludeNBA) count++;
            return count;
        }
        
        // Helper method to get selected sports list
        public List<string> GetSelectedSports()
        {
            var sports = new List<string>();
            if (IncludeNFL) sports.Add("NFL");
            if (IncludeMLB) sports.Add("MLB");
            if (IncludeNBA) sports.Add("NBA");
            return sports;
        }
        
        // Validation method
        public bool IsValidConfiguration()
        {
            var selectedSportsCount = GetSelectedSportsCount();
            
            // Must have at least one sport selected
            if (selectedSportsCount == 0)
                return false;
                
            // Total keeper slots must be evenly divisible by selected sports count
            if (TotalKeeperSlots % selectedSportsCount != 0)
                return false;
                
            // Must have at least 1 keeper per sport
            if (KeepersPerSport < 1)
                return false;
                
            return true;
        }
        
        // Method to get validation errors
        public List<string> GetValidationErrors()
        {
            var errors = new List<string>();
            var selectedSportsCount = GetSelectedSportsCount();
            
            if (selectedSportsCount == 0)
                errors.Add("At least one sport must be selected");
                
            if (TotalKeeperSlots % selectedSportsCount != 0)
                errors.Add($"Total keeper slots ({TotalKeeperSlots}) must be evenly divisible by number of selected sports ({selectedSportsCount})");
                
            if (KeepersPerSport < 1)
                errors.Add("Must have at least 1 keeper per sport");
                
            if (TotalKeeperSlots > MaxPlayersPerTeam)
                errors.Add($"Total keeper slots ({TotalKeeperSlots}) cannot exceed max players per team ({MaxPlayersPerTeam})");
                
            return errors;
        }
    }
}