/**
 * Validation Utilities
 */

import type { JigsawSettings, ValidationResult } from '../../types/jigsawV2';
import { LIMITS } from '../../types/jigsawV2';

/**
 * Validate jigsaw settings
 */
export function validateSettings(settings: JigsawSettings): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate dimensions
  if (settings.widthMm < LIMITS.minWidthMm || settings.widthMm > LIMITS.maxWidthMm) {
    errors.push(`Width must be between ${LIMITS.minWidthMm}mm and ${LIMITS.maxWidthMm}mm`);
  }
  
  if (settings.heightMm < LIMITS.minHeightMm || settings.heightMm > LIMITS.maxHeightMm) {
    errors.push(`Height must be between ${LIMITS.minHeightMm}mm and ${LIMITS.maxHeightMm}mm`);
  }
  
  // Validate grid
  if (settings.rows < LIMITS.minRows || settings.rows > LIMITS.maxRows) {
    errors.push(`Rows must be between ${LIMITS.minRows} and ${LIMITS.maxRows}`);
  }
  
  if (settings.columns < LIMITS.minColumns || settings.columns > LIMITS.maxColumns) {
    errors.push(`Columns must be between ${LIMITS.minColumns} and ${LIMITS.maxColumns}`);
  }
  
  // Calculate piece size
  const cellWidth = settings.widthMm / settings.columns;
  const cellHeight = settings.heightMm / settings.rows;
  const minPieceSize = Math.min(cellWidth, cellHeight);
  
  if (minPieceSize < LIMITS.minPieceSizeMm) {
    warnings.push(`Pieces are very small (${minPieceSize.toFixed(1)}mm). Minimum recommended: ${LIMITS.minPieceSizeMm}mm. Knobs may be fragile.`);
  }
  
  // Validate kerf
  if (settings.kerfMm < 0) {
    errors.push('Kerf cannot be negative');
  }
  
  if (settings.kerfMm > LIMITS.maxKerfMm) {
    warnings.push(`High kerf offset (${settings.kerfMm}mm) may cause loose-fitting pieces`);
  }
  
  // Validate clearance
  if (Math.abs(settings.clearanceMm) > LIMITS.maxClearanceMm) {
    warnings.push(`High clearance (${settings.clearanceMm}mm) may cause fit issues`);
  }
  
  // Validate sheet fit for packed layout
  if (settings.layoutMode === 'packed') {
    const sheetDims = getSheetDimensions(settings);
    const usableWidth = sheetDims.widthMm - 2 * settings.marginMm;
    const usableHeight = sheetDims.heightMm - 2 * settings.marginMm;
    
    // Rough estimate: check if puzzle fits at all
    const puzzleArea = settings.widthMm * settings.heightMm;
    const usableArea = usableWidth * usableHeight;
    
    if (puzzleArea > usableArea * 0.9) {
      warnings.push('Puzzle may not fit in selected sheet with packed layout');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
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

/**
 * Generate warnings for specific conditions
 */
export function generateWarnings(settings: JigsawSettings): string[] {
  const warnings: string[] = [];
  
  const cellWidth = settings.widthMm / settings.columns;
  const cellHeight = settings.heightMm / settings.rows;
  const minPieceSize = Math.min(cellWidth, cellHeight);
  
  if (minPieceSize < 20) {
    warnings.push('Small pieces may be difficult to handle and assemble');
  }
  
  if (settings.rows * settings.columns > 100) {
    warnings.push('Large puzzle may take longer to generate and export');
  }
  
  const offsetDelta = (settings.kerfMm / 2) - settings.clearanceMm;
  if (Math.abs(offsetDelta) > minPieceSize * 0.1) {
    warnings.push('Large offset relative to piece size may cause issues');
  }
  
  return warnings;
}
