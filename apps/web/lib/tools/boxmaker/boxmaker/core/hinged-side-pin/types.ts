/**
 * Hinged Lid (Side Pin) Box - Types
 * 
 * RULE: Holes ONLY on LEFT and RIGHT panels (1 hole each)
 * RULE: LID has optional finger pull (semicircular cutout)
 * RULE: NO holes on BACK/FRONT/BOTTOM/LID
 * RULE: NO knuckles, NO alternating patterns
 */

// Panel roles
export type PanelRole = 'bottom' | 'front' | 'back' | 'left' | 'right' | 'lid';

// Edge modes for panel specs
export type EdgeMode = 'flat' | 'in' | 'out';

// Explicit panel spec mapping
export type PanelSpec = {
  role: PanelRole;
  width: number;
  height: number;
  edges: {
    top: EdgeMode;
    right: EdgeMode;
    bottom: EdgeMode;
    left: EdgeMode;
  };
};

// Panels that have pin holes
export const PIN_HOLE_PANELS: readonly PanelRole[] = ['left', 'right'] as const;

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
  hasPinHole: boolean;
  warnings?: string[];
}

// All panels for the box
export interface HingedSidePinPanels {
  bottom: Panel;
  front: Panel;
  back: Panel;
  left: Panel;
  right: Panel;
  lid: Panel;
}

// Input parameters
export interface HingedSidePinInputs {
  // Interior dimensions
  innerWidthMm: number;
  innerDepthMm: number;
  innerHeightMm: number;
  
  // Material
  thicknessMm: number;
  kerfMm: number;
  
  // Finger joints
  fingerWidthMm: number;
  
  // Side pin hinge
  pinDiameterMm: number;
  pinInsetFromTopMm: number;
  pinInsetFromBackMm: number;
  clearanceMm: number;
  
  // Lid finger pull
  lidFingerPull: boolean;
  fingerPullRadiusMm: number;
  fingerPullDepthMm: number;
  
  // Layout
  marginMm: number;
  spacingMm: number;
}

// Default values
export const HINGED_SIDE_PIN_DEFAULTS: HingedSidePinInputs = {
  innerWidthMm: 100,
  innerDepthMm: 80,
  innerHeightMm: 60,
  thicknessMm: 3,
  kerfMm: 0.15,
  fingerWidthMm: 10,
  pinDiameterMm: 5,
  pinInsetFromTopMm: 8,
  pinInsetFromBackMm: 8,
  clearanceMm: 0.2,
  lidFingerPull: true,
  fingerPullRadiusMm: 10,
  fingerPullDepthMm: 6,
  marginMm: 5,
  spacingMm: 5,
};
