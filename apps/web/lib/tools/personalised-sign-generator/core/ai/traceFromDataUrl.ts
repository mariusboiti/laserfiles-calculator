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

  // Reduced max sizes to prevent page freezing
  const maxSize = options.detail === 'high' ? 700 : options.detail === 'medium' ? 500 : 300;
  const scaleToMax = Math.min(1, maxSize / Math.max(img.width, img.height));

  canvas.width = Math.round(img.width * scaleToMax);
  canvas.height = Math.round(img.height * scaleToMax);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataObj.data;

  const threshold = clamp(options.threshold, 0, 255);

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    const isTransparent = options.removeBackground && data[i + 3] < 128;

    let value = gray > threshold ? 255 : 0;
    if (options.invert) value = 255 - value;
    if (isTransparent) value = 255;

    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }

  const paths = traceContours(imageDataObj, options.smoothing);
  if (paths.length === 0) {
    throw new Error('No contours found. Try adjusting threshold.');
  }

  const scaledPaths = scalePathsCentered(paths, canvas.width, canvas.height, targetWidthMm, targetHeightMm);
  return scaledPaths.join(' ');
}

function traceContours(imageData: ImageData, smoothing: number): string[] {
  const { data, width, height } = imageData;
  const paths: string[] = [];
  const visited = new Set<string>();

  const getPixel = (x: number, y: number): number => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    const idx = (y * width + x) * 4;
    return data[idx] < 128 ? 1 : 0;
  };

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const p = getPixel(x, y);
      const pRight = getPixel(x + 1, y);
      const pBottom = getPixel(x, y + 1);

      if (p !== pRight || p !== pBottom) {
        const contour = traceContour(x, y, getPixel, visited, width, height);
        if (contour.length > 3) {
          const smoothed = smoothContour(contour, smoothing);
          paths.push(contourToPath(smoothed));
        }
      }
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

  const maxSteps = width * height;
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
