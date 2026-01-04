/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, stripe } from '@/lib/stripe/server';
import { syncFromStripeSubscription } from '@/lib/entitlements/server';

export const runtime = 'nodejs';

// Disable body parsing - we need raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: any;

  try {
    const body = await req.text();
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        if (session.subscription && session.customer) {
          // Fetch full subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          
          const userId = session.metadata?.userId || subscription.metadata?.userId;
          
          await syncFromStripeSubscription({
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            trialEnd: subscription.trial_end,
            currentPeriodEnd: subscription.current_period_end,
            userId,
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log(`Subscription ${event.type}:`, subscription.id, subscription.status);
        
        const userId = subscription.metadata?.userId;
        
        await syncFromStripeSubscription({
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          currentPeriodEnd: subscription.current_period_end,
          userId,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        await syncFromStripeSubscription({
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          status: 'canceled',
          trialEnd: null,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        // Could grant additional credits here for monthly renewals
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id);
        // Could send notification to user
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
