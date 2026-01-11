/**
 * POST /api/billing/portal
 * Creates a Stripe billing portal session for managing subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createBillingPortalSession, stripe } from '@/lib/stripe/server';
import { getEntitlementForUser } from '@/lib/entitlements/server';
import * as jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = 
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  return userId || null;
}

function getUserIdFromAuthHeader(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    const payload = secret
      ? ((jwt as any).verify(token, secret) as any)
      : ((jwt as any).decode(token) as any);
    const sub = payload?.sub;
    return sub ? String(sub) : null;
  } catch {
    return null;
  }
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
      userId = getUserIdFromAuthHeader(req);
    }
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
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
