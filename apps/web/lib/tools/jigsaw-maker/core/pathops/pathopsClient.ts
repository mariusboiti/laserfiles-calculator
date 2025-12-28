/**
 * PathOps WASM Client
 * Lazy-loads PathKit/CanvasKit WASM and provides geometry operations
 * Falls back to mock implementation if WASM fails to load
 */

import { PathOpsMock, getPathOpsMock } from './pathopsMock';

let pathKitInstance: any = null;
let loadingPromise: Promise<any> | null = null;
let useMock = false;

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
      // Try to load PathKit from CDN
      const PathKitInit = (window as any).PathKitInit;
      
      if (!PathKitInit) {
        // Dynamically load PathKit script
        await loadPathKitScript();
      }
      
      const PathKit = await (window as any).PathKitInit({
        locateFile: (file: string) => `https://unpkg.com/pathkit-wasm@0.8.1/bin/${file}`
      });
      
      pathKitInstance = PathKit;
      useMock = false;
      console.log('PathKit WASM loaded successfully');
      return PathKit;
    } catch (error) {
      console.warn('Failed to load PathKit WASM, using mock implementation:', error);
      useMock = true;
      pathKitInstance = await getPathOpsMock();
      return pathKitInstance;
    }
  })();
  
  return loadingPromise;
}

/**
 * Load PathKit script dynamically
 */
function loadPathKitScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/pathkit-wasm@0.8.1/bin/pathkit.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PathKit script'));
    document.head.appendChild(script);
  });
}

/**
 * PathOps wrapper for common operations
 * Works with both real PathKit WASM and mock implementation
 */
export class PathOps {
  private PathKit: any;
  private isMock: boolean;
  
  constructor(PathKit: any, isMock: boolean = false) {
    this.PathKit = PathKit;
    this.isMock = isMock;
  }
  
  /**
   * Parse SVG path string to PathKit path
   */
  fromSVGString(d: string): any {
    if (this.isMock) {
      return { d, toSVGString: () => d };
    }
    return this.PathKit.FromSVGString(d);
  }
  
  /**
   * Convert PathKit path to SVG string
   */
  toSVGString(path: any): string {
    if (this.isMock) {
      return this.PathKit.toSVGString(path);
    }
    return path.toSVGString();
  }
  
  /**
   * Union multiple paths
   */
  union(paths: any[]): any {
    if (this.isMock) {
      return this.PathKit.union(paths);
    }
    
    if (paths.length === 0) return null;
    if (paths.length === 1) return paths[0];
    
    let result = paths[0];
    for (let i = 1; i < paths.length; i++) {
      const next = result.op(paths[i], this.PathKit.PathOp.UNION);
      result.delete();
      result = next;
    }
    return result;
  }
  
  /**
   * Difference (A - B)
   */
  diff(pathA: any, pathB: any): any {
    if (this.isMock) {
      return this.PathKit.diff(pathA, pathB);
    }
    return pathA.op(pathB, this.PathKit.PathOp.DIFFERENCE);
  }
  
  /**
   * Intersection (A ∩ B)
   */
  intersect(pathA: any, pathB: any): any {
    if (this.isMock) {
      return this.PathKit.intersect(pathA, pathB);
    }
    return pathA.op(pathB, this.PathKit.PathOp.INTERSECT);
  }
  
  /**
   * XOR (A ⊕ B)
   */
  xor(pathA: any, pathB: any): any {
    if (this.isMock) {
      return pathA; // Mock doesn't support XOR
    }
    return pathA.op(pathB, this.PathKit.PathOp.XOR);
  }
  
  /**
   * Offset path (positive = outward, negative = inward)
   */
  offset(path: any, delta: number): any {
    if (this.isMock) {
      return this.PathKit.offset(path, delta);
    }
    
    // PathKit uses stroke to create offset
    const offsetPath = path.stroke({
      width: Math.abs(delta) * 2,
      join: this.PathKit.StrokeJoin.ROUND,
      cap: this.PathKit.StrokeCap.ROUND,
      miter_limit: 4,
    });
    
    if (delta < 0) {
      // For inward offset, we need to use the inner contour
      // This is a simplification; proper implementation may need more logic
      return offsetPath;
    }
    
    return offsetPath;
  }
  
  /**
   * Simplify path (remove self-intersections, redundant points)
   */
  simplify(path: any): any {
    if (this.isMock) {
      return this.PathKit.simplify(path);
    }
    return path.simplify();
  }
  
  /**
   * Create rectangle path
   */
  rect(x: number, y: number, w: number, h: number): any {
    if (this.isMock) {
      return this.PathKit.rect(x, y, w, h);
    }
    
    const path = new this.PathKit.SkPath();
    path.addRect([x, y, x + w, y + h]);
    return path;
  }
  
  /**
   * Create circle path
   */
  circle(cx: number, cy: number, r: number): any {
    if (this.isMock) {
      return this.PathKit.circle(cx, cy, r);
    }
    
    const path = new this.PathKit.SkPath();
    path.addCircle(cx, cy, r);
    return path;
  }
  
  /**
   * Delete path (free memory)
   */
  delete(path: any): void {
    if (this.isMock) {
      this.PathKit.delete(path);
      return;
    }
    
    if (path && path.delete) {
      path.delete();
    }
  }
}

/**
 * Get PathOps instance (loads WASM if needed)
 */
export async function getPathOps(): Promise<PathOps> {
  const PathKit = await loadPathOps();
  return new PathOps(PathKit, useMock);
}
