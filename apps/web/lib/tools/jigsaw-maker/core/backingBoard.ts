import type { BackingBoard } from '../types/jigsaw';
import { STROKE_WIDTH_MM } from '../config/defaults';

/**
 * Generate backing board SVG layer
 */
export function generateBackingBoardSvg(
  puzzleWidth: number,
  puzzleHeight: number,
  backingConfig: BackingBoard
): string {
  if (!backingConfig.enabled) return '';

  const margin = backingConfig.marginMm;
  const boardWidth = puzzleWidth + margin * 2;
  const boardHeight = puzzleHeight + margin * 2;
  
  // Outer rectangle
  const outerRect = `<rect x="${-margin}" y="${-margin}" width="${boardWidth}" height="${boardHeight}" />`;
  
  // Inner cutout (puzzle outline)
  const innerRect = `<rect x="0" y="0" width="${puzzleWidth}" height="${puzzleHeight}" />`;
  
  // Hanging holes (2 circles at top center of board)
  let hangingHoles = '';
  if (backingConfig.hangingHoles) {
    const holeRadius = backingConfig.hangingHoleDiameter / 2;
    const holeY = -margin + backingConfig.hangingHoleYOffset;
    const spacing = backingConfig.hangingHoleSpacing;
    
    hangingHoles = `
    <circle cx="${puzzleWidth / 2 - spacing / 2}" cy="${holeY}" r="${holeRadius}" />
    <circle cx="${puzzleWidth / 2 + spacing / 2}" cy="${holeY}" r="${holeRadius}" />`;
  }
  
  // Magnet holes (4 circles at corners of board)
  let magnetHoles = '';
  if (backingConfig.magnetHoles) {
    const holeRadius = backingConfig.magnetHoleDiameter / 2;
    const inset = backingConfig.magnetHoleInset;
    
    magnetHoles = `
    <circle cx="${-margin + inset}" cy="${-margin + inset}" r="${holeRadius}" />
    <circle cx="${puzzleWidth + margin - inset}" cy="${-margin + inset}" r="${holeRadius}" />
    <circle cx="${-margin + inset}" cy="${puzzleHeight + margin - inset}" r="${holeRadius}" />
    <circle cx="${puzzleWidth + margin - inset}" cy="${puzzleHeight + margin - inset}" r="${holeRadius}" />`;
  }
  
  return `<g id="CUT_BACKING" fill="none" stroke="#0000FF" stroke-width="${STROKE_WIDTH_MM}">
  ${outerRect}
  ${innerRect}${hangingHoles}${magnetHoles}
</g>`;
}

/**
 * Generate piece numbering SVG layer (ENGRAVE_BACK)
 */
export function generatePieceNumberingSvg(
  rows: number,
  columns: number,
  pieceWidth: number,
  pieceHeight: number
): string {
  const fontSize = Math.min(pieceWidth, pieceHeight) * 0.15; // 15% of smaller dimension
  let textElements = '';
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * pieceWidth + pieceWidth / 2;
      const y = row * pieceHeight + pieceHeight / 2;
      
      // Convert row to letter (A, B, C...)
      const rowLetter = String.fromCharCode(65 + row);
      const colNumber = col + 1;
      const label = `${rowLetter}${colNumber}`;
      
      textElements += `
  <text x="${x.toFixed(2)}" y="${y.toFixed(2)}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize.toFixed(2)}" 
        text-anchor="middle" 
        dominant-baseline="middle"
        fill="#000000">${label}</text>`;
    }
  }
  
  return `<g id="ENGRAVE_BACK">${textElements}
</g>`;
}
