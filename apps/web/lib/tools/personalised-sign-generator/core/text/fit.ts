/**
 * Personalised Sign Generator V3 PRO - Text Fitting
 * Binary search for optimal font size
 */

import { measureTextWidthMm, PX_PER_MM } from './measure';

export interface FitResult {
  sizeMm: number;
  fits: boolean;
  widthMm: number;
}

/**
 * Binary search for optimal font size that fits within maxWidthMm
 */
export function fitFontSizeMeasured(
  text: string,
  maxWidthMm: number,
  minSizeMm: number,
  maxSizeMm: number,
  fontFamily: string,
  weight: string,
  letterSpacingMm: number = 0
): FitResult {
  if (!text || text.trim().length === 0 || maxWidthMm <= 0) {
    return { sizeMm: minSizeMm, fits: true, widthMm: 0 };
  }

  const min = Math.max(4, minSizeMm);
  const max = Math.min(200, maxSizeMm);

  if (min >= max) {
    const widthMm = measureTextWidthMm(text, fontFamily, weight, min, letterSpacingMm);
    return { sizeMm: min, fits: widthMm <= maxWidthMm, widthMm };
  }

  // Check if even minimum font size fits
  const minWidth = measureTextWidthMm(text, fontFamily, weight, min, letterSpacingMm);
  if (minWidth > maxWidthMm) {
    return { sizeMm: min, fits: false, widthMm: minWidth };
  }

  // Check if maximum font size fits
  const maxWidth = measureTextWidthMm(text, fontFamily, weight, max, letterSpacingMm);
  if (maxWidth <= maxWidthMm) {
    return { sizeMm: max, fits: true, widthMm: maxWidth };
  }

  // Binary search for optimal font size
  let low = min;
  let high = max;
  let bestFit = min;
  let bestWidth = minWidth;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    const width = measureTextWidthMm(text, fontFamily, weight, mid, letterSpacingMm);

    if (width <= maxWidthMm) {
      bestFit = mid;
      bestWidth = width;
      low = mid;
    } else {
      high = mid;
    }
  }

  return { sizeMm: Math.round(bestFit * 10) / 10, fits: true, widthMm: bestWidth };
}

/**
 * Calculate available width for text in artboard
 */
export function calculateAvailableWidth(
  artboardWmm: number,
  paddingMm: number,
  safeMarginMm: number = 10
): number {
  return Math.max(10, artboardWmm - paddingMm * 2 - safeMarginMm * 2);
}

/**
 * Auto-fit text element to available width
 */
export function autoFitText(
  text: string,
  availableWidthMm: number,
  preferredSizeMm: number,
  fontFamily: string,
  weight: string,
  letterSpacingMm: number = 0,
  minSizeMm: number = 8,
  maxSizeMm: number = 150
): FitResult {
  // Use preferred size as max, but allow going smaller
  const effectiveMax = Math.min(preferredSizeMm, maxSizeMm);
  
  return fitFontSizeMeasured(
    text,
    availableWidthMm,
    minSizeMm,
    effectiveMax,
    fontFamily,
    weight,
    letterSpacingMm
  );
}

/**
 * Calculate text bounds after fitting
 */
export interface TextBounds {
  widthMm: number;
  heightMm: number;
  baselineMm: number;
}

export function calculateTextBounds(
  text: string,
  sizeMm: number,
  fontFamily: string,
  weight: string,
  letterSpacingMm: number = 0
): TextBounds {
  const widthMm = measureTextWidthMm(text, fontFamily, weight, sizeMm, letterSpacingMm);
  // Approximate height as 1.2 * fontSize
  const heightMm = sizeMm * 1.2;
  const baselineMm = sizeMm * 0.85;

  return { widthMm, heightMm, baselineMm };
}

/**
 * Generate warnings for text fitting
 */
export function generateFitWarnings(
  fitResult: FitResult,
  text: string,
  minSizeMm: number
): string[] {
  const warnings: string[] = [];

  if (!fitResult.fits) {
    warnings.push(`Text "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}" is too long to fit even at minimum size (${minSizeMm}mm)`);
  }

  if (fitResult.sizeMm <= minSizeMm + 2 && fitResult.fits) {
    warnings.push(`Text is very small (${fitResult.sizeMm.toFixed(1)}mm) - consider shorter text or larger sign`);
  }

  return warnings;
}
