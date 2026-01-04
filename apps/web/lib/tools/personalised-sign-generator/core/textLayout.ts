import type { TextLine, TextSizeMode } from '../types/sign';

/**
 * Approximate text width using character count and font size
 */
function approximateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/**
 * Fit text to width by calculating appropriate font size
 */
export function fitTextToWidth(
  text: string,
  maxWidth: number,
  baseFontSize: number,
  minFontSize: number
): number {
  if (!text || text.trim().length === 0) return baseFontSize;
  
  let fontSize = baseFontSize;
  let textWidth = approximateTextWidth(text, fontSize);
  
  while (textWidth > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    textWidth = approximateTextWidth(text, fontSize);
  }
  
  return Math.max(fontSize, minFontSize);
}

/**
 * Calculate vertical positions for text lines
 */
export function calculateTextPositions(
  lineCount: number,
  containerHeight: number
): number[] {
  if (lineCount === 1) {
    return [containerHeight * 0.55];
  }
  
  if (lineCount === 2) {
    return [containerHeight * 0.40, containerHeight * 0.65];
  }
  
  if (lineCount === 3) {
    return [containerHeight * 0.25, containerHeight * 0.55, containerHeight * 0.80];
  }
  
  return [containerHeight * 0.5];
}

/**
 * Calculate font size for a text line
 */
export function calculateFontSize(
  line: TextLine,
  maxWidth: number,
  isMainLine: boolean
): number {
  if (line.sizeMode === 'manual' && line.manualSize) {
    return line.manualSize;
  }
  
  const baseFontSize = isMainLine ? 48 : 24;
  const minFontSize = isMainLine ? 16 : 12;
  
  return fitTextToWidth(line.text, maxWidth * 0.9, baseFontSize, minFontSize);
}

/**
 * Generate SVG text elements for all lines
 */
export function generateTextElements(
  lines: TextLine[],
  containerWidth: number,
  containerHeight: number
): string {
  const activeLines = lines.filter((line) => line.text && line.text.trim().length > 0);
  
  if (activeLines.length === 0) return '';
  
  const positions = calculateTextPositions(activeLines.length, containerHeight);
  const centerX = containerWidth / 2;
  
  return activeLines
    .map((line, index) => {
      const isMainLine = activeLines.length === 1 || (activeLines.length === 2 && index === 1) || (activeLines.length === 3 && index === 1);
      const fontSize = calculateFontSize(line, containerWidth, isMainLine);
      const fontWeight = line.style === 'bold' ? 'bold' : 'normal';
      const y = positions[index];
      
      return `<text x="${centerX}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="middle" dominant-baseline="middle" fill="none" stroke="#000" stroke-width="0.3">${escapeXml(line.text)}</text>`;
    })
    .join('\n  ');
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
