/**
 * Canvas Coordinate System Utilities
 * Handles mm <-> screen pixel conversion for the interactive canvas editor
 */

export interface ViewTransform {
  panX: number;      // Pan offset in pixels
  panY: number;      // Pan offset in pixels
  zoom: number;      // Zoom level (1 = 100%)
}

export interface Point {
  x: number;
  y: number;
}

export interface PointMm {
  xMm: number;
  yMm: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundsMm {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

/**
 * Default pixels per mm at zoom=1
 * This determines the base scale of the canvas
 */
export const DEFAULT_PX_PER_MM = 2;

/**
 * Create default view transform
 */
export function createDefaultViewTransform(): ViewTransform {
  return {
    panX: 0,
    panY: 0,
    zoom: 1,
  };
}

/**
 * Convert screen coordinates to world mm coordinates
 */
export function screenToWorld(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  viewTransform: ViewTransform,
  pxPerMm: number = DEFAULT_PX_PER_MM
): PointMm {
  // Get position relative to container
  const relX = clientX - containerRect.left;
  const relY = clientY - containerRect.top;

  // Remove pan and zoom to get world coordinates
  const worldX = (relX - viewTransform.panX) / (viewTransform.zoom * pxPerMm);
  const worldY = (relY - viewTransform.panY) / (viewTransform.zoom * pxPerMm);

  return { xMm: worldX, yMm: worldY };
}

/**
 * Convert world mm coordinates to screen coordinates
 */
export function worldToScreen(
  xMm: number,
  yMm: number,
  viewTransform: ViewTransform,
  pxPerMm: number = DEFAULT_PX_PER_MM
): Point {
  const xPx = xMm * pxPerMm * viewTransform.zoom + viewTransform.panX;
  const yPx = yMm * pxPerMm * viewTransform.zoom + viewTransform.panY;

  return { x: xPx, y: yPx };
}

/**
 * Convert a distance in mm to screen pixels
 */
export function mmToPixels(
  mm: number,
  viewTransform: ViewTransform,
  pxPerMm: number = DEFAULT_PX_PER_MM
): number {
  return mm * pxPerMm * viewTransform.zoom;
}

/**
 * Convert a distance in screen pixels to mm
 */
export function pixelsToMm(
  px: number,
  viewTransform: ViewTransform,
  pxPerMm: number = DEFAULT_PX_PER_MM
): number {
  return px / (pxPerMm * viewTransform.zoom);
}

/**
 * Calculate view transform to fit artboard in container with padding
 */
export function fitToContainer(
  artboardWmm: number,
  artboardHmm: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 40,
  pxPerMm: number = DEFAULT_PX_PER_MM
): ViewTransform {
  const availableWidth = containerWidth - padding * 2;
  const availableHeight = containerHeight - padding * 2;

  const artboardWidthPx = artboardWmm * pxPerMm;
  const artboardHeightPx = artboardHmm * pxPerMm;

  // Calculate zoom to fit
  const zoomX = availableWidth / artboardWidthPx;
  const zoomY = availableHeight / artboardHeightPx;
  const zoom = Math.min(zoomX, zoomY, 2); // Cap at 200%

  // Center the artboard
  const scaledWidth = artboardWidthPx * zoom;
  const scaledHeight = artboardHeightPx * zoom;

  const panX = (containerWidth - scaledWidth) / 2;
  const panY = (containerHeight - scaledHeight) / 2;

  return { panX, panY, zoom };
}

/**
 * Apply zoom centered on a point
 */
export function zoomAtPoint(
  currentTransform: ViewTransform,
  newZoom: number,
  centerX: number,
  centerY: number,
  pxPerMm: number = DEFAULT_PX_PER_MM
): ViewTransform {
  // Clamp zoom
  const clampedZoom = Math.max(0.1, Math.min(10, newZoom));

  // Get world position of center point before zoom
  const worldBefore = screenToWorld(
    centerX,
    centerY,
    { left: 0, top: 0 } as DOMRect,
    currentTransform,
    pxPerMm
  );

  // Calculate new pan to keep the same world point under the cursor
  const panX = centerX - worldBefore.xMm * pxPerMm * clampedZoom;
  const panY = centerY - worldBefore.yMm * pxPerMm * clampedZoom;

  return { panX, panY, zoom: clampedZoom };
}

/**
 * Calculate bounding box of multiple points in mm
 */
export function getBoundingBox(points: PointMm[]): BoundsMm | null {
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.xMm);
    minY = Math.min(minY, p.yMm);
    maxX = Math.max(maxX, p.xMm);
    maxY = Math.max(maxY, p.yMm);
  }

  return {
    xMm: minX,
    yMm: minY,
    widthMm: maxX - minX,
    heightMm: maxY - minY,
  };
}

/**
 * Get center point of bounds
 */
export function getBoundsCenter(bounds: BoundsMm): PointMm {
  return {
    xMm: bounds.xMm + bounds.widthMm / 2,
    yMm: bounds.yMm + bounds.heightMm / 2,
  };
}

/**
 * Expand bounds by a margin
 */
export function expandBounds(bounds: BoundsMm, marginMm: number): BoundsMm {
  return {
    xMm: bounds.xMm - marginMm,
    yMm: bounds.yMm - marginMm,
    widthMm: bounds.widthMm + marginMm * 2,
    heightMm: bounds.heightMm + marginMm * 2,
  };
}

/**
 * Check if a point is inside bounds
 */
export function pointInBounds(point: PointMm, bounds: BoundsMm): boolean {
  return (
    point.xMm >= bounds.xMm &&
    point.xMm <= bounds.xMm + bounds.widthMm &&
    point.yMm >= bounds.yMm &&
    point.yMm <= bounds.yMm + bounds.heightMm
  );
}

/**
 * Calculate distance between two points in mm
 */
export function distance(a: PointMm, b: PointMm): number {
  const dx = b.xMm - a.xMm;
  const dy = b.yMm - a.yMm;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle from point a to point b in degrees
 */
export function angleDeg(center: PointMm, point: PointMm): number {
  const dx = point.xMm - center.xMm;
  const dy = point.yMm - center.yMm;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap angle to increments (e.g., 15 degrees)
 */
export function snapAngle(angle: number, increment: number = 15): number {
  return Math.round(angle / increment) * increment;
}

/**
 * Apply transform to a point
 */
export function applyTransform(
  point: PointMm,
  transform: { xMm: number; yMm: number; rotateDeg: number; scaleX: number; scaleY: number }
): PointMm {
  // Scale
  let x = point.xMm * transform.scaleX;
  let y = point.yMm * transform.scaleY;

  // Rotate around origin
  if (transform.rotateDeg !== 0) {
    const rad = transform.rotateDeg * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    x = rx;
    y = ry;
  }

  // Translate
  x += transform.xMm;
  y += transform.yMm;

  return { xMm: x, yMm: y };
}

/**
 * Get SVG transform string from element transform
 */
export function getSvgTransformString(
  transform: { xMm: number; yMm: number; rotateDeg: number; scaleX: number; scaleY: number }
): string {
  const parts: string[] = [];

  if (transform.xMm !== 0 || transform.yMm !== 0) {
    parts.push(`translate(${transform.xMm}, ${transform.yMm})`);
  }

  if (transform.rotateDeg !== 0) {
    parts.push(`rotate(${transform.rotateDeg})`);
  }

  if (transform.scaleX !== 1 || transform.scaleY !== 1) {
    parts.push(`scale(${transform.scaleX}, ${transform.scaleY})`);
  }

  return parts.join(' ');
}
