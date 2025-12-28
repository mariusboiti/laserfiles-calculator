export type CurveStrength = 'gentle' | 'medium' | 'strong';

export type StandType = 'slot' | 'finger_joint';

export type PhotoSizePreset =
  | 'wallet'
  | '4x6'
  | '5x7'
  | 'a6'
  | 'custom';

export type MaterialThicknessMm = 3 | 4 | 6;

export type CurvedPhotoFrameInputs = {
  photoPreset: PhotoSizePreset;
  photoWidthMm: number;
  photoHeightMm: number;

  thicknessMm: MaterialThicknessMm;
  kerfMm: number;

  borderMm: number;
  cornerRadiusMm: number;

  curveStrength: CurveStrength;

  standType: StandType;
  standWidthMm: number;
  standDepthMm: number;
  standSlotAngleDeg: number;

  addNameText: boolean;
  nameText: string;
  nameTextSizeMm: number;

  photoDataUrl?: string; // optional embedded raster preview for ENGRAVE
};

export type CurvedPhotoFrameSvgs = {
  combined: string;
  front: string;
  back: string;
  stand: string;
};

export type CurvedPhotoFrameWarnings = {
  warnings: string[];
};

export type CurvedPhotoFrameResult = {
  svgs: CurvedPhotoFrameSvgs;
  warnings: CurvedPhotoFrameWarnings;
};
