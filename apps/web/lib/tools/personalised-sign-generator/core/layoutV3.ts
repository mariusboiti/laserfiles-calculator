/**
 * Personalised Sign Generator V3 - Layout and Safe Zones
 */

import type { SignConfigV3, SafeZone, TextLayoutResult, CurvedMode } from '../types/signV3';
import { getTextAreaBounds } from './shapesV3';
import { getHoleTopClearance } from './holesV3';
import { fitFontSizeMeasured, fitFontSizeCurved, getTextDimensions } from './textFitV3';
import { applyTextTransform } from '../config/defaultsV3';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeSafeZone(config: SignConfigV3): SafeZone {
  const { shape, width, height, cornerRadius, padding, holes } = config;
  const textArea = getTextAreaBounds(shape, width, height, cornerRadius, 0);
  const holesClearance = getHoleTopClearance(holes, shape, width, height);

  return {
    top: Math.max(padding, textArea.y, holesClearance),
    bottom: padding + (height - textArea.y - textArea.height),
    left: Math.max(padding, textArea.x),
    right: Math.max(padding, width - textArea.x - textArea.width),
  };
}

export function computeTextLayout(config: SignConfigV3): TextLayoutResult {
  const { width, height, text } = config;
  const safeZone = computeSafeZone(config);
  
  const availableWidth = width - safeZone.left - safeZone.right;
  const centerX = width / 2;

  const line1Text = applyTextTransform(text.line1.text.trim(), text.line1.transform);
  const line2Text = applyTextTransform(text.line2.text.trim(), text.line2.transform);
  const line3Text = applyTextTransform(text.line3.text.trim(), text.line3.transform);

  const hasLine1 = line1Text.length > 0;
  const hasLine2 = line2Text.length > 0;
  const hasLine3 = line3Text.length > 0;

  const lineCount = (hasLine1 ? 1 : 0) + (hasLine2 ? 1 : 0) + (hasLine3 ? 1 : 0);
  if (lineCount === 0) return {};

  const result: TextLayoutResult = {};
  const positions = calculateVerticalPositions(lineCount, safeZone.top, height - safeZone.bottom, text.lineHeight);

  let posIndex = 0;

  if (hasLine1) {
    const fontSize = text.line1.fontSize;
    const dims = getTextDimensions(line1Text, availableWidth * 3, fontSize, fontSize, text.line1.fontFamily, text.line1.weight, text.line1.letterSpacing);
    const x = centerX + (text.line1.offsetX || 0);
    const y = positions[posIndex++] + (text.line1.offsetY || 0);
    result.line1 = { x, y, fontSize, width: dims.width };
  }

  if (hasLine2) {
    const isCurved = text.curvedModeLine2 !== 'straight';
    const fontSize = text.line2.fontSize;
    const dims = getTextDimensions(line2Text, availableWidth * 3, fontSize, fontSize, text.line2.fontFamily, text.line2.weight, text.line2.letterSpacing);
    
    const x = centerX + (text.line2.offsetX || 0);
    const y = positions[posIndex++] + (text.line2.offsetY || 0);
    result.line2 = { x, y, fontSize, width: dims.width };

    if (isCurved) {
      result.line2.curvedPath = generateCurvedTextPath(x, y, availableWidth, text.curvedIntensity, text.curvedModeLine2);
    }
  }

  if (hasLine3) {
    const fontSize = text.line3.fontSize;
    const dims = getTextDimensions(line3Text, availableWidth * 3, fontSize, fontSize, text.line3.fontFamily, text.line3.weight, text.line3.letterSpacing);
    const x = centerX + (text.line3.offsetX || 0);
    const y = positions[posIndex++] + (text.line3.offsetY || 0);
    result.line3 = { x, y, fontSize, width: dims.width };
  }

  return result;
}

function calculateVerticalPositions(lineCount: number, topY: number, bottomY: number, lineHeight: number): number[] {
  const totalHeight = bottomY - topY;
  const centerY = topY + totalHeight / 2;

  if (lineCount === 1) return [centerY];
  if (lineCount === 2) {
    const spacing = totalHeight * 0.25 * lineHeight;
    return [centerY - spacing, centerY + spacing];
  }
  if (lineCount === 3) {
    const spacing = totalHeight * 0.28 * lineHeight;
    return [centerY - spacing, centerY, centerY + spacing];
  }
  return [centerY];
}

function generateCurvedTextPath(centerX: number, centerY: number, width: number, intensity: number, mode: CurvedMode): string {
  if (mode === 'straight' || intensity <= 0) return '';

  const sagitta = (intensity / 100) * (width * 0.15);
  const halfWidth = width / 2;
  const startX = centerX - halfWidth;
  const endX = centerX + halfWidth;

  if (mode === 'arcUp') {
    const controlY = centerY - sagitta * 2;
    return `M ${mm(startX)} ${mm(centerY)} Q ${mm(centerX)} ${mm(controlY)} ${mm(endX)} ${mm(centerY)}`;
  } else {
    const controlY = centerY + sagitta * 2;
    return `M ${mm(startX)} ${mm(centerY)} Q ${mm(centerX)} ${mm(controlY)} ${mm(endX)} ${mm(centerY)}`;
  }
}

export function validateLayout(config: SignConfigV3): string[] {
  const warnings: string[] = [];
  const layout = computeTextLayout(config);
  const safeZone = computeSafeZone(config);
  const { text, width } = config;

  const line2Text = applyTextTransform(text.line2.text.trim(), text.line2.transform);
  if (line2Text.length === 0) {
    warnings.push('Main text (Line 2) is required');
  }

  const maxWidth = width - safeZone.left - safeZone.right;
  if (layout.line1 && layout.line1.width > maxWidth) warnings.push('Line 1 text is too long');
  if (layout.line2 && layout.line2.width > maxWidth) warnings.push('Line 2 text is too long');
  if (layout.line3 && layout.line3.width > maxWidth) warnings.push('Line 3 text is too long');

  if (text.curvedModeLine2 !== 'straight' && text.curvedIntensity > 80) {
    const minRadius = maxWidth / (2 * Math.sin(Math.PI / 4));
    if (minRadius < 30) warnings.push('Curved text arc radius is very small');
  }

  return warnings;
}

export function getSafeZoneSvg(safeZone: SafeZone, width: number, height: number): string {
  const x = safeZone.left;
  const y = safeZone.top;
  const w = width - safeZone.left - safeZone.right;
  const h = height - safeZone.top - safeZone.bottom;

  return `<rect x="${mm(x)}" y="${mm(y)}" width="${mm(w)}" height="${mm(h)}" fill="none" stroke="#00ff00" stroke-width="0.2" stroke-dasharray="2,2" opacity="0.5" />`;
}
