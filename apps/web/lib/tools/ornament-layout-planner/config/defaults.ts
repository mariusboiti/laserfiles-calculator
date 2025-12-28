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
  
  // Labels
  showLabels: false,
  exportLabels: false,
  labelStyle: 'index',
  labelFontSize: 3.2,
  labelOffsetX: 1.2,
  labelOffsetY: 1.2,
  
  // Display
  showSheetOutline: true,
  showTileBounds: false,
  
  // SVG parsing
  pxDpi: 96,
  sanitizeSvg: true,
};

export interface SheetPresetConfig {
  name: string;
  description: string;
  widthMm: number;
  heightMm: number;
}

export const SHEET_PRESETS: SheetPresetConfig[] = [
  {
    name: 'Laser Bed 300×200',
    description: 'Standard desktop laser',
    widthMm: 300,
    heightMm: 200,
  },
  {
    name: 'Laser Bed 400×400',
    description: 'Medium format laser',
    widthMm: 400,
    heightMm: 400,
  },
  {
    name: 'Laser Bed 600×400',
    description: 'Large format laser',
    widthMm: 600,
    heightMm: 400,
  },
  {
    name: 'A4 Sheet',
    description: '210×297mm',
    widthMm: 210,
    heightMm: 297,
  },
  {
    name: 'Glowforge',
    description: '495×279mm',
    widthMm: 495,
    heightMm: 279,
  },
  {
    name: 'xTool P2',
    description: '600×305mm',
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
