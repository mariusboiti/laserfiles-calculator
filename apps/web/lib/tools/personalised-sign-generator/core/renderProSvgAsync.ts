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
  TracedPathElement,
  TracedPathGroupElement,
  RenderPreviewOptions,
  RenderExportOptions,
  RenderResult,
} from '../types/signPro';
import { loadFont, getFontConfigSafe } from '../../../fonts/sharedFontRegistry';
import { textElementToPath, applyTextCase, buildTextSvgElement } from './text/textToPath';
import { offsetFilledPath } from './text/outlineOffset';
import { computeHolesPro, holesToSvg } from './holesPro';
import { renderOrnamentElement } from './renderOrnament';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
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

    const buckets = await renderLayerForExportBucketsAsync(layer, doc, warnings);
    if (buckets.cut) cutContent.push(buckets.cut);
    if (buckets.outline) outlineContent.push(buckets.outline);
    if (buckets.engrave) engraveContent.push(buckets.engrave);
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

type ExportBucket = 'cut' | 'outline' | 'engrave';

function layerTypeToExportBucket(layerType: Layer['type']): ExportBucket | null {
  switch (layerType) {
    case 'BASE':
    case 'CUT':
      return 'cut';
    case 'OUTLINE':
      return 'outline';
    case 'ENGRAVE':
      return 'engrave';
    default:
      return null;
  }
}

function outlineTargetToExportBucket(target: 'CUT' | 'OUTLINE'): ExportBucket {
  return target === 'OUTLINE' ? 'outline' : 'cut';
}

async function renderLayerForExportBucketsAsync(
  layer: Layer,
  doc: SignDocument,
  warnings: string[]
): Promise<{ cut: string; outline: string; engrave: string }> {
  let cut = '';
  let outline = '';
  let engrave = '';

  for (const element of layer.elements) {
    const res = await renderElementForExportBucketsAsync(element, layer, doc, warnings);
    cut += res.cut;
    outline += res.outline;
    engrave += res.engrave;
  }

  return { cut, outline, engrave };
}

async function renderElementForExportBucketsAsync(
  element: Element,
  layer: Layer,
  doc: SignDocument,
  warnings: string[]
): Promise<{ cut: string; outline: string; engrave: string }> {
  const empty = { cut: '', outline: '', engrave: '' };

  if (element.kind === 'text') {
    return await renderTextElementForExportBucketsAsync(element, layer, doc, warnings);
  }

  const bucket = layerTypeToExportBucket(layer.type);
  if (!bucket) return empty;

  const content = await renderElementAsync(element, layer, doc, true, warnings);
  if (!content) return empty;

  return {
    cut: bucket === 'cut' ? content : '',
    outline: bucket === 'outline' ? content : '',
    engrave: bucket === 'engrave' ? content : '',
  };
}

async function renderTextElementForExportBucketsAsync(
  element: TextElement,
  layer: Layer,
  doc: SignDocument,
  warnings: string[]
): Promise<{ cut: string; outline: string; engrave: string }> {
  const empty = { cut: '', outline: '', engrave: '' };

  const defaultBucket = layerTypeToExportBucket(layer.type);
  if (!defaultBucket) return empty;

  const hasOutline = Boolean(element.outline?.enabled) && Math.abs(element.outline?.offsetMm ?? 0) > 0;
  const targetBucket = hasOutline
    ? outlineTargetToExportBucket(element.outline.targetLayerType)
    : defaultBucket;

  const fakeLayer: Layer = { ...layer, type: targetBucket === 'cut' ? 'CUT' : targetBucket === 'outline' ? 'OUTLINE' : 'ENGRAVE' };
  const content = await renderTextElementAsync(element, fakeLayer, doc, true, warnings);
  if (!content) return empty;

  return {
    cut: targetBucket === 'cut' ? content : '',
    outline: targetBucket === 'outline' ? content : '',
    engrave: targetBucket === 'engrave' ? content : '',
  };
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
    case 'tracedPath':
      return renderTracedPathElement(element, layer, doc, forExport);
    case 'tracedPathGroup':
      return renderTracedPathGroupElement(element, layer, doc, forExport);
    default:
      return '';
  }
}

async function renderCurvedTextElementAsync(
  element: TextElement,
  text: string,
  style: { stroke: string; fill: string; strokeWidth: number },
  forExport: boolean,
  warnings: string[]
): Promise<string> {
  const requestedFontId = element.fontId;
  let usedFallback = false;
  let font: any;
  try {
    font = await loadFont(requestedFontId);
  } catch {
    const fallback = getFontConfigSafe('Milkshake').id;
    if (fallback && fallback !== requestedFontId) {
      try {
        font = await loadFont(fallback);
        usedFallback = true;
      } catch {
        font = null;
      }
    }
  }

  if (!font) {
    if (!forExport) {
      return '\n    ' + buildTextSvgElement(element, style.stroke, style.strokeWidth, style.fill);
    }
    warnings.push('Font not loaded; using fallback for export');
    return '';
  }

  if (forExport && usedFallback) {
    warnings.push('Font not loaded; using fallback for export');
  }

  const letters: Array<{ d: string; w: number; ox: number; oy: number; cw: number }> = [];
  const sizeMm = element.sizeMm;
  const letterSpacingMm = element.letterSpacingMm || 0;

  const PX_PER_MM = 3.7795275591;
  const sizePx = sizeMm * PX_PER_MM;

  for (const ch of Array.from(text)) {
    if (ch === ' ') {
      letters.push({ d: '', w: Math.max(0.1, sizeMm * 0.35 + letterSpacingMm), ox: 0, oy: 0, cw: 0 });
      continue;
    }

    const path = font.getPath(ch, 0, 0, sizePx);
    const bbox = path.getBoundingBox();
    const pathDpx = path.toPathData(3);
    const d = scalePathData(pathDpx, 1 / PX_PER_MM);

    const cw = Math.max(0.01, (bbox.x2 - bbox.x1) / PX_PER_MM);
    const chH = Math.max(0.01, (bbox.y2 - bbox.y1) / PX_PER_MM);
    const ox = -(bbox.x1 / PX_PER_MM + cw / 2);
    const oy = -(bbox.y1 / PX_PER_MM + chH / 2);

    letters.push({ d, w: cw + letterSpacingMm, ox, oy, cw });
  }

  if (letters.length === 0) return '';

  const totalWidth = Math.max(0, letters.reduce((sum, it) => sum + it.w, 0) - letterSpacingMm);
  if (totalWidth <= 0) return '';

  const curvedEnabled = Boolean(element.curved?.enabled);

  const placement = curvedEnabled
    ? element.curved!.placement
    : (element.curvedMode || 'straight') === 'arcDown'
      ? 'bottom'
      : 'top';
  const direction = curvedEnabled ? element.curved!.direction : 'outside';
  const sign = placement === 'top' ? -1 : 1;

  const arcDeg = curvedEnabled
    ? element.curved!.arcDeg
    : Math.max(10, Math.min(180, 20 + (element.curvedIntensity ?? 0) * 1.6));
  const arcRad = Math.max(0.001, degToRad(Math.max(0.001, arcDeg)));

  const radiusMm = curvedEnabled
    ? Math.max(1, element.curved!.radiusMm)
    : Math.max(1, totalWidth / arcRad);

  const occupiedRad = Math.max(0.001, totalWidth / radiusMm);
  if (occupiedRad > arcRad + 1e-6) {
    warnings.push('Curved text exceeds arc length; letters may overlap');
  }

  const startTheta =
    element.align === 'left'
      ? -arcRad / 2
      : element.align === 'right'
        ? arcRad / 2 - occupiedRad
        : -occupiedRad / 2;

  const y0 = sign * radiusMm * Math.cos(arcRad / 2);

  const baseTransforms: string[] = [];
  baseTransforms.push(`translate(${mm(element.transform.xMm)}, ${mm(element.transform.yMm)})`);
  if (element.transform.rotateDeg !== 0) {
    baseTransforms.push(`rotate(${element.transform.rotateDeg})`);
  }
  if (element.transform.scaleX !== 1 || element.transform.scaleY !== 1) {
    baseTransforms.push(`scale(${element.transform.scaleX}, ${element.transform.scaleY})`);
  }
  const groupTransformAttr = baseTransforms.length > 0 ? ` transform="${baseTransforms.join(' ')}"` : '';

  let xCursor = 0;
  let out = `\n    <g${groupTransformAttr}>`;

  for (const it of letters) {
    const charW = Math.max(0.01, it.cw);
    const sCenter = xCursor + charW / 2;
    xCursor += it.w;

    if (!it.d) continue;

    const theta = startTheta + sCenter / radiusMm;
    const x = radiusMm * Math.sin(theta);
    const y = y0 - sign * radiusMm * Math.cos(theta);

    let a = radToDeg(Math.atan2(sign * Math.sin(theta), Math.cos(theta)));
    if (direction === 'inside') {
      a += 180;
    }

    const glyphTransform = `translate(${mm(x)}, ${mm(y)}) rotate(${mm(a)}) translate(${mm(it.ox)}, ${mm(it.oy)})`;
    out += `\n      <g transform="${glyphTransform}"><path d="${it.d}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" /></g>`;
  }

  out += '\n    </g>';
  return out;
}

function quadPoint(width: number, controlY: number, t: number): { x: number; y: number } {
  const p0x = -width / 2;
  const p0y = 0;
  const p1x = 0;
  const p1y = controlY;
  const p2x = width / 2;
  const p2y = 0;
  const u = 1 - t;
  const x = u * u * p0x + 2 * u * t * p1x + t * t * p2x;
  const y = u * u * p0y + 2 * u * t * p1y + t * t * p2y;
  return { x, y };
}

function quadAngleDeg(width: number, controlY: number, t: number): number {
  const p0x = -width / 2;
  const p0y = 0;
  const p1x = 0;
  const p1y = controlY;
  const p2x = width / 2;
  const p2y = 0;
  const dx = 2 * (1 - t) * (p1x - p0x) + 2 * t * (p2x - p1x);
  const dy = 2 * (1 - t) * (p1y - p0y) + 2 * t * (p2y - p1y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function scalePathData(pathData: string, scale: number): string {
  return pathData.replace(/-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g, (match) => {
    const num = parseFloat(match);
    if (isNaN(num)) return match;
    return (num * scale).toFixed(3);
  });
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

  const curvedMode = element.curvedMode || 'straight';
  const curvedIntensity = element.curvedIntensity ?? 0;
  const shouldCurve = Boolean(element.curved?.enabled) || (curvedMode !== 'straight' && curvedIntensity > 0);
  if (shouldCurve) {
    const curved = await renderCurvedTextElementAsync(
      element,
      text,
      { stroke, fill, strokeWidth },
      forExport,
      warnings
    );
    if (curved) return curved;
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

    let d = pathResult.pathD;
    if (
      forExport &&
      (layer.type === 'CUT' || layer.type === 'OUTLINE') &&
      element.outline?.enabled &&
      Math.abs(element.outline.offsetMm) > 0
    ) {
      const res = await offsetFilledPath(d, element.outline.offsetMm, {
        join: element.outline.join,
        simplify: element.outline.simplify,
      });
      if (res.success && res.pathD) {
        d = res.pathD;
      } else if (res.warning) {
        warnings.push(res.warning);
      }
    }

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

    return `\n    <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${transformAttr} />`;
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
