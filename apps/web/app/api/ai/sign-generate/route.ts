/**
 * Personalised Sign Generator V3 PRO - AI Generation API Route
 * Generates SVG sketches and silhouettes using Gemini
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel, isGeminiConfigured, getGeminiStatus } from '../../../../server/gemini';
import { 
  buildEngravingSketchPrompt, 
  buildShapeSilhouettePrompt,
  validatePrompt 
} from '../../../../lib/tools/personalised-sign-generator/core/ai/promptTemplates';

export const runtime = 'nodejs';

type GenerateRequest = {
  mode: 'engravingSketch' | 'shapeSilhouette';
  prompt: string;
  targetWmm?: number;
  targetHmm?: number;
  detailLevel?: 'low' | 'medium' | 'high';
  complexity?: 'simple' | 'medium' | 'detailed';
};

type GenerateResponse = {
  svg?: string;
  pngDataUrl?: string;
  warning?: string;
};

type StatusResponse = {
  configured: boolean;
  model: string;
  message?: string;
};

/**
 * GET - Check if AI is configured
 */
export async function GET() {
  const status = getGeminiStatus();
  const response: StatusResponse = {
    configured: status.configured,
    model: status.model,
    message: status.message,
  };
  return NextResponse.json(response);
}

function getGeminiImageConfig(): { apiKey: string; endpoint: string; model: string } {
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_AI_API_KEY ||
    '';
  const endpoint = process.env.AI_STYLIZE_ENDPOINT || process.env.VITE_AI_STYLIZE_ENDPOINT || '';
  const model = process.env.GOOGLE_AI_IMAGE_MODEL || process.env.VITE_GOOGLE_AI_IMAGE_MODEL || '';
  return { apiKey, endpoint, model };
}

async function generatePngWithGemini(args: {
  apiKey: string;
  endpoint: string;
  model: string;
  prompt: string;
}): Promise<string> {
  const { apiKey, endpoint, model, prompt } = args;
  const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
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
        temperature: 0.6,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Gemini image generateContent failed (${res.status}): ${t}`);
  }

  const json: any = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((p) => p?.inlineData?.data);
  const b64 = inline?.inlineData?.data as string | undefined;
  if (!b64) {
    return '';
  }
  return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
}

function buildSketchImagePrompt(subject: string, detailLevel: 'low' | 'medium' | 'high'): string {
  const detail =
    detailLevel === 'high'
      ? 'high detail, realistic fur/texture lines, dense cross-hatching'
      : detailLevel === 'medium'
        ? 'medium detail, clean contour lines, some cross-hatching'
        : 'low detail, simple clean outline, minimal hatching';

  return [
    `Subject: ${subject}.`,
    'Create a beautiful hand-drawn pencil/pen sketch for laser engraving.',
    'Style: realistic, elegant, vintage engraving / etching look.',
    `Detail: ${detail}.`,
    'Monochrome black lines only. No color.',
    'No text, no watermark, no signatures.',
    'No background elements. Transparent background.',
    'Center the subject, occupies ~80% of the canvas.',
  ].join(' ');
}

function extractGeminiText(response: unknown): string {
  try {
    const anyResp = response as any;
    const direct = typeof anyResp?.text === 'function' ? anyResp.text() : '';
    if (typeof direct === 'string' && direct.trim()) return direct;

    const parts: any[] = anyResp?.candidates?.[0]?.content?.parts ?? [];
    const textParts = parts
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .filter((t) => typeof t === 'string' && t.trim());

    if (textParts.length > 0) return textParts.join('\n');

    return '';
  } catch {
    return '';
  }
}

/**
 * POST - Generate SVG from prompt
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request
    const body: GenerateRequest = await req.json();
    const { mode, prompt, detailLevel = 'medium', complexity = 'simple' } = body;

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Mode-specific execution
    let fullPrompt: string;
    if (mode === 'engravingSketch') {
      fullPrompt = buildEngravingSketchPrompt(prompt, detailLevel);
    } else if (mode === 'shapeSilhouette') {
      fullPrompt = buildShapeSilhouettePrompt(prompt, complexity);
    } else {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (mode === 'engravingSketch') {
      const { apiKey, endpoint, model } = getGeminiImageConfig();
      if (!apiKey) {
        return NextResponse.json({ error: 'AI not configured. Set AI_API_KEY/GEMINI_API_KEY.' }, { status: 500 });
      }
      if (!endpoint && !model) {
        return NextResponse.json(
          { error: 'AI image model not configured. Set VITE_AI_STYLIZE_ENDPOINT or VITE_GOOGLE_AI_IMAGE_MODEL.' },
          { status: 500 }
        );
      }

      const img = await generatePngWithGemini({ apiKey, endpoint, model, prompt: buildSketchImagePrompt(prompt, detailLevel) });
      if (!img) {
        return NextResponse.json({ error: 'AI returned no image data' }, { status: 500 });
      }

      const responseData: GenerateResponse = { pngDataUrl: img };
      return NextResponse.json(responseData);
    }

    // For SVG modes, ensure text Gemini is configured
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        { error: 'AI not configured. Set GEMINI_API_KEY (or AI_API_KEY) in environment.' },
        { status: 500 }
      );
    }

    // Call Gemini
    const model = getGeminiModel();
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = extractGeminiText(response);

    if (!text) {
      const finishReason = (response as any)?.candidates?.[0]?.finishReason;
      return NextResponse.json(
        {
          error:
            'AI returned empty/non-text response. ' +
            (finishReason ? `finishReason=${finishReason}` : 'Try a different prompt or model.'),
        },
        { status: 500 }
      );
    }

    // Extract SVG from response
    const svg = extractSvgFromText(text);
    
    if (!svg) {
      console.warn('[AI Sign Generate] Failed to extract SVG from response:', text.substring(0, 500));
      return NextResponse.json(
        {
          error: 'AI response did not contain valid SVG',
          ...(process.env.NODE_ENV === 'development'
            ? { debugSnippet: text.substring(0, 500) }
            : {}),
        },
        { status: 500 }
      );
    }

    // Basic validation
    const warning = validateGeneratedSvg(svg, mode);

    const responseData: GenerateResponse = { svg, warning };
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[AI Sign Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    );
  }
}

/**
 * Extract SVG from AI text response
 */
function extractSvgFromText(text: string): string | null {
  // Remove markdown code fences
  let cleaned = text
    .replace(/```svg\s*/gi, '')
    .replace(/```xml\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Some models may return XML declarations or leading text; strip BOM and common headers
  cleaned = cleaned.replace(/^\uFEFF/, '').trim();
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '').trim();

  // Find SVG tag
  const svgMatch = cleaned.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0];
  }

  // Check if response starts with SVG
  if (cleaned.startsWith('<svg') && cleaned.includes('</svg>')) {
    const endIndex = cleaned.indexOf('</svg>') + 6;
    return cleaned.substring(0, endIndex);
  }

  // Tolerate fragments: extract only the SVG-relevant tags (<path>/<g>) and wrap them
  if (!/<svg\b/i.test(cleaned)) {
    const pathTags = cleaned.match(/<path\b[\s\S]*?<\/path\s*>|<path\b[^>]*\/>/gi) ?? [];
    const gTags = cleaned.match(/<g\b[\s\S]*?<\/g\s*>/gi) ?? [];

    // Prefer groups if present (they may contain paths); otherwise use collected paths
    const fragment = (gTags.length > 0 ? gTags.join('') : pathTags.join('')).trim();
    if (fragment) {
      return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${fragment}</svg>`;
    }
  }

  return null;
}

/**
 * Basic validation of generated SVG
 */
function validateGeneratedSvg(svg: string, mode: string): string | undefined {
  const warnings: string[] = [];

  // Check for viewBox
  if (!svg.includes('viewBox')) {
    warnings.push('SVG missing viewBox');
  }

  // Check for paths
  const pathCount = (svg.match(/<path/gi) || []).length;
  if (pathCount === 0) {
    warnings.push('SVG contains no paths');
  }

  // Check path complexity
  const pathCommands = (svg.match(/[MLHVCSQTAZmlhvcsqtaz]/g) || []).length;
  if (pathCommands > 200) {
    warnings.push(`SVG is complex (${pathCommands} commands)`);
  }

  // Mode-specific checks
  if (mode === 'engravingSketch') {
    // Should have strokes
    if (!svg.includes('stroke=') && !svg.includes('stroke:')) {
      warnings.push('Sketch mode should have strokes');
    }
  } else if (mode === 'shapeSilhouette') {
    // Should have fills
    if (!svg.includes('fill=') && !svg.includes('fill:')) {
      warnings.push('Silhouette mode should have fills');
    }
  }

  return warnings.length > 0 ? warnings.join('; ') : undefined;
}
