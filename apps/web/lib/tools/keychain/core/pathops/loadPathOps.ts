/**
 * PathKit (Skia PathOps) Loader
 * Lazy loads WASM and provides simple API for path operations
 */

let pathKitInstance: any = null;
let loadingPromise: Promise<PathOps> | null = null;

export interface StrokeOpts {
  width: number;
  join: 'round' | 'miter' | 'bevel';
  cap: 'round' | 'butt' | 'square';
  miterLimit?: number;
}

export interface PathOps {
  fromSVG: (d: string) => any;
  toSVG: (path: any) => string;
  union: (a: any, b: any) => any;
  difference: (a: any, b: any) => any;
  strokeToPath: (p: any, opts: StrokeOpts) => any;
  transform: (p: any, matrix: number[]) => any;
  makeCircle: (cx: number, cy: number, r: number) => any;
  makeRect: (x: number, y: number, w: number, h: number) => any;
  makeRoundedRect: (x: number, y: number, w: number, h: number, r: number) => any;
  copy: (p: any) => any;
  deletePath: (p: any) => void;
  getBounds: (p: any) => { x: number; y: number; width: number; height: number };
}

/**
 * Load PathKit WASM and return PathOps API
 */
export async function loadPathOps(): Promise<PathOps> {
  if (pathKitInstance) {
    return createAPI(pathKitInstance);
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      console.log('[PathKit] Loading WASM...');
      
      // Dynamic import
      const PathKitInit = (await import('pathkit-wasm')).default;
      
      // Initialize with WASM from CDN (guarded by timeout to avoid infinite hang)
      const initPromise = PathKitInit({
        locateFile: (file: string) => {
          const url = `https://unpkg.com/pathkit-wasm@1.0.0/bin/${file}`;
          console.log('[PathKit] Loading:', url);
          return url;
        }
      });

      const timeoutMs = 15000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`[PathKit] WASM load timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      pathKitInstance = await Promise.race([initPromise, timeoutPromise]);
      
      console.log('[PathKit] Loaded successfully!');
      return createAPI(pathKitInstance);
    } catch (error) {
      console.error('[PathKit] Failed to load:', error);
      loadingPromise = null;
      throw error;
    }
  })();
  
  return loadingPromise;
}

/**
 * Create PathOps API from PathKit instance
 */
function createAPI(pk: any): PathOps {
  return {
    fromSVG: (d: string) => {
      if (!d || d.trim() === '') return pk.NewPath();
      try {
        return pk.FromSVGString(d);
      } catch (e) {
        console.warn('[PathKit] Failed to parse SVG:', e);
        return pk.NewPath();
      }
    },
    
    toSVG: (path: any) => {
      if (!path) return '';
      try {
        return path.toSVGString();
      } catch (e) {
        console.warn('[PathKit] Failed to convert to SVG:', e);
        return '';
      }
    },
    
    union: (a: any, b: any) => {
      if (!a && !b) return pk.NewPath();
      if (!a) return b.copy();
      if (!b) return a.copy();
      try {
        // op() modifies 'a' in place and returns it
        // We need to work on copies to preserve originals
        const aCopy = a.copy();
        const bCopy = b.copy();
        aCopy.op(bCopy, pk.PathOp.UNION);
        bCopy.delete();
        return aCopy;
      } catch (e) {
        console.warn('[PathKit] Union failed:', e);
        try { return a.copy(); } catch { return pk.NewPath(); }
      }
    },
    
    difference: (a: any, b: any) => {
      if (!a) return pk.NewPath();
      if (!b) return a.copy();
      try {
        // op() modifies 'a' in place
        const aCopy = a.copy();
        const bCopy = b.copy();
        aCopy.op(bCopy, pk.PathOp.DIFFERENCE);
        bCopy.delete();
        return aCopy;
      } catch (e) {
        console.warn('[PathKit] Difference failed:', e);
        try { return a.copy(); } catch { return pk.NewPath(); }
      }
    },
    
    strokeToPath: (p: any, opts: StrokeOpts) => {
      if (!p) return pk.NewPath();
      try {
        // stroke() modifies path in-place, converting stroke to fill
        const copy = p.copy();
        copy.stroke({
          width: opts.width,
          join: pk.StrokeJoin.ROUND,
          cap: pk.StrokeCap.ROUND,
          miter_limit: opts.miterLimit ?? 4
        });
        return copy;
      } catch (e) {
        console.warn('[PathKit] strokeToPath failed:', e);
        try { return p.copy(); } catch { return pk.NewPath(); }
      }
    },
    
    transform: (p: any, matrix: number[]) => {
      if (!p) return pk.NewPath();
      try {
        // transform() modifies in place
        const copy = p.copy();
        copy.transform(matrix);
        return copy;
      } catch (e) {
        console.warn('[PathKit] Transform failed:', e);
        try { return p.copy(); } catch { return pk.NewPath(); }
      }
    },
    
    makeCircle: (cx: number, cy: number, r: number) => {
      const path = pk.NewPath();
      // Draw circle using arcs
      path.moveTo(cx + r, cy);
      path.arc(cx, cy, r, 0, Math.PI * 2, false);
      path.close();
      return path;
    },
    
    makeRect: (x: number, y: number, w: number, h: number) => {
      const path = pk.NewPath();
      path.moveTo(x, y);
      path.lineTo(x + w, y);
      path.lineTo(x + w, y + h);
      path.lineTo(x, y + h);
      path.close();
      return path;
    },
    
    makeRoundedRect: (x: number, y: number, w: number, h: number, r: number) => {
      const path = pk.NewPath();
      r = Math.min(r, w / 2, h / 2);
      
      path.moveTo(x + r, y);
      path.lineTo(x + w - r, y);
      path.arc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
      path.lineTo(x + w, y + h - r);
      path.arc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
      path.lineTo(x + r, y + h);
      path.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
      path.lineTo(x, y + r);
      path.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
      path.close();
      
      return path;
    },
    
    copy: (p: any) => {
      if (!p) return pk.NewPath();
      return p.copy();
    },
    
    deletePath: (p: any) => {
      if (p && typeof p.delete === 'function') {
        p.delete();
      }
    },
    
    getBounds: (p: any) => {
      if (!p) {
        console.warn('[PathKit] getBounds: path is null');
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      try {
        const bounds = p.getBounds();
        console.log('[PathKit] raw bounds:', bounds);
        
        // PathKit returns {fLeft, fTop, fRight, fBottom} object
        let left: number, top: number, right: number, bottom: number;
        
        if (bounds && typeof bounds.fLeft === 'number') {
          // Object format: {fLeft, fTop, fRight, fBottom}
          left = bounds.fLeft;
          top = bounds.fTop;
          right = bounds.fRight;
          bottom = bounds.fBottom;
        } else if (Array.isArray(bounds) && bounds.length >= 4) {
          // Array format: [left, top, right, bottom]
          left = bounds[0];
          top = bounds[1];
          right = bounds[2];
          bottom = bounds[3];
        } else {
          console.warn('[PathKit] getBounds: unexpected format', bounds);
          return { x: 0, y: 0, width: 0, height: 0 };
        }
        
        const result = {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top
        };
        
        // Validate
        if (!isFinite(result.x) || !isFinite(result.y) || 
            !isFinite(result.width) || !isFinite(result.height) ||
            result.width <= 0 || result.height <= 0) {
          console.warn('[PathKit] getBounds: invalid values', result);
          return { x: 0, y: 0, width: 0, height: 0 };
        }
        
        console.log('[PathKit] parsed bounds:', result);
        return result;
      } catch (e) {
        console.warn('[PathKit] getBounds error:', e);
        return { x: 0, y: 0, width: 0, height: 0 };
      }
    }
  };
}

/**
 * Check if PathKit is loaded
 */
export function isPathOpsLoaded(): boolean {
  return pathKitInstance !== null;
}
