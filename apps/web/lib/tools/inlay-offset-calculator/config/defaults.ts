/**
 * Default values and presets for Inlay Offset Calculator
 */

export const DEFAULTS = {
  materialThickness: 3,
  kerf: 0.15,
  extraClearance: 0,
  unit: 'mm' as const,
};

export interface InlayPresetConfig {
  name: string;
  description: string;
  materialThickness: number;
  kerf: number;
  extraClearance?: number;
}

export const INLAY_PRESETS: InlayPresetConfig[] = [
  {
    name: '3mm Plywood (CO2)',
    description: 'Standard 3mm plywood',
    materialThickness: 3,
    kerf: 0.15,
  },
  {
    name: '4mm Plywood (CO2)',
    description: 'Standard 4mm plywood',
    materialThickness: 4,
    kerf: 0.18,
  },
  {
    name: 'Acrylic 3mm',
    description: '3mm acrylic sheet',
    materialThickness: 3,
    kerf: 0.2,
  },
  {
    name: 'Fine Fit',
    description: 'Tight fit adjustment',
    materialThickness: 3,
    kerf: 0.15,
    extraClearance: -0.05,
  },
];

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeMaterialThickness(thickness: number): number {
  return clamp(thickness, 1, 20);
}

export function sanitizeKerf(kerf: number): number {
  return clamp(kerf, 0, 0.6);
}

export function sanitizeExtraClearance(clearance: number): number {
  return clamp(clearance, -0.5, 0.5);
}
