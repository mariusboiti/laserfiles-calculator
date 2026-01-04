/**
 * Unit conversion utilities
 * All path operations use internal units (U)
 * Tool state uses mm
 */

// Units per mm - higher = more precision
export const U_PER_MM = 20;

/**
 * Convert mm to internal units
 */
export function mmToU(mm: number): number {
  return mm * U_PER_MM;
}

/**
 * Convert internal units to mm
 */
export function uToMm(u: number): number {
  return u / U_PER_MM;
}

/**
 * Round to reasonable precision for SVG output
 */
export function roundU(u: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(u * factor) / factor;
}
