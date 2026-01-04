/**
 * Layout calculation for Jig & Fixture Generator
 * No overlap, proper centering, margin handling
 */

export interface LayoutResult {
  usableW: number;
  usableH: number;
  gridW: number;
  gridH: number;
  startX: number;
  startY: number;
  objects: Array<{ x: number; y: number; row: number; col: number; number: number }>;
  warnings: string[];
}

/**
 * Calculate jig layout with no overlap
 */
export function calculateLayout(config: {
  bedW: number;
  bedH: number;
  margin: number;
  rows: number;
  cols: number;
  gapX: number;
  gapY: number;
  objectW: number;
  objectH: number;
  objectShape: 'rect' | 'circle' | 'custom';
  center: boolean;
}): LayoutResult {
  const { bedW, bedH, margin, rows, cols, gapX, gapY, objectW, objectH, objectShape, center } = config;
  
  const warnings: string[] = [];
  
  // Calculate usable area
  const usableW = bedW - 2 * margin;
  const usableH = bedH - 2 * margin;
  
  // Calculate grid dimensions
  const gridW = cols * objectW + (cols - 1) * gapX;
  const gridH = rows * objectH + (rows - 1) * gapY;
  
  // Check overflow
  if (gridW > usableW) {
    warnings.push('Layout exceeds bed width (reduce cols or object width)');
  }
  if (gridH > usableH) {
    warnings.push('Layout exceeds bed height (reduce rows or object height)');
  }
  
  // Check margin
  if (margin < 3) {
    warnings.push('Margin too small for safe cutting (<3mm)');
  }
  
  // Check overlap (gaps should be positive for no overlap)
  if (gapX < 0 || gapY < 0) {
    warnings.push('Objects overlap (increase gaps)');
  }
  
  // Calculate start position
  let startX = margin;
  let startY = margin;
  
  if (center) {
    startX = margin + Math.max(0, (usableW - gridW) / 2);
    startY = margin + Math.max(0, (usableH - gridH) / 2);
  }
  
  // Generate object positions
  const objects: Array<{ x: number; y: number; row: number; col: number; number: number }> = [];
  let number = 1;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (objectW + gapX);
      const y = startY + r * (objectH + gapY);
      
      objects.push({ x, y, row: r, col: c, number });
      number++;
    }
  }
  
  return {
    usableW,
    usableH,
    gridW,
    gridH,
    startX,
    startY,
    objects,
    warnings,
  };
}

/**
 * Generate layout summary text for copying
 */
export function generateLayoutSummary(config: {
  bedW: number;
  bedH: number;
  rows: number;
  cols: number;
  objectW: number;
  objectH: number;
  gapX: number;
  gapY: number;
}): string {
  const { bedW, bedH, rows, cols, objectW, objectH, gapX, gapY } = config;
  const totalObjects = rows * cols;
  
  return `Bed: ${bedW}×${bedH}mm
Objects: ${totalObjects} (${rows}×${cols})
Object size: ${objectW}×${objectH}mm
Gap: ${gapX}×${gapY}mm`;
}
