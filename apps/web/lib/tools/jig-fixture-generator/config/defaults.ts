/**
 * Default values and presets for Jig & Fixture Generator
 */

export const DEFAULTS = {
  bedW: 300,
  bedH: 200,
  margin: 5,
  rows: 3,
  cols: 4,
  gapX: 6,
  gapY: 6,
  objectShape: 'rect' as const,
  objectW: 40,
  objectH: 20,
  holeMode: 'cut' as const,
  numbering: false,
  numberSize: 6,
  center: true,
  showBedOutline: true,
};

export interface JigPresetConfig {
  name: string;
  description: string;
  bedW: number;
  bedH: number;
  rows: number;
  cols: number;
  objectW: number;
  objectH: number;
}

export const JIG_PRESETS: JigPresetConfig[] = [
  {
    name: '300×200 – 12 pcs',
    description: 'Standard laser bed',
    bedW: 300,
    bedH: 200,
    rows: 3,
    cols: 4,
    objectW: 40,
    objectH: 20,
  },
  {
    name: 'A4 – 20 pcs',
    description: 'A4 sheet layout',
    bedW: 210,
    bedH: 297,
    rows: 4,
    cols: 5,
    objectW: 35,
    objectH: 20,
  },
  {
    name: 'Small Parts',
    description: 'Many small objects',
    bedW: 300,
    bedH: 200,
    rows: 5,
    cols: 6,
    objectW: 25,
    objectH: 15,
  },
];

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeBedDimensions(bedW: number, bedH: number) {
  return {
    bedW: clamp(bedW, 50, 3000),
    bedH: clamp(bedH, 50, 3000),
  };
}

export function sanitizeMargin(margin: number): number {
  return clamp(margin, 0, 50);
}

export function sanitizeRowsCols(rows: number, cols: number) {
  return {
    rows: clamp(rows, 1, 50),
    cols: clamp(cols, 1, 50),
  };
}

export function sanitizeGaps(gapX: number, gapY: number) {
  return {
    gapX: clamp(gapX, 0, 50),
    gapY: clamp(gapY, 0, 50),
  };
}

export function sanitizeObjectSize(objectW: number, objectH: number) {
  return {
    objectW: clamp(objectW, 5, 500),
    objectH: clamp(objectH, 5, 500),
  };
}

export function sanitizeNumberSize(numberSize: number): number {
  return clamp(numberSize, 4, 20);
}
