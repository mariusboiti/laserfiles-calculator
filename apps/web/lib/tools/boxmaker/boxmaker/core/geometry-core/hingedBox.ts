/**
 * Hinged Box - Built DIRECTLY on Simple Box
 * 
 * ABSOLUTE RULE: Uses buildSimpleBox() directly - NO custom edge generation
 * Only adds LID and optional hinge holes
 */

import type { Pt } from '../hinged-side-pin/types';
import { buildSimpleBox, validateSimpleBox, type SimpleBoxInputs, type SimpleBoxPanels } from './simpleBox';

export interface HingedBoxInputs extends SimpleBoxInputs {
  // Hinge configuration (side pin style)
  enableHinge: boolean;
  hingePinDiameter: number;
  hingePinInsetFromTop: number;
  hingePinInsetFromBack: number;
  hingeClearance: number;
}

export interface HingeHole {
  cx: number;
  cy: number;
  diameter: number;
}

export interface HingedBoxPanels extends SimpleBoxPanels {
  // Hinge holes (only on left and right panels)
  leftHoles: HingeHole[];
  rightHoles: HingeHole[];
}

/**
 * Build hinged box using Simple Box as foundation
 * 
 * CRITICAL: Calls buildSimpleBox() directly - panels are IDENTICAL
 */
export function buildHingedBox(inputs: HingedBoxInputs): HingedBoxPanels {
  // Generate ALL panels using Simple Box (source of truth)
  const simpleBoxPanels = buildSimpleBox(inputs);
  
  // Validate Simple Box panels
  validateSimpleBox(simpleBoxPanels);
  
  // Calculate hinge holes if enabled
  const leftHoles: HingeHole[] = [];
  const rightHoles: HingeHole[] = [];
  
  if (inputs.enableHinge) {
    const { innerDepth, innerHeight, hingePinDiameter, hingePinInsetFromTop, hingePinInsetFromBack, hingeClearance } = inputs;
    
    // Panel dimensions (from Simple Box)
    const leftRightWidth = innerDepth;
    const leftRightHeight = innerHeight;
    
    // Hole diameter with clearance
    const holeDiameter = hingePinDiameter + 2 * hingeClearance;
    
    // Safety margin to keep holes inside panel
    const minInset = holeDiameter / 2 + 1;
    
    // LEFT hole: near back edge, inset from top
    const leftCx = Math.max(minInset, Math.min(leftRightWidth - minInset, leftRightWidth - hingePinInsetFromBack));
    const leftCy = Math.max(minInset, Math.min(leftRightHeight - minInset, hingePinInsetFromTop));
    
    leftHoles.push({
      cx: leftCx,
      cy: leftCy,
      diameter: holeDiameter
    });
    
    // RIGHT hole: near back edge, inset from top
    const rightCx = Math.max(minInset, Math.min(leftRightWidth - minInset, hingePinInsetFromBack));
    const rightCy = Math.max(minInset, Math.min(leftRightHeight - minInset, hingePinInsetFromTop));
    
    rightHoles.push({
      cx: rightCx,
      cy: rightCy,
      diameter: holeDiameter
    });
  }
  
  // Return Simple Box panels + hinge holes
  return {
    ...simpleBoxPanels,
    leftHoles,
    rightHoles
  };
}

/**
 * Validate hinged box panels
 * Uses Simple Box validation
 */
export function validateHingedBox(panels: HingedBoxPanels): void {
  validateSimpleBox(panels);
}

/**
 * Verify that Hinged Box panels match Simple Box exactly
 * (when hinge is disabled)
 */
export function verifyHingedMatchesSimple(inputs: HingedBoxInputs): void {
  // Generate both
  const hingedPanels = buildHingedBox({ ...inputs, enableHinge: false });
  const simplePanels = buildSimpleBox(inputs);
  
  // Compare each panel
  const panelNames: (keyof SimpleBoxPanels)[] = ['front', 'back', 'left', 'right', 'bottom', 'lid'];
  
  for (const panelName of panelNames) {
    const hinged = hingedPanels[panelName];
    const simple = simplePanels[panelName];
    
    if (hinged.length !== simple.length) {
      throw new Error(
        `MISMATCH: ${panelName} has ${hinged.length} points in Hinged vs ${simple.length} in Simple`
      );
    }
    
    for (let i = 0; i < hinged.length; i++) {
      const h = hinged[i];
      const s = simple[i];
      
      if (Math.abs(h.x - s.x) > 0.001 || Math.abs(h.y - s.y) > 0.001) {
        throw new Error(
          `MISMATCH: ${panelName} point ${i}: Hinged(${h.x.toFixed(3)},${h.y.toFixed(3)}) vs Simple(${s.x.toFixed(3)},${s.y.toFixed(3)})`
        );
      }
    }
  }
  
  console.log('✓ Hinged Box panels MATCH Simple Box exactly');
}
