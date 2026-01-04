/**
 * SVG Safety Layer for Export
 * Sanitizes and validates SVG for laser-safe output
 */

const FORBIDDEN_TAGS = [
  'script',
  'foreignObject',
  'image',
  'filter',
  'mask',
  'pattern',
  'use',
  'iframe',
  'embed',
  'object',
  'video',
  'audio',
];

const FORBIDDEN_ATTRS = [
  'onload',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onmousedown',
  'onmouseup',
  'onfocus',
  'onblur',
  'onerror',
  'onabort',
];

export interface SvgValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Sanitize SVG by removing forbidden tags and attributes
 */
export function sanitizeSvgForExport(svgString: string): string {
  if (!svgString || typeof svgString !== 'string') {
    return '';
  }

  let svg = svgString.trim();

  // Remove forbidden tags
  for (const tag of FORBIDDEN_TAGS) {
    // Remove self-closing tags
    const selfClosingPattern = new RegExp(`<${tag}[^>]*\\/>`, 'gi');
    svg = svg.replace(selfClosingPattern, '');

    // Remove tags with content
    const contentPattern = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi');
    svg = svg.replace(contentPattern, '');
  }

  // Remove forbidden attributes
  for (const attr of FORBIDDEN_ATTRS) {
    const attrPattern = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    svg = svg.replace(attrPattern, '');
  }

  // Remove javascript: URLs
  svg = svg.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  svg = svg.replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, '');

  // Remove external references (http/https)
  svg = svg.replace(/xlink:href\s*=\s*["']https?:[^"']*["']/gi, '');
  svg = svg.replace(/href\s*=\s*["']https?:[^"']*["']/gi, '');

  // Remove data: URIs for images (but keep for other purposes)
  svg = svg.replace(/xlink:href\s*=\s*["']data:image[^"']*["']/gi, '');

  return svg;
}

/**
 * Normalize SVG sizing to mm with proper viewBox
 */
export function normalizeSvgSizing(svgString: string, options: { units?: 'mm' | 'px' } = {}): string {
  if (!svgString || typeof svgString !== 'string') {
    return svgString;
  }

  const { units = 'mm' } = options;
  let svg = svgString;

  // Extract current width, height, viewBox
  const widthMatch = svg.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const heightMatch = svg.match(/\bheight\s*=\s*["']([^"']+)["']/i);
  const viewBoxMatch = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);

  // Parse dimension to number (stripping unit)
  const parseDim = (val: string | null): { value: number; unit: string } | null => {
    if (!val) return null;
    const match = val.trim().match(/^([\d.]+)\s*(mm|cm|in|px|pt)?$/i);
    if (!match) return null;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return null;
    return { value: num, unit: (match[2] || 'px').toLowerCase() };
  };

  // Convert to mm
  const toMm = (val: number, unit: string): number => {
    switch (unit) {
      case 'mm': return val;
      case 'cm': return val * 10;
      case 'in': return val * 25.4;
      case 'pt': return val * 25.4 / 72;
      case 'px':
      default:
        return val * 25.4 / 96; // Assume 96 DPI
    }
  };

  const width = parseDim(widthMatch?.[1] ?? null);
  const height = parseDim(heightMatch?.[1] ?? null);
  const viewBox = viewBoxMatch?.[1] || null;

  // If we have width/height but no viewBox, add viewBox
  if (width && height && !viewBox) {
    const vbW = width.value;
    const vbH = height.value;
    svg = svg.replace(/<svg/, `<svg viewBox="0 0 ${vbW} ${vbH}"`);
  }

  // If we have viewBox but no width/height, derive from viewBox
  if (viewBox && (!width || !height)) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length >= 4) {
      const vbW = parts[2];
      const vbH = parts[3];
      if (!width) {
        svg = svg.replace(/<svg/, `<svg width="${vbW}${units}"`);
      }
      if (!height) {
        svg = svg.replace(/<svg/, `<svg height="${vbH}${units}"`);
      }
    }
  }

  // Normalize units to mm if requested
  if (units === 'mm' && width && height) {
    const widthMm = toMm(width.value, width.unit);
    const heightMm = toMm(height.value, height.unit);

    if (widthMatch) {
      svg = svg.replace(widthMatch[0], `width="${widthMm.toFixed(2)}mm"`);
    }
    if (heightMatch) {
      svg = svg.replace(heightMatch[0], `height="${heightMm.toFixed(2)}mm"`);
    }
  }

  return svg;
}

/**
 * Validate SVG for export safety
 */
export function validateSvgForExport(svgString: string): SvgValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!svgString || typeof svgString !== 'string') {
    errors.push('SVG content is empty or invalid');
    return { ok: false, warnings, errors };
  }

  // Check for forbidden tags
  for (const tag of FORBIDDEN_TAGS) {
    const pattern = new RegExp(`<${tag}[\\s>]`, 'i');
    if (pattern.test(svgString)) {
      if (tag === 'image') {
        errors.push(`SVG contains raster <image> elements which are not laser-safe`);
      } else if (tag === 'script') {
        errors.push(`SVG contains <script> elements which are not allowed`);
      } else {
        warnings.push(`SVG contains <${tag}> elements which will be removed`);
      }
    }
  }

  // Check for forbidden attributes
  for (const attr of FORBIDDEN_ATTRS) {
    const pattern = new RegExp(`\\s${attr}\\s*=`, 'i');
    if (pattern.test(svgString)) {
      warnings.push(`SVG contains ${attr} attribute which will be removed`);
    }
  }

  // Check for external references
  if (/href\s*=\s*["']https?:/i.test(svgString)) {
    warnings.push('SVG contains external references which will be removed');
  }

  // Check for viewBox
  if (!/viewBox\s*=/i.test(svgString)) {
    warnings.push('SVG is missing viewBox attribute');
  }

  // Check for width/height
  if (!/\bwidth\s*=/i.test(svgString) || !/\bheight\s*=/i.test(svgString)) {
    warnings.push('SVG is missing width or height attributes');
  }

  // Check for very large path counts (potential performance issue)
  const pathCount = (svgString.match(/<path/gi) || []).length;
  if (pathCount > 10000) {
    warnings.push(`SVG contains ${pathCount} paths which may be slow to process`);
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Full export pipeline: sanitize, normalize, validate
 */
export function prepareForExport(
  svgString: string,
  options: { units?: 'mm' | 'px' } = {}
): { svg: string; validation: SvgValidationResult } {
  // First validate to capture original issues
  const preValidation = validateSvgForExport(svgString);

  // Sanitize
  let svg = sanitizeSvgForExport(svgString);

  // Normalize sizing
  svg = normalizeSvgSizing(svg, options);

  // Re-validate after cleanup
  const postValidation = validateSvgForExport(svg);

  return {
    svg,
    validation: {
      ok: postValidation.ok,
      warnings: [...new Set([...preValidation.warnings, ...postValidation.warnings])],
      errors: postValidation.errors,
    },
  };
}
