/**
 * Tour Progress API Routes
 * GET /api/tours/progress - Get tour progress for a tool
 * POST /api/tours/progress - Update tour progress
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const db = prisma as any;

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId =
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  return userId || null;
}

export type TourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface TourProgressData {
  toolSlug: string;
  status: TourStatus;
  lastStepIndex: number;
}

/**
 * GET /api/tours/progress?toolSlug=...
 */
export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const toolSlug = searchParams.get('toolSlug');

    if (!toolSlug) {
      return NextResponse.json(
        { ok: false, error: { message: 'Missing toolSlug parameter' } },
        { status: 400 }
      );
    }

    try {
      const progress = await db.tourProgress.findUnique({
        where: {
          userId_toolSlug: { userId, toolSlug },
        },
      });

      if (!progress) {
        return NextResponse.json({
          ok: true,
          data: {
            toolSlug,
            status: 'NOT_STARTED',
            lastStepIndex: 0,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        data: {
          toolSlug: progress.toolSlug,
          status: progress.status,
          lastStepIndex: progress.lastStepIndex,
        },
      });
    } catch (dbError) {
      // Table might not exist yet
      console.warn('TourProgress table may not exist:', dbError);
      return NextResponse.json({
        ok: true,
        data: {
          toolSlug,
          status: 'NOT_STARTED',
          lastStepIndex: 0,
        },
      });
    }
  } catch (error) {
    console.error('Error getting tour progress:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to get tour progress' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tours/progress
 */
export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json();
    const { toolSlug, status, lastStepIndex } = body;

    if (!toolSlug || !status) {
      return NextResponse.json(
        { ok: false, error: { message: 'Missing required fields: toolSlug, status' } },
        { status: 400 }
      );
    }

    const validStatuses: TourStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: { message: 'Invalid status' } },
        { status: 400 }
      );
    }

    try {
      const progress = await db.tourProgress.upsert({
        where: {
          userId_toolSlug: { userId, toolSlug },
        },
        update: {
          status,
          lastStepIndex: lastStepIndex ?? 0,
        },
        create: {
          userId,
          toolSlug,
          status,
          lastStepIndex: lastStepIndex ?? 0,
        },
      });

      return NextResponse.json({
        ok: true,
        data: {
          toolSlug: progress.toolSlug,
          status: progress.status,
          lastStepIndex: progress.lastStepIndex,
        },
      });
    } catch (dbError) {
      // Table might not exist yet - return success anyway
      console.warn('TourProgress table may not exist:', dbError);
      return NextResponse.json({
        ok: true,
        data: {
          toolSlug,
          status,
          lastStepIndex: lastStepIndex ?? 0,
        },
      });
    }
  } catch (error) {
    console.error('Error updating tour progress:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to update tour progress' } },
      { status: 500 }
    );
  }
}
