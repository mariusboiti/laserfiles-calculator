export type PuzzleMode = 'classic' | 'photo' | 'kids';

export type KnobStyle = 'classic' | 'organic' | 'simple';

export type LayoutMode = 'assembled' | 'packed';

export type FitMode = 'tight' | 'normal' | 'loose';

export interface MaterialSheet {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  gapMm: number;
}

export interface BackingBoard {
  enabled: boolean;
  marginMm: number;
  hangingHoles: boolean;
  hangingHoleDiameter: number;
  hangingHoleSpacing: number;
  hangingHoleYOffset: number;
  magnetHoles: boolean;
  magnetHoleDiameter: number;
  magnetHoleInset: number;
}

export interface JigsawInputs {
  mode: PuzzleMode;
  widthMm: number;
  heightMm: number;
  rows: number;
  columns: number;
  knobStyle: KnobStyle;
  cornerRadius: number;
  kerfOffset: number;
  randomSeed: number;
  imageDataUrl?: string;
  
  // V2 Production features
  layoutMode: LayoutMode;
  materialSheet: MaterialSheet;
  fitMode: FitMode;
  backingBoard: BackingBoard;
  pieceNumbering: boolean;
  
  // PathOps Pro features
  usePathOps?: boolean;
  marginMm?: number; // 0-20mm outer frame
  knobSizePct?: number; // 40-90% of edge length
  knobRoundness?: number; // 0.6-1.0
  knobJitter?: number; // 0-0.35
  clearanceMm?: number; // -0.2..+0.2mm for loose/tight fit
  compensateKerf?: boolean;
  exportMode?: 'cut-lines' | 'piece-outlines';
  showPieceIds?: boolean; // preview only
}

export interface PuzzlePiece {
  row: number;
  col: number;
  path: string;
}

export interface EdgeDirection {
  horizontal: boolean;
  row: number;
  col: number;
}

export interface Edge {
  direction: EdgeDirection;
  hasKnob: boolean;
  knobOutward: boolean; // true = knob points outward, false = inward (socket)
  path: string;
}

export interface PuzzleResult {
  pieces: PuzzlePiece[];
  cutLayerSvg: string;
  engraveLayerSvg?: string;
  fullSvg: string;
  warnings: string[];
}

export interface JigsawPreset {
  name: string;
  rows: number;
  columns: number;
  description: string;
}

export const JIGSAW_PRESETS: JigsawPreset[] = [
  { name: '2×2 (4 pieces)', rows: 2, columns: 2, description: 'Simple puzzle for testing' },
  { name: '3×3 (9 pieces)', rows: 3, columns: 3, description: 'Small puzzle' },
  { name: '4×4 (16 pieces)', rows: 4, columns: 4, description: 'Medium puzzle' },
  { name: '5×4 (20 pieces)', rows: 4, columns: 5, description: 'Standard puzzle' },
  { name: '6×5 (30 pieces)', rows: 5, columns: 6, description: 'Large puzzle' },
  { name: '8×6 (48 pieces)', rows: 6, columns: 8, description: 'Challenge puzzle' },
];

export interface MaterialSheetPreset {
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const MATERIAL_SHEET_PRESETS: MaterialSheetPreset[] = [
  { name: 'Glowforge', widthMm: 495, heightMm: 279, description: 'Glowforge Basic/Plus bed' },
  { name: 'xTool', widthMm: 430, heightMm: 390, description: 'xTool common size' },
  { name: '300×400', widthMm: 300, heightMm: 400, description: 'Common laser bed' },
  { name: '600×400', widthMm: 600, heightMm: 400, description: 'Large laser bed' },
  { name: 'Custom', widthMm: 400, heightMm: 300, description: 'Custom dimensions' },
];

export const FIT_MODE_OFFSETS: Record<FitMode, number> = {
  tight: -0.05,    // Slightly smaller pieces for tight fit
  normal: 0,       // No offset
  loose: 0.05,     // Slightly larger pieces for loose fit
};

export const MODE_DESCRIPTIONS: Record<PuzzleMode, string> = {
  classic: 'Traditional jigsaw with standard knobs',
  photo: 'Photo puzzle with image engraving',
  kids: 'Large pieces with simple knobs for children',
};

export const KNOB_STYLE_DESCRIPTIONS: Record<KnobStyle, string> = {
  classic: 'Traditional round knobs with smooth curves',
  organic: 'Irregular, natural-looking knobs',
  simple: 'Basic geometric knobs for easier cutting',
};
