import QRCode from 'qrcode';
import type { LabelOptions } from '../types/label';

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

function estimateTextWidthMm(text: string, fontSizeMm: number) {
  return text.length * fontSizeMm * 0.55;
}

function fitFontSizeMm(text: string, baseSizeMm: number, maxWidthMm: number, minSizeMm: number) {
  if (!text) return baseSizeMm;
  let size = baseSizeMm;
  while (size > minSizeMm && estimateTextWidthMm(text, size) > maxWidthMm) {
    size -= 0.25;
  }
  return clamp(size, minSizeMm, baseSizeMm);
}

function buildQrRects(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });

  // qrcode exposes `modules` as a matrix-like structure.
  // We only output dark modules as <rect> for a pure vector engraving-friendly result.
  const size = qr.modules.size;
  const data = qr.modules.data;

  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      if (data[idx]) {
        rects += `<rect x="${x}" y="${y}" width="1" height="1" />`;
      }
    }
  }

  return {
    size,
    rects,
  };
}

export function generateLabelSvg(options: LabelOptions): string {
  const widthMm = options.widthMm;
  const heightMm = options.heightMm;

  const padding = 2;
  const cornerRadius = options.rounded ? 2 : 0;

  const hasQr = Boolean(options.qrText && options.qrText.trim().length > 0);
  const showQr = hasQr;

  const qrSizeMm = showQr ? clamp(Math.min(heightMm - padding * 2, widthMm * 0.33, 18), 8, 24) : 0;
  const qrX = widthMm - padding - qrSizeMm;
  const qrY = heightMm - padding - qrSizeMm;

  const rightLimit = showQr ? qrX - 1.5 : widthMm - padding;
  const maxTextWidth = Math.max(10, rightLimit - padding);

  const productName = options.productName ?? '';
  const sku = options.sku ?? '';
  const price = options.price ?? '';

  const productFont = fitFontSizeMm(productName, 4, maxTextWidth, 2.5);
  const skuFont = fitFontSizeMm(sku, 5, maxTextWidth, 3);
  const priceFont = fitFontSizeMm(price, 3, maxTextWidth, 2);

  const productY = 7;
  const skuY = heightMm / 2;
  const priceY = heightMm - 5;

  let qrMarkup = '';
  if (showQr) {
    const { size, rects } = buildQrRects(options.qrText!.trim());
    const scale = qrSizeMm / size;

    qrMarkup = `\n  <g fill=\"#000\" transform=\"translate(${qrX.toFixed(3)} ${qrY.toFixed(3)}) scale(${scale.toFixed(6)})\">${rects}</g>`;
  }

  const border = options.showBorder
    ? `\n    <rect x="0" y="0" width="${widthMm}" height="${heightMm}" rx="${cornerRadius}" ry="${cornerRadius}" fill="none" stroke="#000" stroke-width="0.2" />`
    : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">
  <g fill="none" stroke="none">${border}
  </g>

  <g fill="#000" font-family="Arial, sans-serif" text-rendering="geometricPrecision">
    <text x="${padding}" y="${productY}" font-size="${productFont}" font-weight="400" dominant-baseline="middle">${escapeXml(productName)}</text>
    <text x="${padding}" y="${skuY}" font-size="${skuFont}" font-weight="700" dominant-baseline="middle">${escapeXml(sku)}</text>
    ${price ? `<text x="${padding}" y="${priceY}" font-size="${priceFont}" font-weight="400" dominant-baseline="middle">${escapeXml(price)}</text>` : ''}
  </g>${qrMarkup}
</svg>`;

  return svg;
}
