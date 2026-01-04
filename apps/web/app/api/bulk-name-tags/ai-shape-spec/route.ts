import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

let cachedWorkingTextModel: string | null = null;
let cachedWorkingTextModelAt = 0;

interface AIShapeSpecRequest {
  prompt: string;
  simpler?: boolean;
}

interface AIShapeSpecResponse {
  responseText: string;
}

async function fetchGeminiJson(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini generateContent failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function getWorkingGeminiTextModel(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedWorkingTextModel && now - cachedWorkingTextModelAt < 1000 * 60 * 30) {
    return cachedWorkingTextModel;
  }

  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(listUrl);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini ListModels failed (${res.status}): ${text}`);
  }

  const json: any = await res.json();
  const models: any[] = json?.models || [];

  const supported = models
    .filter((m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => (typeof m?.name === 'string' ? m.name : ''))
    .filter(Boolean)
    .map((name) => name.replace(/^models\//i, ''));

  const preferred =
    supported.find((n) => /gemini/i.test(n) && /flash/i.test(n)) ||
    supported.find((n) => /gemini/i.test(n) && /pro/i.test(n)) ||
    supported.find((n) => /gemini/i.test(n)) ||
    supported[0];

  if (!preferred) {
    throw new Error('Gemini ListModels returned no models that support generateContent');
  }

  cachedWorkingTextModel = preferred;
  cachedWorkingTextModelAt = now;
  return preferred;
}

function normalizeGeminiTextModel(model: string): string {
  const m = (model || '').trim();
  if (!m) return '';
  const cleaned = m.replace(/^models\//i, '');
  if (/image-preview/i.test(cleaned)) return '';
  return cleaned;
}

function extractGeminiText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  const text = parts
    .map((p: any) => {
      if (typeof p?.text === 'string') return p.text;
      return '';
    })
    .filter(Boolean)
    .join('');
  return (text || '').trim();
}

function safeJsonShape(v: any) {
  try {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  } catch {
    return 'unknown';
  }
}

function buildUserPrompt(userText: string, simpler: boolean): string {
  const fullShapes = 'rounded-rect|circle|heart|bone|shield|hex';
  const simpleShapes = 'rounded-rect|circle|heart|bone';
  const shapes = simpler ? simpleShapes : fullShapes;

  return [
    'Return ONLY JSON matching this schema:',
    '{',
    `  "shape": "${shapes}",`,
    '  "size": {"w": number, "h": number},',
    '  "hole": {"d": number, "pos": "top-left|top-center|top-right|left|right", "margin": number} | null,',
    '  "style": {"roundness": number}',
    '}',
    '',
    `User wants: "${userText}"`,
    '',
    'Rules:',
    '- Pick the closest shape from the allowed list.',
    '- Keep size within 20..200mm.',
    '- Always include a hole (d=5mm) unless user explicitly asks no hole.',
    '- If user asks no hole, set "hole": null.',
    '- roundness in 0..1.',
    '- Output JSON only.',
  ].join('\n');
}

async function generateShapeSpecJson(args: { apiKey: string; endpoint: string; model: string; prompt: string; simpler: boolean }) {
  const { apiKey, endpoint, model, prompt, simpler } = args;

  const normalizedModel = normalizeGeminiTextModel(model);

  const preferModelUrl = normalizedModel
    ? `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent`
    : '';

  const endpointLooksLikeImagePreview = /image-preview/i.test(endpoint);
  const base = endpoint && !endpointLooksLikeImagePreview ? endpoint : preferModelUrl;

  if (!base) {
    throw new Error(
      'Gemini is not configured for text generation. Set GOOGLE_AI_TEXT_MODEL (e.g. gemini-1.5-flash) or AI_STYLIZE_ENDPOINT (text model generateContent).'
    );
  }

  const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

  const systemInstruction = [
    'Return ONLY valid JSON. No markdown. No backticks. No extra keys.',
    'Do not include explanations. Do not wrap JSON in any outer object.',
  ].join('\n');

  const body = {
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: buildUserPrompt(prompt, simpler) }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  };

  let json: any;
  try {
    json = await fetchGeminiJson(url, body);
  } catch (e) {
    if (e instanceof Error && /not\s*found|models\//i.test(e.message)) {
      const workingModel = await getWorkingGeminiTextModel(apiKey);
      const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${workingModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      json = await fetchGeminiJson(retryUrl, body);
    } else {
      throw e;
    }
  }

  const text = extractGeminiText(json);
  if (!text) {
    throw new Error(`Gemini returned no text content. Response shape: ${safeJsonShape(json)}`);
  }

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const body: AIShapeSpecRequest = await req.json();
    const prompt = body?.prompt?.trim();
    const simpler = !!body?.simpler;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_AI_API_KEY || '';

    const endpoint =
      process.env.AI_STYLIZE_ENDPOINT || process.env.GEMINI_ENDPOINT || process.env.VITE_AI_STYLIZE_ENDPOINT || '';

    const model =
      process.env.AI_TEXT_MODEL ||
      process.env.GOOGLE_AI_TEXT_MODEL ||
      process.env.GOOGLE_AI_MODEL ||
      process.env.GEMINI_MODEL ||
      process.env.GOOGLE_AI_IMAGE_MODEL ||
      process.env.GEMINI_IMAGE_MODEL ||
      process.env.VITE_GOOGLE_AI_IMAGE_MODEL ||
      '';

    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured (missing AI_API_KEY / GEMINI_API_KEY)' }, { status: 500 });
    }

    const responseText = await generateShapeSpecJson({ apiKey, endpoint, model, prompt, simpler });
    const res: AIShapeSpecResponse = { responseText };
    return NextResponse.json(res);
  } catch (error) {
    console.error('AI shape spec error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI shape spec generation failed' },
      { status: 500 }
    );
  }
}
