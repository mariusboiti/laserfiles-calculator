/**
 * Keychain Hub - Export Builder
 * Multi-layer SVG generation with cut/engrave separation
 */

import { mm } from './geometry';

export interface ExportOptions {
  width: number;
  height: number;
  cutStroke: number;
  includeGuides: boolean;
}

export interface LayerContent {
  cut: string;
  engrave: string;
  guides?: string;
}

/**
 * Build combined SVG with separate cut and engrave layers
 */
export function buildCombinedSvg(
  layers: LayerContent,
  options: ExportOptions
): string {
  const { width, height } = options;

  let content = '';

  // Cut layer
  if (layers.cut) {
    content += `\n  <g id="CUT" fill="none" stroke="#000" stroke-width="${options.cutStroke}">
    ${layers.cut}
  </g>`;
  }

  // Engrave layer
  if (layers.engrave) {
    content += `\n  <g id="ENGRAVE">
    ${layers.engrave}
  </g>`;
  }

  // Guides (preview only)
  if (options.includeGuides && layers.guides) {
    content += `\n  <g id="GUIDES" opacity="0.3">
    ${layers.guides}
  </g>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(width)}mm" height="${mm(height)}mm" viewBox="0 0 ${mm(width)} ${mm(height)}">
  ${content}
</svg>`;
}

/**
 * Build cut-only SVG
 */
export function buildCutOnlySvg(
  cutContent: string,
  options: ExportOptions
): string {
  const { width, height, cutStroke } = options;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(width)}mm" height="${mm(height)}mm" viewBox="0 0 ${mm(width)} ${mm(height)}">
  <g id="CUT" fill="none" stroke="#000" stroke-width="${cutStroke}">
    ${cutContent}
  </g>
</svg>`;
}

/**
 * Build engrave-only SVG
 */
export function buildEngraveOnlySvg(
  engraveContent: string,
  options: ExportOptions
): string {
  const { width, height } = options;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(width)}mm" height="${mm(height)}mm" viewBox="0 0 ${mm(width)} ${mm(height)}">
  <g id="ENGRAVE">
    ${engraveContent}
  </g>
</svg>`;
}

/**
 * Generate hole SVG element (for cut layer)
 */
export function holeElement(cx: number, cy: number, radius: number): string {
  return `<circle cx="${mm(cx)}" cy="${mm(cy)}" r="${mm(radius)}" />`;
}

/**
 * Generate text element (for engrave layer)
 */
export function textElement(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number | string,
  align: 'start' | 'middle' | 'end' = 'middle',
  fill: boolean = true,
  strokeWidth: number = 0
): string {
  const escapedText = escapeXml(text);
  const textAnchor = align;
  
  let style = '';
  if (fill && strokeWidth > 0) {
    style = `fill="#000" stroke="#000" stroke-width="${strokeWidth}"`;
  } else if (fill) {
    style = 'fill="#000" stroke="none"';
  } else {
    style = `fill="none" stroke="#000" stroke-width="${strokeWidth}"`;
  }

  return `<text x="${mm(x)}" y="${mm(y)}" font-family="${fontFamily}, Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}" dominant-baseline="middle" ${style}>${escapedText}</text>`;
}

/**
 * Generate path element (for cut or engrave layer)
 */
export function pathElement(
  d: string,
  isCut: boolean = true,
  strokeWidth: number = 0.001
): string {
  if (isCut) {
    return `<path d="${d}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
  }
  return `<path d="${d}" fill="#000" stroke="none" />`;
}

/**
 * Escape XML special characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) || 'keychain';
}

/**
 * Generate filename base
 */
export function generateFilenameBase(
  mode: string,
  name: string,
  height: number
): string {
  const slug = sanitizeFilename(name);
  return `keychain-${mode}-${slug}-${height}h`;
}

/**
 * Generate grid overlay (for preview only)
 */
export function gridOverlay(width: number, height: number, step: number = 10): string {
  let grid = '';
  for (let x = 0; x <= width; x += step) {
    grid += `<line x1="${mm(x)}" y1="0" x2="${mm(x)}" y2="${mm(height)}" stroke="#ccc" stroke-width="0.1" />`;
  }
  for (let y = 0; y <= height; y += step) {
    grid += `<line x1="0" y1="${mm(y)}" x2="${mm(width)}" y2="${mm(y)}" stroke="#ccc" stroke-width="0.1" />`;
  }
  return grid;
}

/**
 * Generate safe zone overlay (for preview only)
 */
export function safeZoneOverlay(
  x: number,
  y: number,
  width: number,
  height: number
): string {
  return `<rect x="${mm(x)}" y="${mm(y)}" width="${mm(width)}" height="${mm(height)}" fill="none" stroke="#00ff00" stroke-width="0.2" stroke-dasharray="2,2" />`;
}

/**
 * Generate hole guide overlay (for preview only)
 */
export function holeGuideOverlay(cx: number, cy: number, radius: number): string {
  return `<circle cx="${mm(cx)}" cy="${mm(cy)}" r="${mm(radius + 2)}" fill="none" stroke="#ff0000" stroke-width="0.2" stroke-dasharray="1,1" />`;
}

/**
 * Download SVG as file
 */
export function downloadSvg(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
