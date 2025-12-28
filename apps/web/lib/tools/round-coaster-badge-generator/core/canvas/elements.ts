/**
 * Element factory functions
 */

import type {
  ShapeElement,
  BorderElement,
  TextElement,
  OrnamentElement,
  TracedElement,
  CanvasDocument,
  LayerType,
} from '../../types/canvas';
import { generateId, createDefaultTransform } from '../../types/canvas';
import { generateShapePath, getShapeBounds, type ShapeType } from './shapes';

// ============ Shape Element ============
export function createShapeElement(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number,
  layer: LayerType = 'CUT'
): ShapeElement {
  const bounds = getShapeBounds(shapeType, size, width, height);
  const cx = bounds.widthMm / 2;
  const cy = bounds.heightMm / 2;
  const pathD = generateShapePath(shapeType, cx, cy, size, width, height);

  return {
    id: generateId(),
    kind: 'shape',
    layer,
    shapeType,
    pathD,
    widthMm: bounds.widthMm,
    heightMm: bounds.heightMm,
    strokeWidthMm: 0.3,
    transform: createDefaultTransform(cx, cy),
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
  fontSizeMm: number = 12,
  fontFamily: string = 'Arial, Helvetica, sans-serif',
  layer: LayerType = 'ENGRAVE'
): TextElement {
  return {
    id: generateId(),
    kind: 'text',
    layer,
    content,
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

// ============ Document Factory ============
export function createEmptyDocument(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number
): CanvasDocument {
  const bounds = getShapeBounds(shapeType, size, width, height);
  const cx = bounds.widthMm / 2;
  const cy = bounds.heightMm / 2;
  const basePathD = generateShapePath(shapeType, cx, cy, size, width, height);

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

export function createCoasterDocument(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number,
  centerText: string = ''
): CanvasDocument {
  const doc = createEmptyDocument(shapeType, size, width, height);
  const cx = doc.artboard.widthMm / 2;
  const cy = doc.artboard.heightMm / 2;

  // Add base shape as CUT element
  const shapeEl = createShapeElement(shapeType, size, width, height, 'CUT');
  shapeEl.transform.xMm = cx;
  shapeEl.transform.yMm = cy;
  doc.elements.push(shapeEl);

  // Add center text if provided
  if (centerText) {
    const textEl = createTextElement(centerText, cx, cy, 16, 'Arial, Helvetica, sans-serif', 'ENGRAVE');
    doc.elements.push(textEl);
  }

  return doc;
}
