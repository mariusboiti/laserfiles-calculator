/**
 * Finger Joint Edge Generator
 * 
 * Generates polyline points for finger joint edges
 * OUTPUT: Only straight lines (M/L/Z), no curves, 90° corners
 */

import type { Pt } from './types';

// Helper: create point
export function pt(x: number, y: number): Pt {
  return { x, y };
}

/**
 * Calculate finger count for an edge (always odd for symmetry)
 */
export function calculateFingerCount(edgeLength: number, fingerWidth: number): number {
  const rawCount = Math.round(edgeLength / fingerWidth);
  return rawCount % 2 === 0 ? rawCount + 1 : Math.max(3, rawCount);
}

/**
 * Generate finger joint pattern along an edge
 * 
 * @param startX - Starting X position
 * @param startY - Starting Y position (baseline)
 * @param length - Total edge length
 * @param fingerDepth - How far fingers protrude (usually = thickness)
 * @param fingerWidth - Desired finger width
 * @param isMale - true = tabs protrude (positive direction), false = slots cut in (negative)
 * @param direction - 'horizontal' (along X) or 'vertical' (along Y)
 * @param normalDir - 1 = protrude in positive direction, -1 = negative
 * @returns Array of points forming the finger pattern
 */
export function generateFingerEdge(
  startX: number,
  startY: number,
  length: number,
  fingerDepth: number,
  fingerWidth: number,
  isMale: boolean,
  direction: 'horizontal' | 'vertical',
  normalDir: 1 | -1 = 1
): Pt[] {
  const points: Pt[] = [];
  const count = calculateFingerCount(length, fingerWidth);
  const actualWidth = length / count;
  const depth = fingerDepth * normalDir * (isMale ? 1 : -1);
  
  if (direction === 'horizontal') {
    // Edge goes along X axis
    let x = startX;
    const y = startY;
    
    points.push(pt(x, y));
    
    for (let i = 0; i < count; i++) {
      const isFinger = i % 2 === 0; // Start with finger
      
      if (isFinger) {
        // Finger: protrude perpendicular
        points.push(pt(x, y + depth));
        x += actualWidth;
        points.push(pt(x, y + depth));
        points.push(pt(x, y));
      } else {
        // Gap: stay on baseline
        x += actualWidth;
        points.push(pt(x, y));
      }
    }
  } else {
    // Edge goes along Y axis
    const x = startX;
    let y = startY;
    
    points.push(pt(x, y));
    
    for (let i = 0; i < count; i++) {
      const isFinger = i % 2 === 0;
      
      if (isFinger) {
        points.push(pt(x + depth, y));
        y += actualWidth;
        points.push(pt(x + depth, y));
        points.push(pt(x, y));
      } else {
        y += actualWidth;
        points.push(pt(x, y));
      }
    }
  }
  
  return points;
}

/**
 * Generate a simple straight edge (no fingers)
 */
export function generateStraightEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Pt[] {
  return [pt(x1, y1), pt(x2, y2)];
}
