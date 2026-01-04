/**
 * SVG Path to Polygons - Robust path flattening
 * Converts SVG path commands to closed polygons with proper bezier flattening
 */

import { mmToU, clampFlatness, UNITS_PER_MM } from './geomUnits';

// Point in integer units
export interface IntPoint {
  x: number;
  y: number;
}

// Polygon = array of points
export type IntPolygon = IntPoint[];
export type IntPolygons = IntPolygon[];

/**
 * Convert SVG path string to polygons in integer units
 * @param pathD SVG path d attribute
 * @param flatnessMm Flattening tolerance in mm (default 0.15)
 * @returns Array of closed polygons in integer units
 */
export function pathToPolys(pathD: string, flatnessMm = 0.15): IntPolygons {
  if (!pathD || pathD.trim().length === 0) return [];
  
  flatnessMm = clampFlatness(flatnessMm);
  const flatnessU = mmToU(flatnessMm);
  
  const polygons: IntPolygons = [];
  
  try {
    const commands = parsePathCommands(pathD);
    
    let currentPoly: IntPolygon = [];
    let cx = 0; // current x in mm
    let cy = 0; // current y in mm
    let sx = 0; // start x in mm (for Z command)
    let sy = 0; // start y in mm
    let lastCmd = '';
    let lastCx1 = 0, lastCy1 = 0; // for smooth curves
    
    for (const cmd of commands) {
      const type = cmd.type;
      const args = cmd.args;
      const isRelative = type === type.toLowerCase();
      const absType = type.toUpperCase();
      
      switch (absType) {
        case 'M': {
          // Save current polygon if any
          if (currentPoly.length >= 3) {
            closeAndAddPolygon(polygons, currentPoly);
          }
          currentPoly = [];
          
          // Move to
          const x = isRelative ? cx + args[0] : args[0];
          const y = isRelative ? cy + args[1] : args[1];
          cx = x;
          cy = y;
          sx = x;
          sy = y;
          currentPoly.push({ x: mmToU(x), y: mmToU(y) });
          
          // Additional coordinates are implicit lineto
          for (let i = 2; i < args.length; i += 2) {
            const lx = isRelative ? cx + args[i] : args[i];
            const ly = isRelative ? cy + args[i + 1] : args[i + 1];
            cx = lx;
            cy = ly;
            currentPoly.push({ x: mmToU(lx), y: mmToU(ly) });
          }
          break;
        }
        
        case 'L': {
          for (let i = 0; i < args.length; i += 2) {
            const x = isRelative ? cx + args[i] : args[i];
            const y = isRelative ? cy + args[i + 1] : args[i + 1];
            cx = x;
            cy = y;
            currentPoly.push({ x: mmToU(x), y: mmToU(y) });
          }
          break;
        }
        
        case 'H': {
          for (let i = 0; i < args.length; i++) {
            const x = isRelative ? cx + args[i] : args[i];
            cx = x;
            currentPoly.push({ x: mmToU(x), y: mmToU(cy) });
          }
          break;
        }
        
        case 'V': {
          for (let i = 0; i < args.length; i++) {
            const y = isRelative ? cy + args[i] : args[i];
            cy = y;
            currentPoly.push({ x: mmToU(cx), y: mmToU(y) });
          }
          break;
        }
        
        case 'C': {
          // Cubic bezier
          for (let i = 0; i < args.length; i += 6) {
            const x1 = isRelative ? cx + args[i] : args[i];
            const y1 = isRelative ? cy + args[i + 1] : args[i + 1];
            const x2 = isRelative ? cx + args[i + 2] : args[i + 2];
            const y2 = isRelative ? cy + args[i + 3] : args[i + 3];
            const x = isRelative ? cx + args[i + 4] : args[i + 4];
            const y = isRelative ? cy + args[i + 5] : args[i + 5];
            
            const pts = flattenCubic(cx, cy, x1, y1, x2, y2, x, y, flatnessMm);
            for (const pt of pts) {
              currentPoly.push({ x: mmToU(pt.x), y: mmToU(pt.y) });
            }
            
            lastCx1 = x2;
            lastCy1 = y2;
            cx = x;
            cy = y;
          }
          break;
        }
        
        case 'S': {
          // Smooth cubic bezier
          for (let i = 0; i < args.length; i += 4) {
            // Reflect previous control point
            let x1 = cx;
            let y1 = cy;
            if (lastCmd === 'C' || lastCmd === 'S' || lastCmd === 'c' || lastCmd === 's') {
              x1 = 2 * cx - lastCx1;
              y1 = 2 * cy - lastCy1;
            }
            
            const x2 = isRelative ? cx + args[i] : args[i];
            const y2 = isRelative ? cy + args[i + 1] : args[i + 1];
            const x = isRelative ? cx + args[i + 2] : args[i + 2];
            const y = isRelative ? cy + args[i + 3] : args[i + 3];
            
            const pts = flattenCubic(cx, cy, x1, y1, x2, y2, x, y, flatnessMm);
            for (const pt of pts) {
              currentPoly.push({ x: mmToU(pt.x), y: mmToU(pt.y) });
            }
            
            lastCx1 = x2;
            lastCy1 = y2;
            cx = x;
            cy = y;
          }
          break;
        }
        
        case 'Q': {
          // Quadratic bezier
          for (let i = 0; i < args.length; i += 4) {
            const x1 = isRelative ? cx + args[i] : args[i];
            const y1 = isRelative ? cy + args[i + 1] : args[i + 1];
            const x = isRelative ? cx + args[i + 2] : args[i + 2];
            const y = isRelative ? cy + args[i + 3] : args[i + 3];
            
            const pts = flattenQuadratic(cx, cy, x1, y1, x, y, flatnessMm);
            for (const pt of pts) {
              currentPoly.push({ x: mmToU(pt.x), y: mmToU(pt.y) });
            }
            
            lastCx1 = x1;
            lastCy1 = y1;
            cx = x;
            cy = y;
          }
          break;
        }
        
        case 'T': {
          // Smooth quadratic bezier
          for (let i = 0; i < args.length; i += 2) {
            // Reflect previous control point
            let x1 = cx;
            let y1 = cy;
            if (lastCmd === 'Q' || lastCmd === 'T' || lastCmd === 'q' || lastCmd === 't') {
              x1 = 2 * cx - lastCx1;
              y1 = 2 * cy - lastCy1;
            }
            
            const x = isRelative ? cx + args[i] : args[i];
            const y = isRelative ? cy + args[i + 1] : args[i + 1];
            
            const pts = flattenQuadratic(cx, cy, x1, y1, x, y, flatnessMm);
            for (const pt of pts) {
              currentPoly.push({ x: mmToU(pt.x), y: mmToU(pt.y) });
            }
            
            lastCx1 = x1;
            lastCy1 = y1;
            cx = x;
            cy = y;
          }
          break;
        }
        
        case 'A': {
          // Arc
          for (let i = 0; i < args.length; i += 7) {
            const rx = args[i];
            const ry = args[i + 1];
            const rotation = args[i + 2];
            const largeArc = args[i + 3];
            const sweep = args[i + 4];
            const x = isRelative ? cx + args[i + 5] : args[i + 5];
            const y = isRelative ? cy + args[i + 6] : args[i + 6];
            
            const pts = flattenArc(cx, cy, rx, ry, rotation, largeArc, sweep, x, y, flatnessMm);
            for (const pt of pts) {
              currentPoly.push({ x: mmToU(pt.x), y: mmToU(pt.y) });
            }
            
            cx = x;
            cy = y;
          }
          break;
        }
        
        case 'Z': {
          // Close path
          if (currentPoly.length >= 3) {
            closeAndAddPolygon(polygons, currentPoly);
          }
          currentPoly = [];
          cx = sx;
          cy = sy;
          break;
        }
      }
      
      lastCmd = type;
    }
    
    // Add final polygon if not closed
    if (currentPoly.length >= 3) {
      closeAndAddPolygon(polygons, currentPoly);
    }
    
  } catch (e) {
    console.error('Path parsing failed:', e);
  }
  
  // Filter out degenerate polygons
  return polygons.filter(poly => poly.length >= 3 && !hasNaN(poly));
}

/**
 * Close polygon and add to list
 */
function closeAndAddPolygon(polygons: IntPolygons, poly: IntPolygon): void {
  if (poly.length < 3) return;
  
  // Ensure closed (first point = last point)
  const first = poly[0];
  const last = poly[poly.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    poly.push({ x: first.x, y: first.y });
  }
  
  // Remove duplicate consecutive points
  const cleaned = removeDuplicates(poly);
  if (cleaned.length >= 3) {
    polygons.push(cleaned);
  }
}

/**
 * Remove duplicate consecutive points
 */
function removeDuplicates(poly: IntPolygon): IntPolygon {
  if (poly.length < 2) return poly;
  
  const result: IntPolygon = [poly[0]];
  for (let i = 1; i < poly.length; i++) {
    const prev = result[result.length - 1];
    const curr = poly[i];
    if (curr.x !== prev.x || curr.y !== prev.y) {
      result.push(curr);
    }
  }
  return result;
}

/**
 * Check for NaN in polygon
 */
function hasNaN(poly: IntPolygon): boolean {
  for (const pt of poly) {
    if (isNaN(pt.x) || isNaN(pt.y) || !isFinite(pt.x) || !isFinite(pt.y)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Path Command Parser
// ============================================================================

interface PathCommand {
  type: string;
  args: number[];
}

function parsePathCommands(pathD: string): PathCommand[] {
  const commands: PathCommand[] = [];
  
  // Match command letter followed by numbers
  const cmdRegex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  
  while ((match = cmdRegex.exec(pathD)) !== null) {
    const type = match[1];
    const argsStr = match[2].trim();
    
    // Parse numbers (handle negative numbers and decimals)
    const args: number[] = [];
    const numRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
    let numMatch;
    
    while ((numMatch = numRegex.exec(argsStr)) !== null) {
      const n = parseFloat(numMatch[0]);
      if (!isNaN(n) && isFinite(n)) {
        args.push(n);
      }
    }
    
    commands.push({ type, args });
  }
  
  return commands;
}

// ============================================================================
// Bezier Curve Flattening
// ============================================================================

interface Point {
  x: number;
  y: number;
}

/**
 * Flatten cubic bezier curve using De Casteljau subdivision
 */
function flattenCubic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  tolerance: number
): Point[] {
  const points: Point[] = [];
  const toleranceSq = tolerance * tolerance;
  
  function subdivide(
    p0x: number, p0y: number,
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number,
    level: number
  ): void {
    // Max recursion depth
    if (level > 12) {
      points.push({ x: p3x, y: p3y });
      return;
    }
    
    // Check flatness using control point deviation
    const dx = p3x - p0x;
    const dy = p3y - p0y;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq < 1e-10) {
      points.push({ x: p3x, y: p3y });
      return;
    }
    
    // Distance from control points to line p0-p3
    const d1 = Math.abs((p1x - p0x) * dy - (p1y - p0y) * dx) / Math.sqrt(lenSq);
    const d2 = Math.abs((p2x - p0x) * dy - (p2y - p0y) * dx) / Math.sqrt(lenSq);
    
    if (d1 + d2 <= tolerance) {
      points.push({ x: p3x, y: p3y });
      return;
    }
    
    // Subdivide using De Casteljau
    const p01x = (p0x + p1x) * 0.5;
    const p01y = (p0y + p1y) * 0.5;
    const p12x = (p1x + p2x) * 0.5;
    const p12y = (p1y + p2y) * 0.5;
    const p23x = (p2x + p3x) * 0.5;
    const p23y = (p2y + p3y) * 0.5;
    
    const p012x = (p01x + p12x) * 0.5;
    const p012y = (p01y + p12y) * 0.5;
    const p123x = (p12x + p23x) * 0.5;
    const p123y = (p12y + p23y) * 0.5;
    
    const p0123x = (p012x + p123x) * 0.5;
    const p0123y = (p012y + p123y) * 0.5;
    
    subdivide(p0x, p0y, p01x, p01y, p012x, p012y, p0123x, p0123y, level + 1);
    subdivide(p0123x, p0123y, p123x, p123y, p23x, p23y, p3x, p3y, level + 1);
  }
  
  subdivide(x0, y0, x1, y1, x2, y2, x3, y3, 0);
  return points;
}

/**
 * Flatten quadratic bezier curve
 */
function flattenQuadratic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  tolerance: number
): Point[] {
  // Convert quadratic to cubic
  const cx1 = x0 + (2 / 3) * (x1 - x0);
  const cy1 = y0 + (2 / 3) * (y1 - y0);
  const cx2 = x2 + (2 / 3) * (x1 - x2);
  const cy2 = y2 + (2 / 3) * (y1 - y2);
  
  return flattenCubic(x0, y0, cx1, cy1, cx2, cy2, x2, y2, tolerance);
}

/**
 * Flatten elliptical arc using parametric approximation
 */
function flattenArc(
  x1: number, y1: number,
  rx: number, ry: number,
  rotationDeg: number,
  largeArcFlag: number,
  sweepFlag: number,
  x2: number, y2: number,
  tolerance: number
): Point[] {
  const points: Point[] = [];
  
  // Handle degenerate cases
  if (rx === 0 || ry === 0) {
    points.push({ x: x2, y: y2 });
    return points;
  }
  
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  
  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  
  // Compute center point parameters
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  
  // Correct radii if too small
  let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }
  
  // Compute center point
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  
  let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
  sq = Math.max(0, sq);
  const coef = (largeArcFlag === sweepFlag ? -1 : 1) * Math.sqrt(sq);
  
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);
  
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  
  // Compute start and end angles
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  
  let startAngle = Math.atan2(uy, ux);
  let dTheta = Math.atan2(vy, vx) - startAngle;
  
  if (sweepFlag === 0 && dTheta > 0) {
    dTheta -= 2 * Math.PI;
  } else if (sweepFlag === 1 && dTheta < 0) {
    dTheta += 2 * Math.PI;
  }
  
  // Calculate number of segments based on arc length and tolerance
  const arcLength = Math.abs(dTheta) * Math.max(rx, ry);
  const numSegments = Math.max(8, Math.ceil(arcLength / tolerance));
  
  for (let i = 1; i <= numSegments; i++) {
    const t = i / numSegments;
    const theta = startAngle + dTheta * t;
    
    const xp = rx * Math.cos(theta);
    const yp = ry * Math.sin(theta);
    
    const x = cosPhi * xp - sinPhi * yp + cx;
    const y = sinPhi * xp + cosPhi * yp + cy;
    
    points.push({ x, y });
  }
  
  return points;
}

/**
 * Convert polygons back to SVG path string (for debug/export)
 */
export function polysToPath(polygons: IntPolygons): string {
  const parts: string[] = [];
  
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    
    let d = `M ${poly[0].x / UNITS_PER_MM} ${poly[0].y / UNITS_PER_MM}`;
    
    for (let i = 1; i < poly.length; i++) {
      d += ` L ${poly[i].x / UNITS_PER_MM} ${poly[i].y / UNITS_PER_MM}`;
    }
    
    d += ' Z';
    parts.push(d);
  }
  
  return parts.join(' ');
}
