function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type FingerPattern = {
  tabCount: number;
  segmentCount: number;
  segmentMm: number;
  isTab: (index: number) => boolean;
};

// Pattern designed to start AND end with a tab (avoids floating corner).
export function computeFingerPattern(lengthMm: number, desiredFingerWidthMm: number, invert: boolean): FingerPattern {
  const len = clamp(lengthMm, 1, 100000);
  const fw = clamp(desiredFingerWidthMm, 1, len);

  let tabCount = Math.floor(clamp(Math.round(len / fw), 2, 999));
  if (tabCount % 2 === 0) tabCount += 1;

  const segmentCount = 2 * tabCount - 1;
  const segmentMm = len / segmentCount;

  return {
    tabCount,
    segmentCount,
    segmentMm,
    isTab: (i: number) => {
      const base = i % 2 === 0;
      return invert ? !base : base;
    },
  };
}
