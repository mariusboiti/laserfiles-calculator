/**
 * Personalised Sign Generator V3 PRO - SVG Rendering
 * Render document with layers for preview and export
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
  TracedPathElement,
  TracedPathGroupElement,
  RenderPreviewOptions,
  RenderExportOptions,
  RenderResult,
} from '../types/signPro';
import { buildTextSvgElement, applyTextCase, textElementToPath } from './text/textToPath';
import { computeHolesPro, holesToSvg } from './holesPro';
import { buildShapePath } from './shapesV3';
import { renderOrnamentElement } from './renderOrnament';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Render preview SVG with all layers and guides
 */
export function renderPreviewSvg(
  doc: SignDocument,
  options: Partial<RenderPreviewOptions> = {}
): RenderResult {
  const opts: RenderPreviewOptions = {
    showGuides: false,
    showSafeZones: false,
    showGrid: false,
    showBoundingBoxes: false,
    selectedIds: [],
    ...options,
  };

  const warnings: string[] = [];
  const { wMm, hMm, baseShape } = doc.artboard;

  let svgContent = '';

  // Grid (if enabled)
  if (opts.showGrid) {
    svgContent += renderGrid(wMm, hMm);
  }

  // Safe zones (if enabled)
  if (opts.showSafeZones) {
    svgContent += renderSafeZone(wMm, hMm, 15);
  }

  // Render layers in order (lowest order first = bottom)
  const sortedLayers = [...doc.layers].sort((a, b) => a.order - b.order);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    const layerContent = renderLayer(layer, doc, opts);
    if (layerContent) {
      const opacityAttr = layer.opacity < 1 ? ` opacity="${layer.opacity}"` : '';
      svgContent += `\n  <g id="layer-${layer.id}" data-layer-type="${layer.type}"${opacityAttr}>`;
      svgContent += layerContent;
      svgContent += '\n  </g>';
    }
  }

  // Bounding boxes for selected elements
  if (opts.showBoundingBoxes && opts.selectedIds.length > 0) {
    svgContent += renderSelectionBoxes(doc, opts.selectedIds);
  }

  const svg = buildSvgWrapper(wMm, hMm, svgContent);

  return { svg, warnings, dimensions: { width: wMm, height: hMm } };
}

/**
 * Render export SVG (no guides, no opacity)
 */
export function renderExportSvg(
  doc: SignDocument,
  options: Partial<RenderExportOptions> = {}
): RenderResult {
  const opts: RenderExportOptions = {
    includeAllLayers: true,
    separateLayers: false,
    ...options,
  };

  const warnings: string[] = [];
  const { wMm, hMm } = doc.artboard;

  let svgContent = '';

  // Group layers by type for export
  const cutContent: string[] = [];
  const engraveContent: string[] = [];
  const outlineContent: string[] = [];

  const sortedLayers = [...doc.layers].sort((a, b) => a.order - b.order);

  for (const layer of sortedLayers) {
    if (!layer.exportEnabled && opts.includeAllLayers) continue;
    if (layer.type === 'GUIDE') continue; // Never export guides

    const content = renderLayerForExport(layer, doc);
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

  // Add base shape to CUT
  cutContent.unshift(renderBaseShape(doc));

  // Add holes to CUT
  const holesContent = renderHoles(doc);
  if (holesContent) {
    cutContent.push(holesContent);
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
 * Render a single layer for preview
 */
function renderLayer(
  layer: Layer,
  doc: SignDocument,
  opts: RenderPreviewOptions
): string {
  let content = '';

  // Base layer includes shape outline
  if (layer.type === 'BASE') {
    content += `\n    <path d="${doc.artboard.baseShape.pathD}" fill="none" stroke="#000" stroke-width="0.2" />`;
    
    // Holes
    const holesContent = renderHoles(doc);
    if (holesContent) {
      content += holesContent;
    }
  }

  // Render elements
  for (const element of layer.elements) {
    const elementContent = renderElement(element, layer, doc);
    if (elementContent) {
      content += elementContent;
    }
  }

  return content;
}

/**
 * Render a single layer for export
 */
function renderLayerForExport(layer: Layer, doc: SignDocument): string {
  let content = '';

  for (const element of layer.elements) {
    const elementContent = renderElementForExport(element, layer, doc);
    if (elementContent) {
      content += elementContent;
    }
  }

  return content;
}

/**
 * Render a single element for preview
 */
function renderElement(
  element: Element,
  layer: Layer,
  doc: SignDocument
): string {
  switch (element.kind) {
    case 'text':
      return renderTextElement(element, layer, doc, false);
    case 'shape':
      return renderShapeElement(element, layer, doc, false);
    case 'engraveSketch':
      return renderSketchElement(element, layer, doc, false);
    case 'engraveImage':
      return renderEngraveImageElement(element, layer, doc, false);
    case 'ornament':
      return renderOrnamentElement(element, layer, doc, false);
    case 'tracedPath':
      return renderTracedPathElement(element, layer, doc, false);
    case 'tracedPathGroup':
      return renderTracedPathGroupElement(element, layer, doc, false);
    default:
      return '';
  }
}

/**
 * Render a single element for export
 */
function renderElementForExport(
  element: Element,
  layer: Layer,
  doc: SignDocument
): string {
  switch (element.kind) {
    case 'text':
      return renderTextElement(element, layer, doc, true);
    case 'shape':
      return renderShapeElement(element, layer, doc, true);
    case 'engraveSketch':
      return renderSketchElement(element, layer, doc, true);
    case 'engraveImage':
      return '';
    case 'ornament':
      return renderOrnamentElement(element, layer, doc, true);
    case 'tracedPath':
      return renderTracedPathElement(element, layer, doc, true);
    case 'tracedPathGroup':
      return renderTracedPathGroupElement(element, layer, doc, true);
    default:
      return '';
  }
}

function renderTracedPathElement(
  element: TracedPathElement,
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

  const stroke = forExport
    ? layer.type === 'CUT' || layer.type === 'OUTLINE'
      ? '#000'
      : '#ff0000'
    : '#0066cc';

  const strokeWidth = forExport
    ? layer.type === 'CUT'
      ? doc.output.cutStrokeMm
      : layer.type === 'OUTLINE'
        ? doc.output.outlineStrokeMm
        : doc.output.engraveStrokeMm
    : element.strokeMm;

  return `\n    <path d="${element.svgPathD}" fill="none" stroke="${stroke}" stroke-width="${mm(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"${transformAttr} />`;
}

function renderTracedPathGroupElement(
  element: TracedPathGroupElement,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean
): string {
  if (!element.svgPathDs || element.svgPathDs.length === 0) return '';

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

  const stroke = forExport
    ? layer.type === 'CUT' || layer.type === 'OUTLINE'
      ? '#000'
      : '#ff0000'
    : '#0066cc';

  const strokeWidth = forExport
    ? layer.type === 'CUT'
      ? doc.output.cutStrokeMm
      : layer.type === 'OUTLINE'
        ? doc.output.outlineStrokeMm
        : doc.output.engraveStrokeMm
    : element.strokeMm;

  let content = `\n    <g${transformAttr}>`;
  for (const d of element.svgPathDs) {
    content += `\n      <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${mm(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round" />`;
  }
  content += '\n    </g>';
  return content;
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
 * Render text element
 * Note: This is synchronous but textElementToPath is async, so we use a placeholder
 * The actual text-to-path conversion should happen in a useEffect in the component
 */
function renderTextElement(
  element: TextElement,
  layer: Layer,
  doc: SignDocument,
  forExport: boolean
): string {
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

  // For now, use SVG text element as placeholder
  // TODO: Convert to paths using textElementToPath in async context
  return buildTextSvgElement(element, stroke, strokeWidth, fill);
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

  // Build transform
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

  // Style based on shape style
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

  // Build transform
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
 * Render selection boxes
 */
function renderSelectionBoxes(doc: SignDocument, selectedIds: string[]): string {
  let content = '\n  <g id="selection-boxes" fill="none" stroke="#3b82f6" stroke-width="0.3" stroke-dasharray="2,1">';

  for (const layer of doc.layers) {
    for (const element of layer.elements) {
      if (selectedIds.includes(element.id)) {
        // Simple bounding box based on transform
        const { xMm, yMm } = element.transform;
        const size = 30; // Approximate size
        content += `\n    <rect x="${mm(xMm - size / 2)}" y="${mm(yMm - size / 2)}" width="${mm(size)}" height="${mm(size)}" />`;
      }
    }
  }

  content += '\n  </g>';
  return content;
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
  // Get main text from first text element
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
