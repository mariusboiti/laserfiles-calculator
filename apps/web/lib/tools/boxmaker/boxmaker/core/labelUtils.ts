/**
 * Utilities for auto-fitting text labels on panels
 */

/**
 * Calculate approximate text width
 */
function approximateTextWidth(text: string, fontSize: number): number {
  // Rough approximation: each character is ~0.6 of font size
  return text.length * fontSize * 0.6;
}

/**
 * Auto-fit text to panel bounds by scaling font size
 */
export function autoFitText(
  text: string,
  maxWidth: number,
  maxHeight: number,
  baseFontSize = 12,
  minFontSize = 6
): {
  fontSize: number;
  displayText: string;
  isTruncated: boolean;
} {
  if (!text || text.trim().length === 0) {
    return { fontSize: baseFontSize, displayText: '', isTruncated: false };
  }
  
  let fontSize = baseFontSize;
  let displayText = text;
  let isTruncated = false;
  
  // Try to fit with decreasing font size
  while (fontSize >= minFontSize) {
    const textWidth = approximateTextWidth(displayText, fontSize);
    
    // Check if fits
    if (textWidth <= maxWidth && fontSize <= maxHeight) {
      return { fontSize, displayText, isTruncated };
    }
    
    // If still doesn't fit at min size, try truncating
    if (fontSize === minFontSize && textWidth > maxWidth) {
      // Truncate text with ellipsis
      const maxChars = Math.floor((maxWidth / (fontSize * 0.6)) - 3); // Reserve space for "..."
      if (maxChars > 0) {
        displayText = text.substring(0, maxChars) + '...';
        isTruncated = true;
        return { fontSize, displayText, isTruncated };
      }
      
      // If can't fit even truncated, return empty
      return { fontSize: minFontSize, displayText: '', isTruncated: true };
    }
    
    fontSize -= 1;
  }
  
  return { fontSize: minFontSize, displayText, isTruncated };
}

/**
 * Generate SVG text element with auto-fitted size
 */
export function generatePanelLabel(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  baseFontSize = 12
): string {
  const { fontSize, displayText, isTruncated } = autoFitText(
    text,
    maxWidth,
    maxHeight,
    baseFontSize
  );
  
  if (!displayText) return '';
  
  // Escape XML special characters
  const escaped = displayText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  return `<text x="${x.toFixed(3)}" y="${y.toFixed(3)}" font-family="Arial, sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="none" stroke="#999" stroke-width="0.2">${escaped}</text>`;
}

/**
 * Calculate safe label position within panel bounds
 */
export function calculateLabelPosition(
  panelWidth: number,
  panelHeight: number,
  padding = 5
): {
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
} {
  return {
    x: panelWidth / 2,
    y: panelHeight / 2,
    maxWidth: panelWidth - 2 * padding,
    maxHeight: panelHeight - 2 * padding,
  };
}
