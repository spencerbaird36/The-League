# Stripe Integration Setup Guide for Phase 2 Token System

This guide will help you set up Stripe integration for the token-based betting system in development and production environments.

## 🚀 Quick Start for Development

### 1. Get Stripe Test Keys

1. Visit [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Create a free Stripe account if you don't have one
3. Copy your test keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...`

### 2. Configure Application Settings

Add the following to your `appsettings.Development.json`:

```json
{
  "StripeSettings": {
    "SecretKey": "sk_test_YOUR_SECRET_KEY_HERE",
    "PublishableKey": "pk_test_YOUR_PUBLISHABLE_KEY_HERE",
    "WebhookSecret": "whsec_YOUR_WEBHOOK_SECRET_HERE",
    "IsTestMode": true,
    "Currency": "usd",
    "MinimumPurchaseAmount": 5.00,
    "MaximumPurchaseAmount": 10000.00,
    "MinimumCashoutAmount": 10.00,
    "BusinessName": "Fantasy League Test",
    "SupportEmail": "test@fantasyleague.com"
  }
}
```

### 3. Set Up Webhook Endpoint (Optional for Basic Testing)

For full webhook testing:

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `http://localhost:5000/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy the webhook signing secret and add to `WebhookSecret` in config

### 4. Test the Integration

Run the application and use the test endpoints in `test-stripe-phase2.http`.

---

## 🧪 Test Cards for Development

| Card Number | Description | Expected Result |
|-------------|-------------|-----------------|
| `4242424242424242` | Visa | Success |
| `4000000000000002` | Visa | Card Declined |
| `4000000000009995` | Visa | Insufficient Funds |
| `4000000000000069` | Visa | Expired Card |
| `4000000000000127` | Visa | Incorrect CVC |
| `5555555555554444` | Mastercard | Success |
| `378282246310005` | American Express | Success |

**Test Details:**
- **Expiry Date**: Any future date (e.g., `12/25`)
- **CVC**: Any 3-digit number (e.g., `123`)
- **Postal Code**: Any valid code (e.g., `12345`)

---

## 🔧 Development Testing Flow

### Basic Token Purchase Test

1. **Create Payment Intent**:
   ```http
   POST http://localhost:5000/api/token/purchase?userId=1
   Content-Type: application/json

   {
     "amount": 25.00,
     "description": "Test purchase"
   }
   ```

2. **Simulate Payment Confirmation**:
   ```http
   POST http://localhost:5000/api/token/dev/simulate-webhook
   Content-Type: application/json

   {
     "eventType": "payment_intent.succeeded",
     "paymentIntentId": "pi_test_...",  // From step 1 response
     "userId": 1,
     "amount": 25.00
   }
   ```

3. **Check Balance**:
   ```http
   GET http://localhost:5000/api/token/balance?userId=1
   ```

### Cashout Test

1. **Request Cashout**:
   ```http
   POST http://localhost:5000/api/token/cashout?userId=1
   Content-Type: application/json

   {
     "amount": 15.00,
     "method": 4,
     "paymentDetails": "test@example.com"
   }
   ```

2. **Admin Approve Cashout**:
   ```http
   POST http://localhost:5000/api/admin/tokens/process-cashout?adminUserId=1
   Content-Type: application/json

   {
     "cashoutRequestId": 1,
     "action": "approve",
     "notes": "Test approval"
   }
   ```

---

## 🎯 Available Endpoints

### User Endpoints
- `POST /api/token/purchase` - Create payment intent
- `POST /api/token/purchase/confirm` - Confirm payment (manual)
- `POST /api/token/cashout` - Request cashout
- `GET /api/token/cashout/history/{userId}` - Get cashout history
- `GET /api/token/balance` - Get current balance
- `GET /api/token/transactions/{userId}` - Get transaction history

### Admin Endpoints
- `GET /api/admin/tokens/dashboard` - Complete system overview
- `GET /api/admin/tokens/cashout-requests` - All cashout requests
- `POST /api/admin/tokens/process-cashout` - Approve/reject cashouts
- `POST /api/admin/tokens/adjust-balance` - Manually adjust balances

### Development Endpoints
- `POST /api/token/dev/add-test-tokens` - Add test tokens
- `GET /api/token/dev/stripe-test-cards` - Get test card numbers
- `POST /api/token/dev/simulate-webhook` - Simulate Stripe events

### Webhook Endpoint
- `POST /api/webhooks/stripe` - Stripe webhook handler

---

## 🏭 Production Setup

### 1. Environment Configuration

For production, update your `appsettings.Production.json`:

```json
{
  "StripeSettings": {
    "SecretKey": "sk_live_YOUR_LIVE_SECRET_KEY",
    "PublishableKey": "pk_live_YOUR_LIVE_PUBLISHABLE_KEY",
    "WebhookSecret": "whsec_YOUR_LIVE_WEBHOOK_SECRET",
    "IsTestMode": false,
    "Currency": "usd",
    "MinimumPurchaseAmount": 5.00,
    "MaximumPurchaseAmount": 10000.00,
    "MinimumCashoutAmount": 10.00,
    "BusinessName": "Fantasy League",
    "SupportEmail": "support@fantasyleague.com"
  }
}
```

### 2. Webhook Setup

1. Create production webhook endpoint at your domain
2. Use HTTPS (required for production)
3. Set webhook URL: `https://your-domain.com/api/webhooks/stripe`
4. Configure the same event types as development

### 3. Security Considerations

- **Never expose secret keys** in client-side code
- **Validate webhook signatures** to ensure requests are from Stripe
- **Use HTTPS** for all production endpoints
- **Implement rate limiting** for API endpoints
- **Log transactions** for audit trails
- **Monitor for suspicious activity**

---

## 🔍 Troubleshooting

### Common Issues

1. **"Invalid API key"**
   - Check that you're using the correct key for your environment
   - Ensure the key starts with `sk_test_` for test mode or `sk_live_` for live mode

2. **"Webhook signature verification failed"**
   - Verify webhook secret in configuration
   - Check that the endpoint URL matches exactly
   - Ensure raw request body is used for signature verification

3. **"Payment intent not found"**
   - Check that the payment intent ID is correct
   - Verify you're using the same Stripe account for creation and confirmation

4. **"Insufficient funds for cashout"**
   - User doesn't have enough token balance
   - Check for pending cashout requests

### Debug Mode

For detailed logging, set the log level in `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "FantasyLeague.Api.Services.StripePaymentService": "Debug",
      "FantasyLeague.Api.Controllers.StripeWebhookController": "Debug"
    }
  }
}
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

- **Token Purchase Volume**: Total tokens purchased over time
- **Cashout Requests**: Number and value of cashout requests
- **Payment Success Rate**: Percentage of successful payments
- **Average Transaction Size**: Typical purchase amounts
- **User Adoption**: Number of users with token balances

### Database Queries for Analytics

```sql
-- Total tokens in circulation
SELECT SUM("TokenBalance" + "PendingBalance") FROM "UserWallets";

-- Top users by token balance
SELECT u."Username", w."TokenBalance", w."PendingBalance"
FROM "UserWallets" w
JOIN "Users" u ON w."UserId" = u."Id"
ORDER BY w."TokenBalance" DESC LIMIT 10;

-- Transaction volume by day
SELECT DATE("CreatedAt") as "Date", COUNT(*) as "Count", SUM("Amount") as "Volume"
FROM "TokenTransactions"
WHERE "Type" = 'Purchase' AND "Status" = 'Completed'
GROUP BY DATE("CreatedAt")
ORDER BY "Date" DESC;
```

---

## 🚧 Future Enhancements

Phase 2 provides the foundation for:

- **Stripe Connect** for marketplace payments
- **Recurring billing** for subscription features
- **Multi-currency support** for international users
- **Mobile payments** with Apple Pay/Google Pay
- **Bank account verification** for improved security
- **Fraud detection** with Stripe Radar

---

For support or questions about the Stripe integration, refer to the [Stripe Documentation](https://stripe.com/docs) or contact the development team.