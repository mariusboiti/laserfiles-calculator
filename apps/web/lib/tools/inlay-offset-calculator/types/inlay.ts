export type FitType = 'tight' | 'normal' | 'loose';

export type InlayStrategy = 'both' | 'pocket-only' | 'inlay-only';

export type PreviewShape = 'circle' | 'rounded-rect';

export type InlayOffsetInput = {
  kerfMm: number;
  thicknessMm: number;
  fit: FitType;
  strategy: InlayStrategy;
  shape: PreviewShape;
};

export type InlayOffsetResult = {
  inlayOffsetMm: number;
  pocketOffsetMm: number;
  totalClearanceMm: number;
};
