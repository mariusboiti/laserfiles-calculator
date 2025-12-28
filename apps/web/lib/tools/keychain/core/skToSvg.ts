/**
 * SkPath to SVG conversion utilities
 */

import type { CanvasKit, Path } from 'canvaskit-wasm';

/**
 * Convert SkPath to SVG path d attribute string
 */
export function pathToSvgD(path: Path): string {
  if (!path) return '';
  
  try {
    // CanvasKit Path has toSVGString() method
    const svgString = path.toSVGString();
    return svgString || '';
  } catch (e) {
    console.error('Failed to convert path to SVG:', e);
    return '';
  }
}

/**
 * Create SVG path element string
 */
export function createSvgPathElement(
  d: string,
  options: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    id?: string;
  } = {}
): string {
  const {
    fill = 'none',
    stroke = 'none',
    strokeWidth = 0.001,
    id
  } = options;
  
  const idAttr = id ? ` id="${id}"` : '';
  const fillAttr = fill !== 'none' ? ` fill="${fill}"` : ' fill="none"';
  const strokeAttr = stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
  
  return `<path${idAttr} d="${d}"${fillAttr}${strokeAttr} />`;
}

/**
 * Create complete SVG document
 */
export function createSvgDocument(
  width: number,
  height: number,
  content: string,
  options: {
    units?: string;
    viewBox?: string;
  } = {}
): string {
  const { units = 'mm' } = options;
  const viewBox = options.viewBox || `0 0 ${width} ${height}`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}${units}" 
     height="${height}${units}" 
     viewBox="${viewBox}">
  ${content}
</svg>`;
}

/**
 * Build two-layer SVG for laser cutting
 */
export function buildTwoLayerSvg(
  width: number,
  height: number,
  basePath: string,
  topPath: string,
  options: {
    cutStroke?: number;
    showBase?: boolean;
    showTop?: boolean;
  } = {}
): string {
  const {
    cutStroke = 0.5,
    showBase = true,
    showTop = true
  } = options;
  
  let content = '';
  
  // Base layer (cut outline)
  if (showBase && basePath) {
    content += `  <g id="base-cut">
    <path d="${basePath}" fill="none" stroke="#000000" stroke-width="${cutStroke}" />
  </g>\n`;
  }
  
  // Top layer (engrave/fill)
  if (showTop && topPath) {
    content += `  <g id="top-engrave">
    <path d="${topPath}" fill="#000000" stroke="none" />
  </g>\n`;
  }
  
  return createSvgDocument(width, height, content);
}
