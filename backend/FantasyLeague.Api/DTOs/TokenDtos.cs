using System.ComponentModel.DataAnnotations;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.DTOs
{
    // Request DTOs
    public class PurchaseTokensDto
    {
        [Required]
        [Range(1.00, 10000.00, ErrorMessage = "Purchase amount must be between $1.00 and $10,000.00")]
        public decimal Amount { get; set; }

        [MaxLength(100)]
        public string? PaymentMethodId { get; set; } // For saved payment methods

        [MaxLength(200)]
        public string? Description { get; set; }
    }

    public class ConfirmPaymentDto
    {
        [Required]
        [MaxLength(100)]
        public string PaymentIntentId { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? PaymentMethodId { get; set; }
    }

    public class CashoutRequestDto
    {
        [Required]
        [Range(10.00, 50000.00, ErrorMessage = "Cashout amount must be between $10.00 and $50,000.00")]
        public decimal Amount { get; set; }

        [Required]
        public CashoutMethod Method { get; set; }

        [Required]
        [MaxLength(1000)]
        public string PaymentDetails { get; set; } = string.Empty; // Bank details, PayPal email, etc.

        [MaxLength(200)]
        public string? Notes { get; set; }
    }

    public class ProcessCashoutDto
    {
        [Required]
        public int CashoutRequestId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Action { get; set; } = string.Empty; // "approve", "reject", "under_review"

        [MaxLength(500)]
        public string? Notes { get; set; }

        [MaxLength(500)]
        public string? RejectionReason { get; set; } // Required for reject action
    }

    public class SimulateWebhookDto
    {
        [Required]
        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty; // e.g., "payment_intent.succeeded"

        [Required]
        [MaxLength(100)]
        public string PaymentIntentId { get; set; } = string.Empty;

        [Required]
        public int UserId { get; set; }

        [Required]
        [Range(0.01, 10000.00)]
        public decimal Amount { get; set; }
    }

    public class AddTestTokensDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        [Range(0.01, 10000.00, ErrorMessage = "Amount must be between $0.01 and $10,000.00")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(200)]
        public string Reason { get; set; } = string.Empty;
    }

    public class AdminAdjustBalanceDto
    {
        [Required]
        public int UserId { get; set; }

        [Required]
        public decimal Amount { get; set; } // Can be positive or negative

        [Required]
        [MaxLength(200)]
        public string Reason { get; set; } = string.Empty;

        public bool IsCredit => Amount > 0;
    }

    // Response DTOs
    public class UserWalletDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public decimal TokenBalance { get; set; }
        public decimal PendingBalance { get; set; }
        public decimal TotalBalance { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class TokenTransactionDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public TokenTransactionType Type { get; set; }
        public string TypeDisplayName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
        public string Description { get; set; } = string.Empty;
        public TokenTransactionStatus Status { get; set; }
        public string StatusDisplayName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public int? RelatedBetId { get; set; }
        public string? ProcessedByAdminName { get; set; }
    }

    public class SystemTokenPoolDto
    {
        public int Id { get; set; }
        public decimal TotalTokensIssued { get; set; }
        public decimal TotalTokensInCirculation { get; set; }
        public decimal TotalCashedOut { get; set; }
        public decimal HouseBalance { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalPayouts { get; set; }
        public decimal NetRevenue { get; set; }
        public decimal TokenUtilizationRate { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class AdminTokenActionDto
    {
        public int Id { get; set; }
        public int AdminUserId { get; set; }
        public string AdminUserName { get; set; } = string.Empty;
        public int TargetUserId { get; set; }
        public string TargetUserName { get; set; } = string.Empty;
        public AdminActionType Type { get; set; }
        public string TypeDisplayName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public AdminActionStatus Status { get; set; }
        public string StatusDisplayName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public int? TokenTransactionId { get; set; }
    }

    public class PurchaseTokensResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? TransactionId { get; set; }
        public decimal? NewBalance { get; set; }
        public string? PaymentIntentClientSecret { get; set; } // For Stripe payment confirmation
        public string? PaymentIntentId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "usd";
    }

    public class PaymentConfirmationResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? PaymentIntentId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? Amount { get; set; }
        public int? TransactionId { get; set; }
        public decimal? NewBalance { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class CashoutResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int? CashoutRequestId { get; set; }
        public CashoutStatus Status { get; set; }
        public DateTime? EstimatedProcessingTime { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public class CashoutRequestDetailDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public CashoutMethod Method { get; set; }
        public string MethodDisplayName { get; set; } = string.Empty;
        public CashoutStatus Status { get; set; }
        public string StatusDisplayName { get; set; } = string.Empty;
        public DateTime RequestedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? ProcessedByAdminName { get; set; }
        public string? RejectionReason { get; set; }
        public bool RequiresManualReview { get; set; }
        public string? Notes { get; set; }
    }

    public class TokenBalanceResponseDto
    {
        public decimal TokenBalance { get; set; }
        public decimal PendingBalance { get; set; }
        public decimal TotalBalance { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class TokenTransactionHistoryDto
    {
        public List<TokenTransactionDto> Transactions { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }

    // Admin Dashboard DTOs
    public class AdminTokenDashboardDto
    {
        public SystemTokenPoolDto SystemPool { get; set; } = new();
        public List<UserWalletSummaryDto> TopWallets { get; set; } = new();
        public List<TokenTransactionDto> RecentTransactions { get; set; } = new();
        public TokenStatisticsDto Statistics { get; set; } = new();
    }

    public class UserWalletSummaryDto
    {
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public decimal TokenBalance { get; set; }
        public decimal PendingBalance { get; set; }
        public decimal TotalBalance { get; set; }
        public DateTime LastTransactionDate { get; set; }
    }

    public class TokenStatisticsDto
    {
        public int TotalActiveWallets { get; set; }
        public int TransactionsToday { get; set; }
        public decimal VolumeToday { get; set; }
        public int TransactionsThisWeek { get; set; }
        public decimal VolumeThisWeek { get; set; }
        public int TransactionsThisMonth { get; set; }
        public decimal VolumeThisMonth { get; set; }
        public decimal AverageWalletBalance { get; set; }
        public decimal MedianWalletBalance { get; set; }
    }

    // Helper extension methods
    public static class TokenDtoExtensions
    {
        public static string GetTypeDisplayName(this TokenTransactionType type)
        {
            return type switch
            {
                TokenTransactionType.Purchase => "Token Purchase",
                TokenTransactionType.AdminCredit => "Admin Credit",
                TokenTransactionType.AdminDebit => "Admin Debit",
                TokenTransactionType.BetPlaced => "Bet Placed",
                TokenTransactionType.BetWon => "Bet Won",
                TokenTransactionType.BetLost => "Bet Lost",
                TokenTransactionType.BetRefunded => "Bet Refunded",
                TokenTransactionType.CashoutRequest => "Cashout Request",
                TokenTransactionType.CashoutCompleted => "Cashout Completed",
                TokenTransactionType.CashoutCancelled => "Cashout Cancelled",
                _ => type.ToString()
            };
        }

        public static string GetStatusDisplayName(this TokenTransactionStatus status)
        {
            return status switch
            {
                TokenTransactionStatus.Pending => "Pending",
                TokenTransactionStatus.Completed => "Completed",
                TokenTransactionStatus.Failed => "Failed",
                TokenTransactionStatus.Cancelled => "Cancelled",
                TokenTransactionStatus.Refunded => "Refunded",
                _ => status.ToString()
            };
        }

        public static string GetActionTypeDisplayName(this AdminActionType type)
        {
            return type switch
            {
                AdminActionType.AddTokens => "Add Tokens",
                AdminActionType.RemoveTokens => "Remove Tokens",
                AdminActionType.FreezeBetting => "Freeze Betting",
                AdminActionType.UnfreezeBetting => "Unfreeze Betting",
                AdminActionType.RefundBet => "Refund Bet",
                AdminActionType.AdjustSystemPool => "Adjust System Pool",
                AdminActionType.ManualCashout => "Manual Cashout",
                _ => type.ToString()
            };
        }

        public static string GetActionStatusDisplayName(this AdminActionStatus status)
        {
            return status switch
            {
                AdminActionStatus.Pending => "Pending",
                AdminActionStatus.Completed => "Completed",
                AdminActionStatus.Failed => "Failed",
                AdminActionStatus.Cancelled => "Cancelled",
                _ => status.ToString()
            };
        }

        public static string GetCashoutMethodDisplayName(this CashoutMethod method)
        {
            return method switch
            {
                CashoutMethod.BankTransfer => "Bank Transfer (ACH)",
                CashoutMethod.PayPal => "PayPal",
                CashoutMethod.Check => "Physical Check",
                CashoutMethod.Stripe => "Direct Transfer",
                _ => method.ToString()
            };
        }

        public static string GetCashoutStatusDisplayName(this CashoutStatus status)
        {
            return status switch
            {
                CashoutStatus.Pending => "Pending Review",
                CashoutStatus.UnderReview => "Under Review",
                CashoutStatus.Approved => "Approved",
                CashoutStatus.Processing => "Processing",
                CashoutStatus.Completed => "Completed",
                CashoutStatus.Rejected => "Rejected",
                CashoutStatus.Failed => "Failed",
                CashoutStatus.Cancelled => "Cancelled",
                _ => status.ToString()
            };
        }
    }
}