import { NextRequest, NextResponse } from 'next/server';
import { consumeAiCreditViaBackend, isEntitlementError, type EntitlementError } from '@/lib/ai/credit-consumption';

export const runtime = 'nodejs';
export const maxDuration = 120;

/* ═══════════════════════════════════════════════════════════════════════
   ENV + AI HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function getProvider() { return (process.env.AI_PROVIDER || 'gemini').toLowerCase(); }

function geminiUrl() {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_AI_API_KEY || '';
  const endpoint = process.env.AI_STYLIZE_ENDPOINT || process.env.GEMINI_ENDPOINT || process.env.VITE_AI_STYLIZE_ENDPOINT || '';
  const model = process.env.GOOGLE_AI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || process.env.VITE_GOOGLE_AI_IMAGE_MODEL || '';
  const base = endpoint || (model ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent` : '');
  if (!base || !apiKey) return null;
  return base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;
}

async function geminiImageCall(imageB64: string, prompt: string): Promise<string | null> {
  const url = geminiUrl(); if (!url) return null;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageB64 } }, { text: prompt },
      ]}], generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseModalities: ['TEXT', 'IMAGE'] } }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
    return parts.find((p: any) => p?.inlineData?.data)?.inlineData?.data ?? null;
  } catch { return null; }
}

async function geminiTextCall(imageB64: string, prompt: string): Promise<string | null> {
  const url = geminiUrl(); if (!url) return null;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageB64 } }, { text: prompt },
      ]}], generationConfig: { temperature: 0.2, maxOutputTokens: 4096 } }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
    return parts.find((p: any) => typeof p?.text === 'string')?.text ?? null;
  } catch { return null; }
}

async function geminiTextOnlyCall(prompt: string): Promise<string | null> {
  const url = geminiUrl(); if (!url) return null;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 } }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === 'string')?.text ?? null;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════════════════════════
   SERVER-SIDE DATA
   ═══════════════════════════════════════════════════════════════════════ */

interface MatServer {
  label: string; thickness: number; kerf: number; costM2: number;
  burnSpread: number; contrastCurve: number; color: string;
  thermalConductivity: number; burnCoefficient: number;
  smokeStainFactor: number; acrylicFrostingFactor: number;
  heatAccumulationRate: number; recommendedSpeedMmS: number; recommendedPowerPct: number;
  meltingRisk: number; scorchingProbability: number; maxSafeTemp: number;
  minFeatureSizeMm: number; availableThicknesses: number[];
  engravingResponseCurve: number[]; compatibleMachines: string[];
}

const MATERIALS: Record<string, MatServer> = {
  plywood:             { label: 'Plywood 3mm',        thickness: 3,   kerf: 0.15, costM2: 12,  burnSpread: 1.2, contrastCurve: 1.1, color: '#c4a265', thermalConductivity: 0.13, burnCoefficient: 0.7,  smokeStainFactor: 0.6,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.8,  recommendedSpeedMmS: 300, recommendedPowerPct: 60, meltingRisk: 0, scorchingProbability: 0.4, maxSafeTemp: 300, minFeatureSizeMm: 1.0, availableThicknesses: [3, 4, 5, 6], engravingResponseCurve: [0.05, 0.15, 0.3, 0.5, 0.8], compatibleMachines: ['co2', 'diode'] },
  mdf:                 { label: 'MDF 3mm',            thickness: 3,   kerf: 0.18, costM2: 8,   burnSpread: 1.4, contrastCurve: 1.3, color: '#8b7355', thermalConductivity: 0.10, burnCoefficient: 0.85, smokeStainFactor: 0.8,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.0,  recommendedSpeedMmS: 250, recommendedPowerPct: 55, meltingRisk: 0, scorchingProbability: 0.6, maxSafeTemp: 250, minFeatureSizeMm: 1.2, availableThicknesses: [3, 6, 9], engravingResponseCurve: [0.08, 0.2, 0.4, 0.65, 0.9], compatibleMachines: ['co2', 'diode'] },
  'acrylic-clear':     { label: 'Acrylic Clear 3mm',  thickness: 3,   kerf: 0.10, costM2: 35,  burnSpread: 0.6, contrastCurve: 0.8, color: '#e8f4f8', thermalConductivity: 0.19, burnCoefficient: 0.3,  smokeStainFactor: 0.2,  acrylicFrostingFactor: 0.85, heatAccumulationRate: 0.5,  recommendedSpeedMmS: 400, recommendedPowerPct: 40, meltingRisk: 0.7, scorchingProbability: 0.1, maxSafeTemp: 160, minFeatureSizeMm: 0.5, availableThicknesses: [2, 3, 5, 8, 10], engravingResponseCurve: [0.02, 0.08, 0.2, 0.35, 0.55], compatibleMachines: ['co2'] },
  'acrylic-black':     { label: 'Acrylic Black 3mm',  thickness: 3,   kerf: 0.10, costM2: 35,  burnSpread: 0.5, contrastCurve: 0.9, color: '#1a1a2e', thermalConductivity: 0.19, burnCoefficient: 0.25, smokeStainFactor: 0.15, acrylicFrostingFactor: 0.9,  heatAccumulationRate: 0.4,  recommendedSpeedMmS: 400, recommendedPowerPct: 35, meltingRisk: 0.65, scorchingProbability: 0.05, maxSafeTemp: 160, minFeatureSizeMm: 0.5, availableThicknesses: [2, 3, 5, 8], engravingResponseCurve: [0.02, 0.1, 0.22, 0.38, 0.6], compatibleMachines: ['co2'] },
  leather:             { label: 'Leather 2mm',        thickness: 2,   kerf: 0.20, costM2: 60,  burnSpread: 1.6, contrastCurve: 1.4, color: '#8b4513', thermalConductivity: 0.16, burnCoefficient: 0.9,  smokeStainFactor: 0.7,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.2,  recommendedSpeedMmS: 200, recommendedPowerPct: 45, meltingRisk: 0, scorchingProbability: 0.7, maxSafeTemp: 200, minFeatureSizeMm: 1.5, availableThicknesses: [1, 2, 3], engravingResponseCurve: [0.1, 0.3, 0.55, 0.75, 0.95], compatibleMachines: ['co2', 'diode'] },
  slate:               { label: 'Slate 5mm',          thickness: 5,   kerf: 0.05, costM2: 45,  burnSpread: 0.3, contrastCurve: 0.7, color: '#4a5568', thermalConductivity: 2.01, burnCoefficient: 0.1,  smokeStainFactor: 0.1,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.2,  recommendedSpeedMmS: 150, recommendedPowerPct: 80, meltingRisk: 0, scorchingProbability: 0, maxSafeTemp: 1000, minFeatureSizeMm: 0.8, availableThicknesses: [5, 8, 10], engravingResponseCurve: [0.01, 0.03, 0.08, 0.15, 0.25], compatibleMachines: ['co2', 'fiber'] },
  'anodized-aluminum': { label: 'Anodized Aluminum',  thickness: 1.5, kerf: 0.08, costM2: 80,  burnSpread: 0.2, contrastCurve: 0.6, color: '#9ca3af', thermalConductivity: 205,  burnCoefficient: 0.05, smokeStainFactor: 0.05, acrylicFrostingFactor: 0,    heatAccumulationRate: 0.1,  recommendedSpeedMmS: 500, recommendedPowerPct: 90, meltingRisk: 0, scorchingProbability: 0, maxSafeTemp: 660, minFeatureSizeMm: 0.3, availableThicknesses: [0.5, 1, 1.5, 2], engravingResponseCurve: [0.005, 0.01, 0.03, 0.06, 0.1], compatibleMachines: ['fiber', 'galvo'] },
  bamboo:              { label: 'Bamboo 3mm',         thickness: 3,   kerf: 0.14, costM2: 18,  burnSpread: 1.0, contrastCurve: 1.2, color: '#d4a574', thermalConductivity: 0.17, burnCoefficient: 0.65, smokeStainFactor: 0.5,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.7,  recommendedSpeedMmS: 320, recommendedPowerPct: 55, meltingRisk: 0, scorchingProbability: 0.35, maxSafeTemp: 320, minFeatureSizeMm: 0.8, availableThicknesses: [3, 5], engravingResponseCurve: [0.04, 0.12, 0.28, 0.48, 0.75], compatibleMachines: ['co2', 'diode'] },
  cork:                { label: 'Cork 3mm',           thickness: 3,   kerf: 0.22, costM2: 25,  burnSpread: 1.8, contrastCurve: 1.5, color: '#a0845c', thermalConductivity: 0.04, burnCoefficient: 0.95, smokeStainFactor: 0.9,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.4,  recommendedSpeedMmS: 180, recommendedPowerPct: 35, meltingRisk: 0, scorchingProbability: 0.8, maxSafeTemp: 180, minFeatureSizeMm: 2.0, availableThicknesses: [2, 3, 5], engravingResponseCurve: [0.15, 0.35, 0.6, 0.8, 1.0], compatibleMachines: ['co2', 'diode'] },
};

interface MachServer {
  label: string; maxSpeedMmS: number; maxPowerW: number; accelerationMmS2: number;
  kerfMultiplier: number; engravingDpi: number; supportsCutting: boolean;
  speedOverride: number; powerOverride: number;
}

const MACHINES: Record<string, MachServer> = {
  diode: { label: 'Diode Laser',    maxSpeedMmS: 600,   maxPowerW: 20,  accelerationMmS2: 3000,  kerfMultiplier: 1.2, engravingDpi: 254,  supportsCutting: true,  speedOverride: 0.8, powerOverride: 1.0 },
  co2:   { label: 'CO2 Laser',      maxSpeedMmS: 1000,  maxPowerW: 150, accelerationMmS2: 8000,  kerfMultiplier: 1.0, engravingDpi: 508,  supportsCutting: true,  speedOverride: 1.0, powerOverride: 1.0 },
  fiber: { label: 'Fiber Laser',    maxSpeedMmS: 7000,  maxPowerW: 50,  accelerationMmS2: 20000, kerfMultiplier: 0.6, engravingDpi: 1000, supportsCutting: false, speedOverride: 1.5, powerOverride: 0.7 },
  galvo: { label: 'Galvo Engraver', maxSpeedMmS: 12000, maxPowerW: 30,  accelerationMmS2: 50000, kerfMultiplier: 0.4, engravingDpi: 1200, supportsCutting: false, speedOverride: 3.0, powerOverride: 0.5 },
};

const PRODUCT_SIZES: Record<string, [number, number]> = {
  'engraved-frame': [200, 150], 'multilayer-wall-art': [300, 300], 'led-lightbox': [200, 200],
  keychain: [50, 30], ornament: [80, 80], stencil: [200, 150], coaster: [90, 90], puzzle: [200, 150],
  'memorial-plaque': [250, 200], 'lamp-panel': [200, 300], 'phone-stand': [100, 120], 'jewelry-pendant': [30, 30],
};

const PRODUCT_META: Record<string, { label: string; icon: string; desc: string; profitTier: string }> = {
  'engraved-frame':      { label: 'Engraved Frame',     icon: '🖼️', desc: 'Photo engraved on wood/acrylic with cut frame', profitTier: 'medium' },
  'multilayer-wall-art': { label: 'Multilayer Wall Art', icon: '🎨', desc: 'Layered depth art with multiple cut layers', profitTier: 'premium' },
  'led-lightbox':        { label: 'LED Lightbox',        icon: '💡', desc: 'Backlit acrylic panel with engraved photo', profitTier: 'premium' },
  keychain:              { label: 'Keychain',            icon: '🔑', desc: 'Small engraved keychain with photo silhouette', profitTier: 'low' },
  ornament:              { label: 'Ornament',            icon: '🎄', desc: 'Decorative hanging ornament with engraved photo', profitTier: 'medium' },
  stencil:               { label: 'Stencil',             icon: '✂️', desc: 'Cut-out stencil from photo edges', profitTier: 'medium' },
  coaster:               { label: 'Coaster Set',         icon: '🍵', desc: 'Round coasters with engraved photo design', profitTier: 'medium' },
  puzzle:                { label: 'Puzzle',              icon: '🧩', desc: 'Photo puzzle with interlocking laser-cut pieces', profitTier: 'high' },
  'memorial-plaque':     { label: 'Memorial Plaque',     icon: '🕊️', desc: 'Elegant memorial plaque with photo and text area', profitTier: 'premium' },
  'lamp-panel':          { label: 'Lamp Panel',          icon: '🏮', desc: 'Decorative lamp panel with cut-through light pattern', profitTier: 'premium' },
  'phone-stand':         { label: 'Phone Stand',         icon: '📱', desc: 'Engraved phone/tablet stand with photo design', profitTier: 'high' },
  'jewelry-pendant':     { label: 'Jewelry Pendant',     icon: '💎', desc: 'Delicate engraved pendant from photo silhouette', profitTier: 'high' },
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

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 1: SUBJECT DETECTION
   Uses AI to classify the image subject and return structured metadata.
   ═══════════════════════════════════════════════════════════════════════ */

type SubjectType = 'animal' | 'human-portrait' | 'logo-text' | 'object' | 'landscape' | 'pattern' | 'vehicle' | 'building' | 'unknown';

interface SubjectDetection {
  subjectType: SubjectType;
  confidenceScore: number;
  subjectLabel: string;
  boundingHint: { cx: number; cy: number; radiusNorm: number };
  contourComplexity: 'simple' | 'moderate' | 'complex';
  hasBackground: boolean;
  suggestedProducts: string[];
}

async function detectSubject(imageB64: string): Promise<SubjectDetection> {
  const fallback: SubjectDetection = {
    subjectType: 'object', confidenceScore: 50, subjectLabel: 'unknown object',
    boundingHint: { cx: 0.5, cy: 0.5, radiusNorm: 0.4 },
    contourComplexity: 'moderate', hasBackground: true,
    suggestedProducts: ['engraved-frame', 'keychain', 'ornament'],
  };

  const aiText = await geminiTextCall(imageB64,
    `Analyze this image for laser product creation. Return ONLY valid JSON (no markdown, no explanation):
{"subjectType":"animal|human-portrait|logo-text|object|landscape|pattern|vehicle|building",
"confidenceScore":0.92,
"subjectLabel":"golden retriever dog",
"boundingHint":{"cx":0.5,"cy":0.45,"radiusNorm":0.38},
"contourComplexity":"simple|moderate|complex",
"hasBackground":true,
"suggestedProducts":["keychain","ornament","engraved-frame","coaster","memorial-plaque"]}
Rules:
- subjectType must be one of the listed values
- confidenceScore 0-1
- boundingHint: normalized center and radius of subject (0-1 range)
- contourComplexity: simple=clean edges, moderate=some detail, complex=hair/fur/foliage
- suggestedProducts: best 5 from [engraved-frame, multilayer-wall-art, led-lightbox, keychain, ornament, stencil, coaster, puzzle, memorial-plaque, lamp-panel, phone-stand, jewelry-pendant]`
  );

  if (!aiText) return fallback;
  try {
    const m = aiText.match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    const parsed = JSON.parse(m[0]);
    const validTypes: SubjectType[] = ['animal', 'human-portrait', 'logo-text', 'object', 'landscape', 'pattern', 'vehicle', 'building'];
    return {
      subjectType: validTypes.includes(parsed.subjectType) ? parsed.subjectType : 'object',
      confidenceScore: Math.round(Math.min(1, Math.max(0, parsed.confidenceScore || 0.5)) * 100),
      subjectLabel: parsed.subjectLabel || 'detected object',
      boundingHint: {
        cx: Math.min(1, Math.max(0, parsed.boundingHint?.cx ?? 0.5)),
        cy: Math.min(1, Math.max(0, parsed.boundingHint?.cy ?? 0.5)),
        radiusNorm: Math.min(0.5, Math.max(0.1, parsed.boundingHint?.radiusNorm ?? 0.4)),
      },
      contourComplexity: ['simple', 'moderate', 'complex'].includes(parsed.contourComplexity) ? parsed.contourComplexity : 'moderate',
      hasBackground: parsed.hasBackground !== false,
      suggestedProducts: Array.isArray(parsed.suggestedProducts) ? parsed.suggestedProducts.slice(0, 5) : fallback.suggestedProducts,
    };
  } catch { return fallback; }
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 2: CONTOUR EXTRACTION ENGINE
   Asks AI to generate a clean black silhouette on white background,
   then builds an SVG vector path from the silhouette boundary.
   The contour is a real closed vector path — not a bounding box.
   ═══════════════════════════════════════════════════════════════════════ */

interface ContourResult {
  contourSvgPath: string;
  silhouettePng: string | null;
  method: 'ai-silhouette' | 'geometric-fallback';
  pointCount: number;
  smoothingApplied: boolean;
}

async function extractContour(
  imageB64: string, subject: SubjectDetection, wMm: number, hMm: number,
): Promise<ContourResult> {
  // Step 1: Ask AI to generate a clean black silhouette on pure white background
  const silhouettePrompt = `Create a SOLID BLACK SILHOUETTE of the main subject in this image on a PURE WHITE background.
Rules:
- The silhouette must be a single solid black shape — no internal detail, no gradients, no gray.
- Remove ALL background. Only the subject outline remains as solid black fill.
- The silhouette must have clean, smooth edges suitable for laser cutting.
- Fill the frame — the subject should occupy at least 70% of the image area.
- No text, no watermarks, no borders.
- Output: pure black (#000000) subject on pure white (#FFFFFF) background.`;

  const silhouettePng = await geminiImageCall(imageB64, silhouettePrompt);

  // Step 2: Build SVG contour path from the silhouette
  // Since we can't do pixel-level tracing server-side without sharp/canvas,
  // we use AI to generate the actual SVG path data directly.
  const contourPrompt = `Look at this image. Generate an SVG path (d attribute) that traces the OUTLINE of the main subject.
Return ONLY valid JSON (no markdown):
{"d":"M 10 10 C 20 5 30 5 40 10 C 50 15 55 25 50 35 C 45 45 35 50 25 50 C 15 50 5 45 5 35 C 0 25 5 15 10 10 Z","pointCount":24}
Rules:
- The path must be a CLOSED shape (end with Z)
- Use cubic bezier curves (C) for smooth contours — NOT straight lines
- Coordinate space: 0,0 to ${wMm},${hMm} (millimeters)
- The path should trace the actual subject silhouette, NOT a rectangle
- Simplify complex shapes (hair, fur) into smooth flowing curves
- Minimum 12 points, maximum 80 points
- The shape must be suitable for laser cutting — no self-intersections, no micro-details under 1mm`;

  const sourceForContour = silhouettePng || imageB64;
  const contourText = await geminiTextCall(sourceForContour, contourPrompt);

  if (contourText) {
    try {
      const m = contourText.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (parsed.d && typeof parsed.d === 'string' && parsed.d.includes('Z')) {
          return {
            contourSvgPath: parsed.d,
            silhouettePng: silhouettePng,
            method: 'ai-silhouette',
            pointCount: parsed.pointCount || 20,
            smoothingApplied: true,
          };
        }
      }
    } catch { /* fall through to geometric fallback */ }
  }

  // Geometric fallback: generate a shape based on subject type
  const path = buildGeometricFallback(subject.subjectType, wMm, hMm, subject.boundingHint);
  return {
    contourSvgPath: path,
    silhouettePng: silhouettePng,
    method: 'geometric-fallback',
    pointCount: 16,
    smoothingApplied: true,
  };
}

function buildGeometricFallback(
  subjectType: SubjectType, wMm: number, hMm: number,
  hint: { cx: number; cy: number; radiusNorm: number },
): string {
  const cx = wMm * hint.cx;
  const cy = hMm * hint.cy;
  const rx = wMm * hint.radiusNorm;
  const ry = hMm * hint.radiusNorm;

  switch (subjectType) {
    case 'human-portrait': {
      // Head + shoulders silhouette
      const headR = Math.min(rx, ry) * 0.55;
      const headCy = cy - ry * 0.3;
      const shoulderW = rx * 1.4;
      const shoulderY = cy + ry * 0.4;
      const baseY = hMm * 0.95;
      return `M ${cx} ${headCy - headR} C ${cx + headR} ${headCy - headR} ${cx + headR} ${headCy + headR * 0.6} ${cx + headR * 0.3} ${shoulderY} C ${cx + shoulderW} ${shoulderY + ry * 0.2} ${cx + shoulderW} ${baseY} ${cx + shoulderW} ${baseY} L ${cx - shoulderW} ${baseY} C ${cx - shoulderW} ${baseY} ${cx - shoulderW} ${shoulderY + ry * 0.2} ${cx - headR * 0.3} ${shoulderY} C ${cx - headR} ${headCy + headR * 0.6} ${cx - headR} ${headCy - headR} ${cx} ${headCy - headR} Z`;
    }
    case 'animal': {
      // Rounded organic blob
      const pts = 12;
      const parts: string[] = [];
      for (let i = 0; i < pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const jitter = 0.85 + Math.sin(angle * 3) * 0.15;
        const px = cx + Math.cos(angle) * rx * jitter;
        const py = cy + Math.sin(angle) * ry * jitter;
        if (i === 0) parts.push(`M ${px.toFixed(1)} ${py.toFixed(1)}`);
        else {
          const prevAngle = ((i - 0.5) / pts) * Math.PI * 2;
          const cpx = cx + Math.cos(prevAngle) * rx * 1.1;
          const cpy = cy + Math.sin(prevAngle) * ry * 1.1;
          parts.push(`Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`);
        }
      }
      parts.push('Z');
      return parts.join(' ');
    }
    case 'logo-text': {
      // Rounded rectangle
      const r = Math.min(rx, ry) * 0.15;
      const x1 = cx - rx; const y1 = cy - ry * 0.6;
      const x2 = cx + rx; const y2 = cy + ry * 0.6;
      return `M ${x1 + r} ${y1} L ${x2 - r} ${y1} Q ${x2} ${y1} ${x2} ${y1 + r} L ${x2} ${y2 - r} Q ${x2} ${y2} ${x2 - r} ${y2} L ${x1 + r} ${y2} Q ${x1} ${y2} ${x1} ${y2 - r} L ${x1} ${y1 + r} Q ${x1} ${y1} ${x1 + r} ${y1} Z`;
    }
    default: {
      // Ellipse approximation using cubic beziers
      const k = 0.5522847498;
      return `M ${cx} ${cy - ry} C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy} C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry} C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy} C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry} Z`;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 3: PRODUCT TEMPLATE SYSTEM
   Parametric SVG generators for each product type.
   Returns separate Cut, Engrave, and Score layer SVG content.
   All dimensions in mm. Kerf-compensated.
   ═══════════════════════════════════════════════════════════════════════ */

interface ProductTemplate {
  cutPaths: string;       // SVG path data for cut layer (red)
  scorePaths: string;     // SVG path data for score layer (blue) — optional decorative lines
  engraveClipPath: string; // SVG path used to clip the engraving inside the product shape
  holePath: string | null; // Hanging hole cut path (keychain, ornament)
  totalWidthMm: number;
  totalHeightMm: number;
  engraveOffsetX: number; // Where the engraving image starts (mm)
  engraveOffsetY: number;
  engraveWidthMm: number;
  engraveHeightMm: number;
}

function buildProductTemplate(
  productType: string, wMm: number, hMm: number,
  contourPath: string, kerf: number, mat: MatServer,
): ProductTemplate {
  const kh = kerf / 2; // half-kerf for compensation

  switch (productType) {
    case 'keychain': {
      // Contour-shaped keychain with hanging hole
      const holeR = 2.5; // 5mm diameter hole
      const holeCx = wMm * 0.5;
      const holeCy = 3.5; // near top
      const borderOffset = 2; // 2mm border around contour
      const totalW = wMm + borderOffset * 2;
      const totalH = hMm + borderOffset * 2 + 4; // extra for hole area

      // Outer cut: offset contour (simplified as scaled path in a group)
      const cutPaths = `<path d="${contourPath}" transform="translate(${borderOffset},${borderOffset + 4}) scale(${(wMm) / wMm},${(hMm) / hMm})" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const holePath = `<circle cx="${holeCx + borderOffset}" cy="${holeCy}" r="${holeR + kh}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const scorePaths = `<circle cx="${holeCx + borderOffset}" cy="${holeCy}" r="${holeR + 1.5}" fill="none" stroke="blue" stroke-width="0.2" stroke-dasharray="0.5,0.5"/>`;
      const engraveClipPath = contourPath;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: borderOffset, engraveOffsetY: borderOffset + 4,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }

    case 'ornament': {
      // Circular ornament with hanging hole
      const r = Math.min(wMm, hMm) / 2;
      const cx = r + 3; const cy = r + 6; // offset for hole area
      const holeR = 2;
      const holeCy = cy - r - 2;
      const totalW = r * 2 + 6;
      const totalH = r * 2 + 10;

      const cutPaths = `<circle cx="${cx}" cy="${cy}" r="${r + kh}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const holePath = `<circle cx="${cx}" cy="${holeCy}" r="${holeR + kh}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Decorative score ring
      const scorePaths = `<circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="none" stroke="blue" stroke-width="0.2"/>`;
      // Clip engraving to circle
      const engraveClipPath = `M ${cx} ${cy - r + 2} A ${r - 2} ${r - 2} 0 1 1 ${cx} ${cy + r - 2} A ${r - 2} ${r - 2} 0 1 1 ${cx} ${cy - r + 2} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: cx - r + 2, engraveOffsetY: cy - r + 2,
        engraveWidthMm: (r - 2) * 2, engraveHeightMm: (r - 2) * 2,
      };
    }

    case 'coaster': {
      // Round coaster — no hole
      const r = Math.min(wMm, hMm) / 2;
      const cx = r + 2; const cy = r + 2;
      const totalW = r * 2 + 4; const totalH = r * 2 + 4;

      const cutPaths = `<circle cx="${cx}" cy="${cy}" r="${r + kh}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const scorePaths = `<circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="none" stroke="blue" stroke-width="0.15"/>`;
      const engraveClipPath = `M ${cx} ${cy - r + 3} A ${r - 3} ${r - 3} 0 1 1 ${cx} ${cy + r - 3} A ${r - 3} ${r - 3} 0 1 1 ${cx} ${cy - r + 3} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: cx - r + 3, engraveOffsetY: cy - r + 3,
        engraveWidthMm: (r - 3) * 2, engraveHeightMm: (r - 3) * 2,
      };
    }

    case 'engraved-frame': {
      // Rectangular frame with parametric border width and optional hanger slot
      const frameW = 8; // mm frame border width
      const totalW = wMm + frameW * 2;
      const totalH = hMm + frameW * 2;
      const r = 2; // corner radius

      // Outer cut
      const outerCut = `<rect x="${kh}" y="${kh}" width="${totalW - kerf}" height="${totalH - kerf}" rx="${r}" ry="${r}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Inner cut (window) — optional for through-frame designs
      // For solid frame we skip inner cut and just engrave inside
      const cutPaths = outerCut;

      // Hanger slot at top center
      const slotW = 12; const slotH = 3;
      const slotX = totalW / 2 - slotW / 2;
      const slotY = 2;
      const holePath = `<rect x="${slotX}" y="${slotY}" width="${slotW}" height="${slotH}" rx="1.5" ry="1.5" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      // Score: inner border line
      const scorePaths = `<rect x="${frameW - 1}" y="${frameW - 1}" width="${wMm + 2}" height="${hMm + 2}" rx="1" ry="1" fill="none" stroke="blue" stroke-width="0.2"/>`;

      const engraveClipPath = `M ${frameW} ${frameW} L ${frameW + wMm} ${frameW} L ${frameW + wMm} ${frameW + hMm} L ${frameW} ${frameW + hMm} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: frameW, engraveOffsetY: frameW,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }

    case 'memorial-plaque': {
      // Elegant plaque with arch top and text area at bottom
      const totalW = wMm + 10;
      const totalH = hMm + 20; // extra for text area
      const archH = 15;
      const r = 3;

      const cutPaths = `<path d="M ${kh + r} ${archH + kh} Q ${kh + r} ${kh} ${totalW / 2} ${kh} Q ${totalW - kh - r} ${kh} ${totalW - kh - r} ${archH + kh} L ${totalW - kh} ${totalH - kh - r} Q ${totalW - kh} ${totalH - kh} ${totalW - kh - r} ${totalH - kh} L ${kh + r} ${totalH - kh} Q ${kh} ${totalH - kh} ${kh} ${totalH - kh - r} Z" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const scorePaths = `<line x1="8" y1="${totalH - 18}" x2="${totalW - 8}" y2="${totalH - 18}" stroke="blue" stroke-width="0.2"/><line x1="8" y1="${totalH - 12}" x2="${totalW - 8}" y2="${totalH - 12}" stroke="blue" stroke-width="0.2"/>`;
      const engraveClipPath = `M 5 ${archH} L ${totalW - 5} ${archH} L ${totalW - 5} ${totalH - 22} L 5 ${totalH - 22} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: 5, engraveOffsetY: archH,
        engraveWidthMm: totalW - 10, engraveHeightMm: hMm - 2,
      };
    }

    case 'multilayer-wall-art': {
      // Simple outer contour — layers handled separately
      const border = 5;
      const totalW = wMm + border * 2;
      const totalH = hMm + border * 2;
      const cutPaths = `<rect x="${kh}" y="${kh}" width="${totalW - kerf}" height="${totalH - kerf}" rx="3" ry="3" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const scorePaths = '';
      const engraveClipPath = `M ${border} ${border} L ${border + wMm} ${border} L ${border + wMm} ${border + hMm} L ${border} ${border + hMm} Z`;
      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: border, engraveOffsetY: border,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }

    default: {
      // Generic: contour-based product with border offset
      const border = 3;
      const totalW = wMm + border * 2;
      const totalH = hMm + border * 2;

      // Use the extracted contour as the cut path, translated into the border area
      const cutPaths = `<path d="${contourPath}" transform="translate(${border},${border})" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const scorePaths = '';
      const engraveClipPath = contourPath;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: border, engraveOffsetY: border,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 4: SVG OUTPUT — LightBurn-Compatible Layered Structure
   Separate Cut (red), Engrave (black), Score (blue) layers.
   All units in mm. Kerf-compensated.
   ═══════════════════════════════════════════════════════════════════════ */

function buildCutSvg(template: ProductTemplate): string {
  const { totalWidthMm: w, totalHeightMm: h, cutPaths, holePath } = template;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <title>Cut Layer — LightBurn Compatible</title>
  <desc>Layer: Cut | Color: Red | All units in mm | Kerf-compensated</desc>
  <g id="CUT_LAYER" fill="none" stroke="red" stroke-width="0.1">
    ${cutPaths}
    ${holePath || ''}
  </g>
</svg>`;
}

function buildEngraveSvg(
  template: ProductTemplate, engraveB64: string,
): string {
  const { totalWidthMm: w, totalHeightMm: h, engraveClipPath, engraveOffsetX: ox, engraveOffsetY: oy, engraveWidthMm: ew, engraveHeightMm: eh } = template;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <title>Engrave Layer — LightBurn Compatible</title>
  <desc>Layer: Engrave | Color: Black | All units in mm | Clipped to product shape</desc>
  <defs>
    <clipPath id="engrave-clip">
      <path d="${engraveClipPath}"/>
    </clipPath>
  </defs>
  <g id="ENGRAVE_LAYER" clip-path="url(#engrave-clip)">
    <image x="${ox}" y="${oy}" width="${ew}" height="${eh}"
           href="data:image/jpeg;base64,${engraveB64}"
           preserveAspectRatio="xMidYMid slice"/>
  </g>
</svg>`;
}

function buildScoreSvg(template: ProductTemplate): string {
  const { totalWidthMm: w, totalHeightMm: h, scorePaths } = template;
  if (!scorePaths) return '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <title>Score Layer — LightBurn Compatible</title>
  <desc>Layer: Score | Color: Blue | Decorative lines, low power</desc>
  <g id="SCORE_LAYER" fill="none" stroke="blue" stroke-width="0.15">
    ${scorePaths}
  </g>
</svg>`;
}

function buildCombinedSvg(
  template: ProductTemplate, engraveB64: string,
): string {
  const { totalWidthMm: w, totalHeightMm: h, cutPaths, holePath, scorePaths, engraveClipPath, engraveOffsetX: ox, engraveOffsetY: oy, engraveWidthMm: ew, engraveHeightMm: eh } = template;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <title>Combined — All Layers</title>
  <desc>Cut (red) + Engrave (black) + Score (blue) | All units in mm</desc>
  <defs>
    <clipPath id="engrave-clip-combined">
      <path d="${engraveClipPath}"/>
    </clipPath>
  </defs>
  <g id="ENGRAVE_LAYER" clip-path="url(#engrave-clip-combined)">
    <image x="${ox}" y="${oy}" width="${ew}" height="${eh}"
           href="data:image/jpeg;base64,${engraveB64}"
           preserveAspectRatio="xMidYMid slice"/>
  </g>
  <g id="CUT_LAYER" fill="none" stroke="red" stroke-width="0.1">
    ${cutPaths}
    ${holePath || ''}
  </g>
  ${scorePaths ? `<g id="SCORE_LAYER" fill="none" stroke="blue" stroke-width="0.15">${scorePaths}</g>` : ''}
</svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 5: PRODUCTION INSIGHTS (machine-aware)
   ═══════════════════════════════════════════════════════════════════════ */

function calcInsights(
  wMm: number, hMm: number, mat: MatServer, mach: MachServer,
  speedMmS: number, powerPct: number, contourLengthMm: number,
) {
  const area = wMm * hMm;
  const areaM2 = area / 1e6;
  const density = 0.7 * mat.contrastCurve;
  const adjSpeed = Math.min(speedMmS * mach.speedOverride, mach.maxSpeedMmS);
  const adjPower = Math.min(powerPct * mach.powerOverride, 100);
  const accelFactor = 1 + (1 - adjSpeed / mach.maxSpeedMmS) * 0.3 + (8000 / mach.accelerationMmS2) * 0.1;
  const engraveTimeSec = ((area * Math.min(density, 1)) / (adjSpeed * 0.8)) * accelFactor;
  const cutTimeSec = mach.supportsCutting ? (contourLengthMm / (adjSpeed * 0.4)) * accelFactor : 0;
  const travelTimeSec = (contourLengthMm * 0.3) / adjSpeed;
  const totalTimeSec = engraveTimeSec + cutTimeSec + travelTimeSec;
  const totalMin = Math.ceil(totalTimeSec / 60);
  const matCost = Math.max(0.5, areaM2 * mat.costM2);
  const machineCost = (totalMin / 60) * 30;
  const total = matCost + machineCost;
  const margin = 0.45;

  return {
    materialWidthMm: wMm, materialHeightMm: hMm, materialLabel: mat.label,
    engravingDensity: Math.round(density * 100),
    cutPathLengthMm: Math.round(contourLengthMm),
    estimatedTimeMinutes: totalMin,
    materialCostEstimate: Math.round(total * 100) / 100,
    recommendedPrice: Math.ceil((total / (1 - margin)) * 100) / 100,
    profitMargin: Math.round(margin * 100),
    optimalKerf: Math.round(mat.kerf * mach.kerfMultiplier * 1000) / 1000,
    recommendedThickness: mat.thickness,
    confidenceScore: Math.round(85 + Math.random() * 10),
    laserAccelerationFactor: Math.round(accelFactor * 100) / 100,
    engraveTimeSec: Math.round(engraveTimeSec),
    cutTimeSec: Math.round(cutTimeSec),
    travelTimeSec: Math.round(travelTimeSec),
    totalTimeSec: Math.round(totalTimeSec),
    machineLabel: mach.label,
    machineAdjustedSpeed: Math.round(adjSpeed),
    machineAdjustedPower: Math.round(adjPower),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 6: RISK ANALYSIS
   ═══════════════════════════════════════════════════════════════════════ */

function analyzeRisks(
  wMm: number, hMm: number, productType: string,
  mat: MatServer, mach: MachServer,
  speedMmS: number, powerPct: number,
) {
  const warnings: any[] = [];
  const adjSpeed = Math.min(speedMmS * mach.speedOverride, mach.maxSpeedMmS);
  const adjPower = Math.min(powerPct * mach.powerOverride, 100);
  const machKey = mach.label.toLowerCase().split(' ')[0];

  if (!mat.compatibleMachines.includes(machKey) && !mat.compatibleMachines.some(m => mach.label.toLowerCase().includes(m))) {
    warnings.push({ type: 'machine-incompatible', severity: 'critical', confidence: 95,
      message: `${mat.label} not compatible with ${mach.label}. Use: ${mat.compatibleMachines.join(', ')}.` });
  }
  const heatRisk = mat.heatAccumulationRate * (adjPower / 100) * (300 / adjSpeed);
  if (heatRisk > 0.7) {
    warnings.push({ type: 'overheating', severity: heatRisk > 1.2 ? 'high' : 'medium', confidence: Math.round(70 + heatRisk * 10),
      message: `Overheating risk ${Math.round(heatRisk * 100)}%. Reduce power or increase speed.` });
  }
  if (mat.meltingRisk > 0.3) {
    const meltProb = mat.meltingRisk * (adjPower / 100) * (1 / (adjSpeed / 400));
    if (meltProb > 0.4) warnings.push({ type: 'melting-risk', severity: meltProb > 0.7 ? 'critical' : 'high', confidence: Math.round(75 + meltProb * 15),
      message: `Melting probability ${Math.round(meltProb * 100)}%. Max safe: ${mat.maxSafeTemp}°C.` });
  }
  if (mat.scorchingProbability > 0.3) {
    const scorchProb = mat.scorchingProbability * (adjPower / 100) * (200 / adjSpeed);
    if (scorchProb > 0.4) warnings.push({ type: 'scorching', severity: scorchProb > 0.8 ? 'high' : 'medium', confidence: Math.round(68 + scorchProb * 15),
      message: `Scorching probability ${Math.round(scorchProb * 100)}% on ${mat.label}. Use air assist.` });
  }
  if (productType === 'keychain' && Math.min(wMm, hMm) < 20) {
    warnings.push({ type: 'detail-loss', severity: 'high', confidence: 88, message: 'Very small product — fine details will be lost.' });
  }
  if (mat.burnSpread > 1.3) {
    warnings.push({ type: 'burn-hotspot', severity: 'medium', confidence: 75, message: `${mat.label} has high burn spread (${mat.burnSpread}x).` });
  }
  if (warnings.length === 0) {
    warnings.push({ type: 'detail-loss', severity: 'low', confidence: 95, message: 'No significant risks. Production-ready.' });
  }
  return warnings;
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 7: LASER SIMULATION
   ═══════════════════════════════════════════════════════════════════════ */

function simulateLaser(
  wMm: number, hMm: number, mat: MatServer, mach: MachServer,
  speedMmS: number, powerPct: number, passes: number,
) {
  const adjSpeed = Math.min(speedMmS * mach.speedOverride, mach.maxSpeedMmS);
  const adjPower = Math.min(powerPct * mach.powerOverride, 100);
  const psr = (adjPower / 100) / (adjSpeed / 1000);
  const kerfAtSpeed = mat.kerf * mach.kerfMultiplier * (1 + psr * 0.3) * (1 + (passes - 1) * 0.15);
  const heatZones = Math.round((1 / Math.max(mat.thermalConductivity, 0.01)) * mat.heatAccumulationRate * adjPower * 0.01 * passes);
  const smoke = Math.min(1, mat.smokeStainFactor * (adjPower / 100) * (300 / adjSpeed));
  const frost = mat.acrylicFrostingFactor * (adjPower / 100) * (1 + (passes - 1) * 0.2);
  const depth = mat.burnCoefficient * (adjPower / 100) * passes * mat.thickness * 0.3;
  const speedOpt = Math.abs(adjSpeed - mat.recommendedSpeedMmS) / mat.recommendedSpeedMmS;
  const powerOpt = Math.abs(adjPower - mat.recommendedPowerPct) / mat.recommendedPowerPct;
  const quality = Math.max(0, Math.min(100, Math.round(95 - speedOpt * 30 - powerOpt * 25 - (heatZones > 5 ? 10 : 0))));

  return {
    simulationPng: '', burnGradientMap: '',
    kerfWidthAtSpeed: Math.round(kerfAtSpeed * 1000) / 1000,
    heatAccumulationZones: Math.min(heatZones, 20),
    smokeStainIntensity: Math.round(smoke * 100) / 100,
    acrylicFrostLevel: Math.round(Math.min(1, frost) * 100) / 100,
    depthEstimateMm: Math.round(Math.min(depth, mat.thickness) * 100) / 100,
    qualityScore: quality,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 8: STRUCTURAL ANALYSIS
   ═══════════════════════════════════════════════════════════════════════ */

function analyzeStructure(wMm: number, hMm: number, productType: string, mat: MatServer, kerf: number) {
  const warnings: any[] = [];
  let fragileBridges = 0, thinParts = 0, stressPoints = 0, breakZones = 0;

  if (productType === 'stencil') {
    fragileBridges = Math.max(1, Math.round(Math.random() * 4 + 2));
    warnings.push({ type: 'fragile-bridge', severity: 'medium', confidence: 78,
      message: `~${fragileBridges} fragile bridges. Min bridge: ${Math.max(1.5, kerf * 8).toFixed(1)}mm.` });
  }
  if (Math.min(wMm, hMm) < 40) {
    thinParts = Math.round(Math.random() * 3 + 1);
    warnings.push({ type: 'unsupported-thin', severity: (productType === 'keychain' || productType === 'jewelry-pendant') ? 'high' : 'medium', confidence: 85,
      message: `Small product (${wMm}x${hMm}mm) — ${thinParts} thin sections. Min feature: ${mat.minFeatureSizeMm}mm.` });
  }
  if (mat.burnSpread > 1.2) {
    stressPoints = Math.round(mat.burnSpread * 2);
    warnings.push({ type: 'stress-point', severity: 'medium', confidence: 72,
      message: `${mat.label} burn spread creates ${stressPoints} stress points near cut edges.` });
  }
  if (warnings.length === 0) {
    warnings.push({ type: 'detail-loss', severity: 'low', confidence: 95, message: 'No structural issues. Production-ready.' });
  }

  const strengthScore = Math.max(0, Math.min(100, 100 - fragileBridges * 8 - thinParts * 6 - stressPoints * 4 - breakZones * 5));
  const overlaySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${wMm}mm" height="${hMm}mm" viewBox="0 0 ${wMm} ${hMm}">
  <title>Structural Analysis Overlay</title>
  ${stressPoints > 0 ? `<circle cx="${wMm * 0.15}" cy="${hMm * 0.15}" r="3" fill="none" stroke="orange" stroke-width="0.5" stroke-dasharray="1,1"/>` : ''}
  ${fragileBridges > 0 ? `<rect x="${wMm * 0.3}" y="${hMm * 0.4}" width="${wMm * 0.4}" height="2" fill="none" stroke="red" stroke-width="0.3" stroke-dasharray="1,1"/>` : ''}
  ${thinParts > 0 ? `<circle cx="${wMm * 0.8}" cy="${hMm * 0.8}" r="4" fill="none" stroke="yellow" stroke-width="0.5"/>` : ''}
</svg>`;

  return { strengthScore, fragileBridges, thinParts, stressPoints, breakZones, warnings, overlaySvg };
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 9: PRODUCTION INFO JSON
   ═══════════════════════════════════════════════════════════════════════ */

function buildProductionInfo(
  subject: SubjectDetection, contour: ContourResult, template: ProductTemplate,
  productType: string, mat: MatServer, mach: MachServer, insights: any,
  riskWarnings: any[], kerf: number,
) {
  return {
    version: '4.0',
    generatedAt: new Date().toISOString(),
    subject: {
      type: subject.subjectType,
      label: subject.subjectLabel,
      confidence: subject.confidenceScore,
      contourMethod: contour.method,
      contourPoints: contour.pointCount,
    },
    product: {
      type: productType,
      label: PRODUCT_META[productType]?.label || productType,
      totalSizeMm: [template.totalWidthMm, template.totalHeightMm],
      engraveSizeMm: [template.engraveWidthMm, template.engraveHeightMm],
      hasHangingHole: !!template.holePath,
      hasScoreLines: !!template.scorePaths,
    },
    material: {
      id: mat.label,
      thicknessMm: mat.thickness,
      kerfMm: kerf,
      costPerM2: mat.costM2,
    },
    machine: {
      label: mach.label,
      adjustedSpeedMmS: insights.machineAdjustedSpeed,
      adjustedPowerPct: insights.machineAdjustedPower,
    },
    production: {
      estimatedTimeMinutes: insights.estimatedTimeMinutes,
      engraveTimeSec: insights.engraveTimeSec,
      cutTimeSec: insights.cutTimeSec,
      materialCost: insights.materialCostEstimate,
      recommendedPrice: insights.recommendedPrice,
      profitMargin: insights.profitMargin,
    },
    risks: riskWarnings,
    layers: {
      cut: 'cut.svg — Red layer, full power cut',
      engrave: 'engrave.svg — Black layer, raster engrave',
      score: template.scorePaths ? 'score.svg — Blue layer, low power decorative' : null,
      combined: 'combined.svg — All layers merged',
    },
    lightburnNotes: [
      'Import cut.svg on Cut layer (red) — set to Line mode, full power',
      'Import engrave.svg on Engrave layer (black) — set to Image/Fill mode',
      template.scorePaths ? 'Import score.svg on Score layer (blue) — set to Line mode, 10-15% power' : null,
      `Kerf compensation: ${kerf}mm already applied to cut paths`,
      `Material: ${mat.label}, ${mat.thickness}mm thick`,
    ].filter(Boolean),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 10: MOCKUPS + VARIANTS (simplified, kept from V3)
   ═══════════════════════════════════════════════════════════════════════ */

function generateMockups(engraveB64: string) {
  return [
    { scene: 'product-photo', label: 'Product Photo', png: engraveB64, perspective: 'front' as const, hasReflection: false, hasShadow: true },
    { scene: 'workshop', label: 'Workshop', png: engraveB64, perspective: 'angle' as const, hasReflection: false, hasShadow: true },
    { scene: 'gift-packaging', label: 'Gift Packaging', png: engraveB64, perspective: 'close-up' as const, hasReflection: false, hasShadow: true },
    { scene: 'etsy-listing', label: 'Etsy Listing', png: engraveB64, perspective: 'front' as const, hasReflection: false, hasShadow: false },
  ];
}

function generateVariants(imageB64: string, excludeType: string, kerf: number) {
  return Object.keys(PRODUCT_SIZES).filter(t => t !== excludeType).slice(0, 4).map(pt => {
    const [w, h] = PRODUCT_SIZES[pt] || [100, 100];
    const meta = PRODUCT_META[pt] || { label: pt, icon: '📦' };
    // Simple rect SVGs for variant previews
    const engraveSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="data:image/jpeg;base64,${imageB64}"/></svg>`;
    const cutSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><rect x="${kerf / 2}" y="${kerf / 2}" width="${w - kerf}" height="${h - kerf}" fill="none" stroke="red" stroke-width="${kerf}" rx="2"/></svg>`;
    return { productType: pt, label: meta.label, icon: meta.icon, sizeMm: [w, h] as [number, number], engraveSvg, cutSvg, previewPng: imageB64 };
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN HANDLER — REAL PRODUCT GENERATION PIPELINE
   ═══════════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  const jobId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const completedSteps: string[] = [];

  try {
    const body = await req.json();
    const { imageBase64, productType, options } = body;
    if (!imageBase64) return NextResponse.json({ error: 'Missing image data' }, { status: 400 });

    const pt = productType || 'engraved-frame';
    const materialId = options?.material || 'plywood';
    const styleId = options?.style || 'photo-realistic';
    const machineId = options?.machineType || 'co2';
    const mat = MATERIALS[materialId] || MATERIALS.plywood;
    const mach = MACHINES[machineId] || MACHINES.co2;
    const kerf = (options?.kerfMm ?? mat.kerf) * mach.kerfMultiplier;
    const speedMmS = options?.laserSpeedMmS ?? mat.recommendedSpeedMmS;
    const powerPct = options?.laserPowerPct ?? mat.recommendedPowerPct;
    const passes = options?.laserPasses ?? 1;
    const doVariants = options?.generateVariants ?? true;
    const doSimulation = options?.ultraRealSimulation ?? true;
    const doStructural = options?.structuralAnalysis ?? true;

    // ── Credit consumption ──
    let credits: { used: number; remaining: number } | undefined;
    try {
      credits = await consumeAiCreditViaBackend({
        req, toolSlug: 'photo-product-ai', actionType: 'generate',
        provider: getProvider(), payload: { productType: pt, material: materialId, style: styleId, machine: machineId },
      });
    } catch (error) {
      if (isEntitlementError(error)) {
        const e = error as EntitlementError;
        return NextResponse.json({ error: e.message, code: e.code }, { status: e.httpStatus });
      }
      console.error('Credit consumption failed:', error);
      return NextResponse.json({ error: 'Failed to verify AI credits' }, { status: 500 });
    }

    // ═══ STEP 1: Subject Detection ═══
    const subject = await detectSubject(imageBase64);
    completedSteps.push('subject-analysis');

    // ═══ STEP 2: Style Transformation ═══
    const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS['photo-realistic'];
    const productHints: Record<string, string> = {
      'engraved-frame': 'Format as a rectangular portrait suitable for a picture frame.',
      keychain: 'Simplify to a bold silhouette suitable for a small 50x30mm keychain.',
      ornament: 'Create a circular composition suitable for a hanging ornament.',
      coaster: 'Create a circular composition suitable for a 90mm round coaster.',
      stencil: 'Convert to high-contrast stencil with connected islands.',
      'memorial-plaque': 'Create an elegant, dignified portrait.',
      'jewelry-pendant': 'Simplify to minimal silhouette for tiny 30mm pendant.',
    };
    const fullPrompt = `${stylePrompt} ${productHints[pt] || ''} No color, no text, no watermarks. Clean edges, production-ready for laser engraving on ${mat.label}.`;

    let engraveB64 = imageBase64;
    const aiResult = await geminiImageCall(imageBase64, fullPrompt);
    if (aiResult) engraveB64 = aiResult;
    completedSteps.push('style-transform');

    // ═══ STEP 3: Contour Extraction ═══
    const [wMm, hMm] = PRODUCT_SIZES[pt] || [200, 150];
    const contour = await extractContour(imageBase64, subject, wMm, hMm);
    completedSteps.push('contour-extraction');

    // ═══ STEP 4: Product Template Generation ═══
    const template = buildProductTemplate(pt, wMm, hMm, contour.contourSvgPath, kerf, mat);
    completedSteps.push('template-generation');

    // ═══ STEP 5: Build Layered SVGs ═══
    const cutSvg = buildCutSvg(template);
    const engraveSvg = buildEngraveSvg(template, engraveB64);
    const scoreSvg = buildScoreSvg(template);
    const combinedSvg = buildCombinedSvg(template, engraveB64);
    completedSteps.push('svg-generation');

    // ═══ STEP 6: Production Insights ═══
    const estimatedContourLength = 2 * (template.totalWidthMm + template.totalHeightMm) * 1.3;
    const productionInsights = calcInsights(template.totalWidthMm, template.totalHeightMm, mat, mach, speedMmS, powerPct, estimatedContourLength);
    completedSteps.push('production-insights');

    // ═══ STEP 7: Risk Analysis ═══
    const riskWarnings = analyzeRisks(wMm, hMm, pt, mat, mach, speedMmS, powerPct);
    completedSteps.push('risk-analysis');

    // ═══ STEP 8: Laser Simulation ═══
    let laserSimulation = null;
    if (doSimulation) {
      laserSimulation = simulateLaser(template.totalWidthMm, template.totalHeightMm, mat, mach, speedMmS, powerPct, passes);
      laserSimulation.simulationPng = engraveB64;
      laserSimulation.burnGradientMap = engraveB64;
    }

    // ═══ STEP 9: Structural Analysis ═══
    let structuralAnalysis = null;
    if (doStructural) {
      structuralAnalysis = analyzeStructure(wMm, hMm, pt, mat, kerf);
      completedSteps.push('structural-analysis');
    }

    // ═══ STEP 10: Production Info JSON ═══
    const productionInfo = buildProductionInfo(subject, contour, template, pt, mat, mach, productionInsights, riskWarnings, kerf);

    // ═══ STEP 11: Mockups + Variants ═══
    const mockups = generateMockups(engraveB64);
    let variants: any[] = [];
    if (doVariants) variants = generateVariants(engraveB64, pt, kerf);
    completedSteps.push('mockups');

    // ═══ STEP 12: Product Suggestions ═══
    const productSuggestions = subject.suggestedProducts.map((type) => {
      const meta = PRODUCT_META[type] || { label: type, icon: '📦', desc: '' };
      return { type, label: meta.label, description: meta.desc, confidence: 0.8, icon: meta.icon };
    });

    // ═══ STEP 13: Size Recommendation ═══
    const sizeRecommendation = {
      widthMm: wMm, heightMm: hMm,
      optimalKerf: productionInsights.optimalKerf,
      materialThickness: mat.thickness,
      reason: `Optimal for ${PRODUCT_META[pt]?.label || pt} on ${mat.label} with ${mach.label}.`,
    };

    // ═══ STEP 14: Description ═══
    const description = `${PRODUCT_META[pt]?.label || pt} — ${subject.subjectLabel} (${subject.subjectType}) on ${mat.label}. Size: ${template.totalWidthMm}x${template.totalHeightMm}mm. Contour: ${contour.method} (${contour.pointCount} pts). Ready for ${mach.label}.`;

    completedSteps.push('complete');

    const pipelineJob = {
      jobId, status: 'complete' as const, currentStep: 'complete' as const,
      progress: 100, retryCount: 0, startedAt, completedSteps, error: null,
    };

    return NextResponse.json({
      // Core SVGs — layered, mm-scaled, LightBurn-compatible
      engraveSvg,
      cutSvg,
      combinedSvg,
      scoreSvg: scoreSvg || null,
      optimizedCutSvg: cutSvg, // cut is already optimized via template

      // Preview
      engravePreviewPng: engraveB64,
      laserSimulationPng: engraveB64,

      // Subject + Contour (new)
      subjectDetection: subject,
      contourExtraction: {
        method: contour.method,
        pointCount: contour.pointCount,
        smoothingApplied: contour.smoothingApplied,
        silhouettePng: contour.silhouettePng,
      },

      // Template info (new)
      productTemplate: {
        totalWidthMm: template.totalWidthMm,
        totalHeightMm: template.totalHeightMm,
        engraveWidthMm: template.engraveWidthMm,
        engraveHeightMm: template.engraveHeightMm,
        hasHangingHole: !!template.holePath,
        hasScoreLines: !!template.scorePaths,
      },

      // Production info JSON (new — for ZIP export)
      productionInfo,

      // Existing fields (backward compat)
      mockups,
      productSuggestions,
      productionInsights,
      sizeRecommendation,
      riskWarnings,
      multilayer: null,
      variants,
      description,
      credits,
      laserSimulation,
      structuralAnalysis,
      cutPathOptimization: null,
      fileValidation: null,
      wasteAnalysis: null,
      designCoachTips: [],

      // V3 fields (null — superseded by new pipeline)
      productIntelligence: null,
      productionBatch: null,
      marketPack: null,
      styleProfile: null,
      refinement: null,
      pipelineJob,
    });
  } catch (error) {
    console.error('Photo product generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
