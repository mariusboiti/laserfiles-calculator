/**
 * Jigsaw Puzzle Templates
 * Defines various puzzle shapes and configurations
 */

import type { PuzzleTemplate, TemplateConfig } from '../types/jigsawV2';

export const PUZZLE_TEMPLATES: TemplateConfig[] = [
  {
    id: 'rectangle',
    name: 'Classic Rectangle',
    description: 'Traditional rectangular puzzle shape',
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'Romantic heart-shaped puzzle outline',
  },
  {
    id: 'circle',
    name: 'Circle',
    description: 'Round circular puzzle',
  },
  {
    id: 'oval',
    name: 'Oval',
    description: 'Elliptical oval shape',
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    description: 'Six-sided hexagonal puzzle',
  },
  {
    id: 'star',
    name: 'Star',
    description: 'Star-shaped puzzle outline',
  },
];

/**
 * Generate SVG path for template outline
 */
export function generateTemplateOutline(
  template: PuzzleTemplate,
  width: number,
  height: number,
  cornerRadius: number = 0
): string {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2;
  
  switch (template) {
    case 'circle':
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    
    case 'oval':
      const rx = width / 2;
      const ry = height / 2;
      return `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry} Z`;
    
    case 'heart': {
      // User-provided heart SVG silhouette (viewBox 0 0 512 456.082)
      // NOTE: only the main silhouette path (first path up to first 'z') is used.
      const HEART_D = 'M253.648 83.482c130.393-219.055 509.908 65.493-.513 372.6-514.788-328.942-101.873-598.697.513-372.6z';

      const bounds = getPathBoundsMCBySampling(HEART_D);
      const bw = Math.max(1e-6, bounds.maxX - bounds.minX);
      const bh = Math.max(1e-6, bounds.maxY - bounds.minY);
      const s = Math.min(width / bw, height / bh);
      let tx = (width - bw * s) / 2 - bounds.minX * s;
      let ty = (height - bh * s) / 2 - bounds.minY * s;

      const minX2 = bounds.minX * s + tx;
      const maxX2 = bounds.maxX * s + tx;
      const minY2 = bounds.minY * s + ty;
      const maxY2 = bounds.maxY * s + ty;

      if (minX2 < 0) tx -= minX2;
      if (maxX2 > width) tx -= (maxX2 - width);
      if (minY2 < 0) ty -= minY2;
      if (maxY2 > height) ty -= (maxY2 - height);
      return transformSvgPath(HEART_D, s, s, tx, ty);
    }
    
    case 'hexagon':
      const hexR = r * 0.95;
      const points: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + hexR * Math.cos(angle);
        const y = cy + hexR * Math.sin(angle);
        points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
      return points.join(' ') + ' Z';
    
    case 'star':
      const outerR = r * 0.95;
      const innerR = r * 0.4;
      const starPoints: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outerR : innerR;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        starPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
      return starPoints.join(' ') + ' Z';
    
    case 'rectangle':
    default:
      // Rounded rectangle
      const cr = Math.min(cornerRadius, Math.min(width, height) / 2);
      if (cr > 0) {
        return `M ${cr} 0 h ${width - 2 * cr} a ${cr} ${cr} 0 0 1 ${cr} ${cr} ` +
          `v ${height - 2 * cr} a ${cr} ${cr} 0 0 1 ${-cr} ${cr} ` +
          `h ${-(width - 2 * cr)} a ${cr} ${cr} 0 0 1 ${-cr} ${-cr} ` +
          `v ${-(height - 2 * cr)} a ${cr} ${cr} 0 0 1 ${cr} ${-cr} Z`;
      }
      return `M 0 0 h ${width} v ${height} h ${-width} Z`;
  }
}

/**
 * Check if a cell should be excluded due to center cutout
 * Works with any template - removes pieces in the center area
 */
export function isCenterCutoutExcluded(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number,
  cutoutRatio: number = 0.3
): boolean {
  // Calculate cell center position (normalized -0.5 to 0.5 from center)
  const dx = (col + 0.5) / totalCols - 0.5;
  const dy = (row + 0.5) / totalRows - 0.5;
  
  // Check if cell is within the center cutout area
  const halfRatio = cutoutRatio / 2;
  return Math.abs(dx) < halfRatio && Math.abs(dy) < halfRatio;
}

/**
 * Generate center cutout guide path (for blue stroke to show where to glue)
 * The guide follows the same shape as the template but scaled down
 */
export function generateCenterCutoutPath(
  width: number,
  height: number,
  ratio: number = 0.3,
  cornerRadius: number = 0,
  template: PuzzleTemplate = 'rectangle'
): string {
  // Generate the same template shape but scaled down for the cutout area
  const cutoutW = width * ratio;
  const cutoutH = height * ratio;
  const offsetX = (width - cutoutW) / 2;
  const offsetY = (height - cutoutH) / 2;
  
  // Generate the template outline at the scaled size
  const innerPath = generateTemplateOutline(template, cutoutW, cutoutH, cornerRadius * ratio);
  
  // Translate the path to center it
  return transformSvgPath(innerPath, 1, 1, offsetX, offsetY);
}

function transformSvgPath(
  d: string,
  scaleX: number,
  scaleY: number,
  translateX: number,
  translateY: number
): string {
  // Tokenize commands and numbers (supports omitted separators like "65.493-.513")
  const tokens = d.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) return d;

  const out: string[] = [];
  let i = 0;

  const isCmd = (t: string) => /^[a-zA-Z]$/.test(t);
  const nextNum = () => Number(tokens[i++]);
  const pushNum = (v: number) => out.push(Number.isFinite(v) ? String(+v.toFixed(3)) : String(v));

  const xAbs = (x: number) => x * scaleX + translateX;
  const yAbs = (y: number) => y * scaleY + translateY;
  const xRel = (dx: number) => dx * scaleX;
  const yRel = (dy: number) => dy * scaleY;

  while (i < tokens.length) {
    const cmdToken = tokens[i++];
    if (!isCmd(cmdToken)) return d;

    const cmd = cmdToken;
    out.push(cmd);

    const upper = cmd.toUpperCase();
    const isRelative = cmd !== upper;

    const readPairs = (pairCount: number) => {
      while (i < tokens.length && !isCmd(tokens[i])) {
        for (let p = 0; p < pairCount; p++) {
          const x = nextNum();
          const y = nextNum();
          pushNum(isRelative ? xRel(x) : xAbs(x));
          pushNum(isRelative ? yRel(y) : yAbs(y));
        }
      }
    };

    if (upper === 'Z') continue;

    if (upper === 'M' || upper === 'L' || upper === 'T') {
      readPairs(1);
      continue;
    }

    if (upper === 'C') {
      readPairs(3);
      continue;
    }

    if (upper === 'S' || upper === 'Q') {
      readPairs(2);
      continue;
    }

    if (upper === 'H') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const x = nextNum();
        pushNum(isRelative ? xRel(x) : xAbs(x));
      }
      continue;
    }

    if (upper === 'V') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const y = nextNum();
        pushNum(isRelative ? yRel(y) : yAbs(y));
      }
      continue;
    }

    if (upper === 'A') {
      // rx ry xAxisRotation largeArcFlag sweepFlag x y
      while (i < tokens.length && !isCmd(tokens[i])) {
        const rx = nextNum();
        const ry = nextNum();
        const rot = nextNum();
        const laf = nextNum();
        const sf = nextNum();
        const x = nextNum();
        const y = nextNum();

        pushNum(rx * scaleX);
        pushNum(ry * scaleY);
        pushNum(rot);
        out.push(String(laf));
        out.push(String(sf));
        pushNum(isRelative ? xRel(x) : xAbs(x));
        pushNum(isRelative ? yRel(y) : yAbs(y));
      }
      continue;
    }

    return d;
  }

  return out.join(' ');
}

function translatePath(path: string, dx: number, dy: number): string {
  return transformSvgPath(path, 1, 1, dx, dy);
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function cubicBounds1D(p0: number, p1: number, p2: number, p3: number): { min: number; max: number } {
  let min = Math.min(p0, p3);
  let max = Math.max(p0, p3);

  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = -p0 + p1;

  const A = 3 * a;
  const B = 2 * b;
  const C = c;

  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) < 1e-12) return { min, max };
    const t = -C / B;
    if (t > 0 && t < 1) {
      const v = cubicAt(p0, p1, p2, p3, t);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    return { min, max };
  }

  const disc = B * B - 4 * A * C;
  if (disc < 0) return { min, max };
  const sdisc = Math.sqrt(disc);
  const t1 = (-B + sdisc) / (2 * A);
  const t2 = (-B - sdisc) / (2 * A);

  if (t1 > 0 && t1 < 1) {
    const v = cubicAt(p0, p1, p2, p3, t1);
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (t2 > 0 && t2 < 1) {
    const v = cubicAt(p0, p1, p2, p3, t2);
    min = Math.min(min, v);
    max = Math.max(max, v);
  }

  return { min, max };
}

function getPathBoundsMC(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const tokens = d.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let i = 0;
  const isCmd = (t: string) => /^[a-zA-Z]$/.test(t);
  const nextNum = () => Number(tokens[i++]);

  let cx = 0;
  let cy = 0;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  while (i < tokens.length) {
    const cmdToken = tokens[i++];
    if (!isCmd(cmdToken)) break;

    const cmd = cmdToken;
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;

    if (upper === 'Z') continue;

    if (upper === 'M') {
      if (i + 1 >= tokens.length) break;
      const x = nextNum();
      const y = nextNum();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);

      while (i < tokens.length && !isCmd(tokens[i])) {
        const lx = nextNum();
        const ly = nextNum();
        cx = rel ? cx + lx : lx;
        cy = rel ? cy + ly : ly;
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
      }
      continue;
    }

    if (upper === 'C') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        const x1 = nextNum();
        const y1 = nextNum();
        const x2 = nextNum();
        const y2 = nextNum();
        const x = nextNum();
        const y = nextNum();

        const p0x = cx;
        const p0y = cy;
        const p1x = rel ? cx + x1 : x1;
        const p1y = rel ? cy + y1 : y1;
        const p2x = rel ? cx + x2 : x2;
        const p2y = rel ? cy + y2 : y2;
        const p3x = rel ? cx + x : x;
        const p3y = rel ? cy + y : y;

        const bx = cubicBounds1D(p0x, p1x, p2x, p3x);
        const by = cubicBounds1D(p0y, p1y, p2y, p3y);

        minX = Math.min(minX, bx.min);
        minY = Math.min(minY, by.min);
        maxX = Math.max(maxX, bx.max);
        maxY = Math.max(maxY, by.max);

        cx = p3x;
        cy = p3y;
      }
      continue;
    }

    break;
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

function getPathBoundsMCBySampling(d: string, stepsPerCubic: number = 256): { minX: number; minY: number; maxX: number; maxY: number } {
  const tokens = d.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let i = 0;
  const isCmd = (t: string) => /^[a-zA-Z]$/.test(t);
  const nextNum = () => Number(tokens[i++]);

  let cx = 0;
  let cy = 0;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const includePoint = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  const sampleCubic = (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number) => {
    for (let s = 0; s <= stepsPerCubic; s++) {
      const t = s / stepsPerCubic;
      const x = cubicAt(p0x, p1x, p2x, p3x, t);
      const y = cubicAt(p0y, p1y, p2y, p3y, t);
      includePoint(x, y);
    }
  };

  while (i < tokens.length) {
    const cmdToken = tokens[i++];
    if (!isCmd(cmdToken)) break;

    const cmd = cmdToken;
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;

    if (upper === 'Z') continue;

    if (upper === 'M') {
      if (i + 1 >= tokens.length) break;
      const x = nextNum();
      const y = nextNum();
      cx = rel ? cx + x : x;
      cy = rel ? cy + y : y;
      includePoint(cx, cy);

      while (i < tokens.length && !isCmd(tokens[i])) {
        const lx = nextNum();
        const ly = nextNum();
        cx = rel ? cx + lx : lx;
        cy = rel ? cy + ly : ly;
        includePoint(cx, cy);
      }
      continue;
    }

    if (upper === 'C') {
      while (i < tokens.length && !isCmd(tokens[i])) {
        if (i + 5 >= tokens.length) break;
        const x1 = nextNum();
        const y1 = nextNum();
        const x2 = nextNum();
        const y2 = nextNum();
        const x = nextNum();
        const y = nextNum();

        const p0x = cx;
        const p0y = cy;
        const p1x = rel ? cx + x1 : x1;
        const p1y = rel ? cy + y1 : y1;
        const p2x = rel ? cx + x2 : x2;
        const p2y = rel ? cy + y2 : y2;
        const p3x = rel ? cx + x : x;
        const p3y = rel ? cy + y : y;

        sampleCubic(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);
        cx = p3x;
        cy = p3y;
      }
      continue;
    }

    break;
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Generate blank center cutout path for frame/center-blank templates
 */
export function generateBlankCenterPath(
  width: number,
  height: number,
  ratio: number = 0.3,
  cornerRadius: number = 0
): string {
  const blankW = width * ratio;
  const blankH = height * ratio;
  const blankX = (width - blankW) / 2;
  const blankY = (height - blankH) / 2;
  const cr = Math.min(cornerRadius, Math.min(blankW, blankH) / 2);
  
  if (cr > 0) {
    return `M ${blankX + cr} ${blankY} h ${blankW - 2 * cr} ` +
      `a ${cr} ${cr} 0 0 1 ${cr} ${cr} v ${blankH - 2 * cr} ` +
      `a ${cr} ${cr} 0 0 1 ${-cr} ${cr} h ${-(blankW - 2 * cr)} ` +
      `a ${cr} ${cr} 0 0 1 ${-cr} ${-cr} v ${-(blankH - 2 * cr)} ` +
      `a ${cr} ${cr} 0 0 1 ${cr} ${-cr} Z`;
  }
  return `M ${blankX} ${blankY} h ${blankW} v ${blankH} h ${-blankW} Z`;
}

/**
 * Check if a cell should be excluded based on template shape
 */
export function isCellExcluded(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number,
  template: PuzzleTemplate,
  blankRatio: number = 0.3,
  puzzleWidth: number = 200,
  puzzleHeight: number = 150
): boolean {
  // Rectangle template - no exclusions
  if (template === 'rectangle') {
    return false;
  }
  
  // Calculate cell center position (normalized 0-1)
  const cellCenterX = (col + 0.5) / totalCols;
  const cellCenterY = (row + 0.5) / totalRows;
  
  // Center-relative coordinates (-0.5 to 0.5)
  const dx = cellCenterX - 0.5;
  const dy = cellCenterY - 0.5;
  
  // Frame and center-blank: exclude center pieces
  if ((template as string) === 'frame' || (template as string) === 'center-blank') {
    const halfRatio = blankRatio / 2;
    return Math.abs(dx) < halfRatio && Math.abs(dy) < halfRatio;
  }
  
  // Circle: exclude pieces outside circle
  if (template === 'circle') {
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist > 0.48; // Slightly inside edge
  }
  
  // Oval: exclude pieces outside ellipse
  if (template === 'oval') {
    const aspect = puzzleWidth / puzzleHeight;
    const normDx = dx / (0.48 * Math.max(1, aspect));
    const normDy = dy / (0.48 / Math.min(1, aspect));
    return (normDx * normDx + normDy * normDy) > 1;
  }
  
  // Heart: approximate heart shape exclusion matching the SVG path
  if (template === 'heart') {
    // Heart shape: wider at top, pointed at bottom
    // Normalized coordinates: dx is -0.5 to 0.5, dy is -0.5 to 0.5
    const absX = Math.abs(dx);
    const normY = dy + 0.15; // Shift down (heart is higher)
    
    // Top half (two bumps) - use circles
    if (normY < 0) {
      // In the top region, check if inside either of the two bumps
      const bumpCenterX = 0.22;
      const bumpCenterY = -0.12;
      const bumpRadius = 0.28;
      const distToBump = Math.sqrt((absX - bumpCenterX) ** 2 + (normY - bumpCenterY) ** 2);
      return distToBump > bumpRadius;
    }
    
    // Bottom half - triangular shape narrowing to point
    // Width decreases linearly as we go down
    const maxWidth = 0.45;
    const bottomY = 0.38;
    const widthAtY = maxWidth * (1 - normY / bottomY);
    
    if (normY > bottomY) return true; // Below the bottom point
    return absX > widthAtY;
  }
  
  // Hexagon: exclude pieces outside hexagon
  if (template === 'hexagon') {
    const x = Math.abs(dx);
    const y = Math.abs(dy);
    // Hexagon check: 2 * x + y <= 1 (normalized)
    return (x * 1.8 + y) > 0.48 || y > 0.42;
  }
  
  // Star: approximate star shape
  if (template === 'star') {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    // 5-point star with varying radius
    const starRadius = 0.25 + 0.2 * Math.cos(5 * angle);
    return dist > starRadius;
  }
  
  // Cloud: simple cloud approximation
  if ((template as string) === 'cloud') {
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist > 0.4;
  }
  
  return false;
}
