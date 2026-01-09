/**
 * Artifacts API Routes
 * POST /api/artifacts - Create artifact
 * GET /api/artifacts - List artifacts
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createArtifactFromExport,
  listArtifacts,
  type CreateArtifactInput,
} from '@/lib/artifacts/server';

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
 * POST /api/artifacts
 * Create a new artifact from exported files
 */
export async function POST(req: NextRequest) {
  try {
    let userId = await getCurrentUserId();

    // Check Authorization header
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

    const { toolSlug, name, description, svg, dxfBase64, pdfBase64, previewPngBase64, meta } = body;

    if (!toolSlug || !name) {
      return NextResponse.json(
        { ok: false, error: { message: 'Missing required fields: toolSlug, name' } },
        { status: 400 }
      );
    }

    // Decode base64 files if provided
    const input: CreateArtifactInput = {
      toolSlug,
      name,
      description,
      svg,
      meta,
    };

    if (dxfBase64) {
      input.dxfBytes = base64ToBytes(dxfBase64);
    }

    if (pdfBase64) {
      input.pdfBytes = base64ToBytes(pdfBase64);
    }

    if (previewPngBase64) {
      input.previewPngBytes = base64ToBytes(previewPngBase64);
    }

    const artifact = await createArtifactFromExport(userId, input);

    return NextResponse.json({
      ok: true,
      data: {
        id: artifact.id,
        name: artifact.name,
        toolSlug: artifact.toolSlug,
        fileSvgUrl: artifact.fileSvgUrl,
        previewPngUrl: artifact.previewPngUrl,
        metaJson: artifact.metaJson,
        createdAt: artifact.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating artifact:', error);
    const message = error instanceof Error ? error.message : 'Failed to create artifact';
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/artifacts
 * List artifacts with optional filters
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
    const q = searchParams.get('q') || undefined;
    const toolSlug = searchParams.get('toolSlug') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    const result = await listArtifacts(userId, { q, toolSlug, limit, cursor });

    return NextResponse.json({
      ok: true,
      data: {
        artifacts: result.artifacts.map((a) => ({
          id: a.id,
          name: a.name,
          toolSlug: a.toolSlug,
          description: a.description,
          fileSvgUrl: a.fileSvgUrl,
          fileDxfUrl: a.fileDxfUrl,
          filePdfUrl: a.filePdfUrl,
          previewPngUrl: a.previewPngUrl,
          metaJson: a.metaJson,
          createdAt: a.createdAt,
        })),
        nextCursor: result.nextCursor,
      },
    });
  } catch (error) {
    console.error('Error listing artifacts:', error);
    return NextResponse.json(
      { ok: false, error: { message: 'Failed to list artifacts' } },
      { status: 500 }
    );
  }
}

function base64ToBytes(base64: string): Uint8Array {
  // Handle data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
