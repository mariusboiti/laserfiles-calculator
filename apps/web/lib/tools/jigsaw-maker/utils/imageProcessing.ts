/**
 * Image Processing for Jigsaw Photo Mode
 * Based on Engrave Prep processing pipeline
 */

export interface PhotoProcessingSettings {
  enabled: boolean;
  grayscale: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  ditherMode: 'none' | 'floyd-steinberg' | 'atkinson';
}

/**
 * Process image for puzzle engraving
 */
export async function processImageForPuzzle(
  imageDataUrl: string,
  settings: PhotoProcessingSettings
): Promise<string> {
  if (!settings.enabled) {
    return imageDataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Apply adjustments
        imageData = applyAdjustments(imageData, settings);

        // Apply dithering if enabled
        if (settings.ditherMode !== 'none') {
          imageData = applyDithering(imageData, settings.ditherMode);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}

/**
 * Apply image adjustments: grayscale, brightness, contrast, gamma, invert
 */
function applyAdjustments(imageData: ImageData, settings: PhotoProcessingSettings): ImageData {
  const { width, height, data } = imageData;
  const newData = new ImageData(width, height);

  // Contrast factor calculation
  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

  // Gamma lookup table
  const gammaLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    gammaLUT[i] = Math.round(255 * Math.pow(i / 255, 1 / settings.gamma));
  }

  const brightnessOffset = (settings.brightness / 100) * 255;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    // Convert to grayscale using luminance formula
    if (settings.grayscale) {
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
    if (settings.invert) {
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
 */
function applyDithering(imageData: ImageData, mode: 'floyd-steinberg' | 'atkinson'): ImageData {
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
 */
function applyAtkinson(pixels: Float32Array, width: number, height: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = pixels[idx];
      const newVal = oldVal > 127 ? 255 : 0;
      const error = (oldVal - newVal) / 8;

      pixels[idx] = newVal;

      // Distribute error to neighbors (Atkinson pattern)
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
