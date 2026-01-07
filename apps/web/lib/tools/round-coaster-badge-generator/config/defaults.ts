/**
 * Default values and presets for Round Coaster & Badge Generator
 */

export const DEFAULTS = {
  shape: 'circle' as const,
  diameter: 90,
  width: 90,
  height: 90,
  border: true,
  doubleBorder: false,
  borderInset: 3,
  textTop: '',
  textCenter: 'COASTER',
  textBottom: '',
  autoFit: true,
  fontMin: 8,
  fontMaxCenter: 22,
  fontMaxSmall: 14,
  weightCenter: '700' as const,
  weightSmall: '500' as const,
  padding: 8,
};

export interface CoasterPresetConfig {
  name: string;
  description: string;
  shape: 'circle' | 'hex';
  diameter?: number;
  width?: number;
  height?: number;
  textCenter: string;
}

export const COASTER_PRESETS: CoasterPresetConfig[] = [
  {
    name: 'Coaster 90mm',
    description: 'Standard coaster',
    shape: 'circle',
    diameter: 90,
    textCenter: 'COASTER',
  },
  {
    name: 'Badge 60mm',
    description: 'Name badge',
    shape: 'circle',
    diameter: 60,
    textCenter: 'NAME',
  },
  {
    name: 'Hex Coaster 100mm',
    description: 'Hexagon coaster',
    shape: 'hex',
    width: 100,
    textCenter: 'HEX',
  },
];

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeDimensions(diameter: number, width: number, height: number) {
  return {
    diameter: clamp(diameter, 20, 300),
    width: clamp(width, 20, 300),
    height: clamp(height, 20, 300),
  };
}

export function sanitizeBorder(borderInset: number): number {
  return clamp(borderInset, 0, 15);
}

export function sanitizePadding(padding: number): number {
  return clamp(padding, 0, 30);
}

export function sanitizeFontSizes(fontMin: number, fontMaxCenter: number, fontMaxSmall: number) {
  const min = clamp(fontMin, 6, 80);
  const maxC = clamp(fontMaxCenter, 6, 80);
  const maxS = clamp(fontMaxSmall, 6, 80);
  return {
    fontMin: min,
    fontMaxCenter: Math.max(min, maxC),
    fontMaxSmall: Math.max(min, maxS),
  };
}
