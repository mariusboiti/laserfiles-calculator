/**
 * Auto-fit logic for Ornament Layout Planner
 * Calculates optimal rows/cols and detects overflow
 */

export interface AutoFitResult {
  rows: number;
  cols: number;
  gridWidth: number;
  gridHeight: number;
  startX: number;
  startY: number;
  warnings: string[];
}

/**
 * Calculate auto-fit layout
 */
export function calculateAutoFit(config: {
  sheetW: number;
  sheetH: number;
  margin: number;
  gapX: number;
  gapY: number;
  templateW: number;
  templateH: number;
  center: boolean;
}): AutoFitResult {
  const { sheetW, sheetH, margin, gapX, gapY, templateW, templateH, center } = config;
  
  const warnings: string[] = [];
  
  const usableW = sheetW - 2 * margin;
  const usableH = sheetH - 2 * margin;
  
  // Check if template fits at all
  if (templateW > usableW || templateH > usableH) {
    warnings.push('Template larger than sheet usable area');
    return {
      rows: 0,
      cols: 0,
      gridWidth: 0,
      gridHeight: 0,
      startX: margin,
      startY: margin,
      warnings,
    };
  }
  
  // Calculate max rows and cols
  const cols = Math.max(1, Math.floor((usableW + gapX) / (templateW + gapX)));
  const rows = Math.max(1, Math.floor((usableH + gapY) / (templateH + gapY)));
  
  const gridWidth = cols * templateW + (cols - 1) * gapX;
  const gridHeight = rows * templateH + (rows - 1) * gapY;
  
  const startX = margin + (center ? (usableW - gridWidth) / 2 : 0);
  const startY = margin + (center ? (usableH - gridHeight) / 2 : 0);
  
  return {
    rows,
    cols,
    gridWidth,
    gridHeight,
    startX,
    startY,
    warnings,
  };
}

/**
 * Calculate manual layout with overflow detection
 */
export function calculateManualLayout(config: {
  sheetW: number;
  sheetH: number;
  margin: number;
  gapX: number;
  gapY: number;
  templateW: number;
  templateH: number;
  rows: number;
  cols: number;
  center: boolean;
}): AutoFitResult {
  const { sheetW, sheetH, margin, gapX, gapY, templateW, templateH, rows, cols, center } = config;
  
  const warnings: string[] = [];
  
  const usableW = sheetW - 2 * margin;
  const usableH = sheetH - 2 * margin;
  
  const gridWidth = cols * templateW + (cols - 1) * gapX;
  const gridHeight = rows * templateH + (rows - 1) * gapY;
  
  // Check overflow
  if (gridWidth > usableW) {
    warnings.push('Layout exceeds sheet width');
  }
  if (gridHeight > usableH) {
    warnings.push('Layout exceeds sheet height');
  }
  
  // Check if rows/cols too large (risk of overlap)
  if (rows > 50 || cols > 50) {
    warnings.push('Rows/Cols too large (overlap risk)');
  }
  
  const startX = margin + (center ? Math.max(0, (usableW - gridWidth) / 2) : 0);
  const startY = margin + (center ? Math.max(0, (usableH - gridHeight) / 2) : 0);
  
  return {
    rows,
    cols,
    gridWidth,
    gridHeight,
    startX,
    startY,
    warnings,
  };
}
