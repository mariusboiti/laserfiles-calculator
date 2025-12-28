import type { FitType, InlayOffsetResult, InlayStrategy } from '../types/inlay';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function fitMultiplier(fit: FitType) {
  switch (fit) {
    case 'tight':
      return 0.5;
    case 'normal':
      return 1.0;
    case 'loose':
      return 1.5;
    default:
      return 1.0;
  }
}

export function calculateOffsets(kerfMm: number, fit: FitType, strategy: InlayStrategy): InlayOffsetResult {
  const k = clamp(kerfMm, 0, 10);
  const mult = fitMultiplier(fit);
  const base = (k / 2) * mult;

  let inlayOffsetMm = 0;
  let pocketOffsetMm = 0;

  switch (strategy) {
    case 'both':
      inlayOffsetMm = -base;
      pocketOffsetMm = +base;
      break;
    case 'pocket-only':
      inlayOffsetMm = 0;
      pocketOffsetMm = +2 * base;
      break;
    case 'inlay-only':
      inlayOffsetMm = -2 * base;
      pocketOffsetMm = 0;
      break;
  }

  return {
    inlayOffsetMm,
    pocketOffsetMm,
    totalClearanceMm: pocketOffsetMm - inlayOffsetMm,
  };
}
