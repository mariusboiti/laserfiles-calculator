/**
 * Round Coaster & Badge Generator V3 - Curved Text (PRO)
 * Text on arc using SVG textPath - no canvas, no filters
 */

export interface CurvedTextConfig {
  enabled: boolean;
  position: 'top' | 'bottom';
  arcRadius: number;      // auto-calculated or manual
  startAngle: number;     // degrees
  endAngle: number;       // degrees
  flipBottom: boolean;    // flip text for bottom arc
  letterSpacing: number;  // extra spacing
}

export const DEFAULT_CURVED_TEXT: CurvedTextConfig = {
  enabled: false,
  position: 'top',
  arcRadius: 0, // 0 = auto
  startAngle: -60,
  endAngle: 60,
  flipBottom: true,
  letterSpacing: 0,
};

/**
 * Generate arc path for textPath
 * @param cx - center X
 * @param cy - center Y
 * @param radius - arc radius
 * @param startAngle - start angle in degrees (0 = top, clockwise)
 * @param endAngle - end angle in degrees
 * @param flip - flip for bottom text (counter-clockwise)
 */
export function generateArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  flip: boolean = false
): { path: string; id: string } {
  // Convert degrees to radians, offset by -90 to start from top
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  
  // Calculate start and end points
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  
  // Determine large arc flag
  const angleDiff = Math.abs(endAngle - startAngle);
  const largeArc = angleDiff > 180 ? 1 : 0;
  
  // Sweep direction
  const sweep = flip ? 0 : 1;
  
  // Generate unique ID
  const id = `arc-${Math.random().toString(36).substr(2, 9)}`;
  
  // SVG arc path
  let path: string;
  if (flip) {
    // For bottom text, draw arc from end to start (reversed)
    path = `M ${x2} ${y2} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x1} ${y1}`;
  } else {
    path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  }
  
  return { path, id };
}

/**
 * Generate curved text SVG elements
 */
export function generateCurvedTextSvg(
  text: string,
  config: CurvedTextConfig,
  cx: number,
  cy: number,
  shapeRadius: number,
  fontSize: number,
  fontFamily: string,
  textColor: string
): string {
  if (!config.enabled || !text) {
    return '';
  }
  
  // Calculate arc radius (auto or manual)
  const arcRadius = config.arcRadius > 0 
    ? config.arcRadius 
    : shapeRadius * (config.position === 'top' ? 0.75 : 0.75);
  
  // Adjust angles for position
  let startAngle = config.startAngle;
  let endAngle = config.endAngle;
  
  if (config.position === 'bottom') {
    // Flip angles for bottom
    startAngle = 180 - config.endAngle;
    endAngle = 180 - config.startAngle;
  }
  
  const flip = config.position === 'bottom' && config.flipBottom;
  
  // Generate arc path
  const { path, id } = generateArcPath(cx, cy, arcRadius, startAngle, endAngle, flip);
  
  // Build SVG
  let svg = '';
  
  // Define path in defs
  svg += `<defs>`;
  svg += `<path id="${id}" d="${path}" fill="none"/>`;
  svg += `</defs>`;
  
  // Text on path
  svg += `<text font-family="${fontFamily}" font-size="${fontSize}" `;
  svg += `fill="none" stroke="${textColor}" stroke-width="0.3" `;
  svg += `letter-spacing="${config.letterSpacing}">`;
  svg += `<textPath href="#${id}" startOffset="50%" text-anchor="middle">`;
  svg += escapeXml(text);
  svg += `</textPath>`;
  svg += `</text>`;
  
  return svg;
}

/**
 * Calculate optimal arc angles based on text length
 */
export function calculateOptimalArcAngles(
  text: string,
  fontSize: number,
  radius: number,
  maxSpan: number = 120 // max arc span in degrees
): { startAngle: number; endAngle: number } {
  // Approximate text width
  const charWidth = fontSize * 0.55;
  const textWidth = text.length * charWidth;
  
  // Convert to arc angle
  const circumference = 2 * Math.PI * radius;
  const textAngle = (textWidth / circumference) * 360;
  
  // Clamp to max span
  const span = Math.min(textAngle * 1.2, maxSpan); // 20% padding
  const halfSpan = span / 2;
  
  return {
    startAngle: -halfSpan,
    endAngle: halfSpan,
  };
}

/**
 * Check if curved text will fit properly
 */
export function validateCurvedTextFit(
  text: string,
  fontSize: number,
  radius: number,
  startAngle: number,
  endAngle: number
): { fits: boolean; warning?: string } {
  const charWidth = fontSize * 0.55;
  const textWidth = text.length * charWidth;
  
  // Arc length available
  const angleDiff = Math.abs(endAngle - startAngle);
  const arcLength = (angleDiff / 360) * 2 * Math.PI * radius;
  
  if (textWidth > arcLength) {
    return {
      fits: false,
      warning: 'Curved text too long for arc - reduce text or increase arc span',
    };
  }
  
  if (textWidth > arcLength * 0.9) {
    return {
      fits: true,
      warning: 'Curved text is tight - may appear cramped',
    };
  }
  
  return { fits: true };
}

// XML escape helper
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
