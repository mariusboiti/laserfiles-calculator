export type TraceFromDataUrlOptions = {
  threshold: number;
  smoothing: number;
  detail: 'low' | 'medium' | 'high';
  invert: boolean;
  removeBackground: boolean;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function computeBBoxAreaFromPathD(pathD: string): number {
  const nums = pathD.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return 0;

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
    return 0;
  }

  const w = Math.max(0, maxX - minX);
  const h = Math.max(0, maxY - minY);
  return w * h;
}

/**
 * Simplify path using Ramer-Douglas-Peucker algorithm
 */
function simplifyPath(pathD: string): string {
  // Extract coordinates from path
  const coords: Array<{ x: number; y: number }> = [];
  const nums = pathD.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return pathD;

  for (let i = 0; i + 1 < nums.length; i += 2) {
    coords.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) });
  }

  if (coords.length < 4) return pathD;

  // RDP simplification with epsilon based on path size
  const simplified = rdpSimplify(coords, 1.5);
  
  if (simplified.length < 2) return pathD;

  // Rebuild path
  let result = `M ${simplified[0].x.toFixed(2)} ${simplified[0].y.toFixed(2)}`;
  for (let i = 1; i < simplified.length; i++) {
    result += ` L ${simplified[i].x.toFixed(2)} ${simplified[i].y.toFixed(2)}`;
  }
  result += ' Z';
  return result;
}

function rdpSimplify(points: Array<{ x: number; y: number }>, epsilon: number): Array<{ x: number; y: number }> {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

function perpendicularDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

export async function traceFromDataUrl(
  dataUrl: string,
  targetWidthMm: number,
  targetHeightMm: number,
  options: TraceFromDataUrlOptions
): Promise<string> {
  if (!dataUrl) throw new Error('Missing image data');

  const img = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Very small sizes to prevent OOM and complexity explosion
  const maxSize = options.detail === 'high' ? 180 : options.detail === 'medium' ? 140 : 100;
  const scaleToMax = Math.min(1, maxSize / Math.max(img.width, img.height));

  canvas.width = Math.round(img.width * scaleToMax);
  canvas.height = Math.round(img.height * scaleToMax);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataObj.data;

  const threshold = clamp(options.threshold, 0, 255);

  // Process grayscale in chunks to avoid freezing
  const chunkSize = 40000;
  for (let start = 0; start < data.length; start += chunkSize * 4) {
    const end = Math.min(start + chunkSize * 4, data.length);
    for (let i = start; i < end; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

      const isTransparent = options.removeBackground && data[i + 3] < 128;

      let value = gray > threshold ? 255 : 0;
      if (options.invert) value = 255 - value;
      if (isTransparent) value = 255;

      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
    // Yield to UI thread between chunks
    if (start + chunkSize * 4 < data.length) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // Yield to UI before heavy tracing
  await new Promise(r => setTimeout(r, 0));

  const paths = await traceContoursAsync(imageDataObj, options.smoothing);
  if (paths.length === 0) {
    throw new Error('No contours found. Try adjusting threshold.');
  }

  const imgArea = canvas.width * canvas.height;
  const minAreaFrac = options.detail === 'high' ? 0.001 : options.detail === 'medium' ? 0.0015 : 0.002;
  const minAreaPx = Math.max(16, imgArea * minAreaFrac);
  const pathsWithArea = paths
    .map((p) => ({ p, area: computeBBoxAreaFromPathD(p) }))
    .filter((x) => x.area >= minAreaPx);

  const sorted = (pathsWithArea.length > 0 ? pathsWithArea : paths.map((p) => ({ p, area: 0 }))).sort(
    (a, b) => b.area - a.area
  );

  const maxPaths = options.detail === 'high' ? 60 : options.detail === 'medium' ? 40 : 25;
  const simplifiedPaths = sorted.slice(0, maxPaths).map((x) => simplifyPath(x.p));

  if (simplifiedPaths.length === 0) {
    throw new Error('No contours found after simplification. Try adjusting threshold.');
  }

  const scaledPaths = scalePathsCentered(simplifiedPaths, canvas.width, canvas.height, targetWidthMm, targetHeightMm);
  const result = scaledPaths.join(' ');
  
  // Check command count - be strict
  const commandCount = (result.match(/[MLHVCSQTAZ]/gi) || []).length;
  if (commandCount > 8000) {
    throw new Error(`Path too complex (${commandCount} commands). Try lower detail.`);
  }
  
  return result;
}

/**
 * Async contour tracing with yielding to prevent UI freeze
 */
async function traceContoursAsync(imageData: ImageData, smoothing: number): Promise<string[]> {
  const { data, width, height } = imageData;
  const paths: string[] = [];
  const visited = new Set<string>();

  // Hard limits to prevent explosion
  const MAX_PATHS = 150;
  const MAX_TOTAL_POINTS = 50000;
  let totalPoints = 0;

  const getPixel = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const idx = (y * width + x) * 4;
    return data[idx] < 128 ? 1 : 0;
  };

  let processedRows = 0;
  const yieldInterval = 15;

  outer: for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      // Early termination
      if (paths.length >= MAX_PATHS || totalPoints >= MAX_TOTAL_POINTS) {
        break outer;
      }

      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const p = getPixel(x, y);
      const pRight = getPixel(x + 1, y);
      const pBottom = getPixel(x, y + 1);

      if (p !== pRight || p !== pBottom) {
        const contour = traceContour(x, y, getPixel, visited, width, height);
        if (contour.length > 3 && contour.length < 5000) {
          const smoothed = smoothContour(contour, smoothing);
          paths.push(contourToPath(smoothed));
          totalPoints += smoothed.length;
        }
      }
    }
    
    processedRows++;
    if (processedRows % yieldInterval === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  return paths;
}

function traceContour(
  startX: number,
  startY: number,
  getPixel: (x: number, y: number) => number,
  visited: Set<string>,
  width: number,
  height: number
): Array<{ x: number; y: number }> {
  const contour: Array<{ x: number; y: number }> = [];
  let x = startX;
  let y = startY;
  let dir = 0;

  // Strict limit to prevent infinite loops on complex contours
  const maxSteps = Math.min(width * height, 3000);
  let steps = 0;

  do {
    const key = `${x},${y}`;
    visited.add(key);
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

function smoothContour(
  contour: Array<{ x: number; y: number }>,
  amount: number
): Array<{ x: number; y: number }> {
  if (amount <= 0 || contour.length < 3) return contour;

  const windowSize = Math.max(1, Math.round(amount * 5));
  const result: Array<{ x: number; y: number }> = [];

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

    result.push({ x: sumX / count, y: sumY / count });
  }

  return result;
}

function contourToPath(contour: Array<{ x: number; y: number }>): string {
  if (contour.length === 0) return '';

  const commands: string[] = [];
  commands.push(`M ${contour[0].x.toFixed(2)} ${contour[0].y.toFixed(2)}`);

  for (let i = 1; i < contour.length; i++) {
    commands.push(`L ${contour[i].x.toFixed(2)} ${contour[i].y.toFixed(2)}`);
  }

  commands.push('Z');
  return commands.join(' ');
}

function scalePathsCentered(
  paths: string[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidthMm: number,
  targetHeightMm: number
): string[] {
  const scaleX = (targetWidthMm * 0.7) / sourceWidth;
  const scaleY = (targetHeightMm * 0.7) / sourceHeight;
  const scale = Math.min(scaleX, scaleY);

  const halfW = sourceWidth / 2;
  const halfH = sourceHeight / 2;

  return paths.map((path) => {
    let idx = 0;
    return path.replace(/-?\d+\.?\d*/g, (match) => {
      const v = parseFloat(match);
      const out = idx % 2 === 0 ? (v - halfW) * scale : (v - halfH) * scale;
      idx++;
      return out.toFixed(2);
    });
  });
}
