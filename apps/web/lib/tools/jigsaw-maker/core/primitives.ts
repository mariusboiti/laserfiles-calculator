/**
 * PathOps Primitives Builder
 * Creates basic shapes using PathOps WASM (rect, circle, capsule)
 */

import type { PathOps } from './pathops/pathopsClient';

/**
 * Create rectangle path
 */
export function createRect(
  pathOps: PathOps,
  x: number,
  y: number,
  width: number,
  height: number
): any {
  return pathOps.rect(x, y, width, height);
}

/**
 * Create circle path
 */
export function createCircle(
  pathOps: PathOps,
  cx: number,
  cy: number,
  radius: number
): any {
  return pathOps.circle(cx, cy, radius);
}

/**
 * Create capsule (rounded rectangle / stadium shape)
 * A capsule is a rectangle with semicircular ends
 */
export function createCapsule(
  pathOps: PathOps,
  cx: number,
  cy: number,
  width: number,
  height: number,
  orientation: 'horizontal' | 'vertical'
): any {
  if (orientation === 'horizontal') {
    // Horizontal capsule: width > height
    const radius = height / 2;
    const rectWidth = width - height;
    
    if (rectWidth <= 0) {
      // Degenerate to circle
      return createCircle(pathOps, cx, cy, radius);
    }
    
    // Center rectangle
    const rect = createRect(
      pathOps,
      cx - rectWidth / 2,
      cy - radius,
      rectWidth,
      height
    );
    
    // Left circle
    const leftCircle = createCircle(
      pathOps,
      cx - rectWidth / 2,
      cy,
      radius
    );
    
    // Right circle
    const rightCircle = createCircle(
      pathOps,
      cx + rectWidth / 2,
      cy,
      radius
    );
    
    // Union all three
    const temp1 = pathOps.union([rect, leftCircle]);
    const capsule = pathOps.union([temp1, rightCircle]);
    
    // Cleanup
    pathOps.delete(rect);
    pathOps.delete(leftCircle);
    pathOps.delete(rightCircle);
    pathOps.delete(temp1);
    
    return capsule;
  } else {
    // Vertical capsule: height > width
    const radius = width / 2;
    const rectHeight = height - width;
    
    if (rectHeight <= 0) {
      // Degenerate to circle
      return createCircle(pathOps, cx, cy, radius);
    }
    
    // Center rectangle
    const rect = createRect(
      pathOps,
      cx - radius,
      cy - rectHeight / 2,
      width,
      rectHeight
    );
    
    // Top circle
    const topCircle = createCircle(
      pathOps,
      cx,
      cy - rectHeight / 2,
      radius
    );
    
    // Bottom circle
    const bottomCircle = createCircle(
      pathOps,
      cx,
      cy + rectHeight / 2,
      radius
    );
    
    // Union all three
    const temp1 = pathOps.union([rect, topCircle]);
    const capsule = pathOps.union([temp1, bottomCircle]);
    
    // Cleanup
    pathOps.delete(rect);
    pathOps.delete(topCircle);
    pathOps.delete(bottomCircle);
    pathOps.delete(temp1);
    
    return capsule;
  }
}

/**
 * Create rounded rectangle
 */
export function createRoundedRect(
  pathOps: PathOps,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number
): any {
  if (cornerRadius <= 0) {
    return createRect(pathOps, x, y, width, height);
  }
  
  const r = Math.min(cornerRadius, width / 2, height / 2);
  
  // Center rectangle (without corners)
  const centerRect = createRect(
    pathOps,
    x + r,
    y,
    width - 2 * r,
    height
  );
  
  // Left and right strips
  const leftStrip = createRect(pathOps, x, y + r, r, height - 2 * r);
  const rightStrip = createRect(pathOps, x + width - r, y + r, r, height - 2 * r);
  
  // Four corner circles
  const topLeft = createCircle(pathOps, x + r, y + r, r);
  const topRight = createCircle(pathOps, x + width - r, y + r, r);
  const bottomLeft = createCircle(pathOps, x + r, y + height - r, r);
  const bottomRight = createCircle(pathOps, x + width - r, y + height - r, r);
  
  // Union all parts
  const parts = [centerRect, leftStrip, rightStrip, topLeft, topRight, bottomLeft, bottomRight];
  const result = pathOps.union(parts);
  
  // Cleanup
  parts.forEach(p => pathOps.delete(p));
  
  return result;
}
