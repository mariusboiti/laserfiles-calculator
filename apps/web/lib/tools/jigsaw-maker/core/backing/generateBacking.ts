/**
 * Backing Board Generator
 * Creates backing board with optional holes
 */

import type { JigsawSettings } from '../../types/jigsawV2';

export interface BackingBoardSvg {
  svg: string;
  width: number;
  height: number;
}

/**
 * Generate backing board SVG
 */
export function generateBackingBoard(settings: JigsawSettings): BackingBoardSvg | null {
  if (!settings.includeBacking) {
    return null;
  }
  
  const width = settings.widthMm + 2 * settings.backingMarginMm;
  const height = settings.heightMm + 2 * settings.backingMarginMm;
  
  const paths: string[] = [];
  
  // Outer rectangle
  const x = 0;
  const y = 0;
  const rectPath = `M ${x} ${y} L ${width} ${y} L ${width} ${height} L ${x} ${height} Z`;
  paths.push(`    <path d="${rectPath}" />`);
  
  // Hanging holes (if enabled)
  if (settings.hangingHoles) {
    const holeRadius = 3; // 6mm diameter
    const holeSpacing = 80; // 80mm apart
    const holeYOffset = 10; // 10mm from top
    
    const centerX = width / 2;
    const y = holeYOffset;
    
    // Two holes, centered horizontally
    const hole1X = centerX - holeSpacing / 2;
    const hole2X = centerX + holeSpacing / 2;
    
    paths.push(`    <circle cx="${hole1X}" cy="${y}" r="${holeRadius}" />`);
    paths.push(`    <circle cx="${hole2X}" cy="${y}" r="${holeRadius}" />`);
  }
  
  // Magnet holes (if enabled)
  if (settings.magnetHoles) {
    const magnetRadius = 4; // 8mm diameter
    const inset = 8; // 8mm from edges
    
    // Four corners
    const corners = [
      { x: inset, y: inset },
      { x: width - inset, y: inset },
      { x: width - inset, y: height - inset },
      { x: inset, y: height - inset },
    ];
    
    for (const corner of corners) {
      paths.push(`    <circle cx="${corner.x}" cy="${corner.y}" r="${magnetRadius}" />`);
    }
  }
  
  const svg = `  <g id="CUT_BACKING" fill="none" stroke="red" stroke-width="0.001">\n${paths.join('\n')}\n  </g>`;
  
  return {
    svg,
    width,
    height,
  };
}
