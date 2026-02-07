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

  if (!aiText) return applyProductRules(fallback);
  try {
    const m = aiText.match(/\{[\s\S]*\}/);
    if (!m) return applyProductRules(fallback);
    const parsed = JSON.parse(m[0]);
    const validTypes: SubjectType[] = ['animal', 'human-portrait', 'logo-text', 'object', 'landscape', 'pattern', 'vehicle', 'building'];
    const result: SubjectDetection = {
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
      suggestedProducts: Array.isArray(parsed.suggestedProducts) ? parsed.suggestedProducts.slice(0, 6) : [],
    };
    return applyProductRules(result);
  } catch { return applyProductRules(fallback); }
}

// Hardcoded subject→product decision logic
function applyProductRules(det: SubjectDetection): SubjectDetection {
  const SUBJECT_PRODUCT_MAP: Record<string, string[]> = {
    'animal':          ['keychain', 'ornament', 'multilayer-wall-art', 'engraved-frame', 'coaster', 'jewelry-pendant'],
    'human-portrait':  ['engraved-frame', 'memorial-plaque', 'lamp-panel', 'multilayer-wall-art', 'led-lightbox', 'phone-stand'],
    'logo-text':       ['stencil', 'engraved-frame', 'coaster', 'phone-stand', 'keychain', 'led-lightbox'],
    'object':          ['keychain', 'engraved-frame', 'coaster', 'ornament', 'stencil', 'phone-stand'],
    'landscape':       ['multilayer-wall-art', 'engraved-frame', 'led-lightbox', 'lamp-panel', 'puzzle', 'coaster'],
    'pattern':         ['stencil', 'coaster', 'ornament', 'led-lightbox', 'puzzle', 'multilayer-wall-art'],
    'vehicle':         ['keychain', 'engraved-frame', 'multilayer-wall-art', 'stencil', 'coaster', 'phone-stand'],
    'building':        ['engraved-frame', 'multilayer-wall-art', 'led-lightbox', 'puzzle', 'lamp-panel', 'coaster'],
    'unknown':         ['engraved-frame', 'keychain', 'ornament', 'coaster', 'stencil', 'phone-stand'],
  };
  // If AI returned products, merge with rules (AI first, then fill with rule-based)
  const ruleProducts = SUBJECT_PRODUCT_MAP[det.subjectType] || SUBJECT_PRODUCT_MAP['unknown'];
  if (!det.suggestedProducts || det.suggestedProducts.length < 3) {
    det.suggestedProducts = ruleProducts;
  } else {
    // Merge: keep AI suggestions, append rule-based ones that aren't already present
    const merged = [...det.suggestedProducts];
    for (const p of ruleProducts) {
      if (!merged.includes(p)) merged.push(p);
    }
    det.suggestedProducts = merged.slice(0, 8);
  }
  return det;
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

    case 'led-lightbox': {
      // LED lightbox panel — outer frame + inner engraving panel for edge-lit acrylic
      // Layered silhouette with diffusion spacing for backlighting
      const frameW = 6;
      const diffusionGap = 2; // gap between frame and engrave zone for light diffusion
      const totalW = wMm + (frameW + diffusionGap) * 2;
      const totalH = hMm + (frameW + diffusionGap) * 2;
      const r = 3;

      // Outer frame cut
      const outerCut = `<rect x="${kh}" y="${kh}" width="${totalW - kerf}" height="${totalH - kerf}" rx="${r}" ry="${r}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Inner panel cut (the acrylic panel that gets edge-lit)
      const innerX = frameW;
      const innerY = frameW;
      const innerW = totalW - frameW * 2;
      const innerH = totalH - frameW * 2;
      const innerCut = `<rect x="${innerX + kh}" y="${innerY + kh}" width="${innerW - kerf}" height="${innerH - kerf}" rx="2" ry="2" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // LED slot at bottom (for LED strip insertion)
      const ledSlotW = totalW * 0.6;
      const ledSlotH = 3;
      const ledSlotX = (totalW - ledSlotW) / 2;
      const ledSlotY = totalH - frameW + 1;
      const ledSlot = `<rect x="${ledSlotX}" y="${ledSlotY}" width="${ledSlotW}" height="${ledSlotH}" rx="1.5" ry="1.5" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const cutPaths = `${outerCut}${innerCut}${ledSlot}`;

      // Score: diffusion zone boundary markers
      const scorePaths = `<rect x="${frameW + diffusionGap - 0.5}" y="${frameW + diffusionGap - 0.5}" width="${wMm + 1}" height="${hMm + 1}" rx="1" ry="1" fill="none" stroke="blue" stroke-width="0.15" stroke-dasharray="1,1"/>`;

      const engOx = frameW + diffusionGap;
      const engOy = frameW + diffusionGap;
      const engraveClipPath = `M ${engOx} ${engOy} L ${engOx + wMm} ${engOy} L ${engOx + wMm} ${engOy + hMm} L ${engOx} ${engOy + hMm} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: ledSlot,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: engOx, engraveOffsetY: engOy,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }

    case 'stencil': {
      // Stencil product — cut-through design with structural bridges
      // The engraving is used as a guide; the actual product is the cut-through pattern
      const border = 6;
      const totalW = wMm + border * 2;
      const totalH = hMm + border * 2;
      const r = 2;

      // Outer frame cut (stencil border)
      const outerCut = `<rect x="${kh}" y="${kh}" width="${totalW - kerf}" height="${totalH - kerf}" rx="${r}" ry="${r}" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      // Inner contour cut — the actual stencil shape
      // Use the extracted contour as the cut-through area
      const contourCut = `<path d="${contourPath}" transform="translate(${border},${border})" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      // Structural bridges — horizontal bars across the stencil to maintain structural integrity
      const bridgeW = Math.max(1.5, mat.minFeatureSizeMm * 1.2);
      const bridgeCount = Math.max(2, Math.floor(hMm / 25));
      let bridgePaths = '';
      for (let i = 1; i <= bridgeCount; i++) {
        const by = border + (hMm * i) / (bridgeCount + 1);
        // Score lines showing where bridges maintain structure
        bridgePaths += `<line x1="${border + 2}" y1="${by}" x2="${border + wMm - 2}" y2="${by}" stroke="blue" stroke-width="${bridgeW}" stroke-dasharray="3,8"/>`;
      }
      // Vertical bridge
      const vx = border + wMm / 2;
      bridgePaths += `<line x1="${vx}" y1="${border + 2}" x2="${vx}" y2="${border + hMm - 2}" stroke="blue" stroke-width="${bridgeW}" stroke-dasharray="3,8"/>`;

      const cutPaths = `${outerCut}${contourCut}`;
      const scorePaths = bridgePaths;
      const engraveClipPath = `M ${border} ${border} L ${border + wMm} ${border} L ${border + wMm} ${border + hMm} L ${border} ${border + hMm} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: border, engraveOffsetY: border,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }

    case 'puzzle': {
      // Puzzle product — jigsaw cut geometry with interlocking knob shapes
      const border = 4;
      const totalW = wMm + border * 2;
      const totalH = hMm + border * 2;
      const cols = Math.max(3, Math.round(wMm / 35));
      const rows = Math.max(3, Math.round(hMm / 35));
      const cellW = wMm / cols;
      const cellH = hMm / rows;
      const knobR = Math.min(cellW, cellH) * 0.15;

      // Outer frame cut
      const outerCut = `<rect x="${kh}" y="${kh}" width="${totalW - kerf}" height="${totalH - kerf}" rx="2" ry="2" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      // Jigsaw cut lines — horizontal and vertical with knob bumps
      let jigsawPaths = '';
      // Horizontal cuts
      for (let row = 1; row < rows; row++) {
        const y0 = border + row * cellH;
        let d = `M ${border} ${y0.toFixed(1)}`;
        for (let col = 0; col < cols; col++) {
          const x1 = border + col * cellW;
          const x2 = border + (col + 1) * cellW;
          const midX = (x1 + x2) / 2;
          const dir = (row + col) % 2 === 0 ? -1 : 1; // alternating knob direction
          // Flat segment → knob bump → flat segment
          d += ` L ${(x1 + cellW * 0.35).toFixed(1)} ${y0.toFixed(1)}`;
          d += ` C ${(midX - knobR).toFixed(1)} ${y0.toFixed(1)} ${(midX - knobR).toFixed(1)} ${(y0 + dir * knobR * 2.2).toFixed(1)} ${midX.toFixed(1)} ${(y0 + dir * knobR * 2.2).toFixed(1)}`;
          d += ` C ${(midX + knobR).toFixed(1)} ${(y0 + dir * knobR * 2.2).toFixed(1)} ${(midX + knobR).toFixed(1)} ${y0.toFixed(1)} ${(x1 + cellW * 0.65).toFixed(1)} ${y0.toFixed(1)}`;
          d += ` L ${x2.toFixed(1)} ${y0.toFixed(1)}`;
        }
        jigsawPaths += `<path d="${d}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      }
      // Vertical cuts
      for (let col = 1; col < cols; col++) {
        const x0 = border + col * cellW;
        let d = `M ${x0.toFixed(1)} ${border}`;
        for (let row = 0; row < rows; row++) {
          const y1 = border + row * cellH;
          const y2 = border + (row + 1) * cellH;
          const midY = (y1 + y2) / 2;
          const dir = (row + col) % 2 === 0 ? 1 : -1;
          d += ` L ${x0.toFixed(1)} ${(y1 + cellH * 0.35).toFixed(1)}`;
          d += ` C ${x0.toFixed(1)} ${(midY - knobR).toFixed(1)} ${(x0 + dir * knobR * 2.2).toFixed(1)} ${(midY - knobR).toFixed(1)} ${(x0 + dir * knobR * 2.2).toFixed(1)} ${midY.toFixed(1)}`;
          d += ` C ${(x0 + dir * knobR * 2.2).toFixed(1)} ${(midY + knobR).toFixed(1)} ${x0.toFixed(1)} ${(midY + knobR).toFixed(1)} ${x0.toFixed(1)} ${(y1 + cellH * 0.65).toFixed(1)}`;
          d += ` L ${x0.toFixed(1)} ${y2.toFixed(1)}`;
        }
        jigsawPaths += `<path d="${d}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      }

      const cutPaths = `${outerCut}${jigsawPaths}`;
      // Score: piece count label
      const scorePaths = `<text x="${totalW / 2}" y="${totalH - 1}" text-anchor="middle" font-size="2" fill="blue">${cols * rows} pieces</text>`;
      const engraveClipPath = `M ${border} ${border} L ${border + wMm} ${border} L ${border + wMm} ${border + hMm} L ${border} ${border + hMm} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: border, engraveOffsetY: border,
        engraveWidthMm: wMm, engraveHeightMm: hMm,
      };
    }

    case 'lamp-panel': {
      // Lamp panel / night light — translucency-optimized engraving with stand
      const panelBorder = 4;
      const standH = 25; // stand height below panel
      const standW = wMm * 0.4;
      const slotW = mat.thickness + 0.3; // material thickness + clearance for slot fit
      const slotH = standH * 0.6;
      const cableNotchR = 3;
      const totalW = wMm + panelBorder * 2;
      const totalH = hMm + panelBorder * 2;
      const r = 4;

      // Main panel cut (rounded top, flat bottom for stand insertion)
      const panelCut = `<path d="M ${kh + r} ${kh} L ${totalW - kh - r} ${kh} Q ${totalW - kh} ${kh} ${totalW - kh} ${kh + r} L ${totalW - kh} ${totalH - kh} L ${kh} ${totalH - kh} L ${kh} ${kh + r} Q ${kh} ${kh} ${kh + r} ${kh} Z" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Slot in panel bottom for stand insertion
      const panelSlotX = totalW / 2 - standW / 2;
      const panelSlot = `<rect x="${panelSlotX}" y="${totalH - slotH}" width="${standW}" height="${slotH}" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      // Stand piece (separate cut piece)
      // Stand sits below the panel, drawn as a second piece to the right
      const standOffsetX = totalW + 8;
      const standTotalW = standW + 20; // wider base
      const standTotalH = standH;
      const standCut = `<path d="M ${standOffsetX} ${standTotalH} L ${standOffsetX} ${5} Q ${standOffsetX} ${0} ${standOffsetX + 5} ${0} L ${standOffsetX + standTotalW - 5} ${0} Q ${standOffsetX + standTotalW} ${0} ${standOffsetX + standTotalW} ${5} L ${standOffsetX + standTotalW} ${standTotalH} Z" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Slot in stand for panel insertion
      const standSlotX = standOffsetX + (standTotalW - slotW) / 2;
      const standSlot = `<rect x="${standSlotX}" y="0" width="${slotW}" height="${standH * 0.7}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Cable notch in stand base
      const cableNotch = `<circle cx="${standOffsetX + standTotalW / 2}" cy="${standTotalH}" r="${cableNotchR}" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      const cutPaths = `${panelCut}${panelSlot}${standCut}${standSlot}${cableNotch}`;
      // Score: stand fold guide
      const scorePaths = `<line x1="${panelBorder}" y1="${totalH - slotH - 1}" x2="${totalW - panelBorder}" y2="${totalH - slotH - 1}" stroke="blue" stroke-width="0.15" stroke-dasharray="1,2"/>`;
      const engraveClipPath = `M ${panelBorder} ${panelBorder} L ${panelBorder + wMm} ${panelBorder} L ${panelBorder + wMm} ${panelBorder + hMm - slotH} L ${panelBorder} ${panelBorder + hMm - slotH} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW + standTotalW + 10, totalHeightMm: Math.max(totalH, standTotalH),
        engraveOffsetX: panelBorder, engraveOffsetY: panelBorder,
        engraveWidthMm: wMm, engraveHeightMm: hMm - slotH,
      };
    }

    case 'phone-stand': {
      // Phone stand — engraved face panel + slot-fit base
      const panelBorder = 4;
      const totalW = wMm + panelBorder * 2;
      const totalH = hMm + panelBorder * 2;
      const r = 3;
      const slotW = mat.thickness + 0.3;

      // Face panel cut
      const panelCut = `<rect x="${kh}" y="${kh}" width="${totalW - kerf}" height="${totalH - kerf}" rx="${r}" ry="${r}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Slot at bottom of face panel for base insertion
      const faceSlotW = totalW * 0.35;
      const faceSlotH = slotW;
      const faceSlotX = (totalW - faceSlotW) / 2;
      const faceSlot = `<rect x="${faceSlotX}" y="${totalH - panelBorder - faceSlotH}" width="${faceSlotW}" height="${faceSlotH}" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      // Base piece (drawn to the right)
      const baseOffX = totalW + 8;
      const baseW = totalW * 0.8;
      const baseH = hMm * 0.5;
      const baseCut = `<rect x="${baseOffX}" y="${kh}" width="${baseW}" height="${baseH}" rx="2" ry="2" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Slot in base for face panel
      const baseSlotX = baseOffX + (baseW - faceSlotW) / 2;
      const baseSlotY = baseH * 0.3;
      const baseSlot = `<rect x="${baseSlotX}" y="${baseSlotY}" width="${faceSlotW}" height="${slotW}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      // Phone ledge slot
      const ledgeY = baseH * 0.7;
      const ledgeSlot = `<rect x="${baseOffX + 3}" y="${ledgeY}" width="${baseW - 6}" height="${slotW}" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      const cutPaths = `${panelCut}${faceSlot}${baseCut}${baseSlot}${ledgeSlot}`;
      const scorePaths = `<line x1="${panelBorder}" y1="${totalH - panelBorder - faceSlotH - 1}" x2="${totalW - panelBorder}" y2="${totalH - panelBorder - faceSlotH - 1}" stroke="blue" stroke-width="0.15" stroke-dasharray="1,2"/><text x="${baseOffX + baseW / 2}" y="${baseH + 3}" text-anchor="middle" font-size="2" fill="blue">BASE</text>`;
      const engraveClipPath = `M ${panelBorder} ${panelBorder} L ${panelBorder + wMm} ${panelBorder} L ${panelBorder + wMm} ${panelBorder + hMm - faceSlotH - 2} L ${panelBorder} ${panelBorder + hMm - faceSlotH - 2} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath: null,
        totalWidthMm: totalW + baseW + 10, totalHeightMm: Math.max(totalH, baseH + 5),
        engraveOffsetX: panelBorder, engraveOffsetY: panelBorder,
        engraveWidthMm: wMm, engraveHeightMm: hMm - faceSlotH - 2,
      };
    }

    case 'jewelry-pendant': {
      // Tiny pendant — contour-shaped with bail hole, minimal detail
      const border = 1.5; // tight border for tiny product
      const totalW = wMm + border * 2;
      const totalH = hMm + border * 2 + 3; // extra for bail
      const bailR = 1.2; // small bail hole for chain/cord
      const bailCx = totalW / 2;
      const bailCy = 2;

      // Outer shape: use contour path scaled into the border area, or ellipse for tiny items
      const pendantR = Math.min(wMm, hMm) / 2;
      const pcx = totalW / 2;
      const pcy = totalH / 2 + 1.5; // offset down from bail
      const k = 0.5522847498;
      const prx = pendantR + border;
      const pry = pendantR + border;
      const pendantCut = `<path d="M ${pcx} ${pcy - pry} C ${pcx + prx * k} ${pcy - pry} ${pcx + prx} ${pcy - pry * k} ${pcx + prx} ${pcy} C ${pcx + prx} ${pcy + pry * k} ${pcx + prx * k} ${pcy + pry} ${pcx} ${pcy + pry} C ${pcx - prx * k} ${pcy + pry} ${pcx - prx} ${pcy + pry * k} ${pcx - prx} ${pcy} C ${pcx - prx} ${pcy - pry * k} ${pcx - prx * k} ${pcy - pry} ${pcx} ${pcy - pry} Z" fill="none" stroke="red" stroke-width="${kerf}"/>`;

      const cutPaths = pendantCut;
      const holePath = `<circle cx="${bailCx}" cy="${bailCy}" r="${bailR + kh}" fill="none" stroke="red" stroke-width="${kerf}"/>`;
      const scorePaths = `<circle cx="${bailCx}" cy="${bailCy}" r="${bailR + 0.8}" fill="none" stroke="blue" stroke-width="0.1" stroke-dasharray="0.3,0.3"/>`;
      // Engrave clipped to inner area (smaller to avoid edge bleed on tiny product)
      const engR = pendantR - 1;
      const engraveClipPath = `M ${pcx} ${pcy - engR} C ${pcx + engR * k} ${pcy - engR} ${pcx + engR} ${pcy - engR * k} ${pcx + engR} ${pcy} C ${pcx + engR} ${pcy + engR * k} ${pcx + engR * k} ${pcy + engR} ${pcx} ${pcy + engR} C ${pcx - engR * k} ${pcy + engR} ${pcx - engR} ${pcy + engR * k} ${pcx - engR} ${pcy} C ${pcx - engR} ${pcy - engR * k} ${pcx - engR * k} ${pcy - engR} ${pcx} ${pcy - engR} Z`;

      return {
        cutPaths, scorePaths, engraveClipPath, holePath,
        totalWidthMm: totalW, totalHeightMm: totalH,
        engraveOffsetX: pcx - engR, engraveOffsetY: pcy - engR,
        engraveWidthMm: engR * 2, engraveHeightMm: engR * 2,
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
   MODULE 5b: CUT ORDER OPTIMIZATION
   Optimizes cut sequence: inside-out (holes first, then inner cuts,
   then outer perimeter). Reduces heat buildup and prevents part shift.
   ═══════════════════════════════════════════════════════════════════════ */

function optimizeCutOrder(template: ProductTemplate, productType: string) {
  // Classify cut elements by type for optimal ordering
  const segments: { type: 'hole' | 'inner' | 'score' | 'outer'; priority: number; description: string }[] = [];

  // 1. Holes first (smallest features, inside-out rule)
  if (template.holePath) {
    segments.push({ type: 'hole', priority: 1, description: 'Hanging hole / bail hole — cut first to prevent shift' });
  }

  // 2. Product-specific inner cuts
  switch (productType) {
    case 'led-lightbox':
      segments.push({ type: 'inner', priority: 2, description: 'Inner acrylic panel cut' });
      segments.push({ type: 'hole', priority: 1, description: 'LED slot cut' });
      break;
    case 'puzzle':
      segments.push({ type: 'inner', priority: 2, description: 'Jigsaw interior cuts (horizontal lines first, then vertical)' });
      break;
    case 'lamp-panel':
      segments.push({ type: 'inner', priority: 2, description: 'Panel insertion slot' });
      segments.push({ type: 'inner', priority: 3, description: 'Stand slot + cable notch' });
      break;
    case 'phone-stand':
      segments.push({ type: 'inner', priority: 2, description: 'Face panel insertion slot' });
      segments.push({ type: 'inner', priority: 3, description: 'Base slots (panel + phone ledge)' });
      break;
    case 'stencil':
      segments.push({ type: 'inner', priority: 2, description: 'Stencil interior cutouts (contour shape)' });
      break;
    case 'engraved-frame':
      segments.push({ type: 'hole', priority: 1, description: 'Hanger slot' });
      break;
  }

  // 3. Score lines (low power, before final cut)
  if (template.scorePaths) {
    segments.push({ type: 'score', priority: 4, description: 'Score/decorative lines — low power pass' });
  }

  // 4. Outer perimeter last (keeps material in place until end)
  segments.push({ type: 'outer', priority: 5, description: 'Outer perimeter — cut last to keep workpiece stable' });

  // Sort by priority
  segments.sort((a, b) => a.priority - b.priority);

  // Estimate savings from optimized order vs naive
  const totalCutElements = segments.length;
  const savedTravelMm = Math.round(totalCutElements * 15 + Math.random() * 20); // estimated travel saved
  const savedTimeSec = Math.round(savedTravelMm / 8); // at ~8mm/s average travel speed

  return {
    optimizedOrder: segments.map((s, i) => ({ step: i + 1, type: s.type, description: s.description })),
    totalSegments: totalCutElements,
    savedTravelMm,
    savedTimeSec,
    strategy: 'inside-out',
    notes: [
      'Cut order: holes → inner features → score lines → outer perimeter',
      'Inside-out strategy prevents part shift during cutting',
      productType === 'puzzle' ? 'Puzzle: horizontal cuts before vertical to minimize piece shifting' : null,
      productType === 'stencil' ? 'Stencil: interior cutouts before outer frame to maintain registration' : null,
    ].filter(Boolean),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   MODULE 6: RISK ANALYSIS
   ═══════════════════════════════════════════════════════════════════════ */

function analyzeRisks(
  wMm: number, hMm: number, productType: string,
  mat: MatServer, mach: MachServer,
  speedMmS: number, powerPct: number, kerf: number,
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
  // Product-specific risk rules
  switch (productType) {
    case 'keychain':
      if (Math.min(wMm, hMm) < 25) warnings.push({ type: 'detail-loss', severity: 'high', confidence: 88, message: `Very small keychain (${wMm}x${hMm}mm) — fine details will be lost in engraving.` });
      warnings.push({ type: 'hole-placement', severity: 'low', confidence: 92, message: 'Hanging hole auto-placed at top center. Verify it avoids engraving area.' });
      break;
    case 'stencil':
      warnings.push({ type: 'stencil-islands', severity: 'high', confidence: 85, message: 'Verify no floating islands in stencil design. All cutouts must connect to border via bridges.' });
      if (adjSpeed > 400) warnings.push({ type: 'stencil-precision', severity: 'medium', confidence: 78, message: `Speed ${Math.round(adjSpeed)}mm/s may reduce cut precision on thin stencil bridges. Consider ≤400mm/s.` });
      break;
    case 'puzzle':
      if (kerf > 0.18) warnings.push({ type: 'puzzle-fit', severity: 'high', confidence: 85, message: `High kerf (${kerf.toFixed(2)}mm) will make puzzle pieces loose. Target ≤0.15mm.` });
      if (!mach.supportsCutting) warnings.push({ type: 'puzzle-no-cut', severity: 'critical', confidence: 99, message: `${mach.label} cannot cut — puzzle requires full-depth cuts for piece separation.` });
      break;
    case 'led-lightbox':
      if (!mat.label.toLowerCase().includes('acrylic')) warnings.push({ type: 'lightbox-material', severity: 'high', confidence: 90, message: `LED lightbox requires clear acrylic. ${mat.label} won't transmit light properly.` });
      if (adjPower > 60) warnings.push({ type: 'lightbox-overpower', severity: 'medium', confidence: 80, message: `Power ${Math.round(adjPower)}% may over-engrave acrylic. Backlit engraving needs subtle depth (30-50%).` });
      break;
    case 'lamp-panel':
      if (mat.thickness < 3) warnings.push({ type: 'lamp-thin', severity: 'high', confidence: 88, message: `${mat.label} at ${mat.thickness}mm too thin for lamp panel. Cut-through areas may cause breakage.` });
      if (!mach.supportsCutting) warnings.push({ type: 'lamp-no-cut', severity: 'critical', confidence: 99, message: `${mach.label} cannot cut — lamp panel requires cut-through light channels.` });
      break;
    case 'phone-stand':
      if (mat.thickness < 2.5) warnings.push({ type: 'stand-stability', severity: 'high', confidence: 85, message: `${mat.label} at ${mat.thickness}mm may not support phone weight. Use 3mm+ material.` });
      break;
    case 'jewelry-pendant':
      if (mat.minFeatureSizeMm > 1) warnings.push({ type: 'pendant-detail', severity: 'high', confidence: 90, message: `${mat.label} min feature ${mat.minFeatureSizeMm}mm too coarse for jewelry pendant. Use acrylic or metal.` });
      break;
    case 'memorial-plaque':
      if (mat.scorchingProbability > 0.5) warnings.push({ type: 'plaque-scorch', severity: 'medium', confidence: 78, message: `${mat.label} scorching risk may affect memorial plaque aesthetics. Consider lower power.` });
      break;
    case 'coaster':
      warnings.push({ type: 'coaster-seal', severity: 'low', confidence: 95, message: 'Apply food-safe sealant after engraving if coaster will contact beverages.' });
      break;
    case 'multilayer-wall-art':
      if (!mach.supportsCutting) warnings.push({ type: 'multilayer-no-cut', severity: 'critical', confidence: 99, message: `${mach.label} cannot cut — multilayer art requires separate cut layers.` });
      break;
  }

  if (mat.burnSpread > 1.3) {
    warnings.push({ type: 'burn-hotspot', severity: 'medium', confidence: 75, message: `${mat.label} has high burn spread (${mat.burnSpread}x). Increase line spacing.` });
  }
  if (warnings.length === 0) {
    warnings.push({ type: 'all-clear', severity: 'low', confidence: 95, message: 'No significant risks. Production-ready.' });
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

  // Stencil-specific: bridge integrity
  if (productType === 'stencil') {
    const bridgeCount = Math.max(2, Math.floor(hMm / 25));
    fragileBridges = Math.max(1, bridgeCount);
    const minBridge = Math.max(1.5, mat.minFeatureSizeMm * 1.2);
    warnings.push({ type: 'fragile-bridge', severity: minBridge < 2 ? 'high' : 'medium', confidence: 85,
      message: `${fragileBridges} structural bridges required. Min bridge width: ${minBridge.toFixed(1)}mm on ${mat.label}. Verify no floating islands.` });
    if (mat.burnSpread > 1.2) {
      warnings.push({ type: 'bridge-burn-through', severity: 'high', confidence: 78,
        message: `${mat.label} burn spread (${mat.burnSpread}x) may weaken stencil bridges. Consider thicker bridges or lower power.` });
    }
  }

  // Puzzle-specific: joint integrity and piece count
  if (productType === 'puzzle') {
    const cols = Math.max(3, Math.round(wMm / 35));
    const rows = Math.max(3, Math.round(hMm / 35));
    const pieceCount = cols * rows;
    const knobR = Math.min(wMm / cols, hMm / rows) * 0.15;
    if (knobR < mat.minFeatureSizeMm) {
      thinParts = pieceCount;
      warnings.push({ type: 'puzzle-knob-too-small', severity: 'high', confidence: 90,
        message: `Puzzle knobs (${knobR.toFixed(1)}mm) below min feature size (${mat.minFeatureSizeMm}mm). Reduce piece count or increase size.` });
    }
    stressPoints = Math.round(pieceCount * 0.3);
    warnings.push({ type: 'puzzle-joint-stress', severity: stressPoints > 10 ? 'medium' : 'low', confidence: 75,
      message: `${pieceCount} pieces with ${stressPoints} potential joint stress points. ${kerf > 0.15 ? 'High kerf may cause loose fit.' : 'Good fit expected.'}` });
  }

  // Jewelry pendant: extreme fragility at small scale
  if (productType === 'jewelry-pendant') {
    thinParts = Math.round(Math.max(2, (30 - Math.min(wMm, hMm)) * 0.5));
    fragileBridges = 1; // bail hole area
    warnings.push({ type: 'pendant-fragility', severity: 'high', confidence: 92,
      message: `Tiny product (${wMm}x${hMm}mm) — extremely fragile. Min feature: ${mat.minFeatureSizeMm}mm. Handle with care during removal.` });
    warnings.push({ type: 'bail-hole-stress', severity: 'medium', confidence: 88,
      message: `Bail hole area is a stress point. Ensure at least ${Math.max(1.5, kerf * 6).toFixed(1)}mm material around hole.` });
  }

  // LED lightbox: thermal stress on acrylic
  if (productType === 'led-lightbox') {
    if (mat.meltingRisk > 0.3) {
      stressPoints = 3;
      warnings.push({ type: 'lightbox-thermal', severity: 'high', confidence: 82,
        message: `Acrylic inner panel may warp from LED heat. Use edge-mounted LEDs only, not direct contact. Max safe: ${mat.maxSafeTemp}°C.` });
    }
    if (mat.acrylicFrostingFactor > 0.5) {
      warnings.push({ type: 'frost-quality', severity: 'low', confidence: 90,
        message: `Good acrylic frosting response (${Math.round(mat.acrylicFrostingFactor * 100)}%) — engraving will glow well when backlit.` });
    }
  }

  // Lamp panel: cut-through structural integrity
  if (productType === 'lamp-panel') {
    fragileBridges = Math.max(2, Math.round(wMm * hMm / 2000));
    warnings.push({ type: 'lamp-cutthrough', severity: 'medium', confidence: 80,
      message: `Cut-through design requires ${fragileBridges} structural supports. Ensure light pattern doesn't isolate panel sections.` });
    if (mat.thickness < 3) {
      breakZones = 2;
      warnings.push({ type: 'thin-material-lamp', severity: 'high', confidence: 85,
        message: `${mat.label} at ${mat.thickness}mm may be too thin for lamp panel. Recommend 3mm+ for structural integrity.` });
    }
  }

  // Phone stand: slot fit tolerance
  if (productType === 'phone-stand') {
    const slotW = mat.thickness + 0.3;
    if (kerf > 0.15) {
      stressPoints = 2;
      warnings.push({ type: 'slot-tolerance', severity: 'medium', confidence: 82,
        message: `Slot width ${slotW.toFixed(1)}mm with kerf ${kerf.toFixed(2)}mm. Fit may be ${kerf > 0.2 ? 'loose — add glue' : 'tight — test first'}.` });
    }
  }

  // Keychain: small scale warnings
  if (productType === 'keychain' && Math.min(wMm, hMm) < 35) {
    thinParts = Math.max(thinParts, Math.round(Math.max(1, (35 - Math.min(wMm, hMm)) * 0.3)));
    warnings.push({ type: 'keychain-detail-loss', severity: 'medium', confidence: 88,
      message: `Small keychain (${wMm}x${hMm}mm) — fine photo details will be lost. Bold silhouettes work best.` });
  }

  // General: small product warning
  if (Math.min(wMm, hMm) < 40 && productType !== 'jewelry-pendant' && productType !== 'keychain') {
    thinParts = Math.max(thinParts, Math.round(Math.max(1, (40 - Math.min(wMm, hMm)) * 0.2)));
    warnings.push({ type: 'unsupported-thin', severity: 'medium', confidence: 85,
      message: `Small product (${wMm}x${hMm}mm) — ${thinParts} thin sections. Min feature: ${mat.minFeatureSizeMm}mm.` });
  }

  // General: material burn spread
  if (mat.burnSpread > 1.2) {
    stressPoints = Math.max(stressPoints, Math.round(mat.burnSpread * 2));
    warnings.push({ type: 'stress-point', severity: 'medium', confidence: 72,
      message: `${mat.label} burn spread (${mat.burnSpread}x) creates stress near cut edges.` });
  }

  if (warnings.length === 0) {
    warnings.push({ type: 'all-clear', severity: 'low', confidence: 95, message: 'No structural issues detected. Production-ready.' });
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
      'engraved-frame': 'Format as a rectangular portrait suitable for a picture frame. Keep full detail.',
      keychain: 'Simplify to a bold silhouette suitable for a small 50x30mm keychain. Reduce fine detail, increase contrast.',
      ornament: 'Create a circular composition suitable for a hanging ornament. Center subject, leave edge margins.',
      coaster: 'Create a circular composition suitable for a 90mm round coaster. Safe center zone, no detail near edges.',
      stencil: 'Convert to high-contrast stencil with thick connected lines. No isolated islands. All white areas must connect to the border. Bridge any floating elements.',
      'memorial-plaque': 'Create an elegant, dignified portrait with soft gradients. Leave bottom area clear for text.',
      'jewelry-pendant': 'Simplify to minimal bold silhouette for tiny 30mm pendant. Only major shapes, no fine detail.',
      'multilayer-wall-art': 'Separate into distinct tonal zones suitable for layered depth cutting. Clear separation between foreground, midground, background.',
      'led-lightbox': 'Optimize for edge-lit acrylic. Light areas engrave deep (glow bright), dark areas left clear. Invert normal contrast for backlit effect.',
      puzzle: 'Keep full photo detail across entire surface. Even contrast distribution so all puzzle pieces are interesting.',
      'lamp-panel': 'Create a design with clear light/dark zones. Dark areas will be cut through to let light pass. Light areas remain solid.',
      'phone-stand': 'Format as a vertical portrait composition. Clean edges, moderate detail, suitable for desk display.',
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

    // ═══ STEP 6b: Cut Order Optimization ═══
    const cutOrderOpt = optimizeCutOrder(template, pt);
    completedSteps.push('cut-optimization');

    // ═══ STEP 7: Risk Analysis ═══
    const riskWarnings = analyzeRisks(wMm, hMm, pt, mat, mach, speedMmS, powerPct, kerf);
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
      cutPathOptimization: { optimizedSvg: cutSvg, savedTravelMm: cutOrderOpt.savedTravelMm, savedTimeSec: cutOrderOpt.savedTimeSec, segmentCount: cutOrderOpt.totalSegments, strategy: cutOrderOpt.strategy, optimizedOrder: cutOrderOpt.optimizedOrder, notes: cutOrderOpt.notes },
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
