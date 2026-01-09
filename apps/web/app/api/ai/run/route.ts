/**
 * POST /api/ai/run
 * Centralized AI Gateway - handles all AI calls with credit consumption
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consumeAiCredit, isEntitlementError, type EntitlementError } from '@/lib/entitlements/server';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for AI calls

type AiRunRequest = {
  toolSlug: string;
  actionType: string;
  provider: 'gemini' | 'openai';
  payload: Record<string, unknown>;
};

type AiRunResponse = {
  ok: true;
  data: unknown;
  credits: {
    used: number;
    remaining: number;
  };
} | {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = 
    cookieStore.get('userId')?.value ||
    cookieStore.get('user_id')?.value ||
    cookieStore.get('studio_user_id')?.value;
  return userId || null;
}

function resolveGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || '').trim();
  const endpoint = (
    process.env.VITE_AI_STYLIZE_ENDPOINT?.trim() ||
    process.env.AI_STYLIZE_ENDPOINT?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  ).trim();
  
  return { apiKey, endpoint };
}

async function callGeminiImage(payload: Record<string, unknown>): Promise<unknown> {
  const { apiKey, endpoint } = resolveGeminiConfig();
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const { prompt, mode, aspect, transparent } = payload as {
    prompt?: string;
    mode?: string;
    aspect?: string;
    transparent?: boolean;
  };

  if (!prompt) {
    throw new Error('Missing prompt in payload');
  }

  const modeHint = mode === 'engravingSketch'
    ? 'Monochrome pen/pencil sketch line art, suitable for laser engraving and vector tracing.'
    : 'Laser-cut-friendly silhouette with clean edges, suitable for vector tracing.';

  const bg = transparent !== false
    ? 'transparent background (or pure white background if transparency is not supported)'
    : 'pure white background';

  const finalPrompt = [
    prompt.trim(),
    modeHint,
    'No text. No watermark. No signature.',
    'Single subject, centered, no background.',
    bg,
    aspect ? `aspect ratio ${aspect}` : '',
    'output a single PNG image',
  ].filter(Boolean).join('. ');

  const url = endpoint.includes('?')
    ? `${endpoint}&key=${encodeURIComponent(apiKey)}`
    : `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: finalPrompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      temperature: 0.2,
      maxOutputTokens: 1024,
      imageConfig: {
        ...(aspect ? { aspectRatio: aspect } : {}),
        imageSize: '1K',
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${text || 'Unknown error'}`);
  }

  const json = await response.json();
  
  // Extract inline image
  const candidates = Array.isArray(json?.candidates) ? json.candidates : [];
  for (const c of candidates) {
    const parts = Array.isArray(c?.content?.parts) ? c.content.parts : [];
    for (const p of parts) {
      const inline = p?.inlineData || p?.inline_data;
      if (inline?.data) {
        return {
          mime: inline.mimeType || 'image/png',
          base64: inline.data,
          promptUsed: finalPrompt,
        };
      }
    }
  }

  throw new Error('Gemini response contained no image data');
}

async function callGeminiText(payload: Record<string, unknown>): Promise<unknown> {
  const { apiKey } = resolveGeminiConfig();
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const { prompt, systemPrompt } = payload as {
    prompt?: string;
    systemPrompt?: string;
  };

  if (!prompt) {
    throw new Error('Missing prompt in payload');
  }

  const model = process.env.GOOGLE_AI_TEXT_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${text || 'Unknown error'}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  return { text };
}

async function executeAiCall(
  provider: string,
  actionType: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  if (provider === 'gemini') {
    if (actionType === 'image' || actionType === 'generate') {
      return callGeminiImage(payload);
    }
    if (actionType === 'text') {
      return callGeminiText(payload);
    }
  }

  // Default: pass through to Gemini image generation
  return callGeminiImage(payload);
}

export async function POST(req: NextRequest): Promise<NextResponse<AiRunResponse>> {
  try {
    // Get user ID
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

    // Parse request body
    const body = await req.json() as Partial<AiRunRequest>;
    
    const { toolSlug, actionType, provider, payload } = body;
    
    if (!toolSlug || !actionType || !provider || !payload) {
      return NextResponse.json({
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: toolSlug, actionType, provider, payload',
        },
      }, { status: 400 });
    }

    // Consume AI credit (this also validates entitlement)
    let creditResult;
    try {
      creditResult = await consumeAiCredit({
        userId,
        toolSlug,
        actionType,
        provider,
        metadata: { payloadKeys: Object.keys(payload) },
      });
    } catch (error) {
      if (isEntitlementError(error)) {
        const entitlementError = error as EntitlementError;
        return NextResponse.json({
          ok: false,
          error: {
            code: entitlementError.code,
            message: entitlementError.message,
          },
        }, { status: entitlementError.httpStatus });
      }
      throw error;
    }

    // Execute AI call
    const result = await executeAiCall(provider, actionType, payload);

    return NextResponse.json({
      ok: true,
      data: result,
      credits: {
        used: creditResult.entitlement.aiCreditsUsed,
        remaining: creditResult.creditsRemaining,
      },
    });
  } catch (error) {
    console.error('AI Gateway error:', error);
    const message = error instanceof Error ? error.message : 'AI call failed';
    
    return NextResponse.json({
      ok: false,
      error: {
        code: 'AI_ERROR',
        message,
      },
    }, { status: 500 });
  }
}
