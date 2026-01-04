/**
 * Coordinate Transformation Utilities
 */

import type { Point, CubicBezier } from './svgPath';

/**
 * 2D transformation matrix
 */
export interface Matrix {
  a: number;  // scale x
  b: number;  // skew y
  c: number;  // skew x
  d: number;  // scale y
  e: number;  // translate x
  f: number;  // translate y
}

/**
 * Create identity matrix
 */
export function identityMatrix(): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

/**
 * Create translation matrix
 */
export function translateMatrix(tx: number, ty: number): Matrix {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

/**
 * Create rotation matrix (angle in radians)
 */
export function rotateMatrix(angle: number): Matrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/**
 * Multiply two matrices
 */
export function multiplyMatrix(m1: Matrix, m2: Matrix): Matrix {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

/**
 * Transform a point by matrix
 */
export function transformPoint(p: Point, m: Matrix): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

/**
 * Transform a cubic Bezier segment
 */
export function transformBezier(seg: CubicBezier, m: Matrix): CubicBezier {
  return {
    start: transformPoint(seg.start, m),
    cp1: transformPoint(seg.cp1, m),
    cp2: transformPoint(seg.cp2, m),
    end: transformPoint(seg.end, m),
  };
}

/**
 * Transform array of Bezier segments
 */
export function transformSegments(segments: CubicBezier[], m: Matrix): CubicBezier[] {
  return segments.map(seg => transformBezier(seg, m));
}

/**
 * Rotate 90 degrees clockwise
 */
export function rotate90CW(): Matrix {
  return rotateMatrix(-Math.PI / 2);
}

/**
 * Rotate 90 degrees counter-clockwise
 */
export function rotate90CCW(): Matrix {
  return rotateMatrix(Math.PI / 2);
}
