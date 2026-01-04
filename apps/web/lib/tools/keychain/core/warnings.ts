/**
 * Keychain Hub - Shared Warnings
 */

import type { Warning, HoleConfig } from '../types';
import type { BBox } from './geometry';
import { holeFitsInShape, calculateWebThickness } from './geometry';

const MIN_WEB_THICKNESS = 2.0;
const MIN_EDGE_DISTANCE = 1.2;

export interface WarningContext {
  shapeBBox: BBox;
  hole: HoleConfig;
  textLength: number;
  minFontSize: number;
  maxTextWidth: number;
  hasOutlinedText: boolean;
}

/**
 * Generate common warnings for all keychain modes
 */
export function generateCommonWarnings(ctx: WarningContext): Warning[] {
  const warnings: Warning[] = [];

  // Hole warnings
  if (ctx.hole.enabled && ctx.hole.position !== 'none') {
    const holeRadius = ctx.hole.diameter / 2;

    // Hole outside shape
    if (!holeFitsInShape(ctx.shapeBBox, holeRadius, ctx.hole.margin, ctx.hole.position, MIN_EDGE_DISTANCE)) {
      warnings.push({
        id: 'hole-outside-shape',
        level: 'warn',
        message: 'Hole is too close to or outside shape edge',
        fix: 'Increase size or reduce hole diameter',
      });
    }

    // Web thickness
    const webThickness = calculateWebThickness(ctx.shapeBBox, holeRadius, ctx.hole.margin, ctx.hole.position);
    if (webThickness < MIN_WEB_THICKNESS) {
      warnings.push({
        id: 'thin-web',
        level: 'warn',
        message: `Web thickness (${webThickness.toFixed(1)}mm) is below minimum (${MIN_WEB_THICKNESS}mm)`,
        fix: 'Increase hole margin',
      });
    }
  }

  // Text warnings
  if (ctx.textLength === 0) {
    warnings.push({
      id: 'empty-text',
      level: 'error',
      message: 'Name/text is required',
      fix: 'Enter a name or text',
    });
  }

  // Text outline warning (V2)
  if (!ctx.hasOutlinedText && ctx.textLength > 0) {
    warnings.push({
      id: 'text-not-outlined',
      level: 'info',
      message: 'Text is not converted to paths - may require outline conversion for some laser workflows',
    });
  }

  return warnings;
}

/**
 * Warning for text too long
 */
export function textTooLongWarning(textWidth: number, maxWidth: number): Warning | null {
  if (textWidth > maxWidth) {
    return {
      id: 'text-too-long',
      level: 'warn',
      message: 'Text may be too long even at minimum font size',
      fix: 'Shorten text or increase max width',
    };
  }
  return null;
}

/**
 * Warning for small keychain
 */
export function smallKeychainWarning(width: number, height: number): Warning | null {
  if (width < 25 || height < 15) {
    return {
      id: 'small-keychain',
      level: 'info',
      message: 'Very small keychain may be fragile',
    };
  }
  return null;
}

/**
 * Warning for icon not selected
 */
export function noIconWarning(iconId: string | null, required: boolean): Warning | null {
  if (required && !iconId) {
    return {
      id: 'no-icon',
      level: 'warn',
      message: 'No icon selected',
      fix: 'Select an icon from the picker',
    };
  }
  return null;
}

/**
 * Check if export should be disabled
 */
export function isExportDisabled(warnings: Warning[]): boolean {
  return warnings.some(w => w.id === 'empty-text');
}

/**
 * Get blocking message
 */
export function getBlockingMessage(warnings: Warning[]): string | null {
  const blocking = warnings.find(w => w.level === 'error');
  return blocking ? blocking.message : null;
}
