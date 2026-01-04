/**
 * Health Check Endpoint
 * Used by NetworkProvider to check server reachability
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
