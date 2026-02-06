export type ProductType =
  | 'engraved-frame'
  | 'multilayer-wall-art'
  | 'led-lightbox'
  | 'keychain'
  | 'ornament'
  | 'stencil';

export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'preprocessing'
  | 'ai-generation'
  | 'vectorization'
  | 'mockup-rendering'
  | 'complete'
  | 'error';

export interface ProductSuggestion {
  type: ProductType;
  label: string;
  description: string;
  confidence: number;
  icon: string;
}

export interface GenerateRequest {
  imageBase64: string;
  productType: ProductType;
  options: GenerateOptions;
}

export interface GenerateOptions {
  kerfMm: number;
  smoothing: number;
  contrast: number;
  brightness: number;
  edgeStrength: number;
  invertEngraving: boolean;
  includeFrame: boolean;
  framePaddingMm: number;
}

export interface GenerateResponse {
  engraveSvg: string;
  cutSvg: string;
  combinedSvg: string;
  engravePreviewPng: string;
  mockupPng: string;
  productSuggestions: ProductSuggestion[];
  productionInsights: ProductionInsights;
  description: string;
  credits?: { used: number; remaining: number };
}

export interface ProductionInsights {
  materialWidthMm: number;
  materialHeightMm: number;
  engravingDensity: number;
  cutPathLengthMm: number;
  estimatedTimeMinutes: number;
  materialCostEstimate: number;
  recommendedPrice: number;
  profitMargin: number;
}

export interface ExportPack {
  engraveSvg: string;
  cutSvg: string;
  combinedSvg: string;
  mockupPng: string;
  productionSummary: ProductionInsights;
  description: string;
}

export const PRODUCT_TYPES: Record<ProductType, { label: string; description: string; icon: string }> = {
  'engraved-frame': {
    label: 'Engraved Frame',
    description: 'Photo engraved on wood or acrylic with cut frame outline',
    icon: '🖼️',
  },
  'multilayer-wall-art': {
    label: 'Multilayer Wall Art',
    description: 'Layered depth art from photo with multiple cut layers',
    icon: '🎨',
  },
  'led-lightbox': {
    label: 'LED Lightbox',
    description: 'Backlit acrylic panel with engraved photo design',
    icon: '💡',
  },
  keychain: {
    label: 'Keychain',
    description: 'Small engraved keychain with photo silhouette',
    icon: '🔑',
  },
  ornament: {
    label: 'Ornament',
    description: 'Decorative hanging ornament with engraved photo',
    icon: '🎄',
  },
  stencil: {
    label: 'Stencil',
    description: 'Cut-out stencil from photo edges for spray/paint use',
    icon: '✂️',
  },
};

export const DEFAULT_OPTIONS: GenerateOptions = {
  kerfMm: 0.12,
  smoothing: 50,
  contrast: 50,
  brightness: 50,
  edgeStrength: 50,
  invertEngraving: false,
  includeFrame: true,
  framePaddingMm: 5,
};
