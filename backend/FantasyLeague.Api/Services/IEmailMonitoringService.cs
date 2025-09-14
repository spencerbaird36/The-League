namespace FantasyLeague.Api.Services
{
    public interface IEmailMonitoringService
    {
        Task CheckEmailSystemHealthAsync();
        Task AlertOnHighFailureRateAsync();
        Task AlertOnStuckEmailsAsync();
        Task CleanupOldEmailLogsAsync();
        Task<EmailSystemMetrics> GetEmailSystemMetricsAsync(DateTime? startDate = null, DateTime? endDate = null);
    }

    public class EmailSystemMetrics
    {
        public int TotalEmails { get; set; }
        public int SentEmails { get; set; }
        public int FailedEmails { get; set; }
        public int PendingEmails { get; set; }
        public double DeliveryRate { get; set; }
        public double FailureRate { get; set; }
        public int StuckEmails { get; set; }
        public double AverageRetryCount { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public Dictionary<string, int> EmailTypeBreakdown { get; set; } = new();
        public Dictionary<string, int> StatusBreakdown { get; set; } = new();
    }
}