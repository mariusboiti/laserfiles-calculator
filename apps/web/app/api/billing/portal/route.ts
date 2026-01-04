/**
 * POST /api/billing/portal
 * Creates a Stripe billing portal session for managing subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createBillingPortalSession, stripe } from '@/lib/stripe/server';
import { getEntitlementForUser } from '@/lib/entitlements/server';

export const runtime = 'nodejs';

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = 
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  return userId || null;
}

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: { message: 'Stripe is not configured' } },
        { status: 500 }
      );
    }

    let userId = await getCurrentUserId();
    
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.slice(7);
      }
    }
    
    if (!userId) {
      userId = 'demo-user';
    }

    const entitlement = await getEntitlementForUser(userId);

    if (!entitlement.stripeCustomerId) {
      return NextResponse.json(
        { ok: false, error: { message: 'No billing account found. Please start a trial first.' } },
        { status: 400 }
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || `${origin}/studio/dashboard`;

    const session = await createBillingPortalSession({
      customerId: entitlement.stripeCustomerId,
      returnUrl,
    });

    return NextResponse.json({
      ok: true,
      data: {
        portalUrl: session.url,
      },
    });
  } catch (error) {
    console.error('Error creating billing portal:', error);
    const message = error instanceof Error ? error.message : 'Failed to create billing portal';
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
