/**
 * Golden presets for BoxMaker - quick testing configurations
 */

export interface BoxPreset {
  name: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  kerfMm: number;
  fingerWidthMm: number;
  description?: string;
}

export const GOLDEN_PRESETS: BoxPreset[] = [
  {
    name: 'Small',
    widthMm: 60,
    depthMm: 60,
    heightMm: 40,
    thicknessMm: 3,
    kerfMm: 0.1,
    fingerWidthMm: 10,
    description: 'Small box - 60×60×40mm, 3mm material',
  },
  {
    name: 'Medium',
    widthMm: 120,
    depthMm: 120,
    heightMm: 80,
    thicknessMm: 3,
    kerfMm: 0.12,
    fingerWidthMm: 12,
    description: 'Medium box - 120×120×80mm, 3mm material',
  },
  {
    name: 'Thick',
    widthMm: 100,
    depthMm: 80,
    heightMm: 60,
    thicknessMm: 6,
    kerfMm: 0.15,
    fingerWidthMm: 14,
    description: 'Thick material - 100×80×60mm, 6mm material',
  },
];

/**
 * Get preset by name
 */
export function getPresetByName(name: string): BoxPreset | undefined {
  return GOLDEN_PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

/**
 * Adjust preset for hinged box (add hinge-specific defaults)
 */
export function adjustPresetForHinged(preset: BoxPreset): {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  kerfMm: number;
  jointFingerWidthMm: number;
  hingeFingerWidthMm: number;
  hingeClearanceMm: number;
  hingeHoleInsetMm: number;
} {
  return {
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    heightMm: preset.heightMm,
    thicknessMm: preset.thicknessMm,
    kerfMm: preset.kerfMm,
    jointFingerWidthMm: preset.fingerWidthMm,
    hingeFingerWidthMm: Math.max(6, preset.fingerWidthMm * 0.8),
    hingeClearanceMm: Math.max(0.15, preset.kerfMm * 1.5),
    hingeHoleInsetMm: Math.max(8, preset.thicknessMm * 2),
  };
}

/**
 * Adjust preset for sliding drawer box (add drawer-specific defaults)
 */
export function adjustPresetForSlidingDrawer(preset: BoxPreset): {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  kerfMm: number;
  fingerWidthMm: number;
  drawerClearanceMm: number;
  drawerBottomOffsetMm: number;
} {
  return {
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    heightMm: preset.heightMm,
    thicknessMm: preset.thicknessMm,
    kerfMm: preset.kerfMm,
    fingerWidthMm: preset.fingerWidthMm,
    drawerClearanceMm: Math.max(0.5, preset.kerfMm * 3),
    drawerBottomOffsetMm: 0,
  };
}
