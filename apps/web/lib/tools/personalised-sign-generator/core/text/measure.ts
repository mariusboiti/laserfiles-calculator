/**
 * Personalised Sign Generator V3 PRO - Text Measurement
 * Browser-only canvas measurement with caching
 */

// Cache for text measurements
const measureCache = new Map<string, number>();
const MAX_CACHE_SIZE = 500;

// Constants
export const PX_PER_MM = 3.7795275591; // 96 DPI

// Measurement canvas (lazy init, browser only)
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * Initialize measurement canvas (browser only)
 */
function initCanvas(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  
  if (measureCanvas && measureCtx) {
    return true;
  }
  
  try {
    measureCanvas = document.createElement('canvas');
    measureCanvas.width = 2000;
    measureCanvas.height = 200;
    measureCtx = measureCanvas.getContext('2d');
    return measureCtx !== null;
  } catch (e) {
    console.warn('[TextMeasure] Failed to init canvas:', e);
    return false;
  }
}

/**
 * Build cache key for measurement
 */
function buildCacheKey(
  text: string,
  fontFamily: string,
  weight: string,
  sizePx: number,
  letterSpacing: number
): string {
  return `${fontFamily}|${weight}|${sizePx.toFixed(1)}|${letterSpacing.toFixed(2)}|${text}`;
}

/**
 * Build CSS font string
 */
function buildFontString(sizePx: number, fontFamily: string, weight: string): string {
  return `${weight} ${sizePx}px "${fontFamily}", Arial, sans-serif`;
}

/**
 * Measure text width using canvas (browser only)
 * Returns width in pixels
 */
export function measureTextWidthPx(
  text: string,
  fontFamily: string,
  weight: string,
  sizePx: number,
  letterSpacing: number = 0
): number {
  if (!text || text.length === 0) return 0;

  // Check cache first
  const cacheKey = buildCacheKey(text, fontFamily, weight, sizePx, letterSpacing);
  const cached = measureCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Try canvas measurement
  if (initCanvas() && measureCtx) {
    measureCtx.font = buildFontString(sizePx, fontFamily, weight);
    const metrics = measureCtx.measureText(text);
    
    // Add letter spacing
    const totalSpacing = letterSpacing * (text.length - 1);
    const width = metrics.width + totalSpacing;

    // Cache result
    if (measureCache.size >= MAX_CACHE_SIZE) {
      // Clear oldest entries
      const keysToDelete = Array.from(measureCache.keys()).slice(0, 100);
      keysToDelete.forEach(k => measureCache.delete(k));
    }
    measureCache.set(cacheKey, width);

    return width;
  }

  // Fallback approximation for SSR
  return approximateTextWidthPx(text, fontFamily, weight, sizePx, letterSpacing);
}

/**
 * Approximate text width (fallback for SSR)
 */
export function approximateTextWidthPx(
  text: string,
  fontFamily: string,
  weight: string,
  sizePx: number,
  letterSpacing: number = 0
): number {
  if (!text || text.length === 0) return 0;

  // Width ratio varies by weight
  const weightRatios: Record<string, number> = {
    '400': 0.52,
    '500': 0.54,
    '600': 0.56,
    '700': 0.58,
    '800': 0.60,
    '900': 0.62,
  };

  const ratio = weightRatios[weight] || 0.55;
  const baseWidth = text.length * sizePx * ratio;
  const totalSpacing = letterSpacing * (text.length - 1);

  return baseWidth + totalSpacing;
}

/**
 * Measure text width in mm
 */
export function measureTextWidthMm(
  text: string,
  fontFamily: string,
  weight: string,
  sizeMm: number,
  letterSpacingMm: number = 0
): number {
  const sizePx = sizeMm * PX_PER_MM;
  const letterSpacingPx = letterSpacingMm * PX_PER_MM;
  const widthPx = measureTextWidthPx(text, fontFamily, weight, sizePx, letterSpacingPx);
  return widthPx / PX_PER_MM;
}

/**
 * Convert mm to px
 */
export function mmToPx(mm: number): number {
  return mm * PX_PER_MM;
}

/**
 * Convert px to mm
 */
export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}

/**
 * Clear measurement cache
 */
export function clearMeasureCache(): void {
  measureCache.clear();
}

/**
 * Get cache stats (for debugging)
 */
export function getMeasureCacheStats(): { size: number; maxSize: number } {
  return { size: measureCache.size, maxSize: MAX_CACHE_SIZE };
}
