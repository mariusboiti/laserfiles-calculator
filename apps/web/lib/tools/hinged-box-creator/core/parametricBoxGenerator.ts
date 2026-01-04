/**
 * Parametric Hinged Box Generator
 * Based on user-provided template with full editability
 */

export interface ParametricBoxParams {
  // Box dimensions
  widthMm: number;      // Internal width
  depthMm: number;      // Internal depth
  heightMm: number;     // Internal height
  thicknessMm: number;  // Material thickness
  kerfMm: number;       // Kerf compensation
  
  // Finger joints
  fingerWidthMm: number;
  autoFitFingers: boolean;
  manualFingerCount?: number;
  
  // Hinge
  hingeFingerWidthMm: number;
  hingeClearanceMm: number;
  hingeFingerCount: number;
  
  // Front slot (circular)
  slotEnabled: boolean;
  slotDiameterMm: number;
  slotOffsetFromTopMm: number;
}

export interface BoxPanel {
  name: string;
  svg: string;
  widthMm: number;
  heightMm: number;
}

type Point = { x: number; y: number };

function pt(x: number, y: number): Point {
  return { x, y };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function mul(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s };
}

/**
 * Generate finger joint pattern along an edge
 */
function generateFingerJoints(
  start: Point,
  direction: Point,
  normal: Point,
  length: number,
  depth: number,
  fingerWidth: number,
  autoFit: boolean,
  manualCount: number | undefined,
  isMale: boolean
): Point[] {
  const points: Point[] = [];
  
  // Calculate finger count
  let count = manualCount && Number.isFinite(manualCount) ? Math.max(1, Math.floor(manualCount)) : Math.max(1, Math.round(length / fingerWidth));
  if (!manualCount && autoFit && count % 2 === 0) {
    count += 1; // Ensure odd number for symmetry
  }
  
  const actualFingerWidth = length / count;
  const n = isMale ? normal : mul(normal, -1);
  
  let current = start;
  points.push(current);
  
  for (let i = 0; i < count; i++) {
    const isFinger = i % 2 === 0;
    
    if (isFinger) {
      // Create finger protrusion
      current = add(current, mul(n, depth));
      points.push(current);
      current = add(current, mul(direction, actualFingerWidth));
      points.push(current);
      current = add(current, mul(n, -depth));
      points.push(current);
    } else {
      // Flat section
      current = add(current, mul(direction, actualFingerWidth));
      points.push(current);
    }
  }
  
  return points;
}

/**
 * Generate hinge finger pattern
 */
function generateHingeFingers(
  start: Point,
  direction: Point,
  normal: Point,
  length: number,
  depth: number,
  fingerWidth: number,
  fingerCount: number,
  clearance: number,
  isBack: boolean
): Point[] {
  const points: Point[] = [];
  const pitchWidth = length / fingerCount;
  const tabWidth = pitchWidth - clearance;
  
  let current = start;
  points.push(current);
  
  for (let i = 0; i < fingerCount; i++) {
    const isFinger = isBack ? (i % 2 === 0) : (i % 2 === 1);
    
    if (isFinger) {
      // Gap before tab
      current = add(current, mul(direction, clearance / 2));
      points.push(current);
      
      // Tab protrusion
      current = add(current, mul(normal, depth));
      points.push(current);
      current = add(current, mul(direction, tabWidth));
      points.push(current);
      current = add(current, mul(normal, -depth));
      points.push(current);
      
      // Gap after tab
      current = add(current, mul(direction, clearance / 2));
      points.push(current);
    } else {
      // Empty space
      current = add(current, mul(direction, pitchWidth));
      points.push(current);
    }
  }
  
  return points;
}

/**
 * Generate circular slot
 */
function generateCircularSlot(centerX: number, centerY: number, diameter: number): string {
  const radius = diameter / 2;
  return `M ${(centerX - radius).toFixed(3)} ${centerY.toFixed(3)} ` +
         `A ${radius.toFixed(3)} ${radius.toFixed(3)} 0 1 0 ${(centerX + radius).toFixed(3)} ${centerY.toFixed(3)} ` +
         `A ${radius.toFixed(3)} ${radius.toFixed(3)} 0 1 0 ${(centerX - radius).toFixed(3)} ${centerY.toFixed(3)} Z`;
}

/**
 * Convert points array to SVG path
 */
function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  
  let path = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`;
  }
  path += ' Z';
  
  return path;
}

/**
 * Generate front panel with optional slot
 */
function generateFrontPanel(params: ParametricBoxParams): BoxPanel {
  const { widthMm: W, heightMm: H, thicknessMm: T, fingerWidthMm, autoFitFingers, manualFingerCount, slotEnabled, slotDiameterMm, slotOffsetFromTopMm } = params;
  
  const points: Point[] = [];
  
  // Start at top-left
  let current = pt(0, 0);
  
  // Top edge (plain)
  points.push(...[current, pt(W, 0)]);
  
  // Right edge (male fingers)
  current = pt(W, 0);
  const rightPoints = generateFingerJoints(current, pt(0, 1), pt(1, 0), H, T, fingerWidthMm, autoFitFingers, manualFingerCount, true);
  points.push(...rightPoints.slice(1));
  
  // Bottom edge (male fingers)
  current = pt(W, H);
  const bottomPoints = generateFingerJoints(current, pt(-1, 0), pt(0, 1), W, T, fingerWidthMm, autoFitFingers, manualFingerCount, true);
  points.push(...bottomPoints.slice(1));
  
  // Left edge (male fingers)
  current = pt(0, H);
  const leftPoints = generateFingerJoints(current, pt(0, -1), pt(-1, 0), H, T, fingerWidthMm, autoFitFingers, manualFingerCount, true);
  points.push(...leftPoints.slice(1));
  
  let path = pointsToPath(points);
  
  // Add circular slot if enabled
  if (slotEnabled) {
    const slotX = W / 2;
    const slotY = slotOffsetFromTopMm;
    path += ' ' + generateCircularSlot(slotX, slotY, slotDiameterMm);
  }
  
  const padding = 5;
  const svgWidth = W + padding * 2;
  const svgHeight = H + padding * 2;
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(3)}mm" height="${svgHeight.toFixed(3)}mm" viewBox="${-padding} ${-padding} ${svgWidth.toFixed(3)} ${svgHeight.toFixed(3)}">
  <path d="${path}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
  
  return { name: 'front', svg, widthMm: W, heightMm: H };
}

/**
 * Generate back panel with hinge
 */
function generateBackPanel(params: ParametricBoxParams): BoxPanel {
  const { widthMm: W, heightMm: H, thicknessMm: T, fingerWidthMm, autoFitFingers, manualFingerCount, hingeFingerWidthMm, hingeClearanceMm, hingeFingerCount } = params;
  
  const points: Point[] = [];
  
  // Start at top-left
  let current = pt(0, 0);
  
  // Top edge (hinge fingers - back side)
  const hingePoints = generateHingeFingers(current, pt(1, 0), pt(0, -1), W, T, hingeFingerWidthMm, hingeFingerCount, hingeClearanceMm, true);
  points.push(...hingePoints);
  
  // Right edge (male fingers)
  current = pt(W, 0);
  const rightPoints = generateFingerJoints(current, pt(0, 1), pt(1, 0), H, T, fingerWidthMm, autoFitFingers, undefined, true);
  points.push(...rightPoints.slice(1));
  
  // Bottom edge (male fingers)
  current = pt(W, H);
  const bottomPoints = generateFingerJoints(current, pt(-1, 0), pt(0, 1), W, T, fingerWidthMm, autoFitFingers, undefined, true);
  points.push(...bottomPoints.slice(1));
  
  // Left edge (male fingers)
  current = pt(0, H);
  const leftPoints = generateFingerJoints(current, pt(0, -1), pt(-1, 0), H, T, fingerWidthMm, autoFitFingers, undefined, true);
  points.push(...leftPoints.slice(1));
  
  const path = pointsToPath(points);
  
  const padding = 5;
  const svgWidth = W + padding * 2;
  const svgHeight = H + T + padding * 2; // Extra space for hinge tabs
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(3)}mm" height="${svgHeight.toFixed(3)}mm" viewBox="${-padding} ${-padding - T} ${svgWidth.toFixed(3)} ${svgHeight.toFixed(3)}">
  <path d="${path}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
  
  return { name: 'back', svg, widthMm: W, heightMm: H };
}

/**
 * Generate side panels (left/right)
 */
function generateSidePanel(params: ParametricBoxParams, isLeft: boolean): BoxPanel {
  const { depthMm: D, heightMm: H, thicknessMm: T, fingerWidthMm, autoFitFingers, manualFingerCount } = params;
  
  const points: Point[] = [];
  
  // Start at top-left
  let current = pt(0, 0);
  
  // Top edge (plain)
  points.push(...[current, pt(D, 0)]);
  
  // Right edge (female fingers - mate with front/back)
  current = pt(D, 0);
  const rightPoints = generateFingerJoints(current, pt(0, 1), pt(1, 0), H, T, fingerWidthMm, autoFitFingers, manualFingerCount, false);
  points.push(...rightPoints.slice(1));
  
  // Bottom edge (male fingers)
  current = pt(D, H);
  const bottomPoints = generateFingerJoints(current, pt(-1, 0), pt(0, 1), D, T, fingerWidthMm, autoFitFingers, manualFingerCount, true);
  points.push(...bottomPoints.slice(1));
  
  // Left edge (female fingers - mate with front/back)
  current = pt(0, H);
  const leftPoints = generateFingerJoints(current, pt(0, -1), pt(-1, 0), H, T, fingerWidthMm, autoFitFingers, manualFingerCount, false);
  points.push(...leftPoints.slice(1));
  
  const path = pointsToPath(points);
  
  const padding = 5;
  const svgWidth = D + padding * 2;
  const svgHeight = H + padding * 2;
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(3)}mm" height="${svgHeight.toFixed(3)}mm" viewBox="${-padding} ${-padding} ${svgWidth.toFixed(3)} ${svgHeight.toFixed(3)}">
  <path d="${path}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
  
  return { name: isLeft ? 'left' : 'right', svg, widthMm: D, heightMm: H };
}

/**
 * Generate bottom panel
 */
function generateBottomPanel(params: ParametricBoxParams): BoxPanel {
  const { widthMm: W, depthMm: D, thicknessMm: T, fingerWidthMm, autoFitFingers, manualFingerCount } = params;
  
  const points: Point[] = [];
  
  // Start at top-left
  let current = pt(0, 0);
  
  // Top edge (female fingers - mate with back)
  const topPoints = generateFingerJoints(current, pt(1, 0), pt(0, -1), W, T, fingerWidthMm, autoFitFingers, manualFingerCount, false);
  points.push(...topPoints);
  
  // Right edge (female fingers - mate with right side)
  current = pt(W, 0);
  const rightPoints = generateFingerJoints(current, pt(0, 1), pt(1, 0), D, T, fingerWidthMm, autoFitFingers, manualFingerCount, false);
  points.push(...rightPoints.slice(1));
  
  // Bottom edge (female fingers - mate with front)
  current = pt(W, D);
  const bottomPoints = generateFingerJoints(current, pt(-1, 0), pt(0, 1), W, T, fingerWidthMm, autoFitFingers, manualFingerCount, false);
  points.push(...bottomPoints.slice(1));
  
  // Left edge (female fingers - mate with left side)
  current = pt(0, D);
  const leftPoints = generateFingerJoints(current, pt(0, -1), pt(-1, 0), D, T, fingerWidthMm, autoFitFingers, manualFingerCount, false);
  points.push(...leftPoints.slice(1));
  
  const path = pointsToPath(points);
  
  const padding = 5;
  const svgWidth = W + padding * 2;
  const svgHeight = D + padding * 2;
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(3)}mm" height="${svgHeight.toFixed(3)}mm" viewBox="${-padding} ${-padding} ${svgWidth.toFixed(3)} ${svgHeight.toFixed(3)}">
  <path d="${path}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
  
  return { name: 'bottom', svg, widthMm: W, heightMm: D };
}

/**
 * Generate lid panel with hinge
 */
function generateLidPanel(params: ParametricBoxParams): BoxPanel {
  const { widthMm: W, depthMm: D, thicknessMm: T, hingeFingerWidthMm, hingeClearanceMm, hingeFingerCount } = params;
  
  const points: Point[] = [];
  
  // Start at top-left
  let current = pt(0, 0);
  
  // Top edge (hinge fingers - lid side)
  const hingePoints = generateHingeFingers(current, pt(1, 0), pt(0, -1), W, T, hingeFingerWidthMm, hingeFingerCount, hingeClearanceMm, false);
  points.push(...hingePoints);
  
  // Right edge (plain)
  current = pt(W, 0);
  points.push(...[current, pt(W, D)]);
  
  // Bottom edge (plain)
  current = pt(W, D);
  points.push(...[current, pt(0, D)]);
  
  // Left edge (plain)
  current = pt(0, D);
  points.push(...[current, pt(0, 0)]);
  
  const path = pointsToPath(points);
  
  const padding = 5;
  const svgWidth = W + padding * 2;
  const svgHeight = D + T + padding * 2; // Extra space for hinge tabs
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth.toFixed(3)}mm" height="${svgHeight.toFixed(3)}mm" viewBox="${-padding} ${-padding - T} ${svgWidth.toFixed(3)} ${svgHeight.toFixed(3)}">
  <path d="${path}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
  
  return { name: 'lid', svg, widthMm: W, heightMm: D };
}

/**
 * Generate all box panels
 */
export function generateParametricBox(params: ParametricBoxParams): Record<string, BoxPanel> {
  return {
    front: generateFrontPanel(params),
    back: generateBackPanel(params),
    left: generateSidePanel(params, true),
    right: generateSidePanel(params, false),
    bottom: generateBottomPanel(params),
    lid: generateLidPanel(params),
  };
}
