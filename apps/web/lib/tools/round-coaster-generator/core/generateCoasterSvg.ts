import type { CoasterOptions, CoasterShape } from '../types/coaster';

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
  return text.length * fontSizeMm * 0.6;
}

function fitFontSizeMm(text: string, baseSizeMm: number, maxWidthMm: number, minSizeMm: number) {
  if (!text) return baseSizeMm;
  let size = baseSizeMm;
  while (size > minSizeMm && estimateTextWidthMm(text, size) > maxWidthMm) {
    size -= 0.25;
  }
  return clamp(size, minSizeMm, baseSizeMm);
}

function getDimensionsMm(shape: CoasterShape, widthMm: number, heightMm?: number) {
  if (shape === 'shield') {
    return {
      w: widthMm,
      h: heightMm ?? Math.max(10, Math.round(widthMm * 1.15)),
    };
  }

  if (shape === 'hexagon') {
    const r = widthMm / 2;
    const h = Math.sqrt(3) * r;
    return { w: widthMm, h };
  }

  return { w: widthMm, h: widthMm };
}

function hexPointsFlatTop(w: number, h: number) {
  const r = w / 2;
  const cx = w / 2;
  const cy = h / 2;

  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return points.join(' ');
}

function shieldPath(w: number, h: number) {
  const r = w / 2;
  const topCurve = Math.min(r, h * 0.45);
  const sideY = h * 0.66;

  // Start at left, draw top arc, then down to a pointed bottom.
  return [
    `M 0 ${topCurve.toFixed(3)}`,
    `A ${r.toFixed(3)} ${topCurve.toFixed(3)} 0 0 0 ${w.toFixed(3)} ${topCurve.toFixed(3)}`,
    `L ${w.toFixed(3)} ${sideY.toFixed(3)}`,
    `L ${(w / 2).toFixed(3)} ${h.toFixed(3)}`,
    `L 0 ${sideY.toFixed(3)}`,
    'Z',
  ].join(' ');
}

export function generateCoasterSvg(options: CoasterOptions): string {
  const shape = options.shape;
  const dims = getDimensionsMm(shape, options.widthMm, options.heightMm);
  const w = dims.w;
  const h = dims.h;

  const padding = 3;
  const maxTextWidth = Math.max(10, w - padding * 2 - (options.doubleBorder ? 2 : 0));

  const topText = (options.textTop ?? '').trim();
  const centerText = (options.textCenter ?? '').trim();
  const bottomText = (options.textBottom ?? '').trim();

  const baseCenter = options.fontSizeMm && !options.autoFontSize ? options.fontSizeMm : 7;
  const baseTop = baseCenter * 0.6;
  const baseBottom = baseCenter * 0.45;

  const centerFont = options.autoFontSize
    ? fitFontSizeMm(centerText, 7, maxTextWidth, 3.5)
    : clamp(baseCenter, 3.5, 12);
  const topFont = options.autoFontSize
    ? fitFontSizeMm(topText, 4, maxTextWidth, 2.5)
    : clamp(baseTop, 2, 9);
  const bottomFont = options.autoFontSize
    ? fitFontSizeMm(bottomText, 3, maxTextWidth, 2)
    : clamp(baseBottom, 1.8, 8);

  const outlineStroke = 0.25;
  const inset = 1.2;

  let shapeMarkup = '';
  let innerMarkup = '';

  if (options.showBorder) {
    if (shape === 'circle') {
      const r = Math.min(w, h) / 2 - outlineStroke / 2;
      shapeMarkup = `<circle cx="${(w / 2).toFixed(3)}" cy="${(h / 2).toFixed(3)}" r="${r.toFixed(3)}" fill="none" stroke="#000" stroke-width="${outlineStroke}" />`;

      if (options.doubleBorder) {
        const r2 = r - inset;
        if (r2 > 0) {
          innerMarkup = `<circle cx="${(w / 2).toFixed(3)}" cy="${(h / 2).toFixed(3)}" r="${r2.toFixed(3)}" fill="none" stroke="#000" stroke-width="${outlineStroke}" />`;
        }
      }
    }

    if (shape === 'hexagon') {
      shapeMarkup = `<polygon points="${hexPointsFlatTop(w, h)}" fill="none" stroke="#000" stroke-width="${outlineStroke}" />`;

      if (options.doubleBorder) {
        const w2 = Math.max(1, w - inset * 2);
        const r = w / 2;
        const h2 = Math.sqrt(3) * (w2 / 2);
        const dx = (w - w2) / 2;
        const dy = (h - h2) / 2;
        innerMarkup = `<polygon points="${hexPointsFlatTop(w2, h2)}" transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)})" fill="none" stroke="#000" stroke-width="${outlineStroke}" />`;
      }
    }

    if (shape === 'shield') {
      shapeMarkup = `<path d="${shieldPath(w, h)}" fill="none" stroke="#000" stroke-width="${outlineStroke}" />`;

      if (options.doubleBorder) {
        const w2 = Math.max(1, w - inset * 2);
        const h2 = Math.max(1, h - inset * 2);
        innerMarkup = `<path d="${shieldPath(w2, h2)}" transform="translate(${inset.toFixed(3)} ${inset.toFixed(3)})" fill="none" stroke="#000" stroke-width="${outlineStroke}" />`;
      }
    }
  }

  const topY = h * 0.28;
  const centerY = h * 0.52;
  const bottomY = h * 0.78;

  const topTextMarkup = topText
    ? `<text x="${(w / 2).toFixed(3)}" y="${topY.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${topFont.toFixed(3)}" font-weight="400">${escapeXml(topText)}</text>`
    : '';

  const centerTextMarkup = centerText
    ? `<text x="${(w / 2).toFixed(3)}" y="${centerY.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${centerFont.toFixed(3)}" font-weight="700">${escapeXml(centerText)}</text>`
    : '';

  const bottomTextMarkup = bottomText
    ? `<text x="${(w / 2).toFixed(3)}" y="${bottomY.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${bottomFont.toFixed(3)}" font-weight="400">${escapeXml(bottomText)}</text>`
    : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  <g fill="none" stroke="none">
    ${shapeMarkup}
    ${innerMarkup}
  </g>

  <g fill="#000" font-family="Arial, sans-serif" text-rendering="geometricPrecision">
    ${topTextMarkup}
    ${centerTextMarkup}
    ${bottomTextMarkup}
  </g>
</svg>`;

  return svg;
}
