/**
 * Layout validation for Ornament Layout Planner V2
 * Checks bounds, overlaps, and other layout issues
 */

import type { SheetLayout, PlacedItem, LayoutSettings } from '../types/layout';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Validate complete layout result
 */
export function validateLayout(
  sheets: SheetLayout[],
  settings: LayoutSettings
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const sheet of sheets) {
    const sheetValidation = validateSheet(sheet, settings);
    warnings.push(...sheetValidation.warnings);
    errors.push(...sheetValidation.errors);
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Validate single sheet
 */
function validateSheet(
  sheet: SheetLayout,
  settings: LayoutSettings
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check bounds for each item
  for (const item of sheet.items) {
    const boundsCheck = checkBounds(item, settings);
    if (!boundsCheck.valid) {
      errors.push(`Sheet ${sheet.sheetIndex}, item out of bounds: ${boundsCheck.error}`);
    }
  }

  // Check overlaps (skip if too many items)
  if (sheet.items.length <= 250) {
    const overlaps = checkOverlaps(sheet.items);
    if (overlaps.length > 0) {
      errors.push(`Sheet ${sheet.sheetIndex}: ${overlaps.length} overlapping items detected`);
    }
  } else {
    warnings.push(`Sheet ${sheet.sheetIndex}: Overlap check skipped (too many items: ${sheet.items.length})`);
  }

  return { valid: errors.length === 0, warnings, errors };
}

/**
 * Check if item is within sheet bounds
 */
function checkBounds(
  item: PlacedItem,
  settings: LayoutSettings
): { valid: boolean; error?: string } {
  const { x, y, w, h } = item;
  const { sheetW, sheetH, margin } = settings;

  if (x < margin) {
    return { valid: false, error: `x=${x.toFixed(2)} < margin=${margin}` };
  }

  if (y < margin) {
    return { valid: false, error: `y=${y.toFixed(2)} < margin=${margin}` };
  }

  if (x + w > sheetW - margin) {
    return {
      valid: false,
      error: `x+w=${(x + w).toFixed(2)} > sheetW-margin=${sheetW - margin}`,
    };
  }

  if (y + h > sheetH - margin) {
    return {
      valid: false,
      error: `y+h=${(y + h).toFixed(2)} > sheetH-margin=${sheetH - margin}`,
    };
  }

  return { valid: true };
}

/**
 * Check for overlapping items (AABB collision detection)
 */
function checkOverlaps(items: PlacedItem[]): Array<{ i: number; j: number }> {
  const overlaps: Array<{ i: number; j: number }> = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (itemsOverlap(items[i], items[j])) {
        overlaps.push({ i, j });
      }
    }
  }

  return overlaps;
}

/**
 * Check if two items overlap (AABB)
 */
function itemsOverlap(a: PlacedItem, b: PlacedItem): boolean {
  const aRight = a.x + a.w;
  const aBottom = a.y + a.h;
  const bRight = b.x + b.w;
  const bBottom = b.y + b.h;

  // No overlap if one is completely to the left/right/above/below the other
  if (aRight <= b.x || bRight <= a.x || aBottom <= b.y || bBottom <= a.y) {
    return false;
  }

  return true;
}
