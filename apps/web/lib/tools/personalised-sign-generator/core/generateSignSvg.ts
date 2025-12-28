import type { SignInputs } from '../types/sign';
import { generateShapeOutline, getShapeViewBox } from './shapeMath';
import { generateTextElements } from './textLayout';

/**
 * Generate hole elements based on position setting
 */
function generateHoles(
  inputs: SignInputs,
  containerWidth: number,
  containerHeight: number
): string {
  if (!inputs.holesEnabled) return '';
  
  const radius = inputs.holeDiameterMm / 2;
  const margin = radius + 5;
  
  if (inputs.holePosition === 'top-center') {
    const cx = containerWidth / 2;
    const cy = margin;
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#000" stroke-width="0.3" />`;
  }
  
  if (inputs.holePosition === 'top-left-right') {
    const cy = margin;
    const leftCx = margin;
    const rightCx = containerWidth - margin;
    
    return `<circle cx="${leftCx}" cy="${cy}" r="${radius}" fill="none" stroke="#000" stroke-width="0.3" />
  <circle cx="${rightCx}" cy="${cy}" r="${radius}" fill="none" stroke="#000" stroke-width="0.3" />`;
  }
  
  return '';
}

/**
 * Generate complete laser-safe SVG for personalised sign
 */
export function generateSignSvg(inputs: SignInputs): string {
  const { widthMm, heightMm, shape } = inputs;
  const viewBox = getShapeViewBox(shape, widthMm, heightMm);
  
  const shapeOutline = generateShapeOutline(shape, widthMm, heightMm);
  const holes = generateHoles(inputs, widthMm, heightMm);
  const textElements = generateTextElements(
    [inputs.line1, inputs.line2, inputs.line3],
    widthMm,
    heightMm
  );
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox.width}mm" height="${viewBox.height}mm" viewBox="0 0 ${viewBox.width} ${viewBox.height}">
  <!-- Outline (cut) -->
  ${shapeOutline}
  
  <!-- Holes (cut) -->
  ${holes}
  
  <!-- Text (engrave) -->
  ${textElements}
</svg>`;
}

/**
 * Sanitize text to create valid filename slug
 */
export function sanitizeFilename(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || 'sign';
}

/**
 * Generate filename for SVG export
 */
export function generateFilename(mainText: string): string {
  const slug = sanitizeFilename(mainText);
  return `sign-${slug}.svg`;
}
