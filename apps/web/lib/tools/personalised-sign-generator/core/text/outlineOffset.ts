/**
 * Personalised Sign Generator V3 PRO - Outline Offset
 * Generate offset outlines for text using PathOps WASM
 */

import { loadPathOps, type PathOps } from '../../../../geometry/pathops/loadPathOps';

let pathOps: PathOps | null = null;

/**
 * Initialize PathOps (lazy load)
 */
async function getPathOps(): Promise<PathOps> {
  if (pathOps) return pathOps;
  pathOps = await loadPathOps();
  return pathOps;
}

/**
 * Offset a filled/closed path by a delta in mm.
 * - offsetMm > 0 expands (union with stroke)
 * - offsetMm < 0 insets (difference with stroke)
 */
export async function offsetFilledPath(
  pathD: string,
  offsetMm: number,
  options: OffsetOptions = {}
): Promise<OffsetResult> {
  if (!pathD || pathD.trim() === '') {
    return { pathD: '', success: false, warning: 'Empty path' };
  }
  if (Math.abs(offsetMm) <= 0) {
    return { pathD: '', success: false, warning: 'Offset must be non-zero' };
  }

  try {
    const ops = await getPathOps();
    const inputPath = ops.fromSVG(pathD);
    const strokeWidth = Math.abs(offsetMm) * 2;
    const band = ops.strokeToPath(inputPath, {
      width: strokeWidth,
      join: options.join ?? 'round',
      cap: options.cap ?? 'round',
      miterLimit: options.miterLimit ?? 4,
    });

    const combined = offsetMm > 0 ? ops.union(inputPath, band) : ops.difference(inputPath, band);
    const simplified = options.simplify ? ops.simplify(combined) : combined;
    const resultPathD = ops.toSVG(simplified);

    ops.deletePath(inputPath);
    ops.deletePath(band);
    ops.deletePath(combined);
    if (simplified !== combined) ops.deletePath(simplified);

    if (!resultPathD || resultPathD.trim() === '') {
      return { pathD: '', success: false, warning: 'Offset produced empty result' };
    }
    return { pathD: resultPathD, success: true };
  } catch (error) {
    console.error('[OutlineOffset] offsetFilledPath failed:', error);
    return {
      pathD: '',
      success: false,
      warning: `Offset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export interface OffsetResult {
  pathD: string;
  success: boolean;
  warning?: string;
}

export interface OffsetOptions {
  join?: 'round' | 'miter' | 'bevel';
  cap?: 'round' | 'butt' | 'square';
  miterLimit?: number;
  simplify?: boolean;
}

export async function translatePathD(pathD: string, dxMm: number, dyMm: number): Promise<string> {
  if (!pathD || pathD.trim() === '') {
    return '';
  }
  if (dxMm === 0 && dyMm === 0) {
    return pathD;
  }

  try {
    const ops = await getPathOps();
    const inputPath = ops.fromSVG(pathD);
    // PathKit expects a 3x3 SkMatrix (9 numbers), not an SVG 2D matrix (6 numbers).
    // SkMatrix layout:
    // [ a, c, e,
    //   b, d, f,
    //   0, 0, 1 ]
    const matrix = [1, 0, dxMm, 0, 1, dyMm, 0, 0, 1];
    const transformed = ops.transform(inputPath, matrix);
    const result = ops.toSVG(transformed);

    ops.deletePath(inputPath);
    ops.deletePath(transformed);

    return result || pathD;
  } catch (error) {
    console.warn('[OutlineOffset] translatePathD failed:', error);
    return pathD;
  }
}

/**
 * Generate offset outline for a path
 * Uses PathOps strokeToPath to create outline
 */
export async function offsetPath(
  pathD: string,
  offsetMm: number,
  options: OffsetOptions = {}
): Promise<OffsetResult> {
  if (!pathD || pathD.trim() === '') {
    return { pathD: '', success: false, warning: 'Empty path' };
  }

  if (Math.abs(offsetMm) <= 0) {
    return { pathD: '', success: false, warning: 'Offset must be non-zero' };
  }

  try {
    const ops = await getPathOps();
    
    // Parse the input path
    const inputPath = ops.fromSVG(pathD);
    
    const strokeWidth = Math.abs(offsetMm) * 2;

    const strokedPath = ops.strokeToPath(inputPath, {
      width: strokeWidth,
      join: options.join ?? 'round',
      cap: options.cap ?? 'round',
      miterLimit: options.miterLimit ?? 4,
    });

    const resultPath = options.simplify ? ops.simplify(strokedPath) : strokedPath;
    const resultPathD = ops.toSVG(resultPath);

    ops.deletePath(inputPath);
    ops.deletePath(strokedPath);
    if (resultPath !== strokedPath) ops.deletePath(resultPath);
    
    if (!resultPathD || resultPathD.trim() === '') {
      return { pathD: '', success: false, warning: 'Offset operation produced empty result' };
    }
    
    return { pathD: resultPathD, success: true };
  } catch (error) {
    console.error('[OutlineOffset] Failed:', error);
    return { 
      pathD: '', 
      success: false, 
      warning: `Offset failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Generate outline for text path with specified offset
 * Returns only the outer outline (difference between stroked and original)
 */
export async function generateTextOutline(
  textPathD: string,
  offsetMm: number,
  options: OffsetOptions = {}
): Promise<OffsetResult> {
  if (!textPathD || textPathD.trim() === '') {
    return { pathD: '', success: false, warning: 'Empty text path' };
  }

  if (Math.abs(offsetMm) <= 0) {
    return { pathD: '', success: false, warning: 'Offset must be non-zero' };
  }

  try {
    const ops = await getPathOps();
    
    // Parse the input path
    const inputPath = ops.fromSVG(textPathD);
    
    // Create stroked version (this gives us the expanded outline)
    const strokeWidth = Math.abs(offsetMm) * 2;
    const strokedPath = ops.strokeToPath(inputPath, {
      width: strokeWidth,
      join: options.join ?? 'round',
      cap: options.cap ?? 'round',
      miterLimit: options.miterLimit ?? 4,
    });

    const combined = offsetMm > 0 ? ops.union(strokedPath, inputPath) : ops.difference(inputPath, strokedPath);
    const simplified = options.simplify ? ops.simplify(combined) : combined;
    const resultPathD = ops.toSVG(simplified);

    ops.deletePath(inputPath);
    ops.deletePath(strokedPath);
    ops.deletePath(combined);
    if (simplified !== combined) ops.deletePath(simplified);
    
    if (!resultPathD || resultPathD.trim() === '') {
      return { pathD: '', success: false, warning: 'Outline generation produced empty result' };
    }
    
    return { pathD: resultPathD, success: true };
  } catch (error) {
    console.error('[TextOutline] Failed:', error);
    return { 
      pathD: '', 
      success: false, 
      warning: `Outline generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Generate just the outline ring (no fill inside)
 * Useful for cut operations
 */
export async function generateOutlineRing(
  pathD: string,
  offsetMm: number,
  options: OffsetOptions = {}
): Promise<OffsetResult> {
  if (!pathD || pathD.trim() === '') {
    return { pathD: '', success: false, warning: 'Empty path' };
  }

  if (offsetMm <= 0) {
    return { pathD: '', success: false, warning: 'Offset must be positive' };
  }

  try {
    const ops = await getPathOps();
    
    // Parse the input path
    const inputPath = ops.fromSVG(pathD);
    
    // Create outer stroked version
    const strokeWidth = offsetMm * 2;
    const outerPath = ops.strokeToPath(inputPath, {
      width: strokeWidth,
      join: options.join ?? 'round',
      cap: options.cap ?? 'round',
      miterLimit: options.miterLimit ?? 4,
    });
    
    // Union outer with original
    const expandedPath = ops.union(outerPath, inputPath);
    
    // Subtract original to get just the ring
    const ringPath = ops.difference(expandedPath, inputPath);
    const simplified = options.simplify ? ops.simplify(ringPath) : ringPath;
    
    // Get result
    const resultPathD = ops.toSVG(simplified);
    
    // Cleanup
    ops.deletePath(inputPath);
    ops.deletePath(outerPath);
    ops.deletePath(expandedPath);
    ops.deletePath(ringPath);
    if (simplified !== ringPath) ops.deletePath(simplified);
    
    if (!resultPathD || resultPathD.trim() === '') {
      return { pathD: '', success: false, warning: 'Outline ring generation produced empty result' };
    }
    
    return { pathD: resultPathD, success: true };
  } catch (error) {
    console.error('[OutlineRing] Failed:', error);
    return { 
      pathD: '', 
      success: false, 
      warning: `Outline ring generation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Check if PathOps is available
 */
export async function isPathOpsAvailable(): Promise<boolean> {
  try {
    await getPathOps();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate path for offset operations
 */
export function validatePathForOffset(pathD: string): { valid: boolean; warning?: string } {
  if (!pathD || pathD.trim() === '') {
    return { valid: false, warning: 'Empty path' };
  }

  // Check for basic path commands
  if (!/[MLHVCSQTAZmlhvcsqtaz]/i.test(pathD)) {
    return { valid: false, warning: 'Invalid path: no valid commands found' };
  }

  // Check for extremely long paths that might cause performance issues
  const commandCount = (pathD.match(/[MLHVCSQTAZmlhvcsqtaz]/gi) || []).length;
  if (commandCount > 10000) {
    return { valid: true, warning: `Path is very complex (${commandCount} commands) - offset may be slow` };
  }

  return { valid: true };
}
