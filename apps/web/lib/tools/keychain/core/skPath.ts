/**
 * SkPath Utilities - SVG path to Skia path conversion and operations
 */

import type { CanvasKit, Path } from 'canvaskit-wasm';
import { loadSkia, getSkia } from './skia';

/**
 * Create SkPath from SVG path d attribute
 */
export function fromSvgPathD(ck: CanvasKit, d: string): Path | null {
  if (!d || d.trim().length === 0) {
    return null;
  }
  
  try {
    const path = ck.Path.MakeFromSVGString(d);
    return path;
  } catch (e) {
    console.error('Failed to parse SVG path:', e);
    return null;
  }
}

/**
 * Create a transformed copy of a path (scale + translate)
 */
export function transformPath(
  ck: CanvasKit, 
  path: Path, 
  scaleX: number, 
  scaleY: number, 
  translateX: number, 
  translateY: number
): Path {
  const copy = path.copy();
  
  // Create transformation matrix: scale then translate
  // Matrix is [scaleX, skewX, transX, skewY, scaleY, transY, persp0, persp1, persp2]
  const matrix = [
    scaleX, 0, translateX,
    0, scaleY, translateY,
    0, 0, 1
  ];
  
  copy.transform(matrix);
  return copy;
}

/**
 * Translate a path
 */
export function translatePath(ck: CanvasKit, path: Path, dx: number, dy: number): Path {
  return transformPath(ck, path, 1, 1, dx, dy);
}

/**
 * Scale a path uniformly
 */
export function scalePath(ck: CanvasKit, path: Path, scale: number): Path {
  return transformPath(ck, path, scale, scale, 0, 0);
}

/**
 * Scale and translate a path
 */
export function scaleAndTranslatePath(
  ck: CanvasKit, 
  path: Path, 
  scale: number, 
  dx: number, 
  dy: number
): Path {
  return transformPath(ck, path, scale, scale, dx, dy);
}

/**
 * Union multiple paths into one
 */
export function unionPaths(ck: CanvasKit, paths: Path[]): Path | null {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0].copy();
  
  let result = paths[0].copy();
  
  for (let i = 1; i < paths.length; i++) {
    const united = ck.Path.MakeFromOp(result, paths[i], ck.PathOp.Union);
    result.delete();
    
    if (!united) {
      console.warn('Union failed at path', i);
      return null;
    }
    
    result = united;
  }
  
  return result;
}

/**
 * Difference: subtract path B from path A
 */
export function differencePaths(ck: CanvasKit, pathA: Path, pathB: Path): Path | null {
  const result = ck.Path.MakeFromOp(pathA, pathB, ck.PathOp.Difference);
  return result;
}

/**
 * Create offset path using stroke expansion
 * This simulates offset by stroking the path and converting to fill
 */
export function createOffsetPath(
  ck: CanvasKit, 
  path: Path, 
  offsetMm: number
): Path | null {
  try {
    // Stroke width is 2x offset (expands both sides)
    const strokeWidth = offsetMm * 2;
    
    // Create a paint with stroke settings
    const paint = new ck.Paint();
    paint.setStyle(ck.PaintStyle.Stroke);
    paint.setStrokeWidth(strokeWidth);
    paint.setStrokeJoin(ck.StrokeJoin.Round);
    paint.setStrokeCap(ck.StrokeCap.Round);
    paint.setStrokeMiter(1);
    
    // Use Path.copy().stroke() with StrokeOpts
    const pathCopy = path.copy();
    const strokeSuccess = pathCopy.stroke({
      width: strokeWidth,
      miter_limit: 1,
      join: ck.StrokeJoin.Round,
      cap: ck.StrokeCap.Round,
    });
    
    paint.delete();
    
    if (!strokeSuccess) {
      console.warn('Failed to stroke path');
      pathCopy.delete();
      return null;
    }
    
    // pathCopy is now the stroked (outline) version
    // Union with original to fill interior
    const result = ck.Path.MakeFromOp(pathCopy, path, ck.PathOp.Union);
    pathCopy.delete();
    
    return result;
  } catch (e) {
    console.error('createOffsetPath error:', e);
    return null;
  }
}

/**
 * Create a circle path
 */
export function createCirclePath(ck: CanvasKit, cx: number, cy: number, radius: number): Path {
  const path = new ck.Path();
  path.addCircle(cx, cy, radius);
  return path;
}

/**
 * Create a rectangle path
 */
export function createRectPath(ck: CanvasKit, x: number, y: number, w: number, h: number): Path {
  const path = new ck.Path();
  path.addRect([x, y, x + w, y + h]);
  return path;
}

/**
 * Create a rounded rectangle path
 */
export function createRoundRectPath(
  ck: CanvasKit, 
  x: number, y: number, 
  w: number, h: number, 
  radius: number
): Path {
  const path = new ck.Path();
  path.addRRect([x, y, x + w, y + h, radius, radius, radius, radius, radius, radius, radius, radius]);
  return path;
}

/**
 * Get path bounds as { x, y, width, height }
 */
export function getPathBounds(path: Path): { x: number; y: number; width: number; height: number } {
  const bounds = path.getBounds();
  return {
    x: bounds[0],
    y: bounds[1],
    width: bounds[2] - bounds[0],
    height: bounds[3] - bounds[1]
  };
}

/**
 * Check if path is valid (not empty)
 */
export function isValidPath(path: Path | null): boolean {
  if (!path) return false;
  const bounds = path.getBounds();
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];
  return width > 0.001 && height > 0.001;
}
