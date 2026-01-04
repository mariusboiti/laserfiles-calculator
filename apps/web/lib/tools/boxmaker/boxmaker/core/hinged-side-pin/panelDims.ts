/**
 * Panel Dimensions Calculator
 * 
 * Interior-based dimensions (matching LightBurn reference)
 * 
 * W = innerWidth
 * D = innerDepth  
 * H = innerHeight
 * T = thickness
 */

import type { HingedSidePinInputs } from './types';

export interface PanelDimensions {
  // Individual panel sizes (interior-based)
  front: { width: number; height: number };
  back: { width: number; height: number };
  left: { width: number; height: number };
  right: { width: number; height: number };
  bottom: { width: number; height: number };
  lid: { width: number; height: number };
}

/**
 * Calculate all panel dimensions from input parameters
 * 
 * FRONT/BACK: width = W + 2T, height = H
 * LEFT/RIGHT: width = D, height = H
 * BOTTOM: width = W + 2T, height = D + 2T
 * LID: width = W + 2T, height = D + 2T
 */
export function calculatePanelDimensions(input: HingedSidePinInputs): PanelDimensions {
  const { innerWidthMm: W, innerDepthMm: D, innerHeightMm: H, thicknessMm: T } = input;
  
  return {
    // FRONT: W + 2T x H
    front: { width: W + 2 * T, height: H },
    
    // BACK: W + 2T x H
    back: { width: W + 2 * T, height: H },
    
    // LEFT: D x H
    left: { width: D, height: H },
    
    // RIGHT: D x H
    right: { width: D, height: H },
    
    // BOTTOM: W + 2T x D + 2T
    bottom: { width: W + 2 * T, height: D + 2 * T },
    
    // LID: W + 2T x D + 2T
    lid: { width: W + 2 * T, height: D + 2 * T },
  };
}
