import type { JigOptions } from '../types/jig';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type JigMeta = {
  gridWidthMm: number;
  gridHeightMm: number;
};

export function generateJigSvg(options: JigOptions): { svg: string; meta: JigMeta } {
  const bedW = clamp(options.bedWidthMm, 1, 10000);
  const bedH = clamp(options.bedHeightMm, 1, 10000);

  const objW = clamp(options.objectWidthMm, 0.1, bedW);
  const objH = clamp(options.objectHeightMm, 0.1, bedH);

  const rows = clamp(Math.floor(options.rows), 1, 500);
  const cols = clamp(Math.floor(options.cols), 1, 500);

  const spacingX = clamp(options.spacingXmm, 0, 1000);
  const spacingY = clamp(options.spacingYmm, 0, 1000);
  const margin = clamp(options.marginMm, 0, 1000);

  const gridW = cols * objW + (cols - 1) * spacingX;
  const gridH = rows * objH + (rows - 1) * spacingY;

  const baseX = options.centerLayout ? (bedW - gridW) / 2 : margin;
  const baseY = options.centerLayout ? (bedH - gridH) / 2 : margin;

  const startX = Number.isFinite(baseX) ? baseX : margin;
  const startY = Number.isFinite(baseY) ? baseY : margin;

  const outline = options.showBedOutline
    ? `<rect x="0" y="0" width="${bedW}" height="${bedH}" fill="none" stroke="#000" stroke-width="0.2" />`
    : '';

  const cutStroke = 'stroke="#000" stroke-width="0.2" fill="none"';
  const engraveStroke = 'stroke="#000" stroke-width="0.1" fill="none" stroke-dasharray="1 1"';

  const holes: string[] = [];
  const guides: string[] = [];
  const numbers: string[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (objW + spacingX);
      const y = startY + r * (objH + spacingY);

      if (options.objectShape === 'rect') {
        if (options.cutHoles) {
          holes.push(`<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${objW.toFixed(3)}" height="${objH.toFixed(3)}" ${cutStroke} />`);
        }
        if (options.engraveOutline) {
          guides.push(`<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${objW.toFixed(3)}" height="${objH.toFixed(3)}" ${engraveStroke} />`);
        }
      } else {
        const cx = x + objW / 2;
        const cy = y + objH / 2;
        const rad = Math.min(objW, objH) / 2;
        if (options.cutHoles) {
          holes.push(`<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${rad.toFixed(3)}" ${cutStroke} />`);
        }
        if (options.engraveOutline) {
          guides.push(`<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${rad.toFixed(3)}" ${engraveStroke} />`);
        }
      }

      if (options.showNumbers) {
        const idx = r * cols + c + 1;
        const tx = x + objW / 2;
        const ty = y + objH / 2;
        numbers.push(
          `<text x="${tx.toFixed(3)}" y="${ty.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="3" fill="#000">${idx}</text>`
        );
      }
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bedW}mm" height="${bedH}mm" viewBox="0 0 ${bedW} ${bedH}">
  <g fill="none" stroke="none">${outline}</g>
  ${holes.join('\n  ')}
  ${guides.join('\n  ')}
  ${numbers.join('\n  ')}
</svg>`;

  return { svg, meta: { gridWidthMm: gridW, gridHeightMm: gridH } };
}
