using System.ComponentModel.DataAnnotations;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.DTOs
{
    // Request DTOs
    public class PlaceBetDto
    {
        [Required]
        public BetType BetType { get; set; }

        [Required]
        [Range(1.00, 10000.00, ErrorMessage = "Bet amount must be between $1.00 and $10,000.00")]
        public decimal Amount { get; set; }

        // For matchup bets
        public int? MatchupBetId { get; set; }
        public MatchupBetSelection? MatchupSelection { get; set; }

        // For game bets
        public int? GameBetId { get; set; }
        public GameBetSelection? GameSelection { get; set; }

        [MaxLength(200)]
        public string? Notes { get; set; }
    }

    public class CreateMatchupBetDto
    {
        [Required]
        public int LeagueId { get; set; }

        [Required]
        public int Week { get; set; }

        [Required]
        public int Season { get; set; }

        [Required]
        [MaxLength(10)]
        public string Sport { get; set; } = string.Empty;

        [Required]
        public int Team1UserId { get; set; }

        [Required]
        public int Team2UserId { get; set; }

        [Range(-50.0, 50.0)]
        public decimal? PointSpread { get; set; }

        [Range(0.0, 500.0)]
        public decimal? OverUnderLine { get; set; }

        [Range(-10000, 10000)]
        public decimal? Team1MoneylineOdds { get; set; }

        [Range(-10000, 10000)]
        public decimal? Team2MoneylineOdds { get; set; }

        public DateTime? ExpiresAt { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class CreateGameBetDto
    {
        [Required]
        public int LeagueId { get; set; }

        [Required]
        [MaxLength(50)]
        public string ExternalGameId { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Sport { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string HomeTeam { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string AwayTeam { get; set; } = string.Empty;

        [Required]
        public DateTime GameDateTime { get; set; }

        [MaxLength(20)]
        public string? Week { get; set; }

        [MaxLength(20)]
        public string? Season { get; set; }

        [Range(-50.0, 50.0)]
        public decimal? PointSpread { get; set; }

        [Range(0.0, 500.0)]
        public decimal? OverUnderLine { get; set; }

        [Range(-10000, 10000)]
        public decimal? HomeMoneylineOdds { get; set; }

        [Range(-10000, 10000)]
        public decimal? AwayMoneylineOdds { get; set; }

        [Range(-10000, 10000)]
        public decimal? OverOdds { get; set; }

        [Range(-10000, 10000)]
        public decimal? UnderOdds { get; set; }

        public DateTime? ExpiresAt { get; set; }

        [MaxLength(100)]
        public string? ExternalDataSource { get; set; }
    }

    public class SettleBetDto
    {
        [Required]
        public int BetId { get; set; }

        [Required]
        public BetStatus Status { get; set; } // Won, Lost, Push, Voided

        [MaxLength(500)]
        public string? SettlementNotes { get; set; }
    }

    public class SettleMatchupDto
    {
        [Required]
        public int MatchupBetId { get; set; }

        [Required]
        [Range(0, 1000)]
        public decimal Team1Score { get; set; }

        [Required]
        [Range(0, 1000)]
        public decimal Team2Score { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    public class SettleGameDto
    {
        [Required]
        public int GameBetId { get; set; }

        [Required]
        [Range(0, 300)]
        public int HomeScore { get; set; }

        [Required]
        [Range(0, 300)]
        public int AwayScore { get; set; }

        [Required]
        public GameStatus GameStatus { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }

    // Response DTOs
    public class BetDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int LeagueId { get; set; }
        public string LeagueName { get; set; } = string.Empty;
        public BetType Type { get; set; }
        public string TypeDisplayName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal PotentialPayout { get; set; }
        public decimal Odds { get; set; }
        public BetStatus Status { get; set; }
        public string StatusDisplayName { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SettledAt { get; set; }
        public string? Notes { get; set; }
        public string? SettlementNotes { get; set; }
        public string? SettledByAdminName { get; set; }
        public bool CanBeCancelled { get; set; }
        public bool IsExpired { get; set; }
        public decimal ImpliedProbability { get; set; }

        // Specific bet details
        public MatchupBetDto? MatchupBet { get; set; }
        public GameBetDto? GameBet { get; set; }
    }

    public class MatchupBetDto
    {
        public int Id { get; set; }
        public int Week { get; set; }
        public int Season { get; set; }
        public string Sport { get; set; } = string.Empty;
        public int Team1UserId { get; set; }
        public string Team1UserName { get; set; } = string.Empty;
        public int Team2UserId { get; set; }
        public string Team2UserName { get; set; } = string.Empty;
        public decimal? PointSpread { get; set; }
        public decimal? OverUnderLine { get; set; }
        public MatchupBetSelection? UserSelection { get; set; }
        public string? SelectionDisplayName { get; set; }
        public decimal? Team1Score { get; set; }
        public decimal? Team2Score { get; set; }
        public decimal? TotalScore { get; set; }
        public bool IsSettled { get; set; }
        public DateTime? SettledAt { get; set; }
        public int? WinnerUserId { get; set; }
        public string? WinnerUserName { get; set; }
        public bool CanBeSettled { get; set; }
    }

    public class GameBetDto
    {
        public int Id { get; set; }
        public string ExternalGameId { get; set; } = string.Empty;
        public string Sport { get; set; } = string.Empty;
        public string HomeTeam { get; set; } = string.Empty;
        public string AwayTeam { get; set; } = string.Empty;
        public DateTime GameDateTime { get; set; }
        public string? Week { get; set; }
        public string? Season { get; set; }
        public decimal? PointSpread { get; set; }
        public decimal? OverUnderLine { get; set; }
        public decimal? HomeMoneylineOdds { get; set; }
        public decimal? AwayMoneylineOdds { get; set; }
        public decimal? OverOdds { get; set; }
        public decimal? UnderOdds { get; set; }
        public GameBetSelection? UserSelection { get; set; }
        public string? SelectionDisplayName { get; set; }
        public int? HomeScore { get; set; }
        public int? AwayScore { get; set; }
        public GameStatus GameStatus { get; set; }
        public string GameStatusDisplayName { get; set; } = string.Empty;
        public bool IsSettled { get; set; }
        public DateTime? SettledAt { get; set; }
        public string? ExternalDataSource { get; set; }
        public DateTime? LastExternalUpdate { get; set; }
        public bool CanBeSettled { get; set; }
        public bool IsLive { get; set; }
        public bool IsGameTime { get; set; }
    }

    public class PlaceBetResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? BetId { get; set; }
        public decimal? NewTokenBalance { get; set; }
        public decimal? NewPendingBalance { get; set; }
        public BetDto? Bet { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class AvailableBetsDto
    {
        public List<MatchupBetOptionDto> MatchupBets { get; set; } = new();
        public List<GameBetOptionDto> GameBets { get; set; } = new();
        public int TotalAvailable { get; set; }
    }

    public class MatchupBetOptionDto
    {
        public int Id { get; set; }
        public int LeagueId { get; set; }
        public string LeagueName { get; set; } = string.Empty;
        public int Week { get; set; }
        public int Season { get; set; }
        public string Sport { get; set; } = string.Empty;
        public string Team1UserName { get; set; } = string.Empty;
        public string Team2UserName { get; set; } = string.Empty;
        public decimal? PointSpread { get; set; }
        public decimal? OverUnderLine { get; set; }
        public List<BettingOptionDto> BettingOptions { get; set; } = new();
        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class GameBetOptionDto
    {
        public int Id { get; set; }
        public int LeagueId { get; set; }
        public string LeagueName { get; set; } = string.Empty;
        public string ExternalGameId { get; set; } = string.Empty;
        public string Sport { get; set; } = string.Empty;
        public string HomeTeam { get; set; } = string.Empty;
        public string AwayTeam { get; set; } = string.Empty;
        public DateTime GameDateTime { get; set; }
        public string? Week { get; set; }
        public string? Season { get; set; }
        public GameStatus GameStatus { get; set; }
        public List<BettingOptionDto> BettingOptions { get; set; } = new();
        public DateTime? ExpiresAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class BettingOptionDto
    {
        public BetType BetType { get; set; }
        public string BetTypeDisplayName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal Odds { get; set; }
        public decimal ImpliedProbability { get; set; }
        public object Selection { get; set; } = new(); // MatchupBetSelection or GameBetSelection
        public string SelectionDisplayName { get; set; } = string.Empty;
        public decimal? Line { get; set; } // Point spread or over/under line
        public bool IsAvailable { get; set; }
    }

    public class BettingStatsDto
    {
        public int TotalBets { get; set; }
        public int ActiveBets { get; set; }
        public int WonBets { get; set; }
        public int LostBets { get; set; }
        public decimal TotalWagered { get; set; }
        public decimal TotalWon { get; set; }
        public decimal TotalLost { get; set; }
        public decimal NetProfit { get; set; }
        public decimal WinPercentage { get; set; }
        public decimal ROI { get; set; } // Return on Investment
        public decimal AverageBetSize { get; set; }
        public decimal LargestWin { get; set; }
        public decimal LargestLoss { get; set; }
    }

    // Extension methods for display names
    public static class BettingDtoExtensions
    {
        public static string GetBetTypeDisplayName(this BetType betType)
        {
            return betType switch
            {
                BetType.MatchupSpread => "Matchup Spread",
                BetType.MatchupMoneyline => "Matchup Moneyline",
                BetType.MatchupOverUnder => "Matchup Over/Under",
                BetType.GameSpread => "Game Spread",
                BetType.GameMoneyline => "Game Moneyline",
                BetType.GameOverUnder => "Game Over/Under",
                BetType.GameProps => "Game Props",
                _ => betType.ToString()
            };
        }

        public static string GetBetStatusDisplayName(this BetStatus status)
        {
            return status switch
            {
                BetStatus.Active => "Active",
                BetStatus.Won => "Won",
                BetStatus.Lost => "Lost",
                BetStatus.Push => "Push",
                BetStatus.Cancelled => "Cancelled",
                BetStatus.Voided => "Voided",
                BetStatus.Expired => "Expired",
                BetStatus.Pending => "Pending",
                _ => status.ToString()
            };
        }

        public static string GetMatchupSelectionDisplayName(this MatchupBetSelection selection)
        {
            return selection switch
            {
                MatchupBetSelection.Team1Spread => "Team 1 Spread",
                MatchupBetSelection.Team2Spread => "Team 2 Spread",
                MatchupBetSelection.Team1Moneyline => "Team 1 Win",
                MatchupBetSelection.Team2Moneyline => "Team 2 Win",
                MatchupBetSelection.Over => "Over",
                MatchupBetSelection.Under => "Under",
                _ => selection.ToString()
            };
        }

        public static string GetGameSelectionDisplayName(this GameBetSelection selection)
        {
            return selection switch
            {
                GameBetSelection.HomeSpread => "Home Spread",
                GameBetSelection.AwaySpread => "Away Spread",
                GameBetSelection.HomeMoneyline => "Home Win",
                GameBetSelection.AwayMoneyline => "Away Win",
                GameBetSelection.Over => "Over",
                GameBetSelection.Under => "Under",
                _ => selection.ToString()
            };
        }

        public static string GetGameStatusDisplayName(this GameStatus status)
        {
            return status switch
            {
                GameStatus.Scheduled => "Scheduled",
                GameStatus.InProgress => "In Progress",
                GameStatus.Final => "Final",
                GameStatus.Postponed => "Postponed",
                GameStatus.Cancelled => "Cancelled",
                GameStatus.Suspended => "Suspended",
                _ => status.ToString()
            };
        }
    }
}