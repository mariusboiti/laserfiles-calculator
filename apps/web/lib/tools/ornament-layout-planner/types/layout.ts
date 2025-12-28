// V1 Legacy (keep for compatibility)
export type LayoutOptions = {
  templateSvg: string;
  rows: number;
  cols: number;
  spacingXmm: number;
  spacingYmm: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  centerLayout: boolean;
  showSheetOutline: boolean;
};

// V2 Types
export type LayoutMode = 'grid' | 'pack';

export type LabelStyle = 'index' | 'templateName' | 'templateName+index';

export type OverflowPolicy = 'new-sheet' | 'stop-and-warn';

export interface TemplateItem {
  id: string;
  name: string;
  svgText: string;
  innerSvg: string;
  width: number;
  height: number;
  viewBox?: { minX: number; minY: number; w: number; h: number };
  qty: number;
  rotateDeg: 0 | 90 | 180 | 270;
}

export interface LayoutSettings {
  // Sheet
  sheetW: number;
  sheetH: number;
  unit: 'mm' | 'in';
  margin: number;
  gapX: number;
  gapY: number;
  
  // Mode
  mode: LayoutMode;
  
  // Grid mode
  rows: number;
  cols: number;
  center: boolean;
  autoFit: boolean;
  activeTemplateId?: string;
  
  // Pack mode
  groupByTemplate: boolean;
  allowRotateInPack: boolean;
  
  // Multi-sheet
  multiSheet: boolean;
  maxSheets: number;
  overflowPolicy: OverflowPolicy;
  
  // Labels
  showLabels: boolean;
  exportLabels: boolean;
  labelStyle: LabelStyle;
  labelFontSize: number;
  labelOffsetX: number;
  labelOffsetY: number;
  
  // Display
  showSheetOutline: boolean;
  showTileBounds: boolean;
  
  // SVG parsing
  pxDpi: number;
  sanitizeSvg: boolean;
}

export interface PlacedItem {
  templateId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotateDeg: number;
  label?: string;
}

export interface SheetLayout {
  sheetIndex: number;
  items: PlacedItem[];
  warnings: string[];
}

export interface LayoutResult {
  sheets: SheetLayout[];
  summaryWarnings: string[];
  errors: string[];
}
