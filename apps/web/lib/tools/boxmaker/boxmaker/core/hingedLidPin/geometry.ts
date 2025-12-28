/**
 * Hinged Lid Pin Box - Geometry Functions
 * Edge generator, finger joints, and knuckle placement
 * 
 * OUTPUT: 100% orthogonal (only M/L/Z in SVG), no curves, no rounding
 */

import type { Pt, Knuckle, HingedLidPinInputs } from './types';

// Helper: create point
export function pt(x: number, y: number): Pt {
  return { x, y };
}

// Helper: add vectors
export function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

// Helper: multiply vector by scalar
export function mul(p: Pt, s: number): Pt {
  return { x: p.x * s, y: p.y * s };
}

/**
 * Calculate finger count for an edge length
 * Returns odd number for centered symmetric pattern
 */
export function calculateFingerCount(edgeLength: number, fingerWidth: number): number {
  const rawCount = Math.round(edgeLength / fingerWidth);
  // Ensure odd count for centered pattern
  return rawCount % 2 === 0 ? rawCount + 1 : rawCount;
}

/**
 * Calculate actual finger width to fit edge perfectly
 */
export function calculateActualFingerWidth(edgeLength: number, fingerCount: number): number {
  return edgeLength / fingerCount;
}

/**
 * Build finger edge pattern (polyline points)
 * 
 * @param start - Starting point
 * @param direction - Unit vector along the edge (1,0) for horizontal, (0,1) for vertical
 * @param normal - Unit vector perpendicular to edge, pointing outward for male tabs
 * @param length - Total edge length
 * @param thickness - Material thickness (finger depth)
 * @param fingerWidth - Desired finger width
 * @param isMale - true = tabs protrude outward, false = slots cut inward
 * @param kerf - Kerf compensation
 * @returns Array of points forming the finger pattern
 */
export function buildFingerEdge(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  thickness: number,
  fingerWidth: number,
  isMale: boolean,
  kerf: number = 0
): Pt[] {
  const points: Pt[] = [];
  const fingerCount = calculateFingerCount(length, fingerWidth);
  const actualWidth = calculateActualFingerWidth(length, fingerCount);
  
  // Kerf adjustment: male tabs shrink, female slots grow
  const kerfAdj = isMale ? -kerf : kerf;
  const depth = thickness;
  
  let current = start;
  points.push(current);
  
  for (let i = 0; i < fingerCount; i++) {
    // Centered pattern: start with male if isMale, alternate
    const isTab = isMale ? (i % 2 === 0) : (i % 2 === 1);
    
    if (isTab) {
      // Tab: protrude perpendicular
      const tabWidth = actualWidth + kerfAdj * 2;
      const halfKerfAdj = kerfAdj;
      
      // Move along edge to start of tab (with kerf adjustment)
      if (halfKerfAdj !== 0) {
        current = add(current, mul(direction, -halfKerfAdj));
        points.push(current);
      }
      
      // Go out perpendicular
      current = add(current, mul(normal, depth));
      points.push(current);
      
      // Move along edge (tab width)
      current = add(current, mul(direction, tabWidth));
      points.push(current);
      
      // Come back perpendicular
      current = add(current, mul(normal, -depth));
      points.push(current);
      
      // Adjust for next segment
      if (halfKerfAdj !== 0) {
        current = add(current, mul(direction, -halfKerfAdj));
        points.push(current);
      }
    } else {
      // Slot: stay flat (or cut inward for female)
      current = add(current, mul(direction, actualWidth));
      points.push(current);
    }
  }
  
  return points;
}

/**
 * Build simple straight edge (no fingers)
 */
export function buildStraightEdge(start: Pt, end: Pt): Pt[] {
  return [start, end];
}

/**
 * Calculate knuckle positions along hinge edge
 * Returns alternating positions for back (even indices) and lid (odd indices)
 * 
 * @param edgeLength - Total hinge edge length
 * @param knuckleLength - Length of each knuckle
 * @param knuckleGap - Gap between knuckles
 * @returns Array of knuckle start positions and whether they belong to back (true) or lid (false)
 */
export function calculateKnucklePositions(
  edgeLength: number,
  knuckleLength: number,
  knuckleGap: number
): { position: number; isBack: boolean; width: number }[] {
  const knuckles: { position: number; isBack: boolean; width: number }[] = [];
  
  // Calculate how many knuckles fit
  const pitch = knuckleLength + knuckleGap;
  const count = Math.floor(edgeLength / pitch);
  
  // Center the pattern
  const totalPatternLength = count * pitch - knuckleGap; // Last one doesn't need gap after
  const startOffset = (edgeLength - totalPatternLength) / 2;
  
  for (let i = 0; i < count; i++) {
    const position = startOffset + i * pitch;
    knuckles.push({
      position,
      isBack: i % 2 === 0, // Even indices for back, odd for lid
      width: knuckleLength,
    });
  }
  
  return knuckles;
}

/**
 * Build hinge edge with knuckles
 * Creates rectangular protrusions for knuckles with holes for pin
 * 
 * @param start - Starting point of edge
 * @param direction - Direction along edge (1,0 for horizontal going right)
 * @param normal - Normal direction (outward for knuckle protrusion)
 * @param edgeLength - Total edge length
 * @param input - Box parameters
 * @param isBack - true for back panel (even knuckles), false for lid (odd knuckles)
 * @returns Object with edge points and hole positions
 */
export function buildHingeEdge(
  start: Pt,
  direction: Pt,
  normal: Pt,
  edgeLength: number,
  input: HingedLidPinInputs,
  isBack: boolean
): { points: Pt[]; holes: { cx: number; cy: number; r: number }[] } {
  const { knuckleLengthMm, knuckleGapMm, hingeInsetMm, pinDiameterMm, hingeClearanceMm } = input;
  
  const points: Pt[] = [];
  const holes: { cx: number; cy: number; r: number }[] = [];
  
  const knucklePositions = calculateKnucklePositions(edgeLength, knuckleLengthMm, knuckleGapMm);
  const knuckleHeight = hingeInsetMm; // How far knuckle protrudes
  const holeRadius = (pinDiameterMm + hingeClearanceMm * 2) / 2;
  
  let current = start;
  points.push(current);
  
  let lastX = 0;
  
  for (const knuckle of knucklePositions) {
    // Only draw knuckles that belong to this panel
    if (knuckle.isBack !== isBack) {
      continue;
    }
    
    // Move to knuckle start
    const knuckleStart = knuckle.position;
    if (knuckleStart > lastX) {
      current = add(start, mul(direction, knuckleStart));
      points.push(current);
    }
    
    // Protrude outward (knuckle rectangle)
    current = add(current, mul(normal, knuckleHeight));
    points.push(current);
    
    // Move along knuckle width
    current = add(current, mul(direction, knuckle.width));
    points.push(current);
    
    // Come back inward
    current = add(current, mul(normal, -knuckleHeight));
    points.push(current);
    
    lastX = knuckleStart + knuckle.width;
    
    // Calculate hole position (center of knuckle)
    const holeCenterX = start.x + direction.x * (knuckleStart + knuckle.width / 2) + normal.x * (knuckleHeight / 2);
    const holeCenterY = start.y + direction.y * (knuckleStart + knuckle.width / 2) + normal.y * (knuckleHeight / 2);
    
    holes.push({
      cx: holeCenterX,
      cy: holeCenterY,
      r: holeRadius,
    });
  }
  
  // Continue to end of edge
  if (lastX < edgeLength) {
    const endPoint = add(start, mul(direction, edgeLength));
    points.push(endPoint);
  }
  
  return { points, holes };
}

/**
 * Build complete panel outline by connecting edges
 * Removes duplicate points at corners
 */
export function buildPanelOutline(edges: Pt[][]): Pt[] {
  const outline: Pt[] = [];
  
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    // Skip first point of each edge (it's the same as last point of previous edge)
    // except for the first edge
    const startIdx = i === 0 ? 0 : 1;
    for (let j = startIdx; j < edge.length; j++) {
      outline.push(edge[j]);
    }
  }
  
  return outline;
}

/**
 * Validate that all points are finite numbers
 */
export function validateOutline(points: Pt[]): boolean {
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      return false;
    }
  }
  return true;
}
