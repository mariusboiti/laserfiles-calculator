/**
 * Hinged Lid (Side Pin) Box - Layout & SVG Generation
 *
 * Layout order (1:1 with LightBurn reference):
 * Row 1: LEFT (left), FRONT (right)
 * Row 2: RIGHT (left), BACK (right)
 * Row 3: LID (left), BOTTOM (right)
 *
 * Debug labels ON by default in preview, OFF in export
 */

import type { Pt, Circle, Panel, HingedSidePinPanels } from './types';

function getPanelBBox(panel: Panel) {
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
}

/**
 * Validate SVG path contains only M/L/Z commands
 */
function validateOrthogonalPath(pathD: string): void {
  // Only validate actual path commands, not arbitrary letters.
  const commands = pathD.match(/\b[A-Za-z]\b/g) || [];
  for (const cmd of commands) {
    const upper = cmd.toUpperCase();
    if (upper !== 'M' && upper !== 'L' && upper !== 'Z') {
      throw new Error(`SVG VALIDATION ERROR: Path contains "${cmd}". Only M/L/Z allowed.`);
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
  const bbox = getPanelBBox(panel);
  const centerX = offsetX + (bbox.minX + bbox.maxX) / 2;
  const centerY = offsetY + (bbox.minY + bbox.maxY) / 2;
  const labelFont = 10;
  const dimFont = 4;
  const labelY = centerY - 2;
  const dimY = centerY + 6;

  let svg = `  <!-- Debug: ${panel.name} -->\n`;
  svg += `  <text x="${centerX}" y="${labelY}" font-size="${labelFont}" font-weight="bold" text-anchor="middle" fill="#cc0000">${panel.name}</text>\n`;
  svg += `  <text x="${centerX}" y="${dimY}" font-size="${dimFont}" text-anchor="middle" fill="#666666">${panel.width.toFixed(1)} x ${panel.height.toFixed(1)} mm</text>`;

  // Pin hole indicator
  if (panel.hasPinHole) {
    svg += `\n  <text x="${centerX}" y="${dimY + 4}" font-size="3" text-anchor="middle" fill="#0066cc">PIN HOLE</text>`;
    // Draw small circle at pin hole position
    if (panel.holes.length > 0) {
      const hole = panel.holes[0];
      svg += `\n  <circle cx="${(hole.cx + offsetX).toFixed(3)}" cy="${(hole.cy + offsetY).toFixed(3)}" r="1" fill="#0066cc" opacity="0.5"/>`;
    }
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
 * Layout (1:1 with LightBurn):
 * Row 0: LEFT, FRONT
 * Row 1: RIGHT, BACK
 * Row 2: LID, BOTTOM
 */
export function layoutPanelsToSvg(
  panels: HingedSidePinPanels,
  config: LayoutConfig
): string {
  const { margin, spacing, showDebug } = config;

  // Get bounding boxes
  const bboxes = {
    left: getPanelBBox(panels.left),
    front: getPanelBBox(panels.front),
    right: getPanelBBox(panels.right),
    back: getPanelBBox(panels.back),
    lid: getPanelBBox(panels.lid),
    bottom: getPanelBBox(panels.bottom),
  };

  // Row heights (max height in each row)
  const row0Height = Math.max(bboxes.left.height, bboxes.front.height);
  const row1Height = Math.max(bboxes.right.height, bboxes.back.height);
  const row2Height = Math.max(bboxes.lid.height, bboxes.bottom.height);

  // Column widths
  const col0Width = Math.max(bboxes.left.width, bboxes.right.width, bboxes.lid.width);
  const col1Width = Math.max(bboxes.front.width, bboxes.back.width, bboxes.bottom.width);

  // Calculate positions
  const positions: { panel: Panel; offsetX: number; offsetY: number }[] = [];

  // Row 0: LEFT, FRONT
  const row0Y = margin;
  positions.push({
    panel: panels.left,
    offsetX: margin - bboxes.left.minX,
    offsetY: row0Y - bboxes.left.minY,
  });
  positions.push({
    panel: panels.front,
    offsetX: margin + col0Width + spacing - bboxes.front.minX,
    offsetY: row0Y - bboxes.front.minY,
  });

  // Row 1: RIGHT, BACK
  const row1Y = row0Y + row0Height + spacing;
  positions.push({
    panel: panels.right,
    offsetX: margin - bboxes.right.minX,
    offsetY: row1Y - bboxes.right.minY,
  });
  positions.push({
    panel: panels.back,
    offsetX: margin + col0Width + spacing - bboxes.back.minX,
    offsetY: row1Y - bboxes.back.minY,
  });

  // Row 2: LID, BOTTOM
  const row2Y = row1Y + row1Height + spacing;
  positions.push({
    panel: panels.lid,
    offsetX: margin - bboxes.lid.minX,
    offsetY: row2Y - bboxes.lid.minY,
  });
  positions.push({
    panel: panels.bottom,
    offsetX: margin + col0Width + spacing - bboxes.bottom.minX,
    offsetY: row2Y - bboxes.bottom.minY,
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
  const bbox = getPanelBBox(panel);

  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;
  const offsetX = -bbox.minX + padding;
  const offsetY = -bbox.minY + padding;

  const content = panelToSvgContent(panel, offsetX, offsetY);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}">
${content}
</svg>`;
}

/**
 * Generate individual SVG documents for each panel
 */
export function generatePanelSvgs(panels: HingedSidePinPanels): Record<string, string> {
  return {
    left: panelToSvgDocument(panels.left),
    front: panelToSvgDocument(panels.front),
    right: panelToSvgDocument(panels.right),
    back: panelToSvgDocument(panels.back),
    lid: panelToSvgDocument(panels.lid),
    bottom: panelToSvgDocument(panels.bottom),
  };
}
