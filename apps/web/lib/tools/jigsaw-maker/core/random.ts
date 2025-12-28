/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Allows reproducible puzzle generation with same seed
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get random value in range [min, max]
 */
export function randomInRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/**
 * Get random boolean with given probability of true
 */
export function randomBool(random: () => number, probability = 0.5): boolean {
  return random() < probability;
}
