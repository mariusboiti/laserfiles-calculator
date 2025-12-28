export type ObjectShape = 'rect' | 'circle';

export type JigOptions = {
  bedWidthMm: number;
  bedHeightMm: number;

  objectWidthMm: number;
  objectHeightMm: number;
  objectShape: ObjectShape;

  rows: number;
  cols: number;
  spacingXmm: number;
  spacingYmm: number;
  marginMm: number;

  centerLayout: boolean;
  showBedOutline: boolean;

  cutHoles: boolean;
  engraveOutline: boolean;

  showNumbers?: boolean;
};
