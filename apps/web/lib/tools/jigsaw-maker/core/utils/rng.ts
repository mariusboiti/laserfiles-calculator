/**
 * Seeded Random Number Generator
 * Uses mulberry32 algorithm for deterministic randomness
 */

/**
 * Create a seeded random number generator
 * Returns a function that produces values in [0, 1)
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate random value in range [min, max)
 */
export function randomRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/**
 * Generate random integer in range [min, max]
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randomRange(rng, min, max + 1));
}

/**
 * Random boolean with given probability
 */
export function randomBool(rng: () => number, probability: number = 0.5): boolean {
  return rng() < probability;
}

/**
 * Hash string to number (for creating sub-seeds)
 */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
