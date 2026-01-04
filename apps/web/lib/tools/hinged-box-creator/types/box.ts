export type HingeType = 'finger';

export type FingerCountMode = 'auto' | 'manual';

export type HingedBoxOptions = {
  widthMm: number;
  depthMm: number;
  heightMm: number;

  thicknessMm: number;
  kerfMm: number;

  hingeType: HingeType;
  hingeFingerWidthMm: number;
  hingeFingerCountMode: FingerCountMode;
  hingeFingerCount?: number;
  hingeClearanceMm: number;

  fingerWidthMm: number;
  autoFitFingers: boolean;
};

export type HingedBoxSvgs = {
  front: string;
  back: string;
  left: string;
  right: string;
  bottom: string;
  lid: string;
};
