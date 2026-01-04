import type { KeychainInputs } from '../types/keychain';
import { generateShapeOutline, getShapeViewBox, calculateHoleCenter, holeFits } from './shapeMath';
import { calculateTextRegion, calculateKeychainFontSize, escapeXml } from './textFit';

/**
 * Generate hole element
 */
function generateHole(cx: number, cy: number, radius: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#000" stroke-width="0.3" />`;
}

/**
 * Generate text element
 */
function generateText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontWeight: 'normal' | 'bold'
): string {
  if (!text || text.trim().length === 0) return '';
  
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="middle" dominant-baseline="middle" fill="none" stroke="#000" stroke-width="0.3">${escapeXml(text)}</text>`;
}

/**
 * Generate warnings for keychain configuration
 */
export function generateKeychainWarnings(inputs: KeychainInputs): string[] {
  const warnings: string[] = [];
  
  if (inputs.holeEnabled && inputs.holePosition !== 'none') {
    const holeRadius = inputs.holeDiameterMm / 2;
    const fits = holeFits(
      inputs.widthMm,
      inputs.heightMm,
      holeRadius,
      inputs.holeMarginMm,
      inputs.holePosition
    );
    
    if (!fits) {
      warnings.push('Hole does not fit within shape bounds. Increase dimensions or reduce hole size.');
    }
  }
  
  if (inputs.text && inputs.text.trim().length > 0) {
    const holeCenter = inputs.holeEnabled && inputs.holePosition !== 'none'
      ? calculateHoleCenter(
          inputs.widthMm,
          inputs.heightMm,
          inputs.holeDiameterMm / 2,
          inputs.holeMarginMm,
          inputs.holePosition
        )
      : null;
    
    const textRegion = calculateTextRegion(
      inputs.widthMm,
      inputs.heightMm,
      inputs.holeEnabled,
      inputs.holePosition,
      holeCenter?.cx ?? null,
      holeCenter?.cy ?? null,
      inputs.holeDiameterMm / 2
    );
    
    if (textRegion.maxWidth < 10) {
      warnings.push('Text area too small. Increase width or adjust hole position.');
    }
    
    const minFontSize = 8;
    const approximateWidth = inputs.text.length * minFontSize * 0.6;
    if (approximateWidth > textRegion.maxWidth) {
      warnings.push('Text may be too long even at minimum font size.');
    }
  }
  
  return warnings;
}

/**
 * Generate complete laser-safe SVG for keychain
 */
export function generateKeychainSvg(inputs: KeychainInputs): string {
  const { widthMm, heightMm, shape, cornerRadiusMm } = inputs;
  const viewBox = getShapeViewBox(shape, widthMm, heightMm);
  
  const shapeOutline = generateShapeOutline(shape, widthMm, heightMm, cornerRadiusMm);
  
  let holeElement = '';
  let holeCenter: { cx: number; cy: number } | null = null;
  
  if (inputs.holeEnabled && inputs.holePosition !== 'none') {
    const holeRadius = inputs.holeDiameterMm / 2;
    holeCenter = calculateHoleCenter(
      widthMm,
      heightMm,
      holeRadius,
      inputs.holeMarginMm,
      inputs.holePosition
    );
    
    if (holeCenter) {
      holeElement = generateHole(holeCenter.cx, holeCenter.cy, holeRadius);
    }
  }
  
  let textElement = '';
  if (inputs.text && inputs.text.trim().length > 0) {
    const textRegion = calculateTextRegion(
      widthMm,
      heightMm,
      inputs.holeEnabled,
      inputs.holePosition,
      holeCenter?.cx ?? null,
      holeCenter?.cy ?? null,
      inputs.holeDiameterMm / 2
    );
    
    const fontSize = calculateKeychainFontSize(
      inputs.text,
      textRegion,
      inputs.textSizeMode,
      inputs.textManualSize
    );
    
    textElement = generateText(
      inputs.text,
      textRegion.centerX,
      textRegion.centerY,
      fontSize,
      inputs.textWeight
    );
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox.width}mm" height="${viewBox.height}mm" viewBox="0 0 ${viewBox.width} ${viewBox.height}">
  <!-- Outline (cut) -->
  ${shapeOutline}
  
  <!-- Hole (cut) -->
  ${holeElement}
  
  <!-- Text (engrave) -->
  ${textElement}
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
    .substring(0, 30) || 'keychain';
}

/**
 * Generate filename for SVG export
 */
export function generateFilename(text: string): string {
  const slug = sanitizeFilename(text);
  return `keychain-${slug}.svg`;
}
