/**
 * AI Client for Image Processing
 * Provider abstraction for AI features (autocrop, remove-bg)
 */

import type { AutoCropResult, RemoveBackgroundResult, CropRect } from './types';

export interface AIProvider {
  autoCrop(imageDataUrl: string, aspectRatio?: number): Promise<AutoCropResult>;
  removeBackground(imageDataUrl: string): Promise<RemoveBackgroundResult>;
}

class AIClientImpl implements AIProvider {
  async autoCrop(imageDataUrl: string, aspectRatio?: number): Promise<AutoCropResult> {
    try {
      const response = await fetch('/api/ai/autocrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, aspectRatio }),
      });

      if (!response.ok) {
        throw new Error(`AI autocrop failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('AI autocrop failed, using center crop fallback', error);
      return this.centerCropFallback(imageDataUrl, aspectRatio);
    }
  }

  async removeBackground(imageDataUrl: string): Promise<RemoveBackgroundResult> {
    try {
      const response = await fetch('/api/ai/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      if (!response.ok) {
        throw new Error(`AI remove-bg failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      const img = await this.loadImageData(result.imageDataUrl);
      return { imageData: img };
    } catch (error) {
      console.error('AI remove-bg failed', error);
      throw error;
    }
  }

  private async centerCropFallback(imageDataUrl: string, aspectRatio?: number): Promise<AutoCropResult> {
    const img = await this.loadImage(imageDataUrl);
    const width = img.width;
    const height = img.height;

    let cropWidth = width;
    let cropHeight = height;

    if (aspectRatio) {
      const currentRatio = width / height;
      if (currentRatio > aspectRatio) {
        cropWidth = height * aspectRatio;
      } else {
        cropHeight = width / aspectRatio;
      }
    }

    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;

    return {
      crop: { x, y, width: cropWidth, height: cropHeight },
      confidence: 0.5,
      focalPoint: { x: width / 2, y: height / 2 },
    };
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private async loadImageData(dataUrl: string): Promise<ImageData> {
    const img = await this.loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  }
}

export const aiClient = new AIClientImpl();
