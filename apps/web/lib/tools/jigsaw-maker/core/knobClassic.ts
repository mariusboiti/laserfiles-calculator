/**
 * Classic Round Knob Generator (Ravensburger-style)
 * 
 * Creates smooth round bulb + narrow neck knobs using cubic Beziers
 * with C1 continuity throughout.
 */

import type { CubicBezier, Point } from './utils/svgPath';
import { createSeededRandom, randomRange } from './utils/rng';

export interface KnobParams {
  L: number;              // Edge length
  depthSign: 1 | -1;      // +1 = tab (outward), -1 = blank (inward)
  seed: number;           // Random seed for this edge
  
  // Optional overrides (use defaults if not provided)
  neckWidthRatio?: number;    // Default: 0.18
  bulbWidthRatio?: number;    // Default: 0.42
  depthRatio?: number;        // Default: 0.28
  shoulderRatio?: number;     // Default: 0.10
  smoothness?: number;        // Default: 0.55 (control point tension)
}

export interface KnobGeometry {
  neckWidth: number;
  bulbWidth: number;
  depth: number;
  shoulder: number;
  smoothness: number;
}

/**
 * Generate classic round knob edge
 * Returns array of cubic Bezier segments in local coordinates
 * Edge goes from (0,0) to (L,0)
 */
export function generateClassicKnob(params: KnobParams): CubicBezier[] {
  const { L, depthSign, seed } = params;
  
  // Create seeded RNG for this edge
  const rng = createSeededRandom(seed);
  
  // Calculate geometry with controlled randomness
  const geom = calculateKnobGeometry(L, params, rng);
  
  // Build the knob path
  return buildKnobPath(L, depthSign, geom);
}

/**
 * Calculate knob geometry with controlled randomness
 */
function calculateKnobGeometry(
  L: number,
  params: KnobParams,
  rng: () => number
): KnobGeometry {
  // Base ratios (can be overridden)
  const neckWidthRatio = params.neckWidthRatio ?? 0.18;
  const bulbWidthRatio = params.bulbWidthRatio ?? 0.42;
  const depthRatio = params.depthRatio ?? 0.28;
  const shoulderRatio = params.shoulderRatio ?? 0.10;
  const smoothness = params.smoothness ?? 0.55;
  
  // Apply controlled randomness (symmetric variations)
  const depthVar = randomRange(rng, 0.92, 1.08);
  const bulbVar = randomRange(rng, 0.94, 1.06);
  const neckVar = randomRange(rng, 0.95, 1.05);
  
  return {
    neckWidth: L * neckWidthRatio * neckVar,
    bulbWidth: L * bulbWidthRatio * bulbVar,
    depth: L * depthRatio * depthVar,
    shoulder: L * shoulderRatio,
    smoothness,
  };
}

/**
 * Build knob path from geometry
 * 
 * Structure:
 * - Flat start
 * - Shoulder curve (rising from baseline)
 * - Neck curve (narrow section)
 * - Bulb curve (rounded top, 2 segments for smooth circle)
 * - Neck curve back (symmetric)
 * - Shoulder curve back (returning to baseline)
 * - Flat end
 */
function buildKnobPath(
  L: number,
  depthSign: 1 | -1,
  geom: KnobGeometry
): CubicBezier[] {
  const { neckWidth, bulbWidth, depth, shoulder, smoothness } = geom;
  
  // Key X positions (centered on L/2)
  const centerX = L / 2;
  const a = centerX - bulbWidth / 2 - shoulder;  // Shoulder start
  const b = centerX - neckWidth / 2;              // Neck start
  const c = centerX + neckWidth / 2;              // Neck end
  const d = centerX + bulbWidth / 2 + shoulder;  // Shoulder end
  
  // Y positions
  const y0 = 0;                           // Baseline
  const yNeck = depthSign * depth * 0.3;  // Neck base
  const yBulb = depthSign * depth;        // Bulb top
  
  const segments: CubicBezier[] = [];
  
  // 1. Flat start (0 to a)
  // (implicit - we start at origin)
  
  // 2. Shoulder curve: rising from baseline to neck base (left side)
  const shoulderLeftStart: Point = { x: a, y: y0 };
  const shoulderLeftEnd: Point = { x: b, y: yNeck };
  const shoulderLeftCP1: Point = {
    x: a + shoulder * smoothness,
    y: y0,
  };
  const shoulderLeftCP2: Point = {
    x: b - (b - a) * smoothness * 0.5,
    y: yNeck * 0.6,
  };
  
  segments.push({
    start: shoulderLeftStart,
    cp1: shoulderLeftCP1,
    cp2: shoulderLeftCP2,
    end: shoulderLeftEnd,
  });
  
  // 3. Neck curve: from neck base to bulb start (left side)
  const neckLeftStart: Point = { x: b, y: yNeck };
  const bulbLeftX = centerX - bulbWidth * 0.35;
  const neckLeftEnd: Point = { x: bulbLeftX, y: yBulb * 0.85 };
  const neckLeftCP1: Point = {
    x: b,
    y: yNeck + (yBulb - yNeck) * 0.4,
  };
  const neckLeftCP2: Point = {
    x: bulbLeftX - neckWidth * 0.3,
    y: yBulb * 0.7,
  };
  
  segments.push({
    start: neckLeftStart,
    cp1: neckLeftCP1,
    cp2: neckLeftCP2,
    end: neckLeftEnd,
  });
  
  // 4. Bulb left arc: quarter circle approximation
  const k = 0.5523; // Bezier magic number for circular arcs
  const bulbRadius = bulbWidth * 0.45;
  
  const bulbLeftStart: Point = neckLeftEnd;
  const bulbTopX = centerX;
  const bulbTopY = yBulb;
  const bulbTopPoint: Point = { x: bulbTopX, y: bulbTopY };
  
  const bulbLeftCP1: Point = {
    x: bulbLeftStart.x,
    y: bulbLeftStart.y + depthSign * bulbRadius * k * 0.6,
  };
  const bulbLeftCP2: Point = {
    x: bulbTopX - bulbRadius * k * 0.7,
    y: bulbTopY,
  };
  
  segments.push({
    start: bulbLeftStart,
    cp1: bulbLeftCP1,
    cp2: bulbLeftCP2,
    end: bulbTopPoint,
  });
  
  // 5. Bulb right arc: quarter circle approximation
  const bulbRightX = centerX + bulbWidth * 0.35;
  const bulbRightEnd: Point = { x: bulbRightX, y: yBulb * 0.85 };
  
  const bulbRightCP1: Point = {
    x: bulbTopX + bulbRadius * k * 0.7,
    y: bulbTopY,
  };
  const bulbRightCP2: Point = {
    x: bulbRightEnd.x,
    y: bulbRightEnd.y + depthSign * bulbRadius * k * 0.6,
  };
  
  segments.push({
    start: bulbTopPoint,
    cp1: bulbRightCP1,
    cp2: bulbRightCP2,
    end: bulbRightEnd,
  });
  
  // 6. Neck curve back: from bulb to neck base (right side)
  const neckRightStart: Point = bulbRightEnd;
  const neckRightEnd: Point = { x: c, y: yNeck };
  const neckRightCP1: Point = {
    x: bulbRightX + neckWidth * 0.3,
    y: yBulb * 0.7,
  };
  const neckRightCP2: Point = {
    x: c,
    y: yNeck + (yBulb - yNeck) * 0.4,
  };
  
  segments.push({
    start: neckRightStart,
    cp1: neckRightCP1,
    cp2: neckRightCP2,
    end: neckRightEnd,
  });
  
  // 7. Shoulder curve back: from neck base to baseline (right side)
  const shoulderRightStart: Point = { x: c, y: yNeck };
  const shoulderRightEnd: Point = { x: d, y: y0 };
  const shoulderRightCP1: Point = {
    x: c + (d - c) * smoothness * 0.5,
    y: yNeck * 0.6,
  };
  const shoulderRightCP2: Point = {
    x: d - shoulder * smoothness,
    y: y0,
  };
  
  segments.push({
    start: shoulderRightStart,
    cp1: shoulderRightCP1,
    cp2: shoulderRightCP2,
    end: shoulderRightEnd,
  });
  
  // 8. Flat end (d to L)
  // (implicit - will be added when building full piece path)
  
  return segments;
}

/**
 * Generate straight edge (for borders)
 */
export function generateStraightEdge(L: number): CubicBezier[] {
  // Return empty array - straight line will be added as L command
  return [];
}

/**
 * Invert edge (reverse + flip Y for tab/blank conversion)
 */
export function invertEdge(segments: CubicBezier[]): CubicBezier[] {
  // Reverse order and flip Y coordinates
  return segments.map(seg => ({
    start: { x: seg.end.x, y: -seg.end.y },
    cp1: { x: seg.cp2.x, y: -seg.cp2.y },
    cp2: { x: seg.cp1.x, y: -seg.cp1.y },
    end: { x: seg.start.x, y: -seg.start.y },
  })).reverse();
}
