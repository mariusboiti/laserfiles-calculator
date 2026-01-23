import { NextRequest, NextResponse } from 'next/server';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

/**
 * API endpoint for AI puzzle image generation
 * This is a placeholder that can be connected to any AI image service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, stylePreset, noText, transparentBackground, variationCount, seed } = body;

    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI image generation not configured. Please add API key to environment variables.' },
        { status: 503 }
      );
    }

    // Consume AI credit before processing
    let credits: { used: number; remaining: number } | undefined;
    try {
      credits = await consumeAiCreditViaBackend({
        req: request,
        toolSlug: 'jigsaw-maker',
        actionType: 'generate-puzzle-image',
        provider: 'internal',
        payload: body as any,
      });
    } catch (error) {
      if (isEntitlementError(error)) {
        const entitlementError = error as EntitlementError;
        return NextResponse.json({
          error: entitlementError.message,
          code: entitlementError.code
        }, { status: entitlementError.httpStatus });
      }
      console.error('Credit consumption failed for generate-puzzle-image:', error);
      return NextResponse.json({ error: 'Failed to verify AI credits' }, { status: 500 });
    }

    // TODO: Implement actual AI image generation
    // For now, return a placeholder response
    
    return NextResponse.json({
      success: false,
      error: 'AI image generation not yet implemented. Please upload an image manually.',
      credits,
    }, { status: 501 });

  } catch (error) {
    console.error('AI image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

/**
 * Check if AI image generation is available
 */
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    available: false, // Set to true when implemented
    configured: !!apiKey,
  });
}
