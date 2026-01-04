/**
 * CanvasKit (Skia) Loader
 * Lazy loads and caches CanvasKit WASM instance for path operations
 */

import type { CanvasKit } from 'canvaskit-wasm';

let canvasKitInstance: CanvasKit | null = null;
let loadingPromise: Promise<CanvasKit> | null = null;

/**
 * Load and cache CanvasKit instance
 * Uses dynamic import for code splitting
 */
export async function loadSkia(): Promise<CanvasKit> {
  if (canvasKitInstance) {
    return canvasKitInstance;
  }
  
  if (loadingPromise) {
    return loadingPromise;
  }
  
  loadingPromise = (async () => {
    try {
      console.log('[CanvasKit] Starting dynamic import...');
      // Dynamic import of canvaskit-wasm
      const CanvasKitModule = await import('canvaskit-wasm');
      const CanvasKitInit = CanvasKitModule.default;
      
      console.log('[CanvasKit] Module loaded, initializing WASM...');
      // Initialize with WASM file - try local node_modules first
      canvasKitInstance = await CanvasKitInit({
        locateFile: (file: string) => {
          // Use unpkg CDN which is more reliable
          const url = `https://unpkg.com/canvaskit-wasm@0.40.0/bin/${file}`;
          console.log('[CanvasKit] Loading WASM from:', url);
          return url;
        }
      });
      
      console.log('[CanvasKit] Initialized successfully!');
      return canvasKitInstance;
    } catch (error) {
      console.error('[CanvasKit] Failed to load:', error);
      loadingPromise = null;
      throw new Error(`Failed to load CanvasKit: ${error}`);
    }
  })();
  
  return loadingPromise;
}

/**
 * Check if CanvasKit is loaded
 */
export function isSkiaLoaded(): boolean {
  return canvasKitInstance !== null;
}

/**
 * Get cached CanvasKit instance (throws if not loaded)
 */
export function getSkia(): CanvasKit {
  if (!canvasKitInstance) {
    throw new Error('CanvasKit not loaded. Call loadSkia() first.');
  }
  return canvasKitInstance;
}
