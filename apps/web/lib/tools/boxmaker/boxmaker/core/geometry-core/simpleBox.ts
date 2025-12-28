/**
 * Simple Finger-Joint Box - PURE GEOMETRY
 * 
 * NO hinge, NO holes, NO cutouts
 * Just perfect rectangles with finger joints
 */

import type { Pt } from '../hinged-side-pin/types';
import { buildPanel, type PanelSpec, type EdgeMode } from './edgeGenerator';

export interface SimpleBoxInputs {
  innerWidth: number;
  innerDepth: number;
  innerHeight: number;
  thickness: number;
  fingerWidth: number;
}

export interface SimpleBoxPanels {
  front: Pt[];
  back: Pt[];
  left: Pt[];
  right: Pt[];
  bottom: Pt[];
  lid: Pt[];
}

/**
 * Build a simple finger-joint box
 * 
 * ALL panels are perfect rectangles
 * NO post-processing, NO mutations
 */
export function buildSimpleBox(inputs: SimpleBoxInputs): SimpleBoxPanels {
  const { innerWidth, innerDepth, innerHeight, thickness, fingerWidth } = inputs;
  
  // Panel dimensions (interior-based)
  const frontBackWidth = innerWidth + 2 * thickness;
  const leftRightWidth = innerDepth;
  const bottomLidWidth = innerWidth + 2 * thickness;
  
  const frontBackHeight = innerHeight;
  const leftRightHeight = innerHeight;
  const bottomLidHeight = innerDepth + 2 * thickness;
  
  // Build each panel with PURE edge construction
  
  // FRONT panel
  const front = buildPanel({
    width: frontBackWidth,
    height: frontBackHeight,
    thickness,
    fingerWidth,
    topMode: 'flat', // Top edge flat
    rightMode: 'fingers-out', // Connects to RIGHT
    bottomMode: 'fingers-out', // Connects to BOTTOM
    leftMode: 'fingers-out' // Connects to LEFT
  });
  
  // BACK panel
  const back = buildPanel({
    width: frontBackWidth,
    height: frontBackHeight,
    thickness,
    fingerWidth,
    topMode: 'flat', // Top edge flat
    rightMode: 'fingers-out', // Connects to RIGHT
    bottomMode: 'fingers-out', // Connects to BOTTOM
    leftMode: 'fingers-out' // Connects to LEFT
  });
  
  // LEFT panel
  const left = buildPanel({
    width: leftRightWidth,
    height: leftRightHeight,
    thickness,
    fingerWidth,
    topMode: 'flat', // Top edge flat
    rightMode: 'fingers-in', // Receives FRONT
    bottomMode: 'fingers-out', // Connects to BOTTOM
    leftMode: 'fingers-in' // Receives BACK
  });
  
  // RIGHT panel
  const right = buildPanel({
    width: leftRightWidth,
    height: leftRightHeight,
    thickness,
    fingerWidth,
    topMode: 'flat', // Top edge flat
    rightMode: 'fingers-in', // Receives BACK
    bottomMode: 'fingers-out', // Connects to BOTTOM
    leftMode: 'fingers-in' // Receives FRONT
  });
  
  // BOTTOM panel
  const bottom = buildPanel({
    width: bottomLidWidth,
    height: bottomLidHeight,
    thickness,
    fingerWidth,
    topMode: 'fingers-in', // Receives FRONT
    rightMode: 'fingers-in', // Receives RIGHT
    bottomMode: 'fingers-in', // Receives BACK
    leftMode: 'fingers-in' // Receives LEFT
  });
  
  // LID panel (simple flat lid)
  const lid = buildPanel({
    width: bottomLidWidth,
    height: bottomLidHeight,
    thickness,
    fingerWidth,
    topMode: 'flat', // Top edge flat
    rightMode: 'flat', // Right edge flat
    bottomMode: 'flat', // Bottom edge flat
    leftMode: 'flat' // Left edge flat
  });
  
  return {
    front,
    back,
    left,
    right,
    bottom,
    lid
  };
}

/**
 * Validate panel geometry
 * Throws error if any panel is invalid
 */
export function validateSimpleBox(panels: SimpleBoxPanels): void {
  const panelNames = Object.keys(panels) as (keyof SimpleBoxPanels)[];
  
  for (const panelName of panelNames) {
    const panel = panels[panelName];
    
    // Check if panel is closed (first point equals last point)
    if (panel.length === 0) {
      throw new Error(`Panel ${panelName} is empty`);
    }
    
    const first = panel[0];
    const last = panel[panel.length - 1];
    
    if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
      throw new Error(`Panel ${panelName} is not closed`);
    }
    
    // Check for orthogonal segments only (exclude the closing segment)
    for (let i = 1; i < panel.length - 1; i++) {
      const prev = panel[i - 1];
      const curr = panel[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      
      // Each segment should be either horizontal OR vertical
      const isHorizontal = Math.abs(dy) < 0.001;
      const isVertical = Math.abs(dx) < 0.001;
      
      if (!isHorizontal && !isVertical) {
        throw new Error(`Panel ${panelName} has non-orthogonal segment at point ${i}`);
      }
    }
    
    // Check closing segment separately
    const closingPrev = panel[panel.length - 2];
    const closingCurr = panel[panel.length - 1];
    const dx = closingCurr.x - closingPrev.x;
    const dy = closingCurr.y - closingPrev.y;
    const isHorizontal = Math.abs(dy) < 0.001;
    const isVertical = Math.abs(dx) < 0.001;
    
    if (!isHorizontal && !isVertical) {
      throw new Error(`Panel ${panelName} has non-orthogonal closing segment`);
    }
  }
}
