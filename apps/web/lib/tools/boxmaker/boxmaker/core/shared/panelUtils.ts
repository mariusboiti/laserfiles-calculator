import type { Point2D } from '../types';
import { enforceLaserSafeSvg, optimizePath } from '../svgUtils';

type Pt = Point2D;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function pt(x: number, y: number): Pt {
  return { x, y };
}

export function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function bbox(points: Pt[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export function pathFromPoints(points: Pt[]) {
  if (points.length === 0) return '';
  const parts: string[] = [];
  parts.push(`M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`);
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * Generate SVG string for a panel with outline.
 */
export function svgForPanel(outline: Pt[], padding = 1): string {
  const b = bbox(outline);
  const shift = pt(-b.minX + padding, -b.minY + padding);
  const shifted = outline.map((p) => add(p, shift));
  const bb2 = bbox(shifted);
  const w = bb2.maxX + padding;
  const h = bb2.maxY + padding;

  const d = pathFromPoints(shifted);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
  <path d="${d}" fill="none" stroke="#000" stroke-width="0.2" />
</svg>`;
}

/**
 * Generate SVG string for a panel with outline and inner cutouts (holes).
 * @param outline - outer perimeter
 * @param cutouts - array of inner rectangles to cut out (each as [topLeft, topRight, bottomRight, bottomLeft])
 */
export function svgForPanelWithCutouts(outline: Pt[], cutouts: Pt[][], padding = 1): string {
  const allPts = [...outline, ...cutouts.flat()];
  const b = bbox(allPts);
  const shift = pt(-b.minX + padding, -b.minY + padding);
  
  const shiftedOutline = outline.map((p) => add(p, shift));
  const shiftedCutouts = cutouts.map((cutout) => cutout.map((p) => add(p, shift)));
  
  const bb2 = bbox([...shiftedOutline, ...shiftedCutouts.flat()]);
  const w = bb2.maxX + padding;
  const h = bb2.maxY + padding;

  const outerPath = pathFromPoints(shiftedOutline);
  const cutoutPaths = shiftedCutouts.map((cutout) => pathFromPoints(cutout)).join(' ');
  
  const combinedPath = cutoutPaths ? `${outerPath} ${cutoutPaths}` : outerPath;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
  <path d="${combinedPath}" fill="none" stroke="#000" stroke-width="0.2" fill-rule="evenodd" />
</svg>`;
}
