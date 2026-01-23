import { NextRequest, NextResponse } from 'next/server';
import type { AIGenerateRequest, AIGenerateResponse } from '@/lib/multilayer/types';
import { AI_PRESET_PROMPTS } from '@/lib/multilayer/types';
import { buildAIPrompt, MODES } from '@/lib/multilayer/modes';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

export const runtime = 'nodejs';

/**
 * AI Image Generation Endpoint for MultiLayer Maker V3
 * 
 * Generates multilayer-friendly images based on user subject + hidden preset prompts.
 * User only sees preset name, not the actual prompt engineering.
 * 
 * TODO: Wire to actual AI provider (OpenAI DALL-E, Replicate, etc.)
 * For now returns mock response.
 */
export async function POST(req: NextRequest) {
  try {
    const body: AIGenerateRequest = await req.json();
    const { subject, preset, detail, background, mode } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Missing subject' }, { status: 400 });
    }

    // Consume AI credit before processing
    let credits: { used: number; remaining: number } | undefined;
    try {
      credits = await consumeAiCreditViaBackend({
        req,
        toolSlug: 'multilayer-maker',
        actionType: 'ai-generate',
        provider: 'gemini',
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
      console.error('Credit consumption failed for multilayer ai-generate:', error);
      return NextResponse.json({ error: 'Failed to verify AI credits' }, { status: 500 });
    }

    const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
    const seed = Math.floor(Math.random() * 1000000);

    // Build full prompt (hidden from user)
    const fullPrompt = buildPrompt({ subject, preset, detail, background, mode });
    
    // Hash the prompt for tracking (don't expose actual prompt)
    const promptHash = await hashString(fullPrompt);

    if (provider === 'gemini' || provider === 'google') {
      const apiKey =
        process.env.AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.VITE_AI_API_KEY ||
        '';

      const endpoint =
        process.env.AI_STYLIZE_ENDPOINT ||
        process.env.GEMINI_ENDPOINT ||
        process.env.VITE_AI_STYLIZE_ENDPOINT ||
        '';

      const model =
        process.env.GOOGLE_AI_IMAGE_MODEL ||
        process.env.GEMINI_IMAGE_MODEL ||
        process.env.VITE_GOOGLE_AI_IMAGE_MODEL ||
        '';

      if (!apiKey) {
        return NextResponse.json(
          { error: 'AI is not configured (missing AI_API_KEY / GEMINI_API_KEY)' },
          { status: 500 }
        );
      }

      const image = await generateWithGemini({ apiKey, endpoint, model, prompt: fullPrompt });

      const response: AIGenerateResponse & { credits?: { used: number; remaining: number } } = {
        imageBase64: image.imageBase64,
        imageUrl: image.imageUrl,
        seed,
        promptUsedHash: promptHash,
        credits,
      };
      return NextResponse.json(response);
    }

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'AI is not configured (missing OPENAI_API_KEY)' },
          { status: 500 }
        );
      }

      const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
      const size = process.env.AI_IMAGE_SIZE || '1024x1024';

      const image = await generateWithOpenAI({ apiKey, model, prompt: fullPrompt, size });

      const response: AIGenerateResponse & { credits?: { used: number; remaining: number } } = {
        imageBase64: image.imageBase64,
        imageUrl: image.imageUrl,
        seed,
        promptUsedHash: promptHash,
        credits,
      };

      return NextResponse.json(response);
    }

    // Mock fallback
    await new Promise((resolve) => setTimeout(resolve, 600));
    const mockResponse: AIGenerateResponse & { credits?: { used: number; remaining: number } } = {
      imageBase64: generateMockImage(subject, preset),
      seed,
      promptUsedHash: promptHash,
      credits,
    };
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}

function buildPrompt(args: {
  subject: string;
  preset: AIGenerateRequest['preset'];
  detail: string;
  background: string;
  mode?: AIGenerateRequest['mode'];
}) {
  const { subject, preset, detail, background, mode } = args;
  const detailModifier = {
    low: 'very simple, minimal detail',
    medium: 'moderate detail',
    high: 'detailed but clean',
  }[detail] || 'moderate detail';

  const bgModifier = background === 'transparent'
    ? 'transparent background, isolated subject'
    : 'simple solid color background';

  if (mode && mode in MODES) {
    const { prompt, negative } = buildAIPrompt(mode as any, subject);
    // We keep negative out of the prompt (provider-dependent). Still ensure detail/bg modifiers are applied.
    return `${prompt} ${detailModifier}, ${bgModifier}. Negative: ${negative}`;
  }

  const presetConfig = AI_PRESET_PROMPTS[preset];
  return buildFullPrompt(subject, presetConfig, detail, background);
}

async function generateWithOpenAI(args: {
  apiKey: string;
  model: string;
  prompt: string;
  size: string;
}): Promise<{ imageBase64?: string; imageUrl?: string }> {
  const { apiKey, model, prompt, size } = args;

  // OpenAI Images API (provider-agnostic via fetch)
  // NOTE: depending on model, response may be b64_json or url.
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n: 1,
      // prefer base64 for immediate client usage
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI image generation failed (${res.status}): ${text}`);
  }

  const json: any = await res.json();
  const item = json?.data?.[0];

  if (item?.b64_json) {
    return { imageBase64: item.b64_json as string };
  }

  if (item?.url) {
    return { imageUrl: item.url as string };
  }

  throw new Error('OpenAI response did not include image data');
}

async function generateWithGemini(args: {
  apiKey: string;
  endpoint: string;
  model: string;
  prompt: string;
}): Promise<{ imageBase64?: string; imageUrl?: string }> {
  const { apiKey, endpoint, model, prompt } = args;

  // We prefer user-supplied endpoint; otherwise build from model.
  const base = endpoint || (model
    ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`
    : '');

  if (!base) {
    throw new Error('Gemini endpoint/model not configured (missing AI_STYLIZE_ENDPOINT or GOOGLE_AI_IMAGE_MODEL)');
  }

  // Google API key is typically passed via ?key=...
  const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      // For image-preview models, inlineData image bytes may be returned.
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini generateContent failed (${res.status}): ${text}`);
  }

  const json: any = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];

  // Look for inline image bytes
  const inline = parts.find((p) => p?.inlineData?.data);
  if (inline?.inlineData?.data) {
    // inlineData.data is base64
    return { imageBase64: inline.inlineData.data as string };
  }

  // Some providers may return text with a URL (rare). Try to extract.
  const textPart = parts.find((p) => typeof p?.text === 'string')?.text as string | undefined;
  const urlMatch = textPart?.match(/https?:\/\/[^\s]+/i);
  if (urlMatch?.[0]) {
    return { imageUrl: urlMatch[0] };
  }

  throw new Error('Gemini response did not include image inlineData');
}

function buildFullPrompt(
  subject: string,
  presetConfig: typeof AI_PRESET_PROMPTS[keyof typeof AI_PRESET_PROMPTS],
  detail: string,
  background: string
): string {
  const detailModifier = {
    low: 'very simple, minimal detail',
    medium: 'moderate detail',
    high: 'detailed but clean',
  }[detail];

  const bgModifier = background === 'transparent' 
    ? 'transparent background, isolated subject'
    : 'simple solid color background';

  return `${subject}, ${presetConfig.basePrompt}, ${detailModifier}, ${bgModifier}, ${presetConfig.style}`;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

function generateMockImage(subject: string, preset: string): string {
  // Return empty string to signal client should use placeholder
  // In production, this would return actual AI-generated image
  return '';
}

/**
 * Future: Actual AI provider integration
 * 
 * interface AiProvider {
 *   generate(prompt: string, negativePrompt: string, options: any): Promise<string>;
 * }
 * 
 * class OpenAIProvider implements AiProvider {
 *   async generate(prompt, negativePrompt, options) {
 *     // Call OpenAI DALL-E API
 *   }
 * }
 * 
 * class ReplicateProvider implements AiProvider {
 *   async generate(prompt, negativePrompt, options) {
 *     // Call Replicate API (e.g., SDXL)
 *   }
 * }
 */
