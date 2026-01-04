/**
 * Shared Edge Map System - Classic Round Knobs (Ravensburger-style)
 * 
 * RULE: Each edge is generated ONCE and stored as SVG path commands.
 * Adjacent pieces share the EXACT SAME edge geometry.
 * When a piece needs the edge in reverse direction, we use the inverted path.
 * 
 * Knobs are symmetric, C1-smooth cubic Bezier curves with rounded bulbs.
 */

import type { KnobStyle } from '../types/jigsaw';
import { createSeededRandom, randomInRange } from './random';

export interface Point {
  x: number;
  y: number;
}

export interface EdgeGeometry {
  /** SVG path commands for forward direction (start -> end) */
  pathForward: string;
  /** SVG path commands for reverse direction (end -> start) */
  pathReverse: string;
  /** Whether this edge has a knob (false for border edges) */
  hasKnob: boolean;
  /** Direction of knob relative to forward direction (true = knob protrudes "outward") */
  knobOutward: boolean;
  /** Start point of edge */
  start: Point;
  /** End point of edge */
  end: Point;
}

export interface SharedEdgeMap {
  /** Horizontal edges: edges[row][col] is the edge between row and row+1 at column col */
  horizontal: EdgeGeometry[][];
  /** Vertical edges: edges[row][col] is the edge between col and col+1 at row row */
  vertical: EdgeGeometry[][];
}

/**
 * Generate all edges for the puzzle ONCE
 * Each edge is stored with forward and reverse SVG path commands
 */
export function generateSharedEdgeMap(
  rows: number,
  columns: number,
  pieceWidth: number,
  pieceHeight: number,
  knobStyle: KnobStyle,
  seed: number,
  kidsMode: boolean
): SharedEdgeMap {
  const random = createSeededRandom(seed);
  
  // Generate horizontal edges (rows+1 rows of edges, each row has 'columns' edges)
  const horizontal: EdgeGeometry[][] = [];
  for (let row = 0; row <= rows; row++) {
    horizontal[row] = [];
    for (let col = 0; col < columns; col++) {
      const isBorder = row === 0 || row === rows;
      const start: Point = { x: col * pieceWidth, y: row * pieceHeight };
      const end: Point = { x: (col + 1) * pieceWidth, y: row * pieceHeight };
      
      // Determine knob direction (random for internal edges)
      const knobOutward = isBorder ? false : random() > 0.5;
      const edgeSeed = Math.floor(random() * 1000000);
      
      // Generate edge geometry with selected knob style
      horizontal[row][col] = generateClassicRoundEdge(
        start,
        end,
        !isBorder,
        knobOutward,
        edgeSeed,
        kidsMode,
        knobStyle
      );
    }
  }
  
  // Generate vertical edges (rows rows of edges, each row has 'columns+1' edges)
  const vertical: EdgeGeometry[][] = [];
  for (let row = 0; row < rows; row++) {
    vertical[row] = [];
    for (let col = 0; col <= columns; col++) {
      const isBorder = col === 0 || col === columns;
      const start: Point = { x: col * pieceWidth, y: row * pieceHeight };
      const end: Point = { x: col * pieceWidth, y: (row + 1) * pieceHeight };
      
      // Determine knob direction (random for internal edges)
      const knobOutward = isBorder ? false : random() > 0.5;
      const edgeSeed = Math.floor(random() * 1000000);
      
      // Generate edge geometry with selected knob style
      vertical[row][col] = generateClassicRoundEdge(
        start,
        end,
        !isBorder,
        knobOutward,
        edgeSeed,
        kidsMode,
        knobStyle
      );
    }
  }
  
  return { horizontal, vertical };
}

/**
 * Generate a classic round knob edge (Ravensburger-style)
 * Uses cubic Bezier curves for smooth, C1-continuous contours
 * 
 * @param start - Start point of edge
 * @param end - End point of edge
 * @param hasKnob - Whether this edge has a knob
 * @param knobOutward - Direction of knob (+1 = tab, -1 = blank when building path)
 * @param seed - Random seed for small variations
 * @param kidsMode - Larger knobs for kids puzzles
 * @param knobStyle - Style of knob (classic, organic, simple)
 */
function generateClassicRoundEdge(
  start: Point,
  end: Point,
  hasKnob: boolean,
  knobOutward: boolean,
  seed: number,
  kidsMode: boolean,
  knobStyle: KnobStyle = 'classic'
): EdgeGeometry {
  const fmt = (n: number) => n.toFixed(4);
  
  if (!hasKnob) {
    // Straight edge for borders
    return {
      pathForward: `L ${fmt(end.x)} ${fmt(end.y)}`,
      pathReverse: `L ${fmt(start.x)} ${fmt(start.y)}`,
      hasKnob: false,
      knobOutward: false,
      start,
      end,
    };
  }
  
  // Calculate edge properties
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const L = Math.sqrt(dx * dx + dy * dy);
  
  // Unit vectors
  const ux = dx / L;  // Along edge
  const uy = dy / L;
  
  // Perpendicular vector (points "outward" when knobOutward is true)
  const depthSign = knobOutward ? 1 : -1;
  const px = -uy * depthSign;
  const py = ux * depthSign;
  
  // Create seeded random for controlled variation
  const random = createSeededRandom(seed);
  
  // Knob parameters based on style
  let neckWidth: number, neckHeight: number, headRadius: number;
  let variationRange: number;
  
  switch (knobStyle) {
    case 'organic':
      // Organic: more variation, irregular shapes
      neckWidth = 0.12 * L;
      neckHeight = 0.05 * L;
      headRadius = 0.11 * L;
      variationRange = 0.08; // More variation
      break;
      
    case 'simple':
      // Simple: smaller, more uniform knobs
      neckWidth = 0.16 * L;
      neckHeight = 0.03 * L;
      headRadius = 0.08 * L;
      variationRange = 0.02; // Less variation
      break;
      
    case 'classic':
    default:
      // Classic: balanced proportions
      neckWidth = 0.14 * L;
      neckHeight = 0.04 * L;
      headRadius = 0.10 * L;
      variationRange = 0.04;
      break;
  }
  
  // Small variation for natural look
  const variation = 1 + randomInRange(random, -variationRange, variationRange);
  const sizeMultiplier = kidsMode ? 1.3 : 1.0;
  
  const finalNeckWidth = neckWidth * sizeMultiplier;
  const finalNeckHeight = neckHeight * variation * sizeMultiplier;
  const finalHeadRadius = headRadius * variation * sizeMultiplier;
  
  // Key positions
  const mid = L / 2;
  const halfNeck = finalNeckWidth / 2;
  
  // Helper to create points
  const pt = (along: number, perp: number): Point => ({
    x: start.x + ux * along + px * perp,
    y: start.y + uy * along + py * perp,
  });
  
  // ============================================
  // CLASSIC PUZZLE KNOB (neck + round head)
  // ============================================
  //        ___
  //       /   \
  //      (     )  <- round head
  //       \   /
  //        | |    <- narrow neck
  //   ─────┘ └─────
  
  // Points on the edge
  const edgeStart = pt(0, 0);
  const neckLeftBase = pt(mid - halfNeck, 0);       // Left side of neck at edge
  const neckRightBase = pt(mid + halfNeck, 0);      // Right side of neck at edge
  const edgeEnd = pt(L, 0);
  
  // Points at top of neck (where head attaches)
  const neckLeftTop = pt(mid - halfNeck, finalNeckHeight);
  const neckRightTop = pt(mid + halfNeck, finalNeckHeight);
  
  // Head center is at top of neck
  const headCenterY = finalNeckHeight + finalHeadRadius;
  
  // Bezier magic number for circle approximation
  const k = 0.5523 * finalHeadRadius;
  
  // Build the path
  let pathFwd = '';
  
  // 1. Straight line to neck start
  pathFwd += `L ${fmt(neckLeftBase.x)} ${fmt(neckLeftBase.y)} `;
  
  // 2. Curve into neck - straight up to where head begins
  const neckEntryCtrl1 = pt(mid - halfNeck * 1.2, 0);
  const neckEntryCtrl2 = pt(mid - halfNeck, finalNeckHeight * 0.5);
  pathFwd += `C ${fmt(neckEntryCtrl1.x)} ${fmt(neckEntryCtrl1.y)} ${fmt(neckEntryCtrl2.x)} ${fmt(neckEntryCtrl2.y)} ${fmt(neckLeftTop.x)} ${fmt(neckLeftTop.y)} `;
  
  // 3. Transition from neck to head - curve outward to where circle begins
  const headLeft = pt(mid - finalHeadRadius, headCenterY);
  const headLeftCtrl1 = pt(mid - halfNeck, finalNeckHeight + finalHeadRadius * 0.15);
  const headLeftCtrl2 = pt(mid - finalHeadRadius * 0.8, headCenterY - k);
  pathFwd += `C ${fmt(headLeftCtrl1.x)} ${fmt(headLeftCtrl1.y)} ${fmt(headLeftCtrl2.x)} ${fmt(headLeftCtrl2.y)} ${fmt(headLeft.x)} ${fmt(headLeft.y)} `;
  
  // 4. Top left of head (quarter circle)
  const headTop = pt(mid, headCenterY + finalHeadRadius);
  const headTopLeftCtrl1 = pt(mid - finalHeadRadius, headCenterY + k);
  const headTopLeftCtrl2 = pt(mid - k, headCenterY + finalHeadRadius);
  pathFwd += `C ${fmt(headTopLeftCtrl1.x)} ${fmt(headTopLeftCtrl1.y)} ${fmt(headTopLeftCtrl2.x)} ${fmt(headTopLeftCtrl2.y)} ${fmt(headTop.x)} ${fmt(headTop.y)} `;
  
  // 5. Top right of head (quarter circle)
  const headRight = pt(mid + finalHeadRadius, headCenterY);
  const headTopRightCtrl1 = pt(mid + k, headCenterY + finalHeadRadius);
  const headTopRightCtrl2 = pt(mid + finalHeadRadius, headCenterY + k);
  pathFwd += `C ${fmt(headTopRightCtrl1.x)} ${fmt(headTopRightCtrl1.y)} ${fmt(headTopRightCtrl2.x)} ${fmt(headTopRightCtrl2.y)} ${fmt(headRight.x)} ${fmt(headRight.y)} `;
  
  // 6. Right side of head (curve back to neck) - stop exactly where head circle ends
  const headRightCtrl1 = pt(mid + finalHeadRadius * 0.8, headCenterY - k);
  const headRightCtrl2 = pt(mid + halfNeck, finalNeckHeight + finalHeadRadius * 0.15);
  pathFwd += `C ${fmt(headRightCtrl1.x)} ${fmt(headRightCtrl1.y)} ${fmt(headRightCtrl2.x)} ${fmt(headRightCtrl2.y)} ${fmt(neckRightTop.x)} ${fmt(neckRightTop.y)} `;
  
  // 7. Right side of neck down to edge - straight down
  const neckExitCtrl1 = pt(mid + halfNeck, finalNeckHeight * 0.5);
  const neckExitCtrl2 = pt(mid + halfNeck * 1.2, 0);
  pathFwd += `C ${fmt(neckExitCtrl1.x)} ${fmt(neckExitCtrl1.y)} ${fmt(neckExitCtrl2.x)} ${fmt(neckExitCtrl2.y)} ${fmt(neckRightBase.x)} ${fmt(neckRightBase.y)} `;
  
  // 8. Straight line to end
  pathFwd += `L ${fmt(edgeEnd.x)} ${fmt(edgeEnd.y)}`;
  
  // ============================================
  // REVERSE PATH (for adjacent piece)
  // ============================================
  let pathRev = '';
  
  // Go backwards through all points
  pathRev += `L ${fmt(neckRightBase.x)} ${fmt(neckRightBase.y)} `;
  pathRev += `C ${fmt(neckExitCtrl2.x)} ${fmt(neckExitCtrl2.y)} ${fmt(neckExitCtrl1.x)} ${fmt(neckExitCtrl1.y)} ${fmt(neckRightTop.x)} ${fmt(neckRightTop.y)} `;
  pathRev += `C ${fmt(headRightCtrl2.x)} ${fmt(headRightCtrl2.y)} ${fmt(headRightCtrl1.x)} ${fmt(headRightCtrl1.y)} ${fmt(headRight.x)} ${fmt(headRight.y)} `;
  pathRev += `C ${fmt(headTopRightCtrl2.x)} ${fmt(headTopRightCtrl2.y)} ${fmt(headTopRightCtrl1.x)} ${fmt(headTopRightCtrl1.y)} ${fmt(headTop.x)} ${fmt(headTop.y)} `;
  pathRev += `C ${fmt(headTopLeftCtrl2.x)} ${fmt(headTopLeftCtrl2.y)} ${fmt(headTopLeftCtrl1.x)} ${fmt(headTopLeftCtrl1.y)} ${fmt(headLeft.x)} ${fmt(headLeft.y)} `;
  pathRev += `C ${fmt(headLeftCtrl2.x)} ${fmt(headLeftCtrl2.y)} ${fmt(headLeftCtrl1.x)} ${fmt(headLeftCtrl1.y)} ${fmt(neckLeftTop.x)} ${fmt(neckLeftTop.y)} `;
  pathRev += `C ${fmt(neckEntryCtrl2.x)} ${fmt(neckEntryCtrl2.y)} ${fmt(neckEntryCtrl1.x)} ${fmt(neckEntryCtrl1.y)} ${fmt(neckLeftBase.x)} ${fmt(neckLeftBase.y)} `;
  pathRev += `L ${fmt(edgeStart.x)} ${fmt(edgeStart.y)}`;
  
  return {
    pathForward: pathFwd,
    pathReverse: pathRev,
    hasKnob: true,
    knobOutward,
    start,
    end,
  };
}

/**
 * Get forward path from edge geometry
 */
export function edgeToPathForward(edge: EdgeGeometry): string {
  return edge.pathForward;
}

/**
 * Get reverse path from edge geometry  
 */
export function edgeToPathReverse(edge: EdgeGeometry): string {
  return edge.pathReverse;
}

/**
 * Build a puzzle piece path from the shared edge map
 * 
 * @param row - Row index of the piece
 * @param col - Column index of the piece
 * @param edgeMap - The shared edge map
 * @returns SVG path string for this piece (closed path)
 */
export function buildPiecePath(
  row: number,
  col: number,
  pieceWidth: number,
  pieceHeight: number,
  edgeMap: SharedEdgeMap
): string {
  const fmt = (n: number) => n.toFixed(4);
  
  // Start at top-left corner
  const startX = col * pieceWidth;
  const startY = row * pieceHeight;
  
  let path = `M ${fmt(startX)} ${fmt(startY)} `;
  
  // TOP EDGE: horizontal[row][col], forward direction (left to right)
  const topEdge = edgeMap.horizontal[row][col];
  path += edgeToPathForward(topEdge) + ' ';
  
  // RIGHT EDGE: vertical[row][col+1], forward direction (top to bottom)
  const rightEdge = edgeMap.vertical[row][col + 1];
  path += edgeToPathForward(rightEdge) + ' ';
  
  // BOTTOM EDGE: horizontal[row+1][col], REVERSE direction (right to left)
  const bottomEdge = edgeMap.horizontal[row + 1][col];
  path += edgeToPathReverse(bottomEdge) + ' ';
  
  // LEFT EDGE: vertical[row][col], REVERSE direction (bottom to top)
  const leftEdge = edgeMap.vertical[row][col];
  path += edgeToPathReverse(leftEdge) + ' ';
  
  // Close the path
  path += 'Z';
  
  return path;
}
