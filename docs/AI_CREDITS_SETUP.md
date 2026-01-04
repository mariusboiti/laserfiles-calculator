# AI Credits & Trial System Setup

This document describes how to set up the AI credits and trial billing system for LaserFilesPro Studio.

## Overview

- **Trial**: 7 days with credit card required
- **AI Credits**: 25 credits for trial, additional credits on subscription
- **Gating**: All AI features require active trial or subscription

## Environment Variables

Add these to `apps/web/.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...          # From Stripe Dashboard > API Keys
STRIPE_WEBHOOK_SECRET=whsec_...        # From Stripe Dashboard > Webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # From Stripe Dashboard > API Keys

# Stripe Product/Price
STRIPE_PRICE_ID_STUDIO=price_...       # Create in Stripe Dashboard > Products

# Return URL
STRIPE_CUSTOMER_PORTAL_RETURN_URL=http://localhost:3000/studio/dashboard
```

## Stripe Setup

### 1. Create a Product

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Create a new product: "LaserFilesPro Studio"
3. Add a recurring price (e.g., $9.99/month)

### 2. Configure Trial

On the price configuration:
- Enable "Free trial"
- Set trial period: 7 days
- Payment collection: Collect payment method upfront

### 3. Set Up Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Configure Customer Portal

1. Go to [Stripe Dashboard > Settings > Billing > Customer portal](https://dashboard.stripe.com/settings/billing/portal)
2. Enable features:
   - Cancel subscription
   - Update payment method
   - View invoices

## Database Migration

Run Prisma migration to create the new tables:

```bash
cd apps/web
npx prisma migrate dev --name add_entitlements
npx prisma generate
```

## API Endpoints

### Entitlements

- `GET /api/entitlements/me` - Get current user's entitlement status

### Billing

- `POST /api/billing/start-trial` - Start trial (redirects to Stripe Checkout)
- `POST /api/billing/portal` - Open Stripe billing portal

### AI Gateway

- `POST /api/ai/run` - Centralized AI endpoint with credit consumption

Request body:
```json
{
  "toolSlug": "personalised-sign-generator",
  "actionType": "image",
  "provider": "gemini",
  "payload": {
    "prompt": "A deer in forest",
    "mode": "engravingSketch"
  }
}
```

Response:
```json
{
  "ok": true,
  "data": {
    "mime": "image/png",
    "base64": "...",
    "promptUsed": "..."
  },
  "credits": {
    "used": 1,
    "remaining": 24
  }
}
```

Error responses:
- `402` - Credits exhausted
- `403` - Trial required
- `410` - Trial expired

### Webhook

- `POST /api/stripe/webhook` - Stripe webhook handler (called by Stripe)

## UI Components

### AiCreditsBadge

Shows in ToolShell header:
- Credits remaining (X/Y)
- Trial days left
- Start trial CTA (if no plan)

### BillingCard

Shows on dashboard:
- Credits progress bar
- Trial status
- Start Trial / Subscribe button
- Manage Billing button

## Usage in Tools

### Using the AI Gateway

```typescript
import { generateAiImage, requiresUpgrade, getErrorMessage } from '@/lib/ai/gateway';

const result = await generateAiImage({
  toolSlug: 'my-tool',
  prompt: 'A beautiful landscape',
  mode: 'engravingSketch',
});

if (result.ok) {
  // Use result.data.base64
  console.log('Credits remaining:', result.credits.remaining);
} else {
  if (requiresUpgrade(result.error)) {
    // Show upgrade CTA
  }
  console.error(getErrorMessage(result.error));
}
```

### Checking Entitlements

```typescript
import { useEntitlement, canUseAi } from '@/lib/entitlements/client';

function MyComponent() {
  const { entitlement, loading } = useEntitlement();
  
  if (!canUseAi(entitlement)) {
    return <UpgradeCTA />;
  }
  
  return <AIFeature />;
}
```

## Testing

### Local Webhook Testing

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

## Troubleshooting

### "Stripe is not configured"

Ensure `STRIPE_SECRET_KEY` is set in `.env.local`.

### Webhook signature verification failed

1. Check `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure raw body is passed (not parsed JSON)

### Credits not updating

Check webhook is properly configured and receiving events.
