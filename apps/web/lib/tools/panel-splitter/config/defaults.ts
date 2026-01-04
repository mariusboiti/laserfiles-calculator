/**
 * Default values for Panel Splitter
 * Used for reset functionality
 */

export const DEFAULTS = {
  bedW: 300,
  bedH: 200,
  margin: 5,
  overlap: 0,
  units: 'mm' as const,
};

export const BED_PRESETS = [
  {
    name: 'K40 (300×200mm)',
    description: 'Common desktop laser',
    bedWidth: 300,
    bedHeight: 200,
  },
  {
    name: 'A4 (210×297mm)',
    description: 'Standard paper size',
    bedWidth: 210,
    bedHeight: 297,
  },
  {
    name: 'Glowforge Basic (495×279mm)',
    description: 'Glowforge Basic/Plus',
    bedWidth: 495,
    bedHeight: 279,
  },
  {
    name: 'Glowforge Pro (508×279mm)',
    description: 'Glowforge Pro',
    bedWidth: 508,
    bedHeight: 279,
  },
  {
    name: 'Thunder Laser Nova 24 (610×406mm)',
    description: 'Thunder Nova 24',
    bedWidth: 610,
    bedHeight: 406,
  },
  {
    name: 'Thunder Laser Nova 35 (900×600mm)',
    description: 'Thunder Nova 35',
    bedWidth: 900,
    bedHeight: 600,
  },
  {
    name: 'Epilog Zing 16 (406×305mm)',
    description: 'Epilog Zing 16',
    bedWidth: 406,
    bedHeight: 305,
  },
  {
    name: 'Trotec Speedy 100 (610×305mm)',
    description: 'Trotec Speedy 100',
    bedWidth: 610,
    bedHeight: 305,
  },
  {
    name: 'Custom',
    description: 'Enter custom dimensions',
    bedWidth: 300,
    bedHeight: 200,
  },
];

export const MM_TO_INCH = 1 / 25.4;
export const INCH_TO_MM = 25.4;

export function mmToInch(mm: number): number {
  return mm * MM_TO_INCH;
}

export function inchToMm(inch: number): number {
  return inch * INCH_TO_MM;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize and clamp bed dimensions
 */
export function sanitizeBedDimensions(bedW: number, bedH: number): { bedW: number; bedH: number } {
  return {
    bedW: clamp(bedW, 50, 2000),
    bedH: clamp(bedH, 50, 2000),
  };
}

/**
 * Sanitize margin and overlap
 */
export function sanitizeMarginOverlap(margin: number, overlap: number): { margin: number; overlap: number } {
  return {
    margin: clamp(margin, 0, 50),
    overlap: clamp(overlap, 0, 10),
  };
}
