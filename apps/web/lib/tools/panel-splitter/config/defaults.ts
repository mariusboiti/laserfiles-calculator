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
    id: 'k40_300x200',
    nameKey: 'panel_splitter.presets.k40.name',
    descriptionKey: 'panel_splitter.presets.k40.description',
    bedWidth: 300,
    bedHeight: 200,
  },
  {
    id: 'a4_210x297',
    nameKey: 'panel_splitter.presets.a4.name',
    descriptionKey: 'panel_splitter.presets.a4.description',
    bedWidth: 210,
    bedHeight: 297,
  },
  {
    id: 'glowforge_basic_495x279',
    nameKey: 'panel_splitter.presets.glowforge_basic.name',
    descriptionKey: 'panel_splitter.presets.glowforge_basic.description',
    bedWidth: 495,
    bedHeight: 279,
  },
  {
    id: 'glowforge_pro_508x279',
    nameKey: 'panel_splitter.presets.glowforge_pro.name',
    descriptionKey: 'panel_splitter.presets.glowforge_pro.description',
    bedWidth: 508,
    bedHeight: 279,
  },
  {
    id: 'thunder_nova24_610x406',
    nameKey: 'panel_splitter.presets.thunder_nova24.name',
    descriptionKey: 'panel_splitter.presets.thunder_nova24.description',
    bedWidth: 610,
    bedHeight: 406,
  },
  {
    id: 'thunder_nova35_900x600',
    nameKey: 'panel_splitter.presets.thunder_nova35.name',
    descriptionKey: 'panel_splitter.presets.thunder_nova35.description',
    bedWidth: 900,
    bedHeight: 600,
  },
  {
    id: 'epilog_zing16_406x305',
    nameKey: 'panel_splitter.presets.epilog_zing16.name',
    descriptionKey: 'panel_splitter.presets.epilog_zing16.description',
    bedWidth: 406,
    bedHeight: 305,
  },
  {
    id: 'trotec_speedy100_610x305',
    nameKey: 'panel_splitter.presets.trotec_speedy100.name',
    descriptionKey: 'panel_splitter.presets.trotec_speedy100.description',
    bedWidth: 610,
    bedHeight: 305,
  },
  {
    id: 'custom',
    nameKey: 'panel_splitter.presets.custom.name',
    descriptionKey: 'panel_splitter.presets.custom.description',
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
