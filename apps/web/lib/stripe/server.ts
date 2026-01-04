/**
 * Stripe Server-Side Integration
 * Provides Stripe client and helper functions for billing operations
 * 
 * NOTE: Run `pnpm install` to install stripe package
 */

// Dynamic import to handle case where stripe is not installed
let Stripe: any;
try {
  Stripe = require('stripe').default || require('stripe');
} catch (e) {
  console.warn('Stripe package not installed. Run: pnpm add stripe');
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

export const stripe = (process.env.STRIPE_SECRET_KEY && Stripe)
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  : null;

export function getStripeOrThrow(): any {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
  }
  return stripe;
}

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name?: string;
  existingCustomerId?: string | null;
}): Promise<string> {
  const stripeClient = getStripeOrThrow();
  const { userId, email, name, existingCustomerId } = params;

  // If we have an existing customer ID, verify it exists
  if (existingCustomerId) {
    try {
      const customer = await stripeClient.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return existingCustomerId;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  // Create new customer
  const customer = await stripeClient.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for starting a trial subscription
 */
export async function createTrialCheckoutSession(params: {
  customerId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const stripeClient = getStripeOrThrow();
  const { customerId, userId, successUrl, cancelUrl } = params;

  const priceId = process.env.STRIPE_PRICE_ID_STUDIO;
  
  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID_STUDIO is not configured');
  }

  const session = await stripeClient.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        userId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
  });

  return session;
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const stripeClient = getStripeOrThrow();
  const { customerId, returnUrl } = params;

  const session = await stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripeClient = getStripeOrThrow();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
}
