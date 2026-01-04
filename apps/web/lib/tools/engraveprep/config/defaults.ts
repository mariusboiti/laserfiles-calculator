/**
 * Default values for EngravePrep
 * Used for reset functionality
 */

import { 
  Adjustments, 
  DitherMode, 
  ResizeState, 
  CropState,
  DEFAULT_ADJUSTMENTS 
} from '../types';

export const DEFAULT_RESIZE_STATE: ResizeState = {
  widthMm: 100,
  heightMm: 100,
  dpi: 318,
  lockAspectRatio: true,
};

export const DEFAULT_CROP_STATE: CropState = {
  crop: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  aspect: 'free',
  croppedAreaPixels: null,
  cropX: 0,
  cropY: 0,
  cropWidth: 100,
  cropHeight: 100,
};

export const DEFAULT_DITHER_MODE: DitherMode = 'floyd-steinberg';

export const DEFAULT_EASY_MODE = false;
export const DEFAULT_EASY_MODE_LEVEL = 3;

export { DEFAULT_ADJUSTMENTS };
