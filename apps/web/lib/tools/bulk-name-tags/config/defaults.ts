/**
 * Default values for Bulk Name Tags
 * Used for reset functionality
 */

export const DEFAULTS = {
  tagW: 80,
  tagH: 30,
  cornerR: 6,
  holeD: 5,
  holeMargin: 4,
  fontMin: 10,
  fontMax: 26,
  padding: 6,
  sheetW: 300,
  sheetH: 200,
  gapX: 4,
  gapY: 4,
};

export const DEMO_NAMES = ['Mihai', 'Diana', 'Marius'];

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize tag dimensions
 */
export function sanitizeTagDimensions(tagW: number, tagH: number): { tagW: number; tagH: number } {
  return {
    tagW: clamp(tagW, 20, 300),
    tagH: clamp(tagH, 20, 300),
  };
}

/**
 * Sanitize hole parameters
 */
export function sanitizeHole(holeD: number, holeMargin: number): { holeD: number; holeMargin: number } {
  return {
    holeD: clamp(holeD, 2, 12),
    holeMargin: clamp(holeMargin, 0, 20),
  };
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

/**
 * Sanitize sheet dimensions
 */
export function sanitizeSheetDimensions(sheetW: number, sheetH: number): { sheetW: number; sheetH: number } {
  return {
    sheetW: clamp(sheetW, 100, 2000),
    sheetH: clamp(sheetH, 100, 2000),
  };
}

/**
 * Sanitize gaps
 */
export function sanitizeGaps(gapX: number, gapY: number): { gapX: number; gapY: number } {
  return {
    gapX: clamp(gapX, 0, 30),
    gapY: clamp(gapY, 0, 30),
  };
}
