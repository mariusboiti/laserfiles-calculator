/**
 * Round Coaster & Badge Generator V2 - Text Fitting
 * Robust text fitting with binary search and line splitting
 */

import type { TextFitResult } from '../types/coasterV2';

// Font width factors by character type (calibrated approximations)
const CHAR_WIDTH_FACTORS: Record<string, number> = {
  narrow: 0.35,  // i, l, j, I, 1, |, !, .
  normal: 0.55,  // most letters
  wide: 0.70,    // m, w, M, W
  space: 0.30,
};

function getCharWidthFactor(char: string): number {
  if ('iljI1|!.,:\';'.includes(char)) return CHAR_WIDTH_FACTORS.narrow;
  if ('mwMW@'.includes(char)) return CHAR_WIDTH_FACTORS.wide;
  if (char === ' ') return CHAR_WIDTH_FACTORS.space;
  return CHAR_WIDTH_FACTORS.normal;
}

/**
 * Calculate approximate text width with better character-aware estimation
 */
export function approximateTextWidth(text: string, fontSize: number, letterSpacing: number = 0): number {
  if (!text) return 0;
  
  let width = 0;
  for (const char of text) {
    width += fontSize * getCharWidthFactor(char);
  }
  
  // Add letter spacing
  width += (text.length - 1) * letterSpacing;
  
  return width;
}

/**
 * Binary search to find optimal font size
 */
export function fitFontSizeBinary(
  text: string,
  maxWidth: number,
  minFontSize: number,
  maxFontSize: number,
  letterSpacing: number = 0
): number {
  if (!text || maxWidth <= 0) return minFontSize;
  
  const min = Math.max(6, minFontSize);
  const max = Math.min(50, maxFontSize);
  
  if (min >= max) return min;
  
  // Quick check: does min font fit?
  const minWidth = approximateTextWidth(text, min, letterSpacing);
  if (minWidth > maxWidth) return min; // Can't fit even at min
  
  // Quick check: does max font fit?
  const maxTextWidth = approximateTextWidth(text, max, letterSpacing);
  if (maxTextWidth <= maxWidth) return max; // Max fits perfectly
  
  // Binary search
  let low = min;
  let high = max;
  let bestFit = min;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const width = approximateTextWidth(text, mid, letterSpacing);
    
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
 * Split text into lines at word boundaries
 */
export function splitTextIntoLines(text: string, maxLines: number = 2): string[] {
  if (!text) return [];
  
  const words = text.trim().split(/\s+/);
  if (words.length <= 1 || maxLines === 1) return [text];
  
  if (maxLines === 2 && words.length >= 2) {
    // Try to split roughly in the middle
    const midPoint = Math.ceil(words.length / 2);
    const line1 = words.slice(0, midPoint).join(' ');
    const line2 = words.slice(midPoint).join(' ');
    return [line1, line2];
  }
  
  return [text];
}

/**
 * Fit text to width, optionally splitting into multiple lines
 */
export function fitTextToWidth(
  text: string,
  maxWidth: number,
  minFontSize: number,
  maxFontSize: number,
  letterSpacing: number = 0,
  allowSplit: boolean = false,
  maxLines: number = 2
): TextFitResult {
  if (!text) {
    return { fontSize: maxFontSize, lines: [], overflow: false, scaled: false };
  }
  
  // First try single line
  const singleFontSize = fitFontSizeBinary(text, maxWidth, minFontSize, maxFontSize, letterSpacing);
  const singleWidth = approximateTextWidth(text, singleFontSize, letterSpacing);
  const singleOverflow = singleWidth > maxWidth;
  
  // If no split allowed or single line works at decent size
  if (!allowSplit || singleFontSize >= maxFontSize * 0.7) {
    return {
      fontSize: singleFontSize,
      lines: [text],
      overflow: singleOverflow,
      scaled: singleFontSize < maxFontSize,
    };
  }
  
  // Try splitting into lines
  const lines = splitTextIntoLines(text, maxLines);
  
  if (lines.length <= 1) {
    return {
      fontSize: singleFontSize,
      lines: [text],
      overflow: singleOverflow,
      scaled: singleFontSize < maxFontSize,
    };
  }
  
  // Find font size that fits all lines
  let multiLineFontSize = maxFontSize;
  for (const line of lines) {
    const lineSize = fitFontSizeBinary(line, maxWidth, minFontSize, maxFontSize, letterSpacing);
    multiLineFontSize = Math.min(multiLineFontSize, lineSize);
  }
  
  // Choose better option: single line scaled or multi-line
  if (multiLineFontSize > singleFontSize * 1.3) {
    // Multi-line is significantly better
    return {
      fontSize: multiLineFontSize,
      lines,
      overflow: false,
      scaled: multiLineFontSize < maxFontSize,
    };
  }
  
  // Single line is acceptable
  return {
    fontSize: singleFontSize,
    lines: [text],
    overflow: singleOverflow,
    scaled: singleFontSize < maxFontSize,
  };
}

/**
 * Calculate Y positions for text lines
 */
export function calculateTextYPositions(
  height: number,
  hasTop: boolean,
  centerLines: number,
  hasBottom: boolean,
  lineHeight: number = 1.2
): { yTop?: number; yCenter: number[]; yBottom?: number } {
  const result: { yTop?: number; yCenter: number[]; yBottom?: number } = {
    yCenter: [],
  };
  
  // Base positions depending on what's present
  let topY = 0.28;
  let centerStartY = 0.50;
  let bottomY = 0.78;
  
  if (hasTop && !hasBottom) {
    topY = 0.32;
    centerStartY = 0.58;
  } else if (!hasTop && hasBottom) {
    centerStartY = 0.45;
    bottomY = 0.75;
  } else if (!hasTop && !hasBottom) {
    centerStartY = 0.52;
  }
  
  if (hasTop) {
    result.yTop = height * topY;
  }
  
  if (hasBottom) {
    result.yBottom = height * bottomY;
  }
  
  // Center text - adjust for multiple lines
  if (centerLines === 1) {
    result.yCenter = [height * centerStartY];
  } else if (centerLines === 2) {
    const spacing = height * 0.12;
    const baseY = height * (centerStartY - 0.03);
    result.yCenter = [baseY, baseY + spacing];
  } else {
    result.yCenter = [height * centerStartY];
  }
  
  return result;
}

/**
 * Validate if text will fit at given font size
 */
export function validateTextFits(
  text: string, 
  maxWidth: number, 
  fontSize: number,
  letterSpacing: number = 0
): boolean {
  const width = approximateTextWidth(text, fontSize, letterSpacing);
  return width <= maxWidth;
}

/**
 * Normalize diacritics and filter unsupported characters
 */
export function normalizeText(text: string): { text: string; hasUnsupported: boolean } {
  // Normalize common diacritics
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritics
  
  // Check for unsupported characters
  const supported = /^[a-zA-Z0-9\s.,!?'"&@#$%*()\-_+=:;/\\<>]+$/;
  const hasUnsupported = !supported.test(normalized);
  
  return { text: normalized, hasUnsupported };
}

/**
 * Transform text (uppercase, etc.)
 */
export function transformText(text: string, uppercase: boolean): string {
  if (!text) return '';
  return uppercase ? text.toUpperCase() : text;
}
