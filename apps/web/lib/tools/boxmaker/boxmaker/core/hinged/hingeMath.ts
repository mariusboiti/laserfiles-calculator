function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type Segment = { type: 'finger' | 'gap'; width: number };

export function buildHingePattern(totalLength: number, fingerWidth: number): Segment[] {
  const len = clamp(totalLength, 1, 100000);
  const fw = clamp(fingerWidth, 0.1, len);

  let count = Math.floor(clamp(Math.round(len / fw), 3, 999));
  if (count % 2 === 0) count += 1;

  const base = len / count;
  const segments: Segment[] = [];
  for (let i = 0; i < count; i += 1) {
    segments.push({ type: i % 2 === 0 ? 'finger' : 'gap', width: base });
  }

  const sum = segments.reduce((acc, s) => acc + s.width, 0);
  const delta = len - sum;
  if (segments.length >= 2 && Math.abs(delta) > 1e-9) {
    segments[0] = { ...segments[0], width: Math.max(0.01, segments[0].width + delta / 2) };
    segments[segments.length - 1] = {
      ...segments[segments.length - 1],
      width: Math.max(0.01, segments[segments.length - 1].width + delta / 2),
    };
  }

  return segments;
}

export type HingePattern = {
  count: number;
  pitchMm: number;
  isBackFinger: (index: number) => boolean;
};

export function computeHingePattern(widthMm: number, fingerWidthMm: number, auto: boolean, manualCount?: number): HingePattern {
  const w = clamp(widthMm, 1, 100000);
  const fw = clamp(fingerWidthMm, 1, w);

  let count = 0;
  if (!auto && manualCount && Number.isFinite(manualCount)) {
    count = Math.floor(clamp(manualCount, 3, 999));
  } else {
    count = Math.floor(clamp(Math.round(w / fw), 3, 999));
  }

  if (count % 2 === 0) count += 1;

  return {
    count,
    pitchMm: w / count,
    isBackFinger: (i: number) => i % 2 === 0,
  };
}
