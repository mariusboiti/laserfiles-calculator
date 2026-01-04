/**
 * Curved Photo Frame Generator V2 Types
 * With AI-assisted photo engraving prep
 */

import type { ImageAdjustments, DitherMode } from '@/lib/shared/image-pipeline';

export type PhotoSizePreset = '10x15' | '13x18' | '15x20' | 'custom';

export type MaterialThickness = 3 | 4 | 6;

export type CurveStrength = 'gentle' | 'medium' | 'strong';

export type StandType = 'slot' | 'finger_joint';

export type ViewingAngle = 65 | 70 | 75 | 80;

export type WoodStylePreset = 'birch' | 'basswood' | 'walnut' | 'acrylic';

export type DetailLevel = 'low' | 'medium' | 'high';

export interface PhotoSizeConfig {
  widthMm: number;
  heightMm: number;
}

export const PHOTO_SIZE_PRESETS: Record<PhotoSizePreset, PhotoSizeConfig | null> = {
  '10x15': { widthMm: 100, heightMm: 150 },
  '13x18': { widthMm: 130, heightMm: 180 },
  '15x20': { widthMm: 150, heightMm: 200 },
  'custom': null,
};

export interface WoodStyleConfig {
  id: WoodStylePreset;
  name: string;
  description: string;
  settings: Partial<ImageAdjustments> & {
    ditherMode: DitherMode;
    detailLevel: DetailLevel;
  };
}

export const WOOD_STYLE_PRESETS: WoodStyleConfig[] = [
  {
    id: 'birch',
    name: 'Birch',
    description: 'Soft contrast, preserve midtones',
    settings: {
      brightness: 5,
      contrast: 10,
      gamma: 1.0,
      sharpen: 20,
      ditherMode: 'stucki',
      detailLevel: 'medium',
    },
  },
  {
    id: 'basswood',
    name: 'Basswood',
    description: 'Fine detail, lighter engraving',
    settings: {
      brightness: 10,
      contrast: 5,
      gamma: 0.95,
      sharpen: 30,
      ditherMode: 'floyd-steinberg',
      detailLevel: 'high',
    },
  },
  {
    id: 'walnut',
    name: 'Walnut',
    description: 'Strong contrast, heavier lines',
    settings: {
      brightness: 0,
      contrast: 25,
      gamma: 1.15,
      sharpen: 15,
      ditherMode: 'stucki',
      detailLevel: 'medium',
    },
  },
  {
    id: 'acrylic',
    name: 'Acrylic',
    description: 'Clean edges, high contrast',
    settings: {
      brightness: 5,
      contrast: 30,
      gamma: 1.2,
      sharpen: 40,
      ditherMode: 'atkinson',
      detailLevel: 'high',
    },
  },
];

export interface AISettings {
  removeBackground: boolean;
  enhanceEdges: boolean;
  autoCrop: boolean;
}

export interface EngraveSettings {
  detailLevel: DetailLevel;
  contrast: number;
  ditherMode: DitherMode;
  woodStyle: WoodStylePreset | null;
}

export interface FrameSettings {
  photoSizePreset: PhotoSizePreset;
  photoWidthMm: number;
  photoHeightMm: number;
  thicknessMm: MaterialThickness;
  kerfMm: number;
  borderMm: number;
  cornerRadiusMm: number;
  curveStrength: CurveStrength;
  standType: StandType;
  standWidthMm: number;
  standDepthMm: number;
  viewingAngleDeg: ViewingAngle;
  kerfSegmentLengthMm: number;
  kerfGapLengthMm: number;
  kerfRowSpacingMm: number;
  bendZoneHeightMm: number;
  supportLipHeightMm: number;
  slotDepthMm: number;
}

export interface CurvedPhotoFrameV2Inputs {
  photoDataUrl?: string;
  processedPhotoDataUrl?: string;
  aiSettings: AISettings;
  engraveSettings: EngraveSettings;
  frameSettings: FrameSettings;
}

export interface CurvedPhotoFrameV2Result {
  svgs: {
    combined: string;
    front: string;
    back: string;
    stand: string;
  };
  warnings: string[];
}

export interface FeatureFlags {
  isProUser: boolean;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  removeBackground: true,
  enhanceEdges: true,
  autoCrop: false,
};

export const DEFAULT_ENGRAVE_SETTINGS: EngraveSettings = {
  detailLevel: 'medium',
  contrast: 15,
  ditherMode: 'stucki',
  woodStyle: 'birch',
};

export const DEFAULT_FRAME_SETTINGS: FrameSettings = {
  photoSizePreset: '10x15',
  photoWidthMm: 100,
  photoHeightMm: 150,
  thicknessMm: 4,
  kerfMm: 0.15,
  borderMm: 18,
  cornerRadiusMm: 10,
  curveStrength: 'medium',
  standType: 'slot',
  standWidthMm: 160,
  standDepthMm: 60,
  viewingAngleDeg: 65,
  kerfSegmentLengthMm: 8,
  kerfGapLengthMm: 3,
  kerfRowSpacingMm: 2.5,
  bendZoneHeightMm: 24,
  supportLipHeightMm: 10,
  slotDepthMm: 8,
};
