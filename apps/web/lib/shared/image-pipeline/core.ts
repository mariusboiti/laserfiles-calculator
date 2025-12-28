/**
 * Shared Image Pipeline Core Processing
 * Extracted from EngravePrep for reuse across tools
 */

import type { ImageAdjustments, DitherMode } from './types';

export function processImagePipeline(
  imageData: ImageData,
  adjustments: ImageAdjustments,
  ditherMethod: DitherMode,
  targetWidthPx?: number,
  targetHeightPx?: number
): ImageData {
  let result = imageData;

  if (targetWidthPx && targetHeightPx) {
    result = applyResize(result, targetWidthPx, targetHeightPx);
  }

  if (adjustments.mirrorHorizontal) {
    result = applyMirror(result);
  }

  if (adjustments.denoise && adjustments.denoise > 0) {
    result = applyDenoise(result, adjustments.denoise);
  }

  result = applyAdjustments(result, adjustments);

  if (adjustments.sharpen && adjustments.sharpen > 0) {
    result = applySharpen(result, adjustments.sharpen);
  }

  if (ditherMethod !== 'none') {
    result = applyDithering(result, ditherMethod);
  }

  return result;
}

export function applyResize(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(newWidth, newHeight);

  const xRatio = width / newWidth;
  const yRatio = height / newHeight;

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;

      const x1 = Math.floor(srcX);
      const y1 = Math.floor(srcY);
      const x2 = Math.min(x1 + 1, width - 1);
      const y2 = Math.min(y1 + 1, height - 1);

      const xFrac = srcX - x1;
      const yFrac = srcY - y1;

      const dstIdx = (y * newWidth + x) * 4;

      for (let c = 0; c < 4; c++) {
        const v1 = data[(y1 * width + x1) * 4 + c];
        const v2 = data[(y1 * width + x2) * 4 + c];
        const v3 = data[(y2 * width + x1) * 4 + c];
        const v4 = data[(y2 * width + x2) * 4 + c];

        const top = v1 * (1 - xFrac) + v2 * xFrac;
        const bottom = v3 * (1 - xFrac) + v4 * xFrac;

        newData.data[dstIdx + c] = Math.round(top * (1 - yFrac) + bottom * yFrac);
      }
    }
  }

  return newData;
}

export function applyMirror(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = (y * width + (width - 1 - x)) * 4;

      newData.data[dstIdx] = data[srcIdx];
      newData.data[dstIdx + 1] = data[srcIdx + 1];
      newData.data[dstIdx + 2] = data[srcIdx + 2];
      newData.data[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return newData;
}

export function applyAdjustments(imageData: ImageData, adj: ImageAdjustments): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(width, height);

  const contrastFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));

  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLUT[i] = Math.round(255 * Math.pow(i / 255, 1 / adj.gamma));
  }

  const brightnessOffset = (adj.brightness / 100) * 255;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    if (adj.grayscale) {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = gray;
      g = gray;
      b = gray;
    }

    r += brightnessOffset;
    g += brightnessOffset;
    b += brightnessOffset;

    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    r = gammaLUT[Math.round(r)];
    g = gammaLUT[Math.round(g)];
    b = gammaLUT[Math.round(b)];

    if (adj.invert) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }

    newData.data[i] = r;
    newData.data[i + 1] = g;
    newData.data[i + 2] = b;
    newData.data[i + 3] = a;
  }

  return newData;
}

export function applyDenoise(imageData: ImageData, strength: number): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(width, height);
  
  const radius = Math.max(1, Math.floor(strength));
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
      }
      
      const dstIdx = (y * width + x) * 4;
      newData.data[dstIdx] = sumR / count;
      newData.data[dstIdx + 1] = sumG / count;
      newData.data[dstIdx + 2] = sumB / count;
      newData.data[dstIdx + 3] = data[dstIdx + 3];
    }
  }
  
  return newData;
}

export function applySharpen(imageData: ImageData, strength: number): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(width, height);
  
  const amount = strength / 100;
  
  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        
        sum += data[((y - 1) * width + x) * 4 + c] * kernel[1];
        sum += data[(y * width + (x - 1)) * 4 + c] * kernel[3];
        sum += data[(y * width + x) * 4 + c] * kernel[4];
        sum += data[(y * width + (x + 1)) * 4 + c] * kernel[5];
        sum += data[((y + 1) * width + x) * 4 + c] * kernel[7];
        
        const dstIdx = (y * width + x) * 4;
        newData.data[dstIdx + c] = Math.max(0, Math.min(255, sum));
      }
      
      const dstIdx = (y * width + x) * 4;
      newData.data[dstIdx + 3] = data[dstIdx + 3];
    }
  }
  
  for (let x = 0; x < width; x++) {
    for (let c = 0; c < 4; c++) {
      newData.data[x * 4 + c] = data[x * 4 + c];
      newData.data[((height - 1) * width + x) * 4 + c] = data[((height - 1) * width + x) * 4 + c];
    }
  }
  
  for (let y = 0; y < height; y++) {
    for (let c = 0; c < 4; c++) {
      newData.data[y * width * 4 + c] = data[y * width * 4 + c];
      newData.data[(y * width + width - 1) * 4 + c] = data[(y * width + width - 1) * 4 + c];
    }
  }
  
  return newData;
}

export function applyDithering(imageData: ImageData, mode: DitherMode): ImageData {
  const { width, height } = imageData;

  const pixels = new Float32Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = imageData.data[i * 4];
  }

  if (mode === 'floyd-steinberg') {
    applyFloydSteinberg(pixels, width, height);
  } else if (mode === 'atkinson') {
    applyAtkinson(pixels, width, height);
  } else if (mode === 'stucki') {
    applyStucki(pixels, width, height);
  } else if (mode === 'jarvis') {
    applyJarvis(pixels, width, height);
  }

  const newData = new ImageData(width, height);
  for (let i = 0; i < pixels.length; i++) {
    const val = pixels[i] > 127 ? 255 : 0;
    newData.data[i * 4] = val;
    newData.data[i * 4 + 1] = val;
    newData.data[i * 4 + 2] = val;
    newData.data[i * 4 + 3] = 255;
  }

  return newData;
}

function applyFloydSteinberg(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = oldVal - newVal;

      pixels[idx] = newVal;

      if (x + 1 < width) {
        pixels[idx + 1] += (error * 7) / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          pixels[idx + width - 1] += (error * 3) / 16;
        }
        pixels[idx + width] += (error * 5) / 16;
        if (x + 1 < width) {
          pixels[idx + width + 1] += error / 16;
        }
      }
    }
  }
}

function applyAtkinson(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = (oldVal - newVal) / 8;

      pixels[idx] = newVal;

      if (x + 1 < width) pixels[idx + 1] += error;
      if (x + 2 < width) pixels[idx + 2] += error;

      if (y + 1 < height) {
        if (x > 0) pixels[idx + width - 1] += error;
        pixels[idx + width] += error;
        if (x + 1 < width) pixels[idx + width + 1] += error;
      }

      if (y + 2 < height) {
        pixels[idx + width * 2] += error;
      }
    }
  }
}

function applyStucki(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = oldVal - newVal;

      pixels[idx] = newVal;

      if (x + 1 < width) pixels[idx + 1] += (error * 8) / 42;
      if (x + 2 < width) pixels[idx + 2] += (error * 4) / 42;

      if (y + 1 < height) {
        if (x > 1) pixels[idx + width - 2] += (error * 2) / 42;
        if (x > 0) pixels[idx + width - 1] += (error * 4) / 42;
        pixels[idx + width] += (error * 8) / 42;
        if (x + 1 < width) pixels[idx + width + 1] += (error * 4) / 42;
        if (x + 2 < width) pixels[idx + width + 2] += (error * 2) / 42;
      }

      if (y + 2 < height) {
        if (x > 1) pixels[idx + width * 2 - 2] += error / 42;
        if (x > 0) pixels[idx + width * 2 - 1] += (error * 2) / 42;
        pixels[idx + width * 2] += (error * 4) / 42;
        if (x + 1 < width) pixels[idx + width * 2 + 1] += (error * 2) / 42;
        if (x + 2 < width) pixels[idx + width * 2 + 2] += error / 42;
      }
    }
  }
}

function applyJarvis(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = oldVal - newVal;

      pixels[idx] = newVal;

      if (x + 1 < width) pixels[idx + 1] += (error * 7) / 48;
      if (x + 2 < width) pixels[idx + 2] += (error * 5) / 48;

      if (y + 1 < height) {
        if (x > 1) pixels[idx + width - 2] += (error * 3) / 48;
        if (x > 0) pixels[idx + width - 1] += (error * 5) / 48;
        pixels[idx + width] += (error * 7) / 48;
        if (x + 1 < width) pixels[idx + width + 1] += (error * 5) / 48;
        if (x + 2 < width) pixels[idx + width + 2] += (error * 3) / 48;
      }

      if (y + 2 < height) {
        if (x > 1) pixels[idx + width * 2 - 2] += error / 48;
        if (x > 0) pixels[idx + width * 2 - 1] += (error * 3) / 48;
        pixels[idx + width * 2] += (error * 5) / 48;
        if (x + 1 < width) pixels[idx + width * 2 + 1] += (error * 3) / 48;
        if (x + 2 < width) pixels[idx + width * 2 + 2] += error / 48;
      }
    }
  }
}

export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function loadImageFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
