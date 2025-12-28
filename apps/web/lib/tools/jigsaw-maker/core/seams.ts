/**
 * Seam Generator - PathOps Boolean-Based Knobs
 * Creates tab/slot shapes using only circles, capsules, and boolean operations
 */

import type { PathOps } from './pathops/pathopsClient';
import { createCircle, createCapsule, createRect } from './primitives';
import { createSeededRandom, hashString } from './utils/rng';

export interface SeamConfig {
  // Seam position and dimensions
  seamX: number;           // X position of seam line
  seamY: number;           // Y position of seam line
  seamLength: number;      // Length along the seam
  orientation: 'vertical' | 'horizontal';
  
  // Knob parameters
  knobDepthRatio: number;  // Default 0.28
  knobWidthRatio: number;  // Default 0.42
  neckRatio: number;       // Default 0.18
  roundness: number;       // Default 1.0 (perfect circles)
  
  // Cell dimensions (for clamping)
  cellWidth: number;
  cellHeight: number;
  
  // Random seed
  seed: number;
  seamKey: string;
}

export interface Seam {
  shape: any;              // PathOps path object
  tabOnFirst: boolean;     // true = tab on first piece, slot on second
  seamKey: string;
}

/**
 * Generate a seam shape using PathOps primitives
 */
export function generateSeam(pathOps: PathOps, config: SeamConfig): Seam {
  const {
    seamX,
    seamY,
    seamLength,
    orientation,
    knobDepthRatio,
    knobWidthRatio,
    neckRatio,
    roundness,
    cellWidth,
    cellHeight,
    seed,
    seamKey,
  } = config;
  
  // Create seeded random for this seam
  const seamSeed = seed + hashString(seamKey);
  const rng = createSeededRandom(seamSeed);
  
  // Determine tab side
  const tabOnFirst = rng() < 0.5;
  
  // Calculate knob dimensions
  const minDim = Math.min(cellWidth, cellHeight);
  const depth = knobDepthRatio * minDim;
  const bulbWidth = knobWidthRatio * seamLength;
  const neckWidth = neckRatio * seamLength;
  
  // Apply controlled randomness
  const depthVar = 0.92 + rng() * 0.16; // ±8%
  const bulbVar = 0.94 + rng() * 0.12;  // ±6%
  const neckVar = 0.95 + rng() * 0.10;  // ±5%
  
  const finalDepth = depth * depthVar;
  const finalBulbWidth = bulbWidth * bulbVar;
  const finalNeckWidth = neckWidth * neckVar;
  
  // Build knob shape
  let knobShape: any;
  
  if (orientation === 'vertical') {
    // Vertical seam: knob extends horizontally (left/right)
    knobShape = buildVerticalSeamKnob(
      pathOps,
      seamX,
      seamY + seamLength / 2, // Center Y
      finalDepth,
      finalBulbWidth,
      finalNeckWidth,
      roundness
    );
  } else {
    // Horizontal seam: knob extends vertically (up/down)
    knobShape = buildHorizontalSeamKnob(
      pathOps,
      seamX + seamLength / 2, // Center X
      seamY,
      finalDepth,
      finalBulbWidth,
      finalNeckWidth,
      roundness
    );
  }
  
  return {
    shape: knobShape,
    tabOnFirst,
    seamKey,
  };
}

/**
 * Build knob for vertical seam (extends horizontally)
 */
function buildVerticalSeamKnob(
  pathOps: PathOps,
  seamX: number,
  centerY: number,
  depth: number,
  bulbWidth: number,
  neckWidth: number,
  roundness: number
): any {
  // Bulb: circle centered at (seamX + depth/2, centerY)
  const bulbRadius = (bulbWidth / 2) * roundness;
  const bulbCenterX = seamX + depth / 2;
  
  const bulb = createCircle(pathOps, bulbCenterX, centerY, bulbRadius);
  
  // Neck: capsule connecting seam to bulb
  const neckLength = depth / 2;
  const neckRadius = neckWidth / 2;
  const neckCenterX = seamX + neckLength / 2;
  
  const neck = createCapsule(
    pathOps,
    neckCenterX,
    centerY,
    neckLength,
    neckWidth,
    'horizontal'
  );
  
  // Union bulb and neck
  const knob = pathOps.union([bulb, neck]);
  
  // Cleanup
  pathOps.delete(bulb);
  pathOps.delete(neck);
  
  // Clip to seam window (prevent knob from extending too far)
  const windowWidth = depth * 1.2;
  const windowHeight = bulbWidth * 1.1;
  const window = createRect(
    pathOps,
    seamX - windowWidth * 0.1,
    centerY - windowHeight / 2,
    windowWidth,
    windowHeight
  );
  
  const clipped = pathOps.intersect(knob, window);
  
  // Cleanup
  pathOps.delete(knob);
  pathOps.delete(window);
  
  return clipped;
}

/**
 * Build knob for horizontal seam (extends vertically)
 */
function buildHorizontalSeamKnob(
  pathOps: PathOps,
  centerX: number,
  seamY: number,
  depth: number,
  bulbWidth: number,
  neckWidth: number,
  roundness: number
): any {
  // Bulb: circle centered at (centerX, seamY + depth/2)
  const bulbRadius = (bulbWidth / 2) * roundness;
  const bulbCenterY = seamY + depth / 2;
  
  const bulb = createCircle(pathOps, centerX, bulbCenterY, bulbRadius);
  
  // Neck: capsule connecting seam to bulb
  const neckLength = depth / 2;
  const neckRadius = neckWidth / 2;
  const neckCenterY = seamY + neckLength / 2;
  
  const neck = createCapsule(
    pathOps,
    centerX,
    neckCenterY,
    neckWidth,
    neckLength,
    'vertical'
  );
  
  // Union bulb and neck
  const knob = pathOps.union([bulb, neck]);
  
  // Cleanup
  pathOps.delete(bulb);
  pathOps.delete(neck);
  
  // Clip to seam window
  const windowWidth = bulbWidth * 1.1;
  const windowHeight = depth * 1.2;
  const window = createRect(
    pathOps,
    centerX - windowWidth / 2,
    seamY - windowHeight * 0.1,
    windowWidth,
    windowHeight
  );
  
  const clipped = pathOps.intersect(knob, window);
  
  // Cleanup
  pathOps.delete(knob);
  pathOps.delete(window);
  
  return clipped;
}

/**
 * Get all seam keys for a puzzle grid
 */
export function getAllSeamKeys(rows: number, columns: number): {
  vertical: string[];
  horizontal: string[];
} {
  const vertical: string[] = [];
  const horizontal: string[] = [];
  
  // Vertical seams: between columns
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns - 1; c++) {
      vertical.push(`V:${r},${c}`);
    }
  }
  
  // Horizontal seams: between rows
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < columns; c++) {
      horizontal.push(`H:${r},${c}`);
    }
  }
  
  return { vertical, horizontal };
}
