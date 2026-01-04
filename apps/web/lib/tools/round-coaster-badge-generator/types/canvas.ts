/**
 * Round Coaster Canvas Types
 * World-mm coordinate system with layers and elements
 */

// ============ Layer Types ============
export type LayerType = 'CUT' | 'ENGRAVE' | 'GUIDE';

export const LAYER_COLORS: Record<LayerType, string> = {
  CUT: '#FF0000',
  ENGRAVE: '#000000',
  GUIDE: '#00FF00',
};

// ============ Transform ============
export interface ElementTransform {
  xMm: number;
  yMm: number;
  rotateDeg: number;
  scaleX: number;
  scaleY: number;
}

// ============ Element Types ============
export interface BaseElement {
  id: string;
  layer: LayerType;
  transform: ElementTransform;
  name?: string;
  system?: boolean;
  locked?: boolean;
  visible?: boolean;
}

export interface ShapeElement extends BaseElement {
  kind: 'shape';
  shapeType: 'circle' | 'hex' | 'octagon' | 'scalloped' | 'shield';
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
}

export interface BorderElement extends BaseElement {
  kind: 'border';
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
  isDoubleBorder?: boolean;
}

export interface TextElement extends BaseElement {
  kind: 'text';
  content: string;
  fontId: string;
  fontUrl?: string;
  fontFamily: string;
  fontSizeMm: number;
  fontWeight: number;
  textAnchor: 'start' | 'middle' | 'end';
  letterSpacing: number;
  _bounds?: { width: number; height: number };
}

export interface OrnamentElement extends BaseElement {
  kind: 'ornament';
  assetId: string;
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
}

export type BasicShapeKind = 'circle' | 'roundedRect' | 'badge';

export interface BasicShapeElement extends BaseElement {
  kind: 'basicShape';
  shapeKind: BasicShapeKind;
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
}

export interface TracedElement extends BaseElement {
  kind: 'traced';
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
  aiPrompt?: string;
}

export type LogoOp = 'ENGRAVE' | 'CUT_OUT';

export interface LogoElement extends BaseElement {
  kind: 'logo';
  source: 'trace';
  paths: string[];
  bboxMm: BoundingBox;
  op: LogoOp;
  // Cached combined path for rendering/export convenience
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
}

export interface IconElement extends BaseElement {
  kind: 'icon';
  source: 'ai';
  paths: string[];
  bboxMm: BoundingBox;
  pathD: string;
  widthMm: number;
  heightMm: number;
  strokeWidthMm: number;
  aiPrompt?: string;
}

export type CanvasElement = 
  | ShapeElement 
  | BorderElement 
  | TextElement 
  | OrnamentElement 
  | BasicShapeElement
  | TracedElement
  | LogoElement
  | IconElement;

// ============ Canvas Document ============
export interface CanvasDocument {
  artboard: {
    widthMm: number;
    heightMm: number;
    shapeType: 'circle' | 'hex' | 'octagon' | 'scalloped' | 'shield';
    basePathD: string;
  };
  elements: CanvasElement[];
}

// ============ View Transform ============
export interface ViewTransform {
  panX: number;
  panY: number;
  zoom: number;
}

// ============ Bounding Box ============
export interface BoundingBox {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

// ============ Selection State ============
export interface SelectionState {
  selectedIds: string[];
  activeId: string | null;
  mode: 'idle' | 'selecting' | 'moving' | 'resizing' | 'rotating';
}

// ============ Canvas State ============
export interface CanvasState {
  doc: CanvasDocument;
  selection: SelectionState;
  view: ViewTransform;
}

// ============ History ============
export interface HistoryEntry {
  doc: CanvasDocument;
  selection: SelectionState;
  timestamp: number;
}

export interface HistoryState {
  past: HistoryEntry[];
  present: HistoryEntry;
  future: HistoryEntry[];
}

// ============ Helpers ============
export function generateId(): string {
  return `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultTransform(xMm: number = 0, yMm: number = 0): ElementTransform {
  return {
    xMm,
    yMm,
    rotateDeg: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

export const DEFAULT_VIEW: ViewTransform = {
  panX: 0,
  panY: 0,
  zoom: 1,
};

export const DEFAULT_SELECTION: SelectionState = {
  selectedIds: [],
  activeId: null,
  mode: 'idle',
};

// Pixels per mm for canvas rendering
export const PX_PER_MM = 3;
