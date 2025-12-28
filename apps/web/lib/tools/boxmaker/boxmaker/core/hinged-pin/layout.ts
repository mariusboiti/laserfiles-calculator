/**
 * Hinged Pin Box - Layout & SVG Generation
 * 
 * Layout order (verification-first):
 * Row 1: BACK (left), LID (right) - hinge panels together
 * Row 2: FRONT (left), BOTTOM (right)
 * Row 3: LEFT (left), RIGHT (right)
 * 
 * Debug labels ON by default in preview, OFF in export
 */

import type { Pt, Circle, Panel, HingedPinPanels, HingedPinInputs } from './types';

/**
 * Validate SVG path contains only M/L/Z commands
 */
function validateOrthogonalPath(pathD: string): void {
  const commands = pathD.match(/[A-Za-z]/g) || [];
  for (const cmd of commands) {
    const upper = cmd.toUpperCase();
    if (upper === 'C' || upper === 'Q' || upper === 'A' || upper === 'S') {
      throw new Error(`SVG VALIDATION ERROR: Path contains curve "${cmd}". Only M/L/Z allowed.`);
    }
  }
}

/**
 * Convert points to SVG path data (M/L/Z only)
 */
function pointsToPath(points: Pt[]): string {
  if (points.length === 0) return '';
  
  let d = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`;
  }
  d += ' Z';
  
  return d;
}

/**
 * Convert circles to SVG elements
 */
function circlesToSvg(circles: Circle[], offsetX: number, offsetY: number): string {
  return circles
    .map(c => `  <circle cx="${(c.cx + offsetX).toFixed(3)}" cy="${(c.cy + offsetY).toFixed(3)}" r="${c.r.toFixed(3)}" fill="none" stroke="#000000" stroke-width="0.1"/>`)
    .join('\n');
}

/**
 * Generate SVG for a single panel
 */
function panelToSvgContent(panel: Panel, offsetX: number, offsetY: number): string {
  // Shift points by offset
  const shiftedPoints = panel.outline.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY,
  }));
  
  const pathD = pointsToPath(shiftedPoints);
  validateOrthogonalPath(pathD);
  
  let svg = `  <!-- ${panel.name} -->\n`;
  svg += `  <path d="${pathD}" fill="none" stroke="#000000" stroke-width="0.1"/>`;
  
  // Add holes
  if (panel.holes.length > 0) {
    svg += '\n' + circlesToSvg(panel.holes, offsetX, offsetY);
  }
  
  return svg;
}

/**
 * Generate debug overlay for a panel
 */
function panelDebugOverlay(panel: Panel, offsetX: number, offsetY: number): string {
  const labelX = offsetX + 3;
  const labelY = offsetY + 8;
  
  let svg = `  <!-- Debug: ${panel.name} -->\n`;
  svg += `  <text x="${labelX}" y="${labelY}" font-size="5" font-weight="bold" fill="#cc0000">${panel.name}</text>\n`;
  svg += `  <text x="${labelX}" y="${labelY + 5}" font-size="3" fill="#666666">${panel.width.toFixed(1)}×${panel.height.toFixed(1)}</text>`;
  
  // Hinge edge indicator
  if (panel.hasHingeEdge) {
    svg += `\n  <text x="${labelX}" y="${labelY + 9}" font-size="2.5" fill="#0066cc">HINGE: ${panel.hingeEdgeLocation?.toUpperCase()}</text>`;
    // Draw line on hinge edge
    svg += `\n  <line x1="${offsetX}" y1="${offsetY}" x2="${offsetX + panel.width}" y2="${offsetY}" stroke="#0066cc" stroke-width="0.5" stroke-dasharray="2,1"/>`;
  }
  
  return svg;
}

interface LayoutConfig {
  margin: number;
  spacing: number;
  showDebug: boolean;
}

/**
 * Layout all panels on a single sheet
 * 
 * Layout:
 * Row 0: BACK, LID (hinge panels at top)
 * Row 1: FRONT, BOTTOM
 * Row 2: LEFT, RIGHT
 */
export function layoutPanelsToSvg(
  panels: HingedPinPanels,
  config: LayoutConfig
): string {
  const { margin, spacing, showDebug } = config;
  
  // Calculate bounding boxes including negative Y (knuckles protrude upward)
  const getBBox = (panel: Panel) => {
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
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };
  
  // Get bounding boxes
  const bboxes = {
    back: getBBox(panels.back),
    lid: getBBox(panels.lid),
    front: getBBox(panels.front),
    bottom: getBBox(panels.bottom),
    left: getBBox(panels.left),
    right: getBBox(panels.right),
  };
  
  // Row heights (max height in each row)
  const row0Height = Math.max(bboxes.back.height, bboxes.lid.height);
  const row1Height = Math.max(bboxes.front.height, bboxes.bottom.height);
  const row2Height = Math.max(bboxes.left.height, bboxes.right.height);
  
  // Column widths
  const col0Width = Math.max(bboxes.back.width, bboxes.front.width, bboxes.left.width);
  const col1Width = Math.max(bboxes.lid.width, bboxes.bottom.width, bboxes.right.width);
  
  // Calculate positions (adjust for negative Y in knuckles)
  const positions: { panel: Panel; offsetX: number; offsetY: number }[] = [];
  
  // Row 0: BACK, LID
  const row0Y = margin + Math.max(-bboxes.back.minY, -bboxes.lid.minY, 0);
  positions.push({
    panel: panels.back,
    offsetX: margin - bboxes.back.minX,
    offsetY: row0Y - bboxes.back.minY,
  });
  positions.push({
    panel: panels.lid,
    offsetX: margin + col0Width + spacing - bboxes.lid.minX,
    offsetY: row0Y - bboxes.lid.minY,
  });
  
  // Row 1: FRONT, BOTTOM
  const row1Y = row0Y + row0Height + spacing;
  positions.push({
    panel: panels.front,
    offsetX: margin - bboxes.front.minX,
    offsetY: row1Y - bboxes.front.minY,
  });
  positions.push({
    panel: panels.bottom,
    offsetX: margin + col0Width + spacing - bboxes.bottom.minX,
    offsetY: row1Y - bboxes.bottom.minY,
  });
  
  // Row 2: LEFT, RIGHT
  const row2Y = row1Y + row1Height + spacing;
  positions.push({
    panel: panels.left,
    offsetX: margin - bboxes.left.minX,
    offsetY: row2Y - bboxes.left.minY,
  });
  positions.push({
    panel: panels.right,
    offsetX: margin + col0Width + spacing - bboxes.right.minX,
    offsetY: row2Y - bboxes.right.minY,
  });
  
  // Generate SVG content
  let content = positions
    .map(({ panel, offsetX, offsetY }) => panelToSvgContent(panel, offsetX, offsetY))
    .join('\n\n');
  
  // Add debug overlay if enabled
  if (showDebug) {
    content += '\n\n  <!-- DEBUG OVERLAY -->';
    content += positions
      .map(({ panel, offsetX, offsetY }) => '\n' + panelDebugOverlay(panel, offsetX, offsetY))
      .join('');
  }
  
  // Total dimensions
  const totalWidth = margin + col0Width + spacing + col1Width + margin;
  const totalHeight = row2Y + row2Height + margin;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth.toFixed(3)}mm" height="${totalHeight.toFixed(3)}mm" viewBox="0 0 ${totalWidth.toFixed(3)} ${totalHeight.toFixed(3)}">
${content}
</svg>`;
}

/**
 * Generate standalone SVG for a single panel
 */
export function panelToSvgDocument(panel: Panel, padding: number = 5): string {
  // Get bounding box
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
  
  const content = panelToSvgContent(panel, offsetX, offsetY);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}">
${content}
</svg>`;
}

/**
 * Generate individual SVG documents for each panel
 */
export function generatePanelSvgs(panels: HingedPinPanels): Record<string, string> {
  return {
    back: panelToSvgDocument(panels.back),
    lid: panelToSvgDocument(panels.lid),
    front: panelToSvgDocument(panels.front),
    bottom: panelToSvgDocument(panels.bottom),
    left: panelToSvgDocument(panels.left),
    right: panelToSvgDocument(panels.right),
  };
}
