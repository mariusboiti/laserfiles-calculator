/**
 * Personalised Sign Generator V3 - Defaults and Validation
 */

import type {
  SignConfigV3,
  SignShapeV3,
  HolePreset,
  TextTransform,
  CurvedMode,
  OutputMode,
  TextWeight,
  IconPlacement,
  SignTemplate,
} from '../types/signV3';

// ============ Default Configuration ============
export const DEFAULTS_V3: SignConfigV3 = {
  // Shape
  shape: 'rounded-rect',
  width: 400,
  height: 200,
  cornerRadius: 15,
  archRadius: 100,
  borderEnabled: true,
  borderWidth: 2,

  // Holes
  holes: {
    preset: 'two-top',
    diameter: 5,
    margin: 12,
    slotLength: 15,
    slotWidth: 4,
  },

  // Text
  text: {
    line1: {
      text: '',
      fontFamily: 'Arial',
      weight: '500',
      fontSize: 24,
      letterSpacing: 0,
      transform: 'upper',
      offsetX: 0,
      offsetY: 0,
    },
    line2: {
      text: 'FAMILY NAME',
      fontFamily: 'Arial',
      weight: '700',
      fontSize: 48,
      letterSpacing: 1,
      transform: 'upper',
      offsetX: 0,
      offsetY: 0,
    },
    line3: {
      text: 'EST. 2025',
      fontFamily: 'Arial',
      weight: '500',
      fontSize: 20,
      letterSpacing: 0,
      transform: 'none',
      offsetX: 0,
      offsetY: 0,
    },
    lineHeight: 1.2,
    curvedModeLine2: 'straight',
    curvedIntensity: 30,
  },
  padding: 15,

  // Decorations
  icon: {
    id: null,
    placement: 'left-of-line2',
    size: 20,
  },
  monogram: {
    enabled: false,
    text: '',
    size: 40,
    placement: 'top',
  },
  logo: {
    svg: null,
    placement: { x: 0, y: 0, width: 50, height: 50, lockAspect: true },
    simplify: false,
  },

  // Output
  output: {
    mode: 'both',
    cutStrokeWidth: 0.1,
    engraveStrokeWidth: 0.5,
    units: 'mm',
  },

  // Sheet
  sheet: {
    enabled: false,
    width: 600,
    height: 400,
    margin: 10,
    spacing: 5,
    countX: 1,
    countY: 1,
    autoFill: true,
  },

  // Template
  templateId: 'custom',
};

// ============ Validation Limits ============
export const LIMITS = {
  width: { min: 80, max: 2000 },
  height: { min: 80, max: 2000 },
  cornerRadius: { min: 0, max: 200 },
  archRadius: { min: 20, max: 500 },
  borderWidth: { min: 0.5, max: 10 },
  holeDiameter: { min: 2, max: 20 },
  holeMargin: { min: 0, max: 60 },
  slotLength: { min: 5, max: 30 },
  slotWidth: { min: 2, max: 10 },
  padding: { min: 0, max: 60 },
  fontSize: { min: 6, max: 200 },
  letterSpacing: { min: -10, max: 20 },
  lineHeight: { min: 0.8, max: 1.6 },
  curvedIntensity: { min: 0, max: 100 },
  iconSize: { min: 5, max: 100 },
  monogramSize: { min: 10, max: 150 },
  strokeWidth: { min: 0.01, max: 0.5 },
  sheetWidth: { min: 100, max: 3000 },
  sheetHeight: { min: 100, max: 2000 },
  sheetMargin: { min: 0, max: 50 },
  sheetSpacing: { min: 0, max: 50 },
  sheetCount: { min: 1, max: 50 },
};

// ============ Font Options ============
export const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Courier New',
];

export const FONT_WEIGHTS: { value: TextWeight; label: string }[] = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi-Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra-Bold' },
  { value: '900', label: 'Black' },
];

// ============ Shape Options ============
export const SHAPE_OPTIONS: { value: SignShapeV3; label: string; description: string }[] = [
  { value: 'rectangle', label: 'Rectangle', description: 'Simple rectangle' },
  { value: 'rounded-rect', label: 'Rounded Rectangle', description: 'Rectangle with rounded corners' },
  { value: 'arch', label: 'Arch', description: 'Rectangle with semicircle top' },
  { value: 'rounded-arch', label: 'Rounded Arch', description: 'Arch with rounded bottom corners' },
  { value: 'circle', label: 'Circle', description: 'Perfect circle' },
  { value: 'oval', label: 'Oval', description: 'Ellipse shape' },
  { value: 'hex', label: 'Hexagon', description: 'Six-sided shape' },
  { value: 'stadium', label: 'Stadium', description: 'Capsule/pill shape' },
  { value: 'shield', label: 'Shield', description: 'Badge/shield shape' },
  { value: 'tag', label: 'Tag', description: 'Label tag with pointed end' },
  { value: 'plaque', label: 'Plaque', description: 'Decorative plaque shape' },
];

// ============ Hole Presets ============
export const HOLE_PRESETS: { value: HolePreset; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No mounting holes' },
  { value: 'top-center', label: 'Top Center', description: 'Single hole at top center' },
  { value: 'two-top', label: 'Two Top', description: 'Two holes at top corners' },
  { value: 'four-corners', label: 'Four Corners', description: 'Holes at all four corners' },
  { value: 'two-sides', label: 'Two Sides', description: 'Holes on left and right sides' },
  { value: 'slots', label: 'Keyhole Slots', description: 'Keyhole mounting slots' },
  { value: 'hanger-slot', label: 'Hanger Slot', description: 'Single oval slot at top center' },
  { value: 'magnets-2', label: 'Magnets (2)', description: 'Two magnet holes/pockets' },
  { value: 'magnets-4', label: 'Magnets (4)', description: 'Four magnet holes/pockets' },
];

// ============ Sheet Presets ============
export const SHEET_PRESETS: { name: string; width: number; height: number }[] = [
  { name: 'Laser Bed 600×400', width: 600, height: 400 },
  { name: 'Laser Bed 400×400', width: 400, height: 400 },
  { name: 'Laser Bed 300×200', width: 300, height: 200 },
  { name: 'A4', width: 297, height: 210 },
  { name: 'A3', width: 420, height: 297 },
  { name: 'Glowforge', width: 495, height: 279 },
  { name: 'xTool P2', width: 600, height: 300 },
];

// ============ Utility Functions ============
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeConfig(config: Partial<SignConfigV3>): SignConfigV3 {
  const c = { ...DEFAULTS_V3, ...config };

  // Sanitize dimensions
  c.width = clamp(c.width, LIMITS.width.min, LIMITS.width.max);
  c.height = clamp(c.height, LIMITS.height.min, LIMITS.height.max);
  c.cornerRadius = clamp(c.cornerRadius, LIMITS.cornerRadius.min, LIMITS.cornerRadius.max);
  c.borderWidth = clamp(c.borderWidth, LIMITS.borderWidth.min, LIMITS.borderWidth.max);
  c.padding = clamp(c.padding, LIMITS.padding.min, LIMITS.padding.max);

  // Sanitize holes
  c.holes.diameter = clamp(c.holes.diameter, LIMITS.holeDiameter.min, LIMITS.holeDiameter.max);
  c.holes.margin = clamp(c.holes.margin, LIMITS.holeMargin.min, LIMITS.holeMargin.max);
  if (c.holes.slotLength) {
    c.holes.slotLength = clamp(c.holes.slotLength, LIMITS.slotLength.min, LIMITS.slotLength.max);
  }
  if (c.holes.slotWidth) {
    c.holes.slotWidth = clamp(c.holes.slotWidth, LIMITS.slotWidth.min, LIMITS.slotWidth.max);
  }

  // Sanitize text
  c.text.lineHeight = clamp(c.text.lineHeight, LIMITS.lineHeight.min, LIMITS.lineHeight.max);
  c.text.curvedIntensity = clamp(c.text.curvedIntensity, LIMITS.curvedIntensity.min, LIMITS.curvedIntensity.max);
  c.text.line1.letterSpacing = clamp(c.text.line1.letterSpacing, LIMITS.letterSpacing.min, LIMITS.letterSpacing.max);
  c.text.line2.letterSpacing = clamp(c.text.line2.letterSpacing, LIMITS.letterSpacing.min, LIMITS.letterSpacing.max);
  c.text.line3.letterSpacing = clamp(c.text.line3.letterSpacing, LIMITS.letterSpacing.min, LIMITS.letterSpacing.max);

  // Sanitize icon
  c.icon.size = clamp(c.icon.size, LIMITS.iconSize.min, LIMITS.iconSize.max);

  // Sanitize monogram
  c.monogram.size = clamp(c.monogram.size, LIMITS.monogramSize.min, LIMITS.monogramSize.max);

  // Sanitize output
  c.output.cutStrokeWidth = clamp(c.output.cutStrokeWidth, LIMITS.strokeWidth.min, LIMITS.strokeWidth.max);
  c.output.engraveStrokeWidth = clamp(c.output.engraveStrokeWidth, LIMITS.strokeWidth.min, LIMITS.strokeWidth.max);

  // Sanitize sheet
  c.sheet.width = clamp(c.sheet.width, LIMITS.sheetWidth.min, LIMITS.sheetWidth.max);
  c.sheet.height = clamp(c.sheet.height, LIMITS.sheetHeight.min, LIMITS.sheetHeight.max);
  c.sheet.margin = clamp(c.sheet.margin, LIMITS.sheetMargin.min, LIMITS.sheetMargin.max);
  c.sheet.spacing = clamp(c.sheet.spacing, LIMITS.sheetSpacing.min, LIMITS.sheetSpacing.max);
  c.sheet.countX = clamp(c.sheet.countX, LIMITS.sheetCount.min, LIMITS.sheetCount.max);
  c.sheet.countY = clamp(c.sheet.countY, LIMITS.sheetCount.min, LIMITS.sheetCount.max);

  return c;
}

export function applyTextTransform(text: string, transform: TextTransform): string {
  switch (transform) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    default:
      return text;
  }
}
