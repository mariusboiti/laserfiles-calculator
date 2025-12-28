/**
 * SVG Export for Round Coaster Canvas
 * Generates laser-safe SVG with CUT/ENGRAVE layer grouping
 */

import type { CanvasDocument, CanvasElement, LayerType } from '../types/canvas';
import { LAYER_COLORS } from '../types/canvas';

/**
 * Build export SVG from canvas document
 */
export function buildExportSvg(
  doc: CanvasDocument,
  useLayerColors: boolean = false
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

  // Metadata
  svg += `  <metadata>\n`;
  svg += `    <lfs:coaster xmlns:lfs="https://laserfilespro.com/ns">\n`;
  svg += `      <lfs:shape>${artboard.shapeType}</lfs:shape>\n`;
  svg += `      <lfs:width>${widthMm}</lfs:width>\n`;
  svg += `      <lfs:height>${heightMm}</lfs:height>\n`;
  svg += `      <lfs:generator>Round Coaster Generator PRO</lfs:generator>\n`;
  svg += `    </lfs:coaster>\n`;
  svg += `  </metadata>\n`;

  // CUT layer group
  if (cutElements.length > 0) {
    const cutColor = useLayerColors ? LAYER_COLORS.CUT : '#000000';
    svg += `  <g id="CUT">\n`;
    for (const el of cutElements) {
      svg += renderElement(el, cutColor);
    }
    svg += `  </g>\n`;
  }

  // ENGRAVE layer group
  if (engraveElements.length > 0) {
    const engraveColor = useLayerColors ? LAYER_COLORS.ENGRAVE : '#000000';
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
function renderElement(element: CanvasElement, color: string): string {
  const { transform } = element;
  const transformAttr = buildTransformAttr(transform);

  switch (element.kind) {
    case 'shape':
    case 'border':
    case 'ornament':
    case 'traced':
      return `    <path d="${element.pathD}" fill="none" stroke="${color}" stroke-width="${element.strokeWidthMm}"${transformAttr}/>\n`;

    case 'text':
      return `    <text x="0" y="0" text-anchor="${element.textAnchor}" dominant-baseline="middle" ` +
        `font-family="${escapeXml(element.fontFamily)}" font-size="${element.fontSizeMm}" font-weight="${element.fontWeight}" ` +
        `fill="none" stroke="${color}" stroke-width="0.3" letter-spacing="${element.letterSpacing}"${transformAttr}>${escapeXml(element.content)}</text>\n`;

    default:
      return '';
  }
}

/**
 * Build transform attribute string
 */
function buildTransformAttr(transform: CanvasElement['transform']): string {
  const parts: string[] = [];

  if (transform.xMm !== 0 || transform.yMm !== 0) {
    parts.push(`translate(${transform.xMm}, ${transform.yMm})`);
  }

  if (transform.rotateDeg !== 0) {
    parts.push(`rotate(${transform.rotateDeg})`);
  }

  if (transform.scaleX !== 1 || transform.scaleY !== 1) {
    parts.push(`scale(${transform.scaleX}, ${transform.scaleY})`);
  }

  if (parts.length === 0) return '';
  return ` transform="${parts.join(' ')}"`;
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
