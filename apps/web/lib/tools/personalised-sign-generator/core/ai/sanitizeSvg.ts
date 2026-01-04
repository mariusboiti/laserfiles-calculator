/**
 * Personalised Sign Generator V3 PRO - SVG Sanitization
 * Clean AI-generated SVG for laser safety
 */

/**
 * Allowed SVG elements for laser output
 */
const ALLOWED_ELEMENTS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon']);

/**
 * Allowed SVG attributes
 */
const ALLOWED_ATTRIBUTES = new Set([
  'viewBox', 'width', 'height', 'xmlns',
  'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'cx', 'cy', 'r', 'rx', 'ry',
  'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'points',
  'transform',
  'id', 'class',
  'opacity', 'fill-opacity', 'stroke-opacity',
]);

export interface SanitizeResult {
  svg: string;
  warnings: string[];
  elementCount: number;
  pathCommandCount: number;
}

/**
 * Extract SVG from markdown/text response
 */
export function extractSvgFromResponse(response: string): string | null {
  // Remove markdown code fences
  let cleaned = response
    .replace(/```svg\s*/gi, '')
    .replace(/```xml\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find SVG tag
  const svgMatch = cleaned.match(/<svg[^>]*>[\s\S]*<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0];
  }

  // Check if the response is already clean SVG
  if (cleaned.startsWith('<svg') && cleaned.endsWith('</svg>')) {
    return cleaned;
  }

  return null;
}

/**
 * Sanitize SVG for laser safety
 */
export function sanitizeSvg(svgString: string): SanitizeResult {
  const warnings: string[] = [];
  let elementCount = 0;
  let pathCommandCount = 0;

  if (!svgString || svgString.trim() === '') {
    return { svg: '', warnings: ['Empty SVG input'], elementCount: 0, pathCommandCount: 0 };
  }

  // Parse SVG
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(svgString, 'image/svg+xml');
    
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { 
        svg: '', 
        warnings: ['Invalid SVG: ' + parseError.textContent?.substring(0, 100)], 
        elementCount: 0, 
        pathCommandCount: 0 
      };
    }
  } catch (e) {
    return { 
      svg: '', 
      warnings: ['Failed to parse SVG'], 
      elementCount: 0, 
      pathCommandCount: 0 
    };
  }

  const svgElement = doc.querySelector('svg');
  if (!svgElement) {
    return { svg: '', warnings: ['No SVG element found'], elementCount: 0, pathCommandCount: 0 };
  }

  // Remove disallowed elements
  const allElements = svgElement.querySelectorAll('*');
  const elementsToRemove: Element[] = [];
  
  allElements.forEach(el => {
    const tagName = el.tagName.toLowerCase();
    
    // Remove scripts, style, foreignObject, etc.
    if (!ALLOWED_ELEMENTS.has(tagName)) {
      elementsToRemove.push(el);
      warnings.push(`Removed disallowed element: <${tagName}>`);
    } else {
      elementCount++;
      
      // Count path commands
      if (tagName === 'path') {
        const d = el.getAttribute('d') || '';
        const commands = d.match(/[MLHVCSQTAZmlhvcsqtaz]/g);
        pathCommandCount += commands ? commands.length : 0;
      }
      
      // Remove disallowed attributes
      const attrs = Array.from(el.attributes);
      attrs.forEach(attr => {
        if (!ALLOWED_ATTRIBUTES.has(attr.name) && !attr.name.startsWith('data-')) {
          el.removeAttribute(attr.name);
        }
      });
    }
  });

  elementsToRemove.forEach(el => el.remove());

  // Remove event handlers from SVG element itself
  const svgAttrs = Array.from(svgElement.attributes);
  svgAttrs.forEach(attr => {
    if (attr.name.startsWith('on') || !ALLOWED_ATTRIBUTES.has(attr.name)) {
      if (attr.name !== 'xmlns') {
        svgElement.removeAttribute(attr.name);
      }
    }
  });

  // Ensure xmlns is present
  if (!svgElement.getAttribute('xmlns')) {
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  // Serialize back to string
  const serializer = new XMLSerializer();
  const cleanedSvg = serializer.serializeToString(svgElement);

  // Complexity warnings
  if (pathCommandCount > 500) {
    warnings.push(`SVG is very complex (${pathCommandCount} path commands) - may affect performance`);
  }

  return {
    svg: cleanedSvg,
    warnings,
    elementCount,
    pathCommandCount,
  };
}

/**
 * Convert fills to strokes for engraving mode
 */
export function convertFillsToStrokes(svgString: string, strokeWidth: number = 1): string {
  if (!svgString) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) return svgString;

    const paths = svgElement.querySelectorAll('path, circle, rect, ellipse, polygon, polyline');
    
    paths.forEach(el => {
      const fill = el.getAttribute('fill');
      
      // If element has fill (not "none"), convert to stroke
      if (fill && fill !== 'none' && fill !== 'transparent') {
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', fill === 'white' || fill === '#ffffff' || fill === '#fff' ? '#000000' : fill);
        el.setAttribute('stroke-width', strokeWidth.toString());
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  } catch (e) {
    console.warn('[SanitizeSvg] Failed to convert fills to strokes:', e);
    return svgString;
  }
}

/**
 * Normalize stroke colors to black
 */
export function normalizeStrokeColors(svgString: string): string {
  if (!svgString) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) return svgString;

    const elements = svgElement.querySelectorAll('[stroke]');
    elements.forEach(el => {
      const stroke = el.getAttribute('stroke');
      if (stroke && stroke !== 'none') {
        el.setAttribute('stroke', '#000000');
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  } catch (e) {
    return svgString;
  }
}

/**
 * Normalize fill colors to black
 */
export function normalizeFillColors(svgString: string): string {
  if (!svgString) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) return svgString;

    const elements = svgElement.querySelectorAll('[fill]');
    elements.forEach(el => {
      const fill = el.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'transparent') {
        el.setAttribute('fill', '#000000');
      }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  } catch (e) {
    return svgString;
  }
}
