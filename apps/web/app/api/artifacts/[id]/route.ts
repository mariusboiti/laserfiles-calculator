/**
 * Artifact Detail API Routes
 * GET /api/artifacts/:id - Get single artifact
 * DELETE /api/artifacts/:id - Delete artifact
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getArtifact, deleteArtifact } from '@/lib/artifacts/server';

export const runtime = 'nodejs';

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId =
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  return userId || null;
}

/**
 * GET /api/artifacts/:id
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { message: 'Missing artifact ID' } },
        { status: 400 }
      );
    }

    const artifact = await getArtifact(userId, id);

    if (!artifact) {
      return NextResponse.json(
        { ok: false, error: { message: 'Artifact not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: artifact,
    });
  } catch (error) {
    console.error('Error getting artifact:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to get artifact' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/artifacts/:id
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { message: 'Missing artifact ID' } },
        { status: 400 }
      );
    }

    const deleted = await deleteArtifact(userId, id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: { message: 'Artifact not found or already deleted' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error deleting artifact:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to delete artifact' } },
      { status: 500 }
    );
  }
}
