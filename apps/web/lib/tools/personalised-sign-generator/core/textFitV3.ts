/**
 * Text Fit V3 - Real measurement using Canvas API
 * Falls back to approximation on SSR
 */

import type { TextWeight } from '../types/signV3';

// Canvas context for measurement (lazy initialized)
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

// MM to PX scale for consistent measurement (96 DPI standard)
const MM_TO_PX = 3.7795275591;

/**
 * Initialize canvas for text measurement
 */
function initMeasureCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  if (measureCanvas && measureCtx) return true;

  try {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 1000;
    measureCanvas.height = 100;
    measureCtx = measureCanvas.getContext('2d');
    return measureCtx !== null;
  } catch {
    return false;
  }
}

/**
 * Build CSS font string for canvas measurement
 */
function buildFontString(
  fontSize: number,
  fontFamily: string,
  weight: TextWeight,
  letterSpacing: number
): string {
  return `${weight} ${fontSize}px "${fontFamily}", Arial, sans-serif`;
}

/**
 * Measure text width using canvas
 * Returns width in pixels
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string = 'Arial',
  weight: TextWeight = '400',
  letterSpacing: number = 0
): number {
  if (!text || text.length === 0) return 0;

  // Try canvas measurement first
  if (initMeasureCanvas() && measureCtx) {
    measureCtx.font = buildFontString(fontSize, fontFamily, weight, letterSpacing);
    const metrics = measureCtx.measureText(text);
    
    // Add letter spacing (extra spacing between each character)
    const spacingPx = letterSpacing * MM_TO_PX;
    const totalSpacing = spacingPx * (text.length - 1);
    
    return metrics.width + totalSpacing;
  }

  // Fallback approximation for SSR
  return approximateTextWidth(text, fontSize, weight, letterSpacing);
}

/**
 * Approximate text width (fallback for SSR)
 * Different character width ratios for different weights
 */
export function approximateTextWidth(
  text: string,
  fontSize: number,
  weight: TextWeight = '400',
  letterSpacing: number = 0
): number {
  if (!text || text.length === 0) return 0;

  // Width ratio varies by weight
  const weightRatios: Record<TextWeight, number> = {
    '400': 0.52,
    '500': 0.54,
    '600': 0.56,
    '700': 0.58,
    '800': 0.60,
    '900': 0.62,
  };

  const ratio = weightRatios[weight] || 0.55;
  const baseWidth = text.length * fontSize * ratio;
  
  // Add letter spacing
  const spacingPx = letterSpacing * MM_TO_PX;
  const totalSpacing = spacingPx * (text.length - 1);

  return baseWidth + totalSpacing;
}

/**
 * Convert mm to pixels for measurement
 */
export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

/**
 * Convert pixels to mm
 */
export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

/**
 * Binary search for optimal font size that fits within maxWidth (in mm)
 */
export function fitFontSizeMeasured(
  text: string,
  maxWidthMm: number,
  minFontSize: number,
  maxFontSize: number,
  fontFamily: string = 'Arial',
  weight: TextWeight = '400',
  letterSpacing: number = 0
): number {
  if (!text || text.trim().length === 0 || maxWidthMm <= 0) {
    return minFontSize;
  }

  const maxWidthPx = mmToPx(maxWidthMm);
  const min = Math.max(6, minFontSize);
  const max = Math.min(200, maxFontSize);

  if (min >= max) return min;

  // Check if even minimum font size fits
  const minWidth = measureTextWidth(text, min, fontFamily, weight, letterSpacing);
  if (minWidth > maxWidthPx) {
    return min; // Return min even if doesn't fit
  }

  // Check if maximum font size fits
  const maxWidth = measureTextWidth(text, max, fontFamily, weight, letterSpacing);
  if (maxWidth <= maxWidthPx) {
    return max; // Use maximum if it fits
  }

  // Binary search for optimal font size
  let low = min;
  let high = max;
  let bestFit = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = measureTextWidth(text, mid, fontFamily, weight, letterSpacing);

    if (width <= maxWidthPx) {
      bestFit = mid;
      low = mid + 1; // Try larger
    } else {
      high = mid - 1; // Try smaller
    }
  }

  return bestFit;
}

/**
 * Calculate arc length approximation for curved text
 * intensity: 0-100 (0 = straight, 100 = very curved)
 */
export function calculateArcLength(
  chordLength: number,
  intensity: number
): number {
  if (intensity <= 0) return chordLength;

  // Map intensity to arc factor (1.0 to 1.5)
  const arcFactor = 1 + (intensity / 100) * 0.5;
  return chordLength * arcFactor;
}

/**
 * Fit font size for curved text
 * Accounts for arc length being longer than chord
 */
export function fitFontSizeCurved(
  text: string,
  chordWidthMm: number,
  intensity: number,
  minFontSize: number,
  maxFontSize: number,
  fontFamily: string = 'Arial',
  weight: TextWeight = '400',
  letterSpacing: number = 0
): number {
  // Effective width is the arc length
  const effectiveWidth = calculateArcLength(chordWidthMm, intensity);
  
  return fitFontSizeMeasured(
    text,
    effectiveWidth,
    minFontSize,
    maxFontSize,
    fontFamily,
    weight,
    letterSpacing
  );
}

/**
 * Validate if text fits at minimum font size
 */
export function validateTextFits(
  text: string,
  maxWidthMm: number,
  minFontSize: number,
  fontFamily: string = 'Arial',
  weight: TextWeight = '400',
  letterSpacing: number = 0
): boolean {
  if (!text || text.trim().length === 0) return true;
  
  const maxWidthPx = mmToPx(maxWidthMm);
  const minWidth = measureTextWidth(text, minFontSize, fontFamily, weight, letterSpacing);
  return minWidth <= maxWidthPx;
}

/**
 * Get text dimensions for layout
 */
export interface TextDimensions {
  width: number;      // in mm
  height: number;     // in mm (approximate based on fontSize)
  fontSize: number;
  fits: boolean;
}

export function getTextDimensions(
  text: string,
  maxWidthMm: number,
  minFontSize: number,
  maxFontSize: number,
  fontFamily: string = 'Arial',
  weight: TextWeight = '400',
  letterSpacing: number = 0
): TextDimensions {
  const fontSize = fitFontSizeMeasured(
    text,
    maxWidthMm,
    minFontSize,
    maxFontSize,
    fontFamily,
    weight,
    letterSpacing
  );

  const widthPx = measureTextWidth(text, fontSize, fontFamily, weight, letterSpacing);
  const widthMm = pxToMm(widthPx);
  const heightMm = pxToMm(fontSize * 1.2); // Approximate height

  const fits = validateTextFits(text, maxWidthMm, minFontSize, fontFamily, weight, letterSpacing);

  return {
    width: widthMm,
    height: heightMm,
    fontSize,
    fits,
  };
}
