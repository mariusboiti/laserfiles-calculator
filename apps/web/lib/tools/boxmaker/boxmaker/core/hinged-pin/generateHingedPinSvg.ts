/**
 * Hinged Pin Box - Panel Generator
 * 
 * Generates all 6 panels with finger joints and pin hinge
 * 
 * RULES:
 * - Only BACK and LID have hinge (knuckles + holes)
 * - Hinge is on TOP edge (y=0) for both BACK and LID
 * - BACK gets even-indexed knuckles, LID gets odd-indexed
 * - All other panels have NO holes, NO knuckles
 * - OUTPUT: Only M/L/Z in paths, <circle> for holes
 */

import type { Pt, Circle, Panel, HingedPinPanels, HingedPinInputs, PanelRole } from './types';
import { HINGE_PANELS } from './types';
import { calculatePanelDimensions } from './panelDims';
import { pt, generateFingerEdge, generateStraightEdge } from './edgeFinger';
import { generateHingeTopEdge, isHingePanel } from './hingeKnuckle';

/**
 * Generate BOTTOM panel
 * - Receives all 4 side panels with female slots
 * - NO hinge, NO holes
 */
function generateBottomPanel(input: HingedPinInputs): Panel {
  const dims = calculatePanelDimensions(input);
  const { width: W, height: H } = dims.bottom;
  const { thicknessMm: t, fingerWidthMm } = input;
  
  const points: Pt[] = [];
  
  // TOP edge: female slots (receives FRONT)
  const topEdge = generateFingerEdge(0, 0, W, t, fingerWidthMm, false, 'horizontal', -1);
  points.push(...topEdge);
  
  // RIGHT edge: female slots (receives RIGHT panel)
  const rightEdge = generateFingerEdge(W, 0, H, t, fingerWidthMm, false, 'vertical', 1);
  points.push(...rightEdge.slice(1));
  
  // BOTTOM edge: female slots (receives BACK)
  const bottomEdge = generateFingerEdge(W, H, W, t, fingerWidthMm, false, 'horizontal', 1);
  // Reverse direction
  const bottomReversed = bottomEdge.map(p => pt(W - (p.x - 0), p.y)).reverse();
  points.push(...bottomReversed.slice(1));
  
  // LEFT edge: female slots (receives LEFT panel)
  const leftEdge = generateFingerEdge(0, H, H, t, fingerWidthMm, false, 'vertical', -1);
  const leftReversed = leftEdge.map(p => pt(p.x, H - (p.y - 0))).reverse();
  points.push(...leftReversed.slice(1));
  
  return {
    role: 'bottom',
    name: 'BOTTOM',
    width: W,
    height: H,
    outline: points,
    holes: [], // NO holes on bottom
    hasHingeEdge: false,
    hingeEdgeLocation: null,
  };
}

/**
 * Generate FRONT panel
 * - Male fingers on bottom (into BOTTOM)
 * - Male fingers on sides (into LEFT/RIGHT)
 * - TOP edge: FLAT (no lid connection on front)
 * - NO hinge, NO holes
 */
function generateFrontPanel(input: HingedPinInputs): Panel {
  const dims = calculatePanelDimensions(input);
  const { width: W, height: H } = dims.front;
  const { thicknessMm: t, fingerWidthMm } = input;
  
  const points: Pt[] = [];
  
  // TOP edge: FLAT (no fingers, no hinge)
  points.push(pt(0, 0));
  points.push(pt(W, 0));
  
  // RIGHT edge: male fingers (into RIGHT panel)
  const rightEdge = generateFingerEdge(W, 0, H, t, fingerWidthMm, true, 'vertical', 1);
  points.push(...rightEdge.slice(1));
  
  // BOTTOM edge: male fingers (into BOTTOM)
  const bottomEdge = generateFingerEdge(W, H, W, t, fingerWidthMm, true, 'horizontal', 1);
  const bottomReversed: Pt[] = [];
  for (let i = bottomEdge.length - 1; i >= 0; i--) {
    const p = bottomEdge[i];
    bottomReversed.push(pt(W - (p.x), H + (p.y - H)));
  }
  points.push(...bottomReversed.slice(1));
  
  // LEFT edge: male fingers (into LEFT panel)
  const leftEdge = generateFingerEdge(0, H, H, t, fingerWidthMm, true, 'vertical', -1);
  const leftReversed: Pt[] = [];
  for (let i = leftEdge.length - 1; i >= 0; i--) {
    const p = leftEdge[i];
    leftReversed.push(pt(p.x, H - (p.y)));
  }
  points.push(...leftReversed.slice(1));
  
  return {
    role: 'front',
    name: 'FRONT',
    width: W,
    height: H,
    outline: points,
    holes: [], // NO holes on front
    hasHingeEdge: false,
    hingeEdgeLocation: null,
  };
}

/**
 * Generate BACK panel
 * - Male fingers on bottom (into BOTTOM)
 * - Male fingers on sides (into LEFT/RIGHT)
 * - TOP edge: HINGE with knuckles (even indices)
 * - HAS holes for pin
 */
function generateBackPanel(input: HingedPinInputs): Panel {
  const dims = calculatePanelDimensions(input);
  const { width: W, height: H } = dims.back;
  const { thicknessMm: t, fingerWidthMm } = input;
  
  const points: Pt[] = [];
  
  // TOP edge: HINGE with knuckles (BACK gets even indices)
  const hingeResult = generateHingeTopEdge(W, input, 'back');
  points.push(...hingeResult.topEdgePoints);
  
  // RIGHT edge: male fingers
  const rightEdge = generateFingerEdge(W, 0, H, t, fingerWidthMm, true, 'vertical', 1);
  points.push(...rightEdge.slice(1));
  
  // BOTTOM edge: male fingers
  const bottomEdge = generateFingerEdge(W, H, W, t, fingerWidthMm, true, 'horizontal', 1);
  const bottomReversed: Pt[] = [];
  for (let i = bottomEdge.length - 1; i >= 0; i--) {
    const p = bottomEdge[i];
    bottomReversed.push(pt(W - p.x, H + (p.y - H)));
  }
  points.push(...bottomReversed.slice(1));
  
  // LEFT edge: male fingers
  const leftEdge = generateFingerEdge(0, H, H, t, fingerWidthMm, true, 'vertical', -1);
  const leftReversed: Pt[] = [];
  for (let i = leftEdge.length - 1; i >= 0; i--) {
    const p = leftEdge[i];
    leftReversed.push(pt(p.x, H - p.y));
  }
  points.push(...leftReversed.slice(1));
  
  return {
    role: 'back',
    name: 'BACK',
    width: W,
    height: H,
    outline: points,
    holes: hingeResult.holes, // Hinge holes
    hasHingeEdge: true,
    hingeEdgeLocation: 'top',
  };
}

/**
 * Generate LEFT panel
 * - Female slots on front/back edges (receives FRONT/BACK)
 * - Male fingers on bottom (into BOTTOM)
 * - TOP edge: FLAT
 * - NO hinge, NO holes
 */
function generateLeftPanel(input: HingedPinInputs): Panel {
  const dims = calculatePanelDimensions(input);
  const { width: W, height: H } = dims.left; // W = OD, H = OH
  const { thicknessMm: t, fingerWidthMm } = input;
  
  const points: Pt[] = [];
  
  // TOP edge: FLAT
  points.push(pt(0, 0));
  points.push(pt(W, 0));
  
  // RIGHT edge: female slots (receives BACK)
  const rightEdge = generateFingerEdge(W, 0, H, t, fingerWidthMm, false, 'vertical', 1);
  points.push(...rightEdge.slice(1));
  
  // BOTTOM edge: male fingers (into BOTTOM)
  const bottomEdge = generateFingerEdge(W, H, W, t, fingerWidthMm, true, 'horizontal', 1);
  const bottomReversed: Pt[] = [];
  for (let i = bottomEdge.length - 1; i >= 0; i--) {
    const p = bottomEdge[i];
    bottomReversed.push(pt(W - p.x, H + (p.y - H)));
  }
  points.push(...bottomReversed.slice(1));
  
  // LEFT edge: female slots (receives FRONT)
  const leftEdge = generateFingerEdge(0, H, H, t, fingerWidthMm, false, 'vertical', -1);
  const leftReversed: Pt[] = [];
  for (let i = leftEdge.length - 1; i >= 0; i--) {
    const p = leftEdge[i];
    leftReversed.push(pt(p.x, H - p.y));
  }
  points.push(...leftReversed.slice(1));
  
  return {
    role: 'left',
    name: 'LEFT',
    width: W,
    height: H,
    outline: points,
    holes: [], // NO holes on left
    hasHingeEdge: false,
    hingeEdgeLocation: null,
  };
}

/**
 * Generate RIGHT panel (mirror of LEFT)
 */
function generateRightPanel(input: HingedPinInputs): Panel {
  const dims = calculatePanelDimensions(input);
  const { width: W, height: H } = dims.right;
  const { thicknessMm: t, fingerWidthMm } = input;
  
  const points: Pt[] = [];
  
  // TOP edge: FLAT
  points.push(pt(0, 0));
  points.push(pt(W, 0));
  
  // RIGHT edge: female slots (receives FRONT)
  const rightEdge = generateFingerEdge(W, 0, H, t, fingerWidthMm, false, 'vertical', 1);
  points.push(...rightEdge.slice(1));
  
  // BOTTOM edge: male fingers
  const bottomEdge = generateFingerEdge(W, H, W, t, fingerWidthMm, true, 'horizontal', 1);
  const bottomReversed: Pt[] = [];
  for (let i = bottomEdge.length - 1; i >= 0; i--) {
    const p = bottomEdge[i];
    bottomReversed.push(pt(W - p.x, H + (p.y - H)));
  }
  points.push(...bottomReversed.slice(1));
  
  // LEFT edge: female slots (receives BACK)
  const leftEdge = generateFingerEdge(0, H, H, t, fingerWidthMm, false, 'vertical', -1);
  const leftReversed: Pt[] = [];
  for (let i = leftEdge.length - 1; i >= 0; i--) {
    const p = leftEdge[i];
    leftReversed.push(pt(p.x, H - p.y));
  }
  points.push(...leftReversed.slice(1));
  
  return {
    role: 'right',
    name: 'RIGHT',
    width: W,
    height: H,
    outline: points,
    holes: [], // NO holes on right
    hasHingeEdge: false,
    hingeEdgeLocation: null,
  };
}

/**
 * Generate LID panel
 * - TOP edge: HINGE with knuckles (odd indices)
 * - Other edges: FLAT (lid sits on top of walls)
 * - HAS holes for pin
 */
function generateLidPanel(input: HingedPinInputs): Panel {
  const dims = calculatePanelDimensions(input);
  const { width: W, height: H } = dims.lid; // W = OW, H = OD
  
  const points: Pt[] = [];
  
  // TOP edge: HINGE with knuckles (LID gets odd indices)
  const hingeResult = generateHingeTopEdge(W, input, 'lid');
  points.push(...hingeResult.topEdgePoints);
  
  // RIGHT edge: straight
  points.push(pt(W, H));
  
  // BOTTOM edge: straight
  points.push(pt(0, H));
  
  // LEFT edge: straight (closes the shape)
  points.push(pt(0, 0));
  
  return {
    role: 'lid',
    name: 'LID',
    width: W,
    height: H,
    outline: points,
    holes: hingeResult.holes, // Hinge holes
    hasHingeEdge: true,
    hingeEdgeLocation: 'top',
  };
}

/**
 * Generate all panels for the hinged pin box
 */
export function generateHingedPinPanels(input: HingedPinInputs): HingedPinPanels {
  return {
    bottom: generateBottomPanel(input),
    front: generateFrontPanel(input),
    back: generateBackPanel(input),
    left: generateLeftPanel(input),
    right: generateRightPanel(input),
    lid: generateLidPanel(input),
  };
}

/**
 * Validate generated panels
 * Throws error if any validation fails
 */
export function validatePanels(panels: HingedPinPanels): void {
  const panelList = [panels.bottom, panels.front, panels.back, panels.left, panels.right, panels.lid];
  
  for (const panel of panelList) {
    const isHinge = isHingePanel(panel.role);
    
    // Rule: Non-hinge panels must NOT have holes
    if (!isHinge && panel.holes.length > 0) {
      throw new Error(
        `VALIDATION ERROR: Panel "${panel.name}" (${panel.role}) has ${panel.holes.length} holes. ` +
        `Only BACK and LID can have holes.`
      );
    }
    
    // Rule: Hinge panels MUST have holes
    if (isHinge && panel.holes.length === 0) {
      throw new Error(
        `VALIDATION ERROR: Hinge panel "${panel.name}" (${panel.role}) has no holes. ` +
        `BACK and LID must have knuckle holes.`
      );
    }
    
    // Rule: Hinge edge must be on TOP (y=0)
    if (isHinge && panel.hingeEdgeLocation !== 'top') {
      throw new Error(
        `VALIDATION ERROR: Panel "${panel.name}" hinge edge is "${panel.hingeEdgeLocation}", must be "top".`
      );
    }
  }
  
  // Rule: BACK and LID must have same total knuckle count
  // (They share the same pattern, just alternating)
  // For now, just verify they both have holes
  if (panels.back.holes.length === 0 || panels.lid.holes.length === 0) {
    throw new Error('VALIDATION ERROR: BACK and LID must both have hinge holes.');
  }
}
