/**
 * Personalised Sign Generator V3 PRO - Text to Path Conversion
 * Converts text to SVG path using shared font registry
 */

import { loadFont, textToPathD, getFontConfigSafe } from '../../../../fonts/sharedFontRegistry';
import type { FontId } from '../../../../fonts/sharedFontRegistry';
import type { TextElement, TextTransformCase } from '../../types/signPro';
import { getCssFontFamily } from '../../../../fonts/fontLoader';

export interface TextPathResult {
  pathD: string;
  width: number;
  height: number;
  baselineY: number;
  requestedFontId: FontId;
  usedFontId: FontId;
  usedFallback: boolean;
}

/**
 * Apply text transform case
 */
export function applyTextCase(text: string, transformCase: TextTransformCase): string {
  switch (transformCase) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\w\S*/g, txt => 
        txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
      );
    default:
      return text;
  }
}

/**
 * Convert text element to SVG path
 */
export async function textElementToPath(
  element: TextElement
): Promise<TextPathResult> {
  const text = applyTextCase(element.text, element.transformCase);
  
  if (!text || text.trim().length === 0) {
    return {
      pathD: '',
      width: 0,
      height: 0,
      baselineY: 0,
      requestedFontId: element.fontId,
      usedFontId: element.fontId,
      usedFallback: false,
    };
  }

  try {
    let usedFallback = false;
    const requestedFontId = element.fontId;
    let usedFontId: FontId = requestedFontId;

    let font = await loadFont(requestedFontId);

    try {
      const result = textToPathD(font, text, element.sizeMm, element.letterSpacingMm);
      return {
        pathD: result.pathD,
        width: result.width,
        height: result.height,
        baselineY: element.sizeMm * 0.85,
        requestedFontId,
        usedFontId,
        usedFallback,
      };
    } catch (innerError) {
      console.warn(`[TextToPath] Path generation failed for ${requestedFontId}:`, innerError);
      throw innerError;
    }
  } catch (error) {
    console.warn(`[TextToPath] Failed to load/convert font ${element.fontId}:`, error);

    const fallbackFontId = getFontConfigSafe('Milkshake').id;
    if (fallbackFontId && fallbackFontId !== element.fontId) {
      try {
        const fallbackFont = await loadFont(fallbackFontId);
        const result = textToPathD(fallbackFont, text, element.sizeMm, element.letterSpacingMm);
        return {
          pathD: result.pathD,
          width: result.width,
          height: result.height,
          baselineY: element.sizeMm * 0.85,
          requestedFontId: element.fontId,
          usedFontId: fallbackFontId,
          usedFallback: true,
        };
      } catch (fallbackError) {
        console.warn(`[TextToPath] Fallback font also failed (${fallbackFontId}):`, fallbackError);
      }
    }

    return {
      pathD: '',
      width: 0,
      height: 0,
      baselineY: 0,
      requestedFontId: element.fontId,
      usedFontId: element.fontId,
      usedFallback: true,
    };
  }
}

/**
 * Convert text to path with transform applied
 * Returns path translated to element position
 */
export async function textToPathWithTransform(
  element: TextElement,
  centerX: number,
  centerY: number
): Promise<string> {
  const result = await textElementToPath(element);
  
  if (!result.pathD) {
    return '';
  }

  // Calculate offset based on alignment
  let offsetX = 0;
  switch (element.align) {
    case 'left':
      offsetX = 0;
      break;
    case 'right':
      offsetX = -result.width;
      break;
    case 'center':
    default:
      offsetX = -result.width / 2;
      break;
  }

  // Apply transform
  const tx = element.transform.xMm + offsetX;
  const ty = element.transform.yMm - result.height / 2;
  const rotate = element.transform.rotateDeg;
  const scaleX = element.transform.scaleX;
  const scaleY = element.transform.scaleY;

  // Build transform string
  const transforms: string[] = [];
  
  if (tx !== 0 || ty !== 0) {
    transforms.push(`translate(${tx.toFixed(3)}, ${ty.toFixed(3)})`);
  }
  
  if (rotate !== 0) {
    const cx = result.width / 2;
    const cy = result.height / 2;
    transforms.push(`rotate(${rotate}, ${cx.toFixed(3)}, ${cy.toFixed(3)})`);
  }
  
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }

  if (transforms.length === 0) {
    return result.pathD;
  }

  // Return path with transform group
  return `<g transform="${transforms.join(' ')}"><path d="${result.pathD}"/></g>`;
}

/**
 * Build SVG text element (fallback when path conversion not available)
 */
export function buildTextSvgElement(
  element: TextElement,
  stroke: string,
  strokeWidth: number,
  fill: string
): string {
  const text = applyTextCase(element.text, element.transformCase);
  
  if (!text || text.trim().length === 0) {
    return '';
  }

  const { xMm, yMm, rotateDeg } = element.transform;
  
  const textAnchor = element.align === 'left' ? 'start' 
    : element.align === 'right' ? 'end' 
    : 'middle';

  const transforms: string[] = [];
  if (rotateDeg !== 0) {
    transforms.push(`rotate(${rotateDeg}, ${xMm}, ${yMm})`);
  }

  const transformAttr = transforms.length > 0 
    ? ` transform="${transforms.join(' ')}"` 
    : '';

  const letterSpacingAttr = element.letterSpacingMm !== 0 
    ? ` letter-spacing="${element.letterSpacingMm}"` 
    : '';

  // Escape XML entities
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<text x="${xMm.toFixed(3)}" y="${yMm.toFixed(3)}" font-family="${getCssFontFamily(element.fontId)}" font-size="${element.sizeMm}" font-weight="${element.weight}" text-anchor="${textAnchor}" dominant-baseline="middle" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${letterSpacingAttr}${transformAttr}>${escapedText}</text>`;
}

/**
 * Check if font is available for text-to-path conversion
 */
export async function isFontAvailable(fontId: FontId): Promise<boolean> {
  try {
    await loadFont(fontId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get estimated text bounds without loading font
 * Used for quick layout calculations
 */
export function estimateTextBounds(
  text: string,
  sizeMm: number,
  letterSpacingMm: number = 0
): { width: number; height: number } {
  if (!text || text.length === 0) {
    return { width: 0, height: 0 };
  }

  // Rough estimate: 0.55 * fontSize per character
  const charWidth = sizeMm * 0.55;
  const width = text.length * charWidth + (text.length - 1) * letterSpacingMm;
  const height = sizeMm * 1.2;

  return { width, height };
}
