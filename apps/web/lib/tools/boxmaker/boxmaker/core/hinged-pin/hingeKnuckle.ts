/**
 * Hinge Knuckle Generator
 * 
 * Generates knuckle geometry for BACK and LID panels
 * 
 * RULE: Hinge is on TOP edge (y=0) for both BACK and LID
 * RULE: BACK gets even-indexed knuckles, LID gets odd-indexed
 * RULE: Knuckles protrude UPWARD (negative Y direction)
 */

import type { Pt, Circle, HingedPinInputs, PanelRole } from './types';
import { pt } from './edgeFinger';

export interface KnucklePattern {
  // The TOP edge polyline with knuckle cutouts
  topEdgePoints: Pt[];
  // Pin holes for this panel
  holes: Circle[];
  // Total knuckle count (for validation)
  totalKnuckleCount: number;
  // This panel's knuckle count
  panelKnuckleCount: number;
}

/**
 * Calculate knuckle positions along hinge edge
 */
function calculateKnuckleLayout(
  edgeLength: number,
  input: HingedPinInputs
): { startX: number; count: number; step: number } {
  const { fingerWidthMm, thicknessMm, pinDiameterMm, knuckleLengthMm, knuckleGapMm } = input;
  
  // End margin: max(fingerWidth, 2*thickness, pinDiameter)
  const endMargin = Math.max(fingerWidthMm, 2 * thicknessMm, pinDiameterMm);
  
  // Usable length for knuckles
  const usable = edgeLength - 2 * endMargin;
  
  // Step = knuckleLength + knuckleGap
  const step = knuckleLengthMm + knuckleGapMm;
  
  // Count = floor((usable + gap) / step)
  const count = Math.max(1, Math.floor((usable + knuckleGapMm) / step));
  
  // Total pattern length
  const patternLength = count * knuckleLengthMm + (count - 1) * knuckleGapMm;
  
  // Center the pattern
  const startX = endMargin + (usable - patternLength) / 2;
  
  return { startX, count, step };
}

/**
 * Generate TOP edge with knuckle protrusions for BACK or LID panel
 * 
 * @param edgeLength - Width of the panel (OW)
 * @param input - Box parameters
 * @param panelRole - 'back' or 'lid'
 * @returns KnucklePattern with edge points and holes
 */
export function generateHingeTopEdge(
  edgeLength: number,
  input: HingedPinInputs,
  panelRole: 'back' | 'lid'
): KnucklePattern {
  const { knuckleLengthMm, hingeInsetMm, pinDiameterMm, clearanceMm } = input;
  
  const layout = calculateKnuckleLayout(edgeLength, input);
  const { startX, count, step } = layout;
  
  const points: Pt[] = [];
  const holes: Circle[] = [];
  
  // Hole radius
  const holeR = (pinDiameterMm + 2 * clearanceMm) / 2;
  
  // Start at left corner of TOP edge
  let currentX = 0;
  points.push(pt(currentX, 0));
  
  let panelKnuckleCount = 0;
  
  for (let i = 0; i < count; i++) {
    const knuckleX0 = startX + i * step;
    const knuckleX1 = knuckleX0 + knuckleLengthMm;
    
    // Determine if this knuckle belongs to this panel
    // BACK: even indices (0, 2, 4...)
    // LID: odd indices (1, 3, 5...)
    const isThisPanelKnuckle = panelRole === 'back' ? (i % 2 === 0) : (i % 2 === 1);
    
    // Move to knuckle start (flat segment)
    if (currentX < knuckleX0) {
      points.push(pt(knuckleX0, 0));
      currentX = knuckleX0;
    }
    
    if (isThisPanelKnuckle) {
      // Draw knuckle: protrude UPWARD (negative Y)
      // Go up
      points.push(pt(knuckleX0, -hingeInsetMm));
      // Go right along top of knuckle
      points.push(pt(knuckleX1, -hingeInsetMm));
      // Come back down
      points.push(pt(knuckleX1, 0));
      
      // Add hole centered in knuckle
      const holeCx = (knuckleX0 + knuckleX1) / 2;
      const holeCy = -hingeInsetMm / 2;
      holes.push({ cx: holeCx, cy: holeCy, r: holeR });
      
      panelKnuckleCount++;
    } else {
      // Not this panel's knuckle - flat segment
      points.push(pt(knuckleX1, 0));
    }
    
    currentX = knuckleX1;
  }
  
  // Continue to right edge
  if (currentX < edgeLength) {
    points.push(pt(edgeLength, 0));
  }
  
  return {
    topEdgePoints: points,
    holes,
    totalKnuckleCount: count,
    panelKnuckleCount,
  };
}

/**
 * Validate that panel role is correct for hinge
 */
export function isHingePanel(role: PanelRole): boolean {
  return role === 'back' || role === 'lid';
}
