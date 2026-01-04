/**
 * Build puzzle pieces from shared edges
 */

import type { SharedEdgeMap } from './sharedEdgeGenerator';

export interface PieceFromEdgesConfig {
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
  edgeMap: SharedEdgeMap;
}

/**
 * Build a complete puzzle piece from shared edges
 */
export function buildPieceFromSharedEdges(config: PieceFromEdgesConfig): string {
  const { row, col, cellWidth, cellHeight, edgeMap } = config;
  
  const x = col * cellWidth;
  const y = row * cellHeight;
  
  const pathParts: string[] = [];
  
  // Start at top-left corner
  pathParts.push(`M ${x} ${y}`);
  
  // Top edge (horizontal edge above this piece)
  const topEdge = edgeMap.horizontal[row][col];
  if (row === 0) {
    // Border - use forward direction
    pathParts.push(topEdge.pathSegment);
  } else {
    // Interior - use reversed direction (we're going left to right, but edge was generated top to bottom)
    pathParts.push(topEdge.pathSegment);
  }
  
  // Right edge (vertical edge to the right of this piece)
  const rightEdge = edgeMap.vertical[row][col + 1];
  if (col === edgeMap.vertical[row].length - 2) {
    // Border - use forward direction
    pathParts.push(rightEdge.pathSegment);
  } else {
    // Interior - use forward direction
    pathParts.push(rightEdge.pathSegment);
  }
  
  // Bottom edge (horizontal edge below this piece)
  const bottomEdge = edgeMap.horizontal[row + 1][col];
  if (row === edgeMap.horizontal.length - 2) {
    // Border - use reversed direction (going right to left)
    pathParts.push(bottomEdge.reversed);
  } else {
    // Interior - use reversed direction
    pathParts.push(bottomEdge.reversed);
  }
  
  // Left edge (vertical edge to the left of this piece)
  const leftEdge = edgeMap.vertical[row][col];
  if (col === 0) {
    // Border - use reversed direction (going bottom to top)
    pathParts.push(leftEdge.reversed);
  } else {
    // Interior - use reversed direction
    pathParts.push(leftEdge.reversed);
  }
  
  // Close path
  pathParts.push('Z');
  
  return pathParts.join(' ');
}
