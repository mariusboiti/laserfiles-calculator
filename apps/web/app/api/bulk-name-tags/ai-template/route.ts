import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

let cachedWorkingTextModel: string | null = null;
let cachedWorkingTextModelAt = 0;

interface AITemplateRequest {
  prompt: string;
}

function validateSvgTemplate(svg: string): { ok: boolean; reason?: string } {
  const s = (svg || '').trim();
  if (!s) return { ok: false, reason: 'empty' };

  const openTag = s.match(/<svg\b[^>]*>/i)?.[0] || '';
  if (!openTag) return { ok: false, reason: 'missing <svg> open tag' };

  const viewBox = openTag.match(/\bviewBox\s*=\s*("([^"]+)"|'([^']+)')/i);
  const viewBoxValue = (viewBox?.[2] || viewBox?.[3] || '').trim();
  if (viewBoxValue) {
    const nums = viewBoxValue.split(/\s+/).map((v) => Number(v));
    if (nums.length === 4) {
      const w = nums[2];
      const h = nums[3];
      if (!(w > 0 && h > 0)) {
        return { ok: false, reason: 'viewBox width/height not > 0' };
      }
    }
  } else {
    return { ok: false, reason: 'missing viewBox' };
  }

  const hasWidth = /\bwidth\s*=\s*("[0-9.]+(mm|in)?"|'[0-9.]+(mm|in)?')/i.test(openTag);
  const hasHeight = /\bheight\s*=\s*("[0-9.]+(mm|in)?"|'[0-9.]+(mm|in)?')/i.test(openTag);
  if (!hasWidth || !hasHeight) {
    return { ok: false, reason: 'missing width/height' };
  }

  const hasShape = /<(path|rect|circle|ellipse|polygon|polyline|line)\b/i.test(s);
  if (!hasShape) {
    return { ok: false, reason: 'no shape elements' };
  }

  return { ok: true };
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

  // Prefer Flash/Pro if available, otherwise first supported model
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

interface AITemplateResponse {
  responseText: string;
  svg?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: AITemplateRequest = await req.json();
    const prompt = body?.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

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

    const responseText = await generateSvgWithGemini({ apiKey, endpoint, model, prompt });
    const normalizedText = unwrapJsonSvgIfPresent(responseText);
    const extracted = extractAndSanitizeSvg(normalizedText);
    const svg = extracted ? ensureVisibleLaserDefaults(extracted) : null;

    const res: AITemplateResponse = { responseText, svg };
    return NextResponse.json(res);
  } catch (error) {
    console.error('AI template error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI template generation failed' },
      { status: 500 }
    );
  }
}

async function generateSvgWithGemini(args: {
  apiKey: string;
  endpoint: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const { apiKey, endpoint, model, prompt } = args;

  const normalizedModel = normalizeGeminiTextModel(model);

  const preferModelUrl = normalizedModel
    ? `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent`
    : '';

  const endpointLooksLikeImagePreview = /image-preview/i.test(endpoint);
  const base = endpoint && !endpointLooksLikeImagePreview ? endpoint : preferModelUrl;

  if (!base) {
    throw new Error(
      'Gemini is not configured for SVG text generation. Set GOOGLE_AI_TEXT_MODEL (e.g. gemini-1.5-flash) or AI_STYLIZE_ENDPOINT (text model generateContent).'
    );
  }

  const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;

  const systemInstructions = [
    'Return ONLY raw SVG. No markdown. No backticks. No JSON. No explanation.',
    'The SVG MUST be a single standalone file with <svg ...> as the root and must end with </svg>.',
    'The <svg> MUST include: xmlns="http://www.w3.org/2000/svg" width="Wmm" height="Hmm" viewBox="0 0 W H".',
    'Design must be suitable for laser cutting: one closed outline (stroke), no fill.',
    'Use only vector elements: <path>, <rect>, <circle>, <ellipse>, <polygon>, <polyline>, <line>, <g>.',
    'Forbidden: <script>, <foreignObject>, <image>, external refs.',
    'Defaults: stroke="black" stroke-width="0.8" fill="none".',
    'If the user did not explicitly mention a hole/keyring, add a 5mm circular hole near the top-left, margin 4mm from edges.',
    'Do NOT wrap the SVG in JSON. Do NOT return keys like {"svg": "..."}.'
  ].join('\n');

  const body = {
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemInstructions }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
      responseMimeType: 'application/xml',
    },
  };

  let json: any;
  try {
    json = await fetchGeminiJson(url, body);
  } catch (e) {
    // Some models reject responseMimeType entirely; retry once without it.
    if (e instanceof Error && /response_mime_type/i.test(e.message)) {
      const noMimeBody = {
        ...body,
        generationConfig: {
          ...body.generationConfig,
        },
      } as any;
      delete noMimeBody.generationConfig.responseMimeType;
      json = await fetchGeminiJson(url, noMimeBody);
    } else {
    // If the model isn't available for this API key/project, auto-discover a working one.
    if (
      e instanceof Error &&
      /not\s*found|models\//i.test(e.message)
    ) {
      const workingModel = await getWorkingGeminiTextModel(apiKey);
      const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${workingModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      json = await fetchGeminiJson(retryUrl, body);
    } else {
      throw e;
    }
    }
  }

  let text = extractGeminiText(json);

  if (!extractSvgRaw(text)) {
    const retryBody = {
      ...body,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text:
                'Rewrite the output as a single valid SVG file. Output ONLY the SVG, starting with <svg ...> and ending with </svg>. No markdown, no explanations.',
            },
            { text: `User request: ${prompt}` },
          ],
        },
      ],
    };

    const workingModel = await getWorkingGeminiTextModel(apiKey);
    const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${workingModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const retryJson = await fetchGeminiJson(retryUrl, retryBody);
    text = extractGeminiText(retryJson) || text;
  }

  if (!text) {
    const shape = safeJsonShape(json);
    throw new Error(`Gemini returned no text content. Response shape: ${shape}`);
  }

  return text;
}

function normalizeGeminiTextModel(modelOrPath: string): string {
  const m = (modelOrPath || '').trim();
  if (!m) return 'gemini-1.5-flash';

  // If env mistakenly provides models/... just strip the prefix
  const stripped = m.replace(/^models\//i, '');

  // Avoid image-preview models for SVG text generation
  if (/image-preview/i.test(stripped)) {
    return 'gemini-1.5-flash';
  }

  return stripped;
}

function extractGeminiText(json: any): string {
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
  const partText = parts
    .map((p) => {
      if (typeof p?.text === 'string') return p.text;
      if (typeof p === 'string') return p;
      return '';
    })
    .filter(Boolean)
    .join('\n');

  if (partText) return partText;

  const maybeContent = json?.candidates?.[0]?.content;
  if (typeof maybeContent === 'string') return maybeContent;

  const maybeText = json?.text;
  if (typeof maybeText === 'string') return maybeText;

  return '';
}

function safeJsonShape(json: any): string {
  try {
    if (!json || typeof json !== 'object') return String(json);
    const topKeys = Object.keys(json).slice(0, 15);
    const cand = json?.candidates?.[0];
    const candKeys = cand && typeof cand === 'object' ? Object.keys(cand).slice(0, 15) : [];
    const parts = cand?.content?.parts;
    const partKeys = Array.isArray(parts) ? Object.keys(parts?.[0] || {}).slice(0, 15) : [];
    return JSON.stringify({ topKeys, candidate0Keys: candKeys, part0Keys: partKeys });
  } catch {
    return 'unavailable';
  }
}

function extractSvgRaw(text: string): string | null {
  const cleaned = unescapeLikelyJsonString(stripCodeFences(text))
    .replace(/^<\?xml[\s\S]*?\?>/i, '')
    .trim();

  const start = cleaned.toLowerCase().indexOf('<svg');
  if (start < 0) return null;

  const fromStart = cleaned.slice(start);
  const endIdx = fromStart.toLowerCase().indexOf('</svg>');
  if (endIdx >= 0) {
    return fromStart.slice(0, endIdx + '</svg>'.length).trim();
  }

  if (fromStart.includes('>')) {
    return `${fromStart.trim()}\n</svg>`;
  }

  return null;
}

function stripCodeFences(text: string): string {
  return (text || '').replace(/^```[a-zA-Z]*\s*/i, '').replace(/```\s*$/i, '').trim();
}

function unwrapJsonSvgIfPresent(text: string): string {
  const cleaned = stripCodeFences(text);

  // Fast path: if it's already an SVG-ish response
  if (/<svg\b/i.test(cleaned)) {
    // But it may still be a JSON string that contains <svg with escaped quotes (\")
    if (/\{[\s\S]*"svg"\s*:/i.test(cleaned)) {
      const extracted = tryParseJsonSvg(cleaned);
      return extracted || cleaned;
    }
    return cleaned;
  }

  // If it doesn't contain <svg>, it still might be JSON with an svg field
  const extracted = tryParseJsonSvg(cleaned);
  return extracted || cleaned;
}

function tryParseJsonSvg(text: string): string | null {
  // 1) Try parse whole string
  const direct = safeJsonParse(text);
  const directSvg = pickSvgField(direct);
  if (directSvg) return directSvg;

  // 2) Try parse a JSON substring
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const slice = text.slice(start, end + 1);
    const sliced = safeJsonParse(slice);
    const slicedSvg = pickSvgField(sliced);
    if (slicedSvg) return slicedSvg;
  }

  return null;
}

function safeJsonParse(input: string): any {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function pickSvgField(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const svg = (obj as any).svg;
  if (typeof svg === 'string' && svg.includes('<svg')) return unescapeLikelyJsonString(svg);
  return null;
}

function unescapeLikelyJsonString(value: string): string {
  // When the model returns JSON text, the SVG may still contain literal escape sequences like \".
  // If so, normalize them back to real characters so our SVG parsing/validation works.
  if (!value) return value;

  if (value.includes('\\"') || value.includes('\\n') || value.includes('\\t') || value.includes('\\/')) {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\"/g, '"')
      .replace(/\\\'/g, "'")
      .replace(/\\\//g, '/');
  }

  return value;
}

function extractAndSanitizeSvg(text: string): string | null {
  const raw = extractSvgRaw(text);
  if (!raw) return null;

  let svg = raw.trim();

  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
  svg = svg.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  svg = svg.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');

  return svg;
}

function ensureVisibleLaserDefaults(svg: string): string {
  const openTagMatch = svg.match(/<svg\b[^>]*>/i);
  if (!openTagMatch) return svg;

  const openTag = openTagMatch[0];
  const hasStroke = /\bstroke\s*=\s*("[^"]*"|'[^']*')/i.test(openTag) || /stroke\s*:\s*[^;\s]+/i.test(openTag);
  const hasFill = /\bfill\s*=\s*("[^"]*"|'[^']*')/i.test(openTag) || /fill\s*:\s*[^;\s]+/i.test(openTag);
  const hasStrokeWidth = /\bstroke-width\s*=\s*("[^"]*"|'[^']*')/i.test(openTag) || /stroke-width\s*:\s*[^;\s]+/i.test(openTag);

  if (hasStroke && hasFill && hasStrokeWidth) return svg;

  const insert = [
    !hasStroke ? ' stroke="black"' : '',
    !hasFill ? ' fill="none"' : '',
    !hasStrokeWidth ? ' stroke-width="0.8"' : '',
    ' vector-effect="non-scaling-stroke"',
  ].join('');

  const updatedOpenTag = openTag.replace(/>$/, `${insert}>`);
  return svg.replace(openTag, updatedOpenTag);
}
