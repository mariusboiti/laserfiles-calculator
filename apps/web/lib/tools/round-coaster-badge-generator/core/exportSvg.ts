/**
 * SVG Export for Round Coaster Canvas
 * Generates laser-safe SVG with CUT/ENGRAVE layer grouping
 */

import type { CanvasDocument, CanvasElement, LayerType } from '../types/canvas';
import { LAYER_COLORS } from '../types/canvas';
import { loadPathOps } from '../../../geometry/pathops/loadPathOps';
import { loadFont, textToPathD } from '@/lib/fonts/sharedFontRegistry';

function mul3(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

function invertAffine(m: number[]): number[] {
  // m = [a,b,c,d,e,f,0,0,1] representing
  // [a b c]
  // [d e f]
  // [0 0 1]
  const a = m[0];
  const b = m[1];
  const c = m[2];
  const d = m[3];
  const e = m[4];
  const f = m[5];
  const det = a * e - b * d;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  const invDet = 1 / det;
  const na = e * invDet;
  const nb = -b * invDet;
  const nd = -d * invDet;
  const ne = a * invDet;
  const nc = -(na * c + nb * f);
  const nf = -(nd * c + ne * f);
  return [na, nb, nc, nd, ne, nf, 0, 0, 1];
}

function matrixForTransform(t: CanvasElement['transform']): number[] {
  const tx = t.xMm;
  const ty = t.yMm;
  const rad = (t.rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const translate = [1, 0, tx, 0, 1, ty, 0, 0, 1];
  const rotate = [cos, -sin, 0, sin, cos, 0, 0, 0, 1];
  const scale = [t.scaleX, 0, 0, 0, t.scaleY, 0, 0, 0, 1];
  return mul3(mul3(translate, rotate), scale);
}

function applyMatrix(pk: Awaited<ReturnType<typeof loadPathOps>>, pathD: string, m: number[]): any {
  const p = pk.fromSVG(pathD);
  const out = pk.transform(p, m);
  pk.deletePath(p);
  return out;
}

export async function buildExportSvgAsync(
  doc: CanvasDocument,
  _useLayerColors: boolean = false
): Promise<string> {
  const cutoutLogos = doc.elements.filter((e): e is any => e.kind === 'logo' && e.op === 'CUT_OUT' && e.visible !== false);
  if (cutoutLogos.length === 0) {
    return await buildExportSvgTextToPathAsync(doc, _useLayerColors);
  }

  // Find base shape element (first CUT shape)
  const base = doc.elements.find((e): e is any => e.kind === 'shape' && e.layer === 'CUT' && e.visible !== false);
  if (!base) {
    // No base - fallback
    const filtered: CanvasDocument = {
      ...doc,
      elements: doc.elements.filter(e => !(e.kind === 'logo' && (e as any).op === 'CUT_OUT')),
    };
    return await buildExportSvgTextToPathAsync(filtered, _useLayerColors);
  }

  const pk = await loadPathOps();

  const baseM = matrixForTransform(base.transform);
  const invBaseM = invertAffine(baseM);

  // Bring all cutout logos into base local space
  let cutoutUnion: any = null;
  for (const logo of cutoutLogos) {
    const logoM = matrixForTransform(logo.transform);
    const worldPath = applyMatrix(pk, logo.pathD, logoM);
    const inBaseLocal = pk.transform(worldPath, invBaseM);
    pk.deletePath(worldPath);
    if (!cutoutUnion) {
      cutoutUnion = inBaseLocal;
    } else {
      const next = pk.union(cutoutUnion, inBaseLocal);
      pk.deletePath(cutoutUnion);
      pk.deletePath(inBaseLocal);
      cutoutUnion = next;
    }
  }

  if (!cutoutUnion) {
    const filtered: CanvasDocument = {
      ...doc,
      elements: doc.elements.filter(e => !(e.kind === 'logo' && (e as any).op === 'CUT_OUT')),
    };
    return await buildExportSvgTextToPathAsync(filtered, useLayerColors);
  }

  // Difference base local path - cutoutUnion
  const baseLocal = pk.fromSVG(base.pathD);
  const diff = pk.difference(baseLocal, cutoutUnion);
  const nextBasePathD = pk.toSVG(diff);
  pk.deletePath(baseLocal);
  pk.deletePath(cutoutUnion);
  pk.deletePath(diff);

  const filteredElements = doc.elements
    .filter(e => !(e.kind === 'logo' && (e as any).op === 'CUT_OUT'))
    .map((e) => (e.id === base.id ? ({ ...e, pathD: nextBasePathD } as any) : e));

  const nextDoc: CanvasDocument = { ...doc, elements: filteredElements };
  return await buildExportSvgTextToPathAsync(nextDoc, _useLayerColors);
}

async function buildExportSvgTextToPathAsync(
  doc: CanvasDocument,
  _useLayerColors: boolean
): Promise<string> {
  const { artboard, elements } = doc;
  const { widthMm, heightMm } = artboard;

  const cutElements: CanvasElement[] = [];
  const engraveElements: CanvasElement[] = [];

  for (const el of elements) {
    if (el.visible === false) continue;
    if (el.layer === 'GUIDE') continue;
    if (el.layer === 'CUT') cutElements.push(el);
    else engraveElements.push(el);
  }

  let svg = `<svg width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" xmlns="http://www.w3.org/2000/svg">\n`;

  if (cutElements.length > 0) {
    const cutColor = LAYER_COLORS.CUT;
    svg += `  <g id="CUT">\n`;
    for (const el of cutElements) {
      svg += await renderElementAsync(el, cutColor);
    }
    svg += `  </g>\n`;
  }

  if (engraveElements.length > 0) {
    const engraveColor = LAYER_COLORS.ENGRAVE;
    svg += `  <g id="ENGRAVE">\n`;
    for (const el of engraveElements) {
      svg += await renderElementAsync(el, engraveColor);
    }
    svg += `  </g>\n`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Build export SVG from canvas document
 */
export function buildExportSvg(
  doc: CanvasDocument,
  _useLayerColors: boolean = false
): string {
  const { artboard, elements } = doc;
  const { widthMm, heightMm } = artboard;

  // Group elements by layer
  const cutElements: CanvasElement[] = [];
  const engraveElements: CanvasElement[] = [];

  for (const el of elements) {
    if (el.visible === false) continue;
    if (el.layer === 'GUIDE') continue; // Don't export GUIDE layer

    if (el.layer === 'CUT') {
      cutElements.push(el);
    } else {
      engraveElements.push(el);
    }
  }

  // Build SVG content
  let svg = `<svg width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}" xmlns="http://www.w3.org/2000/svg">\n`;

  // CUT layer group
  if (cutElements.length > 0) {
    const cutColor = LAYER_COLORS.CUT;
    svg += `  <g id="CUT">\n`;
    for (const el of cutElements) {
      svg += renderElement(el, cutColor);
    }
    svg += `  </g>\n`;
  }

  // ENGRAVE layer group
  if (engraveElements.length > 0) {
    const engraveColor = LAYER_COLORS.ENGRAVE;
    svg += `  <g id="ENGRAVE">\n`;
    for (const el of engraveElements) {
      svg += renderElement(el, engraveColor);
    }
    svg += `  </g>\n`;
  }

  svg += `</svg>`;

  return svg;
}

/**
 * Render single element to SVG string
 */
async function renderElementAsync(element: CanvasElement, color: string): Promise<string> {
  if (element.kind === 'text') {
    return await renderTextElementAsPath(element, color);
  }
  return renderElement(element, color);
}

async function renderTextElementAsPath(element: any, color: string): Promise<string> {
  const text = String(element.content || '');
  if (!text.trim()) return '';

  const fontId = String(element.fontId || '');
  if (!fontId) {
    throw new Error('Font could not be converted. Try another font.');
  }

  let font: any;
  try {
    font = await loadFont(fontId);
  } catch {
    throw new Error('Font could not be converted. Try another font.');
  }

  let path;
  try {
    path = textToPathD(font, text, element.fontSizeMm, element.letterSpacing);
  } catch {
    throw new Error('Font could not be converted. Try another font.');
  }

  if (!path.pathD || !/\d/.test(path.pathD)) {
    throw new Error('Font could not be converted. Try another font.');
  }

  const bbox = path.bbox;
  let anchorOffsetX = 0;
  if (element.textAnchor === 'middle') anchorOffsetX = -bbox.width / 2;
  if (element.textAnchor === 'end') anchorOffsetX = -bbox.width;

  const localTranslateX = sanitizeNumber(anchorOffsetX - bbox.x);
  const localTranslateY = sanitizeNumber(-bbox.y - bbox.height / 2);

  const baseTransformValue = buildTransformValue(element.transform);
  const localTransformValue = `translate(${localTranslateX}, ${localTranslateY})`;
  const combinedTransformValue = baseTransformValue
    ? `${baseTransformValue} ${localTransformValue}`
    : localTransformValue;
  const combined = ` transform="${combinedTransformValue}"`;

  const cleanPath = sanitizePathD(path.pathD);
  return `    <path d="${cleanPath}" fill="none" stroke="${color}" stroke-width="0.3"${combined}/>\n`;
}

function renderElement(element: CanvasElement, color: string): string {
  const { transform } = element;
  const transformAttr = buildTransformAttr(transform);

  switch (element.kind) {
    case 'shape':
    case 'border':
    case 'ornament':
    case 'traced':
    case 'basicShape':
    case 'icon': {
      const cleanPath = sanitizePathD(element.pathD);
      const strokeWidth = sanitizeNumber(element.strokeWidthMm);
      return `    <path d="${cleanPath}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${transformAttr}/>\n`;
    }

    case 'logo': {
      const cleanPath = sanitizePathD(element.pathD);
      if (element.op === 'ENGRAVE') {
        // Engrave logos as filled shapes
        return `    <path d="${cleanPath}" fill="${color}" stroke="none"${transformAttr}/>\n`;
      }
      // CUT_OUT is ideally handled via boolean difference into the base cut path.
      // Fallback: export as stroke path on CUT layer.
      const strokeWidth = sanitizeNumber(element.strokeWidthMm);
      return `    <path d="${cleanPath}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${transformAttr}/>\n`;
    }

    case 'text':
      return '';

    default:
      return '';
  }
}

/**
 * Build transform attribute string
 */
function buildTransformValue(transform: CanvasElement['transform']): string {
  const parts: string[] = [];

  if (transform.xMm !== 0 || transform.yMm !== 0) {
    parts.push(`translate(${sanitizeNumber(transform.xMm)}, ${sanitizeNumber(transform.yMm)})`);
  }

  if (transform.rotateDeg !== 0) {
    parts.push(`rotate(${sanitizeNumber(transform.rotateDeg)})`);
  }

  if (transform.scaleX !== 1 || transform.scaleY !== 1) {
    parts.push(`scale(${sanitizeNumber(transform.scaleX)}, ${sanitizeNumber(transform.scaleY)})`);
  }

  return parts.join(' ');
}

function buildTransformAttr(transform: CanvasElement['transform']): string {
  const value = buildTransformValue(transform);
  if (!value) return '';
  return ` transform="${value}"`;
}

/**
 * Sanitize path data for LightBurn compatibility
 */
function sanitizePathD(pathD: string): string {
  // Remove any non-ASCII characters and ensure valid numbers
  return pathD
    .replace(/[^\x20-\x7E]/g, '') // Remove non-printable ASCII
    .replace(/NaN/g, '0')
    .replace(/Infinity/g, '1000')
    .replace(/-Infinity/g, '-1000')
    .trim();
}

/**
 * Sanitize number for SVG output
 */
function sanitizeNumber(n: number): string {
  if (!Number.isFinite(n) || Number.isNaN(n)) return '0';
  return n.toFixed(3);
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  shape: string,
  width: number,
  height: number,
  text?: string
): string {
  let name = `coaster-${shape}-${width}`;
  if (width !== height) {
    name += `x${height}`;
  }
  name += 'mm';

  if (text) {
    const safeText = text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    if (safeText) {
      name += `-${safeText}`;
    }
  }

  return `${name}.svg`;
}
