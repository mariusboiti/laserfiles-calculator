export type TracePreset = 'fast' | 'detailed';

export type PreprocessInput = {
  dataUrl?: string;
  file?: File;
};

export type PreprocessOptions = {
  preset?: TracePreset;
  maxDim?: number;
  threshold?: number;
  invert?: boolean;
  removeBackground?: boolean;
  smoothing?: number;
};

// Balanced limits - enough detail but prevent OOM
const ABSOLUTE_MAX_DIM = 300;
const MAX_PIXELS = 80000; // ~280x280

export type PreprocessResult = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

async function decodeToBitmap(input: PreprocessInput): Promise<ImageBitmap> {
  if (input.file) {
    return await createImageBitmap(input.file);
  }
  if (!input.dataUrl) {
    throw new Error('Missing image input');
  }
  const res = await fetch(input.dataUrl);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

function computeTargetSize(srcW: number, srcH: number, maxDim: number) {
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  return { w, h };
}

export async function preprocessForTrace(input: PreprocessInput, opts: PreprocessOptions = {}): Promise<PreprocessResult> {
  const preset = opts.preset ?? 'fast';
  const requestedMaxDim = opts.maxDim ?? (preset === 'detailed' ? 280 : 220);
  let maxDim = clamp(requestedMaxDim, 120, ABSOLUTE_MAX_DIM);
  const threshold = clamp(opts.threshold ?? 160, 0, 255);
  const invert = !!opts.invert;
  const removeBackground = opts.removeBackground !== false;

  const bitmap = await decodeToBitmap(input);

  try {
    for (let attempts = 0; attempts < 3; attempts++) {
      const { w, h } = computeTargetSize(bitmap.width, bitmap.height, maxDim);

      const canvas: OffscreenCanvas | HTMLCanvasElement =
        typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');

      if (!(canvas instanceof OffscreenCanvas)) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(bitmap, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      const totalPixels = w * h;
      if (totalPixels > MAX_PIXELS || imageData.data.byteLength > 2 * 1024 * 1024) {
        maxDim = Math.max(128, Math.floor(maxDim * 0.7));
        continue;
      }

      const data = imageData.data;
      let blackCount = 0;
      let whiteCount = 0;

      // First pass: threshold and count
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const isTransparent = removeBackground && a < 128;
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        let v = gray > threshold ? 255 : 0;
        if (invert) v = 255 - v;
        if (isTransparent) v = 255;

        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;

        if (v === 0) blackCount++;
        else whiteCount++;
      }

      // Auto-invert if too few black pixels (< 3%) - likely a white-on-dark or mostly white image
      const totalPx = blackCount + whiteCount;
      const blackRatio = blackCount / totalPx;
      if (blackRatio > 0.97 && !invert) {
        // Invert the image
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i + 1] = data[i + 2] = 255 - data[i];
        }
      }

      const out = new Uint8ClampedArray(imageData.data);
      return { width: w, height: h, data: out };
    }

    throw new Error('Image too large to preprocess safely');
  } finally {
    bitmap.close();
  }
}
