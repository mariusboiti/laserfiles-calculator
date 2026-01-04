export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16';

export type DepthStyle = 'bas-relief-engraving';

export type BackgroundStyle = 'clean' | 'cinematic' | 'minimal';

export type PlaqueShape = 'arch' | 'oval' | 'shield' | 'rectangle';
export type ReliefMaterial = 'clay' | 'stone' | 'resin' | 'wood';

export type MaterialProfile = 'birch-plywood' | 'mdf' | 'solid-wood' | 'slate-stone' | 'acrylic';
export type DepthZones = 3 | 4 | 5;
export type PreviewMode = 'grayscale' | 'false-color';

export interface BasReliefOptions {
  plaqueShape: PlaqueShape;
  reliefStrength: number;
  material: ReliefMaterial;
  bottomNotch: boolean;
}

export interface EngravingOptions {
  materialProfile: MaterialProfile;
  depthZones: DepthZones;
  engravingDepthBoost: number; // 0-100, controls post-processing intensity
  invertDepth: boolean;
}

export interface DepthImageRequest {
  prompt: string;
  style: DepthStyle;
  ratio: AspectRatio;
  engravingOptions: EngravingOptions;
}

export interface DepthImageResponse {
  imagePngBase64: string;
  depthMapPngBase64: string;
  seed: string | null;
  histogramData?: number[];
  validationWarnings?: string[];
}

export interface DepthMapRequest {
  imagePngBase64: string;
}

export interface DepthMapResponse {
  depthPngBase64: string;
  invertSuggested: boolean;
}

export interface LayerData {
  index: number;
  pngBase64: string;
  depthRange: { min: number; max: number };
}

export const STYLE_PRESETS: Record<DepthStyle, { label: string; description: string }> = {
  'bas-relief-engraving': {
    label: 'Bas-Relief Engraving (Technical)',
    description: 'Professional height map for laser engraving - optimized for depth control',
  },
};

export const PLAQUE_SHAPES: Record<PlaqueShape, { label: string; promptModifier: string }> = {
  'arch': {
    label: 'Arch',
    promptModifier: 'arched top plaque frame, recessed border',
  },
  'oval': {
    label: 'Oval',
    promptModifier: 'oval cameo frame, classic medallion shape',
  },
  'shield': {
    label: 'Shield',
    promptModifier: 'shield-shaped plaque frame, medieval emblem proportions',
  },
  'rectangle': {
    label: 'Rectangle',
    promptModifier: 'rectangular plaque with softly rounded corners',
  },
};

export const RELIEF_MATERIALS: Record<ReliefMaterial, { label: string; promptModifier: string }> = {
  'clay': {
    label: 'Clay',
    promptModifier: 'matte clay surface, subtle sculpting marks, soft diffuse highlights',
  },
  'stone': {
    label: 'Stone',
    promptModifier: 'polished stone bas-relief, subtle mineral grain, solid weight',
  },
  'resin': {
    label: 'Resin',
    promptModifier: 'smooth resin relief, clean highlights, refined sculptural surface',
  },
  'wood': {
    label: 'Wood',
    promptModifier: 'carved wood bas-relief, fine carving lines, natural wood depth',
  },
};

export const MATERIAL_PROFILES: Record<MaterialProfile, { 
  label: string; 
  maxContrast: number; 
  gamma: number;
  detailSuppression: number;
  recommendedDepth: string;
}> = {
  'birch-plywood': {
    label: 'Birch Plywood',
    maxContrast: 0.75,
    gamma: 0.85,
    detailSuppression: 0.3,
    recommendedDepth: '0.5-2mm',
  },
  'mdf': {
    label: 'MDF',
    maxContrast: 0.7,
    gamma: 0.8,
    detailSuppression: 0.4,
    recommendedDepth: '0.3-1.5mm',
  },
  'solid-wood': {
    label: 'Solid Wood',
    maxContrast: 0.85,
    gamma: 0.9,
    detailSuppression: 0.2,
    recommendedDepth: '0.5-3mm',
  },
  'slate-stone': {
    label: 'Slate / Stone',
    maxContrast: 0.95,
    gamma: 0.95,
    detailSuppression: 0.1,
    recommendedDepth: '0.2-1mm',
  },
  'acrylic': {
    label: 'Acrylic',
    maxContrast: 0.9,
    gamma: 0.92,
    detailSuppression: 0.15,
    recommendedDepth: '0.3-2mm',
  },
};

export const ASPECT_RATIOS: Record<AspectRatio, { label: string; width: number; height: number }> = {
  '1:1': { label: '1:1 (Square)', width: 1024, height: 1024 },
  '4:5': { label: '4:5 (Portrait)', width: 896, height: 1120 },
  '16:9': { label: '16:9 (Landscape)', width: 1344, height: 768 },
  '9:16': { label: '9:16 (Vertical)', width: 768, height: 1344 },
};
