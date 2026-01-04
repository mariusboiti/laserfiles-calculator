/**
 * Keychain Generator V2+V3 Types
 */

export type KeychainShape = 'rounded-rectangle' | 'circle' | 'dog-tag' | 'capsule' | 'hexagon' | 'custom';

export type HolePosition = 'left' | 'top' | 'right' | 'none';

export type HoleType = 'circle' | 'slot' | 'double';

export type TextMode = 'single' | 'double';

export type RenderMode = 'cut-only' | 'engrave-only' | 'cut+engrave';

export type EngraveStyle = 'fill' | 'stroke' | 'fill+stroke';

export type TextAlign = 'center' | 'left' | 'right';

export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';

export interface HoleConfig {
  enabled: boolean;
  type: HoleType;
  position: HolePosition;
  diameter: number;
  slotWidth: number;
  slotHeight: number;
  spacing: number;       // for double holes
  margin: number;
}

export interface TextConfig {
  mode: TextMode;
  text: string;
  text2: string;
  lineGap: number;
  align: TextAlign;
  fontFamily: string;
  weight: FontWeight;
  autoFit: boolean;
  fontMin: number;
  fontMax: number;
}

export interface RenderConfig {
  mode: RenderMode;
  cutStroke: number;
  engraveStyle: EngraveStyle;
  engraveStroke: number;
}

export interface PreviewConfig {
  showSafeZones: boolean;
  showHatchPreview: boolean;
  showGrid: boolean;
}

export interface CustomShapeConfig {
  enabled: boolean;
  svgPath: string | null;
  originalBounds: { width: number; height: number } | null;
}

export interface BatchConfig {
  enabled: boolean;
  names: string[];
  sheetWidth: number;
  sheetHeight: number;
  spacing: number;
  margin: number;
}

export interface KeychainConfigV2 {
  // Shape
  shape: KeychainShape;
  width: number;
  height: number;
  cornerRadius: number;
  border: boolean;
  borderWidth: number;

  // Hole
  hole: HoleConfig;

  // Text
  text: TextConfig;
  padding: number;

  // Render
  render: RenderConfig;

  // Preview
  preview: PreviewConfig;

  // Custom shape (V3)
  customShape: CustomShapeConfig;

  // Batch (V3)
  batch: BatchConfig;
}

// Computed hole geometry
export interface HoleGeometry {
  shape: 'circle' | 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

// Text region after hole subtraction
export interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

// Warning types
export type WarningLevel = 'info' | 'warn' | 'error';

export interface Warning {
  id: string;
  level: WarningLevel;
  message: string;
  fix?: string;
  autoFixable?: boolean;
}

// Preset types
export interface KeychainPresetV2 {
  name: string;
  description?: string;
  values: Partial<KeychainConfigV2>;
  createdAt: number;
  isDefault?: boolean;
}

// Export types
export type ExportType = 'combined' | 'cut' | 'engrave';

export interface ExportResult {
  svg: string;
  filename: string;
  type: ExportType;
}
