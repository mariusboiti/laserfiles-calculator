/**
 * Personalised Sign Generator V3 - Hole Presets and Geometry
 */

import type { HoleConfig, HolePreset, HoleGeometry, ShapeBounds, SignShapeV3 } from '../types/signV3';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeHoleGeometry(
  config: HoleConfig,
  shapeBounds: ShapeBounds,
  shape: SignShapeV3
): HoleGeometry[] {
  if (config.preset === 'none') return [];

  const { width, height } = shapeBounds;
  const { diameter, margin, slotLength, slotWidth } = config;
  const r = diameter / 2;
  const edgeOffset = margin + r;

  const holes: HoleGeometry[] = [];

  switch (config.preset) {
    case 'top-center':
      holes.push({
        type: 'circle',
        cx: width / 2,
        cy: getTopYOffset(shape, width, height, edgeOffset),
        r,
      });
      break;

    case 'two-top':
      const topY = getTopYOffset(shape, width, height, edgeOffset);
      holes.push(
        { type: 'circle', cx: edgeOffset, cy: topY, r },
        { type: 'circle', cx: width - edgeOffset, cy: topY, r }
      );
      break;

    case 'four-corners':
      const cornerTopY = getTopYOffset(shape, width, height, edgeOffset);
      const cornerBottomY = height - edgeOffset;
      holes.push(
        { type: 'circle', cx: edgeOffset, cy: cornerTopY, r },
        { type: 'circle', cx: width - edgeOffset, cy: cornerTopY, r },
        { type: 'circle', cx: edgeOffset, cy: cornerBottomY, r },
        { type: 'circle', cx: width - edgeOffset, cy: cornerBottomY, r }
      );
      break;

    case 'two-sides':
      const sideY = height / 2;
      holes.push(
        { type: 'circle', cx: edgeOffset, cy: sideY, r },
        { type: 'circle', cx: width - edgeOffset, cy: sideY, r }
      );
      break;

    case 'slots':
      const slotY = getTopYOffset(shape, width, height, margin + (slotLength || 15) / 2);
      const slotR = (slotWidth || 4) / 2;
      const slotLen = slotLength || 15;
      holes.push(
        {
          type: 'slot',
          cx: edgeOffset + slotLen / 4,
          cy: slotY,
          slotPath: generateSlotPath(edgeOffset, slotY, slotLen, slotR),
        },
        {
          type: 'slot',
          cx: width - edgeOffset - slotLen / 4,
          cy: slotY,
          slotPath: generateSlotPath(width - edgeOffset - slotLen / 2, slotY, slotLen, slotR),
        }
      );
      break;
  }

  return holes;
}

function getTopYOffset(shape: SignShapeV3, width: number, height: number, defaultOffset: number): number {
  switch (shape) {
    case 'arch':
    case 'rounded-arch':
      const archHeight = width / 2;
      return Math.max(defaultOffset, archHeight * 0.6);
    case 'circle':
    case 'oval':
      return height * 0.15 + defaultOffset;
    case 'hex':
      return height * 0.1 + defaultOffset;
    case 'shield':
      return defaultOffset * 1.2;
    default:
      return defaultOffset;
  }
}

function generateSlotPath(x: number, y: number, length: number, radius: number): string {
  const halfLen = length / 2;
  return `M ${mm(x)} ${mm(y - radius)} 
    L ${mm(x + halfLen)} ${mm(y - radius)} 
    A ${mm(radius)} ${mm(radius)} 0 0 1 ${mm(x + halfLen)} ${mm(y + radius)} 
    L ${mm(x)} ${mm(y + radius)} 
    A ${mm(radius)} ${mm(radius)} 0 0 1 ${mm(x)} ${mm(y - radius)} Z`;
}

export function validateHoles(
  config: HoleConfig,
  shapeBounds: ShapeBounds,
  shape: SignShapeV3,
  cornerRadius: number
): string[] {
  const warnings: string[] = [];
  if (config.preset === 'none') return warnings;

  const holes = computeHoleGeometry(config, shapeBounds, shape);
  const { width, height } = shapeBounds;

  for (const hole of holes) {
    if (hole.type === 'circle' && hole.r) {
      if (hole.cx - hole.r < 0 || hole.cx + hole.r > width) {
        warnings.push('Hole extends beyond horizontal bounds');
      }
      if (hole.cy - hole.r < 0 || hole.cy + hole.r > height) {
        warnings.push('Hole extends beyond vertical bounds');
      }
      if (shape === 'rounded-rect' || shape === 'rounded-arch') {
        const minDist = cornerRadius + config.diameter / 2 + 2;
        if (hole.cx < minDist && hole.cy < minDist) {
          warnings.push('Hole too close to rounded corner');
        }
      }
    }
  }

  if (config.preset === 'two-top' || config.preset === 'four-corners') {
    const minSpacing = config.diameter * 3;
    if (width - config.margin * 2 - config.diameter < minSpacing) {
      warnings.push('Holes too close together');
    }
  }

  return warnings;
}

export function getHoleSvgElements(holes: HoleGeometry[], strokeWidth: number = 0.1): string {
  return holes
    .map((hole) => {
      if (hole.type === 'circle' && hole.r) {
        return `<circle cx="${mm(hole.cx)}" cy="${mm(hole.cy)}" r="${mm(hole.r)}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
      } else if (hole.type === 'slot' && hole.slotPath) {
        return `<path d="${hole.slotPath}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />`;
      }
      return '';
    })
    .join('\n    ');
}

export function getHoleTopClearance(config: HoleConfig, shape: SignShapeV3, width: number, height: number): number {
  if (config.preset === 'none') return 0;
  if (config.preset === 'two-sides') return 0;

  const baseOffset = config.margin + config.diameter;
  
  if (config.preset === 'slots') {
    return config.margin + (config.slotLength || 15) + 5;
  }

  switch (shape) {
    case 'arch':
    case 'rounded-arch':
      return Math.max(baseOffset, width / 2 * 0.6) + config.diameter;
    default:
      return baseOffset + 5;
  }
}
