using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FantasyLeague.Api.Models
{
    public class UserWallet
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TokenBalance { get; set; } = 0.00m; // Available tokens (1:1 ratio to USD)

        [Column(TypeName = "decimal(18,2)")]
        public decimal PendingBalance { get; set; } = 0.00m; // Tokens locked in active bets

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Calculated property for total balance
        [NotMapped]
        public decimal TotalBalance => TokenBalance + PendingBalance;

        // Navigation properties
        public ICollection<TokenTransaction> Transactions { get; set; } = new List<TokenTransaction>();
    }
}