/**
 * Hinged Lid Pin Box - Panel Generation
 * Generates all 6 panels with finger joints and pin hinge
 * 
 * OUTPUT: 100% orthogonal SVG (M/L/Z only), circles for holes
 */

import type { HingedLidPinInputs, Panel2D, HingedLidPinPanels, Pt, CircleHole, PanelRole } from './types';
import { HINGE_PANELS } from './types';
import {
  pt,
  add,
  mul,
  buildFingerEdge,
  buildHingeEdge,
  calculateFingerCount,
  calculateActualFingerWidth,
} from './geometry';

/**
 * Calculate outer dimensions from inner dimensions
 */
function calculateOuterDimensions(input: HingedLidPinInputs) {
  const { innerWidthMm, innerDepthMm, innerHeightMm, thicknessMm } = input;
  
  return {
    outerWidth: innerWidthMm + 2 * thicknessMm,
    outerDepth: innerDepthMm + 2 * thicknessMm,
    outerHeight: innerHeightMm + thicknessMm, // Lid sits on top
  };
}

/**
 * Generate Bottom panel
 * Has female finger joints on all 4 edges to receive side panels
 */
function generateBottomPanel(input: HingedLidPinInputs): Panel2D {
  const { thicknessMm, fingerWidthMm, kerfMm } = input;
  const { outerWidth, outerDepth } = calculateOuterDimensions(input);
  
  const W = outerWidth;
  const D = outerDepth;
  const T = thicknessMm;
  
  const points: Pt[] = [];
  
  // Start at top-left corner (0, 0)
  // Go clockwise: top -> right -> bottom -> left
  
  // Top edge (female slots - receives front panel)
  const topEdge = buildFingerEdge(
    pt(0, 0),
    pt(1, 0),
    pt(0, -1), // Normal points up (slots cut inward)
    W,
    T,
    fingerWidthMm,
    false, // Female
    kerfMm
  );
  points.push(...topEdge);
  
  // Right edge (female slots - receives right panel)
  const rightEdge = buildFingerEdge(
    pt(W, 0),
    pt(0, 1),
    pt(1, 0), // Normal points right (slots cut inward from right)
    D,
    T,
    fingerWidthMm,
    false,
    kerfMm
  );
  points.push(...rightEdge.slice(1)); // Skip first point (duplicate)
  
  // Bottom edge (female slots - receives back panel)
  const bottomEdge = buildFingerEdge(
    pt(W, D),
    pt(-1, 0),
    pt(0, 1), // Normal points down
    W,
    T,
    fingerWidthMm,
    false,
    kerfMm
  );
  points.push(...bottomEdge.slice(1));
  
  // Left edge (female slots - receives left panel)
  const leftEdge = buildFingerEdge(
    pt(0, D),
    pt(0, -1),
    pt(-1, 0), // Normal points left
    D,
    T,
    fingerWidthMm,
    false,
    kerfMm
  );
  points.push(...leftEdge.slice(1));
  
  return {
    name: 'BOTTOM',
    role: 'bottom' as PanelRole,
    outline: points,
    holes: [], // NO hinge holes on bottom
    width: W,
    height: D,
    hasHingeEdge: false,
  };
}

/**
 * Generate Front panel
 * Male fingers on bottom (into bottom panel)
 * Male fingers on sides (into side panels)
 */
function generateFrontPanel(input: HingedLidPinInputs): Panel2D {
  const { thicknessMm, fingerWidthMm, kerfMm, innerHeightMm } = input;
  const { outerWidth } = calculateOuterDimensions(input);
  
  const W = outerWidth;
  const H = innerHeightMm;
  const T = thicknessMm;
  
  const points: Pt[] = [];
  
  // Start at top-left, go clockwise
  // Top edge: straight (no lid connection on front)
  points.push(pt(0, 0));
  points.push(pt(W, 0));
  
  // Right edge: male fingers (into right side panel)
  const rightEdge = buildFingerEdge(
    pt(W, 0),
    pt(0, 1),
    pt(1, 0),
    H,
    T,
    fingerWidthMm,
    true, // Male
    kerfMm
  );
  points.push(...rightEdge.slice(1));
  
  // Bottom edge: male fingers (into bottom panel)
  const bottomEdge = buildFingerEdge(
    pt(W, H),
    pt(-1, 0),
    pt(0, 1),
    W,
    T,
    fingerWidthMm,
    true,
    kerfMm
  );
  points.push(...bottomEdge.slice(1));
  
  // Left edge: male fingers (into left side panel)
  const leftEdge = buildFingerEdge(
    pt(0, H),
    pt(0, -1),
    pt(-1, 0),
    H,
    T,
    fingerWidthMm,
    true,
    kerfMm
  );
  points.push(...leftEdge.slice(1));
  
  return {
    name: 'FRONT',
    role: 'front' as PanelRole,
    outline: points,
    holes: [], // NO hinge holes on front
    width: W,
    height: H,
    hasHingeEdge: false,
  };
}

/**
 * Generate Back panel
 * Male fingers on bottom and sides
 * Hinge knuckles on top (even positions)
 */
function generateBackPanel(input: HingedLidPinInputs): Panel2D {
  const { thicknessMm, fingerWidthMm, kerfMm, innerHeightMm } = input;
  const { outerWidth } = calculateOuterDimensions(input);
  
  const W = outerWidth;
  const H = innerHeightMm;
  const T = thicknessMm;
  
  const points: Pt[] = [];
  const holes: CircleHole[] = [];
  
  // Start at top-left, go clockwise
  // Top edge: hinge with knuckles (back gets even-indexed knuckles)
  const hingeResult = buildHingeEdge(
    pt(0, 0),
    pt(1, 0),
    pt(0, -1), // Knuckles protrude upward
    W,
    input,
    true // isBack = true
  );
  points.push(...hingeResult.points);
  holes.push(...hingeResult.holes);
  
  // Right edge: male fingers
  const rightEdge = buildFingerEdge(
    pt(W, 0),
    pt(0, 1),
    pt(1, 0),
    H,
    T,
    fingerWidthMm,
    true,
    kerfMm
  );
  points.push(...rightEdge.slice(1));
  
  // Bottom edge: male fingers
  const bottomEdge = buildFingerEdge(
    pt(W, H),
    pt(-1, 0),
    pt(0, 1),
    W,
    T,
    fingerWidthMm,
    true,
    kerfMm
  );
  points.push(...bottomEdge.slice(1));
  
  // Left edge: male fingers
  const leftEdge = buildFingerEdge(
    pt(0, H),
    pt(0, -1),
    pt(-1, 0),
    H,
    T,
    fingerWidthMm,
    true,
    kerfMm
  );
  points.push(...leftEdge.slice(1));
  
  return {
    name: 'BACK',
    role: 'back' as PanelRole,
    outline: points,
    holes, // Hinge holes on back panel (even knuckles)
    width: W,
    height: H,
    hasHingeEdge: true,
    hingeEdgeLocation: 'top',
  };
}

/**
 * Generate Left side panel
 * Female fingers on front/back edges (receives front/back panels)
 * Male fingers on bottom (into bottom panel)
 */
function generateLeftPanel(input: HingedLidPinInputs): Panel2D {
  const { thicknessMm, fingerWidthMm, kerfMm, innerHeightMm } = input;
  const { outerDepth } = calculateOuterDimensions(input);
  
  const D = outerDepth;
  const H = innerHeightMm;
  const T = thicknessMm;
  
  const points: Pt[] = [];
  
  // Top edge: straight
  points.push(pt(0, 0));
  points.push(pt(D, 0));
  
  // Right edge (back side): female slots
  const rightEdge = buildFingerEdge(
    pt(D, 0),
    pt(0, 1),
    pt(1, 0),
    H,
    T,
    fingerWidthMm,
    false, // Female
    kerfMm
  );
  points.push(...rightEdge.slice(1));
  
  // Bottom edge: male fingers
  const bottomEdge = buildFingerEdge(
    pt(D, H),
    pt(-1, 0),
    pt(0, 1),
    D,
    T,
    fingerWidthMm,
    true, // Male
    kerfMm
  );
  points.push(...bottomEdge.slice(1));
  
  // Left edge (front side): female slots
  const leftEdge = buildFingerEdge(
    pt(0, H),
    pt(0, -1),
    pt(-1, 0),
    H,
    T,
    fingerWidthMm,
    false, // Female
    kerfMm
  );
  points.push(...leftEdge.slice(1));
  
  return {
    name: 'LEFT',
    role: 'left' as PanelRole,
    outline: points,
    holes: [], // NO hinge holes on left
    width: D,
    height: H,
    hasHingeEdge: false,
  };
}

/**
 * Generate Right side panel (mirror of left)
 */
function generateRightPanel(input: HingedLidPinInputs): Panel2D {
  const { thicknessMm, fingerWidthMm, kerfMm, innerHeightMm } = input;
  const { outerDepth } = calculateOuterDimensions(input);
  
  const D = outerDepth;
  const H = innerHeightMm;
  const T = thicknessMm;
  
  const points: Pt[] = [];
  
  // Top edge: straight
  points.push(pt(0, 0));
  points.push(pt(D, 0));
  
  // Right edge (front side): female slots
  const rightEdge = buildFingerEdge(
    pt(D, 0),
    pt(0, 1),
    pt(1, 0),
    H,
    T,
    fingerWidthMm,
    false,
    kerfMm
  );
  points.push(...rightEdge.slice(1));
  
  // Bottom edge: male fingers
  const bottomEdge = buildFingerEdge(
    pt(D, H),
    pt(-1, 0),
    pt(0, 1),
    D,
    T,
    fingerWidthMm,
    true,
    kerfMm
  );
  points.push(...bottomEdge.slice(1));
  
  // Left edge (back side): female slots
  const leftEdge = buildFingerEdge(
    pt(0, H),
    pt(0, -1),
    pt(-1, 0),
    H,
    T,
    fingerWidthMm,
    false,
    kerfMm
  );
  points.push(...leftEdge.slice(1));
  
  return {
    name: 'RIGHT',
    role: 'right' as PanelRole,
    outline: points,
    holes: [], // NO hinge holes on right
    width: D,
    height: H,
    hasHingeEdge: false,
  };
}

/**
 * Generate Lid panel
 * Hinge knuckles on back edge (odd positions - complement to back panel)
 * Straight edges on other sides (sits on top of walls)
 */
function generateLidPanel(input: HingedLidPinInputs): Panel2D {
  const { outerWidth, outerDepth } = calculateOuterDimensions(input);
  
  const W = outerWidth;
  const D = outerDepth;
  
  const points: Pt[] = [];
  const holes: CircleHole[] = [];
  
  // Start at top-left, go clockwise
  // Top edge: straight (front of lid)
  points.push(pt(0, 0));
  points.push(pt(W, 0));
  
  // Right edge: straight
  points.push(pt(W, D));
  
  // Bottom edge: hinge with knuckles (lid gets odd-indexed knuckles)
  const hingeResult = buildHingeEdge(
    pt(W, D),
    pt(-1, 0),
    pt(0, 1), // Knuckles protrude downward (toward back)
    W,
    input,
    false // isBack = false (lid)
  );
  points.push(...hingeResult.points.slice(1));
  holes.push(...hingeResult.holes);
  
  // Left edge: straight
  points.push(pt(0, 0));
  
  return {
    name: 'LID',
    role: 'lid' as PanelRole,
    outline: points,
    holes, // Hinge holes on lid panel (odd knuckles)
    width: W,
    height: D,
    hasHingeEdge: true,
    hingeEdgeLocation: 'bottom',
  };
}

/**
 * Generate all panels for the hinged lid pin box
 */
export function generateHingedLidPinPanels(input: HingedLidPinInputs): HingedLidPinPanels {
  return {
    bottom: generateBottomPanel(input),
    left: generateLeftPanel(input),
    right: generateRightPanel(input),
    front: generateFrontPanel(input),
    back: generateBackPanel(input),
    lid: generateLidPanel(input),
  };
}

/**
 * Validate inputs
 */
export function validateInputs(input: HingedLidPinInputs): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (input.innerWidthMm <= 0) errors.push('Inner width must be positive');
  if (input.innerDepthMm <= 0) errors.push('Inner depth must be positive');
  if (input.innerHeightMm <= 0) errors.push('Inner height must be positive');
  if (input.thicknessMm <= 0) errors.push('Material thickness must be positive');
  if (input.fingerWidthMm <= 0) errors.push('Finger width must be positive');
  if (input.pinDiameterMm <= 0) errors.push('Pin diameter must be positive');
  if (input.knuckleLengthMm <= input.pinDiameterMm) {
    errors.push('Knuckle length must be greater than pin diameter');
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate generated panels - ensure hinge holes are ONLY on back and lid
 * Throws error if validation fails
 */
export function validatePanels(panels: HingedLidPinPanels): void {
  const panelList = [
    panels.bottom,
    panels.front,
    panels.back,
    panels.left,
    panels.right,
    panels.lid,
  ];
  
  for (const panel of panelList) {
    const isHingePanel = HINGE_PANELS.includes(panel.role);
    
    // Check: non-hinge panels must NOT have holes
    if (!isHingePanel && panel.holes.length > 0) {
      throw new Error(
        `INVALID: Panel "${panel.name}" (role: ${panel.role}) has ${panel.holes.length} hinge holes. ` +
        `Hinge holes are ONLY allowed on BACK and LID panels.`
      );
    }
    
    // Check: hinge panels MUST have holes
    if (isHingePanel && panel.holes.length === 0) {
      throw new Error(
        `INVALID: Hinge panel "${panel.name}" (role: ${panel.role}) has no hinge holes. ` +
        `Back and Lid panels must have complementary knuckles with holes.`
      );
    }
  }
  
  // Check: back and lid must have same number of knuckles (complementary)
  // Actually they should have different counts since they're alternating
  // Back gets even indices, Lid gets odd indices
  // Just verify they both have some holes
  if (panels.back.holes.length === 0 || panels.lid.holes.length === 0) {
    throw new Error('Hinge mismatch: Back and Lid must both have knuckle holes');
  }
}
