/**
 * Text auto-fit helper for Round Coaster & Badge Generator
 */

export function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

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
  if (minWidth > maxWidth) return min;
  
  const maxTextWidth = approximateTextWidth(text, max);
  if (maxTextWidth <= maxWidth) return max;
  
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

export function calculateTextYPositions(
  height: number,
  hasTop: boolean,
  hasCenter: boolean,
  hasBottom: boolean
): { yTop?: number; yCenter?: number; yBottom?: number } {
  const positions: { yTop?: number; yCenter?: number; yBottom?: number } = {};
  
  if (hasCenter && !hasTop && !hasBottom) {
    positions.yCenter = height * 0.55;
  } else if (hasTop && hasCenter && !hasBottom) {
    positions.yTop = height * 0.35;
    positions.yCenter = height * 0.62;
  } else if (!hasTop && hasCenter && hasBottom) {
    positions.yCenter = height * 0.50;
    positions.yBottom = height * 0.75;
  } else if (hasTop && hasCenter && hasBottom) {
    positions.yTop = height * 0.30;
    positions.yCenter = height * 0.55;
    positions.yBottom = height * 0.78;
  }
  
  return positions;
}

export function validateTextFits(text: string, maxWidth: number, minFontSize: number): boolean {
  const minWidth = approximateTextWidth(text, minFontSize);
  return minWidth <= maxWidth;
}
