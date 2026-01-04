/**
 * Element factory functions
 */

import type {
  ShapeElement,
  BorderElement,
  TextElement,
  OrnamentElement,
  TracedElement,
  LogoElement,
  CanvasDocument,
  LayerType,
} from '../../types/canvas';
import { generateId, createDefaultTransform } from '../../types/canvas';
import { generateShapePath, getShapeBounds, type ShapeType } from './shapes';
import { getCssFontFamily } from '@/lib/fonts/fontLoader';

// ============ Shape Element ============
export function createShapeElement(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number,
  layer: LayerType = 'CUT'
): ShapeElement {
  const bounds = getShapeBounds(shapeType, size, width, height);
  // Path is centered at origin (0,0), transform handles positioning
  const pathD = generateShapePath(shapeType, size, width, height);

  return {
    id: generateId(),
    kind: 'shape',
    layer,
    name: 'Base Shape',
    system: true,
    shapeType,
    pathD,
    widthMm: bounds.widthMm,
    heightMm: bounds.heightMm,
    strokeWidthMm: 0.3,
    transform: createDefaultTransform(0, 0),
  };
}

// ============ Border Element ============
export function createBorderElement(
  pathD: string,
  widthMm: number,
  heightMm: number,
  strokeWidthMm: number = 0.3,
  isDoubleBorder: boolean = false,
  layer: LayerType = 'CUT'
): BorderElement {
  return {
    id: generateId(),
    kind: 'border',
    layer,
    name: isDoubleBorder ? 'Border (Double)' : 'Border',
    system: true,
    pathD,
    widthMm,
    heightMm,
    strokeWidthMm,
    isDoubleBorder,
    transform: createDefaultTransform(widthMm / 2, heightMm / 2),
  };
}

// ============ Text Element ============
export function createTextElement(
  content: string,
  xMm: number,
  yMm: number,
  fontId: string = 'Milkshake',
  fontSizeMm: number = 12,
  fontFamily: string = getCssFontFamily('Milkshake'),
  layer: LayerType = 'ENGRAVE'
): TextElement {
  return {
    id: generateId(),
    kind: 'text',
    layer,
    name: 'Text',
    content,
    fontId,
    fontFamily,
    fontSizeMm,
    fontWeight: 700,
    textAnchor: 'middle',
    letterSpacing: 0,
    transform: createDefaultTransform(xMm, yMm),
  };
}

// ============ Ornament Element ============
export function createOrnamentElement(
  assetId: string,
  pathD: string,
  widthMm: number,
  heightMm: number,
  xMm: number,
  yMm: number,
  layer: LayerType = 'ENGRAVE'
): OrnamentElement {
  return {
    id: generateId(),
    kind: 'ornament',
    layer,
    assetId,
    pathD,
    widthMm,
    heightMm,
    strokeWidthMm: 0.3,
    transform: createDefaultTransform(xMm, yMm),
  };
}

// ============ Traced Element ============
export function createTracedElement(
  pathD: string,
  widthMm: number,
  heightMm: number,
  xMm: number,
  yMm: number,
  layer: LayerType = 'ENGRAVE',
  aiPrompt?: string
): TracedElement {
  return {
    id: generateId(),
    kind: 'traced',
    layer,
    pathD,
    widthMm,
    heightMm,
    strokeWidthMm: 0.3,
    aiPrompt,
    transform: createDefaultTransform(xMm, yMm),
  };
}

// ============ Logo Element (Trace) ============
export function createLogoElement(args: {
  paths: string[];
  localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  xMm: number;
  yMm: number;
  op?: 'ENGRAVE' | 'CUT_OUT';
}): LogoElement {
  const { paths, localBounds, xMm, yMm } = args;
  const op = args.op ?? 'ENGRAVE';
  const w = Math.max(0.001, localBounds.widthMm);
  const h = Math.max(0.001, localBounds.heightMm);
  return {
    id: generateId(),
    kind: 'logo',
    source: 'trace',
    paths,
    bboxMm: { ...localBounds },
    op,
    pathD: paths.join(' '),
    widthMm: w,
    heightMm: h,
    strokeWidthMm: 0.3,
    layer: op === 'CUT_OUT' ? 'CUT' : 'ENGRAVE',
    transform: createDefaultTransform(xMm, yMm),
  };
}

// ============ Document Factory ============
export function createEmptyDocument(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number
): CanvasDocument {
  const bounds = getShapeBounds(shapeType, size, width, height);
  // Base path for artboard guide - centered at origin
  const basePathD = generateShapePath(shapeType, size, width, height);

  return {
    artboard: {
      widthMm: bounds.widthMm,
      heightMm: bounds.heightMm,
      shapeType,
      basePathD,
    },
    elements: [],
  };
}

export interface CoasterDocumentOptions {
  shapeType: ShapeType;
  size: number;
  width?: number;
  height?: number;
  centerText?: string;
  topText?: string;
  bottomText?: string;
  centerFontSizeMm?: number;
  topFontSizeMm?: number;
  bottomFontSizeMm?: number;
  border?: {
    enabled: boolean;
    inset: number;
    thickness: number;
    doubleBorder: boolean;
    doubleBorderGap: number;
  };
}

export function createCoasterDocument(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number,
  centerText: string = '',
  options?: Partial<CoasterDocumentOptions>
): CanvasDocument {
  const doc = createEmptyDocument(shapeType, size, width, height);
  const cx = doc.artboard.widthMm / 2;
  const cy = doc.artboard.heightMm / 2;

  // Add base shape as CUT element
  const shapeEl = createShapeElement(shapeType, size, width, height, 'CUT');
  shapeEl.transform.xMm = cx;
  shapeEl.transform.yMm = cy;
  doc.elements.push(shapeEl);

  // Add border if enabled
  if (options?.border?.enabled) {
    const borderInset = options.border.inset;
    const borderSize = size - borderInset * 2;
    const borderW = width ? width - borderInset * 2 : undefined;
    const borderH = height ? height - borderInset * 2 : undefined;
    
    // First border - path centered at origin
    const borderPathD = generateShapePath(shapeType, borderSize, borderW, borderH);
    const borderEl = createBorderElement(
      borderPathD,
      doc.artboard.widthMm,
      doc.artboard.heightMm,
      options.border.thickness,
      false,
      'CUT'
    );
    borderEl.transform.xMm = cx;
    borderEl.transform.yMm = cy;
    doc.elements.push(borderEl);

    // Double border if enabled
    if (options.border.doubleBorder) {
      const doubleInset = borderInset + options.border.doubleBorderGap;
      const doubleSize = size - doubleInset * 2;
      const doubleW = width ? width - doubleInset * 2 : undefined;
      const doubleH = height ? height - doubleInset * 2 : undefined;
      
      const doubleBorderPathD = generateShapePath(shapeType, doubleSize, doubleW, doubleH);
      const doubleBorderEl = createBorderElement(
        doubleBorderPathD,
        doc.artboard.widthMm,
        doc.artboard.heightMm,
        options.border.thickness,
        true,
        'CUT'
      );
      doubleBorderEl.transform.xMm = cx;
      doubleBorderEl.transform.yMm = cy;
      doc.elements.push(doubleBorderEl);
    }
  }

  // Add center text if provided
  if (centerText) {
    const fontSizeMm = options?.centerFontSizeMm ?? 16;
    const textEl = createTextElement(centerText, cx, cy, 'Milkshake', fontSizeMm, getCssFontFamily('Milkshake'), 'ENGRAVE');
    textEl.system = true;
    textEl.name = 'Center Text';
    doc.elements.push(textEl);
  }

  // Add top text if provided
  if (options?.topText) {
    const topY = cy - (size / 2) * 0.55;
    const fontSizeMm = options.topFontSizeMm ?? 10;
    const topTextEl = createTextElement(options.topText, cx, topY, 'Milkshake', fontSizeMm, getCssFontFamily('Milkshake'), 'ENGRAVE');
    topTextEl.system = true;
    topTextEl.name = 'Top Text';
    doc.elements.push(topTextEl);
  }

  // Add bottom text if provided
  if (options?.bottomText) {
    const bottomY = cy + (size / 2) * 0.55;
    const fontSizeMm = options.bottomFontSizeMm ?? 10;
    const bottomTextEl = createTextElement(options.bottomText, cx, bottomY, 'Milkshake', fontSizeMm, getCssFontFamily('Milkshake'), 'ENGRAVE');
    bottomTextEl.system = true;
    bottomTextEl.name = 'Bottom Text';
    doc.elements.push(bottomTextEl);
  }

  return doc;
}
