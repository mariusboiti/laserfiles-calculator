/**
 * Text auto-fit and QR sizing utilities for Product Label & SKU Generator
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
  
  const min = Math.max(1, minFontSize);
  const max = Math.min(20, maxFontSize);
  
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

export function calculateTextRegion(config: {
  labelWidth: number;
  labelHeight: number;
  padding: number;
  qrEnabled: boolean;
  qrSize: number;
  qrMargin: number;
}): {
  textMaxWidth: number;
  textMaxHeight: number;
} {
  const { labelWidth, labelHeight, padding, qrEnabled, qrSize, qrMargin } = config;
  
  let textMaxWidth = labelWidth - 2 * padding;
  let textMaxHeight = labelHeight - 2 * padding;
  
  if (qrEnabled) {
    const qrBlockW = qrSize + 2 * qrMargin;
    textMaxWidth = textMaxWidth - qrBlockW;
  }
  
  return {
    textMaxWidth: Math.max(10, textMaxWidth),
    textMaxHeight: Math.max(10, textMaxHeight),
  };
}

export function calculateTextYPositions(
  labelHeight: number,
  hasName: boolean,
  hasSku: boolean,
  hasPrice: boolean
): {
  yName?: number;
  ySku?: number;
  yPrice?: number;
} {
  const positions: { yName?: number; ySku?: number; yPrice?: number } = {};
  
  if (hasName) positions.yName = labelHeight * 0.30;
  if (hasSku) positions.ySku = labelHeight * (hasPrice ? 0.60 : 0.65);
  if (hasPrice) positions.yPrice = labelHeight * 0.85;
  
  return positions;
}

export function calculateQRPosition(config: {
  labelWidth: number;
  labelHeight: number;
  padding: number;
  qrSize: number;
  cornerRadius: number;
  rounded: boolean;
}): {
  qrX: number;
  qrY: number;
  isValid: boolean;
} {
  const { labelWidth, labelHeight, padding, qrSize, cornerRadius, rounded } = config;
  
  let qrX = labelWidth - padding - qrSize;
  let qrY = labelHeight - padding - qrSize;
  
  const minSafeMargin = rounded ? Math.max(padding, cornerRadius) : padding;
  
  const isValid = qrX >= minSafeMargin && qrY >= minSafeMargin;
  
  return { qrX, qrY, isValid };
}

export function validateTextFits(text: string, maxWidth: number, minFontSize: number): boolean {
  const minWidth = approximateTextWidth(text, minFontSize);
  return minWidth <= maxWidth;
}
