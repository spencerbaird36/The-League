using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.DTOs
{
    public class UpdateLeagueConfigurationDto
    {
        [Required]
        public bool IncludeNFL { get; set; }

        [Required]
        public bool IncludeMLB { get; set; }

        [Required]
        public bool IncludeNBA { get; set; }

        [Required]
        [Range(1, 100, ErrorMessage = "Total keeper slots must be between 1 and 100")]
        public int TotalKeeperSlots { get; set; }

        [Required]
        public bool IsKeeperLeague { get; set; }

        [Required]
        [Range(10, 50, ErrorMessage = "Max players per team must be between 10 and 50")]
        public int MaxPlayersPerTeam { get; set; }

        // Validation method to ensure at least one sport is selected
        public bool HasAtLeastOneSport()
        {
            return IncludeNFL || IncludeMLB || IncludeNBA;
        }

        // Get selected sports count for validation
        public int GetSelectedSportsCount()
        {
            int count = 0;
            if (IncludeNFL) count++;
            if (IncludeMLB) count++;
            if (IncludeNBA) count++;
            return count;
        }

        // Validate keeper slots are evenly divisible by selected sports
        public bool IsKeeperSlotsValid()
        {
            var selectedCount = GetSelectedSportsCount();
            return selectedCount > 0 && TotalKeeperSlots % selectedCount == 0;
        }
    }
}