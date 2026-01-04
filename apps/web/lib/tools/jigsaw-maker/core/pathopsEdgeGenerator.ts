/**
 * PathOps-based Jigsaw Edge Generator
 * Uses PathKit/CanvasKit WASM for robust geometry operations
 * 
 * NON-NEGOTIABLES:
 * - No Paper.js for boolean/offset
 * - Use PathOps WASM for any boolean/offset operations
 * - Deterministic generation (same seed => same puzzle)
 * - Classic round knobs (not sharp)
 * - Interlocking edges match perfectly (male/female pairs)
 */

import type { PathOps } from '../../../geometry/pathops';
import { createSeededRandom, randomInRange } from './random';

export interface Point {
  x: number;
  y: number;
}

export interface EdgeSpec {
  length: number;
  dir: 'h' | 'v';
  sign: 1 | -1; // knob out (+) or in (-)
  knobSize: number; // in mm
  roundness: number; // 0.6..1
  jitter: number; // 0..0.35
  seedKey: string; // stable per edge
}

export interface KnobParams {
  knobSizePct: number; // 40-90% of edge length
  roundness: number; // 0.6-1.0
  jitter: number; // 0-0.35
}

/**
 * Generate a classic round knob edge using cubic Bezier curves
 * Returns SVG path segment from P0 → P1
 * 
 * Classic knob structure:
 * - Approach curve (smooth entry)
 * - Neck (narrow connection)
 * - Bulge (rounded lobe, near-circular)
 * - Return curve (smooth exit)
 * - C1 continuity throughout
 */
export function generateClassicKnobEdge(
  p0: Point,
  p1: Point,
  spec: EdgeSpec
): string {
  const { length, sign, knobSize, roundness, jitter, seedKey } = spec;
  
  // Create seeded random for this edge
  const random = createSeededRandom(hashString(seedKey));
  
  // Calculate edge direction
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const L = Math.sqrt(dx * dx + dy * dy);
  
  // Unit vectors
  const ux = dx / L; // along edge
  const uy = dy / L;
  
  // Perpendicular vector (points outward when sign = +1)
  const px = -uy * sign;
  const py = ux * sign;
  
  // Knob parameters with jitter
  const jitterAmount = randomInRange(random, -jitter, jitter);
  const centerOffset = 0.5 + jitterAmount; // knob center position (0..1)
  
  // Knob dimensions (classic proportions)
  const neckWidth = knobSize * 0.35; // narrow neck
  const neckDepth = knobSize * 0.15; // how far neck extends
  const bulgeRadius = knobSize * 0.5 * roundness; // rounded bulge
  const bulgeDepth = neckDepth + bulgeRadius; // total depth
  
  // Key positions along edge (0..1)
  const center = centerOffset;
  const neckHalfWidth = neckWidth / L / 2;
  const neckStart = center - neckHalfWidth;
  const neckEnd = center + neckHalfWidth;
  
  // Helper to create point at position
  const pt = (t: number, depth: number): Point => ({
    x: p0.x + ux * L * t + px * depth,
    y: p0.y + uy * L * t + py * depth,
  });
  
  const fmt = (n: number) => n.toFixed(4);
  
  // Build path using 4-6 cubic Bezier segments
  let path = '';
  
  // 1. Approach: straight to neck start
  const neckStartPt = pt(neckStart, 0);
  path += `L ${fmt(neckStartPt.x)} ${fmt(neckStartPt.y)} `;
  
  // 2. Entry curve: edge → neck base
  const neckBaseLeft = pt(neckStart, neckDepth * 0.3);
  const ctrl1 = pt(neckStart - neckHalfWidth * 0.3, 0);
  const ctrl2 = pt(neckStart, neckDepth * 0.15);
  path += `C ${fmt(ctrl1.x)} ${fmt(ctrl1.y)} ${fmt(ctrl2.x)} ${fmt(ctrl2.y)} ${fmt(neckBaseLeft.x)} ${fmt(neckBaseLeft.y)} `;
  
  // 3. Neck to bulge left: curve outward
  const bulgeLeft = pt(center - bulgeRadius / L, neckDepth + bulgeRadius);
  const ctrl3 = pt(neckStart, neckDepth * 0.6);
  const ctrl4 = pt(center - bulgeRadius / L * 1.2, neckDepth + bulgeRadius * 0.4);
  path += `C ${fmt(ctrl3.x)} ${fmt(ctrl3.y)} ${fmt(ctrl4.x)} ${fmt(ctrl4.y)} ${fmt(bulgeLeft.x)} ${fmt(bulgeLeft.y)} `;
  
  // 4. Bulge left to top: quarter circle (Bezier approximation)
  const k = 0.5523; // magic number for circle
  const bulgeTop = pt(center, neckDepth + bulgeRadius * 2);
  const ctrl5 = pt(center - bulgeRadius / L, neckDepth + bulgeRadius + bulgeRadius * k);
  const ctrl6 = pt(center - bulgeRadius / L * k, neckDepth + bulgeRadius * 2);
  path += `C ${fmt(ctrl5.x)} ${fmt(ctrl5.y)} ${fmt(ctrl6.x)} ${fmt(ctrl6.y)} ${fmt(bulgeTop.x)} ${fmt(bulgeTop.y)} `;
  
  // 5. Bulge top to right: quarter circle
  const bulgeRight = pt(center + bulgeRadius / L, neckDepth + bulgeRadius);
  const ctrl7 = pt(center + bulgeRadius / L * k, neckDepth + bulgeRadius * 2);
  const ctrl8 = pt(center + bulgeRadius / L, neckDepth + bulgeRadius + bulgeRadius * k);
  path += `C ${fmt(ctrl7.x)} ${fmt(ctrl7.y)} ${fmt(ctrl8.x)} ${fmt(ctrl8.y)} ${fmt(bulgeRight.x)} ${fmt(bulgeRight.y)} `;
  
  // 6. Bulge right to neck base: curve inward
  const neckBaseRight = pt(neckEnd, neckDepth * 0.3);
  const ctrl9 = pt(center + bulgeRadius / L * 1.2, neckDepth + bulgeRadius * 0.4);
  const ctrl10 = pt(neckEnd, neckDepth * 0.6);
  path += `C ${fmt(ctrl9.x)} ${fmt(ctrl9.y)} ${fmt(ctrl10.x)} ${fmt(ctrl10.y)} ${fmt(neckBaseRight.x)} ${fmt(neckBaseRight.y)} `;
  
  // 7. Exit curve: neck base → edge
  const neckEndPt = pt(neckEnd, 0);
  const ctrl11 = pt(neckEnd, neckDepth * 0.15);
  const ctrl12 = pt(neckEnd + neckHalfWidth * 0.3, 0);
  path += `C ${fmt(ctrl11.x)} ${fmt(ctrl11.y)} ${fmt(ctrl12.x)} ${fmt(ctrl12.y)} ${fmt(neckEndPt.x)} ${fmt(neckEndPt.y)} `;
  
  // 8. Final straight to end
  path += `L ${fmt(p1.x)} ${fmt(p1.y)}`;
  
  return path;
}

/**
 * Generate a straight edge (for borders)
 */
export function generateStraightEdge(p0: Point, p1: Point): string {
  return `L ${p1.x.toFixed(4)} ${p1.y.toFixed(4)}`;
}

/**
 * Simple string hash for seeding
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Create edge specification for grid position
 */
export function createEdgeSpec(
  row: number,
  col: number,
  isHorizontal: boolean,
  edgeLength: number,
  knobOutward: boolean,
  params: KnobParams,
  seed: number
): EdgeSpec {
  const seedKey = `${seed}-${isHorizontal ? 'h' : 'v'}-${row}-${col}`;
  
  return {
    length: edgeLength,
    dir: isHorizontal ? 'h' : 'v',
    sign: knobOutward ? 1 : -1,
    knobSize: edgeLength * (params.knobSizePct / 100),
    roundness: params.roundness,
    jitter: params.jitter,
    seedKey,
  };
}
