export type SignShape = 'rectangle' | 'rounded-rectangle' | 'arch' | 'circle' | 'hexagon';

export type TextStyle = 'normal' | 'bold';
export type TextSizeMode = 'auto' | 'manual';

export type HolePosition = 'top-left-right' | 'top-center' | 'none';

export interface TextLine {
  text: string;
  style: TextStyle;
  sizeMode: TextSizeMode;
  manualSize?: number;
}

export interface SignInputs {
  shape: SignShape;
  widthMm: number;
  heightMm: number;
  borderEnabled: boolean;
  holesEnabled: boolean;
  holeDiameterMm: number;
  holePosition: HolePosition;
  line1: TextLine;
  line2: TextLine;
  line3: TextLine;
}

export interface SignPreset {
  name: string;
  widthMm: number;
  heightMm: number;
}

export const SIGN_PRESETS: SignPreset[] = [
  { name: '300×150', widthMm: 300, heightMm: 150 },
  { name: '400×200', widthMm: 400, heightMm: 200 },
  { name: '500×250', widthMm: 500, heightMm: 250 },
];
