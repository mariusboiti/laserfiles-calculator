export type UnitMode = 'auto' | 'px96' | 'px72';

export type UnitSystem = 'mm' | 'in';

export type ExportMode = 'laser-safe' | 'fast-clip';

export type NumberingFormat = 'R01C01' | '01-01' | 'Tile_001' | 'panel_{row}{col}';

export type RegistrationMarkType = 'crosshair' | 'pinhole' | 'lmark';

export type MarkPlacement = 'inside' | 'overlap';

export interface SVGInfo {
  fileName: string;
  originalContent: string;
  viewBox: { x: number; y: number; width: number; height: number } | null;
  width: number | null;
  height: number | null;
  widthUnit: string;
  heightUnit: string;
  detectedWidthMm: number;
  detectedHeightMm: number;
}

export interface RegistrationMarkSettings {
  enabled: boolean;
  type: RegistrationMarkType;
  placement: MarkPlacement;
  size: number;
  strokeWidth: number;
  holeDiameter: number;
}

export interface AssemblyMapSettings {
  enabled: boolean;
  includeLabels: boolean;
  includeThumbnails: boolean;
}

export interface Settings {
  bedWidth: number;
  bedHeight: number;
  margin: number;
  overlap: number;
  tileOffsetX: number;
  tileOffsetY: number;
  unitSystem: UnitSystem;
  exportMode: ExportMode;
  numberingEnabled: boolean;
  numberingFormat: NumberingFormat;
  startIndexAtOne: boolean;
  guidesEnabled: boolean;
  boundaryRectEnabled: boolean;
  expandStrokes: boolean;
  simplifyTolerance: number;
  exportEmptyTiles: boolean;
  unitMode: UnitMode;
  registrationMarks: RegistrationMarkSettings;
  assemblyMap: AssemblyMapSettings;
}

export interface TileInfo {
  row: number;
  col: number;
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isEmpty: boolean;
  hasUnsafeFallback: boolean;
  svgContent?: string;
}

export interface GridInfo {
  rows: number;
  cols: number;
  tileWidth: number;
  tileHeight: number;
  effectiveTileWidth: number;
  effectiveTileHeight: number;
  tiles: TileInfo[];
}

export interface ProcessingState {
  isProcessing: boolean;
  currentTile: number;
  totalTiles: number;
  phase: 'idle' | 'preparing' | 'tiling' | 'exporting' | 'done' | 'cancelled';
  error: string | null;
}

export interface ValidationError {
  field: string;
  message: string;
}
