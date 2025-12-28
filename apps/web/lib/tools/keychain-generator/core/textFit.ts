import type { HolePosition } from '../types/keychain';

/**
 * Approximate text width using character count and font size
 */
function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/**
 * Calculate available text region considering hole position
 */
export function calculateTextRegion(
  containerWidth: number,
  containerHeight: number,
  holeEnabled: boolean,
  holePosition: HolePosition,
  holeCenterX: number | null,
  holeCenterY: number | null,
  holeRadius: number
): { startX: number; endX: number; centerX: number; centerY: number; maxWidth: number } {
  const padding = 3;
  let startX = padding;
  let endX = containerWidth - padding;
  
  if (holeEnabled && holeCenterX !== null && holeRadius > 0) {
    if (holePosition === 'left') {
      startX = holeCenterX + holeRadius + padding;
    } else if (holePosition === 'right') {
      endX = holeCenterX - holeRadius - padding;
    }
  }
  
  const maxWidth = endX - startX;
  const centerX = (startX + endX) / 2;
  const centerY = containerHeight / 2;
  
  return { startX, endX, centerX, centerY, maxWidth };
}

/**
 * Fit text to available width by calculating appropriate font size
 */
export function fitTextToWidth(
  text: string,
  maxWidth: number,
  baseFontSize: number,
  minFontSize: number
): number {
  if (!text || text.trim().length === 0) return baseFontSize;
  
  let fontSize = baseFontSize;
  let textWidth = approximateTextWidth(text, fontSize);
  
  while (textWidth > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    textWidth = approximateTextWidth(text, fontSize);
  }
  
  return Math.max(fontSize, minFontSize);
}

/**
 * Calculate font size for keychain text
 */
export function calculateKeychainFontSize(
  text: string,
  textRegion: { maxWidth: number },
  sizeMode: 'auto' | 'manual',
  manualSize?: number
): number {
  if (sizeMode === 'manual' && manualSize) {
    return manualSize;
  }
  
  const baseFontSize = 24;
  const minFontSize = 8;
  
  return fitTextToWidth(text, textRegion.maxWidth, baseFontSize, minFontSize);
}

/**
 * Check if text fits within available space
 */
export function textFitsInRegion(text: string, fontSize: number, maxWidth: number): boolean {
  const textWidth = approximateTextWidth(text, fontSize);
  return textWidth <= maxWidth;
}

/**
 * Escape XML special characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
