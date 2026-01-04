/**
 * Shared Image Pipeline Types
 * Used by EngravePrep and Curved Photo Frame Generator V2
 */

export type DitherMode = 'none' | 'floyd-steinberg' | 'atkinson' | 'stucki' | 'jarvis';

export interface ImageAdjustments {
  grayscale: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  mirrorHorizontal: boolean;
  sharpen?: number;
  denoise?: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AutoCropResult {
  crop: CropRect;
  confidence: number;
  focalPoint: { x: number; y: number };
}

export interface RemoveBackgroundResult {
  imageData: ImageData;
  maskData?: ImageData;
}

export interface ProcessingOptions {
  targetWidthPx?: number;
  targetHeightPx?: number;
  adjustments: ImageAdjustments;
  ditherMode: DitherMode;
  removeBackground?: boolean;
  enhanceEdges?: boolean;
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  grayscale: true,
  brightness: 0,
  contrast: 0,
  gamma: 1.0,
  invert: false,
  mirrorHorizontal: false,
  sharpen: 0,
  denoise: 0,
};
