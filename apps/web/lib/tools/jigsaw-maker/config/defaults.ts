import type { PuzzleMode, KnobStyle, LayoutMode, FitMode } from '../types/jigsaw';

export const DEFAULTS = {
  mode: 'classic' as PuzzleMode,
  widthMm: 200,
  heightMm: 150,
  rows: 4,
  columns: 5,
  knobStyle: 'classic' as KnobStyle,
  cornerRadius: 2,
  kerfOffset: 0.15,
  randomSeed: 12345,
  
  // V2 Production defaults
  layoutMode: 'assembled' as LayoutMode,
  materialSheet: {
    widthMm: 495,
    heightMm: 279,
    marginMm: 5,
    gapMm: 1.5,
  },
  fitMode: 'normal' as FitMode,
  backingBoard: {
    enabled: false,
    marginMm: 5,
    hangingHoles: false,
    hangingHoleDiameter: 6,
    hangingHoleSpacing: 80,
    hangingHoleYOffset: 10,
    magnetHoles: false,
    magnetHoleDiameter: 8,
    magnetHoleInset: 8,
  },
  pieceNumbering: false,
  
  // PathOps Pro defaults
  usePathOps: false,
  marginMm: 5,
  knobSizePct: 65,
  knobRoundness: 0.85,
  knobJitter: 0.15,
  clearanceMm: 0,
  compensateKerf: false,
  exportMode: 'cut-lines' as 'cut-lines' | 'piece-outlines',
  showPieceIds: false,
};

export const KIDS_MODE_OVERRIDES = {
  maxRows: 4,
  maxColumns: 4,
  minPieceSizeMm: 40,
  cornerRadius: 4,
};

export const LIMITS = {
  minWidthMm: 50,
  maxWidthMm: 600,
  minHeightMm: 50,
  maxHeightMm: 600,
  minRows: 2,
  maxRows: 12,
  minColumns: 2,
  maxColumns: 12,
  minCornerRadius: 0,
  maxCornerRadius: 10,
  minKerfOffset: 0,
  maxKerfOffset: 0.5,
  minPieceSizeMm: 15, // Minimum piece dimension for safe cutting
};

export const STROKE_WIDTH_MM = 0.001; // Hairline stroke for laser cutting
