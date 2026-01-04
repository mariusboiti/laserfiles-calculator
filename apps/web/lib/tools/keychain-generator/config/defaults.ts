/**
 * Default values and presets for Keychain Generator
 * Used for reset functionality
 */

import type { KeychainShape, HolePosition } from '../types/keychain';

export const DEFAULTS = {
  shape: 'rounded-rectangle' as KeychainShape,
  w: 70,
  h: 25,
  cornerR: 6,
  border: false,
  hole: true,
  holeD: 5,
  holeMargin: 4,
  holePos: 'left' as HolePosition,
  padding: 4,
  text: 'Marius',
  autoFit: true,
  fontMin: 8,
  fontMax: 22,
  fontWeight: 'bold' as const,
  weight: '700' as const,
};

export interface KeychainPresetConfig {
  name: string;
  description: string;
  shape: KeychainShape;
  widthMm: number;
  heightMm: number;
  holePos: HolePosition;
  text: string;
}

export const KEYCHAIN_PRESETS: KeychainPresetConfig[] = [
  {
    name: 'Classic Name',
    description: 'Standard name keychain',
    shape: 'rounded-rectangle',
    widthMm: 80,
    heightMm: 30,
    holePos: 'left',
    text: 'NAME',
  },
  {
    name: 'Round Tag',
    description: 'Circular tag',
    shape: 'circle',
    widthMm: 35,
    heightMm: 35,
    holePos: 'top',
    text: 'M',
  },
  {
    name: 'Dog Tag',
    description: 'Military style tag',
    shape: 'dog-tag',
    widthMm: 80,
    heightMm: 35,
    holePos: 'top',
    text: 'MARIUS',
  },
];

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize keychain dimensions
 */
export function sanitizeKeychainDimensions(w: number, h: number): { w: number; h: number } {
  return {
    w: clamp(w, 15, 300),
    h: clamp(h, 15, 300),
  };
}

/**
 * Sanitize corner radius
 */
export function sanitizeCornerRadius(cornerR: number): number {
  return clamp(cornerR, 0, 60);
}

/**
 * Sanitize hole parameters
 */
export function sanitizeHole(holeD: number, holeMargin: number): { holeD: number; holeMargin: number } {
  return {
    holeD: clamp(holeD, 2, 15),
    holeMargin: clamp(holeMargin, 0, 30),
  };
}

/**
 * Sanitize padding
 */
export function sanitizePadding(padding: number): number {
  return clamp(padding, 0, 30);
}

/**
 * Sanitize font sizes
 */
export function sanitizeFontSizes(fontMin: number, fontMax: number): { fontMin: number; fontMax: number } {
  const min = clamp(fontMin, 6, 80);
  const max = clamp(fontMax, 6, 80);
  return {
    fontMin: Math.min(min, max),
    fontMax: Math.max(min, max),
  };
}
