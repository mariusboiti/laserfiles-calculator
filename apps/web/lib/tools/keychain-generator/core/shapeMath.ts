import type { KeychainShape, HolePosition } from '../types/keychain';

/**
 * Generate SVG path for rounded rectangle
 */
export function roundedRectPath(w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  return `M ${radius} 0 
    L ${w - radius} 0 
    Q ${w} 0 ${w} ${radius} 
    L ${w} ${h - radius} 
    Q ${w} ${h} ${w - radius} ${h} 
    L ${radius} ${h} 
    Q 0 ${h} 0 ${h - radius} 
    L 0 ${radius} 
    Q 0 0 ${radius} 0 Z`;
}

/**
 * Generate SVG path for capsule/pill shape (stadium)
 */
export function capsulePath(w: number, h: number): string {
  const radius = h / 2;
  if (w <= h) {
    return `M ${w / 2} 0 A ${w / 2} ${w / 2} 0 1 1 ${w / 2} ${h} A ${w / 2} ${w / 2} 0 1 1 ${w / 2} 0 Z`;
  }
  return `M ${radius} 0 
    L ${w - radius} 0 
    A ${radius} ${radius} 0 0 1 ${w - radius} ${h} 
    L ${radius} ${h} 
    A ${radius} ${radius} 0 0 1 ${radius} 0 Z`;
}

/**
 * Generate SVG path for dog tag (rounded rect with top arc bump)
 */
export function dogTagPath(w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  const bumpRadius = w * 0.15;
  const bumpHeight = h * 0.1;
  
  return `M ${radius} 0 
    L ${w / 2 - bumpRadius} 0 
    Q ${w / 2} ${-bumpHeight} ${w / 2 + bumpRadius} 0 
    L ${w - radius} 0 
    Q ${w} 0 ${w} ${radius} 
    L ${w} ${h - radius} 
    Q ${w} ${h} ${w - radius} ${h} 
    L ${radius} ${h} 
    Q 0 ${h} 0 ${h - radius} 
    L 0 ${radius} 
    Q 0 0 ${radius} 0 Z`;
}

/**
 * Generate SVG circle attributes
 */
export function circleAttrs(diameter: number): { cx: number; cy: number; r: number } {
  const radius = diameter / 2;
  return { cx: radius, cy: radius, r: radius };
}

/**
 * Generate SVG polygon points for hexagon
 */
export function hexagonPoints(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    points.push([x, y]);
  }
  
  return points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
}

/**
 * Calculate hole center position based on position setting
 */
export function calculateHoleCenter(
  w: number,
  h: number,
  holeRadius: number,
  holeMargin: number,
  position: HolePosition
): { cx: number; cy: number } | null {
  if (position === 'none') return null;
  
  switch (position) {
    case 'left':
      return { cx: holeMargin + holeRadius, cy: h / 2 };
    case 'right':
      return { cx: w - holeMargin - holeRadius, cy: h / 2 };
    case 'top':
      return { cx: w / 2, cy: holeMargin + holeRadius };
    default:
      return null;
  }
}

/**
 * Check if hole fits within shape bounds
 */
export function holeFits(
  w: number,
  h: number,
  holeRadius: number,
  holeMargin: number,
  position: HolePosition
): boolean {
  if (position === 'none') return true;
  
  const minDimension = Math.min(w, h);
  const requiredSpace = 2 * (holeRadius + holeMargin);
  
  if (position === 'left' || position === 'right') {
    return w >= requiredSpace && h >= 2 * holeRadius;
  }
  
  if (position === 'top') {
    return h >= requiredSpace && w >= 2 * holeRadius;
  }
  
  return true;
}

/**
 * Generate shape outline SVG element
 */
export function generateShapeOutline(
  shape: KeychainShape,
  w: number,
  h: number,
  cornerRadius: number
): string {
  switch (shape) {
    case 'rounded-rectangle':
      return `<path d="${roundedRectPath(w, h, cornerRadius)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    case 'capsule':
      return `<path d="${capsulePath(w, h)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    case 'dog-tag':
      return `<path d="${dogTagPath(w, h, cornerRadius)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    case 'circle': {
      const diameter = Math.max(w, h);
      const { cx, cy, r } = circleAttrs(diameter);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="0.5" />`;
    }
    
    case 'hexagon':
      return `<polygon points="${hexagonPoints(w, h)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    default:
      return `<path d="${roundedRectPath(w, h, cornerRadius)}" fill="none" stroke="#000" stroke-width="0.5" />`;
  }
}

/**
 * Get viewBox dimensions for a given shape
 */
export function getShapeViewBox(shape: KeychainShape, w: number, h: number): { width: number; height: number } {
  if (shape === 'circle') {
    const diameter = Math.max(w, h);
    return { width: diameter, height: diameter };
  }
  
  if (shape === 'dog-tag') {
    return { width: w, height: h + h * 0.1 };
  }
  
  return { width: w, height: h };
}
