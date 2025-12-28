/**
 * Edge Map - Shared Edge Generation
 * 
 * Each interior edge is generated ONCE and reused by both adjacent pieces.
 * This ensures no duplicate lines in the final output.
 */

import type { CubicBezier } from './utils/svgPath';
import { generateClassicKnob, generateStraightEdge, invertEdge } from './knobClassic';
import { createSeededRandom, hashString } from './utils/rng';

export interface EdgeMapConfig {
  rows: number;
  columns: number;
  cellWidth: number;
  cellHeight: number;
  seed: number;
}

export interface Edge {
  segments: CubicBezier[];  // Bezier segments in local coords (0,0) to (L,0)
  length: number;            // Edge length
  isTab: boolean;            // true = tab (outward), false = blank (inward)
  isBorder: boolean;         // true = border edge (straight)
}

export interface EdgeMap {
  horizontal: Edge[][];  // [row][col] - edges between rows
  vertical: Edge[][];    // [row][col] - edges between columns
}

/**
 * Generate complete edge map for puzzle
 */
export function generateEdgeMap(config: EdgeMapConfig): EdgeMap {
  const { rows, columns, cellWidth, cellHeight, seed } = config;
  
  // Horizontal edges: between row r and r+1, at column c
  // Total: (rows+1) x columns edges
  const horizontal: Edge[][] = [];
  for (let r = 0; r <= rows; r++) {
    horizontal[r] = [];
    for (let c = 0; c < columns; c++) {
      const isBorder = r === 0 || r === rows;
      horizontal[r][c] = generateEdge(
        cellWidth,
        isBorder,
        `H:${r}:${c}`,
        seed
      );
    }
  }
  
  // Vertical edges: between col c and c+1, at row r
  // Total: rows x (columns+1) edges
  const vertical: Edge[][] = [];
  for (let r = 0; r < rows; r++) {
    vertical[r] = [];
    for (let c = 0; c <= columns; c++) {
      const isBorder = c === 0 || c === columns;
      vertical[r][c] = generateEdge(
        cellHeight,
        isBorder,
        `V:${r}:${c}`,
        seed
      );
    }
  }
  
  return { horizontal, vertical };
}

/**
 * Generate a single edge
 */
function generateEdge(
  length: number,
  isBorder: boolean,
  edgeKey: string,
  baseSeed: number
): Edge {
  if (isBorder) {
    // Border edges are straight
    return {
      segments: generateStraightEdge(length),
      length,
      isTab: false,
      isBorder: true,
    };
  }
  
  // Interior edge: generate classic knob
  const edgeSeed = baseSeed + hashString(edgeKey);
  const rng = createSeededRandom(edgeSeed);
  
  // Randomly choose tab or blank
  const isTab = rng() > 0.5;
  const depthSign = isTab ? 1 : -1;
  
  const segments = generateClassicKnob({
    L: length,
    depthSign: depthSign as 1 | -1,
    seed: edgeSeed,
  });
  
  return {
    segments,
    length,
    isTab,
    isBorder: false,
  };
}

/**
 * Get edge for a piece's top side
 */
export function getTopEdge(edgeMap: EdgeMap, row: number, col: number): Edge {
  return edgeMap.horizontal[row][col];
}

/**
 * Get edge for a piece's bottom side (inverted from shared edge)
 */
export function getBottomEdge(edgeMap: EdgeMap, row: number, col: number): Edge {
  const sharedEdge = edgeMap.horizontal[row + 1][col];
  
  if (sharedEdge.isBorder) {
    return sharedEdge;
  }
  
  // Invert: reverse + flip Y (tab becomes blank, blank becomes tab)
  return {
    segments: invertEdge(sharedEdge.segments),
    length: sharedEdge.length,
    isTab: !sharedEdge.isTab,
    isBorder: false,
  };
}

/**
 * Get edge for a piece's left side
 */
export function getLeftEdge(edgeMap: EdgeMap, row: number, col: number): Edge {
  return edgeMap.vertical[row][col];
}

/**
 * Get edge for a piece's right side (inverted from shared edge)
 */
export function getRightEdge(edgeMap: EdgeMap, row: number, col: number): Edge {
  const sharedEdge = edgeMap.vertical[row][col + 1];
  
  if (sharedEdge.isBorder) {
    return sharedEdge;
  }
  
  // Invert: reverse + flip Y
  return {
    segments: invertEdge(sharedEdge.segments),
    length: sharedEdge.length,
    isTab: !sharedEdge.isTab,
    isBorder: false,
  };
}

/**
 * Get all unique interior edges for export (no duplicates)
 */
export function getUniqueInteriorEdges(edgeMap: EdgeMap, config: EdgeMapConfig): {
  horizontal: Array<{ row: number; col: number; edge: Edge }>;
  vertical: Array<{ row: number; col: number; edge: Edge }>;
} {
  const horizontal: Array<{ row: number; col: number; edge: Edge }> = [];
  const vertical: Array<{ row: number; col: number; edge: Edge }> = [];
  
  // Interior horizontal edges (skip r=0 and r=rows)
  for (let r = 1; r < config.rows; r++) {
    for (let c = 0; c < config.columns; c++) {
      horizontal.push({
        row: r,
        col: c,
        edge: edgeMap.horizontal[r][c],
      });
    }
  }
  
  // Interior vertical edges (skip c=0 and c=columns)
  for (let r = 0; r < config.rows; r++) {
    for (let c = 1; c < config.columns; c++) {
      vertical.push({
        row: r,
        col: c,
        edge: edgeMap.vertical[r][c],
      });
    }
  }
  
  return { horizontal, vertical };
}
