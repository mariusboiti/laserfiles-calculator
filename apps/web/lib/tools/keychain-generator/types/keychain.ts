export type KeychainShape = 'rounded-rectangle' | 'circle' | 'dog-tag' | 'capsule' | 'hexagon';

export type HolePosition = 'left' | 'top' | 'right' | 'none';

export type TextSizeMode = 'auto' | 'manual';

export type TextWeight = 'normal' | 'bold';

export interface KeychainInputs {
  shape: KeychainShape;
  widthMm: number;
  heightMm: number;
  cornerRadiusMm: number;
  borderEnabled: boolean;
  holeEnabled: boolean;
  holeDiameterMm: number;
  holeMarginMm: number;
  holePosition: HolePosition;
  text: string;
  textSizeMode: TextSizeMode;
  textManualSize?: number;
  textWeight: TextWeight;
  thicknessMm?: number;
}

export interface KeychainPreset {
  name: string;
  widthMm: number;
  heightMm: number;
}

export const KEYCHAIN_PRESETS: KeychainPreset[] = [
  { name: '70×25', widthMm: 70, heightMm: 25 },
  { name: '80×30', widthMm: 80, heightMm: 30 },
  { name: '90×35', widthMm: 90, heightMm: 35 },
];
