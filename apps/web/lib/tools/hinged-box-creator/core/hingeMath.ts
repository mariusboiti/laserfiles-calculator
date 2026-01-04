import type { FingerCountMode } from '../types/box';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type HingePattern = {
  count: number;
  pitchMm: number;
  // Whether a given segment index is a finger for the back panel.
  isBackFinger: (index: number) => boolean;
};

export function computeHingePattern(
  widthMm: number,
  fingerWidthMm: number,
  mode: FingerCountMode,
  manualCount?: number
): HingePattern {
  const w = clamp(widthMm, 1, 100000);
  const desired = clamp(fingerWidthMm, 1, w);

  let count = 0;
  if (mode === 'manual' && manualCount && Number.isFinite(manualCount)) {
    count = Math.floor(clamp(manualCount, 3, 999));
  } else {
    count = Math.floor(clamp(Math.round(w / desired), 3, 999));
  }

  // Prefer odd for symmetry (one piece will have one more finger).
  if (count % 2 === 0) count += 1;

  const pitchMm = w / count;

  return {
    count,
    pitchMm,
    isBackFinger: (i: number) => i % 2 === 0,
  };
}
