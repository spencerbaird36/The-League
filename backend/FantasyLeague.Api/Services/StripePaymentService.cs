using Microsoft.Extensions.Options;
using Stripe;
using FantasyLeague.Api.Models;
using FantasyLeague.Api.DTOs;

namespace FantasyLeague.Api.Services
{
    public class StripePaymentService
    {
        private readonly StripeSettings _stripeSettings;
        private readonly ILogger<StripePaymentService> _logger;

        public StripePaymentService(IOptions<StripeSettings> stripeSettings, ILogger<StripePaymentService> logger)
        {
            _stripeSettings = stripeSettings.Value;
            _logger = logger;

            // Configure Stripe API key
            StripeConfiguration.ApiKey = _stripeSettings.SecretKey;
        }

        #region Payment Intent Management

        /// <summary>
        /// Creates a payment intent for token purchase
        /// </summary>
        public async Task<PaymentIntentCreateResult> CreatePaymentIntentAsync(int userId, decimal amount, string description = "Token purchase")
        {
            try
            {
                // Validate amount
                if (amount < _stripeSettings.MinimumPurchaseAmount || amount > _stripeSettings.MaximumPurchaseAmount)
                {
                    return new PaymentIntentCreateResult
                    {
                        Success = false,
                        ErrorMessage = $"Amount must be between {_stripeSettings.MinimumPurchaseAmount:C} and {_stripeSettings.MaximumPurchaseAmount:C}"
                    };
                }

                var options = new PaymentIntentCreateOptions
                {
                    Amount = (long)(amount * 100), // Stripe uses cents
                    Currency = _stripeSettings.Currency,
                    Description = description,
                    Metadata = new Dictionary<string, string>
                    {
                        ["userId"] = userId.ToString(),
                        ["type"] = "token_purchase",
                        ["environment"] = _stripeSettings.IsTestMode ? "test" : "live"
                    },
                    // Enable automatic payment methods
                    AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                    {
                        Enabled = true
                    },
                    // Set up for future payments (save payment method)
                    SetupFutureUsage = "off_session"
                };

                var service = new PaymentIntentService();
                var paymentIntent = await service.CreateAsync(options);

                _logger.LogInformation("Created payment intent {PaymentIntentId} for user {UserId} amount {Amount}",
                    paymentIntent.Id, userId, amount);

                return new PaymentIntentCreateResult
                {
                    Success = true,
                    PaymentIntentId = paymentIntent.Id,
                    ClientSecret = paymentIntent.ClientSecret,
                    Amount = amount,
                    Currency = _stripeSettings.Currency
                };
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe error creating payment intent for user {UserId}: {Error}", userId, ex.Message);
                return new PaymentIntentCreateResult
                {
                    Success = false,
                    ErrorMessage = $"Payment service error: {ex.Message}"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error creating payment intent for user {UserId}", userId);
                return new PaymentIntentCreateResult
                {
                    Success = false,
                    ErrorMessage = "An unexpected error occurred"
                };
            }
        }

        /// <summary>
        /// Confirms a payment intent
        /// </summary>
        public async Task<PaymentIntentConfirmResult> ConfirmPaymentIntentAsync(string paymentIntentId, string? paymentMethodId = null)
        {
            try
            {
                var service = new PaymentIntentService();
                var options = new PaymentIntentConfirmOptions();

                if (!string.IsNullOrEmpty(paymentMethodId))
                {
                    options.PaymentMethod = paymentMethodId;
                }

                var paymentIntent = await service.ConfirmAsync(paymentIntentId, options);

                return new PaymentIntentConfirmResult
                {
                    Success = paymentIntent.Status == "succeeded",
                    Status = paymentIntent.Status,
                    PaymentIntentId = paymentIntent.Id,
                    Amount = paymentIntent.Amount / 100m, // Convert from cents
                    Currency = paymentIntent.Currency,
                    ErrorMessage = paymentIntent.Status != "succeeded" ? $"Payment status: {paymentIntent.Status}" : null
                };
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe error confirming payment intent {PaymentIntentId}: {Error}", paymentIntentId, ex.Message);
                return new PaymentIntentConfirmResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error confirming payment intent {PaymentIntentId}", paymentIntentId);
                return new PaymentIntentConfirmResult
                {
                    Success = false,
                    ErrorMessage = "An unexpected error occurred"
                };
            }
        }

        /// <summary>
        /// Retrieves a payment intent
        /// </summary>
        public async Task<PaymentIntent?> GetPaymentIntentAsync(string paymentIntentId)
        {
            try
            {
                var service = new PaymentIntentService();
                return await service.GetAsync(paymentIntentId);
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Error retrieving payment intent {PaymentIntentId}: {Error}", paymentIntentId, ex.Message);
                return null;
            }
        }

        #endregion

        #region Customer Management

        /// <summary>
        /// Creates or retrieves a Stripe customer for a user
        /// </summary>
        public async Task<Customer> CreateOrGetCustomerAsync(int userId, string email, string? name = null)
        {
            try
            {
                var service = new CustomerService();

                // First, try to find existing customer by metadata
                var searchOptions = new CustomerSearchOptions
                {
                    Query = $"metadata['userId']:'{userId}'"
                };

                var existingCustomers = await service.SearchAsync(searchOptions);
                if (existingCustomers.Data.Any())
                {
                    return existingCustomers.Data.First();
                }

                // Create new customer
                var options = new CustomerCreateOptions
                {
                    Email = email,
                    Name = name,
                    Metadata = new Dictionary<string, string>
                    {
                        ["userId"] = userId.ToString(),
                        ["environment"] = _stripeSettings.IsTestMode ? "test" : "live"
                    }
                };

                var customer = await service.CreateAsync(options);
                _logger.LogInformation("Created Stripe customer {CustomerId} for user {UserId}", customer.Id, userId);

                return customer;
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Error creating Stripe customer for user {UserId}: {Error}", userId, ex.Message);
                throw;
            }
        }

        #endregion

        #region Payment Methods

        /// <summary>
        /// Gets payment methods for a customer
        /// </summary>
        public async Task<List<PaymentMethod>> GetCustomerPaymentMethodsAsync(string customerId)
        {
            try
            {
                var service = new PaymentMethodService();
                var options = new PaymentMethodListOptions
                {
                    Customer = customerId,
                    Type = "card"
                };

                var paymentMethods = await service.ListAsync(options);
                return paymentMethods.Data.ToList();
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Error retrieving payment methods for customer {CustomerId}: {Error}", customerId, ex.Message);
                return new List<PaymentMethod>();
            }
        }

        #endregion

        #region Transfers and Payouts (for cashouts)

        /// <summary>
        /// Creates a transfer for cashout (placeholder - requires Stripe Connect)
        /// </summary>
        public async Task<TransferCreateResult> CreateTransferAsync(decimal amount, string destination, string description)
        {
            try
            {
                // Note: This requires Stripe Connect setup for actual implementation
                // For now, we'll simulate the transfer

                if (_stripeSettings.IsTestMode)
                {
                    // In test mode, simulate successful transfer
                    var fakeTransferId = $"tr_test_{Guid.NewGuid().ToString("N")[..16]}";

                    _logger.LogInformation("Simulated transfer {TransferId} for amount {Amount} to {Destination}",
                        fakeTransferId, amount, destination);

                    return new TransferCreateResult
                    {
                        Success = true,
                        TransferId = fakeTransferId,
                        Amount = amount,
                        Status = "pending" // Stripe transfers start as pending
                    };
                }

                // In production, you would implement actual Stripe Connect transfers
                throw new NotImplementedException("Production transfers require Stripe Connect setup");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating transfer for amount {Amount}: {Error}", amount, ex.Message);
                return new TransferCreateResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        #endregion

        #region Webhook Processing

        /// <summary>
        /// Processes Stripe webhook events
        /// </summary>
        public async Task<WebhookProcessResult> ProcessWebhookAsync(string requestBody, string signature)
        {
            try
            {
                var stripeEvent = EventUtility.ConstructEvent(
                    requestBody,
                    signature,
                    _stripeSettings.WebhookSecret
                );

                _logger.LogInformation("Processing webhook event {EventType} with ID {EventId}",
                    stripeEvent.Type, stripeEvent.Id);

                var result = new WebhookProcessResult
                {
                    Success = true,
                    EventType = stripeEvent.Type,
                    EventId = stripeEvent.Id
                };

                // Handle different event types
                switch (stripeEvent.Type)
                {
                    case "payment_intent.succeeded":
                        var paymentIntent = stripeEvent.Data.Object as PaymentIntent;
                        if (paymentIntent != null)
                        {
                            result.PaymentIntentId = paymentIntent.Id;
                            result.UserId = GetUserIdFromMetadata(paymentIntent.Metadata);
                            result.Amount = paymentIntent.Amount / 100m;
                        }
                        break;

                    case "payment_intent.payment_failed":
                        var failedPaymentIntent = stripeEvent.Data.Object as PaymentIntent;
                        if (failedPaymentIntent != null)
                        {
                            result.PaymentIntentId = failedPaymentIntent.Id;
                            result.UserId = GetUserIdFromMetadata(failedPaymentIntent.Metadata);
                            result.ErrorMessage = "Payment failed";
                        }
                        break;

                    case "transfer.created":
                    case "transfer.updated":
                        // Handle transfer events for cashouts
                        break;

                    default:
                        _logger.LogInformation("Unhandled webhook event type: {EventType}", stripeEvent.Type);
                        break;
                }

                return result;
            }
            catch (StripeException ex)
            {
                _logger.LogError(ex, "Stripe webhook validation failed: {Error}", ex.Message);
                return new WebhookProcessResult
                {
                    Success = false,
                    ErrorMessage = "Webhook validation failed"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing webhook: {Error}", ex.Message);
                return new WebhookProcessResult
                {
                    Success = false,
                    ErrorMessage = "Webhook processing failed"
                };
            }
        }

        private int? GetUserIdFromMetadata(IDictionary<string, string> metadata)
        {
            if (metadata?.TryGetValue("userId", out var userIdStr) == true &&
                int.TryParse(userIdStr, out var userId))
            {
                return userId;
            }
            return null;
        }

        #endregion

        #region Test Mode Helpers

        /// <summary>
        /// Gets test card numbers for development
        /// </summary>
        public static Dictionary<string, string> GetTestCards()
        {
            return new Dictionary<string, string>
            {
                ["4242424242424242"] = "Visa - Success",
                ["4000000000000002"] = "Visa - Card Declined",
                ["4000000000009995"] = "Visa - Insufficient Funds",
                ["4000000000000069"] = "Visa - Expired Card",
                ["4000000000000127"] = "Visa - Incorrect CVC",
                ["5555555555554444"] = "Mastercard - Success",
                ["378282246310005"] = "American Express - Success",
                ["6011111111111117"] = "Discover - Success"
            };
        }

        /// <summary>
        /// Validates if we're in test mode
        /// </summary>
        public bool IsTestMode => _stripeSettings.IsTestMode;

        #endregion
    }

    #region Result Classes

    public class PaymentIntentCreateResult
    {
        public bool Success { get; set; }
        public string? PaymentIntentId { get; set; }
        public string? ClientSecret { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "usd";
        public string? ErrorMessage { get; set; }
    }

    public class PaymentIntentConfirmResult
    {
        public bool Success { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? PaymentIntentId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "usd";
        public string? ErrorMessage { get; set; }
    }

    public class TransferCreateResult
    {
        public bool Success { get; set; }
        public string? TransferId { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }

    public class WebhookProcessResult
    {
        public bool Success { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string EventId { get; set; } = string.Empty;
        public string? PaymentIntentId { get; set; }
        public int? UserId { get; set; }
        public decimal? Amount { get; set; }
        public string? ErrorMessage { get; set; }
    }

    #endregion
}