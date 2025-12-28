import type { JigsawInputs } from './jigsaw';

/**
 * V3 Premium Feature Flags
 */
export interface V3FeatureFlags {
  v3Enabled: boolean;
  trueNestingEnabled: boolean;
  pocketFrameEnabled: boolean;
  photoPipelineEnabled: boolean;
  aiImageEnabled: boolean;
  productKitEnabled: boolean;
}

/**
 * Module A: True Nesting Settings
 */
export type PackingMode = 'packed-grid' | 'true-nesting';
export type RotationSet = 'none' | '0-180' | '0-90-180-270';
export type NestingStrategy = 'fast' | 'balanced' | 'maximize-saving';

export interface TrueNestingSettings {
  enabled: boolean;
  allowRotation: boolean;
  rotationSet: RotationSet;
  density: number; // 1-10
  minGapMm: number;
  strategy: NestingStrategy;
  maxAttempts: number; // derived from strategy
  scatterEnabled: boolean;
  scatterRotation: boolean;
  keepIdsReadable: boolean;
}

/**
 * Module B: Pocket Frame System
 */
export type PocketFrameMode = 'pocket-only' | 'pocket-and-frame' | 'frame-only';
export type CornerStyle = 'round' | 'chamfer' | 'square';

export interface PocketFrameSettings {
  enabled: boolean;
  mode: PocketFrameMode;
  pocketMarginMm: number;
  wallThicknessMm: number;
  outerMarginMm: number;
  cornerStyle: CornerStyle;
  cornerRadiusMm: number;
  toleranceMm: number;
  hangingHoles: boolean;
  hangingHoleDiameter: number;
  hangingHoleOffset: number;
  magnetHoles: boolean;
  magnetHoleDiameter: number;
  magnetHoleInset: number;
  labelPlate: boolean;
  registrationPins: boolean;
  registrationPinCount: number;
}

/**
 * Module C: Photo Engraving Pipeline
 */
export type ImageFit = 'cover' | 'contain';
export type DitherMode = 'none' | 'floyd-steinberg' | 'stucki' | 'jarvis-judice-ninke';
export type EngraveTarget = 'front' | 'back';

export interface PhotoPreprocessSettings {
  brightness: number; // -100..100
  contrast: number; // -100..100
  gamma: number; // 0.5..2.0
  sharpen: number; // 0..1
  denoise: number; // 0..1
  backgroundSimplify: boolean;
}

export interface PhotoEngravingSettings {
  enabled: boolean;
  imageSource: 'upload' | 'ai';
  imageDataUrl?: string;
  fit: ImageFit;
  scale: number;
  panX: number;
  panY: number;
  rotate: number;
  preprocess: PhotoPreprocessSettings;
  ditherMode: DitherMode;
  dpi: number;
  target: EngraveTarget;
}

/**
 * Module D: AI Image Generator
 */
export type AIStylePreset = 'kids-cute' | 'realistic-portrait' | 'line-art' | 'stained-glass';

export interface AIImageSettings {
  enabled: boolean;
  prompt: string;
  stylePreset: AIStylePreset;
  noText: boolean;
  transparentBackground: boolean;
  variationCount: number;
  selectedVariation: number;
  seed: number;
}

/**
 * Module E: Difficulty Control
 */
export interface DifficultySettings {
  level: number; // 1-10
  edgeSymmetryLock: boolean;
  knobVariation: 'auto' | 'low' | 'medium' | 'high';
  ambiguousEdges: boolean;
}

/**
 * Module F: Product Kit Export
 */
export interface ProductKitSettings {
  enabled: boolean;
  includeCutSvg: boolean;
  includeFullSvg: boolean;
  includeEngravingPng: boolean;
  includeMockupPng: boolean;
  includeReadme: boolean;
  includeSettingsJson: boolean;
}

/**
 * Complete V3 Settings
 */
export interface JigsawV3Settings extends JigsawInputs {
  version: string;
  v3Features: V3FeatureFlags;
  trueNesting: TrueNestingSettings;
  pocketFrame: PocketFrameSettings;
  photoEngraving: PhotoEngravingSettings;
  aiImage: AIImageSettings;
  difficulty: DifficultySettings;
  productKit: ProductKitSettings;
}

/**
 * V3 Defaults
 */
export const V3_DEFAULTS: Partial<JigsawV3Settings> = {
  version: '3.0',
  v3Features: {
    v3Enabled: false,
    trueNestingEnabled: false,
    pocketFrameEnabled: false,
    photoPipelineEnabled: false,
    aiImageEnabled: false,
    productKitEnabled: false,
  },
  trueNesting: {
    enabled: false,
    allowRotation: false,
    rotationSet: 'none',
    density: 5,
    minGapMm: 1.5,
    strategy: 'balanced',
    maxAttempts: 1000,
    scatterEnabled: false,
    scatterRotation: false,
    keepIdsReadable: true,
  },
  pocketFrame: {
    enabled: false,
    mode: 'pocket-only',
    pocketMarginMm: 0.75,
    wallThicknessMm: 10,
    outerMarginMm: 10,
    cornerStyle: 'round',
    cornerRadiusMm: 5,
    toleranceMm: 0.15,
    hangingHoles: false,
    hangingHoleDiameter: 6,
    hangingHoleOffset: 15,
    magnetHoles: false,
    magnetHoleDiameter: 8,
    magnetHoleInset: 15,
    labelPlate: false,
    registrationPins: false,
    registrationPinCount: 4,
  },
  photoEngraving: {
    enabled: false,
    imageSource: 'upload',
    fit: 'cover',
    scale: 1.0,
    panX: 0,
    panY: 0,
    rotate: 0,
    preprocess: {
      brightness: 0,
      contrast: 0,
      gamma: 1.0,
      sharpen: 0,
      denoise: 0,
      backgroundSimplify: false,
    },
    ditherMode: 'none',
    dpi: 318,
    target: 'front',
  },
  aiImage: {
    enabled: false,
    prompt: '',
    stylePreset: 'kids-cute',
    noText: true,
    transparentBackground: false,
    variationCount: 4,
    selectedVariation: 0,
    seed: 12345,
  },
  difficulty: {
    level: 5,
    edgeSymmetryLock: false,
    knobVariation: 'auto',
    ambiguousEdges: false,
  },
  productKit: {
    enabled: false,
    includeCutSvg: true,
    includeFullSvg: true,
    includeEngravingPng: true,
    includeMockupPng: false,
    includeReadme: true,
    includeSettingsJson: true,
  },
};

/**
 * DPI Presets
 */
export const DPI_PRESETS = [
  { name: '254 DPI', value: 254 },
  { name: '318 DPI (Recommended)', value: 318 },
  { name: '508 DPI', value: 508 },
  { name: 'Custom', value: 300 },
];

/**
 * AI Style Descriptions
 */
export const AI_STYLE_DESCRIPTIONS: Record<AIStylePreset, string> = {
  'kids-cute': 'High contrast, simple shapes, child-friendly',
  'realistic-portrait': 'Photo-realistic, optimized for engraving',
  'line-art': 'Clean lines, minimal noise, vector-like',
  'stained-glass': 'Bold outlines, distinct regions',
};

/**
 * Nesting Strategy Descriptions
 */
export const NESTING_STRATEGY_DESCRIPTIONS: Record<NestingStrategy, string> = {
  'fast': 'Quick placement, good for previews',
  'balanced': 'Balance speed and material efficiency',
  'maximize-saving': 'Best material usage, slower',
};
