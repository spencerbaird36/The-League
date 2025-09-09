using System.ComponentModel.DataAnnotations;

namespace FantasyLeague.Api.Models
{
    public class ActiveNbaPlayer
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PlayerID { get; set; }

        [Required]
        [MaxLength(10)]
        public string Team { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Position { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        public DateTime BirthDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;

        public string FullName => $"{FirstName} {LastName}";

        public int Age => DateTime.UtcNow.Year - BirthDate.Year - (DateTime.UtcNow.DayOfYear < BirthDate.DayOfYear ? 1 : 0);
    }
}