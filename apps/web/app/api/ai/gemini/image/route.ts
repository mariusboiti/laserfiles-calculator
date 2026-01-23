import { NextRequest, NextResponse } from 'next/server';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

export const runtime = 'nodejs';

type ImageMode = 'engravingSketch' | 'shapeSilhouette';

type ImageRequestBody = {
  prompt: string;
  mode: ImageMode;
  aspect?: '1:1' | '4:3' | '16:9';
  transparent?: boolean;
};

type OkResponse = {
  ok: true;
  mime: string;
  base64: string;
  promptUsed: string;
};

type ErrResponse = {
  ok: false;
  error: {
    message: string;
  };
};

function jsonOk(body: OkResponse, status: number = 200) {
  return NextResponse.json(body, { status });
}

function jsonErr(message: string, status: number = 200) {
  const body: ErrResponse = { ok: false, error: { message } };
  return NextResponse.json(body, { status });
}

function resolveGeminiImageConfig() {
  const apiKey = (process.env.GEMINI_API_KEY?.trim() || process.env.AI_API_KEY?.trim() || '').trim();

  const endpoint = (
    process.env.VITE_AI_STYLIZE_ENDPOINT?.trim() ||
    process.env.AI_STYLIZE_ENDPOINT?.trim() ||
    ''
  ).trim();

  const model = (
    process.env.VITE_GOOGLE_AI_IMAGE_MODEL?.trim() ||
    process.env.GOOGLE_AI_IMAGE_MODEL?.trim() ||
    ''
  ).trim();

  const defaultEndpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';
  const defaultModel = 'models/gemini-3-pro-image-preview';

  const resolvedEndpoint = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : defaultEndpoint);
  const resolvedModel = model || defaultModel;

  return { apiKey, endpoint: resolvedEndpoint, model: resolvedModel };
}

function buildFinalPrompt(args: { prompt: string; mode: ImageMode; transparent: boolean; aspect?: string }) {
  const { prompt, mode, transparent, aspect } = args;

  const modeHint =
    mode === 'engravingSketch'
      ? 'Monochrome pen/pencil sketch line art, suitable for laser engraving and vector tracing.'
      : 'Laser-cut-friendly silhouette with clean edges, suitable for vector tracing.';

  const bg = transparent
    ? 'transparent background (or pure white background if transparency is not supported)'
    : 'pure white background';

  const aspectHint = aspect ? `aspect ratio ${aspect}` : '';

  return [
    prompt.trim(),
    modeHint,
    'No text. No watermark. No signature.',
    'Single subject, centered, no background.',
    bg,
    aspectHint,
    'output a single PNG image',
  ]
    .filter((s) => s && s.trim())
    .join('. ');
}

function getFinishReason(json: any): string {
  const fr = json?.candidates?.[0]?.finishReason;
  return typeof fr === 'string' ? fr : '';
}

function isEmptyContent(json: any): boolean {
  const c0 = json?.candidates?.[0]?.content;
  const parts = Array.isArray(c0?.parts) ? c0.parts : [];
  return !c0 || (typeof c0 === 'object' && Object.keys(c0).length === 0) || parts.length === 0;
}

function stripDataUrlPrefix(b64: string) {
  const trimmed = (b64 || '').trim();
  const m = trimmed.match(/^data:.*?;base64,(.*)$/i);
  return m?.[1] ? m[1] : trimmed;
}

function extractInlineImage(json: any): { mime?: string; base64?: string; textSnippet?: string } {
  const candidates = Array.isArray(json?.candidates) ? json.candidates : [];

  for (const c of candidates) {
    const parts = Array.isArray(c?.content?.parts) ? c.content.parts : [];
    for (const p of parts) {
      const inline = p?.inlineData || p?.inline_data;
      const data = inline?.data;
      if (typeof data === 'string' && data.trim()) {
        const mime = typeof inline?.mimeType === 'string' ? inline.mimeType : undefined;
        return { mime, base64: data };
      }
    }
  }

  const parts = Array.isArray(json?.candidates?.[0]?.content?.parts) ? json.candidates[0].content.parts : [];
  const textParts = parts
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .filter((t: string) => t.trim());
  const textSnippet = textParts.join('\n').slice(0, 600);

  return { textSnippet: textSnippet || JSON.stringify(json)?.slice(0, 600) };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ImageRequestBody>;

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const mode = body.mode as ImageMode;
    const aspect = body.aspect;
    const transparent = body.transparent !== false;

    if (!prompt) {
      return jsonErr('Missing prompt', 400);
    }

    if (mode !== 'engravingSketch' && mode !== 'shapeSilhouette') {
      return jsonErr('Invalid mode', 400);
    }

    const bypassCredit = req.headers.get('X-Internal-Bypass-Credit') === 'true';
    let credits: { used: number; remaining: number } | undefined;

    if (!bypassCredit) {
      // Consume AI credit before processing
      try {
        credits = await consumeAiCreditViaBackend({
          req,
          toolSlug: 'internal-gemini-image',
          actionType: mode,
          provider: 'gemini',
          payload: body as any,
        });
      } catch (error) {
        if (isEntitlementError(error)) {
          const entitlementError = error as EntitlementError;
          return NextResponse.json({
            ok: false,
            error: {
              message: entitlementError.message,
              code: entitlementError.code
            }
          }, { status: entitlementError.httpStatus });
        }
        console.error('Credit consumption failed for internal-gemini-image:', error);
        return jsonErr('Failed to verify AI credits', 500);
      }
    }

    const { apiKey, endpoint } = resolveGeminiImageConfig();

    if (!apiKey) {
      return jsonErr('Missing GEMINI_API_KEY (or AI_API_KEY) in .env.local', 500);
    }

    const promptUsed = buildFinalPrompt({ prompt, mode, transparent, aspect });

    const url = endpoint.includes('?')
      ? `${endpoint}&key=${encodeURIComponent(apiKey)}`
      : `${endpoint}?key=${encodeURIComponent(apiKey)}`;

    const makeRequestBody = (p: string) => ({
      contents: [
        {
          role: 'user',
          parts: [{ text: p }],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        temperature: 0.2,
        maxOutputTokens: 1024,
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: 0,
        },
        imageConfig: {
          ...(aspect ? { aspectRatio: aspect } : {}),
          imageSize: '1K',
        },
      },
    });

    const doFetch = async (p: string) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(makeRequestBody(p)),
      });

    let res = await doFetch(promptUsed);

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return jsonErr(`Gemini image generateContent failed (${res.status}): ${t || 'Unknown error'}`, 502);
    }

    let json: any = await res.json();
    let extracted = extractInlineImage(json);

    if (!extracted.base64 && (getFinishReason(json) === 'MAX_TOKENS' || isEmptyContent(json))) {
      const shorterPrompt = [
        prompt.trim(),
        mode === 'engravingSketch'
          ? 'Generate a monochrome pen sketch line art PNG (black lines on transparent background).'
          : 'Generate a clean silhouette PNG (solid black on transparent background).',
        'No text. Single subject.',
      ]
        .filter(Boolean)
        .join(' ');
      res = await doFetch(shorterPrompt);
      if (res.ok) {
        json = await res.json();
        extracted = extractInlineImage(json);
      }
    }

    if (!extracted.base64) {
      const finishReason = getFinishReason(json);
      const fr = finishReason ? ` finishReason=${finishReason}.` : '';
      const extra = extracted.textSnippet ? ` Response text: ${extracted.textSnippet}` : '';
      return jsonErr(`Gemini response contained no inline image data.${fr}${extra}`, 502);
    }

    const mime = extracted.mime || 'image/png';
    const base64 = stripDataUrlPrefix(extracted.base64);

    if (!base64) {
      return jsonErr('Gemini returned empty image data', 502);
    }

    return jsonOk({ ok: true, mime, base64, promptUsed, credits } as any);
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : 'AI image generation failed', 500);
  }
}
