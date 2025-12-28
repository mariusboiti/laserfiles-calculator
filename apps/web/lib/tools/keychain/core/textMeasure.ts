/**
 * Keychain Hub - Text Measurement
 * Real text measurement using Canvas API with SSR fallback
 */

// Canvas context for measurement (lazy initialized)
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

// MM to PX scale (96 DPI)
const MM_TO_PX = 3.7795275591;

/**
 * Initialize canvas for text measurement
 */
function initCanvas(): boolean {
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
 * Build CSS font string
 */
function buildFontString(fontSize: number, fontFamily: string, fontWeight: number | string): string {
  return `${fontWeight} ${fontSize}px "${fontFamily}", Arial, sans-serif`;
}

/**
 * Measure text width in pixels
 */
export function measureTextPx(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number | string = 400
): number {
  if (!text || text.length === 0) return 0;

  if (initCanvas() && measureCtx) {
    measureCtx.font = buildFontString(fontSize, fontFamily, fontWeight);
    return measureCtx.measureText(text).width;
  }

  // Fallback approximation
  return approximateTextWidthPx(text, fontSize, fontWeight);
}

/**
 * Approximate text width (fallback for SSR)
 */
export function approximateTextWidthPx(
  text: string,
  fontSize: number,
  fontWeight: number | string
): number {
  if (!text || text.length === 0) return 0;

  const weight = typeof fontWeight === 'number' ? fontWeight : parseInt(fontWeight, 10) || 400;
  const weightFactor = 0.5 + (weight - 400) / 1000;

  return text.length * fontSize * weightFactor;
}

/**
 * Measure text width in mm
 */
export function measureTextMm(
  text: string,
  fontSizeMm: number,
  fontFamily: string,
  fontWeight: number | string = 400
): number {
  const fontSizePx = fontSizeMm * MM_TO_PX;
  const widthPx = measureTextPx(text, fontSizePx, fontFamily, fontWeight);
  return widthPx / MM_TO_PX;
}

/**
 * Binary search for optimal font size (single line)
 */
export function fitFontSize(
  text: string,
  maxWidthMm: number,
  minFont: number,
  maxFont: number,
  fontFamily: string,
  fontWeight: number | string = 400
): number {
  if (!text || text.trim().length === 0 || maxWidthMm <= 0) {
    return minFont;
  }

  const min = Math.max(4, minFont);
  const max = Math.min(100, maxFont);

  if (min >= max) return min;

  // Check if min font fits
  const minWidth = measureTextMm(text, min, fontFamily, fontWeight);
  if (minWidth > maxWidthMm) {
    return min; // Return min even if doesn't fit
  }

  // Check if max font fits
  const maxWidth = measureTextMm(text, max, fontFamily, fontWeight);
  if (maxWidth <= maxWidthMm) {
    return max;
  }

  // Binary search
  let low = min;
  let high = max;
  let bestFit = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = measureTextMm(text, mid, fontFamily, fontWeight);

    if (width <= maxWidthMm) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestFit;
}

/**
 * Fit font size for double line text
 */
export function fitFontSizeDoubleLine(
  line1: string,
  line2: string,
  maxWidthMm: number,
  maxHeightMm: number,
  lineGap: number,
  minFont: number,
  maxFont: number,
  fontFamily: string,
  fontWeight: number | string = 400
): number {
  if (!line2 || line2.trim().length === 0) {
    return fitFontSize(line1, maxWidthMm, minFont, maxFont, fontFamily, fontWeight);
  }

  if (!line1 || line1.trim().length === 0) {
    return fitFontSize(line2, maxWidthMm, minFont, maxFont, fontFamily, fontWeight);
  }

  const min = Math.max(4, minFont);
  const max = Math.min(100, maxFont);

  if (min >= max) return min;

  let low = min;
  let high = max;
  let bestFit = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width1 = measureTextMm(line1, mid, fontFamily, fontWeight);
    const width2 = measureTextMm(line2, mid, fontFamily, fontWeight);
    const totalHeight = mid * (2 + lineGap);

    const fitsWidth = Math.max(width1, width2) <= maxWidthMm;
    const fitsHeight = totalHeight <= maxHeightMm;

    if (fitsWidth && fitsHeight) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestFit;
}

/**
 * Get text bounding box
 */
export interface TextBBox {
  width: number;
  height: number;
}

export function getTextBBox(
  text: string,
  fontSizeMm: number,
  fontFamily: string,
  fontWeight: number | string = 400
): TextBBox {
  return {
    width: measureTextMm(text, fontSizeMm, fontFamily, fontWeight),
    height: fontSizeMm * 1.2,
  };
}

/**
 * Check if text fits
 */
export function textFits(
  text: string,
  fontSizeMm: number,
  maxWidthMm: number,
  fontFamily: string,
  fontWeight: number | string = 400
): boolean {
  const width = measureTextMm(text, fontSizeMm, fontFamily, fontWeight);
  return width <= maxWidthMm;
}
