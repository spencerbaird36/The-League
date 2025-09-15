using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FantasyLeague.Api.Data;
using FantasyLeague.Api.Services;
using FantasyLeague.Api.Models;

namespace FantasyLeague.Api.Controllers
{
    [ApiController]
    [Route("api/webhooks/stripe")]
    public class StripeWebhookController : ControllerBase
    {
        private readonly FantasyLeagueContext _context;
        private readonly StripePaymentService _stripeService;
        private readonly UserWalletService _walletService;
        private readonly ILogger<StripeWebhookController> _logger;

        public StripeWebhookController(
            FantasyLeagueContext context,
            StripePaymentService stripeService,
            UserWalletService walletService,
            ILogger<StripeWebhookController> logger)
        {
            _context = context;
            _stripeService = stripeService;
            _walletService = walletService;
            _logger = logger;
        }

        /// <summary>
        /// Handles Stripe webhook events
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> HandleWebhook()
        {
            try
            {
                // Read the request body
                var requestBody = await new StreamReader(Request.Body).ReadToEndAsync();

                // Get the Stripe signature header
                var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();
                if (string.IsNullOrEmpty(signature))
                {
                    _logger.LogWarning("Missing Stripe signature header");
                    return BadRequest("Missing signature");
                }

                // Process the webhook
                var result = await _stripeService.ProcessWebhookAsync(requestBody, signature);
                if (!result.Success)
                {
                    _logger.LogError("Webhook processing failed: {Error}", result.ErrorMessage);
                    return BadRequest(result.ErrorMessage);
                }

                _logger.LogInformation("Processing webhook event {EventType} with ID {EventId}",
                    result.EventType, result.EventId);

                // Handle different event types
                switch (result.EventType)
                {
                    case "payment_intent.succeeded":
                        await HandlePaymentSucceeded(result);
                        break;

                    case "payment_intent.payment_failed":
                        await HandlePaymentFailed(result);
                        break;

                    case "payment_intent.canceled":
                        await HandlePaymentCanceled(result);
                        break;

                    default:
                        _logger.LogInformation("Unhandled webhook event type: {EventType}", result.EventType);
                        break;
                }

                return Ok(new { Received = true, EventType = result.EventType });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Stripe webhook");
                return StatusCode(500, new { Message = "Webhook processing failed" });
            }
        }

        private async Task HandlePaymentSucceeded(WebhookProcessResult result)
        {
            if (!result.UserId.HasValue || !result.Amount.HasValue || string.IsNullOrEmpty(result.PaymentIntentId))
            {
                _logger.LogWarning("Invalid payment succeeded webhook data");
                return;
            }

            try
            {
                // Find the pending transaction
                var transaction = await _context.TokenTransactions
                    .FirstOrDefaultAsync(t => t.PaymentIntentId == result.PaymentIntentId);

                if (transaction == null)
                {
                    _logger.LogWarning("No transaction found for payment intent {PaymentIntentId}", result.PaymentIntentId);
                    return;
                }

                if (transaction.Status == TokenTransactionStatus.Completed)
                {
                    _logger.LogInformation("Transaction {TransactionId} already completed", transaction.Id);
                    return;
                }

                // Add tokens to user account
                var success = await _walletService.AddTokensAsync(
                    result.UserId.Value,
                    result.Amount.Value,
                    $"Token purchase confirmed via webhook - Payment Intent: {result.PaymentIntentId}",
                    TokenTransactionType.Purchase
                );

                if (success)
                {
                    // Update the transaction status
                    transaction.Status = TokenTransactionStatus.Completed;
                    transaction.ProcessedAt = DateTime.UtcNow;

                    // Update balance info
                    var wallet = await _walletService.GetOrCreateWalletAsync(result.UserId.Value);
                    transaction.BalanceBefore = wallet.TokenBalance - result.Amount.Value;
                    transaction.BalanceAfter = wallet.TokenBalance;

                    await _context.SaveChangesAsync();

                    _logger.LogInformation("Successfully processed webhook payment for user {UserId}, amount {Amount}",
                        result.UserId, result.Amount);
                }
                else
                {
                    // Payment succeeded but token addition failed
                    transaction.Status = TokenTransactionStatus.Failed;
                    await _context.SaveChangesAsync();

                    _logger.LogError("Payment succeeded but failed to add tokens for user {UserId}", result.UserId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling payment succeeded webhook for user {UserId}", result.UserId);
            }
        }

        private async Task HandlePaymentFailed(WebhookProcessResult result)
        {
            if (string.IsNullOrEmpty(result.PaymentIntentId))
            {
                _logger.LogWarning("Invalid payment failed webhook data");
                return;
            }

            try
            {
                // Find the pending transaction
                var transaction = await _context.TokenTransactions
                    .FirstOrDefaultAsync(t => t.PaymentIntentId == result.PaymentIntentId);

                if (transaction == null)
                {
                    _logger.LogWarning("No transaction found for failed payment intent {PaymentIntentId}", result.PaymentIntentId);
                    return;
                }

                if (transaction.Status != TokenTransactionStatus.Pending)
                {
                    _logger.LogInformation("Transaction {TransactionId} status is already {Status}",
                        transaction.Id, transaction.Status);
                    return;
                }

                // Mark transaction as failed
                transaction.Status = TokenTransactionStatus.Failed;
                transaction.ProcessedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Marked transaction {TransactionId} as failed due to payment failure",
                    transaction.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling payment failed webhook for payment intent {PaymentIntentId}",
                    result.PaymentIntentId);
            }
        }

        private async Task HandlePaymentCanceled(WebhookProcessResult result)
        {
            if (string.IsNullOrEmpty(result.PaymentIntentId))
            {
                _logger.LogWarning("Invalid payment canceled webhook data");
                return;
            }

            try
            {
                // Find the pending transaction
                var transaction = await _context.TokenTransactions
                    .FirstOrDefaultAsync(t => t.PaymentIntentId == result.PaymentIntentId);

                if (transaction == null)
                {
                    _logger.LogWarning("No transaction found for canceled payment intent {PaymentIntentId}", result.PaymentIntentId);
                    return;
                }

                if (transaction.Status != TokenTransactionStatus.Pending)
                {
                    _logger.LogInformation("Transaction {TransactionId} status is already {Status}",
                        transaction.Id, transaction.Status);
                    return;
                }

                // Mark transaction as cancelled
                transaction.Status = TokenTransactionStatus.Cancelled;
                transaction.ProcessedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Marked transaction {TransactionId} as cancelled due to payment cancellation",
                    transaction.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling payment canceled webhook for payment intent {PaymentIntentId}",
                    result.PaymentIntentId);
            }
        }
    }
}