/**
 * Packed Grid Layout Mode
 * Arranges pieces in a grid to optimize sheet usage
 */

import type { PieceInfo, JigsawSettings } from '../../types/jigsawV2';

export interface PackResult {
  pieces: PieceInfo[];
  fits: boolean;
}

/**
 * Pack pieces in a grid layout
 */
export function packedGridLayout(
  pieces: PieceInfo[],
  settings: JigsawSettings
): PackResult {
  const sheetDims = getSheetDimensions(settings);
  const usableWidth = sheetDims.widthMm - 2 * settings.marginMm;
  const usableHeight = sheetDims.heightMm - 2 * settings.marginMm;
  
  // Calculate max piece dimensions
  let maxWidth = 0;
  let maxHeight = 0;
  for (const piece of pieces) {
    maxWidth = Math.max(maxWidth, piece.bbox.width);
    maxHeight = Math.max(maxHeight, piece.bbox.height);
  }
  
  // Add gap
  const cellWidth = maxWidth + settings.gapMm;
  const cellHeight = maxHeight + settings.gapMm;
  
  // Calculate grid dimensions
  const cols = Math.floor(usableWidth / cellWidth);
  const rows = Math.ceil(pieces.length / cols);
  
  // Check if it fits
  const fits = rows * cellHeight <= usableHeight;
  
  // Position pieces in grid
  const packedPieces: PieceInfo[] = pieces.map((piece, index) => {
    const gridCol = index % cols;
    const gridRow = Math.floor(index / cols);
    
    const x = settings.marginMm + gridCol * cellWidth;
    const y = settings.marginMm + gridRow * cellHeight;
    
    return {
      ...piece,
      position: { x, y },
    };
  });
  
  return {
    pieces: packedPieces,
    fits,
  };
}

/**
 * Get sheet dimensions from settings
 */
function getSheetDimensions(settings: JigsawSettings): { widthMm: number; heightMm: number } {
  if (settings.sheetPreset === 'custom') {
    return {
      widthMm: settings.customSheetWidth || 500,
      heightMm: settings.customSheetHeight || 500,
    };
  }
  
  const presets: Record<string, { widthMm: number; heightMm: number }> = {
    'glowforge-basic': { widthMm: 495, heightMm: 279 },
    'glowforge-pro': { widthMm: 838, heightMm: 495 },
    'xtool-d1': { widthMm: 400, heightMm: 400 },
    '300x400': { widthMm: 300, heightMm: 400 },
    '600x400': { widthMm: 600, heightMm: 400 },
  };
  
  return presets[settings.sheetPreset] || { widthMm: 500, heightMm: 500 };
}
