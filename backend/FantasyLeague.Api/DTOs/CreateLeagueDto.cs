using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class CreateLeagueDto
    {
        [Required(ErrorMessage = "League name is required")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "League name must be between 3 and 100 characters")]
        public string Name { get; set; } = string.Empty;
        
        [StringLength(500, ErrorMessage = "Description must not exceed 500 characters")]
        public string Description { get; set; } = string.Empty;
        
        [Range(4, 16, ErrorMessage = "Max players must be between 4 and 16")]
        public int MaxPlayers { get; set; } = 10;
        
        // Sport Configuration
        public bool IncludeNFL { get; set; } = true;
        public bool IncludeMLB { get; set; } = false;
        public bool IncludeNBA { get; set; } = false;
        
        // Keeper Configuration
        [Range(3, 50, ErrorMessage = "Total keeper slots must be between 3 and 50")]
        public int TotalKeeperSlots { get; set; } = 15;
        
        public bool IsKeeperLeague { get; set; } = true;
        
        [Range(15, 50, ErrorMessage = "Max players per team must be between 15 and 50")]
        public int MaxPlayersPerTeam { get; set; } = 25;
        
        // Validation method
        public List<string> GetValidationErrors()
        {
            var errors = new List<string>();
            
            // At least one sport must be selected
            if (!IncludeNFL && !IncludeMLB && !IncludeNBA)
            {
                errors.Add("At least one sport must be selected");
            }
            
            // Calculate selected sports count
            var selectedSportsCount = 0;
            if (IncludeNFL) selectedSportsCount++;
            if (IncludeMLB) selectedSportsCount++;
            if (IncludeNBA) selectedSportsCount++;
            
            // Total keeper slots must be evenly divisible by selected sports count
            if (selectedSportsCount > 0 && TotalKeeperSlots % selectedSportsCount != 0)
            {
                errors.Add($"Total keeper slots ({TotalKeeperSlots}) must be evenly divisible by number of selected sports ({selectedSportsCount})");
            }
            
            // Must have at least 1 keeper per sport
            if (selectedSportsCount > 0 && TotalKeeperSlots / selectedSportsCount < 1)
            {
                errors.Add("Must have at least 1 keeper per sport");
            }
            
            return errors;
        }
    }
}