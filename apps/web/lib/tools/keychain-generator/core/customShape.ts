/**
 * Keychain Generator V3 - Custom Shape Import
 * Parse SVG files and extract outline paths
 */

export interface CustomShapeResult {
  success: boolean;
  path: string | null;
  bounds: { width: number; height: number } | null;
  warnings: string[];
}

/**
 * Parse SVG string and extract the largest path
 */
export function parseCustomSvg(svgContent: string): CustomShapeResult {
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');

    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { success: false, path: null, bounds: null, warnings: ['Invalid SVG file'] };
    }

    const svg = doc.querySelector('svg');
    if (!svg) {
      return { success: false, path: null, bounds: null, warnings: ['No SVG element found'] };
    }

    // Get viewBox or width/height
    const viewBox = svg.getAttribute('viewBox');
    let width = 100;
    let height = 100;

    if (viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
      if (parts.length >= 4) {
        width = parts[2];
        height = parts[3];
      }
    } else {
      const w = svg.getAttribute('width');
      const h = svg.getAttribute('height');
      if (w) width = parseFloat(w) || 100;
      if (h) height = parseFloat(h) || 100;
    }

    // Find all paths
    const paths = doc.querySelectorAll('path');
    const circles = doc.querySelectorAll('circle');
    const rects = doc.querySelectorAll('rect');
    const ellipses = doc.querySelectorAll('ellipse');
    const polygons = doc.querySelectorAll('polygon');

    const allPaths: { d: string; area: number }[] = [];

    // Extract path d attributes
    paths.forEach((path) => {
      const d = path.getAttribute('d');
      if (d) {
        const area = estimatePathArea(d, width, height);
        allPaths.push({ d, area });
      }
    });

    // Convert circles to paths
    circles.forEach((circle) => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');
      if (r > 0) {
        const d = circleToDPath(cx, cy, r);
        allPaths.push({ d, area: Math.PI * r * r });
      }
    });

    // Convert rects to paths
    rects.forEach((rect) => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const w = parseFloat(rect.getAttribute('width') || '0');
      const h = parseFloat(rect.getAttribute('height') || '0');
      const rx = parseFloat(rect.getAttribute('rx') || '0');
      const ry = parseFloat(rect.getAttribute('ry') || rx.toString());
      if (w > 0 && h > 0) {
        const d = rectToDPath(x, y, w, h, rx, ry);
        allPaths.push({ d, area: w * h });
      }
    });

    // Convert ellipses to paths
    ellipses.forEach((ellipse) => {
      const cx = parseFloat(ellipse.getAttribute('cx') || '0');
      const cy = parseFloat(ellipse.getAttribute('cy') || '0');
      const rx = parseFloat(ellipse.getAttribute('rx') || '0');
      const ry = parseFloat(ellipse.getAttribute('ry') || '0');
      if (rx > 0 && ry > 0) {
        const d = ellipseToDPath(cx, cy, rx, ry);
        allPaths.push({ d, area: Math.PI * rx * ry });
      }
    });

    // Convert polygons to paths
    polygons.forEach((polygon) => {
      const points = polygon.getAttribute('points');
      if (points) {
        const d = polygonToDPath(points);
        allPaths.push({ d, area: estimatePathArea(d, width, height) });
      }
    });

    if (allPaths.length === 0) {
      return { success: false, path: null, bounds: null, warnings: ['No paths found in SVG'] };
    }

    if (allPaths.length > 1) {
      warnings.push(`Multiple outlines detected (${allPaths.length}) — using largest`);
    }

    // Sort by area and pick largest
    allPaths.sort((a, b) => b.area - a.area);
    const largestPath = allPaths[0];

    // Check if path is closed
    if (!isPathClosed(largestPath.d)) {
      warnings.push('Custom shape has open path — may not cut correctly');
    }

    return {
      success: true,
      path: largestPath.d,
      bounds: { width, height },
      warnings,
    };
  } catch (error) {
    return { success: false, path: null, bounds: null, warnings: ['Failed to parse SVG'] };
  }
}

/**
 * Normalize path to fit within target dimensions
 */
export function normalizePath(
  path: string,
  originalBounds: { width: number; height: number },
  targetWidth: number,
  targetHeight: number
): string {
  const scaleX = targetWidth / originalBounds.width;
  const scaleY = targetHeight / originalBounds.height;

  // Use uniform scale to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);

  // Simple transform: scale the path
  // This is a simplified approach - a full implementation would parse and transform each command
  return `<g transform="scale(${scale})">${path}</g>`;
}

/**
 * Scale path commands to new dimensions
 */
export function scalePath(
  path: string,
  originalBounds: { width: number; height: number },
  targetWidth: number,
  targetHeight: number
): string {
  const scaleX = targetWidth / originalBounds.width;
  const scaleY = targetHeight / originalBounds.height;

  // Parse and scale path commands
  return path.replace(/(-?\d+\.?\d*)/g, (match, num, offset) => {
    const value = parseFloat(num);
    // Alternate between x and y scaling (simplified approach)
    // This works for most simple paths but may not be perfect for complex curves
    return (value * scaleX).toFixed(3);
  });
}

// ============ Helper Functions ============

function circleToDPath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function ellipseToDPath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

function rectToDPath(x: number, y: number, w: number, h: number, rx: number, ry: number): string {
  if (rx === 0 && ry === 0) {
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  }

  const r = Math.min(rx, ry, w / 2, h / 2);
  return `M ${x + r} ${y} 
    L ${x + w - r} ${y} 
    Q ${x + w} ${y} ${x + w} ${y + r} 
    L ${x + w} ${y + h - r} 
    Q ${x + w} ${y + h} ${x + w - r} ${y + h} 
    L ${x + r} ${y + h} 
    Q ${x} ${y + h} ${x} ${y + h - r} 
    L ${x} ${y + r} 
    Q ${x} ${y} ${x + r} ${y} Z`;
}

function polygonToDPath(points: string): string {
  const coords = points.trim().split(/[\s,]+/).map(Number);
  if (coords.length < 4) return '';

  let d = `M ${coords[0]} ${coords[1]}`;
  for (let i = 2; i < coords.length; i += 2) {
    d += ` L ${coords[i]} ${coords[i + 1]}`;
  }
  d += ' Z';
  return d;
}

function isPathClosed(d: string): boolean {
  const normalized = d.trim().toUpperCase();
  return normalized.endsWith('Z');
}

function estimatePathArea(d: string, viewWidth: number, viewHeight: number): number {
  // Simple estimation based on bounding box from path commands
  // This is a rough approximation
  const numbers = d.match(/-?\d+\.?\d*/g)?.map(Number) || [];
  if (numbers.length < 2) return 0;

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1] || 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return (maxX - minX) * (maxY - minY);
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
