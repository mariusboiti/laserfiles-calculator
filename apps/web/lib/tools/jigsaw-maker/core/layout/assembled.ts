/**
 * Assembled Layout Mode
 * Pieces remain in their original assembled positions
 */

import type { PieceInfo } from '../../types/jigsawV2';
import type { JigsawSettings } from '../../types/jigsawV2';

/**
 * Apply assembled layout (pieces stay in original positions)
 */
export function assembledLayout(
  pieces: PieceInfo[],
  settings: JigsawSettings
): PieceInfo[] {
  // In assembled mode, pieces are already in correct positions
  // We just need to ensure they're positioned correctly
  
  return pieces.map(piece => ({
    ...piece,
    // Position is already set from piece builder
    position: {
      x: piece.bbox.x,
      y: piece.bbox.y,
    },
  }));
}
