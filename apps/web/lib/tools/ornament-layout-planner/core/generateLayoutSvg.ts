import type { LayoutOptions } from '../types/layout';

const PX_TO_MM = 25.4 / 96;

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseLengthToMm(raw: string | null): number | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;

  const mm = v.match(/^([0-9.+-eE]+)\s*mm$/);
  if (mm) return Number(mm[1]);

  const cm = v.match(/^([0-9.+-eE]+)\s*cm$/);
  if (cm) return Number(cm[1]) * 10;

  const px = v.match(/^([0-9.+-eE]+)\s*px$/);
  if (px) return Number(px[1]) * PX_TO_MM;

  const num = v.match(/^([0-9.+-eE]+)$/);
  if (num) return Number(num[1]) * PX_TO_MM;

  return null;
}

function parseViewBox(svgEl: SVGSVGElement) {
  const vb = svgEl.getAttribute('viewBox');
  if (!vb) return null;
  const parts = vb
    .trim()
    .split(/\s+|,/)
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n));
  if (parts.length !== 4) return null;
  return {
    minX: parts[0],
    minY: parts[1],
    w: parts[2],
    h: parts[3],
  };
}

function extractTemplate(svgString: string) {
  if (typeof DOMParser === 'undefined') {
    throw new Error('DOMParser is not available');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = doc.querySelector('svg') as SVGSVGElement | null;
  if (!svgEl) throw new Error('Invalid SVG: missing <svg>');

  const widthMmAttr = parseLengthToMm(svgEl.getAttribute('width'));
  const heightMmAttr = parseLengthToMm(svgEl.getAttribute('height'));
  const viewBox = parseViewBox(svgEl);

  const ornamentWidthMm = widthMmAttr ?? (viewBox ? viewBox.w : null);
  const ornamentHeightMm = heightMmAttr ?? (viewBox ? viewBox.h : null);

  if (!ornamentWidthMm || !ornamentHeightMm) {
    throw new Error('Cannot determine template size (need width/height or viewBox)');
  }

  // Map template coordinate system into mm. If a viewBox exists, its units are the inner coordinate space.
  // We scale that coordinate space to match the physical width/height in mm when possible.
  const scaleX = viewBox && widthMmAttr ? widthMmAttr / viewBox.w : 1;
  const scaleY = viewBox && heightMmAttr ? heightMmAttr / viewBox.h : 1;
  const minX = viewBox ? viewBox.minX : 0;
  const minY = viewBox ? viewBox.minY : 0;

  const serializer = new XMLSerializer();
  let inner = '';
  for (const node of Array.from(svgEl.childNodes)) {
    inner += serializer.serializeToString(node);
  }

  return {
    ornamentWidthMm,
    ornamentHeightMm,
    inner,
    viewBox,
    scaleX,
    scaleY,
    minX,
    minY,
  };
}

export function generateLayoutSvg(options: LayoutOptions): string {
  const sheetW = clamp(options.sheetWidthMm, 1, 10000);
  const sheetH = clamp(options.sheetHeightMm, 1, 10000);

  const rows = clamp(Math.floor(options.rows), 1, 1000);
  const cols = clamp(Math.floor(options.cols), 1, 1000);

  const spacingX = clamp(options.spacingXmm, 0, 1000);
  const spacingY = clamp(options.spacingYmm, 0, 1000);

  const template = extractTemplate(options.templateSvg);
  const ow = template.ornamentWidthMm;
  const oh = template.ornamentHeightMm;

  const gridW = cols * ow + (cols - 1) * spacingX;
  const gridH = rows * oh + (rows - 1) * spacingY;

  const offsetX = options.centerLayout ? (sheetW - gridW) / 2 : 0;
  const offsetY = options.centerLayout ? (sheetH - gridH) / 2 : 0;

  const safeOffsetX = Number.isFinite(offsetX) ? offsetX : 0;
  const safeOffsetY = Number.isFinite(offsetY) ? offsetY : 0;

  const outline = options.showSheetOutline
    ? `<rect x="0" y="0" width="${sheetW}" height="${sheetH}" fill="none" stroke="#000" stroke-width="0.2" />`
    : '';

  const instances: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = safeOffsetX + c * (ow + spacingX);
      const y = safeOffsetY + r * (oh + spacingY);
      const norm = `translate(${-template.minX} ${-template.minY})`;
      const scale = `scale(${template.scaleX} ${template.scaleY})`;
      instances.push(
        `<g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) ${scale} ${norm}">${template.inner}</g>`
      );
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}mm" height="${sheetH}mm" viewBox="0 0 ${sheetW} ${sheetH}">
  <title>${escapeXml('Ornament Layout')}</title>
  <g fill="none" stroke="none">${outline}</g>
  ${instances.join('\n  ')}
</svg>`;

  return svg;
}
