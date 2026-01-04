/**
 * Hinged Lid Pin Box - SVG Generation
 * Converts panels to SVG strings
 * 
 * OUTPUT: 100% orthogonal (M/L/Z only), <circle> for holes
 * NO curves (C/Q/A/S forbidden)
 */

import type { Panel2D, Pt, CircleHole, HingedLidPinPanels } from './types';

/**
 * Validate that path contains ONLY M, L, Z commands
 * Throws error if curves are detected
 */
function validateOrthogonalPath(pathD: string): void {
  const curveCommands = /(?<![a-zA-Z])[CcQqAaSs](?![a-zA-Z])/;
  // More robust check - look for curve commands as path commands
  const pathCommands = pathD.match(/[MLZCQASHVmlzcqashv]/g) || [];
  for (const cmd of pathCommands) {
    const upper = cmd.toUpperCase();
    if (upper === 'C' || upper === 'Q' || upper === 'A' || upper === 'S') {
      throw new Error(`INVALID SVG: Path contains curve command '${cmd}'. Only M/L/Z allowed for laser cutting.`);
    }
  }
}

/**
 * Convert points array to SVG path data string
 * Uses ONLY M, L, Z commands
 */
function pointsToPathD(points: Pt[]): string {
  if (points.length === 0) return '';
  
  let d = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`;
  }
  
  d += ' Z';
  
  return d;
}

/**
 * Convert circle holes to SVG circle elements
 */
function holesToSvgCircles(holes: CircleHole[]): string {
  return holes
    .map(h => `  <circle cx="${h.cx.toFixed(3)}" cy="${h.cy.toFixed(3)}" r="${h.r.toFixed(3)}" fill="none" stroke="#000000" stroke-width="0.1"/>`)
    .join('\n');
}

/**
 * Convert a single panel to SVG string
 */
export function panelToSvg(panel: Panel2D, offsetX: number = 0, offsetY: number = 0): string {
  // Shift all points by offset
  const shiftedPoints = panel.outline.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY,
  }));
  
  const pathD = pointsToPathD(shiftedPoints);
  
  // Validate - throws if curves detected
  validateOrthogonalPath(pathD);
  
  // Shift holes
  const shiftedHoles = panel.holes.map(h => ({
    cx: h.cx + offsetX,
    cy: h.cy + offsetY,
    r: h.r,
  }));
  
  const circlesSvg = holesToSvgCircles(shiftedHoles);
  
  let svg = `  <path d="${pathD}" fill="none" stroke="#000000" stroke-width="0.1"/>`;
  if (circlesSvg) {
    svg += '\n' + circlesSvg;
  }
  
  return svg;
}

/**
 * Convert a single panel to standalone SVG document
 */
export function panelToSvgDocument(panel: Panel2D, padding: number = 5): string {
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const p of panel.outline) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  for (const h of panel.holes) {
    minX = Math.min(minX, h.cx - h.r);
    minY = Math.min(minY, h.cy - h.r);
    maxX = Math.max(maxX, h.cx + h.r);
    maxY = Math.max(maxY, h.cy + h.r);
  }
  
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;
  
  const content = panelToSvg(panel, offsetX, offsetY);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}">
${content}
</svg>`;
}

/**
 * Layout configuration for arranging panels
 */
interface LayoutConfig {
  margin: number;
  spacing: number;
}

/**
 * Arrange all panels on a single sheet
 * Returns combined SVG with all panels laid out
 * 
 * LAYOUT ORDER (for easy verification):
 * Row 0: BACK, LID (hinge panels together at top)
 * Row 1: LEFT, RIGHT
 * Row 2: FRONT, BOTTOM
 */
export function layoutPanelsToSvg(
  panels: HingedLidPinPanels,
  config: LayoutConfig,
  showDebug: boolean = false
): string {
  const { margin, spacing } = config;
  
  // Layout: 3 rows, 2 columns
  // Row 0: BACK, LID (hinge panels - both have knuckles)
  // Row 1: LEFT, RIGHT
  // Row 2: FRONT, BOTTOM
  
  const panelList = [
    { panel: panels.back, row: 0, col: 0 },
    { panel: panels.lid, row: 0, col: 1 },
    { panel: panels.left, row: 1, col: 0 },
    { panel: panels.right, row: 1, col: 1 },
    { panel: panels.front, row: 2, col: 0 },
    { panel: panels.bottom, row: 2, col: 1 },
  ];
  
  // Calculate row heights and column widths
  const row0Height = Math.max(panels.back.height, panels.lid.height);
  const row1Height = Math.max(panels.left.height, panels.right.height);
  const row2Height = Math.max(panels.front.height, panels.bottom.height);
  
  const col0Width = Math.max(panels.back.width, panels.left.width, panels.front.width);
  const col1Width = Math.max(panels.lid.width, panels.right.width, panels.bottom.width);
  
  // Calculate positions
  const positions = panelList.map(({ panel, row, col }) => {
    let x = margin;
    let y = margin;
    
    if (col === 1) x += col0Width + spacing;
    
    if (row === 1) y += row0Height + spacing;
    if (row === 2) y += row0Height + spacing + row1Height + spacing;
    
    // Calculate panel-specific bounding box offset
    let minX = Infinity, minY = Infinity;
    for (const p of panel.outline) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    }
    for (const h of panel.holes) {
      minX = Math.min(minX, h.cx - h.r);
      minY = Math.min(minY, h.cy - h.r);
    }
    
    return {
      panel,
      offsetX: x - minX,
      offsetY: y - minY,
    };
  });
  
  // Generate SVG content
  const content = positions
    .map(({ panel, offsetX, offsetY }) => panelToSvg(panel, offsetX, offsetY))
    .join('\n');
  
  // Generate debug overlay if enabled
  let debugContent = '';
  if (showDebug) {
    debugContent = positions
      .map(({ panel, offsetX, offsetY }) => {
        const labelX = offsetX + 2;
        const labelY = offsetY + 5;
        const sizeText = `${panel.width.toFixed(1)}×${panel.height.toFixed(1)}`;
        const hingeIndicator = panel.hasHingeEdge 
          ? `<text x="${labelX}" y="${labelY + 8}" font-size="3" fill="#0066cc">HINGE EDGE: ${panel.hingeEdgeLocation}</text>`
          : '';
        
        return `
  <!-- Debug: ${panel.name} -->
  <text x="${labelX}" y="${labelY}" font-size="4" font-weight="bold" fill="#cc0000">${panel.name}</text>
  <text x="${labelX}" y="${labelY + 4}" font-size="2.5" fill="#666666">${sizeText}</text>
  ${hingeIndicator}`;
      })
      .join('\n');
  }
  
  // Calculate total dimensions (2 columns, 3 rows)
  const totalWidth = margin + col0Width + spacing + col1Width + margin;
  const totalHeight = margin + row0Height + spacing + row1Height + spacing + row2Height + margin;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth.toFixed(3)}mm" height="${totalHeight.toFixed(3)}mm" viewBox="0 0 ${totalWidth.toFixed(3)} ${totalHeight.toFixed(3)}">
${content}
${debugContent}
</svg>`;
}

/**
 * Generate individual SVG documents for each panel
 */
export function generatePanelSvgs(panels: HingedLidPinPanels): Record<string, string> {
  return {
    bottom: panelToSvgDocument(panels.bottom),
    left: panelToSvgDocument(panels.left),
    right: panelToSvgDocument(panels.right),
    front: panelToSvgDocument(panels.front),
    back: panelToSvgDocument(panels.back),
    lid: panelToSvgDocument(panels.lid),
  };
}
