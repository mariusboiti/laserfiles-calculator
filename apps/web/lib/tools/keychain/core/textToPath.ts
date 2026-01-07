/**
 * Keychain Hub V2 - Text to Path Conversion
 * Convert text to SVG paths using opentype.js (no <text> elements)
 */

import opentype from 'opentype.js';
import { loadFont, type FontId } from './fontRegistry';

// Constants
const PX_PER_MM = 3.7795275591; // 96 DPI

// Options for text outline conversion
export interface OutlineTextOpts {
  fontId: FontId;
  fontSize: number; // in mm
  letterSpacing?: number; // in mm
  align?: 'left' | 'center' | 'right';
}

// Bounding box
export interface PathBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Result of text-to-path conversion
export interface TextPathResult {
  d: string; // SVG path d attribute
  bbox: PathBBox;
  fontSizePx: number;
}

/**
 * Convert text to SVG path data
 * Returns path in mm coordinates
 */
export async function textToSvgPath(
  text: string,
  opts: OutlineTextOpts
): Promise<TextPathResult> {
  if (!text || text.trim().length === 0) {
    return {
      d: '',
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      fontSizePx: 0,
    };
  }

  try {
    const font = await loadFont(opts.fontId);
    const fontSizePx = opts.fontSize * PX_PER_MM;
    const letterSpacingPx = (opts.letterSpacing || 0) * PX_PER_MM;

    // Generate path at origin
    // If letterSpacing is used, generate per-glyph so spacing is accurate.
    const path = Math.abs(letterSpacingPx) > 0.0001
      ? buildTextPathWithLetterSpacing(font, text, fontSizePx, letterSpacingPx)
      : font.getPath(text, 0, 0, fontSizePx);

    // Get bounding box
    const opentypeBBox = path.getBoundingBox();
    const bbox: PathBBox = {
      x: opentypeBBox.x1 / PX_PER_MM,
      y: opentypeBBox.y1 / PX_PER_MM,
      width: (opentypeBBox.x2 - opentypeBBox.x1) / PX_PER_MM,
      height: (opentypeBBox.y2 - opentypeBBox.y1) / PX_PER_MM,
    };

    // Convert path to SVG data and scale to mm
    const pathData = path.toPathData(3); // 3 decimal precision
    
    // Debug: log raw path data
    if (!pathData || pathData.length < 10) {
      console.warn('Font generated empty or very short path data:', pathData);
    }
    
    const scaledPathData = scalePathData(pathData, 1 / PX_PER_MM);
    
    // Validate scaled path has numbers
    if (scaledPathData && !/\d/.test(scaledPathData)) {
      console.warn('Scaled path data has no numbers:', scaledPathData);
      return {
        d: '',
        bbox,
        fontSizePx,
      };
    }

    return {
      d: scaledPathData,
      bbox,
      fontSizePx,
    };
  } catch (error) {
    console.error('Font loading failed, using fallback text rendering:', error);
    // Return empty path - will be handled by fallback
    return {
      d: '',
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      fontSizePx: 0,
    };
  }
}

/**
 * Convert text to positioned SVG path element
 * Handles alignment and positioning
 */
export async function textToPositionedPath(
  text: string,
  x: number,
  y: number,
  opts: OutlineTextOpts,
  isStroke: boolean = false,
  strokeWidth: number = 0.3
): Promise<{ svg: string; bbox: PathBBox }> {
  const result = await textToSvgPath(text, opts);

  if (!result.d) {
    // Fallback to SVG text element when font loading fails
    const fontFamily = opts.fontId === 'script' ? 'Georgia, serif' : 'Arial, sans-serif';
    const fill = isStroke ? 'none' : '#000';
    const stroke = isStroke ? '#000' : 'none';
    const strokeWidth_mm = strokeWidth || 0.3;
    const strokeAttr = isStroke ? `stroke-width="${strokeWidth_mm}"` : '';
    const textAnchor = opts.align === 'center' ? 'middle' : opts.align === 'right' ? 'end' : 'start';

    const svg = `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${opts.fontSize}" text-anchor="${textAnchor}" dominant-baseline="middle" fill="${fill}" stroke="${stroke}" ${strokeAttr}>${text}</text>`;

    // Estimate bbox
    const charWidth = opts.fontSize * 0.6;
    const width = text.length * charWidth;
    const height = opts.fontSize;

    return {
      svg,
      bbox: { x: x - width / 2, y: y - height / 2, width, height },
    };
  }

  // Calculate alignment offset
  let offsetX = 0;
  if (opts.align === 'center') {
    offsetX = -result.bbox.width / 2;
  } else if (opts.align === 'right') {
    offsetX = -result.bbox.width;
  }

  // Position path
  const finalX = x + offsetX - result.bbox.x;
  const finalY = y - result.bbox.y - result.bbox.height / 2;

  // Generate SVG element
  const fill = isStroke ? 'none' : '#000';
  const stroke = isStroke ? '#000' : 'none';
  const strokeAttr = isStroke ? `stroke-width="${strokeWidth}"` : '';

  // Validate path data - if it's invalid, use text fallback
  if (!result.d || result.d.trim().length < 5 || !/\d/.test(result.d)) {
    const fontFamily = opts.fontId.includes('Script') || opts.fontId.includes('Calligraphy') ? 'Georgia, serif' : 'Arial, sans-serif';
    const textAnchor = opts.align === 'center' ? 'middle' : opts.align === 'right' ? 'end' : 'start';
    const svg = `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${opts.fontSize}" text-anchor="${textAnchor}" dominant-baseline="middle" fill="${fill}" stroke="${stroke}" ${strokeAttr}>${text}</text>`;
    return {
      svg,
      bbox: { x: x - result.bbox.width / 2, y: y - result.bbox.height / 2, width: result.bbox.width, height: result.bbox.height },
    };
  }

  // Use transform attribute for positioning instead of modifying path data
  const transform = getTranslateTransform(finalX, finalY);
  const svg = `<path d="${result.d}" fill="${fill}" stroke="${stroke}" ${strokeAttr} transform="${transform}"/>`;

  return {
    svg,
    bbox: {
      x: finalX + result.bbox.x,
      y: finalY + result.bbox.y,
      width: result.bbox.width,
      height: result.bbox.height,
    },
  };
}

/**
 * Convert double-line text to positioned SVG paths
 */
export async function doubleLineTextToPath(
  line1: string,
  line2: string,
  x: number,
  y: number,
  opts: OutlineTextOpts,
  lineGap: number,
  isCut: boolean = false,
  strokeWidth: number = 0.001
): Promise<{ svg: string; bbox: PathBBox }> {
  const result1 = await textToSvgPath(line1, opts);
  const result2 = await textToSvgPath(line2, opts);

  if (!result1.d && !result2.d) {
    return { svg: '', bbox: { x: 0, y: 0, width: 0, height: 0 } };
  }

  const gapMm = opts.fontSize * lineGap;
  const totalHeight = result1.bbox.height + gapMm + result2.bbox.height;

  // Position line 1
  const y1 = y - totalHeight / 2 + result1.bbox.height / 2;
  const { svg: svg1, bbox: bbox1 } = await textToPositionedPath(line1, x, y1, opts, isCut, strokeWidth);

  // Position line 2
  const y2 = y + totalHeight / 2 - result2.bbox.height / 2;
  const { svg: svg2, bbox: bbox2 } = await textToPositionedPath(line2, x, y2, opts, isCut, strokeWidth);

  // Combined bbox
  const combinedBBox: PathBBox = {
    x: Math.min(bbox1.x, bbox2.x),
    y: y1 - result1.bbox.height / 2,
    width: Math.max(bbox1.width, bbox2.width),
    height: totalHeight,
  };

  return {
    svg: `${svg1}\n    ${svg2}`,
    bbox: combinedBBox,
  };
}

/**
 * Measure text width in mm (async, uses font)
 */
export async function measureTextWidthMm(
  text: string,
  fontId: FontId,
  fontSizeMm: number
): Promise<number> {
  if (!text || text.trim().length === 0) return 0;

  const font = await loadFont(fontId);
  const fontSizePx = fontSizeMm * PX_PER_MM;
  const path = font.getPath(text, 0, 0, fontSizePx);
  const bbox = path.getBoundingBox();

  return (bbox.x2 - bbox.x1) / PX_PER_MM;
}

/**
 * Measure text bounding box in mm
 */
export async function measureTextBBoxMm(
  text: string,
  fontId: FontId,
  fontSizeMm: number
): Promise<PathBBox> {
  if (!text || text.trim().length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  try {
    const font = await loadFont(fontId);
    const fontSizePx = fontSizeMm * PX_PER_MM;
    const path = font.getPath(text, 0, 0, fontSizePx);
    const bbox = path.getBoundingBox();

    return {
      x: bbox.x1 / PX_PER_MM,
      y: bbox.y1 / PX_PER_MM,
      width: (bbox.x2 - bbox.x1) / PX_PER_MM,
      height: (bbox.y2 - bbox.y1) / PX_PER_MM,
    };
  } catch (error) {
    // Fallback: estimate bbox based on text length and font size
    const charWidth = fontSizeMm * 0.6; // rough estimate
    const width = text.length * charWidth;
    const height = fontSizeMm;
    return {
      x: 0,
      y: -height * 0.8,
      width,
      height,
    };
  }
}

// ============ Path Manipulation Helpers ============

/**
 * Scale path data by factor using simple regex
 */
function scalePathData(pathData: string, scale: number): string {
  // Match all numbers (including negative and decimal)
  return pathData.replace(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return (num * scale).toFixed(3);
  });
}

/**
 * Translate path data by offset using SVG transform instead of modifying path
 */
function translatePathData(pathData: string, dx: number, dy: number): string {
  // Instead of parsing and modifying path commands, we'll return the original path
  // and handle translation via SVG transform attribute in the calling function
  return pathData;
}

/**
 * Get translation transform string
 */
function getTranslateTransform(dx: number, dy: number): string {
  return `translate(${dx.toFixed(3)}, ${dy.toFixed(3)})`;
}

interface PathCommand {
  type: string;
  values: number[];
}

function parsePathCommands(pathData: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;

  while ((match = regex.exec(pathData)) !== null) {
    const type = match[1];
    const valuesStr = match[2].trim();
    // Parse numbers more carefully - handle cases like "10-5" meaning "10 -5"
    const values: number[] = [];
    if (valuesStr) {
      const numRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
      let numMatch;
      while ((numMatch = numRegex.exec(valuesStr)) !== null) {
        const num = parseFloat(numMatch[0]);
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    }
    commands.push({ type, values });
  }

  return commands;
}

function translateCommands(commands: PathCommand[], dx: number, dy: number): PathCommand[] {
  return commands.map(cmd => {
    const type = cmd.type;
    const values = [...cmd.values];

    // Handle different command types
    switch (type) {
      case 'M':
      case 'L':
      case 'T':
        // Absolute x,y pairs
        for (let i = 0; i < values.length; i += 2) {
          values[i] += dx;
          values[i + 1] += dy;
        }
        break;
      case 'H':
        // Absolute horizontal
        for (let i = 0; i < values.length; i++) {
          values[i] += dx;
        }
        break;
      case 'V':
        // Absolute vertical
        for (let i = 0; i < values.length; i++) {
          values[i] += dy;
        }
        break;
      case 'C':
        // Absolute cubic bezier: x1,y1,x2,y2,x,y
        for (let i = 0; i < values.length; i += 6) {
          values[i] += dx;
          values[i + 1] += dy;
          values[i + 2] += dx;
          values[i + 3] += dy;
          values[i + 4] += dx;
          values[i + 5] += dy;
        }
        break;
      case 'S':
        // Absolute smooth cubic: x2,y2,x,y
        for (let i = 0; i < values.length; i += 4) {
          values[i] += dx;
          values[i + 1] += dy;
          values[i + 2] += dx;
          values[i + 3] += dy;
        }
        break;
      case 'Q':
        // Absolute quadratic: x1,y1,x,y
        for (let i = 0; i < values.length; i += 4) {
          values[i] += dx;
          values[i + 1] += dy;
          values[i + 2] += dx;
          values[i + 3] += dy;
        }
        break;
      case 'A':
        // Arc: rx,ry,rotation,large,sweep,x,y
        for (let i = 0; i < values.length; i += 7) {
          values[i + 5] += dx;
          values[i + 6] += dy;
        }
        break;
      // Relative commands don't need translation
      // Z doesn't need translation
    }

    return { type, values };
  });
}

function commandsToPathData(commands: PathCommand[]): string {
  return commands.map(cmd => {
    if (cmd.values.length === 0) return cmd.type;
    return cmd.type + cmd.values.map(v => v.toFixed(3)).join(' ');
  }).join(' ');
}

/**
 * Apply letter spacing to path (simplified - shifts glyphs)
 */
function buildTextPathWithLetterSpacing(
  font: opentype.Font,
  text: string,
  fontSizePx: number,
  letterSpacingPx: number
): opentype.Path {
  const out = new opentype.Path();
  const scale = fontSizePx / (font.unitsPerEm || 1000);

  let x = 0;
  let prevGlyph: opentype.Glyph | null = null;

  for (const ch of Array.from(text)) {
    const glyph = font.charToGlyph(ch);

    // Apply kerning
    if (prevGlyph) {
      try {
        const k = font.getKerningValue(prevGlyph, glyph);
        x += k * scale;
      } catch {
        // ignore kerning errors
      }
    }

    // Add glyph outline
    // For whitespace glyphs, getPath may be empty (that's fine).
    try {
      const gp = glyph.getPath(x, 0, fontSizePx);
      out.commands.push(...gp.commands);
    } catch {
      // ignore glyph errors
    }

    // Advance width + requested spacing
    const adv = (glyph.advanceWidth || font.unitsPerEm || 1000) * scale;
    x += adv + letterSpacingPx;
    prevGlyph = glyph;
  }

  return out;
}
