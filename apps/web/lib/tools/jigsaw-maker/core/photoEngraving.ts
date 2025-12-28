import type { PhotoEngravingSettings, PhotoPreprocessSettings } from '../types/jigsawV3';

/**
 * Module C: Photo Engraving Pipeline
 * Image processing for laser engraving
 */

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
  dpi: number;
}

/**
 * Process image for engraving
 */
export async function processImageForEngraving(
  imageDataUrl: string,
  puzzleWidth: number,
  puzzleHeight: number,
  settings: PhotoEngravingSettings
): Promise<ProcessedImage> {
  // Calculate target dimensions in pixels
  const pixelWidth = Math.round((puzzleWidth / 25.4) * settings.dpi);
  const pixelHeight = Math.round((puzzleHeight / 25.4) * settings.dpi);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load image
  const img = await loadImage(imageDataUrl);

  // Apply fit and transform
  applyFitTransform(ctx, img, pixelWidth, pixelHeight, settings);

  // Get image data for processing
  let imageData = ctx.getImageData(0, 0, pixelWidth, pixelHeight);

  // Apply preprocessing
  imageData = applyPreprocessing(imageData, settings.preprocess);

  // Apply dithering if enabled
  if (settings.ditherMode !== 'none') {
    imageData = applyDithering(imageData, settings.ditherMode);
  }

  // Put processed data back
  ctx.putImageData(imageData, 0, 0);

  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/png');

  return {
    dataUrl,
    width: pixelWidth,
    height: pixelHeight,
    dpi: settings.dpi,
  };
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Apply fit and transform
 */
function applyFitTransform(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  settings: PhotoEngravingSettings
): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const imgAspect = img.width / img.height;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (settings.fit === 'cover') {
    if (imgAspect > targetAspect) {
      drawHeight = targetHeight;
      drawWidth = drawHeight * imgAspect;
      drawX = (targetWidth - drawWidth) / 2;
      drawY = 0;
    } else {
      drawWidth = targetWidth;
      drawHeight = drawWidth / imgAspect;
      drawX = 0;
      drawY = (targetHeight - drawHeight) / 2;
    }
  } else {
    // contain
    if (imgAspect > targetAspect) {
      drawWidth = targetWidth;
      drawHeight = drawWidth / imgAspect;
      drawX = 0;
      drawY = (targetHeight - drawHeight) / 2;
    } else {
      drawHeight = targetHeight;
      drawWidth = drawHeight * imgAspect;
      drawX = (targetWidth - drawWidth) / 2;
      drawY = 0;
    }
  }

  // Apply scale
  drawWidth *= settings.scale;
  drawHeight *= settings.scale;

  // Apply pan
  drawX += settings.panX * targetWidth;
  drawY += settings.panY * targetHeight;

  // Apply rotation
  if (settings.rotate !== 0) {
    ctx.save();
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate((settings.rotate * Math.PI) / 180);
    ctx.translate(-targetWidth / 2, -targetHeight / 2);
  }

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  if (settings.rotate !== 0) {
    ctx.restore();
  }
}

/**
 * Apply preprocessing
 */
function applyPreprocessing(
  imageData: ImageData,
  settings: PhotoPreprocessSettings
): ImageData {
  const data = imageData.data;

  // Convert to grayscale and apply adjustments
  for (let i = 0; i < data.length; i += 4) {
    // Grayscale (luma)
    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    // Brightness
    gray += settings.brightness * 2.55;

    // Contrast
    const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
    gray = contrastFactor * (gray - 128) + 128;

    // Gamma
    gray = 255 * Math.pow(gray / 255, 1 / settings.gamma);

    // Clamp
    gray = Math.max(0, Math.min(255, gray));

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  // Sharpen
  if (settings.sharpen > 0) {
    imageData = applySharpen(imageData, settings.sharpen);
  }

  // Denoise
  if (settings.denoise > 0) {
    imageData = applyDenoise(imageData, settings.denoise);
  }

  return imageData;
}

/**
 * Apply sharpening
 */
function applySharpen(imageData: ImageData, amount: number): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);

  // Sharpen kernel
  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const idx = (y * width + x) * 4;
      const value = Math.max(0, Math.min(255, sum));
      output.data[idx] = value;
      output.data[idx + 1] = value;
      output.data[idx + 2] = value;
      output.data[idx + 3] = 255;
    }
  }

  return output;
}

/**
 * Apply denoising (simple box blur)
 */
function applyDenoise(imageData: ImageData, amount: number): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const radius = Math.ceil(amount * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = x + kx;
          const ny = y + ky;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += data[(ny * width + nx) * 4];
            count++;
          }
        }
      }

      const idx = (y * width + x) * 4;
      const value = sum / count;
      output.data[idx] = value;
      output.data[idx + 1] = value;
      output.data[idx + 2] = value;
      output.data[idx + 3] = 255;
    }
  }

  return output;
}

/**
 * Apply dithering
 */
function applyDithering(imageData: ImageData, mode: string): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  switch (mode) {
    case 'floyd-steinberg':
      return floydSteinbergDither(imageData);
    case 'stucki':
      return stuckiDither(imageData);
    case 'jarvis-judice-ninke':
      return jarvisJudiceNinkeDither(imageData);
    default:
      return imageData;
  }
}

/**
 * Floyd-Steinberg dithering
 */
function floydSteinbergDither(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldPixel = data[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      data[idx] = newPixel;
      data[idx + 1] = newPixel;
      data[idx + 2] = newPixel;

      const error = oldPixel - newPixel;

      // Distribute error
      if (x + 1 < width) {
        const i = (y * width + x + 1) * 4;
        data[i] += error * 7 / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          const i = ((y + 1) * width + x - 1) * 4;
          data[i] += error * 3 / 16;
        }
        const i = ((y + 1) * width + x) * 4;
        data[i] += error * 5 / 16;
        if (x + 1 < width) {
          const i = ((y + 1) * width + x + 1) * 4;
          data[i] += error * 1 / 16;
        }
      }
    }
  }

  return imageData;
}

/**
 * Stucki dithering
 */
function stuckiDither(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldPixel = data[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      data[idx] = newPixel;
      data[idx + 1] = newPixel;
      data[idx + 2] = newPixel;

      const error = oldPixel - newPixel;

      // Stucki kernel
      const distribute = [
        [0, 0, 0, 8, 4],
        [2, 4, 8, 4, 2],
        [1, 2, 4, 2, 1]
      ];

      for (let dy = 0; dy < 3; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dy === 0 && dx <= 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny < height) {
            const i = (ny * width + nx) * 4;
            data[i] += error * distribute[dy][dx + 2] / 42;
          }
        }
      }
    }
  }

  return imageData;
}

/**
 * Jarvis-Judice-Ninke dithering
 */
function jarvisJudiceNinkeDither(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const oldPixel = data[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      data[idx] = newPixel;
      data[idx + 1] = newPixel;
      data[idx + 2] = newPixel;

      const error = oldPixel - newPixel;

      // JJN kernel
      const distribute = [
        [0, 0, 0, 7, 5],
        [3, 5, 7, 5, 3],
        [1, 3, 5, 3, 1]
      ];

      for (let dy = 0; dy < 3; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dy === 0 && dx <= 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny < height) {
            const i = (ny * width + nx) * 4;
            data[i] += error * distribute[dy][dx + 2] / 48;
          }
        }
      }
    }
  }

  return imageData;
}

/**
 * Generate engraving guide SVG
 */
export function generateEngraveGuideSvg(
  puzzleWidth: number,
  puzzleHeight: number,
  cornerRadius: number
): string {
  const path = `M ${cornerRadius} 0 ` +
    `L ${puzzleWidth - cornerRadius} 0 ` +
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${puzzleWidth} ${cornerRadius} ` +
    `L ${puzzleWidth} ${puzzleHeight - cornerRadius} ` +
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${puzzleWidth - cornerRadius} ${puzzleHeight} ` +
    `L ${cornerRadius} ${puzzleHeight} ` +
    `A ${cornerRadius} ${cornerRadius} 0 0 1 0 ${puzzleHeight - cornerRadius} ` +
    `L 0 ${cornerRadius} ` +
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${cornerRadius} 0 Z`;

  return `<g id="ENGRAVE_GUIDE" fill="none" stroke="#CCCCCC" stroke-width="0.1">
  <path d="${path}" />
</g>`;
}
