/**
 * SVG Normalizer and Metadata Extractor
 * Sanitizes SVG for safe storage and extracts dimensions/operations metadata
 */

export interface SvgMeta {
  bboxMm: {
    width: number;
    height: number;
  } | null;
  hasCuts: boolean;
  hasScores: boolean;
  hasEngraves: boolean;
  pathCount: number;
  viewBox: string | null;
}

/**
 * Sanitize SVG string for safe storage
 * - Removes <image>, <foreignObject>, <script> elements
 * - Removes event handlers
 * - Removes external references
 * - Normalizes width/height/viewBox if possible
 */
export function sanitizeSvg(svgString: string): string {
  if (!svgString || typeof svgString !== 'string') {
    return '';
  }

  let svg = svgString.trim();

  // Remove script tags
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Remove image tags (may contain external refs or base64 bloat)
  svg = svg.replace(/<image[\s\S]*?(?:\/>|<\/image>)/gi, '');
  
  // Remove foreignObject tags
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  
  // Remove filter elements (can be complex and not needed for laser)
  svg = svg.replace(/<filter[\s\S]*?<\/filter>/gi, '');
  
  // Remove event handlers (onclick, onload, etc.)
  svg = svg.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: URLs
  svg = svg.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  svg = svg.replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Remove external references (keep data: URIs if needed)
  svg = svg.replace(/xlink:href\s*=\s*["']https?:[^"']*["']/gi, '');
  svg = svg.replace(/href\s*=\s*["']https?:[^"']*["']/gi, '');

  return svg;
}

/**
 * Extract metadata from SVG string
 * Best-effort extraction of dimensions and operation hints
 */
export function extractSvgMeta(svgString: string): SvgMeta {
  const defaultMeta: SvgMeta = {
    bboxMm: null,
    hasCuts: false,
    hasScores: false,
    hasEngraves: false,
    pathCount: 0,
    viewBox: null,
  };

  if (!svgString || typeof svgString !== 'string') {
    return defaultMeta;
  }

  // Extract viewBox
  const viewBoxMatch = svgString.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = viewBoxMatch?.[1] || null;

  // Extract width and height attributes
  const widthMatch = svgString.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const heightMatch = svgString.match(/\bheight\s*=\s*["']([^"']+)["']/i);

  let bboxMm: { width: number; height: number } | null = null;

  // Parse dimensions - try direct width/height first
  if (widthMatch && heightMatch) {
    const width = parseDimension(widthMatch[1]);
    const height = parseDimension(heightMatch[1]);
    if (width !== null && height !== null) {
      bboxMm = { width, height };
    }
  }

  // If no dimensions from attributes, try viewBox
  if (!bboxMm && viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length >= 4 && !parts.some(isNaN)) {
      // viewBox is typically in user units, assume mm if no unit specified
      bboxMm = { width: parts[2], height: parts[3] };
    }
  }

  // Count paths
  const pathMatches = svgString.match(/<path[\s\S]*?(?:\/>|<\/path>)/gi);
  const pathCount = pathMatches?.length || 0;

  // Detect operations by inspecting styles and attributes
  const hasCuts = detectCuts(svgString);
  const hasScores = detectScores(svgString);
  const hasEngraves = detectEngraves(svgString);

  return {
    bboxMm,
    hasCuts,
    hasScores,
    hasEngraves,
    pathCount,
    viewBox,
  };
}

/**
 * Parse dimension string to mm
 * Supports: mm, cm, in, px, pt, plain numbers (assumed mm)
 */
function parseDimension(value: string): number | null {
  if (!value) return null;
  
  const trimmed = value.trim().toLowerCase();
  
  // Match number and optional unit
  const match = trimmed.match(/^([\d.]+)\s*(mm|cm|in|px|pt)?$/);
  if (!match) return null;
  
  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  
  const unit = match[2] || 'mm';
  
  // Convert to mm
  switch (unit) {
    case 'mm':
      return num;
    case 'cm':
      return num * 10;
    case 'in':
      return num * 25.4;
    case 'px':
      // Assume 96 DPI (standard web)
      return num * 25.4 / 96;
    case 'pt':
      return num * 25.4 / 72;
    default:
      return num; // Assume mm
  }
}

/**
 * Detect cut operations (stroke, no fill, specific colors)
 */
function detectCuts(svg: string): boolean {
  // Look for stroke without fill, or data-layer="cut"
  if (/data-layer\s*=\s*["']cut["']/i.test(svg)) return true;
  if (/data-operation\s*=\s*["']cut["']/i.test(svg)) return true;
  
  // Red stroke often indicates cuts
  if (/stroke\s*[:=]\s*["']?#?ff0000/i.test(svg)) return true;
  if (/stroke\s*[:=]\s*["']?red/i.test(svg)) return true;
  
  // Stroke with no fill is often a cut
  if (/stroke\s*[:=]/ .test(svg) && /fill\s*[:=]\s*["']?none/i.test(svg)) return true;
  
  return false;
}

/**
 * Detect score operations (dashed lines, specific colors)
 */
function detectScores(svg: string): boolean {
  if (/data-layer\s*=\s*["']score["']/i.test(svg)) return true;
  if (/data-operation\s*=\s*["']score["']/i.test(svg)) return true;
  
  // Dashed lines often indicate scores
  if (/stroke-dasharray/i.test(svg)) return true;
  
  // Green stroke often indicates scores
  if (/stroke\s*[:=]\s*["']?#?00ff00/i.test(svg)) return true;
  if (/stroke\s*[:=]\s*["']?green/i.test(svg)) return true;
  
  return false;
}

/**
 * Detect engrave operations (filled areas, raster hints)
 */
function detectEngraves(svg: string): boolean {
  if (/data-layer\s*=\s*["']engrave["']/i.test(svg)) return true;
  if (/data-operation\s*=\s*["']engrave["']/i.test(svg)) return true;
  
  // Filled areas (non-none fill) suggest engraving
  if (/fill\s*[:=]\s*["']?#(?!fff|ffffff)/i.test(svg)) return true;
  if (/fill\s*[:=]\s*["']?(?!none|transparent|white)/i.test(svg)) return true;
  
  // Blue stroke often indicates engraving
  if (/stroke\s*[:=]\s*["']?#?0000ff/i.test(svg)) return true;
  if (/stroke\s*[:=]\s*["']?blue/i.test(svg)) return true;
  
  return false;
}

/**
 * Normalize SVG viewBox and dimensions to mm
 */
export function normalizeSvgDimensions(svgString: string, targetWidthMm?: number, targetHeightMm?: number): string {
  if (!svgString) return svgString;

  const meta = extractSvgMeta(svgString);
  
  // If we have target dimensions, update the SVG
  if (targetWidthMm && targetHeightMm) {
    let svg = svgString;
    
    // Update or add width/height attributes
    if (/\bwidth\s*=/.test(svg)) {
      svg = svg.replace(/\bwidth\s*=\s*["'][^"']*["']/, `width="${targetWidthMm}mm"`);
    } else {
      svg = svg.replace(/<svg/, `<svg width="${targetWidthMm}mm"`);
    }
    
    if (/\bheight\s*=/.test(svg)) {
      svg = svg.replace(/\bheight\s*=\s*["'][^"']*["']/, `height="${targetHeightMm}mm"`);
    } else {
      svg = svg.replace(/<svg/, `<svg height="${targetHeightMm}mm"`);
    }
    
    return svg;
  }
  
  return svgString;
}
