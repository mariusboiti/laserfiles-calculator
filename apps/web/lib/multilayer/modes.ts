/**
 * Mode System for MultiLayer Maker V3
 * Each mode provides optimized defaults for different use cases
 */

export type Mode = 'shadowbox' | 'poster' | 'ornament' | 'mandala' | 'sign' | 'custom';

export interface ModeConfig {
  id: Mode;
  name: string;
  description: string;
  icon: string;
  defaults: {
    layerCount: number;
    quantizeMethod: 'kmeans' | 'posterize';
    edgeEnhance: number;
    contrastBoost: number;
    minFeatureSize: number;
    simplifyTolerance: number;
    removeIslands: boolean;
    autoBridges: boolean;
    materialThicknessMm: number;
    spacerMm?: number;
  };
  aiPromptTemplate: string;
  negativePrompt: string;
  recommendedMaterials: string[];
}

export const MODES: Record<Mode, ModeConfig> = {
  shadowbox: {
    id: 'shadowbox',
    name: 'Shadow Box',
    description: '6-8 depth layers with strong silhouettes for 3D shadow box displays',
    icon: '📦',
    defaults: {
      layerCount: 7,
      quantizeMethod: 'posterize',
      edgeEnhance: 8,
      contrastBoost: 1.3,
      minFeatureSize: 2.0,
      simplifyTolerance: 1.5,
      removeIslands: true,
      autoBridges: true,
      materialThicknessMm: 3,
      spacerMm: 5,
    },
    aiPromptTemplate: 'Create a shadow-box friendly illustration with 6-8 distinct depth layers, strong silhouette, large separated shapes, minimal interior noise, no gradients, clean cut-ready regions, simple background, crisp edges.',
    negativePrompt: 'photorealistic, complex background, text, watermark, blurry, noisy texture, thin hairlines, micro details, gradients',
    recommendedMaterials: ['3mm plywood', '3mm acrylic', '2mm MDF'],
  },
  
  poster: {
    id: 'poster',
    name: 'Flat Poster',
    description: '7-10 color regions for bold graphic poster style',
    icon: '🎨',
    defaults: {
      layerCount: 8,
      quantizeMethod: 'kmeans',
      edgeEnhance: 6,
      contrastBoost: 1.2,
      minFeatureSize: 1.5,
      simplifyTolerance: 1.0,
      removeIslands: true,
      autoBridges: false,
      materialThicknessMm: 3,
    },
    aiPromptTemplate: 'Create a multilayer posterized illustration with 7-10 color regions, bold clean separations, minimal texture, no gradients, crisp borders, high readability for laser cut stacking, flat graphic design style.',
    negativePrompt: 'photorealistic, complex patterns, text, watermark, blurry, noisy, thin lines, micro details, 3D shading',
    recommendedMaterials: ['3mm colored acrylic', '3mm painted wood', '2mm cardstock'],
  },
  
  ornament: {
    id: 'ornament',
    name: 'Ornament/Badge',
    description: '4-6 layers for decorative ornaments and badges',
    icon: '🏅',
    defaults: {
      layerCount: 5,
      quantizeMethod: 'posterize',
      edgeEnhance: 7,
      contrastBoost: 1.25,
      minFeatureSize: 1.0,
      simplifyTolerance: 0.8,
      removeIslands: true,
      autoBridges: true,
      materialThicknessMm: 2,
    },
    aiPromptTemplate: 'Create a decorative ornament or badge design with 4-6 distinct layers, symmetrical or centered composition, clean geometric shapes, bold outlines, minimal fine details, suitable for laser cutting.',
    negativePrompt: 'photorealistic, busy background, text, watermark, blurry, complex textures, thin hairlines, asymmetric chaos',
    recommendedMaterials: ['2mm acrylic', '1.5mm wood veneer', '3mm plywood'],
  },
  
  mandala: {
    id: 'mandala',
    name: 'Mandala/Intricate',
    description: '5-8 layers with intricate patterns and fine details',
    icon: '🌸',
    defaults: {
      layerCount: 6,
      quantizeMethod: 'kmeans',
      edgeEnhance: 9,
      contrastBoost: 1.4,
      minFeatureSize: 0.8,
      simplifyTolerance: 0.5,
      removeIslands: false,
      autoBridges: true,
      materialThicknessMm: 2,
    },
    aiPromptTemplate: 'Create an intricate mandala or decorative pattern with 5-8 layers, symmetrical design, clean geometric patterns, high contrast regions, suitable for detailed laser cutting, centered composition.',
    negativePrompt: 'photorealistic, random chaos, text, watermark, blurry, noisy, organic textures, asymmetric mess',
    recommendedMaterials: ['1.5mm wood', '2mm acrylic', '1mm cardstock'],
  },
  
  sign: {
    id: 'sign',
    name: 'Sign/Nameplate',
    description: '3-5 layers for signs and nameplates with text-friendly design',
    icon: '🪧',
    defaults: {
      layerCount: 4,
      quantizeMethod: 'posterize',
      edgeEnhance: 5,
      contrastBoost: 1.15,
      minFeatureSize: 2.5,
      simplifyTolerance: 1.2,
      removeIslands: true,
      autoBridges: false,
      materialThicknessMm: 4,
    },
    aiPromptTemplate: 'Create a sign or nameplate design with 3-5 simple layers, bold shapes, high contrast, clean readable elements, minimal complexity, suitable for laser cutting and assembly.',
    negativePrompt: 'photorealistic, complex patterns, watermark, blurry, noisy, thin lines, micro details, gradients',
    recommendedMaterials: ['4mm plywood', '3mm acrylic', '5mm MDF'],
  },
  
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Full manual control over all parameters',
    icon: '⚙️',
    defaults: {
      layerCount: 5,
      quantizeMethod: 'posterize',
      edgeEnhance: 5,
      contrastBoost: 1.2,
      minFeatureSize: 1.5,
      simplifyTolerance: 1.0,
      removeIslands: true,
      autoBridges: false,
      materialThicknessMm: 3,
    },
    aiPromptTemplate: 'Create a multilayer-friendly illustration with clean separated regions, high contrast, minimal gradients, suitable for laser cutting.',
    negativePrompt: 'photorealistic, complex background, text, watermark, blurry, noisy texture, thin hairlines, micro details',
    recommendedMaterials: ['3mm plywood', '3mm acrylic', '2mm MDF'],
  },
};

export const AI_GLOBAL_RULES = `
Center subject, no text, no watermark, no busy background.
High contrast shapes, clean edges, limited tones.
Avoid thin lines and micro-details.
Vector poster look, not photorealistic.
Plain background or subtle vignette only.
Output: sharp, high resolution, subject fills frame.
`;

export function buildAIPrompt(mode: Mode, userPrompt: string): { prompt: string; negative: string } {
  const config = MODES[mode];
  
  const fullPrompt = `${userPrompt}, ${config.aiPromptTemplate} ${AI_GLOBAL_RULES}`;
  
  return {
    prompt: fullPrompt,
    negative: config.negativePrompt,
  };
}

export function getModeDefaults(mode: Mode) {
  return MODES[mode].defaults;
}
