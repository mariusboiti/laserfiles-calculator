/**
 * Keychain Hub V2 - Text Fitting with Real BBox
 * Binary search font size using actual path measurements
 */

import { measureTextBBoxMm, type PathBBox } from './textToPath';
import type { FontId } from './fontRegistry';

/**
 * Fit font size to max width (single line)
 * Returns optimal font size in mm
 */
export async function fitFontSizePath(
  text: string,
  fontId: FontId,
  maxWidthMm: number,
  minFontMm: number,
  maxFontMm: number
): Promise<number> {
  if (!text || text.trim().length === 0 || maxWidthMm <= 0) {
    return minFontMm;
  }

  const min = Math.max(4, minFontMm);
  const max = Math.min(100, maxFontMm);

  if (min >= max) return min;

  // Check if min font fits
  const minBBox = await measureTextBBoxMm(text, fontId, min);
  if (minBBox.width > maxWidthMm) {
    return min; // Return min even if doesn't fit
  }

  // Check if max font fits
  const maxBBox = await measureTextBBoxMm(text, fontId, max);
  if (maxBBox.width <= maxWidthMm) {
    return max;
  }

  // Binary search
  let low = min;
  let high = max;
  let bestFit = min;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;
    const bbox = await measureTextBBoxMm(text, fontId, mid);

    if (bbox.width <= maxWidthMm) {
      bestFit = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor(bestFit);
}

/**
 * Fit font size for double-line text
 * Both lines must fit width, total height must fit maxHeight
 */
export async function fitFontSizeDoubleLinePath(
  line1: string,
  line2: string,
  fontId: FontId,
  maxWidthMm: number,
  maxHeightMm: number,
  lineGap: number,
  minFontMm: number,
  maxFontMm: number
): Promise<number> {
  // If one line is empty, treat as single line
  if (!line2 || line2.trim().length === 0) {
    return fitFontSizePath(line1, fontId, maxWidthMm, minFontMm, maxFontMm);
  }
  if (!line1 || line1.trim().length === 0) {
    return fitFontSizePath(line2, fontId, maxWidthMm, minFontMm, maxFontMm);
  }

  const min = Math.max(4, minFontMm);
  const max = Math.min(100, maxFontMm);

  if (min >= max) return min;

  let low = min;
  let high = max;
  let bestFit = min;

  while (high - low > 0.5) {
    const mid = (low + high) / 2;

    const bbox1 = await measureTextBBoxMm(line1, fontId, mid);
    const bbox2 = await measureTextBBoxMm(line2, fontId, mid);

    const maxTextWidth = Math.max(bbox1.width, bbox2.width);
    const totalHeight = bbox1.height + mid * lineGap + bbox2.height;

    const fitsWidth = maxTextWidth <= maxWidthMm;
    const fitsHeight = totalHeight <= maxHeightMm;

    if (fitsWidth && fitsHeight) {
      bestFit = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor(bestFit);
}

/**
 * Check if text fits at given font size
 */
export async function textFitsAtSize(
  text: string,
  fontId: FontId,
  fontSizeMm: number,
  maxWidthMm: number
): Promise<boolean> {
  const bbox = await measureTextBBoxMm(text, fontId, fontSizeMm);
  return bbox.width <= maxWidthMm;
}

/**
 * Get combined bbox for icon + text layout
 */
export async function getIconTextLayoutBBox(
  iconSizeMm: number,
  text: string,
  fontId: FontId,
  fontSizeMm: number,
  gapMm: number
): Promise<PathBBox> {
  const textBBox = await measureTextBBoxMm(text, fontId, fontSizeMm);

  return {
    x: 0,
    y: 0,
    width: iconSizeMm + gapMm + textBBox.width,
    height: Math.max(iconSizeMm, textBBox.height),
  };
}
