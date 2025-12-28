/**
 * Jigsaw Maker V2 Types (PathOps WASM Rebuild)
 */

// ============================================================================
// Core Settings
// ============================================================================

export interface JigsawSettings {
  // Puzzle dimensions
  widthMm: number;
  heightMm: number;
  rows: number;
  columns: number;
  
  // Knob style
  knobStyle?: 'classic' | 'organic' | 'simple';  // classic = smooth round, organic = irregular natural, simple = basic geometric
  
  // Randomness
  randomSeed: number;
  
  // Geometry
  cornerRadiusMm: number;  // For outer rectangle
  
  // Kerf & Clearance
  kerfMm: number;          // Laser kerf compensation (default 0.15)
  clearanceMm: number;     // Additional offset for fit (default 0.00)
  fitMode?: FitMode;       // Preset for clearance
  
  // Sheet & Layout
  sheetPreset: SheetPreset;
  customSheetWidth?: number;
  customSheetHeight?: number;
  marginMm: number;        // Sheet margin
  gapMm: number;           // Gap between pieces in packed mode
  layoutMode: LayoutMode;
  
  // Backing board
  includeBacking: boolean;
  backingMarginMm: number;
  hangingHoles: boolean;
  magnetHoles: boolean;
  
  // Piece numbering
  pieceNumbering: boolean;
  numberingStyle: 'alphanumeric' | 'numeric';
  
  // Difficulty (affects piece shape variation)
  difficulty?: number;  // 0-100: 0 = regular grid, 100 = maximum chaos
  
  // PathOps Pro knob parameters
  knobSizePct?: number;      // 40-90: overall knob size percentage
  knobRoundness?: number;    // 0.6-1.0: bulb roundness
  knobJitter?: number;       // 0-0.35: randomness variation
}

// ============================================================================
// Enums & Presets
// ============================================================================

export type FitMode = 'tight' | 'normal' | 'loose';

export const FIT_MODE_CLEARANCE: Record<FitMode, number> = {
  tight: -0.05,
  normal: 0.00,
  loose: 0.05,
};

export type LayoutMode = 'assembled' | 'packed';

export type SheetPreset = 'glowforge-basic' | 'glowforge-pro' | 'xtool-d1' | '300x400' | '600x400' | 'custom';

export interface SheetDimensions {
  widthMm: number;
  heightMm: number;
  name: string;
}

export const SHEET_PRESETS: Record<SheetPreset, SheetDimensions> = {
  'glowforge-basic': { widthMm: 495, heightMm: 279, name: 'Glowforge Basic' },
  'glowforge-pro': { widthMm: 838, heightMm: 495, name: 'Glowforge Pro' },
  'xtool-d1': { widthMm: 400, heightMm: 400, name: 'xTool D1' },
  '300x400': { widthMm: 300, heightMm: 400, name: '300×400mm' },
  '600x400': { widthMm: 600, heightMm: 400, name: '600×400mm' },
  'custom': { widthMm: 500, heightMm: 500, name: 'Custom' },
};

// ============================================================================
// Output Types
// ============================================================================

export interface JigsawOutput {
  svg: string;              // Full SVG document
  cutLayerSvg: string;      // Cut layer only
  engraveLayerSvg?: string; // Engrave layer (numbering)
  pieces: PieceInfo[];
  warnings: string[];
  diagnostics: Diagnostics;
}

export interface PieceInfo {
  row: number;
  col: number;
  id: string;               // e.g., "A1", "B2"
  path: string;             // SVG path (after kerf/clearance)
  originalPath: string;     // SVG path (before offset)
  bbox: BBox;
  position: { x: number; y: number };  // After layout
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Diagnostics {
  pieceCount: number;
  pathCount: number;
  offsetDelta: number;
  edgeCount: {
    horizontal: number;
    vertical: number;
    total: number;
  };
  layoutFits: boolean;
  generationTimeMs: number;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_SETTINGS: JigsawSettings = {
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  knobStyle: 'classic',
  randomSeed: 12345,
  cornerRadiusMm: 0,
  kerfMm: 0.15,
  clearanceMm: 0.00,
  fitMode: 'normal',
  sheetPreset: 'glowforge-basic',
  marginMm: 10,
  gapMm: 5,
  layoutMode: 'assembled',
  includeBacking: false,
  backingMarginMm: 10,
  hangingHoles: false,
  magnetHoles: false,
  pieceNumbering: false,
  numberingStyle: 'alphanumeric',
};

export const LIMITS = {
  minWidthMm: 50,
  maxWidthMm: 1000,
  minHeightMm: 50,
  maxHeightMm: 1000,
  minRows: 2,
  maxRows: 20,
  minColumns: 2,
  maxColumns: 20,
  minPieceSizeMm: 15,
  maxKerfMm: 0.5,
  maxClearanceMm: 0.3,
};
