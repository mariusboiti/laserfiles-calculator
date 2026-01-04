/**
 * Keychain Hub - Clipper Helpers
 * SVG path ↔ polygon conversion, boolean union, and offset operations
 * Uses js-angusj-clipper for precise polygon operations
 * 
 * NOTE: Clipper is loaded dynamically to avoid SSR issues with 'fs' module
 */

// Clipper uses integer coordinates - scale factor for mm precision
const CLIPPER_SCALE = 1000; // 1mm = 1000 units (0.001mm precision)

// Singleton clipper instance (loaded dynamically)
let clipperInstance: any = null;
let ClipperLib: any = null;

/**
 * Initialize Clipper library (must be called before any operations)
 * Uses dynamic import to avoid SSR issues
 */
export async function initClipper(): Promise<any> {
  if (!clipperInstance) {
    // Dynamic import to avoid 'fs' module resolution during SSR
    ClipperLib = await import('js-angusj-clipper');
    clipperInstance = await ClipperLib.loadNativeClipperLibInstanceAsync(
      ClipperLib.NativeClipperLibRequestedFormat.WasmWithAsmJsFallback
    );
  }
  return clipperInstance;
}

/**
 * Get initialized clipper instance (throws if not initialized)
 */
function getClipper(): any {
  if (!clipperInstance) {
    throw new Error('Clipper not initialized. Call initClipper() first.');
  }
  return clipperInstance;
}

/**
 * Get ClipperLib module (throws if not initialized)
 */
function getClipperLib(): any {
  if (!ClipperLib) {
    throw new Error('Clipper not initialized. Call initClipper() first.');
  }
  return ClipperLib;
}

// ============================================================================
// SVG Path Parsing & Flattening
// ============================================================================

interface Point {
  x: number;
  y: number;
}

/**
 * Parse SVG path d attribute into array of subpaths (each subpath is array of points)
 * Flattens curves using linear approximation with given tolerance
 */
export function svgPathToPolygons(d: string, flattenTolerance = 0.2): Point[][] {
  const polygons: Point[][] = [];
  let currentPath: Point[] = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  
  // Tokenize path
  const tokens = tokenizePath(d);
  let i = 0;
  
  function getNumber(): number {
    if (i >= tokens.length) return 0;
    const val = parseFloat(tokens[i++]);
    return isNaN(val) ? 0 : val;
  }
  
  function closePath() {
    if (currentPath.length > 2) {
      // Close the path if not already closed
      const first = currentPath[0];
      const last = currentPath[currentPath.length - 1];
      if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
        currentPath.push({ x: first.x, y: first.y });
      }
      polygons.push(currentPath);
    }
    currentPath = [];
  }
  
  while (i < tokens.length) {
    const cmd = tokens[i++];
    
    switch (cmd) {
      case 'M': // Move to (absolute)
        if (currentPath.length > 0) closePath();
        currentX = getNumber();
        currentY = getNumber();
        startX = currentX;
        startY = currentY;
        currentPath.push({ x: currentX, y: currentY });
        // Subsequent coordinates are line-to
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentX = getNumber();
          currentY = getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'm': // Move to (relative)
        if (currentPath.length > 0) closePath();
        currentX += getNumber();
        currentY += getNumber();
        startX = currentX;
        startY = currentY;
        currentPath.push({ x: currentX, y: currentY });
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentX += getNumber();
          currentY += getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'L': // Line to (absolute)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentX = getNumber();
          currentY = getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'l': // Line to (relative)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentX += getNumber();
          currentY += getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'H': // Horizontal line (absolute)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentX = getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'h': // Horizontal line (relative)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentX += getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'V': // Vertical line (absolute)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentY = getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'v': // Vertical line (relative)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          currentY += getNumber();
          currentPath.push({ x: currentX, y: currentY });
        }
        break;
        
      case 'C': // Cubic bezier (absolute)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x1 = getNumber();
          const y1 = getNumber();
          const x2 = getNumber();
          const y2 = getNumber();
          const x = getNumber();
          const y = getNumber();
          flattenCubicBezier(currentPath, currentX, currentY, x1, y1, x2, y2, x, y, flattenTolerance);
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'c': // Cubic bezier (relative)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x1 = currentX + getNumber();
          const y1 = currentY + getNumber();
          const x2 = currentX + getNumber();
          const y2 = currentY + getNumber();
          const x = currentX + getNumber();
          const y = currentY + getNumber();
          flattenCubicBezier(currentPath, currentX, currentY, x1, y1, x2, y2, x, y, flattenTolerance);
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'Q': // Quadratic bezier (absolute)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x1 = getNumber();
          const y1 = getNumber();
          const x = getNumber();
          const y = getNumber();
          flattenQuadBezier(currentPath, currentX, currentY, x1, y1, x, y, flattenTolerance);
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'q': // Quadratic bezier (relative)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const x1 = currentX + getNumber();
          const y1 = currentY + getNumber();
          const x = currentX + getNumber();
          const y = currentY + getNumber();
          flattenQuadBezier(currentPath, currentX, currentY, x1, y1, x, y, flattenTolerance);
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'A': // Arc (absolute)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const rx = getNumber();
          const ry = getNumber();
          const rotation = getNumber();
          const largeArc = getNumber();
          const sweep = getNumber();
          const x = getNumber();
          const y = getNumber();
          flattenArc(currentPath, currentX, currentY, rx, ry, rotation, !!largeArc, !!sweep, x, y, flattenTolerance);
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'a': // Arc (relative)
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          const rx = getNumber();
          const ry = getNumber();
          const rotation = getNumber();
          const largeArc = getNumber();
          const sweep = getNumber();
          const x = currentX + getNumber();
          const y = currentY + getNumber();
          flattenArc(currentPath, currentX, currentY, rx, ry, rotation, !!largeArc, !!sweep, x, y, flattenTolerance);
          currentX = x;
          currentY = y;
        }
        break;
        
      case 'Z':
      case 'z':
        currentX = startX;
        currentY = startY;
        closePath();
        break;
        
      case 'S': // Smooth cubic (absolute) - simplified
      case 's': // Smooth cubic (relative) - simplified
      case 'T': // Smooth quad (absolute) - simplified
      case 't': // Smooth quad (relative) - simplified
        // Simplified: treat as line to endpoint
        while (i < tokens.length && !isNaN(parseFloat(tokens[i]))) {
          if (cmd === 'S' || cmd === 's') {
            getNumber(); getNumber(); // skip control point
          }
          const x = cmd === cmd.toUpperCase() ? getNumber() : currentX + getNumber();
          const y = cmd === cmd.toUpperCase() ? getNumber() : currentY + getNumber();
          currentPath.push({ x, y });
          currentX = x;
          currentY = y;
        }
        break;
    }
  }
  
  // Close any remaining path
  if (currentPath.length > 2) {
    closePath();
  }
  
  return polygons;
}

/**
 * Tokenize SVG path into commands and numbers
 */
function tokenizePath(d: string): string[] {
  const tokens: string[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[+-]?\d+)?)/gi;
  let match;
  while ((match = regex.exec(d)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

/**
 * Flatten cubic bezier curve into line segments
 */
function flattenCubicBezier(
  path: Point[],
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  tolerance: number
) {
  const steps = Math.max(4, Math.ceil(
    Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2) / tolerance
  ));
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    path.push({ x, y });
  }
}

/**
 * Flatten quadratic bezier curve into line segments
 */
function flattenQuadBezier(
  path: Point[],
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  tolerance: number
) {
  const steps = Math.max(4, Math.ceil(
    Math.sqrt((x2 - x0) ** 2 + (y2 - y0) ** 2) / tolerance
  ));
  
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    path.push({ x, y });
  }
}

/**
 * Flatten elliptical arc into line segments
 */
function flattenArc(
  path: Point[],
  x0: number, y0: number,
  rx: number, ry: number,
  rotation: number,
  largeArc: boolean,
  sweep: boolean,
  x1: number, y1: number,
  tolerance: number
) {
  if (rx === 0 || ry === 0) {
    path.push({ x: x1, y: y1 });
    return;
  }
  
  // Convert to center parameterization
  const phi = (rotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  
  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  
  // Correct radii
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  let lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }
  
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  
  let sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
  sq = Math.sqrt(sq);
  if (largeArc === sweep) sq = -sq;
  
  const cxp = (sq * rx * y1p) / ry;
  const cyp = (-sq * ry * x1p) / rx;
  
  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;
  
  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  let dtheta = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - theta1;
  
  if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  
  const steps = Math.max(4, Math.ceil(Math.abs(dtheta) * Math.max(rx, ry) / tolerance));
  
  for (let i = 1; i <= steps; i++) {
    const t = theta1 + (dtheta * i) / steps;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const x = cosPhi * rx * cosT - sinPhi * ry * sinT + cx;
    const y = sinPhi * rx * cosT + cosPhi * ry * sinT + cy;
    path.push({ x, y });
  }
}

// ============================================================================
// Polygon to SVG Path
// ============================================================================

/**
 * Convert polygon points to SVG path d attribute
 */
export function polygonToSvgPath(polygon: Point[]): string {
  if (polygon.length < 2) return '';
  
  let d = `M ${polygon[0].x.toFixed(3)} ${polygon[0].y.toFixed(3)}`;
  for (let i = 1; i < polygon.length; i++) {
    d += ` L ${polygon[i].x.toFixed(3)} ${polygon[i].y.toFixed(3)}`;
  }
  d += ' Z';
  return d;
}

/**
 * Convert multiple polygons to single SVG path d attribute
 */
export function polygonsToSvgPath(polygons: Point[][]): string {
  return polygons.map(p => polygonToSvgPath(p)).join(' ');
}

// ============================================================================
// Clipper Operations
// ============================================================================

type ClipperPath = any;
type ClipperPaths = any;

/**
 * Convert Point[] to Clipper integer path
 */
function toClipperPath(polygon: Point[]): ClipperPath {
  return polygon.map(p => ({
    x: Math.round(p.x * CLIPPER_SCALE),
    y: Math.round(p.y * CLIPPER_SCALE)
  }));
}

/**
 * Convert Clipper integer path to Point[]
 */
function fromClipperPath(path: ClipperPath): Point[] {
  return path.map((p: any) => ({
    x: p.x / CLIPPER_SCALE,
    y: p.y / CLIPPER_SCALE
  }));
}

/**
 * Union multiple polygons into single shape
 */
export function unionPolygons(polygons: Point[][]): Point[][] {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return polygons;
  
  const clipper = getClipper();
  const lib = getClipperLib();
  const clipperPaths: ClipperPaths = polygons.map(toClipperPath);
  
  const result = clipper.clipToPaths({
    clipType: lib.ClipType.Union,
    subjectFillType: lib.PolyFillType.NonZero,
    subjectInputs: [{ data: clipperPaths, closed: true }]
  });
  
  return result.map(fromClipperPath);
}

/**
 * Difference: subtract clip from subject
 */
export function differencePolygons(subject: Point[][], clip: Point[][]): Point[][] {
  if (subject.length === 0) return [];
  if (clip.length === 0) return subject;
  
  const clipper = getClipper();
  const lib = getClipperLib();
  
  const result = clipper.clipToPaths({
    clipType: lib.ClipType.Difference,
    subjectFillType: lib.PolyFillType.NonZero,
    clipFillType: lib.PolyFillType.NonZero,
    subjectInputs: [{ data: subject.map(toClipperPath), closed: true }],
    clipInputs: [{ data: clip.map(toClipperPath) }]
  });
  
  return result.map(fromClipperPath);
}

/**
 * Offset polygons outward (positive delta) or inward (negative delta)
 * Uses ROUND join type for smooth corners
 */
export function offsetPolygons(polygons: Point[][], deltaMm: number, arcTolerance = 0.1): Point[][] {
  if (polygons.length === 0 || deltaMm === 0) return polygons;
  
  const clipper = getClipper();
  const lib = getClipperLib();
  const clipperPaths: ClipperPaths = polygons.map(toClipperPath);
  
  const result = clipper.offsetToPaths({
    delta: deltaMm * CLIPPER_SCALE,
    offsetInputs: [{
      data: clipperPaths,
      joinType: lib.JoinType.Round,
      endType: lib.EndType.ClosedPolygon
    }],
    arcTolerance: arcTolerance * CLIPPER_SCALE
  });
  
  return result ? result.map(fromClipperPath) : polygons;
}

// ============================================================================
// Circle & Capsule Generators
// ============================================================================

/**
 * Generate circle polygon
 */
export function circlePolygon(cx: number, cy: number, r: number, segments = 32): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  return points;
}

/**
 * Generate capsule (pill) shape polygon
 * Horizontal capsule from (x1, cy) to (x2, cy) with radius r
 */
export function capsulePolygon(x1: number, x2: number, cy: number, r: number, segments = 16): Point[] {
  const points: Point[] = [];
  
  // Right semicircle (x2)
  for (let i = 0; i <= segments; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / segments;
    points.push({
      x: x2 + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  
  // Left semicircle (x1)
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / segments;
    points.push({
      x: x1 + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  
  return points;
}

/**
 * Generate rectangle polygon
 */
export function rectPolygon(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h }
  ];
}

// ============================================================================
// High-Level Sticker Operations
// ============================================================================

/**
 * Create sticker outline from text and icon SVG paths
 * Returns: { baseOutline, topUnion } polygons
 */
export async function createStickerOutline(
  svgPaths: string[],
  offsetMm: number,
  flattenTolerance = 0.2
): Promise<{ baseOutline: Point[][]; topUnion: Point[][] }> {
  await initClipper();
  
  // Convert all SVG paths to polygons
  const allPolygons: Point[][] = [];
  for (const pathD of svgPaths) {
    const polys = svgPathToPolygons(pathD, flattenTolerance);
    allPolygons.push(...polys);
  }
  
  if (allPolygons.length === 0) {
    return { baseOutline: [], topUnion: [] };
  }
  
  // Union all polygons
  const topUnion = unionPolygons(allPolygons);
  
  // Offset union outward
  const baseOutline = offsetPolygons(topUnion, offsetMm);
  
  return { baseOutline, topUnion };
}

/**
 * Create ring with bridge attached to sticker outline
 */
export function createRingWithBridge(
  anchorX: number,
  anchorY: number,
  ringCx: number,
  ringCy: number,
  outerR: number,
  innerR: number,
  bridgeWidth: number
): { ringOutline: Point[][]; ringHole: Point[][] } {
  // Outer ring circle
  const outerCircle = circlePolygon(ringCx, ringCy, outerR, 48);
  
  // Inner ring hole
  const innerCircle = circlePolygon(ringCx, ringCy, innerR, 32);
  
  // Bridge capsule connecting ring to anchor point
  const bridgeHalfH = bridgeWidth / 2;
  const bridgePoly = rectPolygon(
    Math.min(anchorX, ringCx),
    anchorY - bridgeHalfH,
    Math.abs(ringCx - anchorX),
    bridgeWidth
  );
  
  // Union outer circle and bridge
  const ringOutline = unionPolygons([outerCircle, bridgePoly]);
  
  return { ringOutline, ringHole: [innerCircle] };
}
