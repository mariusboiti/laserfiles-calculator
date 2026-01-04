/**
 * Geometry Units - Integer scaling for Clipper operations
 * Clipper works with integers, so we scale mm to integer units
 */

// Scale factor: 1mm = 1000 integer units
export const UNITS_PER_MM = 1000;

// Convert mm to integer units
export const mmToU = (mm: number): number => Math.round(mm * UNITS_PER_MM);

// Convert integer units to mm
export const uToMm = (u: number): number => u / UNITS_PER_MM;

// Clamp flatness to valid range
export const clampFlatness = (flatnessMm: number): number => {
  return Math.max(0.05, Math.min(0.4, flatnessMm));
};

// Area threshold for cleanup (in integer units squared)
export const MIN_AREA_U2 = mmToU(0.5) * mmToU(1); // ~0.5 mm²

// Clean distance threshold (in integer units)
export const CLEAN_DISTANCE_U = mmToU(0.05); // 0.05mm
