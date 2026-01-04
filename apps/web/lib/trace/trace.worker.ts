type TraceMessage = {
  type: 'TRACE';
  requestId: string;
  image: { width: number; height: number; data: Uint8ClampedArray };
  settings: {
    preset: 'fast' | 'detailed';
    targetWidthMm: number;
    targetHeightMm: number;
    maxPaths: number;
    maxCommands: number;
    maxDLength: number;
  };
};

type TraceProgress = { type: 'TRACE_PROGRESS'; requestId: string; progress: number };

type TraceResult = {
  type: 'TRACE_RESULT';
  requestId: string;
  paths: string[];
  combinedPath: string;
  stats: {
    width: number;
    height: number;
    pathsIn: number;
    pathsOut: number;
    commands: number;
    dLength: number;
    ms: number;
    localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  };
};

type TraceError = { type: 'TRACE_ERROR'; requestId: string; message: string };

function postProgress(requestId: string, progress: number) {
  (self as any).postMessage({ type: 'TRACE_PROGRESS', requestId, progress } satisfies TraceProgress);
}

type Point = { x: number; y: number };

function contourToPath(contour: Point[]): string {
  if (contour.length === 0) return '';
  let d = `M ${contour[0].x.toFixed(2)} ${contour[0].y.toFixed(2)}`;
  for (let i = 1; i < contour.length; i++) {
    d += ` L ${contour[i].x.toFixed(2)} ${contour[i].y.toFixed(2)}`;
  }
  d += ' Z';
  return d;
}

function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 4) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let index = -1;
  let distMax = 0;

  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const denom = dx * dx + dy * dy || 1;

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const t = ((p.x - first.x) * dx + (p.y - first.y) * dy) / denom;
    const projX = first.x + t * dx;
    const projY = first.y + t * dy;
    const ddx = p.x - projX;
    const ddy = p.y - projY;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist > distMax) {
      distMax = dist;
      index = i;
    }
  }

  if (distMax > epsilon && index !== -1) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function smoothContour(contour: Point[], amount: number): Point[] {
  if (amount <= 0 || contour.length < 3) return contour;
  const windowSize = Math.max(1, Math.round(amount * 5));
  const out: Point[] = [];
  for (let i = 0; i < contour.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let j = -windowSize; j <= windowSize; j++) {
      const idx = (i + j + contour.length) % contour.length;
      sumX += contour[idx].x;
      sumY += contour[idx].y;
      count++;
    }
    out.push({ x: sumX / count, y: sumY / count });
  }
  return out;
}

// Max points per contour to prevent memory explosion
const MAX_CONTOUR_STEPS = 8000;

function traceContour(startX: number, startY: number, getPixel: (x: number, y: number) => number, visited: Uint8Array, w: number, h: number): Point[] {
  const contour: Point[] = [];
  let x = startX;
  let y = startY;
  let dir = 0;
  const maxSteps = Math.min(w * h, MAX_CONTOUR_STEPS);
  let steps = 0;

  const markVisited = (xx: number, yy: number) => {
    visited[yy * w + xx] = 1;
  };

  do {
    markVisited(x, y);
    contour.push({ x, y });

    const tl = getPixel(x, y);
    const tr = getPixel(x + 1, y);
    const bl = getPixel(x, y + 1);
    const br = getPixel(x + 1, y + 1);
    const cell = (tl << 3) | (tr << 2) | (br << 1) | bl;

    switch (cell) {
      case 1:
      case 5:
      case 13:
        dir = 3;
        break;
      case 2:
      case 3:
      case 7:
        dir = 0;
        break;
      case 4:
      case 12:
      case 14:
        dir = 1;
        break;
      case 8:
      case 10:
      case 11:
        dir = 2;
        break;
      case 6:
        dir = dir === 3 ? 0 : 1;
        break;
      case 9:
        dir = dir === 0 ? 3 : 2;
        break;
      default:
        break;
    }

    switch (dir) {
      case 0:
        x++;
        break;
      case 1:
        y++;
        break;
      case 2:
        x--;
        break;
      case 3:
        y--;
        break;
    }

    steps++;
    if (steps > maxSteps) break;
  } while (x !== startX || y !== startY);

  return contour;
}

function computeBBoxArea(pathD: string): { area: number; minX: number; minY: number; maxX: number; maxY: number } {
  const nums = pathD.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number.parseFloat(nums[i]);
    const y = Number.parseFloat(nums[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { area: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  const w = Math.max(0, maxX - minX);
  const h = Math.max(0, maxY - minY);
  return { area: w * h, minX, minY, maxX, maxY };
}

function scalePathsCentered(
  paths: string[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidthMm: number,
  targetHeightMm: number
): { paths: string[]; bounds: { xMm: number; yMm: number; widthMm: number; heightMm: number } } {
  const scaleX = (targetWidthMm * 0.7) / sourceWidth;
  const scaleY = (targetHeightMm * 0.7) / sourceHeight;
  const scale = Math.min(scaleX, scaleY);

  const halfW = sourceWidth / 2;
  const halfH = sourceHeight / 2;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const out = paths.map((path) => {
    let idx = 0;
    const scaled = path.replace(/-?\d+\.?\d*/g, (match) => {
      const v = Number.parseFloat(match);
      const outV = idx % 2 === 0 ? (v - halfW) * scale : (v - halfH) * scale;
      if (idx % 2 === 0) {
        minX = Math.min(minX, outV);
        maxX = Math.max(maxX, outV);
      } else {
        minY = Math.min(minY, outV);
        maxY = Math.max(maxY, outV);
      }
      idx++;
      return outV.toFixed(2);
    });
    return scaled;
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    minX = -10;
    minY = -10;
    maxX = 10;
    maxY = 10;
  }

  return {
    paths: out,
    bounds: { xMm: minX, yMm: minY, widthMm: maxX - minX, heightMm: maxY - minY },
  };
}

function countCommands(d: string): number {
  const m = d.match(/[MLHVCSQTAZ]/gi);
  return m ? m.length : 0;
}

// Balanced limits to prevent OOM during tracing while keeping quality
const MAX_CONTOURS_DURING_TRACE = 100;
const MAX_TOTAL_PATH_CHARS = 60000;
const MIN_CONTOUR_POINTS = 3;

function traceBinaryImage(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  smoothing: number,
  requestId: string
): string[] {
  const visited = new Uint8Array(width * height);

  const getPixel = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const idx = (y * width + x) * 4;
    return data[idx] < 128 ? 1 : 0;
  };

  const paths: string[] = [];
  const totalRows = Math.max(1, height - 1);
  let totalChars = 0;

  outer: for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      // Early termination if we have enough paths
      if (paths.length >= MAX_CONTOURS_DURING_TRACE || totalChars >= MAX_TOTAL_PATH_CHARS) {
        break outer;
      }

      const vIdx = y * width + x;
      if (visited[vIdx]) continue;

      const p = getPixel(x, y);
      const pRight = getPixel(x + 1, y);
      const pBottom = getPixel(x, y + 1);

      if (p !== pRight || p !== pBottom) {
        const contour = traceContour(x, y, getPixel, visited, width, height);
        // Skip very small contours (just noise)
        if (contour.length < MIN_CONTOUR_POINTS) continue;

        const smoothed = smoothContour(contour, smoothing);
        const pathStr = contourToPath(smoothed);
        
        // Skip if this single path is too long (complex noise)
        if (pathStr.length > 8000) continue;
        
        paths.push(pathStr);
        totalChars += pathStr.length;
      }
    }

    if (y % 16 === 0) {
      postProgress(requestId, Math.min(0.9, (y / totalRows) * 0.9));
    }
  }

  return paths;
}

function simplifyAndGuard(
  rawPaths: string[],
  width: number,
  height: number,
  preset: 'fast' | 'detailed',
  maxPaths: number,
  maxCommands: number,
  maxDLength: number
): { paths: string[]; combined: string } {
  const imgArea = width * height;
  // Keep contours with reasonable size - be lenient for sketch lines
  const baseMinAreaFrac = preset === 'detailed' ? 0.001 : 0.002;
  let minAreaPx = Math.max(4, imgArea * baseMinAreaFrac);

  for (let pass = 0; pass < 3; pass++) {
    const withArea = rawPaths
      .map((p) => ({ p, b: computeBBoxArea(p) }))
      .filter((x) => x.b.area >= minAreaPx)
      .sort((a, b) => b.b.area - a.b.area);

    const keep = Math.max(1, Math.min(maxPaths, 60));
    const picked = (withArea.length > 0 ? withArea : rawPaths.map((p) => ({ p, b: computeBBoxArea(p) })))
      .slice(0, keep)
      .map((x) => x.p);

    const combined = picked.join(' ');
    const commands = countCommands(combined);

    if (picked.length <= keep && commands <= maxCommands && combined.length <= maxDLength) {
      return { paths: picked, combined };
    }

    minAreaPx *= 2;
  }

  const finalPicked = rawPaths.slice(0, Math.max(1, Math.min(maxPaths, 40)));
  const combined = finalPicked.join(' ');
  const commands = countCommands(combined);

  if (finalPicked.length > Math.min(maxPaths, 50) || commands > maxCommands || combined.length > maxDLength) {
    throw new Error('Trace result too complex. Use Fast preset / simpler image.');
  }

  return { paths: finalPicked, combined };
}

(self as any).onmessage = (ev: MessageEvent<TraceMessage>) => {
  const msg = ev.data;
  if (!msg || msg.type !== 'TRACE') return;

  const { requestId, image, settings } = msg;

  const t0 = Date.now();

  try {
    postProgress(requestId, 0.01);

    const smoothing = settings.preset === 'detailed' ? 0.4 : 0.7;
    const rawPaths = traceBinaryImage(image.width, image.height, image.data, smoothing, requestId);

    postProgress(requestId, 0.92);

    if (rawPaths.length === 0) {
      (self as any).postMessage({ type: 'TRACE_ERROR', requestId, message: 'No contours found. Try adjusting threshold.' } satisfies TraceError);
      return;
    }

    const eps = settings.preset === 'detailed' ? 0.75 : 1.5;
    const simplified = rawPaths.map((p) => {
      const nums = p.match(/-?\d+\.?\d*/g);
      if (!nums || nums.length < 6) return p;
      const pts: Point[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        pts.push({ x: Number.parseFloat(nums[i]), y: Number.parseFloat(nums[i + 1]) });
      }
      const reduced = rdp(pts, eps);
      return contourToPath(reduced);
    });

    const guarded = simplifyAndGuard(simplified, image.width, image.height, settings.preset, settings.maxPaths, settings.maxCommands, settings.maxDLength);

    const scaled = scalePathsCentered(guarded.paths, image.width, image.height, settings.targetWidthMm, settings.targetHeightMm);
    const combinedPath = scaled.paths.join(' ');

    const commands = countCommands(combinedPath);
    if (commands > settings.maxCommands || combinedPath.length > settings.maxDLength) {
      throw new Error('Trace result too complex. Use Fast preset / simpler image.');
    }

    postProgress(requestId, 1);

    const out: TraceResult = {
      type: 'TRACE_RESULT',
      requestId,
      paths: scaled.paths,
      combinedPath,
      stats: {
        width: image.width,
        height: image.height,
        pathsIn: rawPaths.length,
        pathsOut: scaled.paths.length,
        commands,
        dLength: combinedPath.length,
        ms: Date.now() - t0,
        localBounds: scaled.bounds,
      },
    };

    (self as any).postMessage(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Trace failed';
    (self as any).postMessage({ type: 'TRACE_ERROR', requestId, message } satisfies TraceError);
  }
};
