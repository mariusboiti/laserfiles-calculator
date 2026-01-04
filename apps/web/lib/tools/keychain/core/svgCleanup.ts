/**
 * Keychain Hub - SVG Cleanup & Validation
 * Sanitize, validate, and clean AI-generated SVGs for laser cutting
 */

// Disallowed elements for laser-safe SVGs
const DISALLOWED_ELEMENTS = [
  'script', 'style', 'foreignObject', 'image', 'text', 'tspan',
  'mask', 'clipPath', 'filter', 'pattern', 'linearGradient',
  'radialGradient', 'defs', 'use', 'symbol', 'marker', 'animate',
  'animateMotion', 'animateTransform', 'set', 'mpath'
];

// Allowed elements
const ALLOWED_ELEMENTS = ['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line'];

/**
 * Check if string is valid SVG
 */
export function isValidSvg(svg: string): boolean {
  if (!svg || typeof svg !== 'string') return false;
  
  const trimmed = svg.trim();
  if (!trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml')) return false;
  if (!trimmed.includes('</svg>')) return false;
  
  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'image/svg+xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) return false;
      const svgEl = doc.querySelector('svg');
      return svgEl !== null;
    }
    // SSR fallback - basic regex check
    return /<svg[^>]*>[\s\S]*<\/svg>/i.test(trimmed);
  } catch {
    return false;
  }
}

/**
 * Sanitize SVG - remove scripts, event handlers, and dangerous content
 */
export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  
  let cleaned = svg;
  
  // Remove XML declaration
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
  
  // Remove DOCTYPE
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove event handlers (onclick, onload, etc.)
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: URLs
  cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');
  cleaned = cleaned.replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  // Remove data: URLs (potential XSS)
  cleaned = cleaned.replace(/href\s*=\s*["']data:[^"']*["']/gi, '');
  
  return cleaned.trim();
}

/**
 * Strip unsupported elements (mask, clip, filter, image, text, etc.)
 */
export function stripUnsupported(svg: string): string {
  if (typeof DOMParser === 'undefined') {
    // SSR fallback - regex-based removal
    let cleaned = svg;
    for (const tag of DISALLOWED_ELEMENTS) {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
      cleaned = cleaned.replace(regex, '');
      // Self-closing
      cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
    }
    return cleaned;
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svg;
    
    // Remove disallowed elements
    for (const tag of DISALLOWED_ELEMENTS) {
      const elements = svgEl.querySelectorAll(tag);
      elements.forEach(el => el.remove());
    }
    
    // Remove <defs> contents but keep structure if needed
    const defs = svgEl.querySelectorAll('defs');
    defs.forEach(d => d.remove());
    
    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return svg;
  }
}

/**
 * Normalize viewBox to 0 0 100 100
 */
export function normalizeViewBox(svg: string): string {
  if (typeof DOMParser === 'undefined') {
    // SSR fallback
    return svg.replace(/viewBox\s*=\s*["'][^"']*["']/i, 'viewBox="0 0 100 100"');
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svg;
    
    svgEl.setAttribute('viewBox', '0 0 100 100');
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    
    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return svg;
  }
}

/**
 * Extract all path d attributes from SVG
 */
export function extractPaths(svg: string): string[] {
  const paths: string[] = [];
  
  if (typeof DOMParser === 'undefined') {
    // SSR fallback - regex
    const regex = /<path[^>]*\sd\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = regex.exec(svg)) !== null) {
      if (match[1]) paths.push(match[1]);
    }
    return paths;
  }
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    
    // Get paths
    doc.querySelectorAll('path').forEach(path => {
      const d = path.getAttribute('d');
      if (d && d.trim()) paths.push(d.trim());
    });
    
    // Convert circles to paths
    doc.querySelectorAll('circle').forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');
      if (r > 0) {
        paths.push(`M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`);
      }
    });
    
    // Convert rects to paths
    doc.querySelectorAll('rect').forEach(rect => {
      const x = parseFloat(rect.getAttribute('x') || '0');
      const y = parseFloat(rect.getAttribute('y') || '0');
      const w = parseFloat(rect.getAttribute('width') || '0');
      const h = parseFloat(rect.getAttribute('height') || '0');
      const rx = parseFloat(rect.getAttribute('rx') || '0');
      const ry = parseFloat(rect.getAttribute('ry') || rx.toString());
      
      if (w > 0 && h > 0) {
        if (rx > 0 || ry > 0) {
          // Rounded rect
          const r = Math.min(rx, ry, w / 2, h / 2);
          paths.push(`M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`);
        } else {
          paths.push(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`);
        }
      }
    });
    
    // Convert ellipses to paths
    doc.querySelectorAll('ellipse').forEach(ellipse => {
      const cx = parseFloat(ellipse.getAttribute('cx') || '0');
      const cy = parseFloat(ellipse.getAttribute('cy') || '0');
      const rx = parseFloat(ellipse.getAttribute('rx') || '0');
      const ry = parseFloat(ellipse.getAttribute('ry') || '0');
      if (rx > 0 && ry > 0) {
        paths.push(`M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`);
      }
    });
    
    // Convert polygons to paths
    doc.querySelectorAll('polygon').forEach(polygon => {
      const points = polygon.getAttribute('points');
      if (points) {
        const coords = points.trim().split(/[\s,]+/).map(Number);
        if (coords.length >= 4) {
          let d = `M ${coords[0]} ${coords[1]}`;
          for (let i = 2; i < coords.length; i += 2) {
            d += ` L ${coords[i]} ${coords[i + 1]}`;
          }
          d += ' Z';
          paths.push(d);
        }
      }
    });
    
    // Convert polylines to paths
    doc.querySelectorAll('polyline').forEach(polyline => {
      const points = polyline.getAttribute('points');
      if (points) {
        const coords = points.trim().split(/[\s,]+/).map(Number);
        if (coords.length >= 4) {
          let d = `M ${coords[0]} ${coords[1]}`;
          for (let i = 2; i < coords.length; i += 2) {
            d += ` L ${coords[i]} ${coords[i + 1]}`;
          }
          paths.push(d);
        }
      }
    });
    
    // Convert lines to paths
    doc.querySelectorAll('line').forEach(line => {
      const x1 = parseFloat(line.getAttribute('x1') || '0');
      const y1 = parseFloat(line.getAttribute('y1') || '0');
      const x2 = parseFloat(line.getAttribute('x2') || '0');
      const y2 = parseFloat(line.getAttribute('y2') || '0');
      paths.push(`M ${x1} ${y1} L ${x2} ${y2}`);
    });
    
  } catch {
    // Ignore parse errors
  }
  
  return paths;
}

/**
 * Merge paths and wrap in clean SVG
 */
export function mergeAndWrap(paths: string[], style: 'outline' | 'fill' = 'outline'): string {
  if (paths.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>';
  }
  
  const pathElements = paths.map(d => {
    if (style === 'fill') {
      return `<path d="${d}" fill="#000" stroke="none" />`;
    }
    return `<path d="${d}" fill="none" stroke="#000" stroke-width="2" />`;
  }).join('\n  ');
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  ${pathElements}
</svg>`;
}

/**
 * Full cleanup pipeline
 */
export function cleanupSvg(svg: string): { svg: string; paths: string[]; valid: boolean } {
  if (!isValidSvg(svg)) {
    return { svg: '', paths: [], valid: false };
  }
  
  let cleaned = sanitizeSvg(svg);
  cleaned = stripUnsupported(cleaned);
  
  const paths = extractPaths(cleaned);
  
  if (paths.length === 0) {
    return { svg: '', paths: [], valid: false };
  }
  
  const finalSvg = mergeAndWrap(paths);
  
  return { svg: finalSvg, paths, valid: true };
}

/**
 * Count path commands for complexity estimation
 */
export function countPathCommands(paths: string[]): number {
  let count = 0;
  for (const d of paths) {
    // Count command letters
    count += (d.match(/[MLHVCSQTAZ]/gi) || []).length;
  }
  return count;
}

/**
 * Get total path data length
 */
export function getPathDataLength(paths: string[]): number {
  return paths.reduce((sum, d) => sum + d.length, 0);
}
