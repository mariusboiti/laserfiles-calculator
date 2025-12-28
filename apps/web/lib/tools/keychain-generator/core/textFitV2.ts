/**
 * Keychain Generator V2 - Text Fitting with Real Measurement
 * Supports single and double line text with binary search
 */

import type { TextStyle } from './textMeasure';
import type { TextRegion } from '../types/keychainV2';
import { measureTextMm, getDoubleLineBBox } from './textMeasure';

/**
 * Binary search for optimal font size (single line)
 */
export function fitFontSizeSingleLine(
  text: string,
  maxWidthMm: number,
  minFont: number,
  maxFont: number,
  style: TextStyle
): number {
  if (!text || text.trim().length === 0 || maxWidthMm <= 0) {
    return minFont;
  }

  const min = Math.max(6, minFont);
  const max = Math.min(80, maxFont);

  if (min >= max) return min;

  // Check if even minimum font size fits
  const minWidth = measureTextMm(text, min, style);
  if (minWidth > maxWidthMm) {
    return min; // Return min even if doesn't fit
  }

  // Check if maximum font size fits
  const maxWidth = measureTextMm(text, max, style);
  if (maxWidth <= maxWidthMm) {
    return max;
  }

  // Binary search
  let low = min;
  let high = max;
  let bestFit = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = measureTextMm(text, mid, style);

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
 * Binary search for optimal font size (double line)
 * Both lines must fit width, total height must fit maxHeight
 */
export function fitFontSizeDoubleLine(
  line1: string,
  line2: string,
  maxWidthMm: number,
  maxHeightMm: number,
  lineGap: number,
  minFont: number,
  maxFont: number,
  style: TextStyle
): number {
  // If second line is empty, treat as single line
  if (!line2 || line2.trim().length === 0) {
    return fitFontSizeSingleLine(line1, maxWidthMm, minFont, maxFont, style);
  }

  // If first line is empty, treat as single line
  if (!line1 || line1.trim().length === 0) {
    return fitFontSizeSingleLine(line2, maxWidthMm, minFont, maxFont, style);
  }

  const min = Math.max(6, minFont);
  const max = Math.min(80, maxFont);

  if (min >= max) return min;

  // Binary search for font size that fits both constraints
  let low = min;
  let high = max;
  let bestFit = min;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const bbox = getDoubleLineBBox(line1, line2, mid, lineGap, style);

    const fitsWidth = bbox.width <= maxWidthMm;
    const fitsHeight = bbox.height <= maxHeightMm;

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
 * Calculate fitted font size based on text config and region
 */
export function calculateFittedFontSize(
  text: string,
  text2: string,
  textMode: 'single' | 'double',
  region: TextRegion,
  lineGap: number,
  minFont: number,
  maxFont: number,
  style: TextStyle
): number {
  if (textMode === 'double' && text2.trim().length > 0) {
    return fitFontSizeDoubleLine(
      text,
      text2,
      region.width,
      region.height,
      lineGap,
      minFont,
      maxFont,
      style
    );
  }

  return fitFontSizeSingleLine(text, region.width, minFont, maxFont, style);
}

/**
 * Calculate Y positions for single or double line text
 */
export function calculateTextYPositions(
  centerY: number,
  fontSize: number,
  textMode: 'single' | 'double',
  lineGap: number,
  hasSecondLine: boolean
): { y1: number; y2?: number } {
  if (textMode === 'single' || !hasSecondLine) {
    return { y1: centerY };
  }

  // Double line: distribute around center
  const totalHeight = fontSize * (2 + lineGap);
  const topOffset = totalHeight / 2 - fontSize / 2;

  return {
    y1: centerY - topOffset + fontSize / 2,
    y2: centerY + topOffset - fontSize / 2 + fontSize * lineGap,
  };
}

/**
 * Validate text fits at minimum font size
 */
export function validateTextFits(
  text: string,
  text2: string,
  textMode: 'single' | 'double',
  region: TextRegion,
  lineGap: number,
  minFont: number,
  style: TextStyle
): boolean {
  if (textMode === 'double' && text2.trim().length > 0) {
    const bbox = getDoubleLineBBox(text, text2, minFont, lineGap, style);
    return bbox.width <= region.width && bbox.height <= region.height;
  }

  const width = measureTextMm(text, minFont, style);
  return width <= region.width;
}
