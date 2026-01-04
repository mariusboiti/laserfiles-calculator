/**
 * Text auto-fit helper for Keychain Generator
 * Binary search algorithm with hole-safe area calculation
 */

import type { HolePosition } from '../types/keychain';

/**
 * Approximate text width in pixels
 * Uses average character width ratio of 0.58
 */
export function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

/**
 * Fit font size to available width using binary search
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  minFontSize: number,
  maxFontSize: number
): number {
  if (!text || maxWidth <= 0) return minFontSize;
  
  const min = Math.max(6, minFontSize);
  const max = Math.min(80, maxFontSize);
  
  if (min >= max) return min;
  
  const minWidth = approximateTextWidth(text, min);
  if (minWidth > maxWidth) {
    return min;
  }
  
  const maxTextWidth = approximateTextWidth(text, max);
  if (maxTextWidth <= maxWidth) {
    return max;
  }
  
  let low = min;
  let high = max;
  let bestFit = min;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = approximateTextWidth(text, mid);
    
    if (width <= maxWidth) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return bestFit;
}

/**
 * Calculate available text region considering hole position
 * Returns { availW, availH, centerX, centerY }
 */
export function calculateTextRegion(config: {
  widthMm: number;
  heightMm: number;
  padding: number;
  holeEnabled: boolean;
  holeDiameterMm: number;
  holeMargin: number;
  holePosition: HolePosition;
}): {
  availW: number;
  availH: number;
  centerX: number;
  centerY: number;
} {
  const { widthMm, heightMm, padding, holeEnabled, holeDiameterMm, holeMargin, holePosition } = config;
  
  let availW = widthMm - 2 * padding;
  let availH = heightMm - 2 * padding;
  let centerX = widthMm / 2;
  let centerY = heightMm / 2;
  
  if (holeEnabled) {
    const holeRadius = holeDiameterMm / 2;
    const holeSafeZone = holeMargin + holeRadius + 3; // Extra 3mm clearance
    
    if (holePosition === 'left') {
      // Reserve left side for hole
      availW = availW - holeSafeZone;
      // Shift text center to the right
      centerX = (holeSafeZone + (widthMm - padding)) / 2;
    } else if (holePosition === 'right') {
      // Reserve right side for hole
      availW = availW - holeSafeZone;
      // Shift text center to the left
      centerX = (padding + (widthMm - holeSafeZone)) / 2;
    } else if (holePosition === 'top') {
      // Reserve top area for hole
      const topOffset = (holeMargin + holeRadius) * 0.4;
      availH = availH - topOffset;
      // Push text down slightly
      centerY = centerY + topOffset / 2;
    }
  }
  
  return {
    availW: Math.max(10, availW),
    availH: Math.max(10, availH),
    centerX,
    centerY,
  };
}

/**
 * Validate if text fits at minimum font size
 */
export function validateTextFits(
  text: string,
  maxWidth: number,
  minFontSize: number
): boolean {
  const minWidth = approximateTextWidth(text, minFontSize);
  return minWidth <= maxWidth;
}
