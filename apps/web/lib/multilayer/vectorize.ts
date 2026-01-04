/**
 * Vectorization using Marching Squares algorithm
 * Converts binary mask to SVG path contours
 */

interface Point {
  x: number;
  y: number;
}

export async function vectorizeMask(imageData: ImageData): Promise<string[]> {
  const paths = await extractPolylines(imageData);
  return paths.map(polylineToSVGPath).filter(Boolean);
}

type IntPoint = { x2: number; y2: number };
type Segment = { a: IntPoint; b: IntPoint };

async function extractPolylines(imageData: ImageData): Promise<Point[][]> {
  const { width, height, data } = imageData;
  const segments: Segment[] = [];

  for (let y = 0; y < height - 1; y++) {
    if ((y & 0x1f) === 0) await yieldToMain();
    for (let x = 0; x < width - 1; x++) {
      const a = isFilled(data, width, x, y);
      const b = isFilled(data, width, x + 1, y);
      const c = isFilled(data, width, x + 1, y + 1);
      const d = isFilled(data, width, x, y + 1);

      const caseValue = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
      if (caseValue === 0 || caseValue === 15) continue;

      const top: IntPoint = { x2: x * 2 + 1, y2: y * 2 };
      const right: IntPoint = { x2: x * 2 + 2, y2: y * 2 + 1 };
      const bottom: IntPoint = { x2: x * 2 + 1, y2: y * 2 + 2 };
      const left: IntPoint = { x2: x * 2, y2: y * 2 + 1 };

      // Cases map to 1 or 2 line segments between edge midpoints.
      // Ambiguous cases (5 and 10) are split into two segments.
      switch (caseValue) {
        case 1:
        case 14:
          segments.push({ a: left, b: top });
          break;
        case 2:
        case 13:
          segments.push({ a: top, b: right });
          break;
        case 3:
        case 12:
          segments.push({ a: left, b: right });
          break;
        case 4:
        case 11:
          segments.push({ a: right, b: bottom });
          break;
        case 6:
        case 9:
          segments.push({ a: top, b: bottom });
          break;
        case 7:
        case 8:
          segments.push({ a: left, b: bottom });
          break;
        case 5:
          segments.push({ a: left, b: top });
          segments.push({ a: right, b: bottom });
          break;
        case 10:
          segments.push({ a: top, b: right });
          segments.push({ a: bottom, b: left });
          break;
        default:
          break;
      }
    }
  }

  const polylinesInt = stitchSegments(segments);
  const polylines = polylinesInt.map((poly) => simplifyPolyline(poly).map((p) => ({ x: p.x2 / 2, y: p.y2 / 2 })));
  return polylines.filter((p) => p.length >= 3);
}

function isFilled(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const idx = (y * width + x) * 4;
  return data[idx] > 128;
}

function key(p: IntPoint) {
  return `${p.x2},${p.y2}`;
}

function parseKey(k: string): IntPoint {
  const [xs, ys] = k.split(',');
  return { x2: Number(xs), y2: Number(ys) };
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function stitchSegments(segments: Segment[]): IntPoint[][] {
  const adj = new Map<string, string[]>();
  const edges = new Set<string>();

  for (const s of segments) {
    const ak = key(s.a);
    const bk = key(s.b);
    edges.add(edgeKey(ak, bk));

    const al = adj.get(ak);
    if (al) al.push(bk);
    else adj.set(ak, [bk]);

    const bl = adj.get(bk);
    if (bl) bl.push(ak);
    else adj.set(bk, [ak]);
  }

  const usedEdges = new Set<string>();
  const polylines: IntPoint[][] = [];

  for (const e of edges) {
    if (usedEdges.has(e)) continue;
    const [a0, b0] = e.split('|');

    const poly: string[] = [a0, b0];
    usedEdges.add(e);

    // extend forward
    while (true) {
      const last = poly[poly.length - 1];
      const prev = poly[poly.length - 2];
      const nexts = adj.get(last) || [];
      const next = nexts.find((n) => n !== prev && !usedEdges.has(edgeKey(last, n)));
      if (!next) break;
      usedEdges.add(edgeKey(last, next));
      poly.push(next);
      if (next === poly[0]) break;
    }

    // extend backward
    while (true) {
      const first = poly[0];
      const second = poly[1];
      const nexts = adj.get(first) || [];
      const next = nexts.find((n) => n !== second && !usedEdges.has(edgeKey(first, n)));
      if (!next) break;
      usedEdges.add(edgeKey(first, next));
      poly.unshift(next);
      if (next === poly[poly.length - 1]) break;
    }

    const points = poly.map(parseKey);
    polylines.push(points);
  }

  return polylines;
}

function simplifyPolyline(points: IntPoint[]): IntPoint[] {
  if (points.length <= 3) return points;
  const out: IntPoint[] = [];
  out.push(points[0]);

  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const abx = b.x2 - a.x2;
    const aby = b.y2 - a.y2;
    const bcx = c.x2 - b.x2;
    const bcy = c.y2 - b.y2;

    // keep point only if it changes direction
    if (abx * bcy - aby * bcx !== 0) {
      out.push(b);
    }
  }

  out.push(points[points.length - 1]);
  return out;
}

function polylineToSVGPath(points: Point[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    path += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  // close if end is near start
  const last = points[points.length - 1];
  if (Math.abs(last.x - first.x) < 0.001 && Math.abs(last.y - first.y) < 0.001) {
    path += ' Z';
  }
  return path;
}

async function yieldToMain() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
