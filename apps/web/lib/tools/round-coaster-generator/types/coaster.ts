export type CoasterShape = 'circle' | 'hexagon' | 'shield';

export type CoasterOptions = {
  shape: CoasterShape;

  // Circle/Hexagon use diameter/width.
  widthMm: number;

  // Only used for shield.
  heightMm?: number;

  textTop?: string;
  textCenter: string;
  textBottom?: string;

  autoFontSize: boolean;
  fontSizeMm?: number;

  showBorder: boolean;
  doubleBorder: boolean;
};
