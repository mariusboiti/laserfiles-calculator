/**
 * PathOps-based inset/offset operations for borders
 * Lazy-loads PathKit WASM for true geometric inset operations
 */

import { loadPathOps, type PathOps } from '../../../../geometry/pathops/loadPathOps';

let pathOpsInstance: PathOps | null = null;
let loadingPromise: Promise<PathOps> | null = null;

/**
 * Lazy-load PathOps instance
 */
async function getPathOps(): Promise<PathOps> {
  if (pathOpsInstance) return pathOpsInstance;
  
  if (!loadingPromise) {
    loadingPromise = loadPathOps().then(pk => {
      pathOpsInstance = pk;
      return pk;
    });
  }
  
  return loadingPromise;
}

/**
 * Check if PathOps is already loaded (for sync checks)
 */
export function isPathOpsReady(): boolean {
  return pathOpsInstance !== null;
}

/**
 * Inset a path by a given distance (shrink inward)
 * Uses stroke-then-difference technique
 */
export async function insetPath(pathD: string, insetMm: number): Promise<string> {
  if (!pathD || insetMm <= 0) return pathD;
  
  try {
    const pk = await getPathOps();
    const original = pk.fromSVG(pathD);
    
    // Create inset by stroking the path and subtracting from original
    // This is a workaround since PathKit doesn't have direct inset
    const strokePath = pk.strokeToPath(original, {
      width: insetMm * 2,
      join: 'round',
      cap: 'round',
    });
    
    // Difference: original - stroke gives us the inset shape
    const inset = pk.difference(original, strokePath);
    const result = pk.toSVG(inset);
    
    // Cleanup
    pk.deletePath(original);
    pk.deletePath(strokePath);
    pk.deletePath(inset);
    
    return result || pathD;
  } catch (error) {
    console.warn('[PathOps] Inset failed, returning original:', error);
    return pathD;
  }
}

/**
 * Offset a path outward by a given distance (expand)
 * Uses stroke-then-union technique
 */
export async function offsetPath(pathD: string, offsetMm: number): Promise<string> {
  if (!pathD || offsetMm <= 0) return pathD;
  
  try {
    const pk = await getPathOps();
    const original = pk.fromSVG(pathD);
    
    // Create offset by stroking the path and unioning with original
    const strokePath = pk.strokeToPath(original, {
      width: offsetMm * 2,
      join: 'round',
      cap: 'round',
    });
    
    // Union: original + stroke gives us the offset shape
    const offset = pk.union(original, strokePath);
    const result = pk.toSVG(offset);
    
    // Cleanup
    pk.deletePath(original);
    pk.deletePath(strokePath);
    pk.deletePath(offset);
    
    return result || pathD;
  } catch (error) {
    console.warn('[PathOps] Offset failed, returning original:', error);
    return pathD;
  }
}

/**
 * Generate border path at a specific inset distance
 * Returns just the border ring (not filled shape)
 */
export async function generateBorderPath(
  outerPathD: string,
  insetMm: number,
  strokeWidthMm: number = 0.3
): Promise<string> {
  if (!outerPathD || insetMm <= 0) return outerPathD;
  
  try {
    const pk = await getPathOps();
    const outer = pk.fromSVG(outerPathD);
    
    // Create inner border by stroking inward
    const strokePath = pk.strokeToPath(outer, {
      width: insetMm * 2,
      join: 'round',
      cap: 'round',
    });
    
    // The border ring is the difference
    const inner = pk.difference(outer, strokePath);
    
    // Get just the outline of the inner shape
    const borderStroke = pk.strokeToPath(inner, {
      width: strokeWidthMm,
      join: 'round',
      cap: 'round',
    });
    
    const result = pk.toSVG(inner);
    
    // Cleanup
    pk.deletePath(outer);
    pk.deletePath(strokePath);
    pk.deletePath(inner);
    pk.deletePath(borderStroke);
    
    return result || outerPathD;
  } catch (error) {
    console.warn('[PathOps] Border generation failed:', error);
    return outerPathD;
  }
}

/**
 * Generate double border paths (two concentric rings)
 */
export async function generateDoubleBorderPaths(
  outerPathD: string,
  inset1Mm: number,
  inset2Mm: number
): Promise<{ border1: string; border2: string }> {
  const border1 = await insetPath(outerPathD, inset1Mm);
  const border2 = await insetPath(outerPathD, inset2Mm);
  return { border1, border2 };
}

/**
 * Get bounds of a path
 */
export async function getPathBounds(pathD: string): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  if (!pathD) return { x: 0, y: 0, width: 0, height: 0 };
  
  try {
    const pk = await getPathOps();
    const path = pk.fromSVG(pathD);
    const bounds = pk.getBounds(path);
    pk.deletePath(path);
    return bounds;
  } catch (error) {
    console.warn('[PathOps] getBounds failed:', error);
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/**
 * Preload PathOps (call early to avoid delay on first use)
 */
export async function preloadPathOps(): Promise<void> {
  try {
    await getPathOps();
    console.log('[PathOps] Preloaded successfully');
  } catch (error) {
    console.warn('[PathOps] Preload failed:', error);
  }
}
