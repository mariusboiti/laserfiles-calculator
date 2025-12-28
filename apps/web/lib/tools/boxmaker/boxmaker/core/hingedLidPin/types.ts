/**
 * Hinged Lid Pin Box - Types
 * Box with pin hinge mechanism (knuckles alternating between lid and back)
 */

export interface HingedLidPinInputs {
  // Dimensions (interior)
  innerWidthMm: number;
  innerDepthMm: number;
  innerHeightMm: number;

  // Material
  thicknessMm: number;
  kerfMm: number;

  // Finger joints
  fingerWidthMm: number;
  fingerPhase: 'centered'; // Auto-centered pattern

  // Hinge parameters
  hingeType: 'pin-knuckle';
  pinDiameterMm: number;
  knuckleLengthMm: number;
  knuckleGapMm: number;
  hingeInsetMm: number;
  hingeClearanceMm: number;

  // Layout
  marginMm: number;
  spacingMm: number;
  includeLabels: boolean;
}

export interface HingedLidPinDefaults {
  innerWidthMm: 100;
  innerDepthMm: 80;
  innerHeightMm: 60;
  thicknessMm: 3;
  kerfMm: 0.15;
  fingerWidthMm: 8;
  fingerPhase: 'centered';
  hingeType: 'pin-knuckle';
  pinDiameterMm: 5;
  knuckleLengthMm: 12;
  knuckleGapMm: 0.4;
  hingeInsetMm: 8;
  hingeClearanceMm: 0.2;
  marginMm: 5;
  spacingMm: 3;
  includeLabels: false;
}

export const HINGED_LID_PIN_DEFAULTS: HingedLidPinInputs = {
  innerWidthMm: 100,
  innerDepthMm: 80,
  innerHeightMm: 60,
  thicknessMm: 3,
  kerfMm: 0.15,
  fingerWidthMm: 8,
  fingerPhase: 'centered',
  hingeType: 'pin-knuckle',
  pinDiameterMm: 5,
  knuckleLengthMm: 12,
  knuckleGapMm: 0.4,
  hingeInsetMm: 8,
  hingeClearanceMm: 0.2,
  marginMm: 5,
  spacingMm: 3,
  includeLabels: false,
};

// 2D point type
export interface Pt {
  x: number;
  y: number;
}

// Circle hole
export interface CircleHole {
  cx: number;
  cy: number;
  r: number;
}

// Knuckle definition
export interface Knuckle {
  x: number;
  y: number;
  width: number;
  height: number;
  holeX: number;
  holeY: number;
  holeR: number;
}

// Panel role - explicit panel identification
export type PanelRole = 'bottom' | 'front' | 'back' | 'left' | 'right' | 'lid';

// Panels that have hinge features (knuckles + holes)
export const HINGE_PANELS: PanelRole[] = ['back', 'lid'];

// Panel with outline and holes
export interface Panel2D {
  name: string;
  role: PanelRole;
  outline: Pt[];
  holes: CircleHole[];
  width: number;
  height: number;
  hasHingeEdge: boolean;
  hingeEdgeLocation?: 'top' | 'bottom' | 'left' | 'right';
}

// All panels for the box
export interface HingedLidPinPanels {
  bottom: Panel2D;
  left: Panel2D;
  right: Panel2D;
  front: Panel2D;
  back: Panel2D;
  lid: Panel2D;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
