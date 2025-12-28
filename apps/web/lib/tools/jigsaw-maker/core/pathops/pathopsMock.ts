/**
 * PathOps Mock Implementation
 * Simplified version for testing without WASM
 * Generates basic SVG paths using simple geometry
 */

export class PathOpsMock {
  /**
   * Create rectangle path
   */
  rect(x: number, y: number, w: number, h: number): MockPath {
    return new MockPath(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`);
  }

  /**
   * Create circle path (approximated with cubic beziers)
   */
  circle(cx: number, cy: number, r: number): MockPath {
    const k = 0.5522847498; // Bezier constant for circle approximation
    const kr = k * r;
    
    const path = `M ${cx} ${cy - r} ` +
      `C ${cx + kr} ${cy - r} ${cx + r} ${cy - kr} ${cx + r} ${cy} ` +
      `C ${cx + r} ${cy + kr} ${cx + kr} ${cy + r} ${cx} ${cy + r} ` +
      `C ${cx - kr} ${cy + r} ${cx - r} ${cy + kr} ${cx - r} ${cy} ` +
      `C ${cx - r} ${cy - kr} ${cx - kr} ${cy - r} ${cx} ${cy - r} Z`;
    
    return new MockPath(path);
  }

  /**
   * Union (simplified - just concatenate paths)
   */
  union(paths: MockPath[]): MockPath {
    if (paths.length === 0) return new MockPath('');
    if (paths.length === 1) return paths[0];
    
    // Simple concatenation (not true union, but works for non-overlapping shapes)
    const combined = paths.map(p => p.d).join(' ');
    return new MockPath(combined);
  }

  /**
   * Difference (simplified - return first path)
   */
  diff(pathA: MockPath, pathB: MockPath): MockPath {
    // Simplified: just return pathA
    // Real implementation would subtract pathB from pathA
    return pathA;
  }

  /**
   * Intersection (simplified - return first path)
   */
  intersect(pathA: MockPath, pathB: MockPath): MockPath {
    // Simplified: just return pathA
    return pathA;
  }

  /**
   * Offset (simplified - no actual offset)
   */
  offset(path: MockPath, delta: number): MockPath {
    // Simplified: return original path
    // Real implementation would offset the path
    return path;
  }

  /**
   * Simplify (no-op for mock)
   */
  simplify(path: MockPath): MockPath {
    return path;
  }

  /**
   * Convert to SVG string
   */
  toSVGString(path: MockPath): string {
    return path.d;
  }

  /**
   * Delete (no-op for mock)
   */
  delete(path: MockPath): void {
    // No-op
  }
}

class MockPath {
  d: string;

  constructor(d: string) {
    this.d = d;
  }

  toSVGString(): string {
    return this.d;
  }

  delete(): void {
    // No-op
  }
}

/**
 * Get mock PathOps instance
 */
export async function getPathOpsMock(): Promise<PathOpsMock> {
  return new PathOpsMock();
}
