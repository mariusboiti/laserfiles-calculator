/**
 * PathOps WASM Client
 * Lazy-loads PathKit WASM and provides geometry operations for boolean path operations
 */

let pathKitInstance: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Load PathKit WASM (lazy, cached)
 */
export async function loadPathOps(): Promise<any> {
  if (pathKitInstance) {
    return pathKitInstance;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      console.log('[Jigsaw PathKit] Loading WASM...');
      
      // Dynamic import from npm package
      const PathKitInit = (await import('pathkit-wasm')).default;
      
      // Initialize with WASM from CDN with timeout
      const initPromise = PathKitInit({
        locateFile: (file: string) => {
          const url = `https://unpkg.com/pathkit-wasm@1.0.0/bin/${file}`;
          console.log('[Jigsaw PathKit] Loading:', url);
          return url;
        }
      });

      const timeoutMs = 15000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`PathKit WASM load timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      pathKitInstance = await Promise.race([initPromise, timeoutPromise]);
      
      console.log('[Jigsaw PathKit] Loaded successfully!');
      return pathKitInstance;
    } catch (error) {
      console.error('[Jigsaw PathKit] Failed to load:', error);
      loadingPromise = null;
      throw error;
    }
  })();
  
  return loadingPromise;
}

/**
 * PathOps wrapper for common operations using real PathKit WASM
 */
export class PathOps {
  private pk: any;
  
  constructor(PathKit: any) {
    this.pk = PathKit;
  }
  
  /**
   * Parse SVG path string to PathKit path
   */
  fromSVGString(d: string): any {
    if (!d || d.trim() === '') return this.pk.NewPath();
    try {
      return this.pk.FromSVGString(d);
    } catch (e) {
      console.warn('[PathOps] Failed to parse SVG:', e);
      return this.pk.NewPath();
    }
  }
  
  /**
   * Convert PathKit path to SVG string
   */
  toSVGString(path: any): string {
    if (!path) return '';
    try {
      return path.toSVGString();
    } catch (e) {
      console.warn('[PathOps] Failed to convert to SVG:', e);
      return '';
    }
  }
  
  /**
   * Union multiple paths
   */
  union(paths: any[]): any {
    if (paths.length === 0) return this.pk.NewPath();
    if (paths.length === 1) return paths[0].copy();
    
    try {
      let result = paths[0].copy();
      for (let i = 1; i < paths.length; i++) {
        const bCopy = paths[i].copy();
        result.op(bCopy, this.pk.PathOp.UNION);
        bCopy.delete();
      }
      return result;
    } catch (e) {
      console.warn('[PathOps] Union failed:', e);
      return this.pk.NewPath();
    }
  }
  
  /**
   * Difference (A - B)
   */
  diff(pathA: any, pathB: any): any {
    if (!pathA) return this.pk.NewPath();
    if (!pathB) return pathA.copy();
    try {
      const aCopy = pathA.copy();
      const bCopy = pathB.copy();
      aCopy.op(bCopy, this.pk.PathOp.DIFFERENCE);
      bCopy.delete();
      return aCopy;
    } catch (e) {
      console.warn('[PathOps] Difference failed:', e);
      return pathA.copy();
    }
  }
  
  /**
   * Intersection (A ∩ B) - clips pathA to pathB
   */
  intersect(pathA: any, pathB: any): any {
    if (!pathA || !pathB) return this.pk.NewPath();
    try {
      const aCopy = pathA.copy();
      const bCopy = pathB.copy();
      aCopy.op(bCopy, this.pk.PathOp.INTERSECT);
      bCopy.delete();
      return aCopy;
    } catch (e) {
      console.warn('[PathOps] Intersect failed:', e);
      return this.pk.NewPath();
    }
  }
  
  /**
   * Simplify path (remove self-intersections, redundant points)
   */
  simplify(path: any): any {
    if (!path) return this.pk.NewPath();
    try {
      const copy = path.copy();
      copy.simplify();
      return copy;
    } catch (e) {
      console.warn('[PathOps] Simplify failed:', e);
      return path.copy();
    }
  }
  
  /**
   * Create rectangle path
   */
  rect(x: number, y: number, w: number, h: number): any {
    const path = this.pk.NewPath();
    path.moveTo(x, y);
    path.lineTo(x + w, y);
    path.lineTo(x + w, y + h);
    path.lineTo(x, y + h);
    path.close();
    return path;
  }
  
  /**
   * Create circle path
   */
  circle(cx: number, cy: number, r: number): any {
    const path = this.pk.NewPath();
    path.moveTo(cx + r, cy);
    path.arc(cx, cy, r, 0, Math.PI * 2, false);
    path.close();
    return path;
  }
  
  /**
   * Delete path (free memory)
   */
  delete(path: any): void {
    if (path && typeof path.delete === 'function') {
      try {
        path.delete();
      } catch (e) {
        // Ignore deletion errors
      }
    }
  }
}

/**
 * Get PathOps instance (loads WASM if needed)
 */
export async function getPathOps(): Promise<PathOps> {
  const PathKit = await loadPathOps();
  return new PathOps(PathKit);
}
