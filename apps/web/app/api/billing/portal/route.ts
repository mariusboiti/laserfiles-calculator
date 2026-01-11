/**
 * POST /api/billing/portal
 * Creates a Stripe billing portal session for managing subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;
  return NextResponse.json(
    {
      ok: false,
      error: {
        message: `Billing portal is deprecated. Please use ${origin}/studio/pricing to manage your subscription.`,
      },
    },
    { status: 410 },
  );
}
