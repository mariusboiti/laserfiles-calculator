/**
 * Hinged Pin Box - Types
 * Clean rebuild with deterministic, laser-safe implementation
 * 
 * RULE: Only BACK and LID have hinge (knuckles + holes)
 * RULE: Hinge is on TOP edge (y=0) for both BACK and LID
 */

// Panel roles - explicit identification
export type PanelRole = 'bottom' | 'front' | 'back' | 'left' | 'right' | 'lid';

// Panels that have hinge features
export const HINGE_PANELS: readonly PanelRole[] = ['back', 'lid'] as const;

// 2D Point
export interface Pt {
  x: number;
  y: number;
}

// Circle (for pin holes)
export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

// Panel definition
export interface Panel {
  role: PanelRole;
  name: string;
  width: number;
  height: number;
  outline: Pt[];
  holes: Circle[];
  hasHingeEdge: boolean;
  hingeEdgeLocation: 'top' | null;
}

// All panels for the box
export interface HingedPinPanels {
  bottom: Panel;
  front: Panel;
  back: Panel;
  left: Panel;
  right: Panel;
  lid: Panel;
}

// Input parameters
export interface HingedPinInputs {
  // Interior dimensions
  innerWidthMm: number;
  innerDepthMm: number;
  innerHeightMm: number;
  
  // Material
  thicknessMm: number;
  kerfMm: number;
  
  // Finger joints
  fingerWidthMm: number;
  
  // Hinge parameters
  pinDiameterMm: number;
  knuckleLengthMm: number;
  knuckleGapMm: number;
  hingeInsetMm: number;
  clearanceMm: number;
  
  // Layout
  marginMm: number;
  spacingMm: number;
}

// Default values
export const HINGED_PIN_DEFAULTS: HingedPinInputs = {
  innerWidthMm: 100,
  innerDepthMm: 80,
  innerHeightMm: 60,
  thicknessMm: 3,
  kerfMm: 0.15,
  fingerWidthMm: 10,
  pinDiameterMm: 5,
  knuckleLengthMm: 12,
  knuckleGapMm: 0.5,
  hingeInsetMm: 8,
  clearanceMm: 0.2,
  marginMm: 5,
  spacingMm: 5,
};
