/**
 * Offset calculation logic for Inlay Offset Calculator
 * Clear formulas for positive (inlay) and negative (base) offsets
 */

export interface OffsetResult {
  baseOffset: number;
  totalOffset: number;
  positiveOffset: number;
  negativeOffset: number;
  warnings: string[];
}

/**
 * Calculate inlay offsets
 * 
 * Formula:
 * - baseOffset = kerf / 2
 * - totalOffset = baseOffset + extraClearance
 * - positiveOffset = +totalOffset (outward for inlay piece)
 * - negativeOffset = -totalOffset (inward for base cutout)
 */
export function calculateOffsets(config: {
  materialThickness: number;
  kerf: number;
  extraClearance: number;
}): OffsetResult {
  const { materialThickness, kerf, extraClearance } = config;
  
  const warnings: string[] = [];
  
  // Core calculation
  const baseOffset = kerf / 2;
  const totalOffset = baseOffset + extraClearance;
  
  // Positive offset (inlay piece) - offset OUTWARD
  const positiveOffset = totalOffset;
  
  // Negative offset (base cutout) - offset INWARD
  const negativeOffset = -totalOffset;
  
  // Validation warnings
  if (kerf > materialThickness) {
    warnings.push('Kerf larger than material thickness (unlikely)');
  }
  
  if (extraClearance < 0) {
    warnings.push('Negative clearance may cause tight fit');
  }
  
  if (Math.abs(totalOffset) < 0.05) {
    warnings.push('Total offset very small – test cut recommended');
  }
  
  return {
    baseOffset,
    totalOffset,
    positiveOffset,
    negativeOffset,
    warnings,
  };
}

/**
 * Format offset for display
 */
export function formatOffset(offset: number, unit: string = 'mm'): string {
  const sign = offset >= 0 ? '+' : '';
  return `${sign}${offset.toFixed(3)}${unit}`;
}

/**
 * Generate copy text for offsets
 */
export function generateCopyText(result: OffsetResult, unit: string = 'mm'): string {
  return `Positive offset: ${formatOffset(result.positiveOffset, unit)}\nNegative offset: ${formatOffset(result.negativeOffset, unit)}`;
}
