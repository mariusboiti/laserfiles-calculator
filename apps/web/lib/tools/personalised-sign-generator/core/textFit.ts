/**
 * Text auto-fit helper for Personalised Sign Generator
 * Binary search algorithm to find optimal font size for 3 text lines
 */

/**
 * Approximate text width in pixels
 * Uses average character width ratio of 0.58
 */
export function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

/**
 * Fit font size to available width using binary search
 * Returns optimal font size between min and max that fits the text
 */
export function fitFontSize(
  text: string,
  maxWidth: number,
  minFontSize: number,
  maxFontSize: number
): number {
  if (!text || maxWidth <= 0) return minFontSize;
  
  // Clamp min/max
  const min = Math.max(6, minFontSize);
  const max = Math.min(120, maxFontSize);
  
  if (min >= max) return min;
  
  // Check if even minimum font size fits
  const minWidth = approximateTextWidth(text, min);
  if (minWidth > maxWidth) {
    return min; // Return min even if doesn't fit
  }
  
  // Check if maximum font size fits
  const maxTextWidth = approximateTextWidth(text, max);
  if (maxTextWidth <= maxWidth) {
    return max; // Use maximum if it fits
  }
  
  // Binary search for optimal font size
  let low = min;
  let high = max;
  let bestFit = min;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = approximateTextWidth(text, mid);
    
    if (width <= maxWidth) {
      bestFit = mid;
      low = mid + 1; // Try larger
    } else {
      high = mid - 1; // Try smaller
    }
  }
  
  return bestFit;
}

/**
 * Calculate Y positions for text lines based on which lines are present
 */
export function calculateTextYPositions(
  heightMm: number,
  hasLine1: boolean,
  hasLine2: boolean,
  hasLine3: boolean,
  hasTopHoles: boolean,
  holeDiameter: number,
  holeMargin: number
): { y1?: number; y2?: number; y3?: number } {
  const positions: { y1?: number; y2?: number; y3?: number } = {};
  
  // Calculate safe zone offset if holes are at top
  let topSafeZone = 0;
  if (hasTopHoles) {
    topSafeZone = holeDiameter + holeMargin + 10; // Extra 10mm clearance
  }
  
  // Determine layout based on which lines are present
  if (hasLine2 && !hasLine1 && !hasLine3) {
    // Only Line2: center it
    positions.y2 = heightMm * 0.55;
  } else if (hasLine1 && hasLine2 && !hasLine3) {
    // Line1 + Line2
    positions.y1 = Math.max(heightMm * 0.40, topSafeZone);
    positions.y2 = heightMm * 0.65;
  } else if (hasLine1 && hasLine2 && hasLine3) {
    // All 3 lines
    positions.y1 = Math.max(heightMm * 0.30, topSafeZone);
    positions.y2 = heightMm * 0.55;
    positions.y3 = heightMm * 0.78;
  } else if (!hasLine1 && hasLine2 && hasLine3) {
    // Line2 + Line3
    positions.y2 = heightMm * 0.45;
    positions.y3 = heightMm * 0.70;
  } else if (hasLine1 && !hasLine2 && hasLine3) {
    // Line1 + Line3 (unusual but handle it)
    positions.y1 = Math.max(heightMm * 0.40, topSafeZone);
    positions.y3 = heightMm * 0.70;
  }
  
  return positions;
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
