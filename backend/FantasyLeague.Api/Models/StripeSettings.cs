namespace FantasyLeague.Api.Models
{
    public class StripeSettings
    {
        public string SecretKey { get; set; } = string.Empty;
        public string PublishableKey { get; set; } = string.Empty;
        public string WebhookSecret { get; set; } = string.Empty;
        public bool IsTestMode { get; set; } = true;
        public string Currency { get; set; } = "usd";
        public decimal MinimumPurchaseAmount { get; set; } = 5.00m;
        public decimal MaximumPurchaseAmount { get; set; } = 10000.00m;
        public decimal MinimumCashoutAmount { get; set; } = 10.00m;
        public string BusinessName { get; set; } = "Fantasy League";
        public string SupportEmail { get; set; } = "support@fantasyleague.com";
    }
}