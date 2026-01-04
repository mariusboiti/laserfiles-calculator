import type { SignShape } from '../types/sign';

/**
 * Generate SVG path for rectangle with optional rounded corners
 */
export function rectPath(w: number, h: number, r = 0): string {
  if (r <= 0) {
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }
  
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
 * Generate SVG path for arch sign (rectangle with semicircle on top)
 */
export function archPath(w: number, h: number): string {
  const archRadius = w / 2;
  const archHeight = archRadius;
  const rectHeight = h - archHeight;
  
  return `M 0 ${archHeight} 
    L 0 ${h} 
    L ${w} ${h} 
    L ${w} ${archHeight} 
    A ${archRadius} ${archRadius} 0 0 0 0 ${archHeight} Z`;
}

/**
 * Generate SVG circle element attributes
 */
export function circlePath(diameter: number): { cx: number; cy: number; r: number } {
  const radius = diameter / 2;
  return {
    cx: radius,
    cy: radius,
    r: radius,
  };
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
 * Get viewBox dimensions for a given shape
 */
export function getShapeViewBox(shape: SignShape, w: number, h: number): { width: number; height: number } {
  if (shape === 'circle') {
    const diameter = Math.max(w, h);
    return { width: diameter, height: diameter };
  }
  
  if (shape === 'arch') {
    const archHeight = w / 2;
    return { width: w, height: h };
  }
  
  return { width: w, height: h };
}

/**
 * Generate shape outline SVG element
 */
export function generateShapeOutline(shape: SignShape, w: number, h: number): string {
  switch (shape) {
    case 'rectangle':
      return `<path d="${rectPath(w, h)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    case 'rounded-rectangle':
      return `<path d="${rectPath(w, h, 10)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    case 'arch':
      return `<path d="${archPath(w, h)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    case 'circle': {
      const { cx, cy, r } = circlePath(Math.max(w, h));
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-width="0.5" />`;
    }
    
    case 'hexagon':
      return `<polygon points="${hexagonPoints(w, h)}" fill="none" stroke="#000" stroke-width="0.5" />`;
    
    default:
      return `<path d="${rectPath(w, h)}" fill="none" stroke="#000" stroke-width="0.5" />`;
  }
}
