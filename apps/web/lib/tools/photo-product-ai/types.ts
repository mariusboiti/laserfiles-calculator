// ─── Product Types ───────────────────────────────────────────────
export type ProductType =
  | 'engraved-frame'
  | 'multilayer-wall-art'
  | 'led-lightbox'
  | 'keychain'
  | 'ornament'
  | 'stencil'
  | 'coaster'
  | 'puzzle';

export const PRODUCT_TYPES: Record<ProductType, { label: string; description: string; icon: string; sizeMm: [number, number] }> = {
  'engraved-frame':      { label: 'Engraved Frame',      description: 'Photo engraved on wood/acrylic with cut frame',       icon: '🖼️', sizeMm: [200, 150] },
  'multilayer-wall-art': { label: 'Multilayer Wall Art',  description: 'Layered depth art with multiple cut layers',          icon: '🎨', sizeMm: [300, 300] },
  'led-lightbox':        { label: 'LED Lightbox',         description: 'Backlit acrylic panel with engraved photo',           icon: '💡', sizeMm: [200, 200] },
  keychain:              { label: 'Keychain',             description: 'Small engraved keychain with photo silhouette',       icon: '🔑', sizeMm: [50, 30]   },
  ornament:              { label: 'Ornament',             description: 'Decorative hanging ornament with engraved photo',     icon: '🎄', sizeMm: [80, 80]   },
  stencil:               { label: 'Stencil',              description: 'Cut-out stencil from photo edges',                    icon: '✂️', sizeMm: [200, 150] },
  coaster:               { label: 'Coaster Set',          description: 'Round coasters with engraved photo design',           icon: '🍵', sizeMm: [90, 90]   },
  puzzle:                { label: 'Puzzle',               description: 'Photo puzzle with interlocking laser-cut pieces',     icon: '🧩', sizeMm: [200, 150] },
};

// ─── Material System ─────────────────────────────────────────────
export type MaterialId = 'plywood' | 'mdf' | 'acrylic-clear' | 'acrylic-black' | 'leather' | 'slate' | 'anodized-aluminum';

export interface MaterialProfile {
  id: MaterialId;
  label: string;
  icon: string;
  thicknessMm: number;
  reflectivity: number;
  burnSpreadFactor: number;
  engravingContrastCurve: number;
  kerfCoefficient: number;
  costPerM2: number;
  color: string;
  textureHint: string;
}

export const MATERIAL_PROFILES: Record<MaterialId, MaterialProfile> = {
  plywood:              { id: 'plywood',            label: 'Plywood (3mm)',         icon: '🪵', thicknessMm: 3,   reflectivity: 0.15, burnSpreadFactor: 1.2,  engravingContrastCurve: 1.1, kerfCoefficient: 0.15, costPerM2: 12,  color: '#c4a265', textureHint: 'wood grain' },
  mdf:                  { id: 'mdf',                label: 'MDF (3mm)',             icon: '📦', thicknessMm: 3,   reflectivity: 0.10, burnSpreadFactor: 1.4,  engravingContrastCurve: 1.3, kerfCoefficient: 0.18, costPerM2: 8,   color: '#8b7355', textureHint: 'smooth brown' },
  'acrylic-clear':      { id: 'acrylic-clear',      label: 'Acrylic Clear (3mm)',   icon: '💎', thicknessMm: 3,   reflectivity: 0.85, burnSpreadFactor: 0.6,  engravingContrastCurve: 0.8, kerfCoefficient: 0.10, costPerM2: 35,  color: '#e8f4f8', textureHint: 'transparent glossy' },
  'acrylic-black':      { id: 'acrylic-black',      label: 'Acrylic Black (3mm)',   icon: '⬛', thicknessMm: 3,   reflectivity: 0.05, burnSpreadFactor: 0.5,  engravingContrastCurve: 0.9, kerfCoefficient: 0.10, costPerM2: 35,  color: '#1a1a2e', textureHint: 'glossy black' },
  leather:              { id: 'leather',             label: 'Leather (2mm)',         icon: '🟤', thicknessMm: 2,   reflectivity: 0.12, burnSpreadFactor: 1.6,  engravingContrastCurve: 1.4, kerfCoefficient: 0.20, costPerM2: 60,  color: '#8b4513', textureHint: 'leather texture' },
  slate:                { id: 'slate',               label: 'Slate (5mm)',           icon: '🪨', thicknessMm: 5,   reflectivity: 0.08, burnSpreadFactor: 0.3,  engravingContrastCurve: 0.7, kerfCoefficient: 0.05, costPerM2: 45,  color: '#4a5568', textureHint: 'stone matte' },
  'anodized-aluminum':  { id: 'anodized-aluminum',  label: 'Anodized Aluminum',     icon: '🔩', thicknessMm: 1.5, reflectivity: 0.70, burnSpreadFactor: 0.2,  engravingContrastCurve: 0.6, kerfCoefficient: 0.08, costPerM2: 80,  color: '#9ca3af', textureHint: 'brushed metal' },
};

// ─── Style System ────────────────────────────────────────────────
export type StyleId = 'photo-realistic' | 'line-art' | 'woodcut' | 'mandala-fusion' | 'geometric' | 'vintage-engraving' | 'stained-glass';

export interface StyleOption {
  id: StyleId;
  label: string;
  icon: string;
  description: string;
  promptHint: string;
}

export const STYLE_OPTIONS: Record<StyleId, StyleOption> = {
  'photo-realistic':    { id: 'photo-realistic',    label: 'Photo Realistic',    icon: '📷', description: 'High-detail grayscale engraving',                promptHint: 'Convert to high-detail grayscale laser engraving with smooth tonal gradients.' },
  'line-art':           { id: 'line-art',            label: 'Line Art',           icon: '✏️', description: 'Clean line drawing style',                       promptHint: 'Convert to clean black line art drawing with no fills, only outlines and hatching.' },
  woodcut:              { id: 'woodcut',             label: 'Woodcut',            icon: '🪓', description: 'Bold woodcut print style',                       promptHint: 'Convert to bold woodcut/linocut style with strong black and white contrast, carved look.' },
  'mandala-fusion':     { id: 'mandala-fusion',      label: 'Mandala Fusion',     icon: '🔮', description: 'Photo merged with mandala patterns',             promptHint: 'Merge the subject with intricate mandala patterns, symmetrical decorative elements around the subject.' },
  geometric:            { id: 'geometric',           label: 'Geometric',          icon: '🔷', description: 'Low-poly geometric abstraction',                 promptHint: 'Convert to low-poly geometric triangulated style with flat shading zones.' },
  'vintage-engraving':  { id: 'vintage-engraving',   label: 'Vintage Engraving',  icon: '📜', description: 'Classic crosshatch engraving',                   promptHint: 'Convert to classic crosshatch engraving style like old banknote illustrations with fine parallel lines.' },
  'stained-glass':      { id: 'stained-glass',       label: 'Stained Glass',      icon: '🪟', description: 'Stained glass panel design',                     promptHint: 'Convert to stained glass style with bold black outlines separating colored zones, suitable for multilayer cutting.' },
};

// ─── Risk Analysis ───────────────────────────────────────────────
export type RiskSeverity = 'low' | 'medium' | 'high';
export type RiskType = 'fragile-part' | 'burn-hotspot' | 'density-overload' | 'detail-loss' | 'kerf-collision';

export interface RiskWarning {
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  region?: { x: number; y: number; w: number; h: number };
}

// ─── Multilayer ──────────────────────────────────────────────────
export interface MultilayerResult {
  layers: MultilayerSvg[];
  stackPreviewPng: string;
}

export interface MultilayerSvg {
  index: number;
  label: string;
  svg: string;
  depthPercent: number;
}

// ─── Product Variant ─────────────────────────────────────────────
export interface ProductVariant {
  productType: ProductType;
  label: string;
  icon: string;
  sizeMm: [number, number];
  engraveSvg: string;
  cutSvg: string;
  previewPng: string;
}

// ─── Mockup Scenes ───────────────────────────────────────────────
export type MockupScene = 'living-room' | 'workshop' | 'gift-packaging' | 'etsy-listing';

export interface MockupResult {
  scene: MockupScene;
  label: string;
  png: string;
}

export const MOCKUP_SCENES: Record<MockupScene, { label: string; icon: string }> = {
  'living-room':    { label: 'Living Room Wall',  icon: '🏠' },
  workshop:         { label: 'Workshop Table',    icon: '🔧' },
  'gift-packaging': { label: 'Gift Packaging',    icon: '🎁' },
  'etsy-listing':   { label: 'Etsy Listing',      icon: '🛒' },
};

// ─── Processing Stages ───────────────────────────────────────────
export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'enhancing'
  | 'style-transform'
  | 'ai-generation'
  | 'multilayer'
  | 'risk-analysis'
  | 'variants'
  | 'mockups'
  | 'complete'
  | 'error';

// ─── Options ─────────────────────────────────────────────────────
export interface GenerateOptions {
  kerfMm: number;
  smoothing: number;
  contrast: number;
  brightness: number;
  edgeStrength: number;
  invertEngraving: boolean;
  includeFrame: boolean;
  framePaddingMm: number;
  material: MaterialId;
  style: StyleId;
  enhancePhoto: boolean;
  generateMultilayer: boolean;
  generateVariants: boolean;
  realLaserPreview: boolean;
  enhanceComposition: boolean;
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  kerfMm: 0.12,
  smoothing: 50,
  contrast: 50,
  brightness: 50,
  edgeStrength: 50,
  invertEngraving: false,
  includeFrame: true,
  framePaddingMm: 5,
  material: 'plywood',
  style: 'photo-realistic',
  enhancePhoto: true,
  generateMultilayer: false,
  generateVariants: true,
  realLaserPreview: true,
  enhanceComposition: false,
};

// ─── Request / Response ──────────────────────────────────────────
export interface GenerateRequest {
  imageBase64: string;
  productType: ProductType;
  options: GenerateOptions;
}

export interface ProductSuggestion {
  type: ProductType;
  label: string;
  description: string;
  confidence: number;
  icon: string;
}

export interface ProductionInsights {
  materialWidthMm: number;
  materialHeightMm: number;
  materialLabel: string;
  engravingDensity: number;
  cutPathLengthMm: number;
  estimatedTimeMinutes: number;
  materialCostEstimate: number;
  recommendedPrice: number;
  profitMargin: number;
  optimalKerf: number;
  recommendedThickness: number;
}

export interface SizeRecommendation {
  widthMm: number;
  heightMm: number;
  optimalKerf: number;
  materialThickness: number;
  reason: string;
}

export interface GenerateResponse {
  engraveSvg: string;
  cutSvg: string;
  combinedSvg: string;
  engravePreviewPng: string;
  laserSimulationPng: string;
  mockups: MockupResult[];
  productSuggestions: ProductSuggestion[];
  productionInsights: ProductionInsights;
  sizeRecommendation: SizeRecommendation;
  riskWarnings: RiskWarning[];
  multilayer: MultilayerResult | null;
  variants: ProductVariant[];
  description: string;
  credits?: { used: number; remaining: number };
}
