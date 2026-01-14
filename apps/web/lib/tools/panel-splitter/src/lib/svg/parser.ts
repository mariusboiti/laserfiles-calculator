import { SVGInfo, UnitMode } from '../../types';

const UNIT_TO_MM: Record<string, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
  pt: 25.4 / 72,
  pc: 25.4 / 6,
  px: 25.4 / 96,
};

export function parseUnit(value: string): { num: number; unit: string } {
  const match = value.trim().match(/^([\d.]+)\s*(mm|cm|in|pt|pc|px)?$/i);
  if (!match) {
    return { num: parseFloat(value) || 0, unit: 'px' };
  }
  return {
    num: parseFloat(match[1]) || 0,
    unit: (match[2] || 'px').toLowerCase(),
  };
}

export function convertToMm(value: number, unit: string, unitMode: UnitMode): number {
  if (unitMode === 'px96' && unit === 'px') {
    return value * (25.4 / 96);
  }
  if (unitMode === 'px72' && unit === 'px') {
    return value * (25.4 / 72);
  }
  const factor = UNIT_TO_MM[unit.toLowerCase()] ?? UNIT_TO_MM.px;
  return value * factor;
}

export function parseSVG(content: string, fileName: string, unitMode: UnitMode): SVGInfo {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  if (!svg) {
    throw new Error('panel_splitter.error.invalid_svg_no_svg_element');
  }

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error(`panel_splitter.error.svg_parsing_error:${parserError.textContent ?? ''}`);
  }

  let viewBox: { x: number; y: number; width: number; height: number } | null = null;
  const viewBoxAttr = svg.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }

  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');

  let width: number | null = null;
  let height: number | null = null;
  let widthUnit = 'px';
  let heightUnit = 'px';

  if (widthAttr) {
    const parsed = parseUnit(widthAttr);
    width = parsed.num;
    widthUnit = parsed.unit;
  }

  if (heightAttr) {
    const parsed = parseUnit(heightAttr);
    height = parsed.num;
    heightUnit = parsed.unit;
  }

  let detectedWidthMm: number;
  let detectedHeightMm: number;

  if (width !== null && height !== null) {
    detectedWidthMm = convertToMm(width, widthUnit, unitMode);
    detectedHeightMm = convertToMm(height, heightUnit, unitMode);
  } else if (viewBox) {
    detectedWidthMm = convertToMm(viewBox.width, 'px', unitMode);
    detectedHeightMm = convertToMm(viewBox.height, 'px', unitMode);
  } else {
    throw new Error('panel_splitter.error.svg_no_dimensions');
  }

  return {
    fileName,
    originalContent: content,
    viewBox,
    width,
    height,
    widthUnit,
    heightUnit,
    detectedWidthMm,
    detectedHeightMm,
  };
}

export function getBaseFileName(fileName: string): string {
  return fileName.replace(/\.svg$/i, '');
}
