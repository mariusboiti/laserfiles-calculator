/**
 * SVG size parser for Ornament Layout Planner V2
 * Robustly extracts dimensions from uploaded SVG templates
 * Supports pxDpi conversion and sanitization
 */

export interface ParsedSvgSize {
  width: number;
  height: number;
  viewBox?: { minX: number; minY: number; w: number; h: number };
  innerSvg: string;
  warnings?: string[];
}

export interface ParseSvgOptions {
  pxDpi?: number;
  sanitize?: boolean;
}

/**
 * Parse SVG text and extract dimensions and inner content
 */
export function parseSvgSize(svgText: string, opts?: ParseSvgOptions): ParsedSvgSize {
  const pxDpi = opts?.pxDpi ?? 96;
  const sanitize = opts?.sanitize ?? false;
  const warnings: string[] = [];
  try {
    // Parse SVG opening tag
    const svgTagMatch = svgText.match(/<svg[^>]*>/i);
    if (!svgTagMatch) {
      throw new Error('Invalid SVG: No <svg> tag found');
    }

    const svgTag = svgTagMatch[0];
    
    // Extract viewBox
    const viewBoxMatch = svgTag.match(/viewBox=["']([^"']+)["']/i);
    let viewBox: { minX: number; minY: number; w: number; h: number } | undefined;
    
    if (viewBoxMatch) {
      const values = viewBoxMatch[1].split(/[\s,]+/).map(Number);
      if (values.length === 4) {
        viewBox = {
          minX: values[0],
          minY: values[1],
          w: values[2],
          h: values[3],
        };
      }
    }

    // Extract width and height attributes
    const widthMatch = svgTag.match(/width=["']([^"']+)["']/i);
    const heightMatch = svgTag.match(/height=["']([^"']+)["']/i);

    let width = 0;
    let height = 0;

    // Prefer viewBox dimensions
    if (viewBox) {
      width = viewBox.w;
      height = viewBox.h;
    } else if (widthMatch && heightMatch) {
      // Parse width/height with units
      width = parseLength(widthMatch[1], pxDpi);
      height = parseLength(heightMatch[1], pxDpi);
    } else {
      throw new Error('Invalid SVG: No dimensions found (viewBox or width/height)');
    }

    // Extract inner SVG content (everything between <svg...> and </svg>)
    const innerMatch = svgText.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    let innerSvg = innerMatch ? innerMatch[1].trim() : '';

    // Sanitize if requested
    if (sanitize) {
      const sanitized = sanitizeSvgContent(innerSvg);
      innerSvg = sanitized.content;
      if (sanitized.removed.length > 0) {
        warnings.push(`SVG sanitized (removed: ${sanitized.removed.join(', ')})`);
      }
    }

    return {
      width,
      height,
      viewBox,
      innerSvg,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to parse SVG');
  }
}

/**
 * Parse length value with units (mm, px, in, etc.)
 * Converts to mm
 */
function parseLength(value: string, pxDpi: number): number {
  const trimmed = value.trim();
  
  // Extract number and unit
  const match = trimmed.match(/^([\d.]+)([a-z%]*)$/i);
  if (!match) {
    return parseFloat(trimmed) || 0;
  }

  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'mm':
      return num;
    case 'cm':
      return num * 10;
    case 'in':
      return num * 25.4;
    case 'px':
    case '':
      // Convert using provided DPI
      return num * 25.4 / pxDpi;
    case 'pt':
      return num * 25.4 / 72;
    default:
      return num; // Fallback: treat as mm
  }
}

/**
 * Sanitize SVG content by removing unsafe elements
 */
function sanitizeSvgContent(content: string): { content: string; removed: string[] } {
  const removed: string[] = [];
  let sanitized = content;

  // Remove script tags
  if (/<script[\s\S]*?<\/script>/gi.test(sanitized)) {
    sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
    removed.push('script');
  }

  // Remove foreignObject
  if (/<foreignObject[\s\S]*?<\/foreignObject>/gi.test(sanitized)) {
    sanitized = sanitized.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
    removed.push('foreignObject');
  }

  // Remove event handlers (on* attributes)
  if (/\son\w+\s*=/gi.test(sanitized)) {
    sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
    removed.push('event handlers');
  }

  return { content: sanitized, removed };
}

/**
 * Validate if SVG text is valid
 */
export function validateSvg(svgText: string): { valid: boolean; error?: string } {
  try {
    parseSvgSize(svgText);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid SVG',
    };
  }
}
