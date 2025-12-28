/**
 * PURE Edge Generator - Foundation of BoxMaker
 * 
 * RULES:
 * 1. Each edge is generated independently
 * 2. Only straight segments (M/L commands)
 * 3. No curves, no offsets, no post-processing
 * 4. Perfect 90° corners
 */

import type { Pt } from '../hinged-side-pin/types';

export type EdgeMode = 'flat' | 'fingers-in' | 'fingers-out';

export interface EdgeParams {
  length: number;
  thickness: number;
  fingerWidth: number;
  mode: EdgeMode;
  pattern?: FingerPattern;
}

export interface FingerPattern {
  count: number;
  step: number;
  startsWithTab: boolean;
  specialBottom?: boolean; // For special 5-finger bottom pattern
}

export function makeCanonicalPattern(
  length: number,
  targetFingerWidth: number,
  startsWithTab: boolean
): FingerPattern {
  let count = Math.round(length / targetFingerWidth);
  if (count < 4) count = 4;
  if (count % 2 !== 0) count += 1;

  const step = length / count;

  return { count, step, startsWithTab };
}

/**
 * Generate a single edge - PURE FUNCTION
 * Returns array of points forming the edge pattern
 * 
 * @param params - Edge generation parameters
 * @returns Array of points from start to end of edge
 */
export function generateEdge(params: EdgeParams): Pt[] {
  const { length, thickness, fingerWidth, mode, pattern } = params;
  
  if (mode === 'flat') {
    return [{ x: 0, y: 0 }, { x: length, y: 0 }];
  }
  
  // Special bottom edge pattern with 3 fixed center fingers
  if (params.pattern?.specialBottom) {
    return generateSpecialBottomEdge(length, thickness, fingerWidth, mode === 'fingers-out');
  }
  
  // Use provided pattern or calculate canonical one
  const actualPattern = pattern || makeCanonicalPattern(length, fingerWidth, true);
  
  const points: Pt[] = [{ x: 0, y: 0 }];
  let currentX = 0;
  
  for (let i = 0; i < actualPattern.count; i++) {
    const isTab = (i % 2 === 0) === actualPattern.startsWithTab;
    const actualFingerWidth = actualPattern.step;
    
    if (isTab) {
      // Tab: protrude outward
      points.push({ x: currentX, y: 0 });
      points.push({ x: currentX, y: mode === 'fingers-out' ? thickness : -thickness });
      currentX += actualFingerWidth;
      points.push({ x: currentX, y: mode === 'fingers-out' ? thickness : -thickness });
      points.push({ x: currentX, y: 0 });
    } else {
      // Gap: stay on baseline
      currentX += actualFingerWidth;
      points.push({ x: currentX, y: 0 });
    }
  }
  
  return points;
}

function generateSpecialBottomEdge(
  length: number,
  thickness: number,
  fingerWidth: number,
  isOut: boolean
): Pt[] {
  // 3 fixed center fingers at 10mm each = 30mm total
  const centerFingerWidth = 10;
  const centerFingersCount = 3;
  const centerTotalWidth = centerFingerWidth * centerFingersCount;
  
  // Calculate remaining width for side fingers and gaps
  const remainingWidth = length - centerTotalWidth;
  const sideFingerWidth = remainingWidth / 4; // 2 side fingers + 2 gaps
  
  // Generate pattern: side finger - gap - 3 center fingers - gap - side finger
  const points: Pt[] = [{ x: 0, y: 0 }];
  let currentX = 0;
  
  // First side finger
  points.push({ x: currentX, y: 0 });
  points.push({ x: currentX, y: isOut ? thickness : -thickness });
  currentX += sideFingerWidth;
  points.push({ x: currentX, y: isOut ? thickness : -thickness });
  points.push({ x: currentX, y: 0 });
  
  // First gap
  currentX += sideFingerWidth;
  points.push({ x: currentX, y: 0 });
  
  // 3 center fingers (fixed 10mm each)
  for (let i = 0; i < centerFingersCount; i++) {
    points.push({ x: currentX, y: 0 });
    points.push({ x: currentX, y: isOut ? thickness : -thickness });
    currentX += centerFingerWidth;
    points.push({ x: currentX, y: isOut ? thickness : -thickness });
    points.push({ x: currentX, y: 0 });
    
    // Gap between center fingers (except after last one)
    if (i < centerFingersCount - 1) {
      currentX += fingerWidth;
      points.push({ x: currentX, y: 0 });
    }
  }
  
  // Second gap
  currentX += sideFingerWidth;
  points.push({ x: currentX, y: 0 });
  
  // Second side finger
  points.push({ x: currentX, y: 0 });
  points.push({ x: currentX, y: isOut ? thickness : -thickness });
  currentX += sideFingerWidth;
  points.push({ x: currentX, y: isOut ? thickness : -thickness });
  points.push({ x: currentX, y: 0 });
  
  // Ensure we end exactly at the target length
  if (Math.abs(currentX - length) > 0.001) {
    // Adjust the last point to match exact length
    points[points.length - 1] = { x: length, y: 0 };
  }
  
  return points;
}

/**
 * Transform utilities for edge positioning
 */

// Rotate edge 90° clockwise
export function rotate90(edge: Pt[]): Pt[] {
  return edge.map(p => ({ x: -p.y, y: p.x }));
}

// Rotate edge 90° counter-clockwise
export function rotate90CCW(edge: Pt[]): Pt[] {
  return edge.map(p => ({ x: p.y, y: -p.x }));
}

// Reverse edge direction
export function reverse(edge: Pt[]): Pt[] {
  const reversed = [...edge];
  return reversed.reverse();
}

// Translate edge to position
export function translate(edge: Pt[], dx: number, dy: number): Pt[] {
  return edge.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Panel builder - PURE CONSTRUCTION
 * 
 * Builds a panel from 4 independent edges
 * NO post-processing allowed
 */
export interface PanelSpec {
  width: number;
  height: number;
  thickness: number;
  fingerWidth: number;
  topMode: EdgeMode;
  rightMode: EdgeMode;
  bottomMode: EdgeMode;
  leftMode: EdgeMode;
}

export function buildPanel(spec: PanelSpec): Pt[] {
  // Canonical patterns are derived ONLY from length class.
  // Same length => same count/step boundaries, stable across all panels.
  const horizontalPattern = makeCanonicalPattern(spec.width, spec.fingerWidth, true);
  const verticalPattern = makeCanonicalPattern(spec.height, spec.fingerWidth, true);

  // Generate each edge independently
  const topEdge = generateEdge({
    length: spec.width,
    thickness: spec.thickness,
    fingerWidth: spec.fingerWidth,
    mode: spec.topMode,
    pattern: spec.topMode === 'flat' ? undefined : horizontalPattern
  });
  
  const rightEdge = generateEdge({
    length: spec.height,
    thickness: spec.thickness,
    fingerWidth: spec.fingerWidth,
    mode: spec.rightMode,
    pattern: spec.rightMode === 'flat' ? undefined : verticalPattern
  });
  
  const bottomEdge = generateEdge({
    length: spec.width,
    thickness: spec.thickness,
    fingerWidth: spec.fingerWidth,
    mode: spec.bottomMode,

    // buildPanel reverses the bottom edge to walk the perimeter from bottom-right to bottom-left.
    // With EVEN finger counts, reversing flips the phase. Compensate by flipping startsWithTab.
    pattern:
      spec.bottomMode === 'flat'
        ? undefined
        : { ...horizontalPattern, startsWithTab: !horizontalPattern.startsWithTab }
  });
  
  const leftEdge = generateEdge({
    length: spec.height,
    thickness: spec.thickness,
    fingerWidth: spec.fingerWidth,
    mode: spec.leftMode,
    // Left edge is traversed bottom->top in the final panel path.
    // Flip phase so that vertical finger boundaries are anchored consistently (top-based)
    // and LEFT/RIGHT panels render identically.
    pattern:
      spec.leftMode === 'flat'
        ? undefined
        : { ...verticalPattern, startsWithTab: !verticalPattern.startsWithTab }
  });
  
  // Position edges (NO MUTATION of original edges)
  const positionedTop = topEdge; // Already at (0,0)
  const positionedRight = translate(rotate90(rightEdge), spec.width, 0);
  const positionedBottom = translate(reverse(bottomEdge), 0, spec.height); // Start from left, not right
  const positionedLeft = translate(rotate90CCW(leftEdge), 0, spec.height); // Don't reverse left edge
  
  // Concatenate edges in correct order (NO post-processing)
  const panel: Pt[] = [
    ...positionedTop,
    ...positionedRight.slice(1), // Skip duplicate corner
    ...positionedBottom.slice(1),
    ...positionedLeft.slice(1),
    positionedTop[0] // Close the panel by returning to start
  ];
  
  return panel;
}
