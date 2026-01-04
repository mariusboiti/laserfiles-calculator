/**
 * Test Card SVG Generator
 *
 * Generates an SVG calibration card as a power (rows) x speed (cols) grid
 * for laser calibration. The SVG is unit-agnostic so users can scale it
 * inside LightBurn or other software.
 */

import type { TestCardPatternType } from '../types';

export interface TestCardCell {
  rowIndex: number;
  colIndex: number;
  power: number; // percent
  speed: number; // arbitrary units (mm/s, mm/min, etc.)
}

export interface TestCardSvgOptions {
  materialName: string;
  thicknessMm?: number;
  dpi: number;
  rows: number;
  cols: number;
  cells: TestCardCell[];
  patternType?: TestCardPatternType;
  /** Logical cell width (SVG units, e.g. mm-like) */
  cellWidth?: number;
  /** Logical cell height (SVG units) */
  cellHeight?: number;
  /** Outer padding around the grid */
  padding?: number;
  /** Optional PNG data URL of the processed photo used for 'photoSample' pattern */
  photoSampleDataUrl?: string;
}

/**
 * Generate an SVG string for the given test card configuration.
 */
export function generateTestCardSvg(options: TestCardSvgOptions): string {
  const {
    materialName,
    thicknessMm,
    dpi,
    rows,
    cols,
    cells,
    patternType = 'gradientDetail',
    cellWidth = 20,
    cellHeight = 20,
    padding = 10,
    photoSampleDataUrl,
  } = options;

  const gridWidth = cols * cellWidth;
  const gridHeight = rows * cellHeight;

  const titleLines: string[] = [];
  const materialLabel = materialName.trim() || 'Material';
  titleLines.push(`Test Card - ${materialLabel}`);
  if (thicknessMm && !Number.isNaN(thicknessMm)) {
    titleLines.push(`${thicknessMm.toFixed(1)} mm`);
  }
  titleLines.push(`${dpi} DPI`);

  const titleHeight = 16; // space reserved for title text
  const totalWidth = gridWidth + padding * 2;
  const totalHeight = gridHeight + padding * 2 + titleHeight;

  const escapeText = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const cellRects: string[] = [];
  const clipDefs: string[] = [];
  const cellPatterns: string[] = [];
  const cellLabels: string[] = [];

  for (const cell of cells) {
    const x = padding + cell.colIndex * cellWidth;
    const y = padding + titleHeight + cell.rowIndex * cellHeight;

    // Cell rectangle (outer border)
    cellRects.push(
      `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" ` +
        `fill="none" stroke="#444" stroke-width="0.2" />`
    );

    // Patch area inside the cell where we draw the engraving pattern
    const innerPadding = cellWidth * 0.12;
    const patchX = x + innerPadding;
    const patchY = y + innerPadding;
    const patchWidth = cellWidth - innerPadding * 2;
    const patchHeight = cellHeight * 0.55; // top ~55% used for pattern, bottom for labels

    if (patternType === 'solid') {
      // Simple solid patch: full black block to test maximum coverage
      cellPatterns.push(
        `<rect x="${patchX}" y="${patchY}" width="${patchWidth}" height="${patchHeight}" ` +
          `fill="rgb(0,0,0)" fill-opacity="1" />`
      );
    } else if (patternType === 'photoSample' && photoSampleDataUrl) {
      // Photo sample pattern: embed a clipped PNG of the processed photo.
      const clipId = `clip_r${cell.rowIndex}_c${cell.colIndex}`;

      // Define clipPath so the image stays within the patch rectangle.
      clipDefs.push(
        `<clipPath id="${clipId}">` +
          `<rect x="${patchX}" y="${patchY}" width="${patchWidth}" height="${patchHeight}" rx="0.5" ry="0.5" />` +
        `</clipPath>`
      );

      // Draw embedded photo sample inside the clipped patch area.
      cellPatterns.push(
        `<image href="${photoSampleDataUrl}" x="${patchX}" y="${patchY}" ` +
          `width="${patchWidth}" height="${patchHeight}" preserveAspectRatio="xMidYMid slice" ` +
          `clip-path="url(#${clipId})" />`
      );

      // Optional subtle overlay lines and circle to test edges over the photo.
      const overlayStroke = 'rgb(0,0,0)';
      const overlayWidth = 0.16;

      const overlayTopY = patchY + patchHeight * 0.15;
      const overlayBottomY = patchY + patchHeight * 0.85;
      const overlayHorizontalLines = 3;
      for (let i = 0; i < overlayHorizontalLines; i++) {
        const t = i / (overlayHorizontalLines - 1 || 1);
        const yLine = overlayTopY + (overlayBottomY - overlayTopY) * t;
        cellPatterns.push(
          `<line x1="${patchX}" x2="${patchX + patchWidth}" y1="${yLine}" y2="${yLine}" ` +
            `stroke="${overlayStroke}" stroke-width="${overlayWidth}" stroke-opacity="0.55" />`
        );
      }

      const overlayVerticalLines = 2;
      for (let i = 1; i <= overlayVerticalLines; i++) {
        const t = i / (overlayVerticalLines + 1);
        const xLine = patchX + patchWidth * t;
        cellPatterns.push(
          `<line x1="${xLine}" x2="${xLine}" y1="${overlayTopY}" y2="${overlayBottomY}" ` +
            `stroke="${overlayStroke}" stroke-width="${overlayWidth}" stroke-opacity="0.55" />`
        );
      }

      const circleCxOverlay = patchX + patchWidth / 2;
      const circleCyOverlay = patchY + patchHeight * 0.5;
      const circleROverlay = Math.min(patchWidth, patchHeight) * 0.14;
      cellPatterns.push(
        `<circle cx="${circleCxOverlay}" cy="${circleCyOverlay}" r="${circleROverlay}" ` +
          `stroke="${overlayStroke}" stroke-width="${overlayWidth}" stroke-opacity="0.55" fill="none" />`
      );
    } else {
      // Gradient + details pattern for richer evaluation (default / fallback)

      // 1) Gradient bars - five vertical segments from light to dark
      const gradientHeight = patchHeight * 0.45;
      const barWidth = patchWidth / 5;
      const opacities = [0.2, 0.4, 0.6, 0.8, 1.0];
      for (let i = 0; i < 5; i++) {
        const barX = patchX + i * barWidth;
        const opacity = opacities[i];
        cellPatterns.push(
          `<rect x="${barX}" y="${patchY}" width="${barWidth}" height="${gradientHeight}" ` +
            `fill="rgb(0,0,0)" fill-opacity="${opacity.toFixed(2)}" />`
        );
      }

      // 2) Fine detail horizontal lines - test thin line engraving
      const detailTopY = patchY + gradientHeight + patchHeight * 0.08;
      const detailBottomY = patchY + patchHeight - patchHeight * 0.18;
      const horizontalLines = 4; // fixed count of horizontal fine-detail lines
      for (let i = 0; i < horizontalLines; i++) {
        const t = i / (horizontalLines - 1);
        const yLine = detailTopY + (detailBottomY - detailTopY) * t;
        cellPatterns.push(
          `<line x1="${patchX}" x2="${patchX + patchWidth}" y1="${yLine}" y2="${yLine}" ` +
            `stroke="rgb(0,0,0)" stroke-width="0.18" />`
        );
      }

      // 3) Fine detail vertical lines - form a small grid
      const verticalLines = 3;
      for (let i = 1; i <= verticalLines; i++) {
        const t = i / (verticalLines + 1);
        const xLine = patchX + patchWidth * t;
        cellPatterns.push(
          `<line x1="${xLine}" x2="${xLine}" y1="${detailTopY}" y2="${detailBottomY}" ` +
            `stroke="rgb(0,0,0)" stroke-width="0.18" />`
        );
      }

      // 4) Circle - tests curved detail rendering
      const circleCx = patchX + patchWidth / 2;
      const circleCy = patchY + patchHeight * 0.78;
      const circleR = Math.min(patchWidth, patchHeight) * 0.12;
      cellPatterns.push(
        `<circle cx="${circleCx}" cy="${circleCy}" r="${circleR}" ` +
          `stroke="rgb(0,0,0)" stroke-width="0.22" fill="none" />`
      );

      // 5) Tiny text "Aa" near the circle to test small text engraving
      const tinyTextY = circleCy + circleR + 1.5;
      cellPatterns.push(
        `<text x="${circleCx}" y="${tinyTextY}" text-anchor="middle" ` +
          `font-size="3" fill="#ffffff">Aa</text>`
      );
    }

    // Labels inside each cell (two lines: P and S) placed below the patch area
    const labelX = x + cellWidth / 2;
    const labelY = patchY + patchHeight + innerPadding * 0.9;
    const powerText = `P: ${cell.power.toFixed(0)}%`;
    const speedText = `S: ${cell.speed.toFixed(0)}`;

    cellLabels.push(
      `<text x="${labelX}" y="${labelY}" text-anchor="middle" ` +
        `font-size="3.2" fill="#ffffff">${escapeText(powerText)}</text>`
    );
    cellLabels.push(
      `<text x="${labelX}" y="${labelY + 5}" text-anchor="middle" ` +
        `font-size="3.2" fill="#9ca3af">${escapeText(speedText)}</text>`
    );
  }

  const titleTextSvg = titleLines
    .map((line, index) => {
      const y = padding + 4 + index * 5;
      return `<text x="${totalWidth / 2}" y="${y}" text-anchor="middle" ` +
        `font-size="4" fill="#ffffff">${escapeText(line)}</text>`;
    })
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">\n` +
    `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="#111827" />\n` +
    (clipDefs.length
      ? `<defs>\n${clipDefs.join('\n')}\n</defs>\n`
      : '') +
    `${titleTextSvg}\n` +
    `<g>\n${cellRects.join('\n')}\n</g>\n` +
    `<g>\n${cellPatterns.join('\n')}\n</g>\n` +
    `<g>\n${cellLabels.join('\n')}\n</g>\n` +
    `</svg>`;

  return svg;
}
