/**
 * Round Coaster & Badge Generator V2 - Types
 */

export type ShapeType = 'circle' | 'hex' | 'octagon' | 'scalloped';

export type LayerType = 'CUT' | 'ENGRAVE' | 'SCORE';

export type PresetDiameter = 60 | 70 | 80 | 90 | 100 | 'custom';

export type StepSize = 0.5 | 1 | 2;

export type WarningLevel = 'info' | 'warning' | 'error';

export interface Warning {
  id: string;
  level: WarningLevel;
  message: string;
}

export interface BorderConfig {
  enabled: boolean;
  thickness: number;       // 0.2-1.2mm (stroke width)
  inset: number;           // distance from edge
  doubleBorder: boolean;
  doubleBorderGap: number; // 0.8-2.5mm
}

export interface TextConfig {
  top: string;
  center: string;
  bottom: string;
  uppercase: boolean;
  fontFamily: string;
}

export interface TextFitConfig {
  autoFit: boolean;
  manualFontSize: number;
  fontMin: number;
  fontMaxCenter: number;
  fontMaxSmall: number;
  letterSpacing: number;  // tracking
}

export interface DimensionConfig {
  diameter: number;
  width: number;
  height: number;
  lockAspect: boolean;
  aspectRatio: number;    // height/width for shield
}

export interface SafeAreaConfig {
  padding: number;        // mm from border
  showGuide: boolean;
}

export interface PreviewConfig {
  zoom: number;           // 0.5-2.5
  showSafeArea: boolean;
  showLayers: boolean;
  layerColors: boolean;   // color-code CUT/ENGRAVE
}

export interface ExportConfig {
  includeDimensions: boolean;
  includeTimestamp: boolean;
  includeMetadata: boolean;
  layerGrouping: boolean; // group by CUT/ENGRAVE
}

export interface CoasterStateV2 {
  shape: ShapeType;
  dimensions: DimensionConfig;
  border: BorderConfig;
  text: TextConfig;
  textFit: TextFitConfig;
  safeArea: SafeAreaConfig;
  preview: PreviewConfig;
  export: ExportConfig;
}

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  shape: ShapeType;
  diameter?: number;
  width?: number;
  height?: number;
  textCenter?: string;
  border?: Partial<BorderConfig>;
}

export interface TextFitResult {
  fontSize: number;
  lines: string[];
  overflow: boolean;
  scaled: boolean;
}

export interface LayerContent {
  id: LayerType;
  color: string;
  elements: string[];
}

export interface BuildResultV2 {
  svg: string;
  layers: LayerContent[];
  warnings: Warning[];
  meta: {
    width: number;
    height: number;
    shape: ShapeType;
  };
}

// Layer colors for LightBurn compatibility
export const LAYER_COLORS: Record<LayerType, string> = {
  CUT: '#FF0000',      // Red for cut
  SCORE: '#0000FF',    // Blue for score
  ENGRAVE: '#000000',  // Black for engrave
};

// Constraints
export const CONSTRAINTS = {
  diameter: { min: 30, max: 300 },
  width: { min: 30, max: 300 },
  height: { min: 40, max: 300 },
  borderThickness: { min: 0.2, max: 1.2, default: 0.4 },
  borderInset: { min: 1, max: 20, default: 3 },
  doubleBorderGap: { min: 0.8, max: 2.5, default: 1.2 },
  safeMargin: { min: 2, max: 15, default: 5 },
  fontSize: { min: 6, max: 40 },
  fontSizeCenter: { min: 10, max: 32 },
  fontSizeSmall: { min: 6, max: 16 },
  zoom: { min: 0.5, max: 2.5, default: 1 },
  letterSpacing: { min: -2, max: 5, default: 0 },
};
