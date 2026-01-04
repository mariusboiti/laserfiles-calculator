/**
 * Default values and presets for BoxMaker
 * Used for reset functionality and quick presets
 */

export const DEFAULTS = {
  common: {
    thicknessMm: 3,
    kerfMm: 0.15,
  },
  simple: {
    widthMm: 120,
    depthMm: 80,
    heightMm: 60,
    fingerWidthMm: 10,
    hasLid: false,
  },
  hinged: {
    widthMm: 160,
    depthMm: 120,
    heightMm: 80,
    jointFingerWidthMm: 10,
    hingeFingerWidthMm: 8,
    hingeClearanceMm: 0.2,
    hingeHoleInsetMm: 8,
    autoFingerCount: true,
  },
  drawer: {
    widthMm: 180,
    depthMm: 160,
    heightMm: 120,
    fingerWidthMm: 10,
    drawerClearanceMm: 0.4,
    drawerBottomOffsetMm: 0,
    frontFaceStyle: 'lip' as const,
    autoFitFingers: true,
    dividersEnabled: false,
    dividerCountX: 2,
    dividerCountZ: 2,
    dividerClearanceMm: 0.2,
  },
};

export interface BoxPreset {
  name: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  description: string;
}

export const SIMPLE_PRESETS: BoxPreset[] = [
  {
    name: 'Small',
    widthMm: 80,
    depthMm: 60,
    heightMm: 40,
    thicknessMm: 3,
    description: 'Jewelry box, small storage',
  },
  {
    name: 'Medium',
    widthMm: 120,
    depthMm: 80,
    heightMm: 60,
    thicknessMm: 3,
    description: 'Gift box, organizer',
  },
  {
    name: 'Large',
    widthMm: 200,
    depthMm: 150,
    heightMm: 100,
    thicknessMm: 4,
    description: 'Storage box, large container',
  },
];

export const HINGED_PRESETS: BoxPreset[] = [
  {
    name: 'Small',
    widthMm: 100,
    depthMm: 80,
    heightMm: 60,
    thicknessMm: 3,
    description: 'Small hinged box',
  },
  {
    name: 'Medium',
    widthMm: 160,
    depthMm: 120,
    heightMm: 80,
    thicknessMm: 3,
    description: 'Standard hinged box',
  },
  {
    name: 'Large',
    widthMm: 240,
    depthMm: 180,
    heightMm: 120,
    thicknessMm: 4,
    description: 'Large hinged storage',
  },
];

export const DRAWER_PRESETS: BoxPreset[] = [
  {
    name: 'Small',
    widthMm: 120,
    depthMm: 100,
    heightMm: 80,
    thicknessMm: 3,
    description: 'Small drawer box',
  },
  {
    name: 'Medium',
    widthMm: 180,
    depthMm: 160,
    heightMm: 120,
    thicknessMm: 3,
    description: 'Standard drawer box',
  },
  {
    name: 'Large',
    widthMm: 280,
    depthMm: 240,
    heightMm: 160,
    thicknessMm: 4,
    description: 'Large drawer storage',
  },
];
