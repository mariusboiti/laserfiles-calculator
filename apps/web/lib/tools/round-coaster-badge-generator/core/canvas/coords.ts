/**
 * Coordinate transformations and bounds calculations
 */

import type { ViewTransform, BoundingBox, CanvasElement, ElementTransform } from '../../types/canvas';
import { PX_PER_MM } from '../../types/canvas';

// ============ Coordinate Transforms ============

export function screenToWorld(
  screenX: number,
  screenY: number,
  view: ViewTransform
): { xMm: number; yMm: number } {
  const xMm = (screenX - view.panX) / (view.zoom * PX_PER_MM);
  const yMm = (screenY - view.panY) / (view.zoom * PX_PER_MM);
  return { xMm, yMm };
}

export function worldToScreen(
  xMm: number,
  yMm: number,
  view: ViewTransform
): { x: number; y: number } {
  const x = xMm * view.zoom * PX_PER_MM + view.panX;
  const y = yMm * view.zoom * PX_PER_MM + view.panY;
  return { x, y };
}

export function mmToPixels(mm: number, zoom: number = 1): number {
  return mm * zoom * PX_PER_MM;
}

export function pixelsToMm(px: number, zoom: number = 1): number {
  return px / (zoom * PX_PER_MM);
}

// ============ View Transform Helpers ============

export function zoomAtPoint(
  view: ViewTransform,
  screenX: number,
  screenY: number,
  newZoom: number
): ViewTransform {
  const clampedZoom = Math.max(0.25, Math.min(4, newZoom));
  const worldBefore = screenToWorld(screenX, screenY, view);
  const worldAfter = screenToWorld(screenX, screenY, { ...view, zoom: clampedZoom });
  
  return {
    zoom: clampedZoom,
    panX: view.panX + (worldAfter.xMm - worldBefore.xMm) * clampedZoom * PX_PER_MM,
    panY: view.panY + (worldAfter.yMm - worldBefore.yMm) * clampedZoom * PX_PER_MM,
  };
}

export function fitToContainer(
  artboardWidthMm: number,
  artboardHeightMm: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 40
): ViewTransform {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;
  
  const artboardWidthPx = artboardWidthMm * PX_PER_MM;
  const artboardHeightPx = artboardHeightMm * PX_PER_MM;
  
  const scaleX = availableWidth / artboardWidthPx;
  const scaleY = availableHeight / artboardHeightPx;
  const zoom = Math.min(scaleX, scaleY, 2);
  
  const panX = (containerWidth - artboardWidthPx * zoom) / 2;
  const panY = (containerHeight - artboardHeightPx * zoom) / 2;
  
  return { zoom, panX, panY };
}

// ============ Bounding Box Helpers ============

export function getElementBounds(element: CanvasElement): BoundingBox {
  const { transform } = element;
  
  switch (element.kind) {
    case 'shape':
    case 'border':
    case 'ornament':
    case 'traced': {
      const w = element.widthMm * transform.scaleX;
      const h = element.heightMm * transform.scaleY;
      return {
        xMm: transform.xMm - w / 2,
        yMm: transform.yMm - h / 2,
        widthMm: w,
        heightMm: h,
      };
    }
    case 'basicShape': {
      const w = element.widthMm * transform.scaleX;
      const h = element.heightMm * transform.scaleY;
      return {
        xMm: transform.xMm - w / 2,
        yMm: transform.yMm - h / 2,
        widthMm: w,
        heightMm: h,
      };
    }
    case 'logo': {
      const w = element.widthMm * transform.scaleX;
      const h = element.heightMm * transform.scaleY;
      return {
        xMm: transform.xMm - w / 2,
        yMm: transform.yMm - h / 2,
        widthMm: w,
        heightMm: h,
      };
    }
    case 'icon': {
      const w = element.widthMm * transform.scaleX;
      const h = element.heightMm * transform.scaleY;
      return {
        xMm: transform.xMm - w / 2,
        yMm: transform.yMm - h / 2,
        widthMm: w,
        heightMm: h,
      };
    }
    case 'text': {
      const bounds = element._bounds || { width: element.fontSizeMm * element.content.length * 0.6, height: element.fontSizeMm };
      const w = bounds.width * transform.scaleX;
      const h = bounds.height * transform.scaleY;
      return {
        xMm: transform.xMm - w / 2,
        yMm: transform.yMm - h / 2,
        widthMm: w,
        heightMm: h,
      };
    }
    default:
      return { xMm: transform.xMm, yMm: transform.yMm, widthMm: 10, heightMm: 10 };
  }
}

export function getBoundsCenter(bounds: BoundingBox): { xMm: number; yMm: number } {
  return {
    xMm: bounds.xMm + bounds.widthMm / 2,
    yMm: bounds.yMm + bounds.heightMm / 2,
  };
}

export function expandBounds(bounds: BoundingBox, margin: number): BoundingBox {
  return {
    xMm: bounds.xMm - margin,
    yMm: bounds.yMm - margin,
    widthMm: bounds.widthMm + margin * 2,
    heightMm: bounds.heightMm + margin * 2,
  };
}

export function unionBounds(boundsArray: BoundingBox[]): BoundingBox | null {
  if (boundsArray.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const b of boundsArray) {
    minX = Math.min(minX, b.xMm);
    minY = Math.min(minY, b.yMm);
    maxX = Math.max(maxX, b.xMm + b.widthMm);
    maxY = Math.max(maxY, b.yMm + b.heightMm);
  }
  
  return {
    xMm: minX,
    yMm: minY,
    widthMm: maxX - minX,
    heightMm: maxY - minY,
  };
}

export function boundsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.xMm + a.widthMm < b.xMm ||
    b.xMm + b.widthMm < a.xMm ||
    a.yMm + a.heightMm < b.yMm ||
    b.yMm + b.heightMm < a.yMm
  );
}

export function pointInBounds(xMm: number, yMm: number, bounds: BoundingBox): boolean {
  return (
    xMm >= bounds.xMm &&
    xMm <= bounds.xMm + bounds.widthMm &&
    yMm >= bounds.yMm &&
    yMm <= bounds.yMm + bounds.heightMm
  );
}

// ============ Hit Testing ============

export function hitTestElements(
  xMm: number,
  yMm: number,
  elements: CanvasElement[]
): CanvasElement | null {
  // Test in reverse order (top-most first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.visible === false || el.locked === true) continue;
    
    const bounds = getElementBounds(el);
    if (pointInBounds(xMm, yMm, bounds)) {
      return el;
    }
  }
  return null;
}

export function getElementsInRect(
  rect: BoundingBox,
  elements: CanvasElement[]
): CanvasElement[] {
  return elements.filter(el => {
    if (el.visible === false || el.locked === true) return false;
    const bounds = getElementBounds(el);
    return boundsIntersect(rect, bounds);
  });
}

// ============ Selection Bounds ============

export function getSelectionBounds(
  selectedIds: string[],
  elements: CanvasElement[]
): BoundingBox | null {
  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  if (selectedElements.length === 0) return null;
  
  const boundsArray = selectedElements.map(getElementBounds);
  return unionBounds(boundsArray);
}
