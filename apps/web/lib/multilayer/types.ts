// MultiLayer Maker V3 - Complete Type Definitions

export type WizardStep = 'source' | 'layers' | 'export';

export type AIPreset = 'cute' | 'realistic' | 'christmas' | 'minimal' | 'bold';
export type DetailLevel = 'low' | 'medium' | 'high';
export type BackgroundType = 'transparent' | 'solid';

export interface AIGenerateRequest {
  mode?: 'shadowbox' | 'poster' | 'ornament' | 'mandala' | 'sign' | 'custom';
  subject: string;
  preset: AIPreset;
  detail: DetailLevel;
  background: BackgroundType;
}

export interface AIGenerateResponse {
  imageUrl?: string;
  imageBase64?: string;
  seed: number;
  promptUsedHash: string;
}

export interface SourceImage {
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface LayerMask {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  imageData: ImageData;
  threshold: number;
  color: string;
}

export interface VectorLayer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  svgPath: string;
  svgContent: string;
  color: string;
  threshold: number;
  stats: {
    pathCount: number;
    openPaths: number;
    islandCount: number;
    boundingBox: { x: number; y: number; width: number; height: number };
  };
}

export interface ProjectSettings {
  // Quantization
  layerCount: number;
  quantizeMethod: 'kmeans' | 'posterize';
  
  // Background removal
  removeBg: boolean;
  bgTolerance: number;
  bgSoftness: number;
  
  // Cleanup
  minIslandArea: number; // mm²
  smoothEdges: number; // 0-10
  minThickness: number; // mm
  
  // Vectorization
  simplifyTolerance: number; // 0-5
  
  // Bridges (V3)
  autoBridges: boolean;
  bridgeWidth: number; // pixels
  
  // Material (V3)
  materialThicknessMm: number;
  spacerMm?: number;
  
  // Image prep (V3)
  edgeEnhance: number;
  contrastBoost: number;
  
  // Output
  targetWidthMm: number;
  outputFormat: 'filled' | 'stroked';
  
  // Export
  includePreview: boolean;
  includeSettings: boolean;
  includeDXF: boolean;
  includeAssemblyPDF: boolean;
}

export interface ProjectState {
  mode: 'shadowbox' | 'poster' | 'ornament' | 'mandala' | 'sign' | 'custom';
  currentStep: WizardStep;
  sourceImage: SourceImage | null;
  layerMasks: LayerMask[];
  vectorLayers: VectorLayer[];
  settings: ProjectSettings;
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
}

export interface HealthCheck {
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  layerCount: 5,
  quantizeMethod: 'posterize',
  removeBg: false,
  bgTolerance: 10,
  bgSoftness: 5,
  minIslandArea: 0.8,
  smoothEdges: 5,
  minThickness: 0.6,
  simplifyTolerance: 1.0,
  autoBridges: false,
  bridgeWidth: 12,
  materialThicknessMm: 3,
  spacerMm: 0,
  edgeEnhance: 0,
  contrastBoost: 0,
  targetWidthMm: 200,
  outputFormat: 'filled',
  includePreview: true,
  includeSettings: true,
  includeDXF: false,
  includeAssemblyPDF: false,
};

export const DEFAULT_PROJECT_STATE: ProjectState = {
  mode: 'custom',
  currentStep: 'source',
  sourceImage: null,
  layerMasks: [],
  vectorLayers: [],
  settings: DEFAULT_SETTINGS,
  isProcessing: false,
  progress: 0,
  progressMessage: '',
  error: null,
};

// AI Preset configurations (hidden from user)
export const AI_PRESET_PROMPTS: Record<AIPreset, {
  basePrompt: string;
  negativePrompt: string;
  style: string;
}> = {
  cute: {
    basePrompt: 'cute kawaii style, thick black outline, 4-6 flat colors, no gradients, simple shapes, centered composition, clean edges',
    negativePrompt: 'busy background, gradients, watercolor, tiny details, noise, complex patterns, realistic shading',
    style: 'vector art, flat design',
  },
  realistic: {
    basePrompt: 'realistic photo style but with enhanced contrast, clear edges, limited color palette, strong lighting, simple background',
    negativePrompt: 'busy background, excessive detail, noise, blur, low contrast',
    style: 'high contrast photography',
  },
  christmas: {
    basePrompt: 'christmas holiday theme, cute style, santa hat or festive accessory, thick outline, 4-6 flat colors, simple shapes, festive but clean',
    negativePrompt: 'busy background, gradients, complex patterns, realistic texture, noise',
    style: 'holiday vector art',
  },
  minimal: {
    basePrompt: 'minimalist design, 2-3 colors maximum, geometric shapes, very simple, bold lines, clean composition',
    negativePrompt: 'detail, texture, gradients, complex shapes, busy composition',
    style: 'minimal flat design',
  },
  bold: {
    basePrompt: 'bold graphic design, high contrast, thick outlines, 3-5 solid colors, strong shapes, poster style',
    negativePrompt: 'subtle details, gradients, soft edges, watercolor, noise',
    style: 'bold graphic poster',
  },
};
