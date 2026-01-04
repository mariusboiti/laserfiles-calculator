/**
 * Keychain Hub - Geometry Utilities
 * Offset paths, bounding boxes, transforms, unit helpers
 */

// Precision helper
export function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Clamp helper
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

// Bounding box
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Point
export interface Point {
  x: number;
  y: number;
}

/**
 * Compute bounding box from multiple boxes
 */
export function unionBBox(boxes: BBox[]): BBox {
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Expand bounding box by offset
 */
export function expandBBox(box: BBox, offset: number): BBox {
  return {
    x: box.x - offset,
    y: box.y - offset,
    width: box.width + offset * 2,
    height: box.height + offset * 2,
  };
}

/**
 * Center point of bounding box
 */
export function bboxCenter(box: BBox): Point {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Generate rounded rectangle path
 */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  return `M ${mm(x + radius)} ${mm(y)} 
    L ${mm(x + w - radius)} ${mm(y)} 
    Q ${mm(x + w)} ${mm(y)} ${mm(x + w)} ${mm(y + radius)} 
    L ${mm(x + w)} ${mm(y + h - radius)} 
    Q ${mm(x + w)} ${mm(y + h)} ${mm(x + w - radius)} ${mm(y + h)} 
    L ${mm(x + radius)} ${mm(y + h)} 
    Q ${mm(x)} ${mm(y + h)} ${mm(x)} ${mm(y + h - radius)} 
    L ${mm(x)} ${mm(y + radius)} 
    Q ${mm(x)} ${mm(y)} ${mm(x + radius)} ${mm(y)} Z`;
}

/**
 * Generate capsule/stadium path
 */
export function capsulePath(x: number, y: number, w: number, h: number): string {
  const radius = h / 2;
  if (w <= h) {
    // Circle
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = w / 2;
    return `M ${mm(cx - r)} ${mm(cy)} A ${mm(r)} ${mm(r)} 0 1 1 ${mm(cx + r)} ${mm(cy)} A ${mm(r)} ${mm(r)} 0 1 1 ${mm(cx - r)} ${mm(cy)} Z`;
  }
  return `M ${mm(x + radius)} ${mm(y)} 
    L ${mm(x + w - radius)} ${mm(y)} 
    A ${mm(radius)} ${mm(radius)} 0 0 1 ${mm(x + w - radius)} ${mm(y + h)} 
    L ${mm(x + radius)} ${mm(y + h)} 
    A ${mm(radius)} ${mm(radius)} 0 0 1 ${mm(x + radius)} ${mm(y)} Z`;
}

/**
 * Generate circle path
 */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M ${mm(cx - r)} ${mm(cy)} A ${mm(r)} ${mm(r)} 0 1 1 ${mm(cx + r)} ${mm(cy)} A ${mm(r)} ${mm(r)} 0 1 1 ${mm(cx - r)} ${mm(cy)} Z`;
}

/**
 * Generate hexagon path
 */
export function hexagonPath(cx: number, cy: number, rx: number, ry: number): string {
  const points: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    });
  }
  return `M ${points.map(p => `${mm(p.x)} ${mm(p.y)}`).join(' L ')} Z`;
}

/**
 * Generate dog tag path (rounded rect with top bump)
 */
export function dogTagPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  const bumpRadius = w * 0.15;
  const bumpHeight = h * 0.1;

  return `M ${mm(x + radius)} ${mm(y)} 
    L ${mm(x + w / 2 - bumpRadius)} ${mm(y)} 
    Q ${mm(x + w / 2)} ${mm(y - bumpHeight)} ${mm(x + w / 2 + bumpRadius)} ${mm(y)} 
    L ${mm(x + w - radius)} ${mm(y)} 
    Q ${mm(x + w)} ${mm(y)} ${mm(x + w)} ${mm(y + radius)} 
    L ${mm(x + w)} ${mm(y + h - radius)} 
    Q ${mm(x + w)} ${mm(y + h)} ${mm(x + w - radius)} ${mm(y + h)} 
    L ${mm(x + radius)} ${mm(y + h)} 
    Q ${mm(x)} ${mm(y + h)} ${mm(x)} ${mm(y + h - radius)} 
    L ${mm(x)} ${mm(y + radius)} 
    Q ${mm(x)} ${mm(y)} ${mm(x + radius)} ${mm(y)} Z`;
}

/**
 * Generate outline path with offset (simplified approach)
 * For proper offset, use clipper-lib or paper.js
 * This is a simplified version using expanded rounded rect
 */
export function outlinePath(innerBBox: BBox, offset: number, cornerRadius: number): string {
  const outer = expandBBox(innerBBox, offset);
  return roundedRectPath(outer.x, outer.y, outer.width, outer.height, cornerRadius + offset);
}

/**
 * Generate bubble/blob path around content
 * Uses expanded rounded rect with large corner radius
 */
export function bubblePath(contentBBox: BBox, padding: number, cornerRadius: number): string {
  const outer = expandBBox(contentBBox, padding);
  const r = Math.min(cornerRadius, outer.width / 2, outer.height / 2);
  return roundedRectPath(outer.x, outer.y, outer.width, outer.height, r);
}

/**
 * Scale a path string by factor
 * Simple approach - works for most SVG paths
 */
export function scalePath(pathD: string, scale: number, originX: number = 0, originY: number = 0): string {
  return pathD.replace(/(-?\d+\.?\d*)/g, (match, num) => {
    const value = parseFloat(num);
    return mm(value * scale).toString();
  });
}

/**
 * Translate a path string
 */
export function translatePath(pathD: string, dx: number, dy: number): string {
  // This is a simplified approach
  // For proper translation, parse the path commands
  return pathD;
}

/**
 * Generate transform attribute for scaling and positioning
 */
export function transformAttr(tx: number, ty: number, scale: number = 1): string {
  if (scale === 1) {
    return `translate(${mm(tx)}, ${mm(ty)})`;
  }
  return `translate(${mm(tx)}, ${mm(ty)}) scale(${scale})`;
}

/**
 * Calculate hole position based on shape and config
 */
export function calculateHolePosition(
  shapeBBox: BBox,
  holeRadius: number,
  holeMargin: number,
  position: 'left' | 'top' | 'right' | 'none'
): Point | null {
  if (position === 'none') return null;

  const cx = shapeBBox.x + shapeBBox.width / 2;
  const cy = shapeBBox.y + shapeBBox.height / 2;

  switch (position) {
    case 'left':
      return { x: shapeBBox.x + holeMargin + holeRadius, y: cy };
    case 'right':
      return { x: shapeBBox.x + shapeBBox.width - holeMargin - holeRadius, y: cy };
    case 'top':
      return { x: cx, y: shapeBBox.y + holeMargin + holeRadius };
    default:
      return null;
  }
}

/**
 * Check if hole fits within shape
 */
export function holeFitsInShape(
  shapeBBox: BBox,
  holeRadius: number,
  holeMargin: number,
  position: 'left' | 'top' | 'right' | 'none',
  minEdge: number = 1.2
): boolean {
  if (position === 'none') return true;

  const holePos = calculateHolePosition(shapeBBox, holeRadius, holeMargin, position);
  if (!holePos) return true;

  const left = holePos.x - holeRadius;
  const right = holePos.x + holeRadius;
  const top = holePos.y - holeRadius;
  const bottom = holePos.y + holeRadius;

  return (
    left >= shapeBBox.x + minEdge &&
    right <= shapeBBox.x + shapeBBox.width - minEdge &&
    top >= shapeBBox.y + minEdge &&
    bottom <= shapeBBox.y + shapeBBox.height - minEdge
  );
}

/**
 * Calculate web thickness (distance from hole to edge)
 */
export function calculateWebThickness(
  shapeBBox: BBox,
  holeRadius: number,
  holeMargin: number,
  position: 'left' | 'top' | 'right' | 'none'
): number {
  if (position === 'none') return Infinity;

  switch (position) {
    case 'left':
      return holeMargin;
    case 'right':
      return holeMargin;
    case 'top':
      return holeMargin;
    default:
      return Infinity;
  }
}
