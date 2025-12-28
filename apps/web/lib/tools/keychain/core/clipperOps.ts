/**
 * Clipper Operations - Robust polygon boolean operations
 * Uses clipper2-js for union, offset, difference with proper cleanup
 */

import { mmToU, uToMm, MIN_AREA_U2, CLEAN_DISTANCE_U, UNITS_PER_MM } from './geomUnits';
import type { IntPolygon, IntPolygons } from './pathToPolys';

// Clipper2 will be loaded dynamically
let Clipper: any = null;
let isInitialized = false;

/**
 * Initialize Clipper2 library
 */
async function initClipper(): Promise<void> {
  if (isInitialized) return;
  
  try {
    const clipperModule = await import('clipper2-js');
    Clipper = clipperModule;
    isInitialized = true;
  } catch (e) {
    console.error('Failed to load clipper2-js:', e);
    throw new Error('Clipper2 not available');
  }
}

/**
 * Convert our IntPolygon to Clipper Path64 format
 */
function toClipperPaths(polys: IntPolygons): any[] {
  return polys.map(poly => 
    poly.map(pt => ({ x: BigInt(pt.x), y: BigInt(pt.y) }))
  );
}

/**
 * Convert Clipper Path64 back to our IntPolygons
 */
function fromClipperPaths(paths: any[]): IntPolygons {
  return paths.map(path =>
    path.map((pt: any) => ({
      x: Number(pt.x),
      y: Number(pt.y)
    }))
  );
}

/**
 * Union multiple polygon sets into one
 */
export async function unionPolys(polyGroups: IntPolygons[]): Promise<IntPolygons> {
  await initClipper();
  
  // Flatten all groups into one array
  const allPolys: IntPolygons = [];
  for (const group of polyGroups) {
    allPolys.push(...group);
  }
  
  if (allPolys.length === 0) return [];
  if (allPolys.length === 1) return allPolys;
  
  try {
    const clipperPaths = toClipperPaths(allPolys);
    const result = Clipper.Union(clipperPaths, Clipper.FillRule.NonZero);
    return fromClipperPaths(result);
  } catch (e) {
    console.error('Union failed:', e);
    return allPolys;
  }
}

/**
 * Offset polygons outward (positive) or inward (negative)
 * Uses round joins for smooth result
 */
export async function offsetPolys(polys: IntPolygons, deltaMm: number): Promise<IntPolygons> {
  await initClipper();
  
  if (polys.length === 0) return [];
  if (deltaMm === 0) return polys;
  
  try {
    const clipperPaths = toClipperPaths(polys);
    const deltaU = deltaMm * UNITS_PER_MM;
    
    const result = Clipper.InflatePaths(
      clipperPaths,
      deltaU,
      Clipper.JoinType.Round,
      Clipper.EndType.Polygon,
      2.0 // miter limit
    );
    
    return fromClipperPaths(result);
  } catch (e) {
    console.error('Offset failed:', e);
    return polys;
  }
}

/**
 * Difference: subtract B from A
 */
export async function diffPolys(polyA: IntPolygons, polyB: IntPolygons): Promise<IntPolygons> {
  await initClipper();
  
  if (polyA.length === 0) return [];
  if (polyB.length === 0) return polyA;
  
  try {
    const clipperPathsA = toClipperPaths(polyA);
    const clipperPathsB = toClipperPaths(polyB);
    
    const result = Clipper.Difference(
      clipperPathsA,
      clipperPathsB,
      Clipper.FillRule.NonZero
    );
    
    return fromClipperPaths(result);
  } catch (e) {
    console.error('Difference failed:', e);
    return polyA;
  }
}

/**
 * Clean and simplify polygons:
 * - Remove tiny islands (area < threshold)
 * - Remove duplicate/close points
 * - Ensure consistent winding
 */
export function cleanPolys(polys: IntPolygons): IntPolygons {
  const cleaned: IntPolygons = [];
  
  for (const poly of polys) {
    // Skip degenerate polygons
    if (poly.length < 3) continue;
    
    // Remove duplicate consecutive points
    const deduped = removeDuplicatePoints(poly, CLEAN_DISTANCE_U);
    if (deduped.length < 3) continue;
    
    // Calculate area
    const area = calculateArea(deduped);
    
    // Skip tiny islands
    if (Math.abs(area) < MIN_AREA_U2) continue;
    
    // Ensure counter-clockwise winding for outer paths
    // (Clipper convention: positive area = counter-clockwise)
    const normalizedPoly = area < 0 ? deduped.slice().reverse() : deduped;
    
    cleaned.push(normalizedPoly);
  }
  
  return cleaned;
}

/**
 * Remove duplicate/very close consecutive points
 */
function removeDuplicatePoints(poly: IntPolygon, minDist: number): IntPolygon {
  if (poly.length < 2) return poly;
  
  const result: IntPolygon = [poly[0]];
  const minDistSq = minDist * minDist;
  
  for (let i = 1; i < poly.length; i++) {
    const prev = result[result.length - 1];
    const curr = poly[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    
    if (dx * dx + dy * dy > minDistSq) {
      result.push(curr);
    }
  }
  
  // Check if last point is too close to first
  if (result.length > 2) {
    const first = result[0];
    const last = result[result.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    
    if (dx * dx + dy * dy <= minDistSq) {
      result.pop();
    }
  }
  
  return result;
}

/**
 * Calculate signed area of polygon (shoelace formula)
 * Positive = counter-clockwise, Negative = clockwise
 */
function calculateArea(poly: IntPolygon): number {
  if (poly.length < 3) return 0;
  
  let area = 0;
  const n = poly.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i].x * poly[j].y;
    area -= poly[j].x * poly[i].y;
  }
  
  return area / 2;
}

/**
 * Create circle polygon (for ring)
 */
export function createCircle(cx: number, cy: number, radiusMm: number, segments = 64): IntPolygon {
  const cxU = mmToU(cx);
  const cyU = mmToU(cy);
  const rU = mmToU(radiusMm);
  
  const poly: IntPolygon = [];
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    poly.push({
      x: Math.round(cxU + Math.cos(angle) * rU),
      y: Math.round(cyU + Math.sin(angle) * rU)
    });
  }
  
  return poly;
}

/**
 * Create rectangle polygon
 */
export function createRect(xMm: number, yMm: number, wMm: number, hMm: number): IntPolygon {
  const x = mmToU(xMm);
  const y = mmToU(yMm);
  const w = mmToU(wMm);
  const h = mmToU(hMm);
  
  return [
    { x: x, y: y },
    { x: x + w, y: y },
    { x: x + w, y: y + h },
    { x: x, y: y + h }
  ];
}

/**
 * Create capsule polygon (rectangle with rounded ends)
 */
export function createCapsule(
  x1Mm: number, y1Mm: number,
  x2Mm: number, y2Mm: number,
  widthMm: number,
  endSegments = 16
): IntPolygon {
  const x1 = mmToU(x1Mm);
  const y1 = mmToU(y1Mm);
  const x2 = mmToU(x2Mm);
  const y2 = mmToU(y2Mm);
  const halfW = mmToU(widthMm / 2);
  
  // Direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len < 1) {
    // Degenerate: return circle
    return createCircle(x1Mm, y1Mm, widthMm / 2, endSegments * 2);
  }
  
  // Perpendicular unit vector
  const px = -dy / len * halfW;
  const py = dx / len * halfW;
  
  const poly: IntPolygon = [];
  
  // Bottom edge (from p1 to p2)
  poly.push({ x: Math.round(x1 + px), y: Math.round(y1 + py) });
  poly.push({ x: Math.round(x2 + px), y: Math.round(y2 + py) });
  
  // Right semicircle around p2
  const baseAngle2 = Math.atan2(py, px);
  for (let i = 0; i <= endSegments; i++) {
    const angle = baseAngle2 - (i / endSegments) * Math.PI;
    poly.push({
      x: Math.round(x2 + Math.cos(angle) * halfW),
      y: Math.round(y2 + Math.sin(angle) * halfW)
    });
  }
  
  // Top edge (from p2 to p1)
  poly.push({ x: Math.round(x2 - px), y: Math.round(y2 - py) });
  poly.push({ x: Math.round(x1 - px), y: Math.round(y1 - py) });
  
  // Left semicircle around p1
  const baseAngle1 = Math.atan2(-py, -px);
  for (let i = 0; i <= endSegments; i++) {
    const angle = baseAngle1 - (i / endSegments) * Math.PI;
    poly.push({
      x: Math.round(x1 + Math.cos(angle) * halfW),
      y: Math.round(y1 + Math.sin(angle) * halfW)
    });
  }
  
  return poly;
}

/**
 * Calculate bounds of polygons
 */
export function getPolyBounds(polys: IntPolygons): { 
  minX: number; minY: number; 
  maxX: number; maxY: number;
  width: number; height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const poly of polys) {
    for (const pt of poly) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
  }
  
  return {
    minX: uToMm(minX),
    minY: uToMm(minY),
    maxX: uToMm(maxX),
    maxY: uToMm(maxY),
    width: uToMm(maxX - minX),
    height: uToMm(maxY - minY)
  };
}

/**
 * Translate polygons
 */
export function translatePolys(polys: IntPolygons, dxMm: number, dyMm: number): IntPolygons {
  const dx = mmToU(dxMm);
  const dy = mmToU(dyMm);
  
  return polys.map(poly =>
    poly.map(pt => ({
      x: pt.x + dx,
      y: pt.y + dy
    }))
  );
}

/**
 * Convert polygons to SVG path string
 */
export function polysToSvgPath(polys: IntPolygons): string {
  const parts: string[] = [];
  
  for (const poly of polys) {
    if (poly.length < 3) continue;
    
    const first = poly[0];
    let d = `M ${uToMm(first.x).toFixed(3)} ${uToMm(first.y).toFixed(3)}`;
    
    for (let i = 1; i < poly.length; i++) {
      const pt = poly[i];
      d += ` L ${uToMm(pt.x).toFixed(3)} ${uToMm(pt.y).toFixed(3)}`;
    }
    
    d += ' Z';
    parts.push(d);
  }
  
  return parts.join(' ');
}

/**
 * Check if result is valid (not empty, not too complex)
 */
export function isValidResult(polys: IntPolygons, maxCommands = 20000): { valid: boolean; reason?: string } {
  if (polys.length === 0) {
    return { valid: false, reason: 'Empty polygon result' };
  }
  
  let totalPoints = 0;
  for (const poly of polys) {
    totalPoints += poly.length;
  }
  
  if (totalPoints > maxCommands) {
    return { valid: false, reason: `Too complex (${totalPoints} points > ${maxCommands})` };
  }
  
  return { valid: true };
}
