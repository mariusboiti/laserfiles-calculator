// ═══════════════════════════════════════════════════════════════════════
// PHOTO → LASER PRODUCT AI — V3 TYPES
// End-to-end production automation, business optimization, AI manufacturing
// ═══════════════════════════════════════════════════════════════════════

// ─── Product Types (V3 — expanded) ──────────────────────────────
export type ProductType =
  | 'engraved-frame'
  | 'multilayer-wall-art'
  | 'led-lightbox'
  | 'keychain'
  | 'ornament'
  | 'stencil'
  | 'coaster'
  | 'puzzle'
  | 'memorial-plaque'
  | 'lamp-panel'
  | 'phone-stand'
  | 'jewelry-pendant';

export const PRODUCT_TYPES: Record<ProductType, { label: string; description: string; icon: string; sizeMm: [number, number]; profitTier: 'low' | 'medium' | 'high' | 'premium' }> = {
  'engraved-frame':      { label: 'Engraved Frame',      description: 'Photo engraved on wood/acrylic with cut frame',       icon: '🖼️', sizeMm: [200, 150], profitTier: 'medium' },
  'multilayer-wall-art': { label: 'Multilayer Wall Art',  description: 'Layered depth art with multiple cut layers',          icon: '🎨', sizeMm: [300, 300], profitTier: 'premium' },
  'led-lightbox':        { label: 'LED Lightbox',         description: 'Backlit acrylic panel with engraved photo',           icon: '💡', sizeMm: [200, 200], profitTier: 'premium' },
  keychain:              { label: 'Keychain',             description: 'Small engraved keychain with photo silhouette',       icon: '🔑', sizeMm: [50, 30],   profitTier: 'low' },
  ornament:              { label: 'Ornament',             description: 'Decorative hanging ornament with engraved photo',     icon: '🎄', sizeMm: [80, 80],   profitTier: 'medium' },
  stencil:               { label: 'Stencil',              description: 'Cut-out stencil from photo edges',                    icon: '✂️', sizeMm: [200, 150], profitTier: 'medium' },
  coaster:               { label: 'Coaster Set',          description: 'Round coasters with engraved photo design',           icon: '🍵', sizeMm: [90, 90],   profitTier: 'medium' },
  puzzle:                { label: 'Puzzle',               description: 'Photo puzzle with interlocking laser-cut pieces',     icon: '🧩', sizeMm: [200, 150], profitTier: 'high' },
  'memorial-plaque':     { label: 'Memorial Plaque',      description: 'Elegant memorial plaque with photo and text area',    icon: '🕊️', sizeMm: [250, 200], profitTier: 'premium' },
  'lamp-panel':          { label: 'Lamp Panel',           description: 'Decorative lamp panel with cut-through light pattern',icon: '🏮', sizeMm: [200, 300], profitTier: 'premium' },
  'phone-stand':         { label: 'Phone Stand',          description: 'Engraved phone/tablet stand with photo design',       icon: '📱', sizeMm: [100, 120], profitTier: 'high' },
  'jewelry-pendant':     { label: 'Jewelry Pendant',      description: 'Delicate engraved pendant from photo silhouette',     icon: '💎', sizeMm: [30, 30],   profitTier: 'high' },
};

// ─── Material System (V3 — with behavior database) ──────────────
export type MaterialId = 'plywood' | 'mdf' | 'acrylic-clear' | 'acrylic-black' | 'leather' | 'slate' | 'anodized-aluminum' | 'bamboo' | 'cork';

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
  thermalConductivity: number;
  burnCoefficient: number;
  smokeStainFactor: number;
  acrylicFrostingFactor: number;
  heatAccumulationRate: number;
  recommendedSpeedMmS: number;
  recommendedPowerPct: number;
  // V3 behavior database fields
  meltingRisk: number;          // 0-1
  scorchingProbability: number; // 0-1
  maxSafeTemp: number;          // °C
  minFeatureSizeMm: number;
  availableThicknesses: number[];
  engravingResponseCurve: number[]; // [10%, 30%, 50%, 70%, 90%] power → depth mapping
  compatibleMachines: MachineType[];
}

export const MATERIAL_PROFILES: Record<MaterialId, MaterialProfile> = {
  plywood:              { id: 'plywood',            label: 'Plywood (3mm)',         icon: '🪵', thicknessMm: 3,   reflectivity: 0.15, burnSpreadFactor: 1.2,  engravingContrastCurve: 1.1, kerfCoefficient: 0.15, costPerM2: 12,  color: '#c4a265', textureHint: 'wood grain',          thermalConductivity: 0.13, burnCoefficient: 0.7,  smokeStainFactor: 0.6,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.8,  recommendedSpeedMmS: 300, recommendedPowerPct: 60, meltingRisk: 0, scorchingProbability: 0.4, maxSafeTemp: 300, minFeatureSizeMm: 1.0, availableThicknesses: [3, 4, 5, 6], engravingResponseCurve: [0.05, 0.15, 0.3, 0.5, 0.8], compatibleMachines: ['co2', 'diode'] },
  mdf:                  { id: 'mdf',                label: 'MDF (3mm)',             icon: '📦', thicknessMm: 3,   reflectivity: 0.10, burnSpreadFactor: 1.4,  engravingContrastCurve: 1.3, kerfCoefficient: 0.18, costPerM2: 8,   color: '#8b7355', textureHint: 'smooth brown',        thermalConductivity: 0.10, burnCoefficient: 0.85, smokeStainFactor: 0.8,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.0,  recommendedSpeedMmS: 250, recommendedPowerPct: 55, meltingRisk: 0, scorchingProbability: 0.6, maxSafeTemp: 250, minFeatureSizeMm: 1.2, availableThicknesses: [3, 6, 9], engravingResponseCurve: [0.08, 0.2, 0.4, 0.65, 0.9], compatibleMachines: ['co2', 'diode'] },
  'acrylic-clear':      { id: 'acrylic-clear',      label: 'Acrylic Clear (3mm)',   icon: '💎', thicknessMm: 3,   reflectivity: 0.85, burnSpreadFactor: 0.6,  engravingContrastCurve: 0.8, kerfCoefficient: 0.10, costPerM2: 35,  color: '#e8f4f8', textureHint: 'transparent glossy',  thermalConductivity: 0.19, burnCoefficient: 0.3,  smokeStainFactor: 0.2,  acrylicFrostingFactor: 0.85, heatAccumulationRate: 0.5,  recommendedSpeedMmS: 400, recommendedPowerPct: 40, meltingRisk: 0.7, scorchingProbability: 0.1, maxSafeTemp: 160, minFeatureSizeMm: 0.5, availableThicknesses: [2, 3, 5, 8, 10], engravingResponseCurve: [0.02, 0.08, 0.2, 0.35, 0.55], compatibleMachines: ['co2'] },
  'acrylic-black':      { id: 'acrylic-black',      label: 'Acrylic Black (3mm)',   icon: '⬛', thicknessMm: 3,   reflectivity: 0.05, burnSpreadFactor: 0.5,  engravingContrastCurve: 0.9, kerfCoefficient: 0.10, costPerM2: 35,  color: '#1a1a2e', textureHint: 'glossy black',        thermalConductivity: 0.19, burnCoefficient: 0.25, smokeStainFactor: 0.15, acrylicFrostingFactor: 0.9,  heatAccumulationRate: 0.4,  recommendedSpeedMmS: 400, recommendedPowerPct: 35, meltingRisk: 0.65, scorchingProbability: 0.05, maxSafeTemp: 160, minFeatureSizeMm: 0.5, availableThicknesses: [2, 3, 5, 8], engravingResponseCurve: [0.02, 0.1, 0.22, 0.38, 0.6], compatibleMachines: ['co2'] },
  leather:              { id: 'leather',             label: 'Leather (2mm)',         icon: '🟤', thicknessMm: 2,   reflectivity: 0.12, burnSpreadFactor: 1.6,  engravingContrastCurve: 1.4, kerfCoefficient: 0.20, costPerM2: 60,  color: '#8b4513', textureHint: 'leather texture',     thermalConductivity: 0.16, burnCoefficient: 0.9,  smokeStainFactor: 0.7,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.2,  recommendedSpeedMmS: 200, recommendedPowerPct: 45, meltingRisk: 0, scorchingProbability: 0.7, maxSafeTemp: 200, minFeatureSizeMm: 1.5, availableThicknesses: [1, 2, 3], engravingResponseCurve: [0.1, 0.3, 0.55, 0.75, 0.95], compatibleMachines: ['co2', 'diode'] },
  slate:                { id: 'slate',               label: 'Slate (5mm)',           icon: '🪨', thicknessMm: 5,   reflectivity: 0.08, burnSpreadFactor: 0.3,  engravingContrastCurve: 0.7, kerfCoefficient: 0.05, costPerM2: 45,  color: '#4a5568', textureHint: 'stone matte',         thermalConductivity: 2.01, burnCoefficient: 0.1,  smokeStainFactor: 0.1,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.2,  recommendedSpeedMmS: 150, recommendedPowerPct: 80, meltingRisk: 0, scorchingProbability: 0, maxSafeTemp: 1000, minFeatureSizeMm: 0.8, availableThicknesses: [5, 8, 10], engravingResponseCurve: [0.01, 0.03, 0.08, 0.15, 0.25], compatibleMachines: ['co2', 'fiber'] },
  'anodized-aluminum':  { id: 'anodized-aluminum',  label: 'Anodized Aluminum',     icon: '🔩', thicknessMm: 1.5, reflectivity: 0.70, burnSpreadFactor: 0.2,  engravingContrastCurve: 0.6, kerfCoefficient: 0.08, costPerM2: 80,  color: '#9ca3af', textureHint: 'brushed metal',       thermalConductivity: 205,  burnCoefficient: 0.05, smokeStainFactor: 0.05, acrylicFrostingFactor: 0,    heatAccumulationRate: 0.1,  recommendedSpeedMmS: 500, recommendedPowerPct: 90, meltingRisk: 0, scorchingProbability: 0, maxSafeTemp: 660, minFeatureSizeMm: 0.3, availableThicknesses: [0.5, 1, 1.5, 2], engravingResponseCurve: [0.005, 0.01, 0.03, 0.06, 0.1], compatibleMachines: ['fiber', 'galvo'] },
  bamboo:               { id: 'bamboo',              label: 'Bamboo (3mm)',          icon: '🎋', thicknessMm: 3,   reflectivity: 0.12, burnSpreadFactor: 1.0,  engravingContrastCurve: 1.2, kerfCoefficient: 0.14, costPerM2: 18,  color: '#d4a574', textureHint: 'bamboo grain',        thermalConductivity: 0.17, burnCoefficient: 0.65, smokeStainFactor: 0.5,  acrylicFrostingFactor: 0,    heatAccumulationRate: 0.7,  recommendedSpeedMmS: 320, recommendedPowerPct: 55, meltingRisk: 0, scorchingProbability: 0.35, maxSafeTemp: 320, minFeatureSizeMm: 0.8, availableThicknesses: [3, 5], engravingResponseCurve: [0.04, 0.12, 0.28, 0.48, 0.75], compatibleMachines: ['co2', 'diode'] },
  cork:                 { id: 'cork',                label: 'Cork (3mm)',            icon: '🟫', thicknessMm: 3,   reflectivity: 0.08, burnSpreadFactor: 1.8,  engravingContrastCurve: 1.5, kerfCoefficient: 0.22, costPerM2: 25,  color: '#a0845c', textureHint: 'cork texture',        thermalConductivity: 0.04, burnCoefficient: 0.95, smokeStainFactor: 0.9,  acrylicFrostingFactor: 0,    heatAccumulationRate: 1.4,  recommendedSpeedMmS: 180, recommendedPowerPct: 35, meltingRisk: 0, scorchingProbability: 0.8, maxSafeTemp: 180, minFeatureSizeMm: 2.0, availableThicknesses: [2, 3, 5], engravingResponseCurve: [0.15, 0.35, 0.6, 0.8, 1.0], compatibleMachines: ['co2', 'diode'] },
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

// ─── Machine Profiles (V3) ──────────────────────────────────────
export type MachineType = 'diode' | 'co2' | 'fiber' | 'galvo';

export interface MachineProfile {
  id: MachineType;
  label: string;
  icon: string;
  description: string;
  maxSpeedMmS: number;
  maxPowerW: number;
  accelerationMmS2: number;
  kerfMultiplier: number;
  engravingDpi: number;
  supportsCutting: boolean;
  supportsEngraving: boolean;
  bestMaterials: MaterialId[];
  speedOverride: number;       // multiplier applied to material recommended speed
  powerOverride: number;       // multiplier applied to material recommended power
}

export const MACHINE_PROFILES: Record<MachineType, MachineProfile> = {
  diode: {
    id: 'diode', label: 'Diode Laser', icon: '🔵', description: 'Affordable diode laser (5-20W). Great for wood and leather.',
    maxSpeedMmS: 600, maxPowerW: 20, accelerationMmS2: 3000, kerfMultiplier: 1.2,
    engravingDpi: 254, supportsCutting: true, supportsEngraving: true,
    bestMaterials: ['plywood', 'mdf', 'leather', 'bamboo', 'cork'],
    speedOverride: 0.8, powerOverride: 1.0,
  },
  co2: {
    id: 'co2', label: 'CO₂ Laser', icon: '🔴', description: 'Professional CO₂ laser (40-150W). Versatile, industry standard.',
    maxSpeedMmS: 1000, maxPowerW: 150, accelerationMmS2: 8000, kerfMultiplier: 1.0,
    engravingDpi: 508, supportsCutting: true, supportsEngraving: true,
    bestMaterials: ['plywood', 'mdf', 'acrylic-clear', 'acrylic-black', 'leather', 'bamboo', 'cork'],
    speedOverride: 1.0, powerOverride: 1.0,
  },
  fiber: {
    id: 'fiber', label: 'Fiber Laser', icon: '🟡', description: 'High-precision fiber laser (20-50W). Metals and hard materials.',
    maxSpeedMmS: 7000, maxPowerW: 50, accelerationMmS2: 20000, kerfMultiplier: 0.6,
    engravingDpi: 1000, supportsCutting: false, supportsEngraving: true,
    bestMaterials: ['anodized-aluminum', 'slate'],
    speedOverride: 1.5, powerOverride: 0.7,
  },
  galvo: {
    id: 'galvo', label: 'Galvo Engraver', icon: '⚡', description: 'Ultra-fast galvo scanner. Speed-optimized marking.',
    maxSpeedMmS: 12000, maxPowerW: 30, accelerationMmS2: 50000, kerfMultiplier: 0.4,
    engravingDpi: 1200, supportsCutting: false, supportsEngraving: true,
    bestMaterials: ['anodized-aluminum', 'acrylic-black'],
    speedOverride: 3.0, powerOverride: 0.5,
  },
};

// ─── Risk Analysis (V3 — expanded) ──────────────────────────────
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskType =
  | 'fragile-part' | 'burn-hotspot' | 'density-overload' | 'detail-loss'
  | 'kerf-collision' | 'fragile-bridge' | 'unsupported-thin' | 'stress-point' | 'break-zone'
  | 'overheating' | 'melting-risk' | 'scorching' | 'contrast-failure' | 'machine-incompatible';

export interface RiskWarning {
  type: RiskType;
  severity: RiskSeverity;
  message: string;
  confidence: number;          // V3: 0-100 confidence score
  region?: { x: number; y: number; w: number; h: number };
}

// ─── Structural Integrity ───────────────────────────────────────
export interface StructuralAnalysis {
  strengthScore: number;
  fragileBridges: number;
  thinParts: number;
  stressPoints: number;
  breakZones: number;
  warnings: RiskWarning[];
  overlaySvg: string;
}

// ─── Cut Path Optimization ──────────────────────────────────────
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

// ─── Laser Physics Simulation ───────────────────────────────────
export interface LaserSimulationResult {
  simulationPng: string;
  burnGradientMap: string;
  kerfWidthAtSpeed: number;
  heatAccumulationZones: number;
  smokeStainIntensity: number;
  acrylicFrostLevel: number;
  depthEstimateMm: number;
  qualityScore: number;
}

// ─── File Validation ────────────────────────────────────────────
export interface FileValidationResult {
  isValid: boolean;
  score: number;
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

// ─── Material Waste Optimization ────────────────────────────────
export interface MaterialWasteAnalysis {
  usagePercent: number;
  wastePercent: number;
  wasteAreaMm2: number;
  sheetSizeMm: [number, number];
  bestFitSizeMm: [number, number];
  costSavingEstimate: number;
  nestingReady: boolean;
}

// ─── Design Coach ───────────────────────────────────────────────
export interface DesignCoachTip {
  category: 'contrast' | 'density' | 'size' | 'aesthetic' | 'production' | 'material';
  title: string;
  suggestion: string;
  impact: 'low' | 'medium' | 'high';
  autoFixAvailable: boolean;
}

// ─── Multilayer ─────────────────────────────────────────────────
export interface MultilayerResult {
  layers: MultilayerSvg[];
  stackPreviewPng: string;
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
  recommendedThicknessMm: number;
  suggestedColor: string;
}

// ─── Product Variant ────────────────────────────────────────────
export interface ProductVariant {
  productType: ProductType;
  label: string;
  icon: string;
  sizeMm: [number, number];
  engraveSvg: string;
  cutSvg: string;
  previewPng: string;
}

// ─── Mockup Scenes (V3 — expanded) ─────────────────────────────
export type MockupScene = 'living-room' | 'workshop' | 'gift-packaging' | 'etsy-listing' | 'product-photo' | 'packaging-box' | 'home-decor-shelf' | 'craft-fair-booth';

export interface MockupResult {
  scene: MockupScene;
  label: string;
  png: string;
  // V3 additions
  perspective: 'front' | 'angle' | 'close-up';
  hasReflection: boolean;
  hasShadow: boolean;
}

export const MOCKUP_SCENES: Record<MockupScene, { label: string; icon: string }> = {
  'living-room':       { label: 'Living Room Wall',  icon: '🏠' },
  workshop:            { label: 'Workshop Table',    icon: '🔧' },
  'gift-packaging':    { label: 'Gift Packaging',    icon: '🎁' },
  'etsy-listing':      { label: 'Etsy Listing',      icon: '🛒' },
  'product-photo':     { label: 'Product Photo',     icon: '📸' },
  'packaging-box':     { label: 'Packaging Box',     icon: '📦' },
  'home-decor-shelf':  { label: 'Home Decor Shelf',  icon: '🪴' },
  'craft-fair-booth':  { label: 'Craft Fair Booth',  icon: '🎪' },
};

// ─── AI Product Intelligence (V3) ───────────────────────────────
export interface ProductIntelligence {
  subjectClassification: string;       // e.g. "portrait", "pet", "landscape", "object"
  subjectConfidence: number;           // 0-100
  recommendedProducts: RecommendedProduct[];
  optimalSizes: SizeRecommendation[];
  profitPriorityScore: number;         // 0-100
  marketDemandHint: string;
}

export interface RecommendedProduct {
  type: ProductType;
  label: string;
  icon: string;
  confidence: number;
  profitScore: number;
  reason: string;
}

// ─── Production Batch Builder (V3) ──────────────────────────────
export interface ProductionBatchItem {
  productType: ProductType;
  sizeMm: [number, number];
  label: string;
  quantity: number;
  engraveSvg: string;
  cutSvg: string;
  previewPng: string;
  estimatedTimeSec: number;
  materialCost: number;
  suggestedPrice: number;
}

export interface ProductionBatch {
  items: ProductionBatchItem[];
  totalTimeSec: number;
  totalMaterialCost: number;
  totalSuggestedRevenue: number;
  sheetLayoutSvg: string;             // basic nesting preview
  sheetUsagePercent: number;
  sheetSizeMm: [number, number];
}

// ─── Market-Ready Product Pack (V3) ─────────────────────────────
export interface MarketReadyPack {
  productTitle: string;
  productDescription: string;
  tags: string[];
  pricingTiers: PricingTier[];
  packagingSuggestions: string[];
  sizeVariations: SizeVariation[];
  seoKeywords: string[];
}

export interface PricingTier {
  label: string;                       // e.g. "Standard", "Premium", "Bulk"
  unitPrice: number;
  materialCost: number;
  profitMargin: number;
  minQuantity: number;
}

export interface SizeVariation {
  label: string;
  sizeMm: [number, number];
  priceMultiplier: number;
}

// ─── Style Consistency (V3) ─────────────────────────────────────
export interface StyleConsistencyProfile {
  engravingTone: number;               // 0-100 darkness
  lineThickness: number;               // mm
  designLanguage: string;              // e.g. "minimalist", "detailed", "bold"
  backgroundStyle: string;             // e.g. "clean", "textured", "gradient"
  contrastLevel: number;               // 0-100
}

// ─── Design Refinement (V3) ─────────────────────────────────────
export interface RefinementResult {
  refinedPreviewPng: string;
  refinedEngraveSvg: string;
  improvements: RefinementImprovement[];
  clarityScore: number;                // 0-100
  contrastScore: number;               // 0-100
  noiseReduction: number;              // 0-100 how much noise was removed
  geometryOptimized: boolean;
  iterationCount: number;
}

export interface RefinementImprovement {
  area: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

// ─── Pipeline Job (V3) ─────────────────────────────────────────
export type PipelineJobStatus = 'queued' | 'running' | 'paused' | 'complete' | 'failed' | 'retrying';

export interface PipelineJob {
  jobId: string;
  status: PipelineJobStatus;
  currentStep: ProcessingStage;
  progress: number;                    // 0-100
  retryCount: number;
  startedAt: string;
  completedSteps: ProcessingStage[];
  error: string | null;
}

// ─── Processing Stages (V3 — full pipeline) ─────────────────────
export type ProcessingStage =
  | 'idle'
  | 'uploading'
  | 'enhancing'
  | 'subject-analysis'
  | 'product-intelligence'
  | 'style-transform'
  | 'ai-generation'
  | 'design-refinement'
  | 'simulation'
  | 'structural-analysis'
  | 'cut-optimization'
  | 'file-validation'
  | 'multilayer'
  | 'risk-analysis'
  | 'waste-analysis'
  | 'batch-builder'
  | 'variants'
  | 'mockups'
  | 'market-pack'
  | 'design-coach'
  | 'complete'
  | 'error';

// ─── Options (V3) ───────────────────────────────────────────────
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
  ultraRealSimulation: boolean;
  structuralAnalysis: boolean;
  cutPathOptimization: boolean;
  fileValidation: boolean;
  wasteOptimization: boolean;
  designCoach: boolean;
  laserSpeedMmS: number;
  laserPowerPct: number;
  laserPasses: number;
  // V3 additions
  machineType: MachineType;
  productIntelligence: boolean;
  batchBuilder: boolean;
  marketPack: boolean;
  styleConsistency: boolean;
  autoRefine: boolean;
  batchSizes: number[];                // e.g. [100, 200, 400] mm
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
  ultraRealSimulation: true,
  structuralAnalysis: true,
  cutPathOptimization: true,
  fileValidation: true,
  wasteOptimization: true,
  designCoach: true,
  laserSpeedMmS: 300,
  laserPowerPct: 60,
  laserPasses: 1,
  // V3 defaults
  machineType: 'co2',
  productIntelligence: true,
  batchBuilder: true,
  marketPack: true,
  styleConsistency: true,
  autoRefine: true,
  batchSizes: [100, 200, 400],
};

// ─── Request / Response ─────────────────────────────────────────
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
  confidenceScore: number;
  laserAccelerationFactor: number;
  engraveTimeSec: number;
  cutTimeSec: number;
  travelTimeSec: number;
  totalTimeSec: number;
  // V3 additions
  machineLabel: string;
  machineAdjustedSpeed: number;
  machineAdjustedPower: number;
}

export interface SizeRecommendation {
  widthMm: number;
  heightMm: number;
  optimalKerf: number;
  materialThickness: number;
  reason: string;
}

// ─── Batch (V2 compat) ─────────────────────────────────────────
export interface BatchItem {
  id: string;
  fileName: string;
  imageBase64: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  progress: number;
  result: GenerateResponse | null;
  error: string | null;
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
  laserSimulation: LaserSimulationResult | null;
  structuralAnalysis: StructuralAnalysis | null;
  cutPathOptimization: CutPathOptimization | null;
  fileValidation: FileValidationResult | null;
  wasteAnalysis: MaterialWasteAnalysis | null;
  designCoachTips: DesignCoachTip[];
  optimizedCutSvg: string | null;
  // V3 additions
  productIntelligence: ProductIntelligence | null;
  productionBatch: ProductionBatch | null;
  marketPack: MarketReadyPack | null;
  styleProfile: StyleConsistencyProfile | null;
  refinement: RefinementResult | null;
  pipelineJob: PipelineJob | null;
}
