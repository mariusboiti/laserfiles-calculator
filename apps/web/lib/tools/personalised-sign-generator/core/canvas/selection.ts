/**
 * Selection Model for Canvas Editor
 * Manages element selection, hit testing, and selection bounds
 */

import type { SignDocument, Element, Layer, ElementTransform } from '../../types/signPro';
import type { BoundsMm, PointMm } from './coords';
import { getBoundingBox, pointInBounds } from './coords';

export interface SelectionState {
  selectedIds: string[];
  activeId: string | null;
}

export interface ElementBounds {
  elementId: string;
  layerId: string;
  bounds: BoundsMm;
  locked: boolean;
}

/**
 * Create empty selection state
 */
export function createEmptySelection(): SelectionState {
  return {
    selectedIds: [],
    activeId: null,
  };
}

/**
 * Select single element
 */
export function selectElement(state: SelectionState, elementId: string): SelectionState {
  return {
    selectedIds: [elementId],
    activeId: elementId,
  };
}

/**
 * Toggle element in selection (for shift-click)
 */
export function toggleSelection(state: SelectionState, elementId: string): SelectionState {
  const isSelected = state.selectedIds.includes(elementId);
  
  if (isSelected) {
    const newSelected = state.selectedIds.filter(id => id !== elementId);
    return {
      selectedIds: newSelected,
      activeId: newSelected.length > 0 ? newSelected[newSelected.length - 1] : null,
    };
  } else {
    return {
      selectedIds: [...state.selectedIds, elementId],
      activeId: elementId,
    };
  }
}

/**
 * Add element to selection
 */
export function addToSelection(state: SelectionState, elementId: string): SelectionState {
  if (state.selectedIds.includes(elementId)) {
    return state;
  }
  return {
    selectedIds: [...state.selectedIds, elementId],
    activeId: elementId,
  };
}

/**
 * Clear selection
 */
export function clearSelection(): SelectionState {
  return createEmptySelection();
}

/**
 * Get approximate bounds for an element based on its transform and type
 */
export function getElementBounds(element: Element): BoundsMm {
  const t = element.transform;
  const scaleX = Math.abs(t.scaleX || 1);
  const scaleY = Math.abs(t.scaleY || 1);
  const sx = t.scaleX || 1;
  const sy = t.scaleY || 1;
  
  // Default bounds estimation based on element type
  let width = 50; // Default width in mm
  let height = 30; // Default height in mm

  // Local-space bounds (before transform), where (0,0) is the element's local origin
  let localX = -width / 2;
  let localY = -height / 2;
  let localW = width;
  let localH = height;

  switch (element.kind) {
    case 'text': {
      // Use cached bounds if available, otherwise estimate. Values are treated as mm.
      if (element._bounds) {
        width = element._bounds.width;
        height = element._bounds.height;
      } else {
        // Rough estimate based on font size and text length
        width = element.text.length * element.sizeMm * 0.6;
        height = element.sizeMm * 1.2;
      }

      // CanvasStage renders <text x=0 y=0 dominantBaseline="middle" and uses textAnchor for align.
      // So local origin is the text anchor point, not the center.
      if (element.align === 'center') {
        localX = -width / 2;
      } else if (element.align === 'right') {
        localX = -width;
      } else {
        localX = 0;
      }
      localY = -height / 2;
      localW = width;
      localH = height;
      break;
    }
    case 'shape': {
      // Parse path to get bounds (simplified)
      const pathBounds = getPathBounds(element.svgPathD);
      if (pathBounds) {
        localX = pathBounds.xMm;
        localY = pathBounds.yMm;
        localW = pathBounds.widthMm;
        localH = pathBounds.heightMm;
      }
      break;
    }
    case 'engraveSketch': {
      // Combine bounds of all paths
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pathD of element.svgPathD) {
        const pb = getPathBounds(pathD);
        if (pb) {
          minX = Math.min(minX, pb.xMm);
          minY = Math.min(minY, pb.yMm);
          maxX = Math.max(maxX, pb.xMm + pb.widthMm);
          maxY = Math.max(maxY, pb.yMm + pb.heightMm);
        }
      }
      if (minX !== Infinity) {
        localX = minX;
        localY = minY;
        localW = maxX - minX;
        localH = maxY - minY;
      }
      break;
    }
    case 'engraveImage': {
      // CanvasStage renders image centered at origin (x=-w/2, y=-h/2)
      localW = element.widthMm;
      localH = element.heightMm;
      localX = -localW / 2;
      localY = -localH / 2;
      break;
    }
    case 'ornament': {
      // CanvasStage renders ornament paths translated by (-50,-50) in a 0..100 viewBox.
      // So local bounds are [-50..50] on both axes.
      localX = -50;
      localY = -50;
      localW = 100;
      localH = 100;
      break;
    }
    case 'tracedPath': {
      if (element._localBounds) {
        localX = element._localBounds.xMm;
        localY = element._localBounds.yMm;
        localW = element._localBounds.widthMm;
        localH = element._localBounds.heightMm;
      } else {
        const pathBounds = getPathBounds(element.svgPathD);
        if (pathBounds) {
          localX = pathBounds.xMm;
          localY = pathBounds.yMm;
          localW = pathBounds.widthMm;
          localH = pathBounds.heightMm;
        }
      }
      break;
    }
    case 'tracedPathGroup': {
      if (element._localBounds) {
        localX = element._localBounds.xMm;
        localY = element._localBounds.yMm;
        localW = element._localBounds.widthMm;
        localH = element._localBounds.heightMm;
      } else {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pathD of element.svgPathDs) {
          const pb = getPathBounds(pathD);
          if (pb) {
            minX = Math.min(minX, pb.xMm);
            minY = Math.min(minY, pb.yMm);
            maxX = Math.max(maxX, pb.xMm + pb.widthMm);
            maxY = Math.max(maxY, pb.yMm + pb.heightMm);
          }
        }
        if (minX !== Infinity) {
          localX = minX;
          localY = minY;
          localW = maxX - minX;
          localH = maxY - minY;
        }
      }
      break;
    }
  }

  // Apply scale (including negative scale) to local bounds, then translate.
  const x0 = localX;
  const x1 = localX + localW;
  const y0 = localY;
  const y1 = localY + localH;

  const minXScaled = Math.min(x0 * sx, x1 * sx);
  const maxXScaled = Math.max(x0 * sx, x1 * sx);
  const minYScaled = Math.min(y0 * sy, y1 * sy);
  const maxYScaled = Math.max(y0 * sy, y1 * sy);

  return {
    xMm: t.xMm + minXScaled,
    yMm: t.yMm + minYScaled,
    widthMm: maxXScaled - minXScaled,
    heightMm: maxYScaled - minYScaled,
  };
}

/**
 * Parse SVG path to get approximate bounds
 */
function getPathBounds(pathD: string): BoundsMm | null {
  if (!pathD) return null;

  // Extract numbers from path commands
  const numbers = pathD.match(/-?\d+\.?\d*/g);
  if (!numbers || numbers.length < 2) return null;

  const coords: number[] = numbers.map(Number);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  // Simple extraction: assume alternating x,y pairs
  for (let i = 0; i < coords.length - 1; i += 2) {
    const x = coords[i];
    const y = coords[i + 1];
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (minX === Infinity) return null;

  return {
    xMm: minX,
    yMm: minY,
    widthMm: maxX - minX,
    heightMm: maxY - minY,
  };
}

/**
 * Get all element bounds from document
 */
export function getAllElementBounds(doc: SignDocument): ElementBounds[] {
  const result: ElementBounds[] = [];

  for (const layer of doc.layers) {
    if (!layer.visible) continue;

    for (const element of layer.elements) {
      result.push({
        elementId: element.id,
        layerId: layer.id,
        bounds: getElementBounds(element),
        locked: layer.locked,
      });
    }
  }

  return result;
}

/**
 * Hit test: find element at a point
 */
export function hitTest(
  point: PointMm,
  doc: SignDocument,
  hitTolerance: number = 2
): { elementId: string; layerId: string } | null {
  // Test in reverse layer order (top to bottom)
  const sortedLayers = [...doc.layers].sort((a, b) => b.order - a.order);

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    // Test elements in reverse order (top to bottom within layer)
    for (let i = layer.elements.length - 1; i >= 0; i--) {
      const element = layer.elements[i];
      const bounds = getElementBounds(element);
      
      // Expand bounds by tolerance
      const expandedBounds: BoundsMm = {
        xMm: bounds.xMm - hitTolerance,
        yMm: bounds.yMm - hitTolerance,
        widthMm: bounds.widthMm + hitTolerance * 2,
        heightMm: bounds.heightMm + hitTolerance * 2,
      };

      if (pointInBounds(point, expandedBounds)) {
        return { elementId: element.id, layerId: layer.id };
      }
    }
  }

  return null;
}

/**
 * Get combined bounds of selected elements
 */
export function getSelectionBounds(
  selectedIds: string[],
  doc: SignDocument
): BoundsMm | null {
  if (selectedIds.length === 0) return null;

  const points: PointMm[] = [];

  for (const layer of doc.layers) {
    for (const element of layer.elements) {
      if (!selectedIds.includes(element.id)) continue;

      const bounds = getElementBounds(element);
      
      // Add all corners of element bounds
      points.push({ xMm: bounds.xMm, yMm: bounds.yMm });
      points.push({ xMm: bounds.xMm + bounds.widthMm, yMm: bounds.yMm });
      points.push({ xMm: bounds.xMm, yMm: bounds.yMm + bounds.heightMm });
      points.push({ xMm: bounds.xMm + bounds.widthMm, yMm: bounds.yMm + bounds.heightMm });
    }
  }

  return getBoundingBox(points);
}

/**
 * Find element by ID in document
 */
export function findElementById(
  doc: SignDocument,
  elementId: string
): { element: Element; layer: Layer } | null {
  for (const layer of doc.layers) {
    const element = layer.elements.find(el => el.id === elementId);
    if (element) {
      return { element, layer };
    }
  }
  return null;
}

/**
 * Get selected elements
 */
export function getSelectedElements(
  doc: SignDocument,
  selectedIds: string[]
): Array<{ element: Element; layer: Layer }> {
  const result: Array<{ element: Element; layer: Layer }> = [];

  for (const id of selectedIds) {
    const found = findElementById(doc, id);
    if (found) {
      result.push(found);
    }
  }

  return result;
}

/**
 * Check if any selected element is in a locked layer
 */
export function hasLockedSelection(
  doc: SignDocument,
  selectedIds: string[]
): boolean {
  for (const id of selectedIds) {
    const found = findElementById(doc, id);
    if (found && found.layer.locked) {
      return true;
    }
  }
  return false;
}
