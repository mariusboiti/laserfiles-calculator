/**
 * GET /api/entitlements/me
 * Returns the current user's entitlement status
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const upstreamUrl = `${origin}/api-backend/entitlements/me`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        ...(req.headers.get('authorization')
          ? { Authorization: req.headers.get('authorization') as string }
          : {}),
      },
      cache: 'no-store',
    });

    const ct = upstreamRes.headers.get('content-type') || '';
    const payload = ct.includes('application/json')
      ? await upstreamRes.json().catch(() => null)
      : await upstreamRes.text().catch(() => '');

    return NextResponse.json(payload, { status: upstreamRes.status });
  } catch (error) {
    console.error('Error fetching entitlement:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to fetch entitlement status' } },
      { status: 500 }
    );
  }
}
