/**
 * Keychain Generator V2 - Production Warnings
 */

import type { KeychainConfigV2, Warning, HoleGeometry, TextRegion } from '../types/keychainV2';
import { computeHoleGeometry, calculateWebThickness, holeFitsInShape, calculateTextRegion } from './holeLayout';
import { validateTextFits } from './textFitV2';

const MIN_EDGE_DISTANCE = 1.2; // mm
const MIN_WEB_THICKNESS = 2.0; // mm
const MIN_SLOT_HEIGHT = 3.0;   // mm (for weak ring warning)
const MIN_TEXT_REGION = 10;    // mm

export function generateWarnings(config: KeychainConfigV2): Warning[] {
  const warnings: Warning[] = [];
  const { width, height, hole, text, padding } = config;

  // Compute hole geometry
  const holes = computeHoleGeometry(hole, width, height);

  // 1. Hole outside shape / too close to edge
  if (holes.length > 0) {
    if (!holeFitsInShape(holes, width, height, MIN_EDGE_DISTANCE)) {
      warnings.push({
        id: 'hole-outside-bounds',
        level: 'warn',
        message: 'Hole is too close to or outside shape edge',
        fix: 'Increase dimensions or reduce hole size/margin',
        autoFixable: true,
      });
    }
  }

  // 2. Web thickness warning
  if (holes.length > 0) {
    const webThickness = calculateWebThickness(holes, width, height, hole.position);
    if (webThickness < MIN_WEB_THICKNESS) {
      warnings.push({
        id: 'thin-web',
        level: 'warn',
        message: `Web thickness (${webThickness.toFixed(1)}mm) is below minimum (${MIN_WEB_THICKNESS}mm)`,
        fix: 'Increase margin or reduce hole size',
        autoFixable: true,
      });
    }
  }

  // 3. Slot hole height too small
  if (hole.enabled && hole.type === 'slot' && hole.slotHeight < MIN_SLOT_HEIGHT) {
    warnings.push({
      id: 'weak-slot',
      level: 'warn',
      message: `Slot height (${hole.slotHeight}mm) is very small - ring may be weak`,
      fix: 'Increase slot height to at least 3mm',
      autoFixable: true,
    });
  }

  // 4. Text region too small
  const textRegion = calculateTextRegion(width, height, padding, holes, hole.position, hole.margin);
  if (textRegion.width < MIN_TEXT_REGION) {
    warnings.push({
      id: 'text-region-small',
      level: 'warn',
      message: 'Text area is too narrow',
      fix: 'Increase width or adjust hole position',
      autoFixable: true,
    });
  }

  // 5. Text too long at minimum font size
  if (text.text.trim().length > 0) {
    const style = { fontFamily: text.fontFamily, fontWeight: text.weight };
    const fits = validateTextFits(
      text.text,
      text.text2,
      text.mode,
      textRegion,
      text.lineGap,
      text.fontMin,
      style
    );
    if (!fits) {
      warnings.push({
        id: 'text-too-long',
        level: 'warn',
        message: 'Text may not fit even at minimum font size',
        fix: 'Shorten text or increase keychain width',
      });
    }
  }

  // 6. Empty text warning
  if (text.text.trim().length === 0) {
    warnings.push({
      id: 'empty-text',
      level: 'error',
      message: 'Text is required',
      fix: 'Enter text for the keychain',
    });
  }

  // 7. Double line mode but second line empty
  if (text.mode === 'double' && text.text2.trim().length === 0) {
    warnings.push({
      id: 'empty-line2',
      level: 'info',
      message: 'Second line is empty - will be treated as single line',
    });
  }

  // 8. Very small keychain (fragile)
  if (width < 25 || height < 15) {
    warnings.push({
      id: 'fragile-size',
      level: 'info',
      message: 'Very small keychain may be fragile',
      fix: 'Consider increasing dimensions',
    });
  }

  // 9. Double holes spacing check
  if (hole.enabled && hole.type === 'double') {
    const maxSpacing = hole.position === 'top' ? width - hole.diameter * 2 - hole.margin * 2 : height - hole.diameter * 2 - hole.margin * 2;
    if (hole.spacing > maxSpacing) {
      warnings.push({
        id: 'hole-spacing-large',
        level: 'warn',
        message: 'Hole spacing is too large for keychain size',
        fix: 'Reduce spacing or increase keychain dimensions',
        autoFixable: true,
      });
    }
  }

  return warnings;
}

/**
 * Check if export should be disabled
 */
export function isExportDisabled(warnings: Warning[]): boolean {
  return warnings.some(w => w.id === 'empty-text');
}

/**
 * Get blocking message if export is disabled
 */
export function getBlockingMessage(warnings: Warning[]): string | null {
  const blocking = warnings.find(w => w.id === 'empty-text');
  return blocking ? blocking.message : null;
}

/**
 * Auto-fix configuration based on warnings
 */
export function applyAutoFixes(config: KeychainConfigV2, warnings: Warning[]): KeychainConfigV2 {
  let fixed = { ...config };

  for (const warning of warnings) {
    if (!warning.autoFixable) continue;

    switch (warning.id) {
      case 'hole-outside-bounds':
        // Increase margin
        fixed.hole = { ...fixed.hole, margin: fixed.hole.margin + 2 };
        break;

      case 'thin-web':
        // Increase margin or reduce hole size
        if (fixed.hole.margin < 8) {
          fixed.hole = { ...fixed.hole, margin: fixed.hole.margin + 2 };
        } else {
          fixed.hole = { ...fixed.hole, diameter: Math.max(2, fixed.hole.diameter - 1) };
        }
        break;

      case 'weak-slot':
        fixed.hole = { ...fixed.hole, slotHeight: MIN_SLOT_HEIGHT };
        break;

      case 'text-region-small':
        // Increase width
        fixed.width = fixed.width + 10;
        break;

      case 'hole-spacing-large':
        // Reduce spacing
        const maxSpacing = fixed.hole.position === 'top'
          ? fixed.width - fixed.hole.diameter * 2 - fixed.hole.margin * 2
          : fixed.height - fixed.hole.diameter * 2 - fixed.hole.margin * 2;
        fixed.hole = { ...fixed.hole, spacing: Math.max(5, maxSpacing - 5) };
        break;
    }
  }

  return fixed;
}
