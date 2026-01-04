/**
 * Personalised Sign Generator V3 PRO Types
 * Layer-based document model with text-to-path and AI integration
 */

import type { FontId } from '../../../fonts/sharedFontRegistry';
import type { OrnateLabelId } from '../core/shapes/ornateLabels';
import type { OrnamentId } from '../../../assets/ornaments';

// ============ Layer Types ============
export type LayerType = 'BASE' | 'CUT' | 'ENGRAVE' | 'OUTLINE' | 'GUIDE';

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;        // Preview visibility
  locked: boolean;
  opacity: number;         // 0-1, preview only
  exportEnabled: boolean;
  elements: Element[];
  order: number;           // For reordering
}

// ============ Element Types ============
export type ElementKind = 'text' | 'shape' | 'engraveSketch' | 'engraveImage' | 'ornament' | 'tracedPath' | 'tracedPathGroup';
export type TextMode = 'ENGRAVE_FILLED' | 'CUT_OUTLINE' | 'BOTH';
export type ShapeStyle = 'CUT' | 'ENGRAVE';
export type TextAlign = 'left' | 'center' | 'right';
export type TextTransformCase = 'none' | 'upper' | 'lower' | 'title';
export type CurvedTextMode = 'straight' | 'arcUp' | 'arcDown';

export type CurvedTextPlacement = 'top' | 'bottom';
export type CurvedTextDirection = 'outside' | 'inside';

export interface CurvedTextConfig {
  enabled: boolean;
  radiusMm: number;
  arcDeg: number;
  placement: CurvedTextPlacement;
  direction: CurvedTextDirection;
}

export interface ElementTransform {
  xMm: number;
  yMm: number;
  rotateDeg: number;
  scaleX: number;
  scaleY: number;
}

export interface TextOutlineConfig {
  enabled: boolean;
  offsetMm: number;
  targetLayerType: 'CUT' | 'OUTLINE';
  join?: 'round' | 'miter' | 'bevel';
  simplify?: boolean;
}

export interface TextElement {
  id: string;
  kind: 'text';
  lineIndex: 1 | 2 | 3 | 'custom';
  text: string;
  fontId: FontId;
  weight: '400' | '500' | '600' | '700' | '800' | '900';
  sizeMm: number;
  autoFit: boolean;
  mode: TextMode;
  outline: TextOutlineConfig;
  transform: ElementTransform;
  align: TextAlign;
  letterSpacingMm: number;
  lineHeightRatio: number;
  transformCase: TextTransformCase;
  curvedMode?: CurvedTextMode;
  curvedIntensity?: number;
  curved?: CurvedTextConfig;
  // Computed (cached)
  _pathD?: string;
  _bounds?: { width: number; height: number };
  _fontUsedId?: FontId;
  _fontUsedFallback?: boolean;
}

export interface ShapeElement {
  id: string;
  kind: 'shape';
  source: 'builtin' | 'ai';
  svgPathD: string;
  style: ShapeStyle;
  transform: ElementTransform;
  // For AI-generated shapes
  aiPrompt?: string;
}

export interface EngraveSketchElement {
  id: string;
  kind: 'engraveSketch';
  svgPathD: string[];      // Multiple stroke paths
  strokeMm: number;
  transform: ElementTransform;
  // For AI-generated sketches
  aiPrompt?: string;
}

export interface EngraveImageElement {
  id: string;
  kind: 'engraveImage';
  pngDataUrl: string;
  widthMm: number;
  heightMm: number;
  transform: ElementTransform;
  aiPrompt?: string;
}

export interface TracedPathElement {
  id: string;
  kind: 'tracedPath';
  svgPathD: string; // Combined path string
  strokeMm: number;
  transform: ElementTransform;
  // Cached local-space bounds (before transform). Used for selection/hit testing.
  _localBounds?: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  // Optional metadata
  _traceStats?: { pathsIn: number; pathsOut: number; commands: number; dLength: number; ms: number };
}

export interface TracedPathGroupElement {
  id: string;
  kind: 'tracedPathGroup';
  svgPathDs: string[];
  strokeMm: number;
  transform: ElementTransform;
  _localBounds?: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  _traceStats?: { pathsIn: number; pathsOut: number; commands: number; dLength: number; ms: number };
  aiPrompt?: string;
}

export interface OrnamentElement {
  id: string;
  kind: 'ornament';
  assetId: OrnamentId;
  transform: ElementTransform;
  style: {
    targetLayer: 'CUT' | 'ENGRAVE' | 'GUIDE';
    strokeMm?: number;
  };
}

export type Element = TextElement | ShapeElement | EngraveSketchElement | EngraveImageElement | OrnamentElement | TracedPathElement | TracedPathGroupElement;

// ============ Base Shape Types ============
export type BaseShapeType = 
  | 'rectangle' 
  | 'rounded-rect' 
  | 'arch' 
  | 'rounded-arch'
  | 'circle' 
  | 'oval' 
  | 'hex' 
  | 'stadium' 
  | 'shield' 
  | 'tag' 
  | 'plaque'
  | OrnateLabelId;

export interface BaseShape {
  shapeType: BaseShapeType;
  cornerRadius: number;
  pathD: string;
  bounds: { x: number; y: number; width: number; height: number };
}

// ============ Artboard ============
export interface Artboard {
  wMm: number;
  hMm: number;
  baseShape: BaseShape;
}

// ============ Document ============
export interface SignDocument {
  id: string;
  name: string;
  artboard: Artboard;
  layers: Layer[];
  activeLayerId: string;
  selection: string[];     // Selected element IDs
  
  // Output settings
  output: OutputConfig;
  
  // Holes config (from V3)
  holes: HoleConfig;
}

export interface OutputConfig {
  cutStrokeMm: number;
  engraveStrokeMm: number;
  outlineStrokeMm: number;
  units: 'mm';
}

export type HoleMode = 'none' | 'one' | 'two' | 'four' | 'custom';

export interface MountingHole {
  id: string;
  xMm: number;
  yMm: number;
}

export interface HoleConfig {
  enabled: boolean;
  diameterMm: number;
  mode: HoleMode;
  marginMm: number;        // 0..150
  spacingXmm: number;      // for 'two' mode
  offsetXmm: number;       // horizontal offset from center
  offsetYmm: number;       // vertical offset from center
  insetXmm: number;        // for 'four' mode
  insetYmm: number;        // for 'four' mode
  holes: MountingHole[];   // derived for one/two/four, manual for custom
}

// ============ AI Generation ============
export type AiGenerationMode = 'engravingSketch' | 'shapeSilhouette';
export type AiDetailLevel = 'low' | 'medium' | 'high';
export type AiComplexity = 'simple' | 'medium' | 'detailed';

export interface AiGenerateRequest {
  mode: AiGenerationMode;
  prompt: string;
  targetWmm: number;
  targetHmm: number;
  detailLevel?: AiDetailLevel;
  complexity?: AiComplexity;
}

export interface AiGenerateResponse {
  svg?: string;
  pngDataUrl?: string;
  pathD?: string;
  bounds?: { width: number; height: number };
  warning?: string;
}

// ============ Render Options ============
export interface RenderPreviewOptions {
  showGuides: boolean;
  showSafeZones: boolean;
  showGrid: boolean;
  showBoundingBoxes: boolean;
  selectedIds: string[];
}

export interface RenderExportOptions {
  includeAllLayers: boolean;
  separateLayers: boolean;  // Export each layer as separate file
}

export interface RenderResult {
  svg: string;
  warnings: string[];
  dimensions: { width: number; height: number };
}

// ============ Presets ============
export interface SignPreset {
  id: string;
  name: string;
  description: string;
  category: 'family' | 'workshop' | 'welcome' | 'decorative' | 'ai';
  document: Partial<SignDocument>;
}

// ============ Helpers ============
export function createDefaultTransform(): ElementTransform {
  return {
    xMm: 0,
    yMm: 0,
    rotateDeg: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

export function createDefaultTextOutline(): TextOutlineConfig {
  return {
    enabled: false,
    offsetMm: 2,
    targetLayerType: 'OUTLINE',
    join: 'round',
    simplify: true,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
