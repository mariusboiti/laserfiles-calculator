/**
 * Shared Edge Generator
 * Generates each interior edge once and shares between adjacent pieces
 */

import { createSeededRandom, hashString } from './utils/rng';
import { generateVerticalEdgeOrganic, generateVerticalEdgeSimple } from './verticalEdgeStyles';

export interface EdgeGeometry {
  pathSegment: string;  // SVG path segment for this edge
  reversed: string;     // Reversed path segment for adjacent piece
  isTab: boolean;       // true = tab (outward), false = slot (inward)
}

export interface SharedEdgeMap {
  horizontal: EdgeGeometry[][];  // [row][col] - horizontal edges
  vertical: EdgeGeometry[][];    // [row][col] - vertical edges
}

export interface KnobParameters {
  knobStyle?: 'classic' | 'organic' | 'simple';  // Knob style
  knobSizePct?: number;      // 40-90: overall knob size percentage
  knobRoundness?: number;    // 0.6-1.0: bulb roundness
  knobJitter?: number;       // 0-0.35: randomness variation
}

/**
 * Generate all shared edges for the puzzle
 * @param difficulty 0-100, where 0 = regular grid, 100 = maximum chaos
 * @param knobParams Optional knob parameters from PathOps Pro
 */
export function generateSharedEdges(
  rows: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): SharedEdgeMap {
  const horizontal: EdgeGeometry[][] = [];
  const vertical: EdgeGeometry[][] = [];
  
  // Generate horizontal edges (between rows)
  for (let row = 0; row <= rows; row++) {
    horizontal[row] = [];
    for (let col = 0; col < columns; col++) {
      if (row === 0 || row === rows) {
        // Border edge - straight line
        horizontal[row][col] = {
          pathSegment: `L ${(col + 1) * cellWidth} ${row * cellHeight}`,
          reversed: `L ${col * cellWidth} ${row * cellHeight}`,
          isTab: false,
        };
      } else {
        // Interior edge with knob
        const edgeSeed = seed + hashString(`H:${row},${col}`);
        horizontal[row][col] = generateHorizontalEdge(
          col * cellWidth,
          row * cellHeight,
          cellWidth,
          edgeSeed,
          difficulty,
          knobParams
        );
      }
    }
  }
  
  // Generate vertical edges (between columns)
  for (let row = 0; row < rows; row++) {
    vertical[row] = [];
    for (let col = 0; col <= columns; col++) {
      if (col === 0 || col === columns) {
        // Border edge - straight line
        vertical[row][col] = {
          pathSegment: `L ${col * cellWidth} ${(row + 1) * cellHeight}`,
          reversed: `L ${col * cellWidth} ${row * cellHeight}`,
          isTab: false,
        };
      } else {
        // Interior edge with knob
        const edgeSeed = seed + hashString(`V:${row},${col}`);
        vertical[row][col] = generateVerticalEdge(
          col * cellWidth,
          row * cellHeight,
          cellHeight,
          edgeSeed,
          difficulty,
          knobParams
        );
      }
    }
  }
  
  return { horizontal, vertical };
}

/**
 * Generate horizontal edge with knob (left to right)
 * Classic puzzle knob: narrow neck + round bulb
 * @param difficulty 0-100: affects knob position and shape variation
 * @param knobParams Optional parameters for knob customization
 */
function generateHorizontalEdge(
  startX: number,
  y: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const knobStyle = knobParams.knobStyle ?? 'classic';
  
  // Delegate to style-specific generator
  switch (knobStyle) {
    case 'organic':
      return generateHorizontalEdgeOrganic(startX, y, length, seed, difficulty, knobParams);
    case 'simple':
      return generateHorizontalEdgeSimple(startX, y, length, seed, difficulty, knobParams);
    case 'classic':
    default:
      return generateHorizontalEdgeClassic(startX, y, length, seed, difficulty, knobParams);
  }
}

/**
 * Classic style: Traditional round knobs with smooth curves
 */
function generateHorizontalEdgeClassic(
  startX: number,
  y: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const rng = createSeededRandom(seed);
  
  // Extract knob parameters with defaults
  const knobSizePct = knobParams.knobSizePct ?? 65;  // 40-90
  const knobRoundness = knobParams.knobRoundness ?? 0.85;  // 0.6-1.0
  const knobJitter = knobParams.knobJitter ?? 0.15;  // 0-0.35
  
  // Difficulty factor (0 to 1)
  const df = difficulty / 100;
  
  // Knob position offset (0 at easy, up to ±20% at max difficulty)
  const positionOffset = (rng() - 0.5) * 2 * df * 0.2 * length;
  
  // Knob size scaling based on knobSizePct (40-90% → 0.7-1.3 multiplier)
  const sizeScale = 0.7 + (knobSizePct - 40) / 50 * 0.6;
  
  // Knob parameters with difficulty-based variation and user controls
  const baseDepth = length * (0.18 + df * 0.08) * sizeScale;
  const jitterFactor = 1 + (rng() - 0.5) * knobJitter;
  const depthVariation = 0.9 + rng() * 0.2 + df * (rng() - 0.5) * 0.3;
  const depth = baseDepth * depthVariation * jitterFactor;
  
  const neckWidth = length * (0.10 + df * 0.04) * (0.9 + rng() * 0.2) * sizeScale * jitterFactor;
  const bulbRadius = length * (0.12 + df * 0.06) * (0.9 + rng() * 0.2) * sizeScale * knobRoundness * jitterFactor;
  
  // Determine tab or slot
  const isTab = rng() > 0.5;
  const d = isTab ? -1 : 1;  // Direction: -1 = up (tab), +1 = down (slot)
  
  const endX = startX + length;
  const midX = startX + length / 2 + positionOffset;  // Apply position offset
  
  // Key points
  const shoulderX = midX - neckWidth * 1.5;
  const neckStartX = midX - neckWidth / 2;
  const neckEndX = midX + neckWidth / 2;
  const shoulderEndX = midX + neckWidth * 1.5;
  
  const neckY = y + depth * 0.4 * d;
  const bulbCenterY = y + depth * d;
  
  // Forward path (left to right)
  const fwd: string[] = [];
  
  // 1. Straight to shoulder
  fwd.push(`L ${shoulderX.toFixed(2)} ${y.toFixed(2)}`);
  
  // 2. Shoulder curve down to neck
  fwd.push(`C ${(shoulderX + neckWidth * 0.3).toFixed(2)} ${y.toFixed(2)} ${neckStartX.toFixed(2)} ${(y + depth * 0.1 * d).toFixed(2)} ${neckStartX.toFixed(2)} ${neckY.toFixed(2)}`);
  
  // 3. Neck to bulb (left side of bulb - quarter circle)
  const k = 0.5522847498;
  fwd.push(`C ${neckStartX.toFixed(2)} ${(neckY + bulbRadius * 0.6 * d).toFixed(2)} ${(midX - bulbRadius).toFixed(2)} ${bulbCenterY.toFixed(2)} ${midX.toFixed(2)} ${bulbCenterY.toFixed(2)}`);
  
  // 4. Bulb right side (quarter circle)
  fwd.push(`C ${(midX + bulbRadius).toFixed(2)} ${bulbCenterY.toFixed(2)} ${neckEndX.toFixed(2)} ${(neckY + bulbRadius * 0.6 * d).toFixed(2)} ${neckEndX.toFixed(2)} ${neckY.toFixed(2)}`);
  
  // 5. Neck up to shoulder
  fwd.push(`C ${neckEndX.toFixed(2)} ${(y + depth * 0.1 * d).toFixed(2)} ${(shoulderEndX - neckWidth * 0.3).toFixed(2)} ${y.toFixed(2)} ${shoulderEndX.toFixed(2)} ${y.toFixed(2)}`);
  
  // 6. Straight to end
  fwd.push(`L ${endX.toFixed(2)} ${y.toFixed(2)}`);
  
  // Reversed path (right to left)
  const rev: string[] = [];
  
  // Mirror of forward path
  rev.push(`L ${shoulderEndX.toFixed(2)} ${y.toFixed(2)}`);
  rev.push(`C ${(shoulderEndX - neckWidth * 0.3).toFixed(2)} ${y.toFixed(2)} ${neckEndX.toFixed(2)} ${(y + depth * 0.1 * d).toFixed(2)} ${neckEndX.toFixed(2)} ${neckY.toFixed(2)}`);
  rev.push(`C ${neckEndX.toFixed(2)} ${(neckY + bulbRadius * 0.6 * d).toFixed(2)} ${(midX + bulbRadius).toFixed(2)} ${bulbCenterY.toFixed(2)} ${midX.toFixed(2)} ${bulbCenterY.toFixed(2)}`);
  rev.push(`C ${(midX - bulbRadius).toFixed(2)} ${bulbCenterY.toFixed(2)} ${neckStartX.toFixed(2)} ${(neckY + bulbRadius * 0.6 * d).toFixed(2)} ${neckStartX.toFixed(2)} ${neckY.toFixed(2)}`);
  rev.push(`C ${neckStartX.toFixed(2)} ${(y + depth * 0.1 * d).toFixed(2)} ${(shoulderX + neckWidth * 0.3).toFixed(2)} ${y.toFixed(2)} ${shoulderX.toFixed(2)} ${y.toFixed(2)}`);
  rev.push(`L ${startX.toFixed(2)} ${y.toFixed(2)}`);
  
  return {
    pathSegment: fwd.join(' '),
    reversed: rev.join(' '),
    isTab,
  };
}

/**
 * Organic style: Perfect circular knobs without neck
 * Circle partially overlaps with piece edge - uses SVG arc for perfect circles
 */
function generateHorizontalEdgeOrganic(
  startX: number,
  y: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const rng = createSeededRandom(seed);
  
  const knobSizePct = knobParams.knobSizePct ?? 65;
  const knobJitter = knobParams.knobJitter ?? 0.25;
  const df = difficulty / 100;
  
  const positionOffset = (rng() - 0.5) * 2 * df * 0.2 * length;
  const sizeScale = 0.7 + (knobSizePct - 40) / 50 * 0.6;
  
  // Circle radius
  const baseRadius = length * 0.12 * sizeScale;
  const jitterFactor = 1 + (rng() - 0.5) * knobJitter;
  const radius = baseRadius * (0.85 + rng() * 0.3) * jitterFactor;
  
  const isTab = rng() > 0.5;
  const d = isTab ? -1 : 1;
  
  const endX = startX + length;
  const midX = startX + length / 2 + positionOffset;
  
  // Circle center: 10% of diameter overlaps with edge = 0.2*radius overlap
  // So center is at (radius - 0.2*radius) = 0.8*radius from edge
  const overlap = radius * 0.2;  // 10% of diameter
  const circleCenterY = y + (radius - overlap) * d;
  
  // Calculate intersection points where circle meets the edge line
  // (x - midX)² + (y - circleCenterY)² = radius²
  // At y = edge: (x - midX)² + (edge - circleCenterY)² = radius²
  // (x - midX)² = radius² - (0.8*radius)² = radius²(1 - 0.64) = 0.36*radius²
  // x - midX = ±0.6*radius
  const chordHalfWidth = radius * 0.6;
  
  const leftX = midX - chordHalfWidth;
  const rightX = midX + chordHalfWidth;
  
  const fwd: string[] = [];
  
  fwd.push(`L ${leftX.toFixed(2)} ${y.toFixed(2)}`);
  
  // Use SVG arc command for perfect circle
  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  // large-arc-flag: 1 because we want the larger arc (more than 180°)
  // sweep-flag: depends on direction (1 for clockwise, 0 for counter-clockwise)
  const sweepFlag = d === -1 ? 1 : 0;  // tab goes up (ccw), slot goes down (cw)
  const largeArcFlag = 1;  // We want the larger arc
  
  fwd.push(`A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${rightX.toFixed(2)} ${y.toFixed(2)}`);
  
  fwd.push(`L ${endX.toFixed(2)} ${y.toFixed(2)}`);
  
  // Reversed path
  const rev: string[] = [];
  rev.push(`L ${rightX.toFixed(2)} ${y.toFixed(2)}`);
  // Reverse sweep direction
  const revSweepFlag = sweepFlag === 1 ? 0 : 1;
  rev.push(`A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} ${revSweepFlag} ${leftX.toFixed(2)} ${y.toFixed(2)}`);
  rev.push(`L ${startX.toFixed(2)} ${y.toFixed(2)}`);
  
  return { pathSegment: fwd.join(' '), reversed: rev.join(' '), isTab };
}

/**
 * Simple style: Basic geometric knobs for easier cutting
 */
function generateHorizontalEdgeSimple(
  startX: number,
  y: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const rng = createSeededRandom(seed);
  
  const knobSizePct = knobParams.knobSizePct ?? 65;
  const df = difficulty / 100;
  
  const positionOffset = (rng() - 0.5) * 2 * df * 0.2 * length;
  const sizeScale = 0.7 + (knobSizePct - 40) / 50 * 0.6;
  
  // Simple: rectangular/trapezoidal shape
  const depth = length * 0.18 * sizeScale * (0.9 + rng() * 0.2);
  const knobWidth = length * 0.25 * sizeScale * (0.9 + rng() * 0.2);
  
  const isTab = rng() > 0.5;
  const d = isTab ? -1 : 1;
  
  const endX = startX + length;
  const midX = startX + length / 2 + positionOffset;
  
  const knobStartX = midX - knobWidth / 2;
  const knobEndX = midX + knobWidth / 2;
  const knobY = y + depth * d;
  
  const fwd: string[] = [];
  
  fwd.push(`L ${knobStartX.toFixed(2)} ${y.toFixed(2)}`);
  fwd.push(`L ${knobStartX.toFixed(2)} ${knobY.toFixed(2)}`);  // Straight down
  fwd.push(`L ${knobEndX.toFixed(2)} ${knobY.toFixed(2)}`);    // Across
  fwd.push(`L ${knobEndX.toFixed(2)} ${y.toFixed(2)}`);        // Straight up
  fwd.push(`L ${endX.toFixed(2)} ${y.toFixed(2)}`);
  
  const rev: string[] = [];
  rev.push(`L ${knobEndX.toFixed(2)} ${y.toFixed(2)}`);
  rev.push(`L ${knobEndX.toFixed(2)} ${knobY.toFixed(2)}`);
  rev.push(`L ${knobStartX.toFixed(2)} ${knobY.toFixed(2)}`);
  rev.push(`L ${knobStartX.toFixed(2)} ${y.toFixed(2)}`);
  rev.push(`L ${startX.toFixed(2)} ${y.toFixed(2)}`);
  
  return { pathSegment: fwd.join(' '), reversed: rev.join(' '), isTab };
}

/**
 * Generate vertical edge with knob (top to bottom)
 * Classic puzzle knob: narrow neck + round bulb
 * @param difficulty 0-100: affects knob position and shape variation
 * @param knobParams Optional parameters for knob customization
 */
function generateVerticalEdge(
  x: number,
  startY: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const knobStyle = knobParams.knobStyle ?? 'classic';
  
  // Delegate to style-specific generator
  switch (knobStyle) {
    case 'organic':
      return generateVerticalEdgeOrganic(x, startY, length, seed, difficulty, knobParams);
    case 'simple':
      return generateVerticalEdgeSimple(x, startY, length, seed, difficulty, knobParams);
    case 'classic':
    default:
      return generateVerticalEdgeClassic(x, startY, length, seed, difficulty, knobParams);
  }
}

function generateVerticalEdgeClassic(
  x: number,
  startY: number,
  length: number,
  seed: number,
  difficulty: number = 0,
  knobParams: KnobParameters = {}
): EdgeGeometry {
  const rng = createSeededRandom(seed);
  
  // Extract knob parameters with defaults
  const knobSizePct = knobParams.knobSizePct ?? 65;
  const knobRoundness = knobParams.knobRoundness ?? 0.85;
  const knobJitter = knobParams.knobJitter ?? 0.15;
  
  // Difficulty factor (0 to 1)
  const df = difficulty / 100;
  
  // Knob position offset (0 at easy, up to ±20% at max difficulty)
  const positionOffset = (rng() - 0.5) * 2 * df * 0.2 * length;
  
  // Knob size scaling based on knobSizePct
  const sizeScale = 0.7 + (knobSizePct - 40) / 50 * 0.6;
  
  // Knob parameters with difficulty-based variation and user controls
  const baseDepth = length * (0.18 + df * 0.08) * sizeScale;
  const jitterFactor = 1 + (rng() - 0.5) * knobJitter;
  const depthVariation = 0.9 + rng() * 0.2 + df * (rng() - 0.5) * 0.3;
  const depth = baseDepth * depthVariation * jitterFactor;
  
  const neckWidth = length * (0.10 + df * 0.04) * (0.9 + rng() * 0.2) * sizeScale * jitterFactor;
  const bulbRadius = length * (0.12 + df * 0.06) * (0.9 + rng() * 0.2) * sizeScale * knobRoundness * jitterFactor;
  
  // Determine tab or slot
  const isTab = rng() > 0.5;
  const d = isTab ? -1 : 1;  // Direction: -1 = left (tab), +1 = right (slot)
  
  const endY = startY + length;
  const midY = startY + length / 2 + positionOffset;  // Apply position offset
  
  // Key points
  const shoulderY = midY - neckWidth * 1.5;
  const neckStartY = midY - neckWidth / 2;
  const neckEndY = midY + neckWidth / 2;
  const shoulderEndY = midY + neckWidth * 1.5;
  
  const neckX = x + depth * 0.4 * d;
  const bulbCenterX = x + depth * d;
  
  // Forward path (top to bottom)
  const fwd: string[] = [];
  
  // 1. Straight to shoulder
  fwd.push(`L ${x.toFixed(2)} ${shoulderY.toFixed(2)}`);
  
  // 2. Shoulder curve to neck
  fwd.push(`C ${x.toFixed(2)} ${(shoulderY + neckWidth * 0.3).toFixed(2)} ${(x + depth * 0.1 * d).toFixed(2)} ${neckStartY.toFixed(2)} ${neckX.toFixed(2)} ${neckStartY.toFixed(2)}`);
  
  // 3. Neck to bulb (top of bulb)
  fwd.push(`C ${(neckX + bulbRadius * 0.6 * d).toFixed(2)} ${neckStartY.toFixed(2)} ${bulbCenterX.toFixed(2)} ${(midY - bulbRadius).toFixed(2)} ${bulbCenterX.toFixed(2)} ${midY.toFixed(2)}`);
  
  // 4. Bulb bottom
  fwd.push(`C ${bulbCenterX.toFixed(2)} ${(midY + bulbRadius).toFixed(2)} ${(neckX + bulbRadius * 0.6 * d).toFixed(2)} ${neckEndY.toFixed(2)} ${neckX.toFixed(2)} ${neckEndY.toFixed(2)}`);
  
  // 5. Neck to shoulder
  fwd.push(`C ${(x + depth * 0.1 * d).toFixed(2)} ${neckEndY.toFixed(2)} ${x.toFixed(2)} ${(shoulderEndY - neckWidth * 0.3).toFixed(2)} ${x.toFixed(2)} ${shoulderEndY.toFixed(2)}`);
  
  // 6. Straight to end
  fwd.push(`L ${x.toFixed(2)} ${endY.toFixed(2)}`);
  
  // Reversed path (bottom to top)
  const rev: string[] = [];
  
  rev.push(`L ${x.toFixed(2)} ${shoulderEndY.toFixed(2)}`);
  rev.push(`C ${x.toFixed(2)} ${(shoulderEndY - neckWidth * 0.3).toFixed(2)} ${(x + depth * 0.1 * d).toFixed(2)} ${neckEndY.toFixed(2)} ${neckX.toFixed(2)} ${neckEndY.toFixed(2)}`);
  rev.push(`C ${(neckX + bulbRadius * 0.6 * d).toFixed(2)} ${neckEndY.toFixed(2)} ${bulbCenterX.toFixed(2)} ${(midY + bulbRadius).toFixed(2)} ${bulbCenterX.toFixed(2)} ${midY.toFixed(2)}`);
  rev.push(`C ${bulbCenterX.toFixed(2)} ${(midY - bulbRadius).toFixed(2)} ${(neckX + bulbRadius * 0.6 * d).toFixed(2)} ${neckStartY.toFixed(2)} ${neckX.toFixed(2)} ${neckStartY.toFixed(2)}`);
  rev.push(`C ${(x + depth * 0.1 * d).toFixed(2)} ${neckStartY.toFixed(2)} ${x.toFixed(2)} ${(shoulderY + neckWidth * 0.3).toFixed(2)} ${x.toFixed(2)} ${shoulderY.toFixed(2)}`);
  rev.push(`L ${x.toFixed(2)} ${startY.toFixed(2)}`);
  
  return {
    pathSegment: fwd.join(' '),
    reversed: rev.join(' '),
    isTab,
  };
}
