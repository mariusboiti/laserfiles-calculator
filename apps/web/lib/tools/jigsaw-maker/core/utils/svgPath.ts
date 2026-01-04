/**
 * SVG Path Building Utilities
 */

export interface Point {
  x: number;
  y: number;
}

export interface CubicBezier {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
}

/**
 * SVG Path Builder
 */
export class PathBuilder {
  private commands: string[] = [];
  private currentPoint: Point = { x: 0, y: 0 };
  
  /**
   * Move to point
   */
  moveTo(x: number, y: number): this {
    this.commands.push(`M ${x.toFixed(4)} ${y.toFixed(4)}`);
    this.currentPoint = { x, y };
    return this;
  }
  
  /**
   * Line to point
   */
  lineTo(x: number, y: number): this {
    this.commands.push(`L ${x.toFixed(4)} ${y.toFixed(4)}`);
    this.currentPoint = { x, y };
    return this;
  }
  
  /**
   * Cubic Bezier curve
   */
  cubicTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    this.commands.push(
      `C ${cp1x.toFixed(4)} ${cp1y.toFixed(4)} ${cp2x.toFixed(4)} ${cp2y.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)}`
    );
    this.currentPoint = { x, y };
    return this;
  }
  
  /**
   * Close path
   */
  close(): this {
    this.commands.push('Z');
    return this;
  }
  
  /**
   * Get SVG path string
   */
  toString(): string {
    return this.commands.join(' ');
  }
  
  /**
   * Get current point
   */
  getCurrentPoint(): Point {
    return { ...this.currentPoint };
  }
}

/**
 * Format number for SVG (4 decimal places)
 */
export function fmt(n: number): string {
  return n.toFixed(4);
}

/**
 * Create SVG path from cubic Bezier segments
 */
export function bezierSegmentsToPath(segments: CubicBezier[], closed: boolean = false): string {
  if (segments.length === 0) return '';
  
  const builder = new PathBuilder();
  builder.moveTo(segments[0].start.x, segments[0].start.y);
  
  for (const seg of segments) {
    builder.cubicTo(
      seg.cp1.x, seg.cp1.y,
      seg.cp2.x, seg.cp2.y,
      seg.end.x, seg.end.y
    );
  }
  
  if (closed) {
    builder.close();
  }
  
  return builder.toString();
}

/**
 * Reverse a cubic Bezier segment
 */
export function reverseBezier(seg: CubicBezier): CubicBezier {
  return {
    start: seg.end,
    cp1: seg.cp2,
    cp2: seg.cp1,
    end: seg.start,
  };
}

/**
 * Reverse array of Bezier segments
 */
export function reverseSegments(segments: CubicBezier[]): CubicBezier[] {
  return segments.map(reverseBezier).reverse();
}

/**
 * Flip Bezier segment across Y axis (for tab/blank inversion)
 */
export function flipBezierY(seg: CubicBezier): CubicBezier {
  return {
    start: { x: seg.start.x, y: -seg.start.y },
    cp1: { x: seg.cp1.x, y: -seg.cp1.y },
    cp2: { x: seg.cp2.x, y: -seg.cp2.y },
    end: { x: seg.end.x, y: -seg.end.y },
  };
}

/**
 * Flip segments across Y axis
 */
export function flipSegmentsY(segments: CubicBezier[]): CubicBezier[] {
  return segments.map(flipBezierY);
}

/**
 * Distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snap point to grid (epsilon rounding)
 */
export function snapPoint(p: Point, epsilon: number = 0.0001): Point {
  return {
    x: Math.round(p.x / epsilon) * epsilon,
    y: Math.round(p.y / epsilon) * epsilon,
  };
}
