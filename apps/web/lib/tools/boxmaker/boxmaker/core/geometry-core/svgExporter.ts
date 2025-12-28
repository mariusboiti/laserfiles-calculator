/**
 * Pure SVG Exporter - NO CURVES
 * 
 * Converts point arrays to clean SVG
 * M/L commands only
 */

import type { Pt } from '../hinged-side-pin/types';

/**
 * Convert points to SVG path data (M/L/Z only)
 */
export function pointsToPath(points: Pt[]): string {
  if (points.length === 0) return '';
  
  let d = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`;
  }
  
  d += ' Z';
  return d;
}

/**
 * Validate path contains only orthogonal commands
 */
export function validateOrthogonalPath(pathD: string): void {
  // Look for actual SVG commands (letters followed by numbers or spaces)
  const commands = pathD.match(/\b[MLHVCSQTAZ]\b/g) || [];
  for (const cmd of commands) {
    const upper = cmd.toUpperCase();
    if (upper === 'C' || upper === 'Q' || upper === 'A' || upper === 'S') {
      throw new Error(`SVG VALIDATION ERROR: Path contains curve "${cmd}". Only M/L/Z allowed.`);
    }
  }
}

/**
 * Generate SVG document for a single panel
 */
export function panelToSvg(
  points: Pt[],
  padding: number = 5
): string {
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;
  
  // Shift points
  const shiftedPoints = points.map(p => ({
    x: p.x + offsetX,
    y: p.y + offsetY
  }));
  
  const pathD = pointsToPath(shiftedPoints);
  validateOrthogonalPath(pathD);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}">
  <path d="${pathD}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
}

/**
 * Layout panels in grid and generate combined SVG
 */
export interface LayoutPanel {
  name: string;
  points: Pt[];
}

export interface LayoutConfig {
  margin: number;
  spacing: number;
  columns: number;
}

export function layoutPanels(
  panels: LayoutPanel[],
  config: LayoutConfig
): string {
  const { margin, spacing, columns } = config;
  
  // Calculate panel sizes
  const panelSizes = panels.map(p => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of p.points) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }
    return {
      width: maxX - minX,
      height: maxY - minY,
      offsetX: -minX,
      offsetY: -minY
    };
  });
  
  // Calculate grid dimensions
  const rows = Math.ceil(panels.length / columns);
  const columnWidths = new Array(columns).fill(0);
  const rowHeights = new Array(rows).fill(0);
  
  // Find max width/height for each row/column
  panelSizes.forEach((size, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    columnWidths[col] = Math.max(columnWidths[col], size.width);
    rowHeights[row] = Math.max(rowHeights[row], size.height);
  });
  
  // Position panels
  const positionedPanels: { panel: LayoutPanel; x: number; y: number }[] = [];
  
  panelSizes.forEach((size, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    
    // Calculate position
    let x = margin;
    let y = margin;
    
    for (let c = 0; c < col; c++) {
      x += columnWidths[c] + spacing;
    }
    
    for (let r = 0; r < row; r++) {
      y += rowHeights[r] + spacing;
    }
    
    positionedPanels.push({
      panel: panels[i],
      x: x + size.offsetX,
      y: y + size.offsetY
    });
  });
  
  // Calculate total dimensions
  const totalWidth = margin + columnWidths.reduce((sum, w, i) => sum + w + (i < columnWidths.length - 1 ? spacing : 0), 0) + margin;
  const totalHeight = margin + rowHeights.reduce((sum, h, i) => sum + h + (i < rowHeights.length - 1 ? spacing : 0), 0) + margin;
  
  // Generate SVG
  let content = '';
  
  for (const { panel, x, y } of positionedPanels) {
    const shiftedPoints = panel.points.map(p => ({
      x: p.x + x,
      y: p.y + y
    }));
    
    const pathD = pointsToPath(shiftedPoints);
    validateOrthogonalPath(pathD);
    
    content += `  <!-- ${panel.name} -->\n`;
    content += `  <path d="${pathD}" fill="none" stroke="#000000" stroke-width="0.1"/>\n\n`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth.toFixed(3)}mm" height="${totalHeight.toFixed(3)}mm" viewBox="0 0 ${totalWidth.toFixed(3)} ${totalHeight.toFixed(3)}">
${content}
</svg>`;
}
