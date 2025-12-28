import { RegistrationMarkSettings, GridInfo, Settings } from '../../types';

export interface MarkPosition {
  x: number;
  y: number;
}

export function generateMarkPositions(
  gridInfo: GridInfo,
  settings: Settings,
  _tileRow: number,
  _tileCol: number
): MarkPosition[] {
  const { margin } = settings;
  const { registrationMarks } = settings;
  const { effectiveTileWidth, effectiveTileHeight } = gridInfo;
  
  if (!registrationMarks.enabled) return [];

  const positions: MarkPosition[] = [];
  const markSize = registrationMarks.size;
  const offset = markSize / 2 + 1;

  if (registrationMarks.placement === 'inside') {
    positions.push(
      { x: margin + offset, y: margin + offset },
      { x: margin + effectiveTileWidth - offset, y: margin + offset },
      { x: margin + offset, y: margin + effectiveTileHeight - offset },
      { x: margin + effectiveTileWidth - offset, y: margin + effectiveTileHeight - offset }
    );
  } else {
    const overlapOffset = settings.overlap > 0 ? settings.overlap / 2 : offset;
    positions.push(
      { x: margin - overlapOffset, y: margin - overlapOffset },
      { x: margin + effectiveTileWidth + overlapOffset, y: margin - overlapOffset },
      { x: margin - overlapOffset, y: margin + effectiveTileHeight + overlapOffset },
      { x: margin + effectiveTileWidth + overlapOffset, y: margin + effectiveTileHeight + overlapOffset }
    );
  }

  return positions;
}

export function generateCrosshairSVG(x: number, y: number, settings: RegistrationMarkSettings): string {
  const halfSize = settings.size / 2;
  const sw = settings.strokeWidth;
  
  return `
    <line x1="${x - halfSize}" y1="${y}" x2="${x + halfSize}" y2="${y}" 
          stroke="black" stroke-width="${sw}" />
    <line x1="${x}" y1="${y - halfSize}" x2="${x}" y2="${y + halfSize}" 
          stroke="black" stroke-width="${sw}" />
  `;
}

export function generatePinholeSVG(x: number, y: number, settings: RegistrationMarkSettings): string {
  const radius = settings.holeDiameter / 2;
  const sw = settings.strokeWidth;
  
  return `
    <circle cx="${x}" cy="${y}" r="${radius}" 
            fill="none" stroke="black" stroke-width="${sw}" />
  `;
}

export function generateLMarkSVG(x: number, y: number, settings: RegistrationMarkSettings, corner: 'tl' | 'tr' | 'bl' | 'br'): string {
  const size = settings.size;
  const sw = settings.strokeWidth;
  
  let path = '';
  switch (corner) {
    case 'tl':
      path = `M ${x} ${y + size} L ${x} ${y} L ${x + size} ${y}`;
      break;
    case 'tr':
      path = `M ${x - size} ${y} L ${x} ${y} L ${x} ${y + size}`;
      break;
    case 'bl':
      path = `M ${x} ${y - size} L ${x} ${y} L ${x + size} ${y}`;
      break;
    case 'br':
      path = `M ${x - size} ${y} L ${x} ${y} L ${x} ${y - size}`;
      break;
  }
  
  return `<path d="${path}" fill="none" stroke="black" stroke-width="${sw}" />`;
}

export function generateRegistrationMarksSVG(
  gridInfo: GridInfo,
  settings: Settings,
  tileRow: number,
  tileCol: number
): string {
  const { registrationMarks } = settings;
  if (!registrationMarks.enabled) return '';

  const positions = generateMarkPositions(gridInfo, settings, tileRow, tileCol);
  const corners: Array<'tl' | 'tr' | 'bl' | 'br'> = ['tl', 'tr', 'bl', 'br'];
  
  let marksSVG = '<g id="registration-marks">';
  
  positions.forEach((pos, index) => {
    switch (registrationMarks.type) {
      case 'crosshair':
        marksSVG += generateCrosshairSVG(pos.x, pos.y, registrationMarks);
        break;
      case 'pinhole':
        marksSVG += generatePinholeSVG(pos.x, pos.y, registrationMarks);
        break;
      case 'lmark':
        marksSVG += generateLMarkSVG(pos.x, pos.y, registrationMarks, corners[index]);
        break;
    }
  });
  
  marksSVG += '</g>';
  return marksSVG;
}

export function generateMarksSVGForCanvas(
  positions: MarkPosition[],
  settings: RegistrationMarkSettings
): { type: string; x: number; y: number; size: number; strokeWidth: number; holeDiameter: number }[] {
  return positions.map((pos, index) => ({
    type: settings.type,
    x: pos.x,
    y: pos.y,
    size: settings.size,
    strokeWidth: settings.strokeWidth,
    holeDiameter: settings.holeDiameter,
    corner: ['tl', 'tr', 'bl', 'br'][index] as 'tl' | 'tr' | 'bl' | 'br'
  }));
}
