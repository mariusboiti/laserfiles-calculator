/**
 * Validation and clamping utilities for BoxMaker
 * Ensures all inputs are safe, no NaN values, within bounds
 */

/**
 * Clamp a number between min and max
 */
export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Convert value to number with fallback
 */
export function toNumber(value: any, fallback: number): number {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return num;
}

/**
 * Sanitize shared box inputs with safe bounds
 */
export function sanitizeSharedInputs(inputs: {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  kerfMm: number;
}): typeof inputs {
  return {
    widthMm: clamp(toNumber(inputs.widthMm, 100), 20, 2000),
    depthMm: clamp(toNumber(inputs.depthMm, 80), 20, 2000),
    heightMm: clamp(toNumber(inputs.heightMm, 60), 20, 2000),
    thicknessMm: clamp(toNumber(inputs.thicknessMm, 3), 1, 20),
    kerfMm: clamp(toNumber(inputs.kerfMm, 0.15), 0, 1),
  };
}

/**
 * Sanitize finger width
 */
export function sanitizeFingerWidth(fingerW: number, fallback: number = 10): number {
  return clamp(toNumber(fingerW, fallback), 2, 100);
}

/**
 * Sanitize hinge finger width
 */
export function sanitizeHingeFingerWidth(hingeFingerW: number, fallback: number = 8): number {
  return clamp(toNumber(hingeFingerW, fallback), 2, 80);
}

/**
 * Sanitize clearance
 */
export function sanitizeClearance(clearance: number, fallback: number = 0.2): number {
  return clamp(toNumber(clearance, fallback), 0, 5);
}

/**
 * Validate inputs and return warnings (non-blocking)
 */
export function validateBoxInputs(inputs: {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  thicknessMm: number;
  kerfMm: number;
  fingerWidthMm: number;
}): string[] {
  const warnings: string[] = [];
  
  // Kerf vs thickness
  if (inputs.kerfMm > inputs.thicknessMm * 0.5) {
    warnings.push('Kerf is more than 50% of material thickness - may be too large');
  }
  
  // Finger width vs panel dimensions
  const minDim = Math.min(inputs.widthMm, inputs.depthMm, inputs.heightMm);
  if (inputs.fingerWidthMm > minDim / 3) {
    warnings.push('Finger width is large relative to smallest panel dimension');
  }
  
  // Minimum dimensions for finger joints
  const minRequired = inputs.fingerWidthMm * 3 + inputs.thicknessMm * 2;
  if (inputs.widthMm < minRequired || inputs.depthMm < minRequired || inputs.heightMm < minRequired) {
    warnings.push('Some dimensions may be too small for proper finger joints');
  }
  
  return warnings;
}

/**
 * Validate drawer-specific inputs
 */
export function validateDrawerInputs(inputs: {
  widthMm: number;
  thicknessMm: number;
  kerfMm: number;
  clearanceMm: number;
}): string[] {
  const warnings: string[] = [];
  
  // Clearance vs kerf
  if (inputs.clearanceMm < inputs.kerfMm) {
    warnings.push('Drawer clearance is less than kerf - drawer may bind');
  }
  
  // Check if drawer will fit
  const innerW = inputs.widthMm - 2 * inputs.thicknessMm;
  const drawerW = innerW - 2 * inputs.clearanceMm;
  if (drawerW <= 0) {
    warnings.push('Drawer width is zero or negative - increase box width or reduce clearance');
  }
  
  return warnings;
}
