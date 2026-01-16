/**
 * Default values and presets for Ornament/Nameplate Layout Planner V2
 */

import type { LayoutSettings } from '../types/layout';

export const DEFAULTS: LayoutSettings = {
  // Sheet
  sheetW: 300,
  sheetH: 200,
  unit: 'mm',
  margin: 5,
  gapX: 4,
  gapY: 4,
  
  // Mode
  mode: 'grid',
  
  // Grid mode
  rows: 3,
  cols: 4,
  center: true,
  autoFit: false,
  
  // Pack mode
  groupByTemplate: true,
  allowRotateInPack: false,
  
  // Multi-sheet
  multiSheet: true,
  maxSheets: 20,
  overflowPolicy: 'new-sheet',
  
  // Display
  showSheetOutline: true,
  showTileBounds: false,
  
  // SVG parsing
  pxDpi: 96,
  sanitizeSvg: true,
  
  // Hole customization
  holeRadius: 2.5,
  holeYOffset: 10,
};

export interface SheetPresetConfig {
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
}

export const SHEET_PRESETS: SheetPresetConfig[] = [
  {
    name: 'ornament_layout.sheet_presets.laser_bed_300x200.name',
    description: 'ornament_layout.sheet_presets.laser_bed_300x200.description',
    widthMm: 300,
    heightMm: 200,
  },
  {
    name: 'ornament_layout.sheet_presets.laser_bed_400x400.name',
    description: 'ornament_layout.sheet_presets.laser_bed_400x400.description',
    widthMm: 400,
    heightMm: 400,
  },
  {
    name: 'ornament_layout.sheet_presets.laser_bed_600x400.name',
    description: 'ornament_layout.sheet_presets.laser_bed_600x400.description',
    widthMm: 600,
    heightMm: 400,
  },
  {
    name: 'ornament_layout.sheet_presets.a4_sheet.name',
    description: 'ornament_layout.sheet_presets.a4_sheet.description',
    widthMm: 210,
    heightMm: 297,
  },
  {
    name: 'ornament_layout.sheet_presets.glowforge.name',
    description: 'ornament_layout.sheet_presets.glowforge.description',
    widthMm: 495,
    heightMm: 279,
  },
  {
    name: 'ornament_layout.sheet_presets.xtool_p2.name',
    description: 'ornament_layout.sheet_presets.xtool_p2.description',
    widthMm: 600,
    heightMm: 305,
  },
];

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeSheetDimensions(sheetW: number, sheetH: number) {
  return {
    sheetW: clamp(sheetW, 50, 2000),
    sheetH: clamp(sheetH, 50, 2000),
  };
}

export function sanitizeMargin(margin: number): number {
  return clamp(margin, 0, 50);
}

export function sanitizeGaps(gapX: number, gapY: number) {
  return {
    gapX: clamp(gapX, 0, 30),
    gapY: clamp(gapY, 0, 30),
  };
}

export function sanitizeRowsCols(rows: number, cols: number) {
  return {
    rows: clamp(rows, 1, 100),
    cols: clamp(cols, 1, 100),
  };
}
