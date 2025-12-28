/**
 * Centralized Material Preset Configuration
 * 
 * Defines optimized settings for different laser engraving materials.
 * Each preset includes brightness, contrast, gamma, invert, and dithering settings.
 */

import { DitherMode } from '../../types';

export interface MaterialPresetConfig {
  id: 'plywood' | 'hardwood' | 'mdf' | 'acrylic' | 'anodized' | 'slate';
  label: string;
  description: string;
  settings: {
    brightness: number;
    contrast: number;
    gamma: number;
    invert: boolean;
    ditherMethod: DitherMode;
  };
}

/**
 * Material presets with realistic defaults optimized for laser engraving
 */
export const MATERIAL_PRESET_CONFIG: MaterialPresetConfig[] = [
  {
    id: 'plywood',
    label: 'Plywood',
    description: 'Balanced settings for plywood - slight contrast boost with Floyd-Steinberg dithering for natural wood grain',
    settings: {
      brightness: 0,
      contrast: 12,
      gamma: 1.05,
      invert: false,
      ditherMethod: 'floyd-steinberg',
    },
  },
  {
    id: 'hardwood',
    label: 'Hardwood',
    description: 'Higher contrast for dense hardwoods - enhanced detail with stronger dithering',
    settings: {
      brightness: 5,
      contrast: 28,
      gamma: 1.1,
      invert: false,
      ditherMethod: 'floyd-steinberg',
    },
  },
  {
    id: 'mdf',
    label: 'MDF',
    description: 'Lower contrast for MDF - softer transitions with Atkinson dithering for uniform surface',
    settings: {
      brightness: 0,
      contrast: -8,
      gamma: 1.0,
      invert: false,
      ditherMethod: 'atkinson',
    },
  },
  {
    id: 'acrylic',
    label: 'Acrylic',
    description: 'Inverted colors for back-engraved acrylic - medium contrast, no dithering for clean edges',
    settings: {
      brightness: 0,
      contrast: 18,
      gamma: 1.0,
      invert: true,
      ditherMethod: 'none',
    },
  },
  {
    id: 'anodized',
    label: 'Anodized Aluminum',
    description: 'High contrast for anodized aluminum - strong blacks, no dithering for crisp lines',
    settings: {
      brightness: 12,
      contrast: 42,
      gamma: 1.15,
      invert: false,
      ditherMethod: 'none',
    },
  },
  {
    id: 'slate',
    label: 'Slate/Stone',
    description: 'Strong contrast for slate and stone - enhanced detail with Floyd-Steinberg for texture',
    settings: {
      brightness: 8,
      contrast: 38,
      gamma: 1.2,
      invert: false,
      ditherMethod: 'floyd-steinberg',
    },
  },
];

/**
 * Get preset by ID
 */
export function getMaterialPreset(id: string): MaterialPresetConfig | undefined {
  return MATERIAL_PRESET_CONFIG.find(p => p.id === id);
}
