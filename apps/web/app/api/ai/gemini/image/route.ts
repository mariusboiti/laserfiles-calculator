import { NextRequest, NextResponse } from 'next/server';

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

  const modeHints =
    mode === 'engravingSketch'
      ? [
          'pen/pencil sketch, cross-hatching, monochrome, high contrast line art, clean strokes, suitable for vector tracing',
          'no text, no watermark, no signature',
          'single subject, centered, no background',
        ]
      : [
          'simple silhouette, bold outline or solid shape, minimal interior detail, suitable for laser cutting and vector tracing',
          'no text, no watermark, no signature',
          'single subject, centered, no background',
        ];

  const bg = transparent
    ? 'transparent background (or pure white background if transparency is not supported)'
    : 'pure white background';

  const aspectHint = aspect ? `aspect ratio ${aspect}` : '';

  return [
    prompt.trim(),
    ...modeHints,
    bg,
    aspectHint,
    'output a single PNG image',
  ]
    .filter((s) => s && s.trim())
    .join('. ');
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
      const data = p?.inlineData?.data;
      if (typeof data === 'string' && data.trim()) {
        const mime = typeof p?.inlineData?.mimeType === 'string' ? p.inlineData.mimeType : undefined;
        return { mime, base64: data };
      }
    }
  }

  const parts = Array.isArray(json?.candidates?.[0]?.content?.parts) ? json.candidates[0].content.parts : [];
  const textParts = parts
    .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
    .filter((t: string) => t.trim());
  const textSnippet = textParts.join('\n').slice(0, 600);

  return { textSnippet };
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

    const { apiKey, endpoint } = resolveGeminiImageConfig();

    if (!apiKey) {
      return jsonErr('Missing GEMINI_API_KEY (or AI_API_KEY) in .env.local', 500);
    }

    const promptUsed = buildFinalPrompt({ prompt, mode, transparent, aspect });

    const url = endpoint.includes('?')
      ? `${endpoint}&key=${encodeURIComponent(apiKey)}`
      : `${endpoint}?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptUsed }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return jsonErr(`Gemini image generateContent failed (${res.status}): ${t || 'Unknown error'}`, 502);
    }

    const json: any = await res.json();
    const extracted = extractInlineImage(json);
    if (!extracted.base64) {
      const extra = extracted.textSnippet ? ` Response text: ${extracted.textSnippet}` : '';
      return jsonErr(`Gemini response contained no inline image data.${extra}`, 502);
    }

    const mime = extracted.mime || 'image/png';
    const base64 = stripDataUrlPrefix(extracted.base64);

    if (!base64) {
      return jsonErr('Gemini returned empty image data', 502);
    }

    return jsonOk({ ok: true, mime, base64, promptUsed });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : 'AI image generation failed', 500);
  }
}
