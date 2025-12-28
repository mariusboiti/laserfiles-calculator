import type { SharedBoxInputs, HingedInputs, SlidingDrawerInputs } from './types';

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Calculate minimum dimension based on material thickness and finger size
 */
export function calculateMinDimension(thicknessMm: number, fingerWidthMm: number): number {
  // Minimum: 2 fingers + 2 thickness for walls
  return Math.max(fingerWidthMm * 3, thicknessMm * 4);
}

/**
 * Calculate recommended finger width based on dimensions
 */
export function calculateRecommendedFingerWidth(
  widthMm: number,
  depthMm: number,
  heightMm: number
): number {
  const avgDim = (widthMm + depthMm + heightMm) / 3;
  // Rule of thumb: finger width should be ~1/10 to 1/15 of average dimension
  const recommended = avgDim / 12;
  return Math.max(5, Math.min(20, Math.round(recommended)));
}

/**
 * Validate shared box inputs (common to all box types)
 */
export function validateSharedInputs(inputs: SharedBoxInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Dimension bounds
  if (inputs.widthMm < 10) errors.push('Width must be at least 10mm');
  if (inputs.depthMm < 10) errors.push('Depth must be at least 10mm');
  if (inputs.heightMm < 10) errors.push('Height must be at least 10mm');
  
  if (inputs.widthMm > 1000) warnings.push('Width exceeds 1000mm - may not fit on standard laser beds');
  if (inputs.depthMm > 1000) warnings.push('Depth exceeds 1000mm - may not fit on standard laser beds');
  if (inputs.heightMm > 500) warnings.push('Height exceeds 500mm - very tall box');

  // Thickness bounds
  if (inputs.thicknessMm < 1) errors.push('Material thickness must be at least 1mm');
  if (inputs.thicknessMm > 50) errors.push('Material thickness exceeds 50mm');
  if (inputs.thicknessMm > 10) warnings.push('Material thickness > 10mm is unusual for laser cutting');

  // Kerf bounds
  if (inputs.kerfMm < 0) errors.push('Kerf cannot be negative');
  if (inputs.kerfMm > 2) warnings.push('Kerf > 2mm is unusually large');
  if (inputs.kerfMm > inputs.thicknessMm) {
    errors.push('Kerf cannot exceed material thickness');
  }

  // Dimension vs thickness ratio
  const minDim = Math.min(inputs.widthMm, inputs.depthMm, inputs.heightMm);
  if (minDim < inputs.thicknessMm * 3) {
    warnings.push('Smallest dimension is less than 3× material thickness - box may be fragile');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate hinged box specific inputs
 */
export function validateHingedInputs(inputs: HingedInputs): ValidationResult {
  const sharedValidation = validateSharedInputs(inputs);
  const errors = [...sharedValidation.errors];
  const warnings = [...sharedValidation.warnings];

  // Finger width bounds
  if (inputs.jointFingerWidthMm < 3) errors.push('Joint finger width must be at least 3mm');
  if (inputs.jointFingerWidthMm > 50) errors.push('Joint finger width exceeds 50mm');

  if (!inputs.autoJointFingerCount) {
    const c = inputs.manualJointFingerCount;
    if (!c || !Number.isFinite(c)) {
      errors.push('Manual joint finger count is required');
    } else {
      const v = Math.floor(c);
      if (v < 3) errors.push('Manual joint finger count must be at least 3');
      if (v > 999) errors.push('Manual joint finger count exceeds 999');
    }
  }
  
  const recommendedFinger = calculateRecommendedFingerWidth(
    inputs.widthMm,
    inputs.depthMm,
    inputs.heightMm
  );
  if (inputs.jointFingerWidthMm < recommendedFinger * 0.5) {
    warnings.push(`Joint finger width is small. Recommended: ${recommendedFinger.toFixed(1)}mm`);
  }
  if (inputs.jointFingerWidthMm > recommendedFinger * 2) {
    warnings.push(`Joint finger width is large. Recommended: ${recommendedFinger.toFixed(1)}mm`);
  }

  // Hinge finger width
  if (inputs.hingeFingerWidthMm < 3) errors.push('Hinge finger width must be at least 3mm');
  if (inputs.hingeFingerWidthMm > 30) errors.push('Hinge finger width exceeds 30mm');

  // Hinge clearance
  if (inputs.hingeClearanceMm < 0) errors.push('Hinge clearance cannot be negative');
  if (inputs.hingeClearanceMm > 5) warnings.push('Hinge clearance > 5mm may be too loose');
  if (inputs.hingeClearanceMm < inputs.kerfMm) {
    warnings.push('Hinge clearance is less than kerf - hinge may bind');
  }

  // Hinge hole diameter
  if (inputs.hingeHoleDiameterMm < 2) errors.push('Hinge hole diameter must be at least 2mm');
  if (inputs.hingeHoleDiameterMm > inputs.thicknessMm * 2) {
    warnings.push('Hinge hole diameter is larger than 2× material thickness');
  }

  // Hinge hole inset
  if (inputs.hingeHoleInsetMm < inputs.thicknessMm) {
    warnings.push('Hinge hole inset is less than material thickness - may be too close to edge');
  }

  // Minimum dimensions check
  const minDim = calculateMinDimension(inputs.thicknessMm, inputs.jointFingerWidthMm);
  if (inputs.widthMm < minDim) {
    errors.push(`Width too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }
  if (inputs.depthMm < minDim) {
    errors.push(`Depth too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }
  if (inputs.heightMm < minDim) {
    errors.push(`Height too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate sliding drawer box specific inputs
 */
export function validateSlidingDrawerInputs(inputs: SlidingDrawerInputs): ValidationResult {
  const sharedValidation = validateSharedInputs(inputs);
  const errors = [...sharedValidation.errors];
  const warnings = [...sharedValidation.warnings];

  // Finger width bounds
  if (inputs.fingerWidthMm < 3) errors.push('Finger width must be at least 3mm');
  if (inputs.fingerWidthMm > 50) errors.push('Finger width exceeds 50mm');

  const recommendedFinger = calculateRecommendedFingerWidth(
    inputs.widthMm,
    inputs.depthMm,
    inputs.heightMm
  );
  if (inputs.fingerWidthMm < recommendedFinger * 0.5) {
    warnings.push(`Finger width is small. Recommended: ${recommendedFinger.toFixed(1)}mm`);
  }
  if (inputs.fingerWidthMm > recommendedFinger * 2) {
    warnings.push(`Finger width is large. Recommended: ${recommendedFinger.toFixed(1)}mm`);
  }

  // Drawer clearance
  if (inputs.drawerClearanceMm < 0) errors.push('Drawer clearance cannot be negative');
  if (inputs.drawerClearanceMm > 10) warnings.push('Drawer clearance > 10mm may be too loose');
  if (inputs.drawerClearanceMm < inputs.kerfMm) {
    warnings.push('Drawer clearance is less than kerf - drawer may bind');
  }

  // Drawer bottom offset
  if (inputs.drawerBottomOffsetMm < 0) errors.push('Drawer bottom offset cannot be negative');
  if (inputs.drawerBottomOffsetMm > inputs.heightMm / 2) {
    errors.push('Drawer bottom offset exceeds half the box height');
  }

  // Minimum dimensions check
  const minDim = calculateMinDimension(inputs.thicknessMm, inputs.fingerWidthMm);
  if (inputs.widthMm < minDim * 2) {
    errors.push(`Width too small for drawer box. Minimum: ${(minDim * 2).toFixed(1)}mm`);
  }
  if (inputs.depthMm < minDim) {
    errors.push(`Depth too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }
  if (inputs.heightMm < minDim) {
    errors.push(`Height too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }

  // Check if drawer will fit
  const innerWidth = inputs.widthMm - 2 * inputs.thicknessMm;
  const drawerWidth = innerWidth - 2 * inputs.drawerClearanceMm;
  if (drawerWidth < 10) {
    errors.push('Drawer width too small. Increase box width or reduce clearance.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate simple box inputs (uses shared validation only)
 */
export function validateSimpleBoxInputs(
  inputs: SharedBoxInputs & { fingerWidthMm: number }
): ValidationResult {
  const sharedValidation = validateSharedInputs(inputs);
  const errors = [...sharedValidation.errors];
  const warnings = [...sharedValidation.warnings];

  // Finger width bounds
  if (inputs.fingerWidthMm < 3) errors.push('Finger width must be at least 3mm');
  if (inputs.fingerWidthMm > 50) errors.push('Finger width exceeds 50mm');

  const recommendedFinger = calculateRecommendedFingerWidth(
    inputs.widthMm,
    inputs.depthMm,
    inputs.heightMm
  );
  if (inputs.fingerWidthMm < recommendedFinger * 0.5) {
    warnings.push(`Finger width is small. Recommended: ${recommendedFinger.toFixed(1)}mm`);
  }
  if (inputs.fingerWidthMm > recommendedFinger * 2) {
    warnings.push(`Finger width is large. Recommended: ${recommendedFinger.toFixed(1)}mm`);
  }

  // Minimum dimensions check
  const minDim = calculateMinDimension(inputs.thicknessMm, inputs.fingerWidthMm);
  if (inputs.widthMm < minDim) {
    errors.push(`Width too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }
  if (inputs.depthMm < minDim) {
    errors.push(`Depth too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }
  if (inputs.heightMm < minDim) {
    errors.push(`Height too small for finger joints. Minimum: ${minDim.toFixed(1)}mm`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
