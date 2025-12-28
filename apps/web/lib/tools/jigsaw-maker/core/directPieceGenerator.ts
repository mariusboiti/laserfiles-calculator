/**
 * Direct Puzzle Piece Generator
 * Generates puzzle pieces as complete SVG paths without PathOps
 * Used as fallback when PathOps WASM is not available
 */

import { createSeededRandom, hashString } from './utils/rng';

export interface DirectPieceConfig {
  row: number;
  col: number;
  cellWidth: number;
  cellHeight: number;
  rows: number;
  columns: number;
  seed: number;
  x: number;
  y: number;
}

/**
 * Generate a complete puzzle piece as SVG path
 */
export function generateDirectPiece(config: DirectPieceConfig): string {
  const { row, col, cellWidth, cellHeight, rows, columns, seed, x, y } = config;
  
  const pathParts: string[] = [];
  
  // Start at top-left corner
  pathParts.push(`M ${x} ${y}`);
  
  // Top edge
  if (row === 0) {
    // Border - straight line
    pathParts.push(`L ${x + cellWidth} ${y}`);
  } else {
    // Interior edge with knob
    const topEdge = generateEdgeWithKnob({
      startX: x,
      startY: y,
      endX: x + cellWidth,
      endY: y,
      length: cellWidth,
      orientation: 'horizontal',
      seed: seed + hashString(`H:${row - 1},${col}`),
      inverted: true, // Top edge is inverted
    });
    pathParts.push(topEdge);
  }
  
  // Right edge
  if (col === columns - 1) {
    // Border - straight line
    pathParts.push(`L ${x + cellWidth} ${y + cellHeight}`);
  } else {
    // Interior edge with knob
    const rightEdge = generateEdgeWithKnob({
      startX: x + cellWidth,
      startY: y,
      endX: x + cellWidth,
      endY: y + cellHeight,
      length: cellHeight,
      orientation: 'vertical',
      seed: seed + hashString(`V:${row},${col}`),
      inverted: false,
    });
    pathParts.push(rightEdge);
  }
  
  // Bottom edge
  if (row === rows - 1) {
    // Border - straight line
    pathParts.push(`L ${x} ${y + cellHeight}`);
  } else {
    // Interior edge with knob
    const bottomEdge = generateEdgeWithKnob({
      startX: x + cellWidth,
      startY: y + cellHeight,
      endX: x,
      endY: y + cellHeight,
      length: cellWidth,
      orientation: 'horizontal',
      seed: seed + hashString(`H:${row},${col}`),
      inverted: false,
    });
    pathParts.push(bottomEdge);
  }
  
  // Left edge
  if (col === 0) {
    // Border - straight line
    pathParts.push(`L ${x} ${y}`);
  } else {
    // Interior edge with knob
    const leftEdge = generateEdgeWithKnob({
      startX: x,
      startY: y + cellHeight,
      endX: x,
      endY: y,
      length: cellHeight,
      orientation: 'vertical',
      seed: seed + hashString(`V:${row},${col - 1}`),
      inverted: true, // Left edge is inverted
    });
    pathParts.push(leftEdge);
  }
  
  pathParts.push('Z');
  
  return pathParts.join(' ');
}

interface EdgeKnobConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  orientation: 'horizontal' | 'vertical';
  seed: number;
  inverted: boolean;
}

/**
 * Generate edge with knob using cubic Bezier curves
 */
function generateEdgeWithKnob(config: EdgeKnobConfig): string {
  const { startX, startY, endX, endY, length, orientation, seed, inverted } = config;
  
  const rng = createSeededRandom(seed);
  
  // Knob parameters (relative to edge length)
  const knobDepth = 0.28 * Math.min(length, length) * (0.92 + rng() * 0.16);
  const knobWidth = 0.42 * length * (0.94 + rng() * 0.12);
  const neckWidth = 0.18 * length * (0.95 + rng() * 0.10);
  
  // Determine if this edge has a tab (outward) or slot (inward)
  const isTab = rng() > 0.5;
  const depthSign = (isTab !== inverted) ? 1 : -1;
  
  const pathParts: string[] = [];
  
  if (orientation === 'horizontal') {
    // Horizontal edge (left to right or right to left)
    const direction = endX > startX ? 1 : -1;
    const edgeLength = Math.abs(endX - startX);
    
    // Start position
    const x1 = startX;
    const y1 = startY;
    
    // Knob center position (middle of edge)
    const knobCenterX = startX + (edgeLength / 2) * direction;
    const knobCenterY = startY;
    
    // First segment: straight to knob start
    const knobStartX = knobCenterX - (knobWidth / 2) * direction;
    pathParts.push(`L ${knobStartX} ${y1}`);
    
    // Knob geometry
    const knobY = knobCenterY - knobDepth * depthSign;
    
    // Neck in
    const neckInX = knobCenterX - (neckWidth / 2) * direction;
    const neckInY = knobY;
    pathParts.push(`C ${knobStartX} ${y1} ${knobStartX} ${neckInY} ${neckInX} ${neckInY}`);
    
    // Bulb
    const bulbTopX = knobCenterX;
    const bulbTopY = knobY;
    pathParts.push(`C ${neckInX} ${neckInY} ${bulbTopX - (knobWidth / 4) * direction} ${bulbTopY} ${bulbTopX} ${bulbTopY}`);
    
    // Bulb to neck out
    const neckOutX = knobCenterX + (neckWidth / 2) * direction;
    const neckOutY = knobY;
    pathParts.push(`C ${bulbTopX + (knobWidth / 4) * direction} ${bulbTopY} ${neckOutX} ${neckOutY} ${neckOutX} ${neckOutY}`);
    
    // Neck out to edge
    const knobEndX = knobCenterX + (knobWidth / 2) * direction;
    pathParts.push(`C ${neckOutX} ${neckOutY} ${knobEndX} ${y1} ${knobEndX} ${y1}`);
    
    // Final segment: straight to end
    pathParts.push(`L ${endX} ${endY}`);
    
  } else {
    // Vertical edge (top to bottom or bottom to top)
    const direction = endY > startY ? 1 : -1;
    const edgeLength = Math.abs(endY - startY);
    
    // Start position
    const x1 = startX;
    const y1 = startY;
    
    // Knob center position (middle of edge)
    const knobCenterX = startX;
    const knobCenterY = startY + (edgeLength / 2) * direction;
    
    // First segment: straight to knob start
    const knobStartY = knobCenterY - (knobWidth / 2) * direction;
    pathParts.push(`L ${x1} ${knobStartY}`);
    
    // Knob geometry
    const knobX = knobCenterX - knobDepth * depthSign;
    
    // Neck in
    const neckInX = knobX;
    const neckInY = knobCenterY - (neckWidth / 2) * direction;
    pathParts.push(`C ${x1} ${knobStartY} ${neckInX} ${knobStartY} ${neckInX} ${neckInY}`);
    
    // Bulb
    const bulbTopX = knobX;
    const bulbTopY = knobCenterY;
    pathParts.push(`C ${neckInX} ${neckInY} ${bulbTopX} ${bulbTopY - (knobWidth / 4) * direction} ${bulbTopX} ${bulbTopY}`);
    
    // Bulb to neck out
    const neckOutX = knobX;
    const neckOutY = knobCenterY + (neckWidth / 2) * direction;
    pathParts.push(`C ${bulbTopX} ${bulbTopY + (knobWidth / 4) * direction} ${neckOutX} ${neckOutY} ${neckOutX} ${neckOutY}`);
    
    // Neck out to edge
    const knobEndY = knobCenterY + (knobWidth / 2) * direction;
    pathParts.push(`C ${neckOutX} ${neckOutY} ${x1} ${knobEndY} ${x1} ${knobEndY}`);
    
    // Final segment: straight to end
    pathParts.push(`L ${endX} ${endY}`);
  }
  
  return pathParts.join(' ');
}
