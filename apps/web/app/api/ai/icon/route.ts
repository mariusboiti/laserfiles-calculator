/**
 * AI Icon Generation API
 * Step 1: Generate image only (returns base64 dataUrl)
 * Step 2: Client can call /api/trace/potrace to trace when ready
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiStatus } from '@/server/gemini';

export const runtime = 'nodejs';

// Trademark keywords
const TRADEMARK_KEYWORDS = [
  'nike', 'adidas', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'meta',
  'disney', 'marvel', 'pokemon', 'nintendo', 'bmw', 'mercedes', 'ferrari',
  'star wars', 'harry potter', 'batman', 'superman', 'spiderman', 'mickey mouse',
];

// Rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function detectTrademark(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return TRADEMARK_KEYWORDS.some(tm => lower.includes(tm));
}

// ============================================================================
// GET: Check configuration
// ============================================================================
export async function GET() {
  const status = getGeminiStatus();
  return NextResponse.json({
    configured: status.configured,
    model: status.model,
    ...(status.message ? { message: status.message } : {}),
  });
}

// ============================================================================
// POST: Generate icon IMAGE only (trace is done separately by client)
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Parse request
    const body = await req.json();
    const userPrompt = body?.prompt?.trim();
    if (!userPrompt || userPrompt.length > 200) {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }
    
    // Check trademark
    let warning: string | undefined;
    let prompt = userPrompt;
    if (detectTrademark(userPrompt)) {
      warning = 'Trademarked logos not allowed. Generic alternative generated.';
      prompt = `generic ${userPrompt} inspired simple icon`;
    }
    
    // Build image prompt (short, like Sign Generator)
    // Enforce: white background only, no border/frame/outline/shadow.
    const imagePrompt = `${prompt}, black silhouette icon, centered, no text, plain white background, no border, no outline, no frame, no stroke, no shadow, no gradient`;
    
    console.log('[AI Icon] Generating image for:', prompt);
    
    // ========================================================================
    // Generate image using /api/ai/gemini/image (same as Sign Generator)
    // ========================================================================
    const imageRes = await fetch('http://localhost:3000/api/ai/gemini/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: imagePrompt,
        mode: 'shapeSilhouette',
        transparent: false,
        aspect: '1:1',
      }),
    });
    
    const imageData = await imageRes.json();
    if (!imageRes.ok || !imageData?.ok || !imageData?.base64) {
      console.error('[AI Icon] Image generation failed:', imageData);
      throw new Error(imageData?.error?.message || 'Image generation failed');
    }
    
    const dataUrl = `data:${imageData.mime || 'image/png'};base64,${imageData.base64}`;
    console.log('[AI Icon] Image generated successfully');
    
    // Return the image dataUrl - client will trace when ready
    return NextResponse.json({ 
      ok: true,
      dataUrl, 
      ...(warning ? { warning } : {}) 
    });
    
  } catch (error) {
    console.error('[AI Icon] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
