/**
 * Canonical finger joint pattern builder
 * Ensures complementary edges match perfectly
 */

export type FingerSegment = {
  kind: 'finger' | 'gap';
  size: number;
};

export type FingerPattern = FingerSegment[];

export interface FingerPatternOptions {
  length: number;
  fingerWidth: number;
  startWith: 'finger' | 'gap';
  minSegment?: number;
}

/**
 * Build a finger joint pattern that sums exactly to length
 * with strictly alternating finger/gap segments
 */
export function buildFingerPattern(opts: FingerPatternOptions): FingerPattern {
  const { length, fingerWidth, startWith, minSegment = 2 } = opts;
  
  if (length <= 0 || fingerWidth <= 0) {
    return [];
  }
  
  const pattern: FingerPattern = [];
  let remaining = length;
  let currentKind = startWith;
  
  // Calculate how many segments we can fit
  const numSegments = Math.floor(length / fingerWidth);
  
  if (numSegments < 2) {
    // Not enough space for proper finger joints - return single segment
    return [{ kind: startWith, size: length }];
  }
  
  // Build pattern with equal-sized segments
  for (let i = 0; i < numSegments; i++) {
    const segmentSize = fingerWidth;
    
    if (remaining - segmentSize < minSegment && i < numSegments - 1) {
      // Last segment would be too small, merge with current
      pattern.push({ kind: currentKind, size: remaining });
      remaining = 0;
      break;
    }
    
    pattern.push({ kind: currentKind, size: segmentSize });
    remaining -= segmentSize;
    currentKind = currentKind === 'finger' ? 'gap' : 'finger';
  }
  
  // Add remainder to last segment if any
  if (remaining > 0 && pattern.length > 0) {
    pattern[pattern.length - 1].size += remaining;
  }
  
  return pattern;
}

/**
 * Get complementary pattern (invert finger/gap)
 * Used for mating edges
 */
export function getComplementaryPattern(pattern: FingerPattern): FingerPattern {
  return pattern.map(seg => ({
    kind: seg.kind === 'finger' ? 'gap' : 'finger',
    size: seg.size,
  }));
}

/**
 * Verify pattern sums to expected length
 */
export function verifyPattern(pattern: FingerPattern, expectedLength: number): boolean {
  const sum = pattern.reduce((acc, seg) => acc + seg.size, 0);
  return Math.abs(sum - expectedLength) < 0.001;
}

/**
 * Build edge path from finger pattern (horizontal top edge)
 * Returns array of {x, y} points
 */
export function buildEdgePathHorizontalTop(
  pattern: FingerPattern,
  startX: number,
  startY: number,
  thickness: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = startX;
  const y = startY;
  
  for (const seg of pattern) {
    if (seg.kind === 'finger') {
      // Finger: go down, right, up
      points.push({ x, y });
      points.push({ x, y: y + thickness });
      x += seg.size;
      points.push({ x, y: y + thickness });
      points.push({ x, y });
    } else {
      // Gap: just go right
      x += seg.size;
      points.push({ x, y });
    }
  }
  
  return points;
}

/**
 * Build edge path from finger pattern (horizontal bottom edge)
 */
export function buildEdgePathHorizontalBottom(
  pattern: FingerPattern,
  startX: number,
  startY: number,
  thickness: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let x = startX;
  const y = startY;
  
  for (const seg of pattern) {
    if (seg.kind === 'finger') {
      // Finger: go up, right, down
      points.push({ x, y });
      points.push({ x, y: y - thickness });
      x += seg.size;
      points.push({ x, y: y - thickness });
      points.push({ x, y });
    } else {
      // Gap: just go right
      x += seg.size;
      points.push({ x, y });
    }
  }
  
  return points;
}

/**
 * Build edge path from finger pattern (vertical left edge)
 */
export function buildEdgePathVerticalLeft(
  pattern: FingerPattern,
  startX: number,
  startY: number,
  thickness: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const x = startX;
  let y = startY;
  
  for (const seg of pattern) {
    if (seg.kind === 'finger') {
      // Finger: go right, down, left
      points.push({ x, y });
      points.push({ x: x + thickness, y });
      y += seg.size;
      points.push({ x: x + thickness, y });
      points.push({ x, y });
    } else {
      // Gap: just go down
      y += seg.size;
      points.push({ x, y });
    }
  }
  
  return points;
}

/**
 * Build edge path from finger pattern (vertical right edge)
 */
export function buildEdgePathVerticalRight(
  pattern: FingerPattern,
  startX: number,
  startY: number,
  thickness: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const x = startX;
  let y = startY;
  
  for (const seg of pattern) {
    if (seg.kind === 'finger') {
      // Finger: go left, down, right
      points.push({ x, y });
      points.push({ x: x - thickness, y });
      y += seg.size;
      points.push({ x: x - thickness, y });
      points.push({ x, y });
    } else {
      // Gap: just go down
      y += seg.size;
      points.push({ x, y });
    }
  }
  
  return points;
}
