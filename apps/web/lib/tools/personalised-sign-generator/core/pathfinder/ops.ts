/**
 * Pathfinder Operations for Sign Generator
 * Wraps PathOps WASM for boolean operations on selected elements
 */

import { loadPathOps, type PathOps } from '../../../../geometry/pathops';
import type { Element, ShapeElement, TextElement, EngraveSketchElement, ElementTransform } from '../../types/signPro';
import { generateId } from '../../types/signPro';

export type PathfinderOp = 'union' | 'subtract' | 'intersect' | 'xor';

export interface PathfinderResult {
  success: boolean;
  resultPathD?: string;
  error?: string;
}

let pathOpsInstance: PathOps | null = null;

/**
 * Initialize PathOps if not already loaded
 */
export async function initPathfinder(): Promise<boolean> {
  if (pathOpsInstance) return true;
  
  try {
    pathOpsInstance = await loadPathOps();
    return true;
  } catch (e) {
    console.error('[Pathfinder] Failed to load PathOps:', e);
    return false;
  }
}

/**
 * Check if PathOps is ready
 */
export function isPathfinderReady(): boolean {
  return pathOpsInstance !== null;
}

/**
 * Get path data from element, applying transforms
 */
export function getElementPathD(element: Element): string | null {
  switch (element.kind) {
    case 'shape':
      return element.svgPathD;
    case 'text':
      return element._pathD || null;
    case 'engraveSketch':
      // Combine all paths
      return element.svgPathD.length > 0 ? element.svgPathD.join(' ') : null;
    case 'engraveImage':
      // Images cannot be used in pathfinder ops
      return null;
    default:
      return null;
  }
}

/**
 * Apply element transform to path string
 */
export function applyTransformToPath(pathD: string, transform: ElementTransform): string {
  if (!pathOpsInstance) return pathD;
  
  try {
    const path = pathOpsInstance.fromSVG(pathD);
    if (!path) return pathD;

    // Build transform matrix [a, b, c, d, e, f] for 2D affine transform
    // translate(x, y) rotate(deg) scale(sx, sy)
    const { xMm, yMm, rotateDeg, scaleX, scaleY } = transform;
    
    const rad = rotateDeg * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Combined matrix: translate * rotate * scale
    // [a c e]   [cos -sin 0]   [sx 0  0]   [cos*sx -sin*sy tx]
    // [b d f] = [sin  cos 0] * [0  sy 0] = [sin*sx  cos*sy ty]
    // [0 0 1]   [0    0   1]   [0  0  1]   [0       0      1 ]
    const a = cos * scaleX;
    const b = sin * scaleX;
    const c = -sin * scaleY;
    const d = cos * scaleY;
    const e = xMm;
    const f = yMm;

    const matrix = [a, b, c, d, e, f];
    const transformed = pathOpsInstance.transform(path, matrix);
    const result = pathOpsInstance.toSVG(transformed);

    pathOpsInstance.deletePath(path);
    pathOpsInstance.deletePath(transformed);

    return result || pathD;
  } catch (err) {
    console.warn('[Pathfinder] Transform failed:', err);
    return pathD;
  }
}

/**
 * Perform union operation on multiple paths
 */
export async function pathUnion(paths: string[]): Promise<PathfinderResult> {
  if (!await initPathfinder() || !pathOpsInstance) {
    return { success: false, error: 'PathOps not available' };
  }

  if (paths.length === 0) {
    return { success: false, error: 'No paths provided' };
  }

  if (paths.length === 1) {
    return { success: true, resultPathD: paths[0] };
  }

  try {
    let result = pathOpsInstance.fromSVG(paths[0]);

    for (let i = 1; i < paths.length; i++) {
      const next = pathOpsInstance.fromSVG(paths[i]);
      const newResult = pathOpsInstance.union(result, next);
      pathOpsInstance.deletePath(result);
      pathOpsInstance.deletePath(next);
      result = newResult;
    }

    const resultPathD = pathOpsInstance.toSVG(result);
    pathOpsInstance.deletePath(result);

    if (!resultPathD) {
      return { success: false, error: 'Union produced empty result' };
    }

    return { success: true, resultPathD };
  } catch (err) {
    return { success: false, error: `Union failed: ${err}` };
  }
}

/**
 * Perform subtract operation (first path minus all others)
 */
export async function pathSubtract(basePath: string, subtractPaths: string[]): Promise<PathfinderResult> {
  if (!await initPathfinder() || !pathOpsInstance) {
    return { success: false, error: 'PathOps not available' };
  }

  if (!basePath) {
    return { success: false, error: 'No base path provided' };
  }

  try {
    let result = pathOpsInstance.fromSVG(basePath);

    for (const subtractPathD of subtractPaths) {
      const subtractPath = pathOpsInstance.fromSVG(subtractPathD);
      const newResult = pathOpsInstance.difference(result, subtractPath);
      pathOpsInstance.deletePath(result);
      pathOpsInstance.deletePath(subtractPath);
      result = newResult;
    }

    const resultPathD = pathOpsInstance.toSVG(result);
    pathOpsInstance.deletePath(result);

    if (!resultPathD) {
      return { success: false, error: 'Subtract produced empty result' };
    }

    return { success: true, resultPathD };
  } catch (err) {
    return { success: false, error: `Subtract failed: ${err}` };
  }
}

/**
 * Perform intersect operation on multiple paths
 */
export async function pathIntersect(paths: string[]): Promise<PathfinderResult> {
  if (!await initPathfinder() || !pathOpsInstance) {
    return { success: false, error: 'PathOps not available' };
  }

  if (paths.length < 2) {
    return { success: false, error: 'Need at least 2 paths for intersection' };
  }

  try {
    // PathKit uses op() with INTERSECT flag
    const pk = (pathOpsInstance as any);
    let result = pk.fromSVG(paths[0]);

    for (let i = 1; i < paths.length; i++) {
      const next = pk.fromSVG(paths[i]);
      const aCopy = result.copy();
      const bCopy = next.copy();
      
      // INTERSECT = 1 in PathKit
      aCopy.op(bCopy, 1); // PathOp.INTERSECT
      
      pk.deletePath(result);
      pk.deletePath(next);
      pk.deletePath(bCopy);
      result = aCopy;
    }

    const resultPathD = pk.toSVG(result);
    pk.deletePath(result);

    if (!resultPathD) {
      return { success: false, error: 'Intersect produced empty result' };
    }

    return { success: true, resultPathD };
  } catch (err) {
    return { success: false, error: `Intersect failed: ${err}` };
  }
}

/**
 * Perform XOR operation on multiple paths
 */
export async function pathXor(paths: string[]): Promise<PathfinderResult> {
  if (!await initPathfinder() || !pathOpsInstance) {
    return { success: false, error: 'PathOps not available' };
  }

  if (paths.length < 2) {
    return { success: false, error: 'Need at least 2 paths for XOR' };
  }

  try {
    // PathKit uses op() with XOR flag
    const pk = (pathOpsInstance as any);
    let result = pk.fromSVG(paths[0]);

    for (let i = 1; i < paths.length; i++) {
      const next = pk.fromSVG(paths[i]);
      const aCopy = result.copy();
      const bCopy = next.copy();
      
      // XOR = 3 in PathKit
      aCopy.op(bCopy, 3); // PathOp.XOR
      
      pk.deletePath(result);
      pk.deletePath(next);
      pk.deletePath(bCopy);
      result = aCopy;
    }

    const resultPathD = pk.toSVG(result);
    pk.deletePath(result);

    if (!resultPathD) {
      return { success: false, error: 'XOR produced empty result' };
    }

    return { success: true, resultPathD };
  } catch (err) {
    return { success: false, error: `XOR failed: ${err}` };
  }
}

/**
 * Execute pathfinder operation on elements
 */
export async function executePathfinderOp(
  op: PathfinderOp,
  elements: Array<{ element: Element; transform: ElementTransform }>
): Promise<PathfinderResult> {
  // Get transformed paths from elements
  const paths: string[] = [];
  
  for (const { element, transform } of elements) {
    const pathD = getElementPathD(element);
    if (!pathD) {
      return { success: false, error: `Element ${element.id} has no path data` };
    }
    
    const transformedPath = applyTransformToPath(pathD, transform);
    paths.push(transformedPath);
  }

  if (paths.length < 2) {
    return { success: false, error: 'Need at least 2 elements for pathfinder operations' };
  }

  switch (op) {
    case 'union':
      return pathUnion(paths);
    case 'subtract':
      return pathSubtract(paths[0], paths.slice(1));
    case 'intersect':
      return pathIntersect(paths);
    case 'xor':
      return pathXor(paths);
    default:
      return { success: false, error: `Unknown operation: ${op}` };
  }
}

/**
 * Create a new shape element from pathfinder result
 */
export function createShapeFromResult(
  resultPathD: string,
  style: 'CUT' | 'ENGRAVE'
): ShapeElement {
  return {
    id: generateId(),
    kind: 'shape',
    source: 'builtin',
    svgPathD: resultPathD,
    style,
    transform: {
      xMm: 0,
      yMm: 0,
      rotateDeg: 0,
      scaleX: 1,
      scaleY: 1,
    },
  };
}
