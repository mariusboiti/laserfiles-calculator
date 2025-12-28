/**
 * Keychain Generator V2 - Hole Layout
 * Supports circle, slot, and double hole configurations
 */

import type { HoleConfig, HoleGeometry, TextRegion, HolePosition, HoleType } from '../types/keychainV2';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Compute hole geometries based on configuration
 */
export function computeHoleGeometry(
  config: HoleConfig,
  shapeWidth: number,
  shapeHeight: number
): HoleGeometry[] {
  if (!config.enabled || config.position === 'none') return [];

  const holes: HoleGeometry[] = [];
  const { type, position, diameter, slotWidth, slotHeight, spacing, margin } = config;

  switch (type) {
    case 'circle':
      holes.push(createCircleHole(shapeWidth, shapeHeight, diameter, margin, position));
      break;

    case 'slot':
      holes.push(createSlotHole(shapeWidth, shapeHeight, slotWidth, slotHeight, margin, position));
      break;

    case 'double':
      holes.push(...createDoubleHoles(shapeWidth, shapeHeight, diameter, spacing, margin, position));
      break;
  }

  return holes;
}

function createCircleHole(
  w: number,
  h: number,
  diameter: number,
  margin: number,
  position: HolePosition
): HoleGeometry {
  const r = diameter / 2;
  const { cx, cy } = getHoleCenter(w, h, r, margin, position);

  return { shape: 'circle', cx, cy, rx: r, ry: r };
}

function createSlotHole(
  w: number,
  h: number,
  slotWidth: number,
  slotHeight: number,
  margin: number,
  position: HolePosition
): HoleGeometry {
  const rx = slotWidth / 2;
  const ry = slotHeight / 2;
  const maxR = Math.max(rx, ry);
  const { cx, cy } = getHoleCenter(w, h, maxR, margin, position);

  return { shape: 'ellipse', cx, cy, rx, ry };
}

function createDoubleHoles(
  w: number,
  h: number,
  diameter: number,
  spacing: number,
  margin: number,
  position: HolePosition
): HoleGeometry[] {
  const r = diameter / 2;
  const halfSpacing = spacing / 2;

  if (position === 'left' || position === 'right') {
    // Vertical stack
    const cx = position === 'left' ? margin + r : w - margin - r;
    return [
      { shape: 'circle', cx, cy: h / 2 - halfSpacing, rx: r, ry: r },
      { shape: 'circle', cx, cy: h / 2 + halfSpacing, rx: r, ry: r },
    ];
  } else if (position === 'top') {
    // Horizontal stack
    const cy = margin + r;
    return [
      { shape: 'circle', cx: w / 2 - halfSpacing, cy, rx: r, ry: r },
      { shape: 'circle', cx: w / 2 + halfSpacing, cy, rx: r, ry: r },
    ];
  }

  return [];
}

function getHoleCenter(
  w: number,
  h: number,
  radius: number,
  margin: number,
  position: HolePosition
): { cx: number; cy: number } {
  switch (position) {
    case 'left':
      return { cx: margin + radius, cy: h / 2 };
    case 'right':
      return { cx: w - margin - radius, cy: h / 2 };
    case 'top':
      return { cx: w / 2, cy: margin + radius };
    default:
      return { cx: w / 2, cy: h / 2 };
  }
}

/**
 * Calculate reserved rectangle for holes (to subtract from text region)
 */
export function calculateHoleReservedRect(
  holes: HoleGeometry[],
  position: HolePosition,
  margin: number
): { x: number; y: number; width: number; height: number } | null {
  if (holes.length === 0 || position === 'none') return null;

  // Find bounding box of all holes
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const hole of holes) {
    minX = Math.min(minX, hole.cx - hole.rx);
    maxX = Math.max(maxX, hole.cx + hole.rx);
    minY = Math.min(minY, hole.cy - hole.ry);
    maxY = Math.max(maxY, hole.cy + hole.ry);
  }

  const safeMargin = 3; // Extra safety margin from hole edge

  return {
    x: minX - safeMargin,
    y: minY - safeMargin,
    width: maxX - minX + safeMargin * 2,
    height: maxY - minY + safeMargin * 2,
  };
}

/**
 * Calculate text region after subtracting hole reserved area
 */
export function calculateTextRegion(
  shapeWidth: number,
  shapeHeight: number,
  padding: number,
  holes: HoleGeometry[],
  holePosition: HolePosition,
  holeMargin: number
): TextRegion {
  let x = padding;
  let y = padding;
  let width = shapeWidth - padding * 2;
  let height = shapeHeight - padding * 2;

  const reserved = calculateHoleReservedRect(holes, holePosition, holeMargin);

  if (reserved) {
    switch (holePosition) {
      case 'left':
        x = reserved.x + reserved.width;
        width = shapeWidth - x - padding;
        break;
      case 'right':
        width = reserved.x - padding;
        break;
      case 'top':
        y = reserved.y + reserved.height;
        height = shapeHeight - y - padding;
        break;
    }
  }

  return {
    x: mm(x),
    y: mm(y),
    width: mm(Math.max(5, width)),
    height: mm(Math.max(5, height)),
    centerX: mm(x + width / 2),
    centerY: mm(y + height / 2),
  };
}

/**
 * Get maximum hole extent for a given axis
 */
export function getHoleExtent(holes: HoleGeometry[], axis: 'x' | 'y'): { min: number; max: number } {
  if (holes.length === 0) return { min: 0, max: 0 };

  let min = Infinity;
  let max = -Infinity;

  for (const hole of holes) {
    if (axis === 'x') {
      min = Math.min(min, hole.cx - hole.rx);
      max = Math.max(max, hole.cx + hole.rx);
    } else {
      min = Math.min(min, hole.cy - hole.ry);
      max = Math.max(max, hole.cy + hole.ry);
    }
  }

  return { min, max };
}

/**
 * Check if hole fits within shape bounds
 */
export function holeFitsInShape(
  holes: HoleGeometry[],
  shapeWidth: number,
  shapeHeight: number,
  minEdgeDistance: number = 1.2
): boolean {
  for (const hole of holes) {
    if (hole.cx - hole.rx < minEdgeDistance) return false;
    if (hole.cx + hole.rx > shapeWidth - minEdgeDistance) return false;
    if (hole.cy - hole.ry < minEdgeDistance) return false;
    if (hole.cy + hole.ry > shapeHeight - minEdgeDistance) return false;
  }
  return true;
}

/**
 * Calculate web thickness (min distance from hole edge to shape edge)
 */
export function calculateWebThickness(
  holes: HoleGeometry[],
  shapeWidth: number,
  shapeHeight: number,
  holePosition: HolePosition
): number {
  if (holes.length === 0) return Infinity;

  let minWeb = Infinity;

  for (const hole of holes) {
    // Check distance to each edge
    const toLeft = hole.cx - hole.rx;
    const toRight = shapeWidth - hole.cx - hole.rx;
    const toTop = hole.cy - hole.ry;
    const toBottom = shapeHeight - hole.cy - hole.ry;

    // Use the edge relevant to hole position
    switch (holePosition) {
      case 'left':
        minWeb = Math.min(minWeb, toLeft);
        break;
      case 'right':
        minWeb = Math.min(minWeb, toRight);
        break;
      case 'top':
        minWeb = Math.min(minWeb, toTop);
        break;
      default:
        minWeb = Math.min(minWeb, toLeft, toRight, toTop, toBottom);
    }
  }

  return minWeb;
}

/**
 * Generate SVG elements for holes
 */
export function generateHoleSvgElements(
  holes: HoleGeometry[],
  strokeWidth: number = 0.001
): string {
  return holes.map(hole => {
    if (hole.shape === 'circle') {
      return `<circle cx="${mm(hole.cx)}" cy="${mm(hole.cy)}" r="${mm(hole.rx)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    } else {
      return `<ellipse cx="${mm(hole.cx)}" cy="${mm(hole.cy)}" rx="${mm(hole.rx)}" ry="${mm(hole.ry)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    }
  }).join('\n    ');
}
