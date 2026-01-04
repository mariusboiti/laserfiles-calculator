/**
 * Panel Dimensions Calculator
 * 
 * Canonical orientation:
 * - Origin (0,0) = top-left corner
 * - X increases right, Y increases down
 * - All panels generated in local coords, then layout translates
 */

import type { HingedPinInputs } from './types';

export interface PanelDimensions {
  // Outer dimensions (after adding thickness)
  outerWidth: number;   // OW = innerWidth + 2*thickness
  outerDepth: number;   // OD = innerDepth + 2*thickness
  outerHeight: number;  // OH = innerHeight (walls stay at H)
  
  // Individual panel sizes
  bottom: { width: number; height: number };
  front: { width: number; height: number };
  back: { width: number; height: number };
  left: { width: number; height: number };
  right: { width: number; height: number };
  lid: { width: number; height: number };
}

/**
 * Calculate all panel dimensions from input parameters
 */
export function calculatePanelDimensions(input: HingedPinInputs): PanelDimensions {
  const { innerWidthMm: W, innerDepthMm: D, innerHeightMm: H, thicknessMm: t } = input;
  
  const OW = W + 2 * t;
  const OD = D + 2 * t;
  const OH = H;
  
  return {
    outerWidth: OW,
    outerDepth: OD,
    outerHeight: OH,
    
    // BOTTOM: OW x OD
    bottom: { width: OW, height: OD },
    
    // FRONT: OW x OH
    front: { width: OW, height: OH },
    
    // BACK: OW x OH (hinge on TOP edge, width OW)
    back: { width: OW, height: OH },
    
    // LEFT: OD x OH
    left: { width: OD, height: OH },
    
    // RIGHT: OD x OH
    right: { width: OD, height: OH },
    
    // LID: OW x OD (hinge on TOP edge, width OW)
    lid: { width: OW, height: OD },
  };
}
