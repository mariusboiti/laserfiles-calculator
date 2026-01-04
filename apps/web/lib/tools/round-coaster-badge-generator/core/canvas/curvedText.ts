/**
 * Curved text generation for coasters
 * Generates text along an arc path
 */

import type opentype from 'opentype.js';

export interface CurvedTextOptions {
  text: string;
  radius: number; // mm from center
  startAngle: number; // degrees, 0 = top center
  fontSize: number; // mm
  letterSpacing: number; // mm
  position: 'top' | 'bottom'; // top = text curves up, bottom = text curves down
  flip: boolean; // flip text orientation
}

/**
 * Generate SVG path for curved text using opentype.js font
 * Returns path data centered at origin (0,0)
 */
export async function generateCurvedTextPath(
  font: opentype.Font,
  options: CurvedTextOptions
): Promise<{ pathD: string; boundingRadius: number }> {
  const { text, radius, startAngle, fontSize, letterSpacing, position, flip } = options;

  if (!text || text.length === 0) {
    return { pathD: '', boundingRadius: radius };
  }

  const PX_PER_MM = 3.7795275591;
  const sizePx = fontSize * PX_PER_MM;

  // Get individual character paths and widths
  const chars: { char: string; width: number; path: opentype.Path }[] = [];
  
  for (const char of text) {
    const charPath = font.getPath(char, 0, 0, sizePx);
    const bbox = charPath.getBoundingBox();
    const widthMm = (bbox.x2 - bbox.x1) / PX_PER_MM;
    chars.push({ char, width: widthMm, path: charPath });
  }

  // Calculate total arc length needed
  const totalWidth = chars.reduce((sum, c) => sum + c.width, 0) + (chars.length - 1) * letterSpacing;
  
  // Calculate angular span for the text
  const circumference = 2 * Math.PI * radius;
  const angularSpan = (totalWidth / circumference) * 360; // degrees

  // Starting angle adjusted for centering
  const startDeg = startAngle - angularSpan / 2;

  // Build combined path using matrix transformations
  const allCommands: string[] = [];
  let currentAngle = startDeg;

  for (let i = 0; i < chars.length; i++) {
    const { width, path: charPath } = chars[i];
    const charCenterAngle = currentAngle + (width / circumference) * 180;

    // Convert angle to radians
    const rad = (charCenterAngle * Math.PI) / 180;

    // Position on circle
    const isBottom = position === 'bottom';

    // Calculate position and rotation
    let x: number, y: number, rotation: number;

    if (isBottom) {
      x = Math.sin(rad) * radius;
      y = Math.cos(rad) * radius;
      rotation = -charCenterAngle + 180;
    } else {
      x = Math.sin(rad) * radius;
      y = -Math.cos(rad) * radius;
      rotation = charCenterAngle;
    }

    if (flip) {
      rotation += 180;
    }

    // Get character bounds for centering
    const bbox = charPath.getBoundingBox();
    const charWidthPx = bbox.x2 - bbox.x1;
    const charHeightPx = bbox.y2 - bbox.y1;
    const centerOffsetX = bbox.x1 + charWidthPx / 2;
    const centerOffsetY = bbox.y1 + charHeightPx / 2;

    // Apply transformation to each command in the path
    const rotRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotRad);
    const sin = Math.sin(rotRad);
    const scale = 1 / PX_PER_MM;

    // Transform each point: center char at origin, scale, rotate, translate to position
    for (const cmd of charPath.commands) {
      const transformPoint = (px: number, py: number): string => {
        // Center the character
        let tx = px - centerOffsetX;
        let ty = py - centerOffsetY;
        // Scale to mm
        tx *= scale;
        ty *= scale;
        // Rotate
        const rx = tx * cos - ty * sin;
        const ry = tx * sin + ty * cos;
        // Translate to position
        const fx = rx + x;
        const fy = ry + y;
        return `${fx.toFixed(3)} ${fy.toFixed(3)}`;
      };

      if (cmd.type === 'M') {
        allCommands.push(`M${transformPoint(cmd.x, cmd.y)}`);
      } else if (cmd.type === 'L') {
        allCommands.push(`L${transformPoint(cmd.x, cmd.y)}`);
      } else if (cmd.type === 'C') {
        allCommands.push(`C${transformPoint(cmd.x1, cmd.y1)} ${transformPoint(cmd.x2, cmd.y2)} ${transformPoint(cmd.x, cmd.y)}`);
      } else if (cmd.type === 'Q') {
        allCommands.push(`Q${transformPoint(cmd.x1, cmd.y1)} ${transformPoint(cmd.x, cmd.y)}`);
      } else if (cmd.type === 'Z') {
        allCommands.push('Z');
      }
    }

    // Move to next character position
    currentAngle += (width + letterSpacing) / circumference * 360;
  }

  return {
    pathD: allCommands.join(' '),
    boundingRadius: radius + fontSize,
  };
}

/**
 * Generate simple arc text without font - uses SVG textPath approach
 * This is a fallback when opentype.js fonts aren't available
 */
export function generateArcTextPath(
  radius: number,
  startAngle: number,
  sweepAngle: number,
  position: 'top' | 'bottom'
): string {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = ((startAngle + sweepAngle) * Math.PI) / 180;

  const x1 = Math.sin(startRad) * radius;
  const y1 = (position === 'top' ? -1 : 1) * Math.cos(startRad) * radius;
  const x2 = Math.sin(endRad) * radius;
  const y2 = (position === 'top' ? -1 : 1) * Math.cos(endRad) * radius;

  const largeArc = sweepAngle > 180 ? 1 : 0;
  const sweep = position === 'top' ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
}

/**
 * Scale all numeric values in path data
 */
function scalePathData(pathData: string, scale: number): string {
  return pathData.replace(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return (num * scale).toFixed(3);
  });
}

/**
 * Transform path data with translate and rotate
 */
function transformPathData(
  pathData: string,
  transform: {
    translateX: number;
    translateY: number;
    rotate: number;
    pivotX: number;
    pivotY: number;
  }
): string {
  const { translateX, translateY, rotate, pivotX, pivotY } = transform;
  const rad = (rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Helper to transform a point
  const transformPoint = (x: number, y: number): [number, number] => {
    // Translate
    let tx = x + translateX;
    let ty = y + translateY;
    // Rotate around pivot
    const dx = tx - pivotX;
    const dy = ty - pivotY;
    tx = pivotX + dx * cos - dy * sin;
    ty = pivotY + dx * sin + dy * cos;
    return [tx, ty];
  };

  // Parse path commands and transform coordinates
  const commands = parsePathCommands(pathData);
  
  const transformedCommands = commands.map(cmd => {
    const { type, coords } = cmd;
    const upperType = type.toUpperCase();

    // Commands with no coordinates
    if (upperType === 'Z') {
      return type;
    }

    // H (horizontal) has 1 coord: x - convert to L with current y=0
    if (upperType === 'H') {
      const newCoords: number[] = [];
      for (let i = 0; i < coords.length; i++) {
        const [tx, ty] = transformPoint(coords[i], 0);
        newCoords.push(tx, ty);
      }
      return `L${newCoords.map(n => n.toFixed(3)).join(' ')}`;
    }

    // V (vertical) has 1 coord: y - convert to L with current x=0
    if (upperType === 'V') {
      const newCoords: number[] = [];
      for (let i = 0; i < coords.length; i++) {
        const [tx, ty] = transformPoint(0, coords[i]);
        newCoords.push(tx, ty);
      }
      return `L${newCoords.map(n => n.toFixed(3)).join(' ')}`;
    }

    // A (arc) has 7 params: rx ry x-axis-rotation large-arc-flag sweep-flag x y
    if (upperType === 'A') {
      const newCoords: number[] = [];
      for (let i = 0; i < coords.length; i += 7) {
        const rx = coords[i];
        const ry = coords[i + 1];
        const xRot = coords[i + 2];
        const largeArc = coords[i + 3];
        const sweep = coords[i + 4];
        const x = coords[i + 5];
        const y = coords[i + 6];
        const [tx, ty] = transformPoint(x, y);
        newCoords.push(rx, ry, xRot + rotate, largeArc, sweep, tx, ty);
      }
      return `${type}${newCoords.map(n => n.toFixed(3)).join(' ')}`;
    }

    // Standard commands with x,y pairs: M, L, C, S, Q, T
    const newCoords: number[] = [];
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i];
      const y = coords[i + 1];
      if (y === undefined) {
        // Odd number of coords - skip incomplete pair
        continue;
      }
      const [tx, ty] = transformPoint(x, y);
      newCoords.push(tx, ty);
    }

    return `${type}${newCoords.map(n => n.toFixed(3)).join(' ')}`;
  });

  return transformedCommands.join(' ');
}

/**
 * Parse SVG path commands into structured format
 * Handles compact SVG number format (e.g., "0-8.5" = two numbers: 0 and -8.5)
 */
function parsePathCommands(pathData: string): { type: string; coords: number[] }[] {
  const commands: { type: string; coords: number[] }[] = [];
  const cmdRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
  
  // Regex to extract numbers including negative and decimals
  // Matches: -1.5, .5, 1.5e-10, etc.
  const numRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  
  let match;
  while ((match = cmdRegex.exec(pathData)) !== null) {
    const type = match[1];
    const coordStr = match[2].trim();
    const coords: number[] = [];
    
    if (coordStr) {
      let numMatch;
      while ((numMatch = numRegex.exec(coordStr)) !== null) {
        const num = parseFloat(numMatch[0]);
        if (!isNaN(num)) {
          coords.push(num);
        }
      }
    }
    
    commands.push({ type, coords });
  }

  return commands;
}

/**
 * Create curved text element for coaster
 */
export interface CurvedTextElement {
  id: string;
  type: 'curved-text';
  text: string;
  radius: number;
  startAngle: number;
  fontSize: number;
  letterSpacing: number;
  position: 'top' | 'bottom';
  flip: boolean;
  fontId: string;
  pathD?: string; // Generated path data
}

export function createDefaultCurvedTextOptions(
  position: 'top' | 'bottom',
  radius: number
): CurvedTextOptions {
  return {
    text: position === 'top' ? 'TOP TEXT' : 'BOTTOM TEXT',
    radius: radius * 0.75,
    startAngle: position === 'top' ? 0 : 180,
    fontSize: 6,
    letterSpacing: 0.5,
    position,
    flip: false,
  };
}
