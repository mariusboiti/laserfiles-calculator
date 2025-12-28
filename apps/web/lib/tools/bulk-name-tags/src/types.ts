export interface NameRecord {
  line1: string;
  line2?: string;
}

export type HorizontalAlignment = 'left' | 'center' | 'right';
export type TextCase = 'as-is' | 'uppercase' | 'capitalize';
export type OutputMode = 'sheet' | 'separate';
export type UnitSystem = 'mm' | 'in';

export type EmbeddedFontFormat = 'truetype' | 'opentype' | 'woff' | 'woff2';

export interface EmbeddedFont {
  fontFamily: string;
  dataUrl: string;
  format: EmbeddedFontFormat;
}

export interface TextLayoutConfig {
  horizontalAlignment: HorizontalAlignment;
  horizontalPosition?: number;
  verticalPosition: number;
  maxTextWidth: number;
  fontFamily: string;
  embeddedFont?: EmbeddedFont | null;
  fontSize: number;
  letterSpacing: number;
  textCase: TextCase;
  secondLineEnabled: boolean;
  secondLineFontSize: number;
  secondLineVerticalOffset: number;
}

export interface SheetLayoutConfig {
  outputMode: OutputMode;
  sheetWidth: number;
  sheetHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  rotation: 0 | 90;
  margin: number;
  fillToCapacity?: boolean;
}

export interface TemplateSizeConfig {
  width: number;
  height: number;
  lockAspect: boolean;
}

export interface TemplateBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GeneratedSVG {
  fileName: string;
  svg: string;
}

export interface CSVMapping {
  nameColumn: string;
  line2Column?: string;
}
