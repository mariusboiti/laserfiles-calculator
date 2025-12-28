/**
 * Personalised Sign Generator V3 PRO - SVG Normalization
 * Ensure consistent viewBox and scale for AI-generated SVG
 */

export interface NormalizeResult {
  svg: string;
  originalViewBox: string | null;
  normalizedViewBox: string;
  bounds: { x: number; y: number; width: number; height: number };
  warnings: string[];
}

/**
 * Parse viewBox string
 */
function parseViewBox(viewBox: string): { x: number; y: number; width: number; height: number } | null {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return null;
  }
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

/**
 * Calculate bounding box from path data
 */
function calculatePathBounds(pathD: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  // Simple regex-based extraction of coordinates
  const numbers: number[] = [];
  const matches = pathD.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  
  for (const match of matches) {
    numbers.push(parseFloat(match[0]));
  }

  if (numbers.length < 2) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  // Approximate bounds by treating pairs as coordinates
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Normalize SVG to have proper viewBox
 */
export function normalizeSvg(svgString: string): NormalizeResult {
  const warnings: string[] = [];

  if (!svgString || svgString.trim() === '') {
    return {
      svg: '',
      originalViewBox: null,
      normalizedViewBox: '0 0 100 100',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      warnings: ['Empty SVG input'],
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      return {
        svg: svgString,
        originalViewBox: null,
        normalizedViewBox: '0 0 100 100',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
        warnings: ['No SVG element found'],
      };
    }

    const originalViewBox = svgElement.getAttribute('viewBox');
    let viewBox = originalViewBox ? parseViewBox(originalViewBox) : null;

    // If no viewBox, try to calculate from paths
    if (!viewBox) {
      warnings.push('SVG missing viewBox - calculating from content');
      
      const paths = svgElement.querySelectorAll('path');
      let globalMinX = Infinity, globalMinY = Infinity;
      let globalMaxX = -Infinity, globalMaxY = -Infinity;

      paths.forEach(path => {
        const d = path.getAttribute('d');
        if (d) {
          const bounds = calculatePathBounds(d);
          if (bounds) {
            globalMinX = Math.min(globalMinX, bounds.minX);
            globalMinY = Math.min(globalMinY, bounds.minY);
            globalMaxX = Math.max(globalMaxX, bounds.maxX);
            globalMaxY = Math.max(globalMaxY, bounds.maxY);
          }
        }
      });

      if (isFinite(globalMinX) && isFinite(globalMinY) && isFinite(globalMaxX) && isFinite(globalMaxY)) {
        const padding = 5;
        viewBox = {
          x: globalMinX - padding,
          y: globalMinY - padding,
          width: globalMaxX - globalMinX + padding * 2,
          height: globalMaxY - globalMinY + padding * 2,
        };
      } else {
        // Fallback to default
        viewBox = { x: 0, y: 0, width: 100, height: 100 };
        warnings.push('Could not calculate bounds - using default viewBox');
      }
    }

    // Ensure viewBox has valid dimensions
    if (viewBox.width <= 0) viewBox.width = 100;
    if (viewBox.height <= 0) viewBox.height = 100;

    const normalizedViewBox = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
    svgElement.setAttribute('viewBox', normalizedViewBox);

    // Remove width/height to let viewBox control sizing
    svgElement.removeAttribute('width');
    svgElement.removeAttribute('height');

    // Ensure xmlns
    if (!svgElement.getAttribute('xmlns')) {
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const serializer = new XMLSerializer();
    const normalizedSvg = serializer.serializeToString(svgElement);

    return {
      svg: normalizedSvg,
      originalViewBox,
      normalizedViewBox,
      bounds: viewBox,
      warnings,
    };
  } catch (e) {
    return {
      svg: svgString,
      originalViewBox: null,
      normalizedViewBox: '0 0 100 100',
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      warnings: ['Failed to normalize SVG: ' + (e instanceof Error ? e.message : 'Unknown error')],
    };
  }
}

/**
 * Scale SVG to fit target dimensions
 */
export function scaleSvgToFit(
  svgString: string,
  targetWidthMm: number,
  targetHeightMm: number,
  fillPercent: number = 0.7
): { svg: string; scale: number; offsetX: number; offsetY: number } {
  if (!svgString) {
    return { svg: '', scale: 1, offsetX: 0, offsetY: 0 };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) {
      return { svg: svgString, scale: 1, offsetX: 0, offsetY: 0 };
    }

    const viewBox = svgElement.getAttribute('viewBox');
    if (!viewBox) {
      return { svg: svgString, scale: 1, offsetX: 0, offsetY: 0 };
    }

    const vb = parseViewBox(viewBox);
    if (!vb) {
      return { svg: svgString, scale: 1, offsetX: 0, offsetY: 0 };
    }

    // Calculate scale to fit
    const targetW = targetWidthMm * fillPercent;
    const targetH = targetHeightMm * fillPercent;
    
    const scaleX = targetW / vb.width;
    const scaleY = targetH / vb.height;
    const scale = Math.min(scaleX, scaleY);

    const scaledW = vb.width * scale;
    const scaledH = vb.height * scale;

    // Center in target area
    const offsetX = (targetWidthMm - scaledW) / 2;
    const offsetY = (targetHeightMm - scaledH) / 2;

    // Update viewBox to represent mm coordinates
    const newViewBox = `0 0 ${targetWidthMm} ${targetHeightMm}`;
    svgElement.setAttribute('viewBox', newViewBox);

    // Wrap content in transform group
    const content = svgElement.innerHTML;
    const transformedContent = `<g transform="translate(${offsetX}, ${offsetY}) scale(${scale})">${content}</g>`;
    svgElement.innerHTML = transformedContent;

    const serializer = new XMLSerializer();
    return {
      svg: serializer.serializeToString(svgElement),
      scale,
      offsetX,
      offsetY,
    };
  } catch (e) {
    return { svg: svgString, scale: 1, offsetX: 0, offsetY: 0 };
  }
}

/**
 * Extract all path data from SVG
 */
export function extractPaths(svgString: string): string[] {
  if (!svgString) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const paths = doc.querySelectorAll('path');
    
    return Array.from(paths)
      .map(p => p.getAttribute('d'))
      .filter((d): d is string => d !== null && d.trim() !== '');
  } catch {
    return [];
  }
}

/**
 * Combine multiple paths into single path string
 */
export function combinePaths(pathDs: string[]): string {
  return pathDs.filter(d => d && d.trim()).join(' ');
}
