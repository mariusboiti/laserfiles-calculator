import type { SignDocument, HoleConfig, MountingHole } from '../types/signPro';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export type HoleItem =
  | { kind: 'circle'; cx: number; cy: number; r: number; id?: string }
  | { kind: 'path'; d: string; id?: string };

export interface HolesProResult {
  cut: HoleItem[];
  engrave: HoleItem[];
  warnings: string[];
}

export function computeHolesPro(doc: SignDocument): HolesProResult {
  const holes = doc.holes;
  const w = doc.artboard.wMm;
  const h = doc.artboard.hMm;

  const warnings: string[] = [];
  const cut: HoleItem[] = [];
  const engrave: HoleItem[] = [];

  if (!holes || !holes.enabled || holes.mode === 'none') {
    return { cut, engrave, warnings };
  }

  // Render holes from holes array
  const r = holes.diameterMm / 2;
  for (const hole of holes.holes) {
    cut.push({ kind: 'circle', cx: hole.xMm, cy: hole.yMm, r, id: hole.id });
    
    // Validate hole position
    if (hole.xMm - r < 0 || hole.xMm + r > w || hole.yMm - r < 0 || hole.yMm + r > h) {
      warnings.push(`Hole at (${Math.round(hole.xMm)}, ${Math.round(hole.yMm)}) too close to edge`);
    }
  }

  return { cut, engrave, warnings };
}


/**
 * Clamp hole position within artboard bounds
 */
export function clampHolePosition(
  xMm: number,
  yMm: number,
  diameterMm: number,
  marginMm: number,
  artboardWmm: number,
  artboardHmm: number
): { xMm: number; yMm: number } {
  const r = diameterMm / 2;
  const minX = marginMm + r;
  const maxX = artboardWmm - marginMm - r;
  const minY = marginMm + r;
  const maxY = artboardHmm - marginMm - r;

  return {
    xMm: Math.max(minX, Math.min(maxX, xMm)),
    yMm: Math.max(minY, Math.min(maxY, yMm)),
  };
}

/**
 * Generate hole positions based on mode and parameters
 */
export function generateHolePositions(
  config: HoleConfig,
  artboardWmm: number,
  artboardHmm: number
): MountingHole[] {
  const { mode, diameterMm, marginMm, spacingXmm, offsetXmm, offsetYmm, insetXmm, insetYmm } = config;
  const r = diameterMm / 2;
  const holes: MountingHole[] = [];

  const clamp = (x: number, y: number) => 
    clampHolePosition(x, y, diameterMm, marginMm, artboardWmm, artboardHmm);

  const generateId = () => `hole-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  switch (mode) {
    case 'none':
      break;

    case 'one': {
      const pos = clamp(artboardWmm / 2 + offsetXmm, marginMm + r + offsetYmm);
      holes.push({ id: generateId(), xMm: pos.xMm, yMm: pos.yMm });
      break;
    }

    case 'two': {
      const centerX = artboardWmm / 2;
      const y = marginMm + r + offsetYmm;
      const halfSpacing = spacingXmm / 2;
      const pos1 = clamp(centerX - halfSpacing + offsetXmm, y);
      const pos2 = clamp(centerX + halfSpacing + offsetXmm, y);
      holes.push({ id: generateId(), xMm: pos1.xMm, yMm: pos1.yMm });
      holes.push({ id: generateId(), xMm: pos2.xMm, yMm: pos2.yMm });
      break;
    }

    case 'four': {
      const x1 = marginMm + r + insetXmm;
      const x2 = artboardWmm - marginMm - r - insetXmm;
      const y1 = marginMm + r + insetYmm;
      const y2 = artboardHmm - marginMm - r - insetYmm;
      
      const pos1 = clamp(x1, y1);
      const pos2 = clamp(x2, y1);
      const pos3 = clamp(x1, y2);
      const pos4 = clamp(x2, y2);
      
      holes.push({ id: generateId(), xMm: pos1.xMm, yMm: pos1.yMm });
      holes.push({ id: generateId(), xMm: pos2.xMm, yMm: pos2.yMm });
      holes.push({ id: generateId(), xMm: pos3.xMm, yMm: pos3.yMm });
      holes.push({ id: generateId(), xMm: pos4.xMm, yMm: pos4.yMm });
      break;
    }

    case 'custom':
      // Use existing holes array, but clamp them
      return config.holes.map(h => {
        const pos = clamp(h.xMm, h.yMm);
        return { ...h, xMm: pos.xMm, yMm: pos.yMm };
      });
  }

  return holes;
}

export function holesToSvg(items: HoleItem[]): string {
  if (items.length === 0) return '';
  return items
    .map((h) => {
      if (h.kind === 'circle') {
        return `<circle cx="${mm(h.cx)}" cy="${mm(h.cy)}" r="${mm(h.r)}" />`;
      }
      return `<path d="${h.d}" />`;
    })
    .join('');
}
