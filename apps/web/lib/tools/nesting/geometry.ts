export type Point = {
  x: number;
  y: number;
};

export type Polygon = Point[];

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function polygonArea(polygon: Polygon): number {
  const n = polygon.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return area / 2;
}

export function computeBBox(points: Polygon): BBox {
  if (!points.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function bboxOverlap(a: BBox, b: BBox): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Ramer-Douglas-Peucker simplification for closed polygons
export function simplifyPolygon(points: Polygon, tolerance: number): Polygon {
  if (points.length <= 3 || tolerance <= 0) {
    return points.slice();
  }

  // treat polygon as open for simplification, then re-close
  const openPoints = points.slice(0, -1);

  const simplified = simplifyRDP(openPoints, tolerance);

  if (simplified.length === 0) {
    return points.slice();
  }

  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  if (distance(first, last) > tolerance) {
    simplified.push({ ...first });
  }

  return simplified;
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return distance(p, a);
  }
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function simplifyRDP(points: Polygon, tolerance: number): Polygon {
  const n = points.length;
  if (n <= 2) return points.slice();

  const first = 0;
  const last = n - 1;
  const stack: Array<{ start: number; end: number }> = [{ start: first, end: last }];
  const keep = new Array<boolean>(n).fill(false);
  keep[first] = true;
  keep[last] = true;

  while (stack.length) {
    const { start, end } = stack.pop()!;
    let maxDist = 0;
    let index = -1;

    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist > tolerance && index !== -1) {
      keep[index] = true;
      stack.push({ start, end: index });
      stack.push({ start: index, end });
    }
  }

  const result: Polygon = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) {
      result.push(points[i]);
    }
  }
  return result;
}

function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const d = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
  if (d === 0) return false; // parallel

  const u = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / d;
  const v = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / d;

  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

function pointInPolygon(point: Point, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.0000001) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

export function polygonsIntersect(a: Polygon, b: Polygon): boolean {
  if (a.length < 3 || b.length < 3) return false;

  // segment intersections
  for (let i = 0; i < a.length - 1; i++) {
    const a1 = a[i];
    const a2 = a[i + 1];
    for (let j = 0; j < b.length - 1; j++) {
      const b1 = b[j];
      const b2 = b[j + 1];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  // containment tests
  if (pointInPolygon(a[0], b)) return true;
  if (pointInPolygon(b[0], a)) return true;

  return false;
}

export function polygonIntersectsRect(poly: Polygon, rect: BBox): boolean {
  const rectPoly: Polygon = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x, y: rect.y },
  ];

  if (polygonsIntersect(poly, rectPoly)) return true;

  // also check if rect is completely inside polygon or vice versa
  if (pointInPolygon({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, poly)) {
    return true;
  }

  if (pointInPolygon(poly[0], rectPoly)) {
    return true;
  }

  return false;
}

export type MatrixLike = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export function applyMatrixToPoint(p: Point, m: MatrixLike): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

export function transformPolygon(points: Polygon, m: MatrixLike | null): Polygon {
  if (!m) return points.map((p) => ({ ...p }));
  return points.map((p) => applyMatrixToPoint(p, m));
}
