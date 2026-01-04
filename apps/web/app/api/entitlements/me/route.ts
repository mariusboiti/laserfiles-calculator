/**
 * GET /api/entitlements/me
 * Returns the current user's entitlement status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEntitlementStatus } from '@/lib/entitlements/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

// Simple auth helper - gets userId from cookie or header
// In production, replace with your actual auth system
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  
  // Try multiple auth sources
  const userId = 
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  
  return userId || null;
}

export async function GET(req: NextRequest) {
  try {
    // Get user ID from auth
    let userId = await getCurrentUserId();
    
    // Also check Authorization header or query param for dev
    if (!userId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        userId = authHeader.slice(7);
      }
    }
    
    if (!userId) {
      // For demo purposes, use a default user ID
      // In production, return 401
      userId = 'demo-user';
    }

    const status = await getEntitlementStatus(userId);

    return NextResponse.json({
      ok: true,
      data: status,
    });
  } catch (error) {
    console.error('Error fetching entitlement:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to fetch entitlement status' } },
      { status: 500 }
    );
  }
}
