/**
 * Jigsaw Puzzle Generator V3 - Classic Knobs
 * 
 * Uses deterministic edge cache with classic knob geometry.
 * No duplicate edges in export.
 */

import type { JigsawInputs, PuzzlePiece, PuzzleResult } from '../types/jigsaw';
import { EdgeCache } from './edgeCache';
import type { EdgeParams } from './edgeClassic';

/**
 * Build a single piece path from cached edges
 */
function buildPiecePathV3(
  row: number,
  col: number,
  cellW: number,
  cellH: number,
  marginMm: number,
  edgeCache: EdgeCache
): string {
  const x0 = marginMm + col * cellW;
  const y0 = marginMm + row * cellH;
  
  const fmt = (n: number) => n.toFixed(4);
  
  // Start at top-left corner
  let path = `M ${fmt(x0)} ${fmt(y0)} `;
  
  // TOP edge (forward, horizontal)
  const topEdge = edgeCache.getTopEdge(row, col);
  path += topEdge.shape.d + ' ';
  
  // RIGHT edge (forward, vertical - need to rotate)
  const rightEdge = edgeCache.getRightEdge(row, col);
  // Transform: rotate 90° clockwise around current point
  // Current point is (x0 + cellW, y0)
  const rightPath = transformVerticalEdge(rightEdge.shape.d, cellW, cellH, 'down');
  path += rightPath + ' ';
  
  // BOTTOM edge (reversed + inverted, horizontal)
  const bottomEdge = edgeCache.getBottomEdge(row, col);
  path += bottomEdge.shape.d + ' ';
  
  // LEFT edge (reversed + inverted, vertical - need to rotate)
  const leftEdge = edgeCache.getLeftEdge(row, col);
  const leftPath = transformVerticalEdge(leftEdge.shape.d, 0, cellH, 'up');
  path += leftPath + ' ';
  
  // Close path
  path += 'Z';
  
  return path;
}

/**
 * Transform a vertical edge path
 * Vertical edges are generated horizontally and need rotation
 */
function transformVerticalEdge(
  d: string,
  offsetX: number,
  length: number,
  direction: 'down' | 'up'
): string {
  // Parse path and rotate 90° 
  // For 'down': (x,y) -> (offsetX - y, x)
  // For 'up': (x,y) -> (offsetX + y, length - x)
  
  if (direction === 'down') {
    // Rotate 90° clockwise
    return d.replace(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, (match, x, y) => {
      const newX = offsetX - parseFloat(y);
      const newY = parseFloat(x);
      return `${newX.toFixed(4)} ${newY.toFixed(4)}`;
    });
  } else {
    // Rotate 90° counter-clockwise + reverse
    return d.replace(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/g, (match, x, y) => {
      const newX = offsetX + parseFloat(y);
      const newY = length - parseFloat(x);
      return `${newX.toFixed(4)} ${newY.toFixed(4)}`;
    });
  }
}

/**
 * Generate puzzle with V3 classic knobs
 */
export async function generatePuzzleV3(inputs: JigsawInputs): Promise<PuzzleResult> {
  const {
    widthMm,
    heightMm,
    rows,
    columns,
    randomSeed,
    knobSize = 0.75,
    roundness = 0.85,
    jitter = 0.18,
    flatRatio = 0.12,
    marginMm = 0,
  } = inputs;
  
  // Calculate cell dimensions
  const puzzleWidth = widthMm - 2 * marginMm;
  const puzzleHeight = heightMm - 2 * marginMm;
  const cellW = puzzleWidth / columns;
  const cellH = puzzleHeight / rows;
  
  // Edge parameters
  const edgeParams: EdgeParams = {
    cellW,
    cellH,
    knobSize,
    roundness,
    jitter,
    flatRatio,
    seed: randomSeed,
  };
  
  // Generate edge cache (all edges created once)
  const edgeCache = new EdgeCache(rows, columns, cellW, cellH, edgeParams);
  
  // Build all pieces
  const pieces: PuzzlePiece[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const path = buildPiecePathV3(r, c, cellW, cellH, marginMm, edgeCache);
      pieces.push({ row: r, col: c, path });
    }
  }
  
  // Generate clean export (no duplicate edges)
  const cutLayerSvg = generateCleanCutLayerV3(
    edgeCache,
    rows,
    columns,
    cellW,
    cellH,
    marginMm,
    widthMm,
    heightMm
  );
  
  // Full SVG
  const fullSvg = generateFullSvgV3(
    cutLayerSvg,
    widthMm,
    heightMm,
    rows,
    columns,
    randomSeed
  );
  
  // Warnings
  const warnings = edgeCache.getWarnings();
  
  return {
    pieces,
    cutLayerSvg,
    engraveLayerSvg: undefined,
    fullSvg,
    warnings,
  };
}

/**
 * Generate clean cut layer with no duplicate edges
 */
function generateCleanCutLayerV3(
  edgeCache: EdgeCache,
  rows: number,
  columns: number,
  cellW: number,
  cellH: number,
  marginMm: number,
  widthMm: number,
  heightMm: number
): string {
  const strokeWidth = 0.001;
  let paths = '';
  
  // 1. Outer border (single rectangle)
  const x0 = marginMm;
  const y0 = marginMm;
  const x1 = widthMm - marginMm;
  const y1 = heightMm - marginMm;
  
  const borderPath = `M ${x0.toFixed(4)} ${y0.toFixed(4)} L ${x1.toFixed(4)} ${y0.toFixed(4)} L ${x1.toFixed(4)} ${y1.toFixed(4)} L ${x0.toFixed(4)} ${y1.toFixed(4)} Z`;
  paths += `  <path d="${borderPath}" />\n`;
  
  // 2. Interior horizontal edges (each edge once)
  const horizontalEdges = edgeCache.getUniqueHorizontalInteriorEdges();
  for (const { row, col, edge } of horizontalEdges) {
    const x = marginMm + col * cellW;
    const y = marginMm + row * cellH;
    const edgePath = `M ${x.toFixed(4)} ${y.toFixed(4)} ${edge.shape.d}`;
    paths += `  <path d="${edgePath}" />\n`;
  }
  
  // 3. Interior vertical edges (each edge once)
  const verticalEdges = edgeCache.getUniqueVerticalInteriorEdges();
  for (const { row, col, edge } of verticalEdges) {
    const x = marginMm + col * cellW;
    const y = marginMm + row * cellH;
    // Rotate vertical edge 90° clockwise
    const rotatedPath = transformVerticalEdge(edge.shape.d, x, cellH, 'down');
    const edgePath = `M ${x.toFixed(4)} ${y.toFixed(4)} ${rotatedPath}`;
    paths += `  <path d="${edgePath}" />\n`;
  }
  
  return `<g id="CUT_LINES" fill="none" stroke="black" stroke-width="${strokeWidth}">\n${paths}</g>`;
}

/**
 * Generate full SVG document
 */
function generateFullSvgV3(
  cutLayerSvg: string,
  widthMm: number,
  heightMm: number,
  rows: number,
  columns: number,
  seed: number
): string {
  const pieceCount = rows * columns;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">
  <!-- Jigsaw Puzzle V3 - Classic Knobs -->
  <!-- Dimensions: ${widthMm}mm × ${heightMm}mm -->
  <!-- Grid: ${rows}×${columns} = ${pieceCount} pieces -->
  <!-- Seed: ${seed} -->
  ${cutLayerSvg}
</svg>`;
}
