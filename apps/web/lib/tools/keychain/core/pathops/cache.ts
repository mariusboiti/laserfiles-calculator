/**
 * Simple LRU Cache for path operations
 */

const MAX_CACHE_SIZE = 300;

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  
  constructor(maxSize: number = MAX_CACHE_SIZE) {
    this.maxSize = maxSize;
  }
  
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Update timestamp for LRU
      entry.timestamp = Date.now();
      return entry.value;
    }
    return undefined;
  }
  
  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [k, v] of this.cache) {
        if (v.timestamp < oldestTime) {
          oldestTime = v.timestamp;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// Global caches
export const textCache = new LRUCache<{ d: string; bbox: { x: number; y: number; width: number; height: number } }>();
export const iconCache = new LRUCache<string[]>();
export const geomCache = new LRUCache<{ topD: string; baseD: string; bounds: any }>();

/**
 * Generate cache key for text outline
 */
export function textCacheKey(fontId: string, sizeU: number, text: string): string {
  return `text:${fontId}:${Math.round(sizeU)}:${text}`;
}

/**
 * Generate cache key for icon
 */
export function iconCacheKey(iconId: string, sizeU: number): string {
  return `icon:${iconId}:${Math.round(sizeU)}`;
}

/**
 * Generate cache key for geometry
 */
export function geomCacheKey(params: Record<string, any>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
  return `geom:${hashString(sorted)}`;
}

/**
 * Simple string hash
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  textCache.clear();
  iconCache.clear();
  geomCache.clear();
}
