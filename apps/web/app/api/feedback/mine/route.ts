/**
 * GET /api/feedback/mine - Get current user's feedback tickets
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
  return (
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value ||
    null
  );
}

export async function GET(req: NextRequest) {
  try {
    let userId = await getCurrentUserId();
    if (!userId) userId = 'demo-user';

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const toolSlug = searchParams.get('toolSlug');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor');

    const where: any = { userId };
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type.toUpperCase();
    if (toolSlug) where.toolSlug = toolSlug;

    try {
      const tickets = await db.feedbackTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          attachments: {
            select: { id: true, filename: true, url: true },
          },
        },
      });

      let nextCursor: string | null = null;
      if (tickets.length > limit) {
        const next = tickets.pop();
        nextCursor = next?.id || null;
      }

      return NextResponse.json({
        ok: true,
        data: {
          tickets: tickets.map((t: any) => ({
            id: t.id,
            type: t.type,
            toolSlug: t.toolSlug,
            title: t.title,
            message: t.message,
            severity: t.severity,
            status: t.status,
            attachments: t.attachments,
            createdAt: t.createdAt,
          })),
          nextCursor,
        },
      });
    } catch (dbError) {
      console.warn('FeedbackTicket table may not exist:', dbError);
      return NextResponse.json({
        ok: true,
        data: { tickets: [], nextCursor: null },
      });
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to fetch feedback' } },
      { status: 500 }
    );
  }
}
