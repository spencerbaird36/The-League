using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class SystemTokenPool
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalTokensIssued { get; set; } = 0.00m; // Total tokens ever created

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalTokensInCirculation { get; set; } = 0.00m; // Tokens currently in user wallets

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCashedOut { get; set; } = 0.00m; // Total tokens converted back to cash

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal HouseBalance { get; set; } = 0.00m; // House tokens available for payouts

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalRevenue { get; set; } = 0.00m; // Total revenue from token purchases

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPayouts { get; set; } = 0.00m; // Total paid out in cashouts

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        // Metadata for additional system tracking
        [MaxLength(2000)]
        public string? Metadata { get; set; } // JSON string for additional system data

        // Calculated properties
        [NotMapped]
        public decimal NetRevenue => TotalRevenue - TotalPayouts;

        [NotMapped]
        public decimal TokenUtilizationRate => TotalTokensIssued > 0 ? (TotalTokensInCirculation / TotalTokensIssued) * 100 : 0;
    }
}