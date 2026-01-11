/**
 * POST /api/billing/start-trial
 * Creates a Stripe checkout session for starting a trial subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOrCreateStripeCustomer, createTrialCheckoutSession, stripe } from '@/lib/stripe/server';
import { getEntitlementForUser } from '@/lib/entitlements/server';
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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

async function getUserEmail(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  return user?.email || `${userId}@studio.local`;
}

export async function POST(req: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: { message: 'Stripe is not configured' } },
        { status: 500 }
      );
    }

    let userId = await getCurrentUserId();
    
    // Check Authorization header
    if (!userId) {
      userId = getUserIdFromAuthHeader(req);
    }
    
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get existing entitlement
    const entitlement = await getEntitlementForUser(userId);

    // Check if already has active subscription
    if (entitlement.plan === 'ACTIVE') {
      return NextResponse.json(
        { ok: false, error: { message: 'You already have an active subscription' } },
        { status: 400 }
      );
    }

    // Get user email
    const email = await getUserEmail(userId);

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer({
      userId,
      email,
      existingCustomerId: entitlement.stripeCustomerId,
    });

    // Update entitlement with customer ID
    await prisma.userEntitlement.update({
      where: { id: entitlement.id },
      data: { stripeCustomerId: customerId },
    });

    // Get return URLs
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${origin}/studio/dashboard?trial=started`;
    const cancelUrl = `${origin}/studio/dashboard?trial=cancelled`;

    // Create checkout session
    const session = await createTrialCheckoutSession({
      customerId,
      userId,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      ok: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error('Error starting trial:', error);
    const message = error instanceof Error ? error.message : 'Failed to start trial';
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
