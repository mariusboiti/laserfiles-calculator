/**
 * Image Processing Web Worker
 * 
 * Handles heavy image processing off the main thread.
 * 
 * PIPELINE:
 * 1. Resize (if target dimensions specified)
 * 2. Mirror horizontal (if enabled)
 * 3. Convert to grayscale (using luminance formula)
 * 4. Apply brightness/contrast
 * 5. Apply gamma correction
 * 6. Clamp values 0-255
 * 7. Invert (if enabled)
 * 8. Apply dithering (if selected)
 */

import { WorkerInput, WorkerOutput, DitherMode, Adjustments } from '../types';

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { type, jobId, imageData, adjustments, ditherMethod, targetWidthPx, targetHeightPx } = e.data;
  
  if (type === 'process') {
    try {
      const result = processImage(imageData, adjustments, ditherMethod, targetWidthPx, targetHeightPx);
      const response: WorkerOutput = { type: 'result', jobId, imageData: result };
      self.postMessage(response, { transfer: [result.data.buffer] });
    } catch (error) {
      const response: WorkerOutput = { 
        type: 'error',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      self.postMessage(response);
    }
  }
};

/**
 * Main pipeline processor
 */
function processImage(
  imageData: ImageData,
  adjustments: Adjustments,
  ditherMethod: DitherMode,
  targetWidthPx: number,
  targetHeightPx: number
): ImageData {
  let result = imageData;
  
  // Step 1: Resize if target dimensions specified
  if (targetWidthPx && targetHeightPx) {
    result = applyResize(result, targetWidthPx, targetHeightPx);
  }
  
  // Step 2: Mirror horizontal
  if (adjustments.mirrorHorizontal) {
    result = applyMirror(result);
  }
  
  // Step 3: Apply adjustments (grayscale, brightness, contrast, gamma, invert)
  result = applyAdjustments(result, adjustments);
  
  // Step 4: Apply dithering
  if (ditherMethod !== 'none') {
    result = applyDithering(result, ditherMethod);
  }
  
  return result;
}


/**
 * Resize image using bilinear interpolation
 */
function applyResize(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
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

/**
 * Mirror image horizontally
 */
function applyMirror(imageData: ImageData): ImageData {
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

/**
 * Apply image adjustments: grayscale, brightness, contrast, gamma, invert
 * Handles both grayscale and color images safely
 */
function applyAdjustments(imageData: ImageData, adj: Adjustments): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(width, height);
  
  // Contrast factor calculation
  const contrastFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));
  
  // Gamma lookup table
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
    
    // Convert to grayscale using luminance formula
    if (adj.grayscale) {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = g = b = gray;
    }
    
    // Apply brightness
    r += brightnessOffset;
    g += brightnessOffset;
    b += brightnessOffset;
    
    // Apply contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;
    
    // Clamp to 0-255
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    // Apply gamma using LUT
    r = gammaLUT[Math.round(r)];
    g = gammaLUT[Math.round(g)];
    b = gammaLUT[Math.round(b)];
    
    // Invert
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

/**
 * Apply dithering algorithm
 * Converts grayscale image to 1-bit using error diffusion
 */
function applyDithering(imageData: ImageData, mode: DitherMode): ImageData {
  const { width, height } = imageData;
  
  // Create a working copy as float array for error accumulation
  const pixels = new Float32Array(width * height);
  for (let i = 0; i < pixels.length; i++) {
    // Use red channel (should be grayscale at this point)
    pixels[i] = imageData.data[i * 4];
  }
  
  // Apply error diffusion based on algorithm
  if (mode === 'floyd-steinberg') {
    applyFloydSteinberg(pixels, width, height);
  } else if (mode === 'atkinson') {
    applyAtkinson(pixels, width, height);
  }
  
  // Create output ImageData
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

/**
 * Floyd-Steinberg dithering
 * Error diffusion pattern:
 *       X   7/16
 * 3/16 5/16 1/16
 */
function applyFloydSteinberg(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = oldVal - newVal;
      
      pixels[idx] = newVal;
      
      // Distribute error to neighbors
      if (x + 1 < width) {
        pixels[idx + 1] += error * 7 / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          pixels[idx + width - 1] += error * 3 / 16;
        }
        pixels[idx + width] += error * 5 / 16;
        if (x + 1 < width) {
          pixels[idx + width + 1] += error * 1 / 16;
        }
      }
    }
  }
}

/**
 * Atkinson dithering
 * Error diffusion pattern (1/8 each):
 *     X  1  1
 *  1  1  1
 *     1
 * Only distributes 6/8 of error (creates higher contrast)
 */
function applyAtkinson(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = (oldVal - newVal) / 8;
      
      pixels[idx] = newVal;
      
      // Distribute error to 6 neighbors (1/8 each)
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

export {};
