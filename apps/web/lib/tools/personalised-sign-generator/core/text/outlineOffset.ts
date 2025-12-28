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

export interface OffsetResult {
  pathD: string;
  success: boolean;
  warning?: string;
}

/**
 * Generate offset outline for a path
 * Uses PathOps strokeToPath to create outline
 */
export async function offsetPath(
  pathD: string,
  offsetMm: number
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
    
    // Create offset by stroking the path
    // strokeToPath converts stroke to filled path
    const strokeWidth = offsetMm * 2; // Stroke is centered, so double for full offset
    
    const strokedPath = ops.strokeToPath(inputPath, {
      width: strokeWidth,
      join: 'round',
      cap: 'round',
      miterLimit: 4,
    });
    
    // Get the result path
    const resultPathD = ops.toSVG(strokedPath);
    
    // Cleanup
    ops.deletePath(inputPath);
    ops.deletePath(strokedPath);
    
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
  offsetMm: number
): Promise<OffsetResult> {
  if (!textPathD || textPathD.trim() === '') {
    return { pathD: '', success: false, warning: 'Empty text path' };
  }

  if (offsetMm <= 0) {
    return { pathD: '', success: false, warning: 'Offset must be positive' };
  }

  try {
    const ops = await getPathOps();
    
    // Parse the input path
    const inputPath = ops.fromSVG(textPathD);
    
    // Create stroked version (this gives us the expanded outline)
    const strokeWidth = offsetMm * 2;
    const strokedPath = ops.strokeToPath(inputPath, {
      width: strokeWidth,
      join: 'round',
      cap: 'round',
      miterLimit: 4,
    });
    
    // Union the stroked path with original to get full outline
    const unionPath = ops.union(strokedPath, inputPath);
    
    // Get result
    const resultPathD = ops.toSVG(unionPath);
    
    // Cleanup
    ops.deletePath(inputPath);
    ops.deletePath(strokedPath);
    ops.deletePath(unionPath);
    
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
  offsetMm: number
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
      join: 'round',
      cap: 'round',
      miterLimit: 4,
    });
    
    // Union outer with original
    const expandedPath = ops.union(outerPath, inputPath);
    
    // Subtract original to get just the ring
    const ringPath = ops.difference(expandedPath, inputPath);
    
    // Get result
    const resultPathD = ops.toSVG(ringPath);
    
    // Cleanup
    ops.deletePath(inputPath);
    ops.deletePath(outerPath);
    ops.deletePath(expandedPath);
    ops.deletePath(ringPath);
    
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
