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
  bbox: { x: number; y: number; width: number; height: number };
  ascenderMm: number;
  descenderMm: number;
  advanceWidthMm: number;
  baselineY: number;
  requestedFontId: FontId;
  usedFontId: FontId;
  usedFallback: boolean;
}

export interface CurvedGlyph {
  d: string;
  transform: string;
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

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function scalePathData(pathData: string, scale: number): string {
  return pathData.replace(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return (num * scale).toFixed(3);
  });
}

/**
 * Convert curved text element into per-glyph paths with transforms.
 * Output is centered at element local origin (0,0); you still apply element.transform in the renderer.
 */
export async function textElementToCurvedGlyphs(element: TextElement): Promise<{ glyphs: CurvedGlyph[]; totalWidthMm: number }> {
  const text = applyTextCase(element.text, element.transformCase);
  if (!text || text.trim().length === 0) {
    return { glyphs: [], totalWidthMm: 0 };
  }

  const requestedFontId = element.fontId;
  let font: any;
  try {
    font = await loadFont(requestedFontId);
  } catch {
    const fallback = getFontConfigSafe('Milkshake').id;
    if (fallback && fallback !== requestedFontId) {
      try {
        font = await loadFont(fallback);
      } catch {
        font = null;
      }
    }
  }

  if (!font) {
    return { glyphs: [], totalWidthMm: 0 };
  }

  const glyphsRaw: Array<{ d: string; w: number; ox: number; oy: number; cw: number }> = [];
  const sizeMm = element.sizeMm;
  const letterSpacingMm = element.letterSpacingMm || 0;

  const PX_PER_MM = 3.7795275591;
  const sizePx = sizeMm * PX_PER_MM;

  for (const ch of Array.from(text)) {
    if (ch === ' ') {
      glyphsRaw.push({ d: '', w: Math.max(0.1, sizeMm * 0.35 + letterSpacingMm), ox: 0, oy: 0, cw: 0 });
      continue;
    }

    const path = font.getPath(ch, 0, 0, sizePx);
    const bbox = path.getBoundingBox();
    const pathDpx = path.toPathData(3);
    const d = scalePathData(pathDpx, 1 / PX_PER_MM);

    const cw = Math.max(0.01, (bbox.x2 - bbox.x1) / PX_PER_MM);
    const chH = Math.max(0.01, (bbox.y2 - bbox.y1) / PX_PER_MM);
    const ox = -(bbox.x1 / PX_PER_MM + cw / 2);
    const oy = -(bbox.y1 / PX_PER_MM + chH / 2);

    glyphsRaw.push({ d, w: cw + letterSpacingMm, ox, oy, cw });
  }

  if (glyphsRaw.length === 0) {
    return { glyphs: [], totalWidthMm: 0 };
  }

  const totalWidthMm = Math.max(0, glyphsRaw.reduce((sum, it) => sum + it.w, 0) - letterSpacingMm);
  if (totalWidthMm <= 0) {
    return { glyphs: [], totalWidthMm: 0 };
  }

  const curvedEnabled = Boolean(element.curved?.enabled);
  const placement = curvedEnabled
    ? element.curved!.placement
    : (element.curvedMode || 'straight') === 'arcDown'
      ? 'bottom'
      : 'top';
  const direction = curvedEnabled ? element.curved!.direction : 'outside';
  const sign = placement === 'top' ? -1 : 1;

  const arcDeg = curvedEnabled
    ? element.curved!.arcDeg
    : Math.max(10, Math.min(180, 20 + (element.curvedIntensity ?? 0) * 1.6));
  const arcRad = Math.max(0.001, degToRad(Math.max(0.001, arcDeg)));

  const radiusMm = curvedEnabled
    ? Math.max(1, element.curved!.radiusMm)
    : Math.max(1, totalWidthMm / arcRad);

  const occupiedRad = Math.max(0.001, totalWidthMm / radiusMm);
  const startTheta =
    element.align === 'left'
      ? -arcRad / 2
      : element.align === 'right'
        ? arcRad / 2 - occupiedRad
        : -occupiedRad / 2;

  const y0 = sign * radiusMm * Math.cos(arcRad / 2);
  let xCursor = 0;
  const glyphs: CurvedGlyph[] = [];

  for (const it of glyphsRaw) {
    const charW = Math.max(0.01, it.cw);
    const sCenter = xCursor + charW / 2;
    xCursor += it.w;
    if (!it.d) continue;

    const theta = startTheta + sCenter / radiusMm;
    const x = radiusMm * Math.sin(theta);
    const y = y0 - sign * radiusMm * Math.cos(theta);

    let a = radToDeg(Math.atan2(sign * Math.sin(theta), Math.cos(theta)));
    if (direction === 'inside') {
      a += 180;
    }

    const glyphTransform = `translate(${x.toFixed(3)}, ${y.toFixed(3)}) rotate(${a.toFixed(3)}) translate(${it.ox.toFixed(3)}, ${it.oy.toFixed(3)})`;
    glyphs.push({ d: it.d, transform: glyphTransform });
  }

  return { glyphs, totalWidthMm };
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
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      ascenderMm: 0,
      descenderMm: 0,
      advanceWidthMm: 0,
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
    // Convert font units -> mm. Our system uses y-down coordinates in SVG.
    // In font units, ascender is typically positive and descender negative (y-up).
    // For y-down SVG, we negate them.
    const unitsPerEm = (font as any).unitsPerEm || 1000;
    const scaleMm = element.sizeMm / unitsPerEm;
    const ascenderMm = -((font as any).ascender || 0) * scaleMm;
    const descenderMm = -((font as any).descender || 0) * scaleMm;
    const sizePx = element.sizeMm * 3.7795275591;
    const baseAdvancePx = typeof (font as any).getAdvanceWidth === 'function' ? (font as any).getAdvanceWidth(text, sizePx) : 0;
    const advanceWidthMm = baseAdvancePx / 3.7795275591 + (text.length > 1 ? (text.length - 1) * element.letterSpacingMm : 0);

    try {
      const result = textToPathD(font, text, element.sizeMm, element.letterSpacingMm);
      return {
        pathD: result.pathD,
        width: result.width,
        height: result.height,
        bbox: result.bbox,
        ascenderMm,
        descenderMm,
        advanceWidthMm,
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
        const unitsPerEm = (fallbackFont as any).unitsPerEm || 1000;
        const scaleMm = element.sizeMm / unitsPerEm;
        const ascenderMm = -((fallbackFont as any).ascender || 0) * scaleMm;
        const descenderMm = -((fallbackFont as any).descender || 0) * scaleMm;
        const sizePx = element.sizeMm * 3.7795275591;
        const baseAdvancePx = typeof (fallbackFont as any).getAdvanceWidth === 'function' ? (fallbackFont as any).getAdvanceWidth(text, sizePx) : 0;
        const advanceWidthMm = baseAdvancePx / 3.7795275591 + (text.length > 1 ? (text.length - 1) * element.letterSpacingMm : 0);
        const result = textToPathD(fallbackFont, text, element.sizeMm, element.letterSpacingMm);
        return {
          pathD: result.pathD,
          width: result.width,
          height: result.height,
          bbox: result.bbox,
          ascenderMm,
          descenderMm,
          advanceWidthMm,
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
      bbox: { x: 0, y: 0, width: 0, height: 0 },
      ascenderMm: 0,
      descenderMm: 0,
      advanceWidthMm: 0,
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
