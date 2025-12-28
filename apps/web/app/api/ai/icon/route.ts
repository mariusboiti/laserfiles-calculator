import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel, getGeminiStatus } from '@/server/gemini';

export const runtime = 'nodejs';

type IconStyle = 'minimal-outline' | 'bold-solid' | 'cute-rounded';
type IconComplexity = 'simple' | 'medium';

type IconGenerateRequest = {
  prompt: string;
  style?: IconStyle;
  complexity?: IconComplexity;
  seedSvg?: string; // For refine mode
};

type IconGenerateResponse = {
  svg: string;
  warning?: string;
};

type IconStatusResponse = {
  configured: boolean;
  model: string;
  message?: string;
};

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

// Trademark/brand keywords to detect
const TRADEMARK_KEYWORDS = [
  'nike', 'adidas', 'puma', 'apple', 'google', 'microsoft', 'amazon', 'facebook', 'meta',
  'twitter', 'instagram', 'tiktok', 'youtube', 'spotify', 'netflix', 'disney', 'marvel',
  'dc comics', 'pokemon', 'nintendo', 'playstation', 'xbox', 'coca-cola', 'pepsi',
  'mcdonalds', 'burger king', 'starbucks', 'bmw', 'mercedes', 'audi', 'ferrari', 'porsche',
  'lamborghini', 'tesla', 'ford', 'chevrolet', 'toyota', 'honda', 'gucci', 'louis vuitton',
  'chanel', 'prada', 'versace', 'rolex', 'supreme', 'off-white', 'balenciaga',
  'harley davidson', 'nfl', 'nba', 'mlb', 'fifa', 'olympics', 'world cup',
  'star wars', 'harry potter', 'lord of the rings', 'game of thrones', 'avengers',
  'batman', 'superman', 'spiderman', 'spider-man', 'ironman', 'iron man',
  'mickey mouse', 'minnie', 'donald duck', 'frozen', 'pixar', 'dreamworks',
  'hello kitty', 'sanrio', 'barbie', 'lego', 'hot wheels', 'nerf',
];

// Simple in-memory rate limiter (per IP, 10/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

function detectTrademarkRequest(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return TRADEMARK_KEYWORDS.some(tm => lower.includes(tm));
}

// LOCKED instruction block - Gemini MUST output only SVG
const LOCKED_INSTRUCTION = `Output ONLY a single SVG string. No markdown. No code fences. No extra text.

SVG must have viewBox="0 0 100 100".
Use only <path> elements (1 to 8 paths).
No <text>, <image>, <mask>, <clipPath>, <filter>, <foreignObject>, <style>, <script>.
No transforms on the root <svg>.
Use only black (#000) fill OR black stroke, but keep consistent.
Design must be laser-friendly: bold, simple, no tiny details, no thin lines.
If the user request implies a trademarked logo/brand, create a generic alternative icon instead.`;

// Style descriptions
const STYLE_MAP: Record<IconStyle, string> = {
  'minimal-outline': 'stroke icon, rounded caps, simple outline, no fills',
  'bold-solid': 'filled shapes, chunky silhouette, solid black fills',
  'cute-rounded': 'rounded shapes, friendly proportions, soft curves with fills',
};

// Complexity descriptions
const COMPLEXITY_MAP: Record<IconComplexity, string> = {
  'simple': '1-3 paths maximum, very minimal design',
  'medium': '3-8 paths, still clean and simple',
};

function buildPrompt(userPrompt: string, style: IconStyle, complexity: IconComplexity, seedSvg?: string): string {
  const styleDesc = STYLE_MAP[style];
  const complexityDesc = COMPLEXITY_MAP[complexity];
  
  if (seedSvg) {
    // Refine mode
    return `${LOCKED_INSTRUCTION}

Refine the following SVG to better match: "${userPrompt}".
Style: ${styleDesc}.
Complexity: ${complexityDesc}.
Keep all constraints. Output only the refined SVG.

SVG to refine:
${seedSvg}`;
  }
  
  // Generate mode
  return `${LOCKED_INSTRUCTION}

Create a laser-friendly SVG icon.
User request: "${userPrompt}".
Style: ${styleDesc}.
Complexity: ${complexityDesc}.

Remember: output ONLY the SVG, nothing else.`;
}

function extractSvgFromResponse(content: string): string {
  // Remove markdown code fences if present
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:svg|xml)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();
  
  // Try to find SVG in the response
  const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0];
  }
  
  throw new Error('AI response did not contain valid SVG. Try a simpler prompt.');
}

// Server-side SVG cleanup (runs on Node.js)
function cleanupSvgServer(svg: string): { svg: string; warning?: string } {
  let cleaned = svg;
  
  // Remove disallowed elements
  const disallowed = ['script', 'style', 'foreignObject', 'image', 'text', 'tspan', 
                      'mask', 'clipPath', 'filter', 'pattern', 'defs', 'use', 'symbol',
                      'linearGradient', 'radialGradient', 'animate', 'animateMotion', 
                      'animateTransform', 'set'];
  
  for (const tag of disallowed) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }
  
  // Remove event handlers
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Extract path d attributes
  const pathMatches = cleaned.matchAll(/<path[^>]*\sd\s*=\s*["']([^"']+)["'][^>]*>/gi);
  const paths: string[] = [];
  for (const match of pathMatches) {
    if (match[1]) paths.push(match[1]);
  }
  
  if (paths.length === 0) {
    throw new Error('No valid paths found in generated SVG. Try a different prompt.');
  }
  
  // Check node budget (total d string length)
  const totalLength = paths.reduce((sum, d) => sum + d.length, 0);
  let warning: string | undefined;
  
  if (totalLength > 12000) {
    warning = 'Icon is very detailed - may be too complex for laser cutting.';
  }
  
  // Rebuild clean SVG with normalized viewBox
  const pathElements = paths.map(d => 
    `<path d="${d}" fill="#000" stroke="none"/>`
  ).join('\n  ');
  
  const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  ${pathElements}
</svg>`;
  
  return { svg: cleanSvg, warning };
}

// GET: Check if AI icon generation is configured
export async function GET() {
  const status = getGeminiStatus();
  const res: IconStatusResponse = {
    configured: status.configured,
    model: status.model,
    ...(status.message ? { message: status.message } : {}),
  };
  return NextResponse.json(res);
}

// POST: Generate icon
export async function POST(req: NextRequest) {
  try {
    // Check configuration
    const status = getGeminiStatus();
    if (!status.configured) {
      return NextResponse.json({ error: status.message }, { status: 500 });
    }
    
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }
    
    // Parse request
    const body: IconGenerateRequest = await req.json();
    const userPrompt = body?.prompt?.trim();
    
    if (!userPrompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }
    
    if (userPrompt.length > 200) {
      return NextResponse.json({ error: 'Prompt too long (max 200 characters)' }, { status: 400 });
    }
    
    const style: IconStyle = body.style || 'minimal-outline';
    const complexity: IconComplexity = body.complexity || 'simple';
    const seedSvg = body.seedSvg?.trim();
    
    // Check for trademark requests
    const isTrademark = detectTrademarkRequest(userPrompt);
    let warning: string | undefined;
    
    if (isTrademark) {
      warning = 'Avoid trademarked logos unless you own rights. A generic alternative was generated.';
    }
    
    // Build prompt
    const fullPrompt = buildPrompt(userPrompt, style, complexity, seedSvg);
    
    // Call Gemini using official SDK
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
            (finishReason ? `finishReason=${finishReason}` : 'Try again with a simpler prompt.'),
        },
        { status: 500 }
      );
    }
    
    // Extract SVG from response
    const rawSvg = extractSvgFromResponse(text);
    
    // Cleanup and validate
    const cleaned = cleanupSvgServer(rawSvg);
    
    // Combine warnings
    if (cleaned.warning) {
      warning = warning ? `${warning} ${cleaned.warning}` : cleaned.warning;
    }
    
    const res: IconGenerateResponse = { 
      svg: cleaned.svg, 
      ...(warning ? { warning } : {}) 
    };
    return NextResponse.json(res);
    
  } catch (error) {
    console.error('AI icon generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI icon generation failed. Try again with a simpler prompt.' },
      { status: 500 }
    );
  }
}
