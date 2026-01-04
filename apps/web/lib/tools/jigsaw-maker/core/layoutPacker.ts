import type { PuzzlePiece } from '../types/jigsaw';

export interface PackedPiece extends PuzzlePiece {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pack puzzle pieces into a material sheet using simple row/column layout
 */
export function packPieces(
  pieces: PuzzlePiece[],
  pieceWidth: number,
  pieceHeight: number,
  sheetWidth: number,
  sheetHeight: number,
  marginMm: number,
  gapMm: number
): { packedPieces: PackedPiece[]; fitsInSheet: boolean } {
  const packedPieces: PackedPiece[] = [];
  
  // Add some padding for knobs that extend beyond piece bounds
  const knobPadding = Math.max(pieceWidth, pieceHeight) * 0.15;
  const effectivePieceWidth = pieceWidth + knobPadding * 2;
  const effectivePieceHeight = pieceHeight + knobPadding * 2;
  
  const availableWidth = sheetWidth - marginMm * 2;
  const availableHeight = sheetHeight - marginMm * 2;
  
  // Calculate how many pieces fit per row
  const piecesPerRow = Math.floor((availableWidth + gapMm) / (effectivePieceWidth + gapMm));
  
  if (piecesPerRow === 0) {
    return { packedPieces: [], fitsInSheet: false };
  }
  
  let currentX = marginMm;
  let currentY = marginMm;
  let piecesInCurrentRow = 0;
  let maxRowHeight = effectivePieceHeight;
  
  for (const piece of pieces) {
    // Check if we need to move to next row
    if (piecesInCurrentRow >= piecesPerRow) {
      currentX = marginMm;
      currentY += maxRowHeight + gapMm;
      piecesInCurrentRow = 0;
      maxRowHeight = effectivePieceHeight;
    }
    
    // Check if piece fits in sheet
    if (currentY + effectivePieceHeight > sheetHeight - marginMm) {
      return { packedPieces, fitsInSheet: false };
    }
    
    packedPieces.push({
      ...piece,
      x: currentX,
      y: currentY,
      width: effectivePieceWidth,
      height: effectivePieceHeight,
    });
    
    currentX += effectivePieceWidth + gapMm;
    piecesInCurrentRow++;
  }
  
  return { packedPieces, fitsInSheet: true };
}

/**
 * Transform piece path to new position (for packed layout)
 */
export function transformPiecePath(
  path: string,
  originalX: number,
  originalY: number,
  newX: number,
  newY: number
): string {
  const dx = newX - originalX;
  const dy = newY - originalY;
  
  if (dx === 0 && dy === 0) return path;
  
  // Parse and transform path commands
  // This is a simplified transform - for production, use a proper SVG path parser
  return `<g transform="translate(${dx.toFixed(4)}, ${dy.toFixed(4)})">${path}</g>`;
}
