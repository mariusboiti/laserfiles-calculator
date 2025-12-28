/**
 * Personalised Sign Generator V3 - Shape Definitions
 * All shapes with path generation and bounds calculation
 */

import type { SignShapeV3, ShapeBounds } from '../types/signV3';
import { ORNATE_LABELS } from './shapes/ornateLabels';

/**
 * Round a number to 3 decimal places for SVG output
 */
function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

type PathToken = { type: 'cmd'; value: string } | { type: 'num'; value: number; raw: string };

function tokenizePath(d: string): PathToken[] {
  const tokens: PathToken[] = [];
  const re = /([a-zA-Z])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    if (m[1]) tokens.push({ type: 'cmd', value: m[1] });
    else if (m[2]) tokens.push({ type: 'num', value: Number(m[2]), raw: m[2] });
  }
  return tokens;
}

function isNum(t: PathToken | undefined): t is { type: 'num'; value: number; raw: string } {
  return !!t && t.type === 'num';
}

function scalePathD(d: string, sx: number, sy: number): string {
  const tokens = tokenizePath(d);
  let i = 0;
  let cmd = '';
  let out = '';

  const readNum = () => {
    const t = tokens[i];
    if (!isNum(t)) throw new Error('Invalid path data');
    i++;
    return t.value;
  };

  const hasMoreNums = () => isNum(tokens[i]);

  const writeNum = (n: number) => {
    out += String(mm(n));
  };

  const writeInt = (n: number) => {
    out += String(Math.round(n));
  };

  const sep = () => {
    const last = out[out.length - 1];
    if (last && last !== ' ' && last !== ',' && last !== '\n') out += ' ';
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'cmd') {
      cmd = t.value;
      out += cmd;
      i++;
    } else if (!cmd) {
      throw new Error('Path data missing command');
    }

    const C = cmd.toUpperCase();

    const scaleX = (x: number) => x * sx;
    const scaleY = (y: number) => y * sy;

    const writeXY = (x: number, y: number) => {
      sep();
      writeNum(scaleX(x));
      out += ' ';
      writeNum(scaleY(y));
    };

    const writeX = (x: number) => {
      sep();
      writeNum(scaleX(x));
    };

    const writeY = (y: number) => {
      sep();
      writeNum(scaleY(y));
    };

    if (C === 'M' || C === 'L' || C === 'T') {
      while (hasMoreNums()) {
        const x = readNum();
        const y = readNum();
        writeXY(x, y);
      }
      continue;
    }

    if (C === 'H') {
      while (hasMoreNums()) {
        const x = readNum();
        writeX(x);
      }
      continue;
    }

    if (C === 'V') {
      while (hasMoreNums()) {
        const y = readNum();
        writeY(y);
      }
      continue;
    }

    if (C === 'C') {
      while (hasMoreNums()) {
        const x1 = readNum();
        const y1 = readNum();
        const x2 = readNum();
        const y2 = readNum();
        const x = readNum();
        const y = readNum();
        writeXY(x1, y1);
        out += ' ';
        writeXY(x2, y2);
        out += ' ';
        writeXY(x, y);
      }
      continue;
    }

    if (C === 'S' || C === 'Q') {
      while (hasMoreNums()) {
        const x1 = readNum();
        const y1 = readNum();
        const x = readNum();
        const y = readNum();
        writeXY(x1, y1);
        out += ' ';
        writeXY(x, y);
      }
      continue;
    }

    if (C === 'A') {
      while (hasMoreNums()) {
        const rx = readNum();
        const ry = readNum();
        const rot = readNum();
        const laf = readNum();
        const sf = readNum();
        const x = readNum();
        const y = readNum();
        sep();
        writeNum(scaleX(rx));
        out += ' ';
        writeNum(scaleY(ry));
        out += ' ';
        writeNum(rot);
        out += ' ';
        writeInt(laf);
        out += ' ';
        writeInt(sf);
        out += ' ';
        writeNum(scaleX(x));
        out += ' ';
        writeNum(scaleY(y));
      }
      continue;
    }

    if (C === 'Z') {
      continue;
    }

    throw new Error(`Unsupported SVG path command: ${cmd}`);
  }

  return out.trim();
}

/**
 * Rectangle path
 */
export function rectanglePath(w: number, h: number): string {
  return `M 0 0 L ${mm(w)} 0 L ${mm(w)} ${mm(h)} L 0 ${mm(h)} Z`;
}

/**
 * Rounded rectangle path with configurable corner radius
 */
export function roundedRectPath(w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  if (radius <= 0) return rectanglePath(w, h);

  return `M ${mm(radius)} 0 
    L ${mm(w - radius)} 0 
    Q ${mm(w)} 0 ${mm(w)} ${mm(radius)} 
    L ${mm(w)} ${mm(h - radius)} 
    Q ${mm(w)} ${mm(h)} ${mm(w - radius)} ${mm(h)} 
    L ${mm(radius)} ${mm(h)} 
    Q 0 ${mm(h)} 0 ${mm(h - radius)} 
    L 0 ${mm(radius)} 
    Q 0 0 ${mm(radius)} 0 Z`;
}

/**
 * Arch path (rectangle with semicircle on top)
 */
export function archPath(w: number, h: number): string {
  const archRadius = w / 2;
  const archHeight = Math.min(archRadius, h * 0.4);
  
  return `M 0 ${mm(archHeight)} 
    A ${mm(archRadius)} ${mm(archHeight)} 0 0 1 ${mm(w)} ${mm(archHeight)} 
    L ${mm(w)} ${mm(h)} 
    L 0 ${mm(h)} 
    Z`;
}

/**
 * Rounded arch path (arch with rounded bottom corners)
 */
export function roundedArchPath(w: number, h: number, cornerR: number): string {
  const archRadius = w / 2;
  const archHeight = Math.min(archRadius, h * 0.4);
  const radius = Math.min(cornerR, w / 4, (h - archHeight) / 2);

  return `M 0 ${mm(archHeight)} 
    A ${mm(archRadius)} ${mm(archHeight)} 0 0 1 ${mm(w)} ${mm(archHeight)} 
    L ${mm(w)} ${mm(h - radius)} 
    Q ${mm(w)} ${mm(h)} ${mm(w - radius)} ${mm(h)} 
    L ${mm(radius)} ${mm(h)} 
    Q 0 ${mm(h)} 0 ${mm(h - radius)} 
    Z`;
}

/**
 * Circle path - centered at (diameter/2, diameter/2)
 */
export function circlePath(diameter: number): string {
  const r = diameter / 2;
  const cx = r;
  const cy = r;
  // Draw circle using two arcs, starting from right side
  return `M ${mm(cx + r)} ${mm(cy)} A ${mm(r)} ${mm(r)} 0 1 1 ${mm(cx - r)} ${mm(cy)} A ${mm(r)} ${mm(r)} 0 1 1 ${mm(cx + r)} ${mm(cy)} Z`;
}

/**
 * Oval/ellipse path - centered at (w/2, h/2)
 */
export function ovalPath(w: number, h: number): string {
  const rx = w / 2;
  const ry = h / 2;
  const cx = rx;
  const cy = ry;
  // Draw ellipse using two arcs, starting from right side
  return `M ${mm(cx + rx)} ${mm(cy)} A ${mm(rx)} ${mm(ry)} 0 1 1 ${mm(cx - rx)} ${mm(cy)} A ${mm(rx)} ${mm(ry)} 0 1 1 ${mm(cx + rx)} ${mm(cy)} Z`;
}

/**
 * Hexagon path (pointy top)
 */
export function hexPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;

  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    points.push([x, y]);
  }

  return points
    .map(([x, y], i) => (i === 0 ? `M ${mm(x)} ${mm(y)}` : `L ${mm(x)} ${mm(y)}`))
    .join(' ') + ' Z';
}

/**
 * Stadium/capsule path (pill shape)
 */
export function stadiumPath(w: number, h: number): string {
  if (w > h) {
    // Horizontal stadium
    const r = h / 2;
    return `M ${mm(r)} 0 
      L ${mm(w - r)} 0 
      A ${mm(r)} ${mm(r)} 0 0 1 ${mm(w - r)} ${mm(h)} 
      L ${mm(r)} ${mm(h)} 
      A ${mm(r)} ${mm(r)} 0 0 1 ${mm(r)} 0 Z`;
  } else {
    // Vertical stadium
    const r = w / 2;
    return `M 0 ${mm(r)} 
      A ${mm(r)} ${mm(r)} 0 0 1 ${mm(w)} ${mm(r)} 
      L ${mm(w)} ${mm(h - r)} 
      A ${mm(r)} ${mm(r)} 0 0 1 0 ${mm(h - r)} 
      Z`;
  }
}

/**
 * Shield/badge path
 */
export function shieldPath(w: number, h: number): string {
  const topR = w * 0.15;
  const bottomCurve = h * 0.4;

  return `M ${mm(topR)} 0 
    L ${mm(w - topR)} 0 
    Q ${mm(w)} 0 ${mm(w)} ${mm(topR)} 
    L ${mm(w)} ${mm(h - bottomCurve)} 
    Q ${mm(w)} ${mm(h - bottomCurve * 0.3)} ${mm(w / 2)} ${mm(h)} 
    Q 0 ${mm(h - bottomCurve * 0.3)} 0 ${mm(h - bottomCurve)} 
    L 0 ${mm(topR)} 
    Q 0 0 ${mm(topR)} 0 Z`;
}

/**
 * Tag/label path (rectangle with pointed end on right)
 */
export function tagPath(w: number, h: number): string {
  const pointDepth = Math.min(h * 0.3, w * 0.15);
  const cornerR = Math.min(8, h / 4);

  return `M ${mm(cornerR)} 0 
    L ${mm(w - pointDepth)} 0 
    L ${mm(w)} ${mm(h / 2)} 
    L ${mm(w - pointDepth)} ${mm(h)} 
    L ${mm(cornerR)} ${mm(h)} 
    Q 0 ${mm(h)} 0 ${mm(h - cornerR)} 
    L 0 ${mm(cornerR)} 
    Q 0 0 ${mm(cornerR)} 0 Z`;
}

/**
 * Plaque path (decorative rectangle with indented corners)
 */
export function plaquePath(w: number, h: number): string {
  const indent = Math.min(w * 0.08, h * 0.08, 20);
  const curve = indent * 0.6;

  return `M ${mm(indent)} 0 
    L ${mm(w - indent)} 0 
    Q ${mm(w - curve)} ${mm(curve)} ${mm(w)} ${mm(indent)} 
    L ${mm(w)} ${mm(h - indent)} 
    Q ${mm(w - curve)} ${mm(h - curve)} ${mm(w - indent)} ${mm(h)} 
    L ${mm(indent)} ${mm(h)} 
    Q ${mm(curve)} ${mm(h - curve)} 0 ${mm(h - indent)} 
    L 0 ${mm(indent)} 
    Q ${mm(curve)} ${mm(curve)} ${mm(indent)} 0 Z`;
}

/**
 * Build shape path based on shape type
 */
export function buildShapePath(
  shape: SignShapeV3,
  width: number,
  height: number,
  cornerRadius: number = 10
): ShapeBounds {
  let pathD: string;
  let bounds = { x: 0, y: 0, width, height };

  const ornate = ORNATE_LABELS.find((s) => s.id === shape);
  if (ornate) {
    pathD = scalePathD(ornate.pathD, width / 100, height / 100);
    return { ...bounds, pathD };
  }

  switch (shape) {
    case 'rectangle':
      pathD = rectanglePath(width, height);
      break;

    case 'rounded-rect':
      pathD = roundedRectPath(width, height, cornerRadius);
      break;

    case 'arch':
      pathD = archPath(width, height);
      break;

    case 'rounded-arch':
      pathD = roundedArchPath(width, height, cornerRadius);
      break;

    case 'circle':
      // Use min dimension so circle fits within artboard
      const diameter = Math.min(width, height);
      const offsetX = (width - diameter) / 2;
      const offsetY = (height - diameter) / 2;
      // Generate circle centered at origin, then translate to center of artboard
      const circleCentered = circlePath(diameter);
      pathD = `M ${mm(offsetX + diameter)} ${mm(offsetY + diameter/2)} A ${mm(diameter/2)} ${mm(diameter/2)} 0 1 1 ${mm(offsetX)} ${mm(offsetY + diameter/2)} A ${mm(diameter/2)} ${mm(diameter/2)} 0 1 1 ${mm(offsetX + diameter)} ${mm(offsetY + diameter/2)} Z`;
      bounds = { x: 0, y: 0, width, height };
      break;

    case 'oval':
      pathD = ovalPath(width, height);
      break;

    case 'hex':
      pathD = hexPath(width, height);
      break;

    case 'stadium':
      pathD = stadiumPath(width, height);
      break;

    case 'shield':
      pathD = shieldPath(width, height);
      break;

    case 'tag':
      pathD = tagPath(width, height);
      break;

    case 'plaque':
      pathD = plaquePath(width, height);
      break;

    default:
      pathD = roundedRectPath(width, height, cornerRadius);
  }

  return {
    ...bounds,
    pathD,
  };
}

/**
 * Validate shape configuration and return warnings
 */
export function validateShape(
  shape: SignShapeV3,
  width: number,
  height: number,
  cornerRadius: number
): string[] {
  const warnings: string[] = [];

  // Check corner radius
  if (shape === 'rounded-rect' || shape === 'rounded-arch') {
    const maxR = Math.min(width / 2, height / 2);
    if (cornerRadius > maxR) {
      warnings.push(`Corner radius (${cornerRadius}mm) exceeds maximum (${maxR.toFixed(1)}mm)`);
    }
  }

  // Check arch proportions
  if (shape === 'arch' || shape === 'rounded-arch') {
    const archHeight = width / 2;
    if (archHeight > height * 0.5) {
      warnings.push('Arch is very tall relative to sign height');
    }
  }

  // Check circle/oval proportions
  if (shape === 'circle' && Math.abs(width - height) > 1) {
    warnings.push('Circle shape uses the larger dimension');
  }

  // Check hex proportions
  if (shape === 'hex') {
    const aspectRatio = width / height;
    if (aspectRatio < 0.8 || aspectRatio > 1.25) {
      warnings.push('Hexagon may look distorted with this aspect ratio');
    }
  }

  return warnings;
}

/**
 * Get effective text area bounds within shape
 * Returns the rectangular area where text can safely be placed
 */
export function getTextAreaBounds(
  shape: SignShapeV3,
  width: number,
  height: number,
  cornerRadius: number,
  padding: number
): { x: number; y: number; width: number; height: number } {
  let insetX = padding;
  let insetY = padding;
  let effectiveWidth = width - padding * 2;
  let effectiveHeight = height - padding * 2;

  switch (shape) {
    case 'arch':
    case 'rounded-arch':
      // Arch has reduced height at top
      const archHeight = width / 2;
      insetY = Math.max(padding, archHeight * 0.3);
      effectiveHeight = height - insetY - padding;
      break;

    case 'circle':
    case 'oval':
      // Inscribed rectangle within ellipse
      const insetFactor = 0.29; // ~cos(45°) - 1
      insetX = width * insetFactor + padding;
      insetY = height * insetFactor + padding;
      effectiveWidth = width - insetX * 2;
      effectiveHeight = height - insetY * 2;
      break;

    case 'hex':
      // Inscribed rectangle within hexagon
      insetX = width * 0.25 + padding;
      effectiveWidth = width - insetX * 2;
      break;

    case 'shield':
      // Shield narrows at bottom
      effectiveHeight = height * 0.65 - padding;
      break;

    case 'tag':
      // Tag has pointed end
      const pointDepth = Math.min(height * 0.3, width * 0.15);
      effectiveWidth = width - pointDepth - padding * 2;
      break;

    case 'plaque':
      // Plaque has indented corners
      const indent = Math.min(width * 0.08, height * 0.08, 20);
      insetX = indent + padding;
      insetY = indent + padding;
      effectiveWidth = width - insetX * 2;
      effectiveHeight = height - insetY * 2;
      break;
  }

  return {
    x: insetX,
    y: insetY,
    width: Math.max(10, effectiveWidth),
    height: Math.max(10, effectiveHeight),
  };
}
