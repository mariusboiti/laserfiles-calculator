/**
 * POST /api/billing/start-trial
 * Creates a Stripe checkout session for starting a trial subscription
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const upstreamUrl = `${origin}/api-backend/billing/checkout/subscription`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('authorization')
          ? { Authorization: req.headers.get('authorization') as string }
          : {}),
      },
      body: JSON.stringify({ interval: 'monthly' }),
    });

    const ct = upstreamRes.headers.get('content-type') || '';
    const payload = ct.includes('application/json')
      ? await upstreamRes.json().catch(() => null)
      : await upstreamRes.text().catch(() => '');

    return NextResponse.json(payload, { status: upstreamRes.status });
  } catch (error) {
    console.error('Error starting trial:', error);
    const message = error instanceof Error ? error.message : 'Failed to start trial';
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
