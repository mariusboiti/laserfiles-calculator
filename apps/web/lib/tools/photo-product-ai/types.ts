// ═══════════════════════════════════════════════════════════════════════
// PHOTO → LASER PRODUCT AI — V2 TYPES
// Industry-defining production intelligence, simulation, optimization
// ═══════════════════════════════════════════════════════════════════════

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

// ─── Material System (V2 — expanded physics) ────────────────────
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
  // V2 physics additions
  thermalConductivity: number;   // W/(m·K) — affects heat spread
  burnCoefficient: number;       // 0-1 — how easily it chars
  smokeStainFactor: number;      // 0-1 — edge smoke discoloration
  acrylicFrostingFactor: number; // 0-1 — frosting on acrylic engrave
  heatAccumulationRate: number;  // relative rate of heat buildup
  recommendedSpeedMmS: number;   // optimal engrave speed
  recommendedPowerPct: number;   // optimal power %
}

export const MATERIAL_PROFILES: Record<MaterialId, MaterialProfile> = {
  plywood:              { id: 'plywood',            label: 'Plywood (3mm)',         icon: '🪵', thicknessMm: 3,   reflectivity: 0.15, burnSpreadFactor: 1.2,  engravingContrastCurve: 1.1, kerfCoefficient: 0.15, costPerM2: 12,  color: '#c4a265', textureHint: 'wood grain',          thermalConductivity: 0.13, burnCoefficient: 0.7,  smokeStainFactor: 0.6,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.8,  recommendedSpeedMmS: 300, recommendedPowerPct: 60 },
  mdf:                  { id: 'mdf',                label: 'MDF (3mm)',             icon: '📦', thicknessMm: 3,   reflectivity: 0.10, burnSpreadFactor: 1.4,  engravingContrastCurve: 1.3, kerfCoefficient: 0.18, costPerM2: 8,   color: '#8b7355', textureHint: 'smooth brown',        thermalConductivity: 0.10, burnCoefficient: 0.85, smokeStainFactor: 0.8,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.0,  recommendedSpeedMmS: 250, recommendedPowerPct: 55 },
  'acrylic-clear':      { id: 'acrylic-clear',      label: 'Acrylic Clear (3mm)',   icon: '💎', thicknessMm: 3,   reflectivity: 0.85, burnSpreadFactor: 0.6,  engravingContrastCurve: 0.8, kerfCoefficient: 0.10, costPerM2: 35,  color: '#e8f4f8', textureHint: 'transparent glossy',  thermalConductivity: 0.19, burnCoefficient: 0.3,  smokeStainFactor: 0.2,  acrylicFrostingFactor: 0.85, heatAccumulationRate: 0.5,  recommendedSpeedMmS: 400, recommendedPowerPct: 40 },
  'acrylic-black':      { id: 'acrylic-black',      label: 'Acrylic Black (3mm)',   icon: '⬛', thicknessMm: 3,   reflectivity: 0.05, burnSpreadFactor: 0.5,  engravingContrastCurve: 0.9, kerfCoefficient: 0.10, costPerM2: 35,  color: '#1a1a2e', textureHint: 'glossy black',        thermalConductivity: 0.19, burnCoefficient: 0.25, smokeStainFactor: 0.15, acrylicFrostingFactor: 0.9,  heatAccumulationRate: 0.4,  recommendedSpeedMmS: 400, recommendedPowerPct: 35 },
  leather:              { id: 'leather',             label: 'Leather (2mm)',         icon: '🟤', thicknessMm: 2,   reflectivity: 0.12, burnSpreadFactor: 1.6,  engravingContrastCurve: 1.4, kerfCoefficient: 0.20, costPerM2: 60,  color: '#8b4513', textureHint: 'leather texture',     thermalConductivity: 0.16, burnCoefficient: 0.9,  smokeStainFactor: 0.7,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.2,  recommendedSpeedMmS: 200, recommendedPowerPct: 45 },
  slate:                { id: 'slate',               label: 'Slate (5mm)',           icon: '🪨', thicknessMm: 5,   reflectivity: 0.08, burnSpreadFactor: 0.3,  engravingContrastCurve: 0.7, kerfCoefficient: 0.05, costPerM2: 45,  color: '#4a5568', textureHint: 'stone matte',         thermalConductivity: 2.01, burnCoefficient: 0.1,  smokeStainFactor: 0.1,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.2,  recommendedSpeedMmS: 150, recommendedPowerPct: 80 },
  'anodized-aluminum':  { id: 'anodized-aluminum',  label: 'Anodized Aluminum',     icon: '🔩', thicknessMm: 1.5, reflectivity: 0.70, burnSpreadFactor: 0.2,  engravingContrastCurve: 0.6, kerfCoefficient: 0.08, costPerM2: 80,  color: '#9ca3af', textureHint: 'brushed metal',       thermalConductivity: 205,  burnCoefficient: 0.05, smokeStainFactor: 0.05, acrylicFrostingFactor: 0,    heatAccumulationRate: 0.1,  recommendedSpeedMmS: 500, recommendedPowerPct: 90 },
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
export type RiskType = 'fragile-part' | 'burn-hotspot' | 'density-overload' | 'detail-loss' | 'kerf-collision' | 'fragile-bridge' | 'unsupported-thin' | 'stress-point' | 'break-zone';

export interface RiskWarning {
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  region?: { x: number; y: number; w: number; h: number };
}

// ─── Structural Integrity (V2) ──────────────────────────────────
export interface StructuralAnalysis {
  strengthScore: number;        // 0-100
  fragileBridges: number;
  thinParts: number;
  stressPoints: number;
  breakZones: number;
  warnings: RiskWarning[];
  overlaySvg: string;           // SVG overlay highlighting problem areas
}

// ─── Cut Path Optimization (V2) ─────────────────────────────────
export interface CutPathOptimization {
  optimizedCutSvg: string;
  machineOrder: CutSegment[];
  totalTravelMm: number;
  savedTravelMm: number;
  savedTimeSec: number;
  insideFirstApplied: boolean;
}

export interface CutSegment {
  index: number;
  type: 'cut' | 'engrave' | 'travel';
  pathLengthMm: number;
  startXMm: number;
  startYMm: number;
  endXMm: number;
  endYMm: number;
}

// ─── Laser Physics Simulation (V2) ──────────────────────────────
export interface LaserSimulationParams {
  material: MaterialId;
  speedMmS: number;
  powerPct: number;
  passCount: number;
}

export interface LaserSimulationResult {
  simulationPng: string;         // base64 PNG of simulated output
  burnGradientMap: string;       // base64 heatmap
  kerfWidthAtSpeed: number;      // mm
  heatAccumulationZones: number;
  smokeStainIntensity: number;   // 0-1
  acrylicFrostLevel: number;     // 0-1
  depthEstimateMm: number;
  qualityScore: number;          // 0-100
}

// ─── File Validation (V2) ───────────────────────────────────────
export interface FileValidationResult {
  isValid: boolean;
  score: number;                 // 0-100
  openVectors: number;
  overlappingPaths: number;
  duplicateNodes: number;
  impossibleKerfGaps: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'open-vector' | 'overlap' | 'duplicate-node' | 'kerf-gap' | 'zero-length' | 'self-intersect';
  severity: RiskSeverity;
  message: string;
  location?: { x: number; y: number };
}

// ─── Material Waste Optimization (V2) ───────────────────────────
export interface MaterialWasteAnalysis {
  usagePercent: number;
  wastePercent: number;
  wasteAreaMm2: number;
  sheetSizeMm: [number, number];
  bestFitSizeMm: [number, number];
  costSavingEstimate: number;
  nestingReady: boolean;
}

// ─── Design Coach (V2) ──────────────────────────────────────────
export interface DesignCoachTip {
  category: 'contrast' | 'density' | 'size' | 'aesthetic' | 'production' | 'material';
  title: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  autoFixAvailable: boolean;
}

// ─── Multilayer V2 ──────────────────────────────────────────────
export interface MultilayerResult {
  layers: MultilayerSvg[];
  stackPreviewPng: string;
  // V2 additions
  recommendedThicknesses: number[];
  shadowRealism: boolean;
  depthBalanced: boolean;
  layerColors: string[];
  glbPreviewAvailable: boolean;
}

export interface MultilayerSvg {
  index: number;
  label: string;
  svg: string;
  depthPercent: number;
  // V2 additions
  recommendedThicknessMm: number;
  suggestedColor: string;
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

// ─── Mockup Scenes (V2) ─────────────────────────────────────────
export type MockupScene = 'living-room' | 'workshop' | 'gift-packaging' | 'etsy-listing' | 'product-photo' | 'packaging-box';

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
  'product-photo':  { label: 'Product Photo',     icon: '📸' },
  'packaging-box':  { label: 'Packaging Box',     icon: '📦' },
};

// ─── Processing Stages (V2 — expanded pipeline) ─────────────────
export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'enhancing'
  | 'style-transform'
  | 'ai-generation'
  | 'simulation'
  | 'structural-analysis'
  | 'cut-optimization'
  | 'file-validation'
  | 'multilayer'
  | 'risk-analysis'
  | 'waste-analysis'
  | 'variants'
  | 'mockups'
  | 'design-coach'
  | 'complete'
  | 'error';

// ─── Options (V2) ───────────────────────────────────────────────
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
  // V2 additions
  ultraRealSimulation: boolean;
  structuralAnalysis: boolean;
  cutPathOptimization: boolean;
  fileValidation: boolean;
  wasteOptimization: boolean;
  designCoach: boolean;
  laserSpeedMmS: number;
  laserPowerPct: number;
  laserPasses: number;
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
  // V2 defaults
  ultraRealSimulation: true,
  structuralAnalysis: true,
  cutPathOptimization: true,
  fileValidation: true,
  wasteOptimization: true,
  designCoach: true,
  laserSpeedMmS: 300,
  laserPowerPct: 60,
  laserPasses: 1,
};

// ─── Request / Response (V2) ────────────────────────────────────
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
  // V2 additions
  confidenceScore: number;       // 0-100
  laserAccelerationFactor: number;
  engraveTimeSec: number;
  cutTimeSec: number;
  travelTimeSec: number;
  totalTimeSec: number;
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
  // V2 additions
  laserSimulation: LaserSimulationResult | null;
  structuralAnalysis: StructuralAnalysis | null;
  cutPathOptimization: CutPathOptimization | null;
  fileValidation: FileValidationResult | null;
  wasteAnalysis: MaterialWasteAnalysis | null;
  designCoachTips: DesignCoachTip[];
  optimizedCutSvg: string | null;
}
