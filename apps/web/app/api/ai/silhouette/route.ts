import { NextRequest, NextResponse } from 'next/server';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

export const runtime = 'nodejs';

type SilhouetteStatusResponse = {
  configured: boolean;
  provider: string;
  message?: string;
};

type SilhouetteGenerateRequest = {
  prompt: string;
};

type SilhouetteGenerateResponse = {
  dataUrl: string;
  provider: string;
};

function getProvider(): string {
  return (process.env.AI_PROVIDER || 'gemini').toLowerCase();
}

function getGeminiConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_AI_API_KEY || '';
  const endpoint = process.env.AI_STYLIZE_ENDPOINT || process.env.GEMINI_ENDPOINT || process.env.VITE_AI_STYLIZE_ENDPOINT || '';
  const model = process.env.GOOGLE_AI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || process.env.VITE_GOOGLE_AI_IMAGE_MODEL || '';
  return { apiKey, endpoint, model };
}

function isGeminiConfigured(): { ok: boolean; message?: string } {
  const { apiKey, endpoint, model } = getGeminiConfig();
  if (!apiKey) return { ok: false, message: 'AI image generation not configured. Set env: AI_API_KEY (or GEMINI_API_KEY).' };
  if (!endpoint && !model) {
    return { ok: false, message: 'AI image generation not configured. Set env: GOOGLE_AI_IMAGE_MODEL (or GEMINI_IMAGE_MODEL) or GEMINI_ENDPOINT.' };
  }
  return { ok: true };
}

function isOpenAIConfigured(): { ok: boolean; message?: string } {
  const apiKey = process.env.OPENAI_API_KEY || '';
  if (!apiKey) return { ok: false, message: 'AI image generation not configured. Set env: OPENAI_API_KEY.' };
  return { ok: true };
}

function buildSilhouettePrompt(userPrompt: string): string {
  const hardRules = [
    'Create a simple vector-like silhouette for laser cutting.',
    'Solid white background (opaque), single black silhouette, no shadow, no gradients, no text, no transparency.',
    'Orientation: perfectly horizontal (no rotation, no tilt).',
    'Centered, occupies ~75% of canvas width.',
    'Single subject, smooth edges, solid black fill.',
    'No watermark, no background elements or patterns.',
  ].join(' ');
  return `${userPrompt}. ${hardRules}`;
}

async function generateWithOpenAI(args: { apiKey: string; model: string; prompt: string; size: string }): Promise<{ imageBase64?: string; imageUrl?: string }> {
  const { apiKey, model, prompt, size } = args;

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

async function generateWithGemini(args: { apiKey: string; endpoint: string; model: string; prompt: string }): Promise<{ imageBase64?: string; imageUrl?: string }> {
  const { apiKey, endpoint, model, prompt } = args;

  const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
  if (!base) {
    throw new Error('Gemini endpoint/model not configured (missing GEMINI_ENDPOINT or GOOGLE_AI_IMAGE_MODEL)');
  }

  const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
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

  const inline = parts.find((p) => p?.inlineData?.data);
  if (inline?.inlineData?.data) {
    return { imageBase64: inline.inlineData.data as string };
  }

  const textPart = parts.find((p) => typeof p?.text === 'string')?.text as string | undefined;
  const urlMatch = textPart?.match(/https?:\/\/[^\s]+/i);
  if (urlMatch?.[0]) {
    return { imageUrl: urlMatch[0] };
  }

  throw new Error('Gemini response did not include image inlineData');
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch image URL (${res.status}): ${text}`);
  }
  const contentType = res.headers.get('content-type') || 'image/png';
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString('base64')}`;
}

export async function GET() {
  const provider = getProvider();

  if (provider === 'openai') {
    const ok = isOpenAIConfigured();
    const res: SilhouetteStatusResponse = { configured: ok.ok, provider, ...(ok.message ? { message: ok.message } : {}) };
    return NextResponse.json(res);
  }

  if (provider === 'gemini' || provider === 'google') {
    const ok = isGeminiConfigured();
    const res: SilhouetteStatusResponse = { configured: ok.ok, provider, ...(ok.message ? { message: ok.message } : {}) };
    return NextResponse.json(res);
  }

  const res: SilhouetteStatusResponse = {
    configured: false,
    provider,
    message: 'AI image generation not configured. Set AI_PROVIDER to gemini/google or openai and provide credentials.',
  };
  return NextResponse.json(res);
}

export async function POST(req: NextRequest) {
  try {
    const provider = getProvider();
    const body: SilhouetteGenerateRequest = await req.json();
    const userPrompt = body?.prompt?.trim();

    if (!userPrompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const fullPrompt = buildSilhouettePrompt(userPrompt);

    // Consume AI credit before processing
    let credits: { used: number; remaining: number } | undefined;
    try {
      credits = await consumeAiCreditViaBackend({
        req,
        toolSlug: 'bulk-name-tags', // This endpoint is primarily used by bulk-name-tags
        actionType: 'silhouette',
        provider: provider as any,
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
      console.error('Credit consumption failed for silhouette:', error);
      return NextResponse.json({ error: 'Failed to verify AI credits' }, { status: 500 });
    }

    if (provider === 'openai') {
      const ok = isOpenAIConfigured();
      if (!ok.ok) return NextResponse.json({ error: ok.message }, { status: 500 });

      const apiKey = process.env.OPENAI_API_KEY || '';
      const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
      const size = process.env.AI_IMAGE_SIZE || '1024x1024';

      const image = await generateWithOpenAI({ apiKey, model, prompt: fullPrompt, size });
      const dataUrl = image.imageBase64
        ? `data:image/png;base64,${image.imageBase64}`
        : image.imageUrl
          ? await urlToDataUrl(image.imageUrl)
          : '';

      if (!dataUrl) {
        return NextResponse.json({ error: 'Image generation returned no image data' }, { status: 500 });
      }

      const res: SilhouetteGenerateResponse & { credits?: { used: number; remaining: number } } = { 
        dataUrl, 
        provider,
        credits 
      };
      return NextResponse.json(res);
    }

    if (provider === 'gemini' || provider === 'google') {
      const ok = isGeminiConfigured();
      if (!ok.ok) return NextResponse.json({ error: ok.message }, { status: 500 });

      const { apiKey, endpoint, model } = getGeminiConfig();
      const image = await generateWithGemini({ apiKey, endpoint, model, prompt: fullPrompt });
      const dataUrl = image.imageBase64
        ? `data:image/png;base64,${image.imageBase64}`
        : image.imageUrl
          ? await urlToDataUrl(image.imageUrl)
          : '';

      if (!dataUrl) {
        return NextResponse.json({ error: 'Image generation returned no image data' }, { status: 500 });
      }

      const res: SilhouetteGenerateResponse & { credits?: { used: number; remaining: number } } = { 
        dataUrl, 
        provider,
        credits 
      };
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { error: 'AI image generation not configured. Set AI_PROVIDER to gemini/google or openai and provide credentials.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('AI silhouette error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI image generation failed' },
      { status: 500 }
    );
  }
}
