export type ObjectShape = 'rect' | 'circle' | 'custom';

export type CustomShapeData = {
  pathD: string;        // SVG path d attribute
  viewBox: string;      // Original viewBox
  originalW: number;    // Original width in viewBox units
  originalH: number;    // Original height in viewBox units
};

export type JigOptions = {
  bedWidthMm: number;
  bedHeightMm: number;

  objectWidthMm: number;
  objectHeightMm: number;
  objectShape: ObjectShape;
  customShape?: CustomShapeData;

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
