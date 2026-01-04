/**
 * Image normalization for AI-generated silhouettes before tracing.
 * Handles bounding box detection, auto-rotation for landscape orientation,
 * and centering into a fixed canvas size.
 */

export type NormalizeResult = {
  dataUrl: string;
  debug: string[];
  bbox: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  sourceSize: { w: number; h: number };
  targetSize: { w: number; h: number };
  scale: number;
};

export type NormalizeOptions = {
  targetWidth?: number;
  targetHeight?: number;
  padding?: number;
  alphaThreshold?: number;
  autoRotate?: boolean;
};

const DEFAULT_OPTIONS: Required<NormalizeOptions> = {
  targetWidth: 1024,
  targetHeight: 512,
  padding: 20,
  alphaThreshold: 10,
  autoRotate: true,
};

/**
 * Normalize a PNG image for tracing:
 * 1. Load into canvas
 * 2. Compute bounding box of non-transparent pixels
 * 3. Auto-rotate to landscape if portrait
 * 4. Crop to bbox + padding
 * 5. Center into fixed-size canvas preserving aspect ratio
 */
export async function normalizeImage(
  dataUrl: string,
  options: NormalizeOptions = {}
): Promise<NormalizeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const debug: string[] = [];

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const sourceW = img.width;
        const sourceH = img.height;
        debug.push(`source: ${sourceW}x${sourceH}`);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceW;
        tempCanvas.height = sourceH;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) throw new Error('Failed to get canvas context');

        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, sourceW, sourceH);
        const data = imageData.data;

        let minX = sourceW;
        let minY = sourceH;
        let maxX = 0;
        let maxY = 0;
        let hasContent = false;

        for (let y = 0; y < sourceH; y++) {
          for (let x = 0; x < sourceW; x++) {
            const idx = (y * sourceW + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > opts.alphaThreshold) {
              hasContent = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!hasContent) {
          throw new Error('Image contains no visible content (all transparent)');
        }

        const bboxW = maxX - minX + 1;
        const bboxH = maxY - minY + 1;
        debug.push(`bbox: ${bboxW}x${bboxH} at (${minX},${minY})`);

        let needsRotation = false;
        if (opts.autoRotate && bboxH > bboxW * 1.1) {
          needsRotation = true;
          debug.push('portrait detected, will rotate 90°');
        }

        const croppedCanvas = document.createElement('canvas');
        if (needsRotation) {
          croppedCanvas.width = bboxH;
          croppedCanvas.height = bboxW;
        } else {
          croppedCanvas.width = bboxW;
          croppedCanvas.height = bboxH;
        }

        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) throw new Error('Failed to get cropped canvas context');

        if (needsRotation) {
          croppedCtx.translate(croppedCanvas.width / 2, croppedCanvas.height / 2);
          croppedCtx.rotate(Math.PI / 2);
          croppedCtx.drawImage(
            tempCanvas,
            minX,
            minY,
            bboxW,
            bboxH,
            -bboxW / 2,
            -bboxH / 2,
            bboxW,
            bboxH
          );
        } else {
          croppedCtx.drawImage(tempCanvas, minX, minY, bboxW, bboxH, 0, 0, bboxW, bboxH);
        }

        const croppedW = croppedCanvas.width;
        const croppedH = croppedCanvas.height;
        debug.push(`cropped: ${croppedW}x${croppedH}`);

        const availableW = opts.targetWidth - opts.padding * 2;
        const availableH = opts.targetHeight - opts.padding * 2;
        const scale = Math.min(availableW / croppedW, availableH / croppedH);
        const scaledW = Math.round(croppedW * scale);
        const scaledH = Math.round(croppedH * scale);
        debug.push(`scale: ${scale.toFixed(3)}, scaled: ${scaledW}x${scaledH}`);

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = opts.targetWidth;
        finalCanvas.height = opts.targetHeight;
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) throw new Error('Failed to get final canvas context');

        finalCtx.fillStyle = 'transparent';
        finalCtx.clearRect(0, 0, opts.targetWidth, opts.targetHeight);

        const offsetX = Math.round((opts.targetWidth - scaledW) / 2);
        const offsetY = Math.round((opts.targetHeight - scaledH) / 2);
        finalCtx.drawImage(croppedCanvas, 0, 0, croppedW, croppedH, offsetX, offsetY, scaledW, scaledH);

        debug.push(`final: ${opts.targetWidth}x${opts.targetHeight}, centered at (${offsetX},${offsetY})`);

        const normalizedDataUrl = finalCanvas.toDataURL('image/png');

        resolve({
          dataUrl: normalizedDataUrl,
          debug,
          bbox: { x: minX, y: minY, w: bboxW, h: bboxH },
          rotated: needsRotation,
          sourceSize: { w: sourceW, h: sourceH },
          targetSize: { w: opts.targetWidth, h: opts.targetHeight },
          scale,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = dataUrl;
  });
}
