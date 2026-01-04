/**
 * Performance Instrumentation (Dev Only)
 * Simple timing utilities for measuring key operations
 */

// ============================================================================
// Configuration
// ============================================================================

const IS_DEV = process.env.NODE_ENV === 'development';
const ENABLE_PERF_LOGS = IS_DEV;

// ============================================================================
// Timing Utilities
// ============================================================================

export interface TimingResult {
  name: string;
  durationMs: number;
  timestamp: number;
}

const timings: Map<string, number> = new Map();

export function startTiming(name: string): void {
  if (!ENABLE_PERF_LOGS) return;
  timings.set(name, performance.now());
}

export function endTiming(name: string): TimingResult | null {
  if (!ENABLE_PERF_LOGS) return null;
  
  const start = timings.get(name);
  if (start === undefined) return null;
  
  const durationMs = performance.now() - start;
  timings.delete(name);
  
  const result: TimingResult = {
    name,
    durationMs,
    timestamp: Date.now(),
  };
  
  // Log slow operations
  if (durationMs > 100) {
    console.log(`[Perf] ${name}: ${durationMs.toFixed(1)}ms`);
  }
  
  return result;
}

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!ENABLE_PERF_LOGS) return fn();
  
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (duration > 100) {
      console.log(`[Perf] ${name}: ${duration.toFixed(1)}ms`);
    }
  });
}

export function measureSync<T>(name: string, fn: () => T): T {
  if (!ENABLE_PERF_LOGS) return fn();
  
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    if (duration > 50) {
      console.log(`[Perf] ${name}: ${duration.toFixed(1)}ms`);
    }
  }
}

// ============================================================================
// Specific Measurement Helpers
// ============================================================================

export function measureSVGParse<T>(fn: () => T): T {
  return measureSync('SVG Parse', fn);
}

export function measureAIResultToPreview<T>(fn: () => Promise<T>): Promise<T> {
  return measureAsync('AI Result → Preview', fn);
}

export function measureExportGeneration<T>(fn: () => Promise<T>): Promise<T> {
  return measureAsync('Export Generation', fn);
}

// ============================================================================
// Debounce with Perf Tracking
// ============================================================================

export function createDebouncedFn<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
  name?: string
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let callCount = 0;

  return (...args: Parameters<T>) => {
    callCount++;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      if (ENABLE_PERF_LOGS && callCount > 1 && name) {
        console.log(`[Perf] ${name}: debounced ${callCount} calls`);
      }
      callCount = 0;
      fn(...args);
    }, delayMs);
  };
}

// ============================================================================
// RAF Throttle for Canvas/Preview Updates
// ============================================================================

export function createRAFThrottle<T extends (...args: unknown[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) {
          fn(...lastArgs);
        }
      });
    }
  };
}

// ============================================================================
// Memory Usage (Dev Only)
// ============================================================================

export function logMemoryUsage(label: string): void {
  if (!ENABLE_PERF_LOGS) return;
  
  if ('memory' in performance) {
    const memory = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    console.log(`[Memory] ${label}: ${usedMB.toFixed(1)}MB`);
  }
}
