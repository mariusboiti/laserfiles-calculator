import { NextRequest, NextResponse } from 'next/server';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

export const runtime = 'nodejs';
export const maxDuration = 120;

/* ─── Env helpers ─────────────────────────────────────────────── */

function getProvider() {
  return (process.env.AI_PROVIDER || 'gemini').toLowerCase();
}

function geminiUrl() {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_AI_API_KEY || '';
  const endpoint = process.env.AI_STYLIZE_ENDPOINT || process.env.GEMINI_ENDPOINT || process.env.VITE_AI_STYLIZE_ENDPOINT || '';
  const model = process.env.GOOGLE_AI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || process.env.VITE_GOOGLE_AI_IMAGE_MODEL || '';
  const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
  if (!base || !apiKey) return null;
  return base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;
}

/* ─── Gemini call helpers ─────────────────────────────────────── */

async function geminiImageCall(imageB64: string, prompt: string): Promise<string | null> {
  const url = geminiUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageB64 } },
          { text: prompt },
        ]}],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p: any) => p?.inlineData?.data);
    return img?.inlineData?.data ?? null;
  } catch { return null; }
}

async function geminiTextCall(imageB64: string, prompt: string): Promise<string | null> {
  const url = geminiUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageB64 } },
          { text: prompt },
        ]}],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
    const txt = parts.find((p: any) => typeof p?.text === 'string');
    return txt?.text ?? null;
  } catch { return null; }
}

/* ─── Material profiles (server-side mirror) ──────────────────── */

const MATERIALS: Record<string, { label: string; thickness: number; kerf: number; costM2: number; burnSpread: number; contrastCurve: number }> = {
  plywood:             { label: 'Plywood 3mm',        thickness: 3,   kerf: 0.15, costM2: 12,  burnSpread: 1.2, contrastCurve: 1.1 },
  mdf:                 { label: 'MDF 3mm',            thickness: 3,   kerf: 0.18, costM2: 8,   burnSpread: 1.4, contrastCurve: 1.3 },
  'acrylic-clear':     { label: 'Acrylic Clear 3mm',  thickness: 3,   kerf: 0.10, costM2: 35,  burnSpread: 0.6, contrastCurve: 0.8 },
  'acrylic-black':     { label: 'Acrylic Black 3mm',  thickness: 3,   kerf: 0.10, costM2: 35,  burnSpread: 0.5, contrastCurve: 0.9 },
  leather:             { label: 'Leather 2mm',        thickness: 2,   kerf: 0.20, costM2: 60,  burnSpread: 1.6, contrastCurve: 1.4 },
  slate:               { label: 'Slate 5mm',          thickness: 5,   kerf: 0.05, costM2: 45,  burnSpread: 0.3, contrastCurve: 0.7 },
  'anodized-aluminum': { label: 'Anodized Aluminum',  thickness: 1.5, kerf: 0.08, costM2: 80,  burnSpread: 0.2, contrastCurve: 0.6 },
};

const PRODUCT_SIZES: Record<string, [number, number]> = {
  'engraved-frame': [200, 150], 'multilayer-wall-art': [300, 300], 'led-lightbox': [200, 200],
  keychain: [50, 30], ornament: [80, 80], stencil: [200, 150], coaster: [90, 90], puzzle: [200, 150],
};

const PRODUCT_META: Record<string, { label: string; icon: string; desc: string }> = {
  'engraved-frame':      { label: 'Engraved Frame',     icon: '🖼️', desc: 'Photo engraved on wood/acrylic with cut frame' },
  'multilayer-wall-art': { label: 'Multilayer Wall Art', icon: '🎨', desc: 'Layered depth art with multiple cut layers' },
  'led-lightbox':        { label: 'LED Lightbox',        icon: '💡', desc: 'Backlit acrylic panel with engraved photo' },
  keychain:              { label: 'Keychain',            icon: '🔑', desc: 'Small engraved keychain with photo silhouette' },
  ornament:              { label: 'Ornament',            icon: '🎄', desc: 'Decorative hanging ornament with engraved photo' },
  stencil:               { label: 'Stencil',             icon: '✂️', desc: 'Cut-out stencil from photo edges' },
  coaster:               { label: 'Coaster Set',         icon: '🍵', desc: 'Round coasters with engraved photo design' },
  puzzle:                { label: 'Puzzle',              icon: '🧩', desc: 'Photo puzzle with interlocking laser-cut pieces' },
};

const STYLE_PROMPTS: Record<string, string> = {
  'photo-realistic':   'Convert to high-detail grayscale laser engraving with smooth tonal gradients. Pure white background.',
  'line-art':          'Convert to clean black line art drawing with no fills, only outlines and hatching. White background.',
  woodcut:             'Convert to bold woodcut/linocut style with strong black and white contrast, carved look. White background.',
  'mandala-fusion':    'Merge the subject with intricate mandala patterns, symmetrical decorative elements. Grayscale. White background.',
  geometric:           'Convert to low-poly geometric triangulated style with flat shading zones. Grayscale. White background.',
  'vintage-engraving': 'Convert to classic crosshatch engraving style like old banknote illustrations with fine parallel lines. White background.',
  'stained-glass':     'Convert to stained glass style with bold black outlines separating distinct zones. Grayscale. White background.',
};

/* ─── SVG generation ──────────────────────────────────────────── */

function makeSvg(imageB64: string, wMm: number, hMm: number, kerf: number, padding: number) {
  const tw = wMm + padding * 2;
  const th = hMm + padding * 2;

  const engrave = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${tw} ${th}" data-width-mm="${tw}" data-height-mm="${th}">
  <title>Engrave Layer</title>
  <image x="${padding}" y="${padding}" width="${wMm}" height="${hMm}"
         href="data:image/jpeg;base64,${imageB64}" />
</svg>`;

  const cut = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${tw} ${th}" data-width-mm="${tw}" data-height-mm="${th}">
  <title>Cut Layer</title>
  <rect x="${kerf / 2}" y="${kerf / 2}" width="${tw - kerf}" height="${th - kerf}"
        fill="none" stroke="red" stroke-width="${kerf}" rx="2" ry="2" />
</svg>`;

  const combined = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${tw} ${th}" data-width-mm="${tw}" data-height-mm="${th}">
  <title>Combined - Engrave + Cut</title>
  <image x="${padding}" y="${padding}" width="${wMm}" height="${hMm}"
         href="data:image/jpeg;base64,${imageB64}" />
  <rect x="${kerf / 2}" y="${kerf / 2}" width="${tw - kerf}" height="${th - kerf}"
        fill="none" stroke="red" stroke-width="${kerf}" rx="2" ry="2" />
</svg>`;

  return { engraveSvg: engrave, cutSvg: cut, combinedSvg: combined };
}

/* ─── Production insights (material-aware) ────────────────────── */

function calcInsights(wMm: number, hMm: number, mat: typeof MATERIALS[string]) {
  const area = wMm * hMm;
  const perim = 2 * (wMm + hMm);
  const areaM2 = area / 1e6;
  const density = 0.7 * mat.contrastCurve;
  const engraveMin = (area * Math.min(density, 1)) / 5000;
  const cutMin = perim / 600;
  const totalMin = Math.ceil(engraveMin + cutMin + 1);
  const matCost = Math.max(0.5, areaM2 * mat.costM2);
  const machineCost = (totalMin / 60) * 30;
  const total = matCost + machineCost;
  const margin = 0.45;
  return {
    materialWidthMm: wMm, materialHeightMm: hMm, materialLabel: mat.label,
    engravingDensity: Math.round(density * 100),
    cutPathLengthMm: Math.round(perim),
    estimatedTimeMinutes: totalMin,
    materialCostEstimate: Math.round(total * 100) / 100,
    recommendedPrice: Math.ceil((total / (1 - margin)) * 100) / 100,
    profitMargin: Math.round(margin * 100),
    optimalKerf: mat.kerf,
    recommendedThickness: mat.thickness,
  };
}

/* ─── Risk analysis ───────────────────────────────────────────── */

function analyzeRisks(wMm: number, hMm: number, productType: string, mat: typeof MATERIALS[string]) {
  const warnings: any[] = [];
  const area = wMm * hMm;

  if (productType === 'keychain' && Math.min(wMm, hMm) < 20) {
    warnings.push({ type: 'detail-loss', severity: 'high', message: 'Very small product — fine details will be lost during engraving.' });
  }
  if (mat.burnSpread > 1.3) {
    warnings.push({ type: 'burn-hotspot', severity: 'medium', message: `${mat.label} has high burn spread (${mat.burnSpread}x). Reduce engraving density for best results.` });
  }
  if (area > 90000) {
    warnings.push({ type: 'density-overload', severity: 'low', message: 'Large engraving area — consider reducing density to save time and prevent warping.' });
  }
  if (productType === 'stencil') {
    warnings.push({ type: 'fragile-part', severity: 'medium', message: 'Stencils may have fragile bridges. Verify all islands are connected before cutting.' });
  }
  if (mat.kerf > 0.15 && productType === 'puzzle') {
    warnings.push({ type: 'kerf-collision', severity: 'medium', message: `High kerf (${mat.kerf}mm) on ${mat.label} may cause loose puzzle pieces. Consider thinner kerf material.` });
  }
  if (warnings.length === 0) {
    warnings.push({ type: 'detail-loss', severity: 'low', message: 'No significant risks detected. Design looks production-ready.' });
  }
  return warnings;
}

/* ─── Multilayer generation ───────────────────────────────────── */

function generateMultilayers(imageB64: string, wMm: number, hMm: number, kerf: number, layerCount: number) {
  const layers = [];
  for (let i = 0; i < layerCount; i++) {
    const depthPct = Math.round(((i + 1) / layerCount) * 100);
    const opacity = ((i + 1) / layerCount).toFixed(2);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${wMm} ${hMm}" data-width-mm="${wMm}" data-height-mm="${hMm}">
  <title>Layer ${i + 1} (${depthPct}% depth)</title>
  <defs>
    <filter id="thresh${i}">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncR type="discrete" tableValues="${i === 0 ? '0 0 0 1' : i === 1 ? '0 0 1 1' : '0 1 1 1'}"/>
        <feFuncG type="discrete" tableValues="${i === 0 ? '0 0 0 1' : i === 1 ? '0 0 1 1' : '0 1 1 1'}"/>
        <feFuncB type="discrete" tableValues="${i === 0 ? '0 0 0 1' : i === 1 ? '0 0 1 1' : '0 1 1 1'}"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <image width="${wMm}" height="${hMm}" href="data:image/jpeg;base64,${imageB64}"
         filter="url(#thresh${i})" opacity="${opacity}" />
  <rect x="${kerf / 2}" y="${kerf / 2}" width="${wMm - kerf}" height="${hMm - kerf}"
        fill="none" stroke="red" stroke-width="${kerf}" rx="1" ry="1" />
</svg>`;
    layers.push({ index: i, label: `Layer ${i + 1}`, svg, depthPercent: depthPct });
  }
  return { layers, stackPreviewPng: imageB64 };
}

/* ─── Product variants ────────────────────────────────────────── */

function generateVariants(imageB64: string, excludeType: string, kerf: number) {
  const variantTypes = Object.keys(PRODUCT_SIZES).filter(t => t !== excludeType).slice(0, 6);
  return variantTypes.map(pt => {
    const [w, h] = PRODUCT_SIZES[pt] || [100, 100];
    const meta = PRODUCT_META[pt] || { label: pt, icon: '📦', desc: '' };
    const { engraveSvg, cutSvg } = makeSvg(imageB64, w, h, kerf, 3);
    return {
      productType: pt,
      label: meta.label,
      icon: meta.icon,
      sizeMm: [w, h] as [number, number],
      engraveSvg,
      cutSvg,
      previewPng: imageB64,
    };
  });
}

/* ─── Main handler ────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, productType, options } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    const pt = productType || 'engraved-frame';
    const materialId = options?.material || 'plywood';
    const styleId = options?.style || 'photo-realistic';
    const mat = MATERIALS[materialId] || MATERIALS.plywood;
    const kerf = options?.kerfMm ?? mat.kerf;
    const padding = (options?.includeFrame ?? true) ? (options?.framePaddingMm ?? 5) : 0;
    const doEnhance = options?.enhancePhoto ?? true;
    const doMultilayer = options?.generateMultilayer ?? false;
    const doVariants = options?.generateVariants ?? true;

    // ── Credit consumption ──
    let credits: { used: number; remaining: number } | undefined;
    try {
      credits = await consumeAiCreditViaBackend({
        req, toolSlug: 'photo-product-ai', actionType: 'generate',
        provider: getProvider(), payload: { productType: pt, material: materialId, style: styleId },
      });
    } catch (error) {
      if (isEntitlementError(error)) {
        const e = error as EntitlementError;
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
      }
      console.error('Credit consumption failed:', error);
      return NextResponse.json({ error: 'Failed to verify AI credits' }, { status: 500 });
    }

    // ── Step 1: Style transformation via AI ──
    const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS['photo-realistic'];
    const productHints: Record<string, string> = {
      'engraved-frame': 'Format as a rectangular portrait suitable for a picture frame.',
      'multilayer-wall-art': 'Create with clear tonal separation for multilayer cutting.',
      'led-lightbox': 'Optimize for edge-lit acrylic. High contrast, minimal mid-tones.',
      keychain: 'Simplify to a bold silhouette suitable for a small 50x30mm keychain.',
      ornament: 'Create a circular composition suitable for a hanging ornament.',
      stencil: 'Convert to high-contrast stencil with connected islands. No floating pieces.',
      coaster: 'Create a circular composition suitable for a 90mm round coaster.',
      puzzle: 'Maintain good detail for a puzzle. Clear subject with defined edges.',
    };
    const fullPrompt = `${stylePrompt} ${productHints[pt] || ''} No color, no text, no watermarks. Clean edges, production-ready for laser engraving on ${mat.label}.`;

    let engraveB64 = imageBase64;
    const aiResult = await geminiImageCall(imageBase64, fullPrompt);
    if (aiResult) engraveB64 = aiResult;

    // ── Step 2: Product suggestions via AI text ──
    const suggestText = await geminiTextCall(imageBase64,
      `Analyze this image for laser cutting products. Return ONLY a JSON array: [{\"type\":\"engraved-frame\",\"confidence\":0.95}]. Types: engraved-frame, multilayer-wall-art, led-lightbox, keychain, ornament, stencil, coaster, puzzle. Return 4 suggestions ordered by confidence.`
    );
    let productSuggestions: any[] = [
      { type: 'engraved-frame', confidence: 0.95 }, { type: 'keychain', confidence: 0.80 },
      { type: 'ornament', confidence: 0.65 }, { type: 'coaster', confidence: 0.50 },
    ];
    if (suggestText) {
      try {
        const m = suggestText.match(/\[[\s\S]*?\]/);
        if (m) productSuggestions = JSON.parse(m[0]);
      } catch {}
    }
    productSuggestions = productSuggestions.map((s: any) => {
      const meta = PRODUCT_META[s.type] || { label: s.type, icon: '📦', desc: '' };
      return { type: s.type, label: meta.label, description: meta.desc, confidence: s.confidence, icon: meta.icon };
    });

    // ── Step 3: Generate SVGs ──
    const [wMm, hMm] = PRODUCT_SIZES[pt] || [200, 150];
    const { engraveSvg, cutSvg, combinedSvg } = makeSvg(engraveB64, wMm, hMm, kerf, padding);

    // ── Step 4: Production insights ──
    const productionInsights = calcInsights(wMm + padding * 2, hMm + padding * 2, mat);

    // ── Step 5: Size recommendation ──
    const sizeRecommendation = {
      widthMm: wMm, heightMm: hMm, optimalKerf: mat.kerf, materialThickness: mat.thickness,
      reason: `Optimal size for ${PRODUCT_META[pt]?.label || pt} on ${mat.label}. Kerf ${mat.kerf}mm ensures clean cuts.`,
    };

    // ── Step 6: Risk analysis ──
    const riskWarnings = analyzeRisks(wMm, hMm, pt, mat);

    // ── Step 7: Multilayer (optional) ──
    let multilayer = null;
    if (doMultilayer) {
      const layerCount = pt === 'multilayer-wall-art' ? 4 : 3;
      multilayer = generateMultilayers(engraveB64, wMm, hMm, kerf, layerCount);
    }

    // ── Step 8: Product variants ──
    let variants: any[] = [];
    if (doVariants) {
      variants = generateVariants(engraveB64, pt, kerf);
    }

    // ── Step 9: Mockups ──
    const mockups = [
      { scene: 'living-room',    label: 'Living Room Wall',  png: engraveB64 },
      { scene: 'workshop',       label: 'Workshop Table',    png: engraveB64 },
      { scene: 'gift-packaging', label: 'Gift Packaging',    png: engraveB64 },
      { scene: 'etsy-listing',   label: 'Etsy Listing',      png: engraveB64 },
    ];

    // ── Step 10: Description ──
    const totalW = wMm + padding * 2;
    const totalH = hMm + padding * 2;
    const description = `Custom laser ${styleId.replace(/-/g, ' ')} ${pt.replace(/-/g, ' ')} on ${mat.label}. Size: ${totalW}x${totalH}mm. Optimized kerf: ${kerf}mm. Production-ready SVG with engrave and cut layers.`;

    return NextResponse.json({
      engraveSvg, cutSvg, combinedSvg,
      engravePreviewPng: engraveB64,
      laserSimulationPng: engraveB64,
      mockups,
      productSuggestions,
      productionInsights,
      sizeRecommendation,
      riskWarnings,
      multilayer,
      variants,
      description,
      credits,
    });
  } catch (error) {
    console.error('Photo product generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
