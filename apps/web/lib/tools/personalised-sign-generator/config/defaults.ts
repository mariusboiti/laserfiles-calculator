/**
 * Default values and presets for Personalised Sign Generator
 * Used for reset functionality
 */

import type { SignShape, HolePosition } from '../types/sign';

export const DEFAULTS = {
  shape: 'rounded-rectangle' as SignShape,
  w: 300,
  h: 150,
  cornerR: 12,
  archRadius: 75,
  border: true,
  holes: true,
  holeD: 5,
  holeStyle: 'top-left-right' as HolePosition,
  holeMargin: 10,
  padding: 12,
  line1: '',
  line2: 'FAMILY NAME',
  line3: 'EST. 2025',
  autoFit: true,
  fontMin: 10,
  fontMaxMain: 60,
  fontMaxSmall: 28,
  weightMain: '700' as const,
  weightSmall: '500' as const,
};

export interface SignPresetConfig {
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
  shape: SignShape;
  line1?: string;
  line2: string;
  line3?: string;
}

export const SIGN_PRESETS: SignPresetConfig[] = [
  {
    name: 'Workshop Sign',
    description: 'Standard workshop sign',
    widthMm: 400,
    heightMm: 200,
    shape: 'rounded-rectangle',
    line2: 'WORKSHOP',
    line3: 'EST. 2025',
  },
  {
    name: 'Family Sign',
    description: 'Family name sign',
    widthMm: 500,
    heightMm: 250,
    shape: 'rounded-rectangle',
    line1: 'THE',
    line2: 'POPESCU',
    line3: 'FAMILY',
  },
  {
    name: 'Welcome Sign',
    description: 'Arch welcome sign',
    widthMm: 600,
    heightMm: 300,
    shape: 'arch',
    line1: 'WELCOME',
    line2: 'HOME',
    line3: '',
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
 * Sanitize sign dimensions
 */
export function sanitizeSignDimensions(w: number, h: number): { w: number; h: number } {
  return {
    w: clamp(w, 80, 2000),
    h: clamp(h, 80, 2000),
  };
}

/**
 * Sanitize corner radius
 */
export function sanitizeCornerRadius(cornerR: number): number {
  return clamp(cornerR, 0, 200);
}

/**
 * Sanitize hole parameters
 */
export function sanitizeHole(holeD: number, holeMargin: number): { holeD: number; holeMargin: number } {
  return {
    holeD: clamp(holeD, 2, 20),
    holeMargin: clamp(holeMargin, 0, 60),
  };
}

/**
 * Sanitize padding
 */
export function sanitizePadding(padding: number): number {
  return clamp(padding, 0, 60);
}
