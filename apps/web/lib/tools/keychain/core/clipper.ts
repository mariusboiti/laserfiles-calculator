/**
 * Clipper2 Geometry Engine
 * Robust polygon operations: union, offset, difference
 * Uses clipper2-js for reliable boolean operations
 */

import type { Point64, Paths64 } from 'clipper2-js';

// Clipper2 will be loaded dynamically
let Clipper2: any = null;

/**
 * Initialize Clipper2 (client-side only)
 */
async function initClipper2(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Clipper2 can only be used in browser');
  }
  
  if (!Clipper2) {
    const clipperModule = await import('clipper2-js');
    Clipper2 = clipperModule;
  }
  
  return Clipper2;
}

// Type definitions
export type Poly = { x: number; y: number }[];
export type PolyTree = Poly[];

/**
 * Convert SVG path string to polygons by flattening curves
 */
export async function svgPathToPolys(pathD: string, flatnessMm = 0.15): Promise<PolyTree> {
  if (!pathD || pathD.trim().length === 0) return [];
  
  const polys: PolyTree = [];
  
  try {
    // Parse SVG path commands
    const commands = parseSvgPath(pathD);
    
    let currentPoly: Poly = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'M': // Move to
          if (currentPoly.length > 0) {
            polys.push(currentPoly);
            currentPoly = [];
          }
          currentX = cmd.x!;
          currentY = cmd.y!;
          startX = currentX;
          startY = currentY;
          currentPoly.push({ x: currentX, y: currentY });
          break;
          
        case 'L': // Line to
          currentX = cmd.x!;
          currentY = cmd.y!;
          currentPoly.push({ x: currentX, y: currentY });
          break;
          
        case 'C': // Cubic bezier
          {
            const points = flattenCubicBezier(
              currentX, currentY,
              cmd.x1!, cmd.y1!,
              cmd.x2!, cmd.y2!,
              cmd.x!, cmd.y!,
              flatnessMm
            );
            currentPoly.push(...points);
            currentX = cmd.x!;
            currentY = cmd.y!;
          }
          break;
          
        case 'Q': // Quadratic bezier
          {
            const points = flattenQuadraticBezier(
              currentX, currentY,
              cmd.x1!, cmd.y1!,
              cmd.x!, cmd.y!,
              flatnessMm
            );
            currentPoly.push(...points);
            currentX = cmd.x!;
            currentY = cmd.y!;
          }
          break;
          
        case 'A': // Arc
          {
            const points = flattenArc(
              currentX, currentY,
              cmd.rx!, cmd.ry!,
              cmd.rotation!, cmd.largeArc!, cmd.sweep!,
              cmd.x!, cmd.y!,
              flatnessMm
            );
            currentPoly.push(...points);
            currentX = cmd.x!;
            currentY = cmd.y!;
          }
          break;
          
        case 'Z': // Close path
          if (currentPoly.length > 0) {
            // Close to start point if not already there
            const last = currentPoly[currentPoly.length - 1];
            if (Math.abs(last.x - startX) > 0.001 || Math.abs(last.y - startY) > 0.001) {
              currentPoly.push({ x: startX, y: startY });
            }
            polys.push(currentPoly);
            currentPoly = [];
          }
          currentX = startX;
          currentY = startY;
          break;
      }
    }
    
    // Add remaining polygon
    if (currentPoly.length > 0) {
      polys.push(currentPoly);
    }
  } catch (e) {
    console.error('Failed to parse SVG path:', e);
  }
  
  return polys;
}

/**
 * Union multiple polygon trees
 */
export async function union(polyTrees: PolyTree[]): Promise<PolyTree> {
  const C = await initClipper2();
  
  if (polyTrees.length === 0) return [];
  if (polyTrees.length === 1) return polyTrees[0];
  
  try {
    // Convert to Clipper2 format (scale to integer coordinates)
    const scale = 1000; // Scale factor for precision
    const allPaths: Paths64 = [];
    
    for (const tree of polyTrees) {
      for (const poly of tree) {
        const path: Point64[] = poly.map(pt => 
          C.Point64(BigInt(Math.round(pt.x * scale)), BigInt(Math.round(pt.y * scale)))
        );
        allPaths.push(path);
      }
    }
    
    // Perform union
    const result = C.Union(allPaths, C.FillRule.NonZero);
    
    // Convert back to our format
    const output: PolyTree = result.map((path: Point64[]) => 
      path.map(pt => ({
        x: Number(pt.x) / scale,
        y: Number(pt.y) / scale
      }))
    );
    
    return output;
  } catch (e) {
    console.error('Union failed:', e);
    return polyTrees[0] || [];
  }
}

/**
 * Offset polygon outward (positive) or inward (negative)
 */
export async function offset(polyTree: PolyTree, deltaMm: number): Promise<PolyTree> {
  const C = await initClipper2();
  
  if (polyTree.length === 0) return [];
  
  try {
    const scale = 1000;
    const deltaScaled = deltaMm * scale;
    
    // Convert to Clipper2 format
    const paths: Paths64 = polyTree.map(poly => 
      poly.map(pt => 
        C.Point64(BigInt(Math.round(pt.x * scale)), BigInt(Math.round(pt.y * scale)))
      )
    );
    
    // Perform offset with round joins
    const result = C.InflatePaths(
      paths,
      deltaScaled,
      C.JoinType.Round,
      C.EndType.Polygon,
      2.0 // miter limit
    );
    
    // Convert back
    const output: PolyTree = result.map((path: Point64[]) =>
      path.map(pt => ({
        x: Number(pt.x) / scale,
        y: Number(pt.y) / scale
      }))
    );
    
    return output;
  } catch (e) {
    console.error('Offset failed:', e);
    return polyTree;
  }
}

/**
 * Difference: subtract B from A
 */
export async function diff(polyTreeA: PolyTree, polyTreeB: PolyTree): Promise<PolyTree> {
  const C = await initClipper2();
  
  if (polyTreeA.length === 0) return [];
  if (polyTreeB.length === 0) return polyTreeA;
  
  try {
    const scale = 1000;
    
    // Convert both to Clipper2 format
    const pathsA: Paths64 = polyTreeA.map(poly =>
      poly.map(pt => 
        C.Point64(BigInt(Math.round(pt.x * scale)), BigInt(Math.round(pt.y * scale)))
      )
    );
    
    const pathsB: Paths64 = polyTreeB.map(poly =>
      poly.map(pt => 
        C.Point64(BigInt(Math.round(pt.x * scale)), BigInt(Math.round(pt.y * scale)))
      )
    );
    
    // Perform difference
    const result = C.Difference(pathsA, pathsB, C.FillRule.NonZero);
    
    // Convert back
    const output: PolyTree = result.map((path: Point64[]) =>
      path.map(pt => ({
        x: Number(pt.x) / scale,
        y: Number(pt.y) / scale
      }))
    );
    
    return output;
  } catch (e) {
    console.error('Difference failed:', e);
    return polyTreeA;
  }
}

/**
 * Convert polygon tree back to SVG path string
 */
export function polysToSvgPath(polyTree: PolyTree): string {
  if (polyTree.length === 0) return '';
  
  const pathParts: string[] = [];
  
  for (const poly of polyTree) {
    if (poly.length < 2) continue;
    
    let d = `M ${poly[0].x.toFixed(3)} ${poly[0].y.toFixed(3)}`;
    
    for (let i = 1; i < poly.length; i++) {
      d += ` L ${poly[i].x.toFixed(3)} ${poly[i].y.toFixed(3)}`;
    }
    
    d += ' Z';
    pathParts.push(d);
  }
  
  return pathParts.join(' ');
}

/**
 * Remove tiny islands (polygons with area below threshold)
 */
export function cleanupPolys(polyTree: PolyTree, minAreaMm2 = 0.5): PolyTree {
  return polyTree.filter(poly => {
    const area = calculatePolygonArea(poly);
    return Math.abs(area) >= minAreaMm2;
  });
}

/**
 * Calculate polygon area using shoelace formula
 */
function calculatePolygonArea(poly: Poly): number {
  if (poly.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].x * poly[j].y;
    area -= poly[j].x * poly[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Create circle polygon
 */
export function createCirclePoly(cx: number, cy: number, radius: number, segments = 64): Poly {
  const poly: Poly = [];
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    poly.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    });
  }
  
  return poly;
}

// ============================================================================
// SVG Path Parsing and Curve Flattening
// ============================================================================

interface PathCommand {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  rx?: number;
  ry?: number;
  rotation?: number;
  largeArc?: number;
  sweep?: number;
}

function parseSvgPath(pathD: string): PathCommand[] {
  const commands: PathCommand[] = [];
  
  // Tokenize path
  const tokens = pathD.match(/[a-zA-Z][^a-zA-Z]*/g) || [];
  
  for (const token of tokens) {
    const type = token[0];
    const coords = token.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    let i = 0;
    while (i < coords.length) {
      const cmd: PathCommand = { type: type.toUpperCase() };
      
      switch (type.toUpperCase()) {
        case 'M':
        case 'L':
          cmd.x = coords[i++];
          cmd.y = coords[i++];
          break;
          
        case 'C':
          cmd.x1 = coords[i++];
          cmd.y1 = coords[i++];
          cmd.x2 = coords[i++];
          cmd.y2 = coords[i++];
          cmd.x = coords[i++];
          cmd.y = coords[i++];
          break;
          
        case 'Q':
          cmd.x1 = coords[i++];
          cmd.y1 = coords[i++];
          cmd.x = coords[i++];
          cmd.y = coords[i++];
          break;
          
        case 'A':
          cmd.rx = coords[i++];
          cmd.ry = coords[i++];
          cmd.rotation = coords[i++];
          cmd.largeArc = coords[i++];
          cmd.sweep = coords[i++];
          cmd.x = coords[i++];
          cmd.y = coords[i++];
          break;
          
        case 'Z':
          break;
          
        default:
          i = coords.length; // Skip unknown commands
      }
      
      commands.push(cmd);
      
      if (type.toUpperCase() === 'Z') break;
    }
  }
  
  return commands;
}

/**
 * Flatten cubic bezier curve to line segments
 */
function flattenCubicBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  tolerance: number
): Poly {
  const points: Poly = [];
  
  const subdivide = (
    p0x: number, p0y: number,
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number,
    level: number
  ) => {
    if (level > 10) {
      points.push({ x: p3x, y: p3y });
      return;
    }
    
    // Check flatness
    const ux = 3 * p1x - 2 * p0x - p3x;
    const uy = 3 * p1y - 2 * p0y - p3y;
    const vx = 3 * p2x - 2 * p3x - p0x;
    const vy = 3 * p2y - 2 * p3y - p0y;
    
    const flatness = Math.max(ux * ux + uy * uy, vx * vx + vy * vy);
    
    if (flatness <= tolerance * tolerance) {
      points.push({ x: p3x, y: p3y });
      return;
    }
    
    // Subdivide
    const p01x = (p0x + p1x) / 2;
    const p01y = (p0y + p1y) / 2;
    const p12x = (p1x + p2x) / 2;
    const p12y = (p1y + p2y) / 2;
    const p23x = (p2x + p3x) / 2;
    const p23y = (p2y + p3y) / 2;
    
    const p012x = (p01x + p12x) / 2;
    const p012y = (p01y + p12y) / 2;
    const p123x = (p12x + p23x) / 2;
    const p123y = (p12y + p23y) / 2;
    
    const p0123x = (p012x + p123x) / 2;
    const p0123y = (p012y + p123y) / 2;
    
    subdivide(p0x, p0y, p01x, p01y, p012x, p012y, p0123x, p0123y, level + 1);
    subdivide(p0123x, p0123y, p123x, p123y, p23x, p23y, p3x, p3y, level + 1);
  };
  
  subdivide(x0, y0, x1, y1, x2, y2, x3, y3, 0);
  
  return points;
}

/**
 * Flatten quadratic bezier curve to line segments
 */
function flattenQuadraticBezier(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  tolerance: number
): Poly {
  // Convert quadratic to cubic
  const cx1 = x0 + (2 / 3) * (x1 - x0);
  const cy1 = y0 + (2 / 3) * (y1 - y0);
  const cx2 = x2 + (2 / 3) * (x1 - x2);
  const cy2 = y2 + (2 / 3) * (y1 - y2);
  
  return flattenCubicBezier(x0, y0, cx1, cy1, cx2, cy2, x2, y2, tolerance);
}

/**
 * Flatten elliptical arc to line segments
 */
function flattenArc(
  x1: number, y1: number,
  rx: number, ry: number,
  rotation: number, largeArc: number, sweep: number,
  x2: number, y2: number,
  tolerance: number
): Poly {
  const points: Poly = [];
  
  // Simplified arc approximation
  const segments = Math.max(8, Math.ceil(Math.abs(rx + ry) / tolerance));
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    points.push({ x, y });
  }
  
  return points;
}
