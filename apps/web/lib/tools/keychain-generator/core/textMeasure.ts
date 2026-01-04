/**
 * Keychain Generator V2 - Real Text Measurement
 * Uses Canvas API with SVG fallback
 */

import type { FontWeight } from '../types/keychainV2';

// Canvas context for measurement (lazy initialized)
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

// MM to PX scale (96 DPI standard)
const MM_TO_PX = 3.7795275591;

export interface TextStyle {
  fontFamily: string;
  fontWeight: FontWeight | string | number;
}

/**
 * Initialize canvas for text measurement
 */
function initMeasureCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  if (measureCanvas && measureCtx) return true;

  try {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 2000;
    measureCanvas.height = 200;
    measureCtx = measureCanvas.getContext('2d');
    return measureCtx !== null;
  } catch {
    return false;
  }
}

/**
 * Build CSS font string for canvas measurement
 */
function buildFontString(fontSize: number, style: TextStyle): string {
  const weight = typeof style.fontWeight === 'number' ? style.fontWeight : style.fontWeight;
  return `${weight} ${fontSize}px "${style.fontFamily}", Arial, sans-serif`;
}

/**
 * Measure text width using canvas (returns pixels)
 */
export function measureTextPx(text: string, fontSize: number, style: TextStyle): number {
  if (!text || text.length === 0) return 0;

  if (initMeasureCanvas() && measureCtx) {
    measureCtx.font = buildFontString(fontSize, style);
    const metrics = measureCtx.measureText(text);
    return metrics.width;
  }

  // Fallback approximation for SSR
  return approximateTextWidthPx(text, fontSize, style);
}

/**
 * Approximate text width (fallback for SSR)
 */
export function approximateTextWidthPx(text: string, fontSize: number, style: TextStyle): number {
  if (!text || text.length === 0) return 0;

  const weight = parseInt(String(style.fontWeight), 10) || 400;
  const weightFactor = 0.5 + (weight - 400) / 1000;
  
  return text.length * fontSize * weightFactor;
}

/**
 * Measure text width in mm
 */
export function measureTextMm(text: string, fontSizeMm: number, style: TextStyle): number {
  const fontSizePx = fontSizeMm * MM_TO_PX;
  const widthPx = measureTextPx(text, fontSizePx, style);
  return widthPx / MM_TO_PX;
}

/**
 * Measure text height (approximate based on font size)
 */
export function measureTextHeightMm(fontSizeMm: number, lineCount: number = 1, lineGap: number = 1): number {
  if (lineCount <= 1) return fontSizeMm;
  return fontSizeMm * (lineCount + (lineCount - 1) * lineGap);
}

/**
 * Get text bounding box dimensions
 */
export interface TextBBox {
  width: number;
  height: number;
}

export function getTextBBox(text: string, fontSizeMm: number, style: TextStyle): TextBBox {
  return {
    width: measureTextMm(text, fontSizeMm, style),
    height: fontSizeMm * 1.2, // Approximate height with some padding
  };
}

/**
 * Get double line text bounding box
 */
export function getDoubleLineBBox(
  line1: string,
  line2: string,
  fontSizeMm: number,
  lineGap: number,
  style: TextStyle
): TextBBox {
  const width1 = measureTextMm(line1, fontSizeMm, style);
  const width2 = measureTextMm(line2, fontSizeMm, style);
  const height = measureTextHeightMm(fontSizeMm, 2, lineGap);

  return {
    width: Math.max(width1, width2),
    height,
  };
}

/**
 * Check if text fits within given width
 */
export function textFitsMm(text: string, fontSizeMm: number, maxWidthMm: number, style: TextStyle): boolean {
  const textWidth = measureTextMm(text, fontSizeMm, style);
  return textWidth <= maxWidthMm;
}

/**
 * Escape XML special characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
