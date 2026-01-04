import { createRequire } from 'module';

export type TraceQualityMode = 'CUT_SILHOUETTE' | 'ENGRAVE_LINEART';

export type PreprocessForPotraceInput =
  | { buffer: Buffer; contentType?: string }
  | { dataUrl: string };

export type PreprocessForPotraceOptions = {
  mode: TraceQualityMode;
  maxDim?: number;
  threshold: number; // 80..220
  denoise: number; // 0..3
  autoInvert: boolean;
  forceInvert?: boolean;
};

export type PreprocessForPotraceResult = {
  buffer: Buffer;
  width: number;
  height: number;
  debug: {
    requestedMaxDim: number;
    usedMaxDim: number;
    threshold: number;
    denoise: number;
    autoInvert: boolean;
    blackRatio: number;
    inverted: boolean;
  };
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType?: string } {
  const m = dataUrl.match(/^data:([^;,]+)?;base64,(.*)$/);
  if (!m) {
    throw new Error('Invalid dataUrl');
  }
  const contentType = m[1] || undefined;
  const b64 = m[2] || '';
  return { buffer: Buffer.from(b64, 'base64'), contentType };
}

function denoiseToMedianKernel(denoise: number): number | null {
  const d = Math.round(clamp(denoise, 0, 3));
  if (d <= 0) return null;
  if (d === 1) return 3;
  if (d === 2) return 3;
  return 5;
}

export async function preprocessForPotrace(
  input: PreprocessForPotraceInput,
  options: PreprocessForPotraceOptions
): Promise<PreprocessForPotraceResult> {
  let sharp: any;
  try {
    const require = createRequire(import.meta.url);
    sharp = require('sharp');
  } catch (e) {
    throw new Error('Missing dependency: sharp');
  }

  const src = 'dataUrl' in input ? decodeDataUrl(input.dataUrl) : input;

  const requestedMaxDim = options.maxDim ?? (options.mode === 'CUT_SILHOUETTE' ? 2200 : 1600);
  let maxDim = clamp(requestedMaxDim, 240, 3000);

  const threshold = clamp(options.threshold, 80, 220);
  const denoise = clamp(options.denoise, 0, 3);

  // Safety: keep pixel count bounded even if input is large.
  // We try up to 3 downsizes.
  for (let attempts = 0; attempts < 3; attempts++) {
    const base = sharp(src.buffer, { failOnError: false })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
      .grayscale();

    const contrastAdjusted = options.mode === 'ENGRAVE_LINEART' ? base.linear(1.2, -10) : base;

    const medianKernel = denoiseToMedianKernel(denoise);
    const withDenoise = medianKernel ? contrastAdjusted.median(medianKernel) : contrastAdjusted;

    const preThresh = withDenoise;

    // Threshold to 0/255
    const thresholded = preThresh.threshold(threshold);

    // Compute black ratio on thresholded output for auto-invert decision.
    const raw = await thresholded.raw().toBuffer({ resolveWithObject: true });
    const pixels = raw.data;
    const total = pixels.length;
    let black = 0;
    for (let i = 0; i < total; i++) {
      if (pixels[i] < 128) black++;
    }
    const blackRatio = total > 0 ? black / total : 0;

    const shouldAutoInvert = options.autoInvert && blackRatio > 0.8;
    const shouldInvert = shouldAutoInvert || options.forceInvert === true;

    const finalImg = shouldInvert ? thresholded.negate() : thresholded;

    const meta = raw.info;

    // If the image is still too big (defensive), reduce and retry.
    const pxCount = meta.width * meta.height;
    if (pxCount > 8_000_000) {
      maxDim = Math.max(240, Math.floor(maxDim * 0.75));
      continue;
    }

    const outBuf = await finalImg.png().toBuffer();

    return {
      buffer: outBuf,
      width: meta.width,
      height: meta.height,
      debug: {
        requestedMaxDim,
        usedMaxDim: maxDim,
        threshold,
        denoise,
        autoInvert: options.autoInvert,
        blackRatio,
        inverted: shouldInvert,
      },
    };
  }

  throw new Error('Failed to preprocess image safely');
}
