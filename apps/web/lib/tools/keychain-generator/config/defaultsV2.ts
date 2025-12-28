/**
 * Keychain Generator V2 - Defaults and Validation
 */

import type { KeychainConfigV2, KeychainPresetV2, FontWeight } from '../types/keychainV2';

export const DEFAULTS_V2: KeychainConfigV2 = {
  // Shape
  shape: 'rounded-rectangle',
  width: 70,
  height: 25,
  cornerRadius: 6,
  border: false,
  borderWidth: 1,

  // Hole
  hole: {
    enabled: true,
    type: 'circle',
    position: 'left',
    diameter: 5,
    slotWidth: 7,
    slotHeight: 4,
    spacing: 28,
    margin: 4,
  },

  // Text
  text: {
    mode: 'single',
    text: 'Marius',
    text2: 'LaserFilesPro',
    lineGap: 0.9,
    align: 'center',
    fontFamily: 'Inter',
    weight: '700',
    autoFit: true,
    fontMin: 8,
    fontMax: 22,
  },
  padding: 4,

  // Render
  render: {
    mode: 'cut+engrave',
    cutStroke: 0.001,
    engraveStyle: 'fill',
    engraveStroke: 0.3,
  },

  // Preview
  preview: {
    showSafeZones: false,
    showHatchPreview: false,
    showGrid: false,
  },

  // Custom shape (V3)
  customShape: {
    enabled: false,
    svgPath: null,
    originalBounds: null,
  },

  // Batch (V3)
  batch: {
    enabled: false,
    names: [],
    sheetWidth: 600,
    sheetHeight: 400,
    spacing: 5,
    margin: 10,
  },
};

export const LIMITS = {
  width: { min: 15, max: 300 },
  height: { min: 15, max: 300 },
  cornerRadius: { min: 0, max: 60 },
  borderWidth: { min: 0.5, max: 5 },
  holeDiameter: { min: 2, max: 15 },
  holeSlotWidth: { min: 2, max: 20 },
  holeSlotHeight: { min: 2, max: 20 },
  holeSpacing: { min: 5, max: 200 },
  holeMargin: { min: 0, max: 30 },
  padding: { min: 0, max: 30 },
  fontMin: { min: 6, max: 80 },
  fontMax: { min: 6, max: 80 },
  lineGap: { min: 0.7, max: 1.4 },
  cutStroke: { min: 0.001, max: 0.2 },
  engraveStroke: { min: 0.05, max: 2 },
  sheetWidth: { min: 100, max: 1200 },
  sheetHeight: { min: 100, max: 800 },
  sheetSpacing: { min: 0, max: 50 },
  sheetMargin: { min: 0, max: 50 },
};

export const FONT_FAMILIES = [
  'Inter',
  'Arial',
  'Roboto',
  'Helvetica',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
];

export const FONT_WEIGHTS: { value: FontWeight; label: string }[] = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi-Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra-Bold' },
  { value: '900', label: 'Black' },
];

export const DEFAULT_PRESETS: KeychainPresetV2[] = [
  {
    name: 'Classic Name',
    description: 'Standard name keychain',
    values: {
      shape: 'rounded-rectangle',
      width: 80,
      height: 30,
      hole: { ...DEFAULTS_V2.hole, position: 'left' },
      text: { ...DEFAULTS_V2.text, text: 'NAME' },
    },
    createdAt: 0,
    isDefault: true,
  },
  {
    name: 'Round Tag',
    description: 'Circular tag',
    values: {
      shape: 'circle',
      width: 35,
      height: 35,
      hole: { ...DEFAULTS_V2.hole, position: 'top' },
      text: { ...DEFAULTS_V2.text, text: 'M' },
    },
    createdAt: 0,
    isDefault: true,
  },
  {
    name: 'Dog Tag',
    description: 'Military style tag',
    values: {
      shape: 'dog-tag',
      width: 80,
      height: 35,
      hole: { ...DEFAULTS_V2.hole, position: 'top' },
      text: { ...DEFAULTS_V2.text, text: 'MARIUS' },
    },
    createdAt: 0,
    isDefault: true,
  },
  {
    name: 'Minimal Engrave',
    description: 'Cut + engrave with fill style',
    values: {
      render: { ...DEFAULTS_V2.render, mode: 'cut+engrave', engraveStyle: 'fill' },
    },
    createdAt: 0,
    isDefault: true,
  },
  {
    name: 'Slot Hole Keytag',
    description: 'Slot hole on left side',
    values: {
      hole: { ...DEFAULTS_V2.hole, type: 'slot', position: 'left' },
    },
    createdAt: 0,
    isDefault: true,
  },
  {
    name: 'Two Line Tag',
    description: 'Keychain with two text lines',
    values: {
      width: 90,
      height: 35,
      text: { ...DEFAULTS_V2.text, mode: 'double', text: 'MARIUS', text2: 'LaserFilesPro' },
    },
    createdAt: 0,
    isDefault: true,
  },
];

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeConfig(config: Partial<KeychainConfigV2>): KeychainConfigV2 {
  const c = { ...DEFAULTS_V2, ...config };

  c.width = clamp(c.width, LIMITS.width.min, LIMITS.width.max);
  c.height = clamp(c.height, LIMITS.height.min, LIMITS.height.max);
  c.cornerRadius = clamp(c.cornerRadius, LIMITS.cornerRadius.min, Math.min(LIMITS.cornerRadius.max, c.width / 2, c.height / 2));
  c.padding = clamp(c.padding, LIMITS.padding.min, LIMITS.padding.max);

  if (config.hole) {
    c.hole = { ...DEFAULTS_V2.hole, ...config.hole };
  }
  c.hole.diameter = clamp(c.hole.diameter, LIMITS.holeDiameter.min, LIMITS.holeDiameter.max);
  c.hole.slotWidth = clamp(c.hole.slotWidth, LIMITS.holeSlotWidth.min, LIMITS.holeSlotWidth.max);
  c.hole.slotHeight = clamp(c.hole.slotHeight, LIMITS.holeSlotHeight.min, LIMITS.holeSlotHeight.max);
  c.hole.spacing = clamp(c.hole.spacing, LIMITS.holeSpacing.min, LIMITS.holeSpacing.max);
  c.hole.margin = clamp(c.hole.margin, LIMITS.holeMargin.min, LIMITS.holeMargin.max);

  if (config.text) {
    c.text = { ...DEFAULTS_V2.text, ...config.text };
  }
  c.text.fontMin = clamp(c.text.fontMin, LIMITS.fontMin.min, LIMITS.fontMin.max);
  c.text.fontMax = clamp(c.text.fontMax, LIMITS.fontMax.min, LIMITS.fontMax.max);
  if (c.text.fontMin > c.text.fontMax) {
    [c.text.fontMin, c.text.fontMax] = [c.text.fontMax, c.text.fontMin];
  }
  c.text.lineGap = clamp(c.text.lineGap, LIMITS.lineGap.min, LIMITS.lineGap.max);

  if (config.render) {
    c.render = { ...DEFAULTS_V2.render, ...config.render };
  }
  c.render.cutStroke = clamp(c.render.cutStroke, LIMITS.cutStroke.min, LIMITS.cutStroke.max);
  c.render.engraveStroke = clamp(c.render.engraveStroke, LIMITS.engraveStroke.min, LIMITS.engraveStroke.max);

  if (config.preview) {
    c.preview = { ...DEFAULTS_V2.preview, ...config.preview };
  }

  if (config.customShape) {
    c.customShape = { ...DEFAULTS_V2.customShape, ...config.customShape };
  }

  if (config.batch) {
    c.batch = { ...DEFAULTS_V2.batch, ...config.batch };
  }
  c.batch.sheetWidth = clamp(c.batch.sheetWidth, LIMITS.sheetWidth.min, LIMITS.sheetWidth.max);
  c.batch.sheetHeight = clamp(c.batch.sheetHeight, LIMITS.sheetHeight.min, LIMITS.sheetHeight.max);
  c.batch.spacing = clamp(c.batch.spacing, LIMITS.sheetSpacing.min, LIMITS.sheetSpacing.max);
  c.batch.margin = clamp(c.batch.margin, LIMITS.sheetMargin.min, LIMITS.sheetMargin.max);

  return c;
}
