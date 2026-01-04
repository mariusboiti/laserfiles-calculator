/**
 * Text auto-fit helper for Bulk Name Tags
 * Binary search algorithm to find optimal font size
 */

/**
 * Approximate text width in pixels
 * Uses average character width ratio of 0.55
 */
export function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
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
  const max = Math.min(80, maxFontSize);
  
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
 * Calculate available width for text considering padding and hole zone
 */
export function calculateAvailableWidth(
  tagWidth: number,
  padding: number,
  hasHole: boolean,
  holeDiameter: number,
  holeMargin: number
): number {
  let available = tagWidth - 2 * padding;
  
  if (hasHole) {
    // Subtract hole zone from one side
    const holeZone = holeDiameter + 2 * holeMargin;
    available -= holeZone;
  }
  
  return Math.max(10, available); // Minimum 10mm
}

/**
 * Validate if text fits at minimum font size
 * Returns true if text will fit, false if too long even at min size
 */
export function validateTextFits(
  text: string,
  maxWidth: number,
  minFontSize: number
): boolean {
  const minWidth = approximateTextWidth(text, minFontSize);
  return minWidth <= maxWidth;
}
