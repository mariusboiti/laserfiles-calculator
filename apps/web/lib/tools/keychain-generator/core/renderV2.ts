/**
 * Keychain Generator V2 - SVG Rendering
 * Supports cut/engrave layers, multi-export
 */

import type { KeychainConfigV2, ExportType, ExportResult, HoleGeometry, TextRegion } from '../types/keychainV2';
import { computeHoleGeometry, calculateTextRegion, generateHoleSvgElements } from './holeLayout';
import { calculateFittedFontSize, calculateTextYPositions } from './textFitV2';
import { escapeXml } from './textMeasure';
import { roundedRectPath, capsulePath, dogTagPath, circleAttrs, hexagonPoints } from './shapeMath';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Generate shape outline path/element
 */
function generateShapeElement(config: KeychainConfigV2, strokeWidth: number): string {
  const { shape, width, height, cornerRadius, customShape } = config;

  if (shape === 'custom' && customShape.enabled && customShape.svgPath) {
    return `<path d="${customShape.svgPath}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
  }

  switch (shape) {
    case 'rounded-rectangle':
      return `<path d="${roundedRectPath(width, height, cornerRadius)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    case 'capsule':
      return `<path d="${capsulePath(width, height)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    case 'dog-tag':
      return `<path d="${dogTagPath(width, height, cornerRadius)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    case 'circle': {
      const d = Math.max(width, height);
      const { cx, cy, r } = circleAttrs(d);
      return `<circle cx="${mm(cx)}" cy="${mm(cy)}" r="${mm(r)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    }
    case 'hexagon':
      return `<polygon points="${hexagonPoints(width, height)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
    default:
      return `<path d="${roundedRectPath(width, height, cornerRadius)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
  }
}

/**
 * Generate text element(s)
 */
function generateTextElements(
  config: KeychainConfigV2,
  region: TextRegion,
  fontSize: number
): string {
  const { text, render } = config;
  const { mode, text: line1, text2: line2, align, fontFamily, weight, lineGap } = text;
  const { engraveStyle, engraveStroke } = render;

  if (!line1.trim()) return '';

  const hasLine2 = mode === 'double' && line2.trim().length > 0;
  const yPositions = calculateTextYPositions(region.centerY, fontSize, mode, lineGap, hasLine2);

  // Style attributes based on engraveStyle
  let styleAttrs = '';
  switch (engraveStyle) {
    case 'fill':
      styleAttrs = 'fill="#000" stroke="none"';
      break;
    case 'stroke':
      styleAttrs = `fill="none" stroke="#000" stroke-width="${engraveStroke}"`;
      break;
    case 'fill+stroke':
      styleAttrs = `fill="#000" stroke="#000" stroke-width="${engraveStroke}"`;
      break;
  }

  const textAnchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
  const x = align === 'left' ? region.x : align === 'right' ? region.x + region.width : region.centerX;

  let elements = `<text x="${mm(x)}" y="${mm(yPositions.y1)}" font-family="${fontFamily}, Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" text-anchor="${textAnchor}" dominant-baseline="middle" ${styleAttrs}>${escapeXml(line1)}</text>`;

  if (hasLine2 && yPositions.y2 !== undefined) {
    elements += `\n    <text x="${mm(x)}" y="${mm(yPositions.y2)}" font-family="${fontFamily}, Arial, sans-serif" font-size="${fontSize}" font-weight="${weight}" text-anchor="${textAnchor}" dominant-baseline="middle" ${styleAttrs}>${escapeXml(line2)}</text>`;
  }

  return elements;
}

/**
 * Generate border element if enabled
 */
function generateBorder(config: KeychainConfigV2): string {
  if (!config.border) return '';

  const { width, height, cornerRadius, borderWidth } = config;
  const inset = borderWidth / 2 + 1;

  const innerPath = roundedRectPath(width - inset * 2, height - inset * 2, Math.max(0, cornerRadius - inset));

  return `<g transform="translate(${mm(inset)}, ${mm(inset)})">
    <path d="${innerPath}" fill="none" stroke="#000" stroke-width="${config.render.engraveStroke}" />
  </g>`;
}

/**
 * Generate safe zone overlay (preview only)
 */
function generateSafeZoneOverlay(region: TextRegion, holes: HoleGeometry[]): string {
  let overlay = `<rect x="${mm(region.x)}" y="${mm(region.y)}" width="${mm(region.width)}" height="${mm(region.height)}" fill="none" stroke="#00ff00" stroke-width="0.2" stroke-dasharray="2,2" opacity="0.5" />`;

  for (const hole of holes) {
    const safeR = hole.rx + 3;
    overlay += `\n  <circle cx="${mm(hole.cx)}" cy="${mm(hole.cy)}" r="${mm(safeR)}" fill="none" stroke="#ff0000" stroke-width="0.2" stroke-dasharray="1,1" opacity="0.3" />`;
  }

  return overlay;
}

/**
 * Generate hatch preview overlay (preview only)
 */
function generateHatchOverlay(region: TextRegion): string {
  const patternId = `hatch-${Date.now()}`;
  return `<defs>
    <pattern id="${patternId}" patternUnits="userSpaceOnUse" width="3" height="3">
      <line x1="0" y1="0" x2="3" y2="3" stroke="#000" stroke-width="0.3" />
    </pattern>
  </defs>
  <rect x="${mm(region.x)}" y="${mm(region.y)}" width="${mm(region.width)}" height="${mm(region.height)}" fill="url(#${patternId})" opacity="0.15" />`;
}

/**
 * Get viewBox dimensions
 */
function getViewBox(config: KeychainConfigV2): { width: number; height: number } {
  const { shape, width, height } = config;

  if (shape === 'circle') {
    const d = Math.max(width, height);
    return { width: d, height: d };
  }
  if (shape === 'dog-tag') {
    return { width, height: height + height * 0.1 };
  }
  return { width, height };
}

/**
 * Render complete SVG for preview
 */
export function renderPreviewSvg(config: KeychainConfigV2): string {
  const viewBox = getViewBox(config);
  const holes = computeHoleGeometry(config.hole, config.width, config.height);
  const textRegion = calculateTextRegion(config.width, config.height, config.padding, holes, config.hole.position, config.hole.margin);

  const style = { fontFamily: config.text.fontFamily, fontWeight: config.text.weight };
  const fontSize = config.text.autoFit
    ? calculateFittedFontSize(config.text.text, config.text.text2, config.text.mode, textRegion, config.text.lineGap, config.text.fontMin, config.text.fontMax, style)
    : config.text.fontMax;

  let content = '';

  // Grid (preview only)
  if (config.preview.showGrid) {
    content += generateGrid(viewBox.width, viewBox.height);
  }

  // Safe zones (preview only)
  if (config.preview.showSafeZones) {
    content += `\n  <!-- Safe Zones -->\n  ${generateSafeZoneOverlay(textRegion, holes)}`;
  }

  // Cut layer
  if (config.render.mode !== 'engrave-only') {
    content += `\n  <g id="CUT" stroke="#000" fill="none" stroke-width="${config.render.cutStroke}">`;
    content += `\n    ${generateShapeElement(config, config.render.cutStroke)}`;
    if (holes.length > 0) {
      content += `\n    ${generateHoleSvgElements(holes, config.render.cutStroke)}`;
    }
    content += `\n  </g>`;
  }

  // Engrave layer
  if (config.render.mode !== 'cut-only') {
    content += `\n  <g id="ENGRAVE">`;
    content += `\n    ${generateTextElements(config, textRegion, fontSize)}`;
    if (config.border) {
      content += `\n    ${generateBorder(config)}`;
    }
    content += `\n  </g>`;
  }

  // Hatch preview (preview only)
  if (config.preview.showHatchPreview && config.render.mode !== 'cut-only' && config.render.engraveStyle.includes('fill')) {
    content += `\n  <!-- Hatch Preview -->\n  ${generateHatchOverlay(textRegion)}`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(viewBox.width)}mm" height="${mm(viewBox.height)}mm" viewBox="0 0 ${mm(viewBox.width)} ${mm(viewBox.height)}">
  ${content}
</svg>`;
}

function generateGrid(width: number, height: number): string {
  let grid = '\n  <!-- Grid -->\n  <g stroke="#ccc" stroke-width="0.05" opacity="0.3">';
  for (let x = 0; x <= width; x += 10) {
    grid += `\n    <line x1="${mm(x)}" y1="0" x2="${mm(x)}" y2="${mm(height)}" />`;
  }
  for (let y = 0; y <= height; y += 10) {
    grid += `\n    <line x1="0" y1="${mm(y)}" x2="${mm(width)}" y2="${mm(y)}" />`;
  }
  grid += '\n  </g>';
  return grid;
}

/**
 * Render SVG for export (no guides/overlays)
 */
export function renderExportSvg(config: KeychainConfigV2, exportType: ExportType): ExportResult {
  const cleanConfig = {
    ...config,
    preview: { showSafeZones: false, showHatchPreview: false, showGrid: false },
    render: {
      ...config.render,
      mode: exportType === 'cut' ? 'cut-only' as const : exportType === 'engrave' ? 'engrave-only' as const : config.render.mode,
    },
  };

  const svg = renderPreviewSvg(cleanConfig);
  const filename = generateFilename(config, exportType);

  return { svg, filename, type: exportType };
}

/**
 * Generate filename for export
 */
export function generateFilename(config: KeychainConfigV2, exportType: ExportType): string {
  const text = config.text.text.trim();
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) || 'keychain';

  const suffix = exportType === 'combined' ? '' : `-${exportType}`;

  return `keychain-${config.shape}-${slug}-${config.width}x${config.height}${suffix}.svg`;
}

/**
 * Render batch sheet SVG
 */
export function renderBatchSvg(config: KeychainConfigV2, names: string[]): string {
  const { batch, width, height } = config;
  const { sheetWidth, sheetHeight, margin, spacing } = batch;

  const singleWidth = width + spacing;
  const singleHeight = height + spacing;

  const cols = Math.floor((sheetWidth - margin * 2) / singleWidth);
  const rows = Math.floor((sheetHeight - margin * 2) / singleHeight);

  let content = '';
  let index = 0;

  for (let row = 0; row < rows && index < names.length; row++) {
    for (let col = 0; col < cols && index < names.length; col++) {
      const x = margin + col * singleWidth;
      const y = margin + row * singleHeight;
      const name = names[index++];

      const singleConfig = {
        ...config,
        text: { ...config.text, text: name },
        preview: { showSafeZones: false, showHatchPreview: false, showGrid: false },
      };

      const singleSvg = renderPreviewSvg(singleConfig)
        .replace(/^<\?xml[^>]*\?>\s*/i, '')
        .replace(/<svg[^>]*>/, '')
        .replace(/<\/svg>\s*$/, '');

      content += `\n  <g transform="translate(${mm(x)}, ${mm(y)})">${singleSvg}</g>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(sheetWidth)}mm" height="${mm(sheetHeight)}mm" viewBox="0 0 ${mm(sheetWidth)} ${mm(sheetHeight)}">
  <!-- Batch: ${names.length} keychains -->
  ${content}
</svg>`;
}
