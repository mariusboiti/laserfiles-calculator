/**
 * Personalised Sign Generator V3 Types
 * Includes all V1/V2 fields + new V3 features
 */

import type { OrnateLabelId } from '../core/shapes/ornateLabels';

// ============ Shape Types ============
export type SignShapeV3 = 
  | 'rectangle' 
  | 'rounded-rect' 
  | 'arch' 
  | 'circle' 
  | 'hex'
  | 'stadium'      // capsule/pill shape
  | 'shield'       // badge/shield shape
  | 'tag'          // label tag with pointed end
  | 'plaque'       // decorative plaque
  | 'rounded-arch' // arch with rounded bottom corners
  | 'oval'
  | OrnateLabelId;

// ============ Hole Types ============
export type HolePreset = 
  | 'none' 
  | 'top-center' 
  | 'two-top' 
  | 'four-corners' 
  | 'two-sides'
  | 'slots'       // keyhole slots
  | 'hanger-slot'
  | 'magnets-2'
  | 'magnets-4';

export interface HoleConfig {
  preset: HolePreset;
  diameter: number;
  margin: number;
  slotLength?: number;    // for keyhole slots
  slotWidth?: number;     // for keyhole slots
}

// ============ Text Types ============
export type TextTransform = 'none' | 'upper' | 'title' | 'lower';
export type CurvedMode = 'straight' | 'arcUp' | 'arcDown';
export type TextWeight = '400' | '500' | '600' | '700' | '800' | '900';

export interface TextLineV3 {
  text: string;
  fontFamily: string;
  weight: TextWeight;
  fontSize: number;
  letterSpacing: number;
  transform: TextTransform;
  offsetX?: number;  // manual X offset from center
  offsetY?: number;  // manual Y offset from calculated position
}

export interface TextConfig {
  line1: TextLineV3;
  line2: TextLineV3;
  line3: TextLineV3;
  lineHeight: number;
  curvedModeLine2: CurvedMode;
  curvedIntensity: number;  // 0-100
}

// ============ Icon Types ============
export type IconPlacement = 'left-of-line2' | 'above-line2' | 'between-lines' | 'right-of-line2';

export interface IconConfig {
  id: string | null;
  placement: IconPlacement;
  size: number;  // mm
}

// ============ Monogram Types ============
export interface MonogramConfig {
  enabled: boolean;
  text: string;  // typically 1-3 chars
  size: number;
  placement: 'top' | 'center' | 'bottom';
}

// ============ Logo Types ============
export interface LogoPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  lockAspect: boolean;
}

export interface LogoConfig {
  svg: string | null;
  placement: LogoPlacement;
  simplify: boolean;  // convert fills to strokes
}

// ============ Output Types ============
export type OutputMode = 'both' | 'cut' | 'engrave';

export interface OutputConfig {
  mode: OutputMode;
  cutStrokeWidth: number;
  engraveStrokeWidth: number;
  units: 'mm';
}

// ============ Sheet Types ============
export interface SheetConfig {
  enabled: boolean;
  width: number;
  height: number;
  margin: number;
  spacing: number;
  countX: number;
  countY: number;
  autoFill: boolean;
}

// ============ Template Types ============
export interface SignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'family' | 'workshop' | 'welcome' | 'address' | 'pet' | 'wedding' | 'custom';
  thumbnail?: string;
  config: Partial<SignConfigV3>;
}

// ============ Main Config ============
export interface SignConfigV3 {
  // Shape
  shape: SignShapeV3;
  width: number;
  height: number;
  cornerRadius: number;
  archRadius?: number;
  borderEnabled: boolean;
  borderWidth: number;

  // Holes
  holes: HoleConfig;

  // Text
  text: TextConfig;
  padding: number;

  // Decorations
  icon: IconConfig;
  monogram: MonogramConfig;
  logo: LogoConfig;

  // Output
  output: OutputConfig;

  // Sheet
  sheet: SheetConfig;

  // Template
  templateId: string;
}

// ============ Layout Types ============
export interface SafeZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TextLayoutResult {
  line1?: { x: number; y: number; fontSize: number; width: number };
  line2?: { x: number; y: number; fontSize: number; width: number; curvedPath?: string };
  line3?: { x: number; y: number; fontSize: number; width: number };
}

export interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  pathD: string;
}

export interface HoleGeometry {
  type: 'circle' | 'slot';
  cx: number;
  cy: number;
  r?: number;
  slotPath?: string;
}

// ============ Render Types ============
export interface RenderOptions {
  showGuides: boolean;
  showSafeZones: boolean;
  showTextBoxes: boolean;
  showHolesGuides: boolean;
  showGrid: boolean;
}

export interface SignRenderResult {
  svg: string;
  warnings: string[];
  dimensions: { width: number; height: number };
}

// ============ AI Types ============
export interface AISignRequest {
  prompt: string;
  generateVariations: boolean;
}

export interface AISignResult {
  config: Partial<SignConfigV3>;
  confidence: number;
  explanation: string;
}
