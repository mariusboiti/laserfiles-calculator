import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Batch endpoint — accepts multiple images and processes them sequentially
 * through the main photo-product pipeline. Each image gets its own full result.
 * 
 * This runs in-process for now. For true queue-based processing at scale,
 * this would be moved to a Redis/BullMQ worker on the NestJS backend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, productType, options } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (images.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 images per batch' }, { status: 400 });
    }

    // Build the internal URL for the main generate endpoint
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Forward auth headers
    const authHeader = req.headers.get('authorization');
    const cookie = req.headers.get('cookie');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authHeader) headers['Authorization'] = authHeader;
    if (cookie) headers['Cookie'] = cookie;

    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const items: any[] = [];
    let totalCreditsUsed = 0;

    // Process each image sequentially through the main pipeline
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const itemId = `${batchId}-${i}`;

      try {
        const response = await fetch(`${baseUrl}/api/ai/photo-product`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageBase64: img.imageBase64,
            productType: productType || 'engraved-frame',
            options: options || {},
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          items.push({
            id: itemId,
            fileName: img.fileName || `image-${i + 1}`,
            imageBase64: '',
            status: 'error',
            progress: 100,
            result: null,
            error: errData?.error || `Generation failed (${response.status})`,
          });
          continue;
        }

        const result = await response.json();
        totalCreditsUsed += result.credits?.used || 1;

        items.push({
          id: itemId,
          fileName: img.fileName || `image-${i + 1}`,
          imageBase64: '',
          status: 'complete',
          progress: 100,
          result,
          error: null,
        });
      } catch (err: any) {
        items.push({
          id: itemId,
          fileName: img.fileName || `image-${i + 1}`,
          imageBase64: '',
          status: 'error',
          progress: 100,
          result: null,
          error: err.message || 'Processing failed',
        });
      }
    }

    return NextResponse.json({
      batchId,
      items,
      totalCreditsUsed,
    });
  } catch (error) {
    console.error('Batch generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch generation failed' },
      { status: 500 },
    );
  }
}
