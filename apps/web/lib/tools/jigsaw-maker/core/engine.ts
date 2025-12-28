/**
 * Jigsaw Engine - PathOps Boolean-Based Piece Generation
 * Applies seams to base rectangles using union/diff operations
 */

import type { PathOps } from './pathops/pathopsClient';
import { createRect } from './primitives';
import { generateSeam, getAllSeamKeys, type SeamConfig, type Seam } from './seams';

export interface EngineConfig {
  widthMm: number;
  heightMm: number;
  rows: number;
  columns: number;
  seed: number;
  
  // Knob parameters
  knobDepthRatio: number;
  knobWidthRatio: number;
  neckRatio: number;
  roundness: number;
}

export interface PiecePath {
  row: number;
  col: number;
  path: any;  // PathOps path object
}

/**
 * Generate all puzzle pieces using PathOps booleans
 */
export async function generatePieces(
  pathOps: PathOps,
  config: EngineConfig
): Promise<PiecePath[]> {
  const { widthMm, heightMm, rows, columns, seed } = config;
  
  const cellWidth = widthMm / columns;
  const cellHeight = heightMm / rows;
  
  // STEP 1: Create base rectangles for each cell
  const pieces: Map<string, any> = new Map();
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const x = c * cellWidth;
      const y = r * cellHeight;
      const rect = createRect(pathOps, x, y, cellWidth, cellHeight);
      pieces.set(`${r},${c}`, rect);
    }
  }
  
  // STEP 2: Generate all seams and apply to neighboring pieces
  const seamKeys = getAllSeamKeys(rows, columns);
  
  // Process vertical seams (between columns)
  for (const seamKey of seamKeys.vertical) {
    const [r, c] = seamKey.replace('V:', '').split(',').map(Number);
    
    const seamX = (c + 1) * cellWidth;
    const seamY = r * cellHeight;
    
    const seamConfig: SeamConfig = {
      seamX,
      seamY,
      seamLength: cellHeight,
      orientation: 'vertical',
      knobDepthRatio: config.knobDepthRatio,
      knobWidthRatio: config.knobWidthRatio,
      neckRatio: config.neckRatio,
      roundness: config.roundness,
      cellWidth,
      cellHeight,
      seed,
      seamKey,
    };
    
    const seam = generateSeam(pathOps, seamConfig);
    
    // Apply seam to both pieces
    const pieceAKey = `${r},${c}`;
    const pieceBKey = `${r},${c + 1}`;
    
    const pieceA = pieces.get(pieceAKey)!;
    const pieceB = pieces.get(pieceBKey)!;
    
    if (seam.tabOnFirst) {
      // Piece A gets tab (union), Piece B gets slot (diff)
      const newA = pathOps.union([pieceA, seam.shape]);
      const newB = pathOps.diff(pieceB, seam.shape);
      
      pathOps.delete(pieceA);
      pathOps.delete(pieceB);
      
      pieces.set(pieceAKey, newA);
      pieces.set(pieceBKey, newB);
    } else {
      // Piece A gets slot (diff), Piece B gets tab (union)
      const newA = pathOps.diff(pieceA, seam.shape);
      const newB = pathOps.union([pieceB, seam.shape]);
      
      pathOps.delete(pieceA);
      pathOps.delete(pieceB);
      
      pieces.set(pieceAKey, newA);
      pieces.set(pieceBKey, newB);
    }
    
    // Note: seam.shape will be reused, don't delete yet
  }
  
  // Process horizontal seams (between rows)
  for (const seamKey of seamKeys.horizontal) {
    const [r, c] = seamKey.replace('H:', '').split(',').map(Number);
    
    const seamX = c * cellWidth;
    const seamY = (r + 1) * cellHeight;
    
    const seamConfig: SeamConfig = {
      seamX,
      seamY,
      seamLength: cellWidth,
      orientation: 'horizontal',
      knobDepthRatio: config.knobDepthRatio,
      knobWidthRatio: config.knobWidthRatio,
      neckRatio: config.neckRatio,
      roundness: config.roundness,
      cellWidth,
      cellHeight,
      seed,
      seamKey,
    };
    
    const seam = generateSeam(pathOps, seamConfig);
    
    // Apply seam to both pieces
    const pieceAKey = `${r},${c}`;
    const pieceBKey = `${r + 1},${c}`;
    
    const pieceA = pieces.get(pieceAKey)!;
    const pieceB = pieces.get(pieceBKey)!;
    
    if (seam.tabOnFirst) {
      // Piece A gets tab (union), Piece B gets slot (diff)
      const newA = pathOps.union([pieceA, seam.shape]);
      const newB = pathOps.diff(pieceB, seam.shape);
      
      pathOps.delete(pieceA);
      pathOps.delete(pieceB);
      
      pieces.set(pieceAKey, newA);
      pieces.set(pieceBKey, newB);
    } else {
      // Piece A gets slot (diff), Piece B gets tab (union)
      const newA = pathOps.diff(pieceA, seam.shape);
      const newB = pathOps.union([pieceB, seam.shape]);
      
      pathOps.delete(pieceA);
      pathOps.delete(pieceB);
      
      pieces.set(pieceAKey, newA);
      pieces.set(pieceBKey, newB);
    }
    
    // Cleanup seam shape
    pathOps.delete(seam.shape);
  }
  
  // STEP 3: Simplify all pieces
  const result: PiecePath[] = [];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const key = `${r},${c}`;
      const piece = pieces.get(key)!;
      
      // Simplify to clean up geometry
      const simplified = pathOps.simplify(piece);
      pathOps.delete(piece);
      
      result.push({
        row: r,
        col: c,
        path: simplified,
      });
    }
  }
  
  return result;
}

/**
 * Apply kerf and clearance offset to pieces
 */
export function applyKerfClearance(
  pathOps: PathOps,
  pieces: PiecePath[],
  kerfMm: number,
  clearanceMm: number
): { pieces: PiecePath[]; warnings: string[] } {
  const warnings: string[] = [];
  const offsetDelta = (kerfMm / 2) - clearanceMm;
  
  if (Math.abs(offsetDelta) < 0.001) {
    // No offset needed
    return { pieces, warnings };
  }
  
  const offsetPieces: PiecePath[] = [];
  
  for (const piece of pieces) {
    try {
      const offset = pathOps.offset(piece.path, offsetDelta);
      const simplified = pathOps.simplify(offset);
      
      pathOps.delete(piece.path);
      pathOps.delete(offset);
      
      offsetPieces.push({
        row: piece.row,
        col: piece.col,
        path: simplified,
      });
    } catch (error) {
      console.error(`Failed to offset piece ${piece.row},${piece.col}:`, error);
      warnings.push(`Piece ${piece.row},${piece.col}: offset failed, using original`);
      
      offsetPieces.push(piece);
    }
  }
  
  return { pieces: offsetPieces, warnings };
}
