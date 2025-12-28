import type { TestCardCell } from './generateTestCardSvg';

/**
 * Configuration for generating a raster (PNG) version of the Test Card
 * when using the "photoSample" pattern. Dimensions are expressed in mm
 * so we can convert to pixels using DPI.
 */
export interface PhotoSampleTestCardConfig {
  materialName: string;
  thicknessMm?: number;
  dpi: number;
  rows: number;
  cols: number;
  cells: TestCardCell[];
  // Logical cell and layout dimensions in millimetres (must match SVG layout)
  cellWidthMm: number;
  cellHeightMm: number;
  paddingMm: number;
  titleHeightMm: number;
}

/**
 * Generate a PNG blob containing a full Test Card grid using the current
 * processed photo as the patch inside each cell. This is used instead of
 * SVG for LightBurn, which does not reliably import embedded images.
 */
export async function generatePhotoSampleTestCardPng(
  cfg: PhotoSampleTestCardConfig,
  source: HTMLCanvasElement | ImageData
): Promise<Blob | null> {
  const pxPerMm = cfg.dpi / 25.4; // Convert physical mm to device pixels

  const cardWidthMm = cfg.cols * cfg.cellWidthMm + cfg.paddingMm * 2;
  const cardHeightMm =
    cfg.rows * cfg.cellHeightMm + cfg.paddingMm * 2 + cfg.titleHeightMm;

  const widthPx = Math.max(1, Math.round(cardWidthMm * pxPerMm));
  const heightPx = Math.max(1, Math.round(cardHeightMm * pxPerMm));

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Light background so the exported PNG is easy to see in LightBurn
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  ctx.imageSmoothingEnabled = true;
  // imageSmoothingQuality is not available in all lib dom types, so access via any.
  (ctx as any).imageSmoothingQuality = 'high';

  const paddingPx = cfg.paddingMm * pxPerMm;
  const cellWidthPx = cfg.cellWidthMm * pxPerMm;
  const cellHeightPx = cfg.cellHeightMm * pxPerMm;
  const titleHeightPx = cfg.titleHeightMm * pxPerMm;

  // Title/header text at the top, similar to the SVG generator
  const titleLines: string[] = [];
  const materialLabel = cfg.materialName.trim() || 'Material';
  titleLines.push(`Test Card - ${materialLabel}`);
  if (typeof cfg.thicknessMm === 'number' && !Number.isNaN(cfg.thicknessMm)) {
    titleLines.push(`${cfg.thicknessMm.toFixed(1)} mm`);
  }
  titleLines.push(`${cfg.dpi} DPI`);

  const centerX = widthPx / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const titleFontSizePx = 4 * pxPerMm;
  ctx.font = `${titleFontSizePx}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillStyle = '#111827';

  titleLines.forEach((line, index) => {
    const y = paddingPx + 4 * pxPerMm + index * 5 * pxPerMm;
    ctx.fillText(line, centerX, y);
  });

  // Prepare a canvas from the source photo once; reused for each cell
  let sourceCanvas: HTMLCanvasElement;
  if (source instanceof HTMLCanvasElement) {
    sourceCanvas = source;
  } else {
    sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = source.width;
    sourceCanvas.height = source.height;
    const sctx = sourceCanvas.getContext('2d');
    if (!sctx) return null;
    sctx.putImageData(source, 0, 0);
  }

  // Outer cell borders
  ctx.strokeStyle = '#444444';
  ctx.lineWidth = Math.max(0.4, 0.4 * pxPerMm);

  for (const cell of cfg.cells) {
    const x = paddingPx + cell.colIndex * cellWidthPx;
    const y = paddingPx + titleHeightPx + cell.rowIndex * cellHeightPx;

    // Cell border
    ctx.strokeRect(x, y, cellWidthPx, cellHeightPx);

    // Patch area inside the cell where we draw the photo sample
    const innerPaddingPx = cellWidthPx * 0.12;
    const patchX = x + innerPaddingPx;
    const patchY = y + innerPaddingPx;
    const patchWidth = cellWidthPx - innerPaddingPx * 2;
    const patchHeight = cellHeightPx * 0.55; // top ~55% used for pattern, bottom for labels

    // Clip to patch rectangle so the photo stays inside it
    ctx.save();
    ctx.beginPath();
    ctx.rect(patchX, patchY, patchWidth, patchHeight);
    ctx.clip();

    // Draw the same photo sample into every cell, scaled to the patch area
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      patchX,
      patchY,
      patchWidth,
      patchHeight
    );

    ctx.restore();

    // Subtle overlay lines and circle to test edges over the photo
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = Math.max(0.16 * pxPerMm, 0.4);

    const overlayTopY = patchY + patchHeight * 0.15;
    const overlayBottomY = patchY + patchHeight * 0.85;

    const overlayHorizontalLines = 3;
    for (let i = 0; i < overlayHorizontalLines; i++) {
      const t = i / (overlayHorizontalLines - 1);
      const yLine = overlayTopY + (overlayBottomY - overlayTopY) * t;
      ctx.beginPath();
      ctx.moveTo(patchX, yLine);
      ctx.lineTo(patchX + patchWidth, yLine);
      ctx.stroke();
    }

    const overlayVerticalLines = 2;
    for (let i = 1; i <= overlayVerticalLines; i++) {
      const t = i / (overlayVerticalLines + 1);
      const xLine = patchX + patchWidth * t;
      ctx.beginPath();
      ctx.moveTo(xLine, overlayTopY);
      ctx.lineTo(xLine, overlayBottomY);
      ctx.stroke();
    }

    const circleROverlay = Math.min(patchWidth, patchHeight) * 0.14;
    const circleCxOverlay = patchX + patchWidth / 2;
    const circleCyOverlay = patchY + patchHeight * 0.5;
    ctx.beginPath();
    ctx.arc(circleCxOverlay, circleCyOverlay, circleROverlay, 0, Math.PI * 2);
    ctx.stroke();

    // Labels below the patch: power and speed
    const labelX = x + cellWidthPx / 2;
    const labelY = patchY + patchHeight + innerPaddingPx * 0.9;
    const labelFontSizePx = 3.2 * pxPerMm;
    const labelLineGap = 5 * pxPerMm;

    ctx.font = `${labelFontSizePx}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const powerText = `P: ${cell.power.toFixed(0)}%`;
    const speedText = `S: ${cell.speed.toFixed(0)}`;

    ctx.fillStyle = '#111827';
    ctx.fillText(powerText, labelX, labelY);
    ctx.fillStyle = '#4b5563';
    ctx.fillText(speedText, labelX, labelY + labelLineGap);
  }

  return await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
