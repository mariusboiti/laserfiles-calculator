/**
 * PURE Edge Generator - Simple and Clean
 * 
 * Generates finger joint edges with canonical patterns
 * NO special cases, NO custom logic
 */

import type { Pt } from '../hinged-side-pin/types';

export type EdgeMode = 'flat' | 'fingers-in' | 'fingers-out';

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

/**
 * Generate canonical finger pattern for a given length
 */
function makeCanonicalPattern(length: number, fingerWidth: number): { count: number; step: number } {
  let count = Math.round(length / fingerWidth);
  if (count < 4) count = 4;
  if (count % 2 !== 0) count += 1; // Ensure even count
  
  const step = length / count;
  
  return { count, step };
}

/**
 * Generate a single edge with finger joints
 */
export function generateEdge(
  length: number,
  thickness: number,
  fingerWidth: number,
  mode: EdgeMode,
  startWithTab: boolean
): Pt[] {
  if (mode === 'flat') {
    return [{ x: 0, y: 0 }, { x: length, y: 0 }];
  }
  
  const pattern = makeCanonicalPattern(length, fingerWidth);
  const isOut = mode === 'fingers-out';
  
  const points: Pt[] = [{ x: 0, y: 0 }];
  let currentX = 0;
  
  for (let i = 0; i < pattern.count; i++) {
    const isTab = (i % 2 === 0) === startWithTab;
    
    if (isTab) {
      // Tab: protrude outward
      points.push({ x: currentX, y: 0 });
      points.push({ x: currentX, y: isOut ? thickness : -thickness });
      currentX += pattern.step;
      points.push({ x: currentX, y: isOut ? thickness : -thickness });
      points.push({ x: currentX, y: 0 });
    } else {
      // Gap: stay on baseline
      currentX += pattern.step;
      points.push({ x: currentX, y: 0 });
    }
  }
  
  return points;
}

/**
 * Transform utilities
 */
function rotate90(edge: Pt[]): Pt[] {
  return edge.map(p => ({ x: -p.y, y: p.x }));
}

function rotate90CCW(edge: Pt[]): Pt[] {
  return edge.map(p => ({ x: p.y, y: -p.x }));
}

function translate(edge: Pt[], dx: number, dy: number): Pt[] {
  return edge.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

function reverse(edge: Pt[]): Pt[] {
  return [...edge].reverse();
}

/**
 * Build a complete panel from 4 edges
 */
export function buildPanel(spec: PanelSpec): Pt[] {
  // Generate each edge independently
  const topEdge = generateEdge(
    spec.width,
    spec.thickness,
    spec.fingerWidth,
    spec.topMode,
    true // Start with tab
  );
  
  const rightEdge = generateEdge(
    spec.height,
    spec.thickness,
    spec.fingerWidth,
    spec.rightMode,
    true // Start with tab
  );
  
  const bottomEdge = generateEdge(
    spec.width,
    spec.thickness,
    spec.fingerWidth,
    spec.bottomMode,
    false // Start with gap (inverted phase)
  );
  
  const leftEdge = generateEdge(
    spec.height,
    spec.thickness,
    spec.fingerWidth,
    spec.leftMode,
    false // Start with gap (inverted phase)
  );
  
  // Position edges
  const positionedTop = topEdge; // Already at (0,0)
  const positionedRight = translate(rotate90(rightEdge), spec.width, 0);
  const positionedBottom = translate(reverse(bottomEdge), 0, spec.height);
  const positionedLeft = translate(rotate90CCW(leftEdge), 0, spec.height);
  
  // Concatenate edges
  const panel: Pt[] = [
    ...positionedTop,
    ...positionedRight.slice(1), // Skip duplicate corner
    ...positionedBottom.slice(1),
    ...positionedLeft.slice(1),
    positionedTop[0] // Close the panel
  ];
  
  return panel;
}

// Export transform utilities for external use
export { rotate90, rotate90CCW, translate, reverse };
export type { Pt };
