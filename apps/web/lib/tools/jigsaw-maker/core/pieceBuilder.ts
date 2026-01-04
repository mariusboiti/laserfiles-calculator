/**
 * Piece Builder - Constructs closed paths from shared edges
 */

import type { EdgeMap } from './edgeMap';
import { getTopEdge, getBottomEdge, getLeftEdge, getRightEdge } from './edgeMap';
import type { CubicBezier, Point } from './utils/svgPath';
import { PathBuilder, snapPoint } from './utils/svgPath';
import { transformSegments, translateMatrix, rotate90CW, multiplyMatrix } from './utils/transforms';

export interface PieceConfig {
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
  originX: number;  // World-space origin
  originY: number;
}

export interface Piece {
  row: number;
  col: number;
  path: string;  // SVG path string (closed)
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Build a single piece from edge map
 */
export function buildPiece(
  edgeMap: EdgeMap,
  config: PieceConfig
): Piece {
  const { row, col, cellWidth, cellHeight, originX, originY } = config;
  
  // Get all four edges (in local coordinates)
  const topEdge = getTopEdge(edgeMap, row, col);
  const rightEdge = getRightEdge(edgeMap, row, col);
  const bottomEdge = getBottomEdge(edgeMap, row, col);
  const leftEdge = getLeftEdge(edgeMap, row, col);
  
  // Build closed path
  const builder = new PathBuilder();
  
  // Start at top-left corner
  const startX = originX;
  const startY = originY;
  builder.moveTo(startX, startY);
  
  // TOP edge: horizontal, left to right
  addEdgeToPath(builder, topEdge.segments, {
    startX,
    startY,
    angle: 0,  // horizontal
    length: cellWidth,
  });
  
  // RIGHT edge: vertical, top to bottom (rotate 90° CW)
  const rightStartX = originX + cellWidth;
  const rightStartY = originY;
  addEdgeToPath(builder, rightEdge.segments, {
    startX: rightStartX,
    startY: rightStartY,
    angle: Math.PI / 2,  // 90° CW
    length: cellHeight,
  });
  
  // BOTTOM edge: horizontal, right to left (reversed)
  // Bottom edge is already inverted from edge map, so we add it forward
  const bottomStartX = originX + cellWidth;
  const bottomStartY = originY + cellHeight;
  addEdgeToPath(builder, bottomEdge.segments, {
    startX: bottomStartX,
    startY: bottomStartY,
    angle: Math.PI,  // 180° (right to left)
    length: cellWidth,
  });
  
  // LEFT edge: vertical, bottom to top (rotate 90° CCW, reversed)
  // Left edge is already inverted, so we add it forward
  const leftStartX = originX;
  const leftStartY = originY + cellHeight;
  addEdgeToPath(builder, leftEdge.segments, {
    startX: leftStartX,
    startY: leftStartY,
    angle: -Math.PI / 2,  // 90° CCW (bottom to top)
    length: cellHeight,
  });
  
  // Close path
  builder.close();
  
  // Calculate bounding box (approximate)
  const bbox = {
    x: originX - cellWidth * 0.15,  // Account for knob depth
    y: originY - cellHeight * 0.15,
    width: cellWidth * 1.3,
    height: cellHeight * 1.3,
  };
  
  return {
    row,
    col,
    path: builder.toString(),
    bbox,
  };
}

/**
 * Add edge segments to path with transformation
 */
function addEdgeToPath(
  builder: PathBuilder,
  segments: CubicBezier[],
  transform: {
    startX: number;
    startY: number;
    angle: number;
    length: number;
  }
): void {
  const { startX, startY, angle, length } = transform;
  
  if (segments.length === 0) {
    // Straight edge
    const endX = startX + length * Math.cos(angle);
    const endY = startY + length * Math.sin(angle);
    builder.lineTo(endX, endY);
    return;
  }
  
  // Transform segments to world coordinates
  // 1. Rotate by angle
  // 2. Translate to start position
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const matrix = {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    e: startX,
    f: startY,
  };
  
  const transformedSegments = transformSegments(segments, matrix);
  
  // Add transformed segments to path
  for (const seg of transformedSegments) {
    builder.cubicTo(
      seg.cp1.x, seg.cp1.y,
      seg.cp2.x, seg.cp2.y,
      seg.end.x, seg.end.y
    );
  }
  
  // Add final straight segment if needed
  const lastSeg = transformedSegments[transformedSegments.length - 1];
  if (lastSeg) {
    const expectedEndX = startX + length * cos;
    const expectedEndY = startY + length * sin;
    const currentEnd = snapPoint(lastSeg.end);
    const expectedEnd = snapPoint({ x: expectedEndX, y: expectedEndY });
    
    // Only add line if there's a gap
    const dx = expectedEnd.x - currentEnd.x;
    const dy = expectedEnd.y - currentEnd.y;
    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      builder.lineTo(expectedEndX, expectedEndY);
    }
  }
}

/**
 * Build all pieces from edge map
 */
export function buildAllPieces(
  edgeMap: EdgeMap,
  rows: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  offsetX: number = 0,
  offsetY: number = 0
): Piece[] {
  const pieces: Piece[] = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const piece = buildPiece(edgeMap, {
        row,
        col,
        cellWidth,
        cellHeight,
        originX: offsetX + col * cellWidth,
        originY: offsetY + row * cellHeight,
      });
      pieces.push(piece);
    }
  }
  
  return pieces;
}
