/**
 * Personalised Sign Generator V3 PRO - Async SVG Rendering
 * Render document with text-to-path conversion
 */

import type {
  SignDocument,
  Layer,
  Element,
  TextElement,
  ShapeElement,
  EngraveSketchElement,
  EngraveImageElement,
  OrnamentElement,
  RenderPreviewOptions,
  RenderExportOptions,
  RenderResult,
} from '../types/signPro';
import { textElementToPath, applyTextCase, buildTextSvgElement } from './text/textToPath';
import { computeHolesPro, holesToSvg } from './holesPro';
import { renderOrnamentElement } from './renderOrnament';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Render preview SVG with all layers and guides (ASYNC)
 */
export async function renderPreviewSvgAsync(
  doc: SignDocument,
  options: Partial<RenderPreviewOptions> = {}
): Promise<RenderResult> {
  const opts: RenderPreviewOptions = {
    showGuides: false,
    showSafeZones: false,
    showGrid: false,
    showBoundingBoxes: false,
    selectedIds: [],
    ...options,
  };

  const warnings: string[] = [];
  const { wMm, hMm } = doc.artboard;

  let svgContent = '';

  // Grid
  if (opts.showGrid) {
    svgContent += renderGrid(wMm, hMm);
  }

  // Safe zones
  if (opts.showSafeZones) {
    svgContent += renderSafeZone(wMm, hMm, 15);
  }

  // Render layers in order
  const sortedLayers = [...doc.layers].sort((a, b) => a.order - b.order);

  const holesPro = computeHolesPro(doc);
  warnings.push(...holesPro.warnings);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    const layerContent = await renderLayerAsync(layer, doc, opts);
    if (layerContent) {
      const opacityAttr = layer.opacity < 1 ? ` opacity="${layer.opacity}"` : '';
      svgContent += `\n  <g id="layer-${layer.id}" data-layer-type="${layer.type}"${opacityAttr}>`;
      svgContent += layerContent;
      svgContent += '\n  </g>';
    }
  }

  const svg = buildSvgWrapper(wMm, hMm, svgContent);

  return { svg, warnings, dimensions: { width: wMm, height: hMm } };
}

/**
 * Render export SVG (ASYNC)
 */
export async function renderExportSvgAsync(
  doc: SignDocument,
  options: Partial<RenderExportOptions> = {}
): Promise<RenderResult> {
  const opts: RenderExportOptions = {
    includeAllLayers: true,
    separateLayers: false,
    ...options,
  };

  const warnings: string[] = [];
  const { wMm, hMm } = doc.artboard;

  let svgContent = '';

  const cutContent: string[] = [];
  const engraveContent: string[] = [];
  const outlineContent: string[] = [];

  const holesPro = computeHolesPro(doc);
  warnings.push(...holesPro.warnings);

  const sortedLayers = [...doc.layers].sort((a, b) => a.order - b.order);

  for (const layer of sortedLayers) {
    if (!layer.exportEnabled && opts.includeAllLayers) continue;
    if (layer.type === 'GUIDE') continue;

    const content = await renderLayerForExportAsync(layer, doc, warnings);
    if (!content) continue;

    switch (layer.type) {
      case 'BASE':
      case 'CUT':
        cutContent.push(content);
        break;
      case 'ENGRAVE':
        engraveContent.push(content);
        break;
      case 'OUTLINE':
        outlineContent.push(content);
        break;
    }
  }

  // Add base shape
  cutContent.unshift(renderBaseShape(doc));

  // Add holes
  if (holesPro.cut.length > 0) {
    cutContent.push(`\n    ${holesToSvg(holesPro.cut)}`);
  }

  if (holesPro.engrave.length > 0) {
    engraveContent.push(`\n    ${holesToSvg(holesPro.engrave)}`);
  }

  // Build grouped content
  if (cutContent.length > 0) {
    svgContent += `\n  <g id="CUT" stroke="#000000" fill="none" stroke-width="${doc.output.cutStrokeMm}">`;
    svgContent += cutContent.join('');
    svgContent += '\n  </g>';
  }

  if (outlineContent.length > 0) {
    svgContent += `\n  <g id="OUTLINE" stroke="#000000" fill="none" stroke-width="${doc.output.outlineStrokeMm}">`;
    svgContent += outlineContent.join('');
    svgContent += '\n  </g>';
  }

  if (engraveContent.length > 0) {
    svgContent += `\n  <g id="ENGRAVE" stroke="#ff0000" fill="none" stroke-width="${doc.output.engraveStrokeMm}">`;
    svgContent += engraveContent.join('');
    svgContent += '\n  </g>';
  }

  const svg = buildSvgWrapper(wMm, hMm, svgContent);

  return { svg, warnings, dimensions: { width: wMm, height: hMm } };
}

/**
 * Render layer async
 */
async function renderLayerAsync(
  layer: Layer,
  doc: SignDocument,
  opts: RenderPreviewOptions
): Promise<string> {
  let content = '';

  // Base layer includes shape outline
  if (layer.type === 'BASE') {
    content += `\n    <path d="${doc.artboard.baseShape.pathD}" fill="none" stroke="#000" stroke-width="0.2" />`;

    const holesPro = computeHolesPro(doc);
    if (holesPro.cut.length > 0) {
      content += `\n    ${holesToSvg(holesPro.cut)}`;
    }
    if (holesPro.engrave.length > 0) {
      content += `\n    <g stroke="#ff0000" fill="none" stroke-width="0.2">${holesToSvg(holesPro.engrave)}</g>`;
    }
  }

  // Render elements
  for (const element of layer.elements) {
    const elementContent = await renderElementAsync(element, layer, doc, false, []);
    if (elementContent) {
      content += elementContent;
    }
  }

  return content;
}

/**
 * Render layer for export async
 */
async function renderLayerForExportAsync(layer: Layer, doc: SignDocument, warnings: string[]): Promise<string> {
  let content = '';

  for (const element of layer.elements) {
    const elementContent = await renderElementAsync(element, layer, doc, true, warnings);
    if (elementContent) {
      content += elementContent;
    }
  }

  return content;
}

/**
 * Render element async
 */
async function renderElementAsync(
  element: Element,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean,
  warnings: string[]
): Promise<string> {
  switch (element.kind) {
    case 'text':
      return await renderTextElementAsync(element, layer, doc, forExport, warnings);
    case 'shape':
      return renderShapeElement(element, layer, doc, forExport);
    case 'engraveSketch':
      return renderSketchElement(element, layer, doc, forExport);
    case 'engraveImage':
      return '';
    case 'ornament':
      return renderOrnamentElement(element, layer, doc, forExport);
    default:
      return '';
  }
}

function renderEngraveImageElement(
  element: EngraveImageElement,
  _layer: Layer,
  _doc: SignDocument,
  forExport: boolean
): string {
  if (forExport) return '';
  if (!element.pngDataUrl) return '';

  const { xMm, yMm, rotateDeg, scaleX, scaleY } = element.transform;
  const w = element.widthMm;
  const h = element.heightMm;

  const x = xMm - w / 2;
  const y = yMm - h / 2;

  const transforms: string[] = [];
  if (x !== 0 || y !== 0) {
    transforms.push(`translate(${mm(x)}, ${mm(y)})`);
  }
  if (rotateDeg !== 0) {
    transforms.push(`rotate(${rotateDeg}, ${mm(w / 2)}, ${mm(h / 2)})`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }

  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
  return `\n    <image href="${element.pngDataUrl}" width="${mm(w)}" height="${mm(h)}" preserveAspectRatio="xMidYMid meet"${transformAttr} />`;
}

/**
 * Render text element async with text-to-path conversion
 */
async function renderTextElementAsync(
  element: TextElement,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean,
  warnings: string[]
): Promise<string> {
  const text = applyTextCase(element.text, element.transformCase);
  if (!text || text.trim().length === 0) return '';

  // Determine stroke/fill based on mode
  let stroke = '#000';
  let fill = 'none';
  let strokeWidth = forExport ? doc.output.engraveStrokeMm : 0.3;

  if (element.mode === 'ENGRAVE_FILLED') {
    stroke = forExport ? '#ff0000' : '#0066cc';
    fill = 'none';
    strokeWidth = forExport ? doc.output.engraveStrokeMm : 0.5;
  } else if (element.mode === 'CUT_OUTLINE') {
    stroke = '#000';
    fill = 'none';
    strokeWidth = forExport ? doc.output.cutStrokeMm : 0.2;
  } else if (element.mode === 'BOTH') {
    stroke = forExport ? '#ff0000' : '#0066cc';
    fill = 'none';
    strokeWidth = forExport ? doc.output.engraveStrokeMm : 0.5;
  }

  try {
    // Convert text to path
    const pathResult = await textElementToPath(element);
    
    if (!pathResult.pathD) {
      if (!forExport) {
        return '\n    ' + buildTextSvgElement(element, stroke, strokeWidth, fill);
      }
      warnings.push('Font not loaded; using fallback for export');
      return ''; // export requires paths; keep laser-safe by omitting if font failed completely
    }

    if (forExport && pathResult.usedFallback) {
      warnings.push('Font not loaded; using fallback for export');
    }

    const { xMm, yMm, rotateDeg, scaleX, scaleY } = element.transform;

    // Calculate offset based on alignment
    let offsetX = 0;
    switch (element.align) {
      case 'left':
        offsetX = 0;
        break;
      case 'right':
        offsetX = -pathResult.width;
        break;
      case 'center':
      default:
        offsetX = -pathResult.width / 2;
        break;
    }

    // Build transform
    const transforms: string[] = [];
    const tx = xMm + offsetX;
    const ty = yMm - pathResult.height / 2;
    
    if (tx !== 0 || ty !== 0) {
      transforms.push(`translate(${mm(tx)}, ${mm(ty)})`);
    }
    
    if (rotateDeg !== 0) {
      const cx = pathResult.width / 2;
      const cy = pathResult.height / 2;
      transforms.push(`rotate(${rotateDeg}, ${mm(cx)}, ${mm(cy)})`);
    }
    
    if (scaleX !== 1 || scaleY !== 1) {
      transforms.push(`scale(${scaleX}, ${scaleY})`);
    }

    const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

    return `\n    <path d="${pathResult.pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transformAttr} />`;
  } catch (error) {
    console.warn('[RenderAsync] Text-to-path failed:', error);
    if (!forExport) {
      return '\n    ' + buildTextSvgElement(element, stroke, strokeWidth, fill);
    }
    warnings.push('Font not loaded; using fallback for export');
    return '';
  }
}

/**
 * Render shape element
 */
function renderShapeElement(
  element: ShapeElement,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean
): string {
  if (!element.svgPathD) return '';

  const { xMm, yMm, rotateDeg, scaleX, scaleY } = element.transform;

  const transforms: string[] = [];
  if (xMm !== 0 || yMm !== 0) {
    transforms.push(`translate(${mm(xMm)}, ${mm(yMm)})`);
  }
  if (rotateDeg !== 0) {
    transforms.push(`rotate(${rotateDeg})`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }

  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  let stroke = '#000';
  let fill = 'none';
  let strokeWidth = forExport ? doc.output.cutStrokeMm : 0.2;

  if (element.style === 'ENGRAVE') {
    stroke = forExport ? '#ff0000' : '#0066cc';
    strokeWidth = forExport ? doc.output.engraveStrokeMm : 0.5;
  }

  return `\n    <path d="${element.svgPathD}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transformAttr} />`;
}

/**
 * Render engrave sketch element
 */
function renderSketchElement(
  element: EngraveSketchElement,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean
): string {
  if (!element.svgPathD || element.svgPathD.length === 0) return '';

  const { xMm, yMm, rotateDeg, scaleX, scaleY } = element.transform;

  const transforms: string[] = [];
  if (xMm !== 0 || yMm !== 0) {
    transforms.push(`translate(${mm(xMm)}, ${mm(yMm)})`);
  }
  if (rotateDeg !== 0) {
    transforms.push(`rotate(${rotateDeg})`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transforms.push(`scale(${scaleX}, ${scaleY})`);
  }

  const transformAttr = transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';

  const stroke = forExport ? '#ff0000' : '#0066cc';
  const strokeWidth = forExport ? doc.output.engraveStrokeMm : element.strokeMm;

  let content = `\n    <g${transformAttr}>`;
  for (const pathD of element.svgPathD) {
    content += `\n      <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  content += '\n    </g>';

  return content;
}

/**
 * Render base shape
 */
function renderBaseShape(doc: SignDocument): string {
  return `\n    <path d="${doc.artboard.baseShape.pathD}" />`;
}

/**
 * Render holes
 */
function renderHoles(doc: SignDocument): string {
  if (!doc.holes.enabled || doc.holes.mode === 'none') return '';

  const result = computeHolesPro(doc);

  if (result.cut.length === 0) return '';

  return '\n    ' + holesToSvg(result.cut);
}

/**
 * Render grid
 */
function renderGrid(wMm: number, hMm: number): string {
  let grid = '\n  <g id="grid" stroke="#cccccc" stroke-width="0.05" opacity="0.3">';

  for (let x = 0; x <= wMm; x += 10) {
    grid += `\n    <line x1="${mm(x)}" y1="0" x2="${mm(x)}" y2="${mm(hMm)}" />`;
  }
  for (let y = 0; y <= hMm; y += 10) {
    grid += `\n    <line x1="0" y1="${mm(y)}" x2="${mm(wMm)}" y2="${mm(y)}" />`;
  }

  grid += '\n  </g>';
  return grid;
}

/**
 * Render safe zone
 */
function renderSafeZone(wMm: number, hMm: number, padding: number): string {
  return `\n  <rect id="safe-zone" x="${mm(padding)}" y="${mm(padding)}" width="${mm(wMm - padding * 2)}" height="${mm(hMm - padding * 2)}" fill="none" stroke="#00ff00" stroke-width="0.2" stroke-dasharray="2,2" opacity="0.5" />`;
}

/**
 * Build SVG wrapper
 */
function buildSvgWrapper(wMm: number, hMm: number, content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(wMm)}mm" height="${mm(hMm)}mm" viewBox="0 0 ${mm(wMm)} ${mm(hMm)}">
  ${content}
</svg>`;
}

/**
 * Generate export filename
 */
export function generateProFilename(doc: SignDocument): string {
  let mainText = 'sign';
  for (const layer of doc.layers) {
    for (const element of layer.elements) {
      if (element.kind === 'text' && element.text.trim()) {
        mainText = element.text.trim();
        break;
      }
    }
    if (mainText !== 'sign') break;
  }

  const slug = mainText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) || 'sign';

  return `sign-pro-${doc.artboard.baseShape.shapeType}-${slug}-${doc.artboard.wMm}x${doc.artboard.hMm}.svg`;
}
