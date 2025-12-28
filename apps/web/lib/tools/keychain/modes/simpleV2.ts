/**
 * Keychain Hub V2 - Simple Mode (PRO)
 * Basic keychain with text as real paths (no <text>)
 */

import type { KeychainMode, SimpleKeychainState, BuildResult, Warning } from '../types';
import { clamp, roundedRectPath, capsulePath, circlePath, hexagonPath, dogTagPath, calculateHolePosition } from '../core/geometry';
import { textToPositionedPath, doubleLineTextToPath, measureTextBBoxMm } from '../core/textToPath';
import { fitFontSizePath, fitFontSizeDoubleLinePath } from '../core/textFitPath';
import { buildCombinedSvg, buildCutOnlySvg, buildEngraveOnlySvg, holeElement, pathElement, sanitizeFilename } from '../core/export';
import { generateCommonWarnings, smallKeychainWarning } from '../core/warnings';
import type { FontId } from '../core/fontRegistry';

export const SIMPLE_V2_DEFAULTS: SimpleKeychainState = {
  shape: 'rounded-rectangle',
  width: 70,
  height: 25,
  cornerRadius: 6,
  hole: {
    enabled: true,
    diameter: 5,
    margin: 3.5,
    position: 'left',
  },
  text: 'Marius',
  text2: '',
  textMode: 'single',
  fontFamily: 'Angelina Bold', // Default font from available fonts
  fontWeight: '700',
  fontSize: 14,
  autoFit: true,
  fontMin: 8,
  fontMax: 22,
  lineGap: 0.3,
  padding: 4,
  border: false,
  borderWidth: 1,
  cutStroke: 0.5,
  engraveStyle: 'fill',
  engraveStroke: 0.3,
};

function clampState(state: Partial<SimpleKeychainState>): SimpleKeychainState {
  const s = { ...SIMPLE_V2_DEFAULTS, ...state };

  s.width = clamp(s.width, 15, 300);
  s.height = clamp(s.height, 15, 300);
  s.cornerRadius = clamp(s.cornerRadius, 0, Math.min(60, s.width / 2, s.height / 2));
  s.padding = clamp(s.padding, 0, 30);

  if (state.hole) {
    s.hole = { ...SIMPLE_V2_DEFAULTS.hole, ...state.hole };
  }
  s.hole.diameter = clamp(s.hole.diameter, 2, 15);
  s.hole.margin = clamp(s.hole.margin, 0, 30);

  s.fontMin = clamp(s.fontMin, 4, 80);
  s.fontMax = clamp(s.fontMax, 4, 80);
  if (s.fontMin > s.fontMax) [s.fontMin, s.fontMax] = [s.fontMax, s.fontMin];

  s.lineGap = clamp(s.lineGap, 0.2, 1.0);
  s.cutStroke = clamp(s.cutStroke, 0.001, 0.2);
  s.engraveStroke = clamp(s.engraveStroke, 0.05, 2);

  return s;
}

async function buildSimpleV2(state: SimpleKeychainState): Promise<BuildResult> {
  const { shape, width, height, cornerRadius, hole, text, text2, textMode } = state;
  const { fontFamily, autoFit, fontMin, fontMax, lineGap, padding } = state;
  const { cutStroke, engraveStyle, engraveStroke } = state;

  // Use fontFamily directly as fontId (now dynamic)
  const fontId: FontId = fontFamily;

  // Calculate dimensions
  let viewWidth = width;
  let viewHeight = height;

  if (shape === 'circle') {
    viewWidth = viewHeight = Math.max(width, height);
  } else if (shape === 'dog-tag') {
    viewHeight = height + height * 0.1;
  }

  // Generate shape path
  let shapePath = '';
  switch (shape) {
    case 'rounded-rectangle':
      shapePath = roundedRectPath(0, 0, width, height, cornerRadius);
      break;
    case 'capsule':
      shapePath = capsulePath(0, 0, width, height);
      break;
    case 'circle':
      shapePath = circlePath(viewWidth / 2, viewHeight / 2, viewWidth / 2);
      break;
    case 'hexagon':
      shapePath = hexagonPath(width / 2, height / 2, width / 2, height / 2);
      break;
    case 'dog-tag':
      shapePath = dogTagPath(0, height * 0.1, width, height, cornerRadius);
      break;
  }

  // Hole
  let holeSvg = '';
  let holeReserveX = 0;
  if (hole.enabled && hole.position !== 'none') {
    const holeRadius = hole.diameter / 2;
    const holePos = calculateHolePosition(
      { x: 0, y: 0, width: viewWidth, height: viewHeight },
      holeRadius,
      hole.margin,
      hole.position
    );
    if (holePos) {
      holeSvg = holeElement(holePos.x, holePos.y, holeRadius);
      if (hole.position === 'left') {
        holeReserveX = holePos.x + holeRadius + padding;
      } else if (hole.position === 'right') {
        holeReserveX = -(viewWidth - holePos.x + holeRadius + padding);
      }
    }
  }

  // Text region
  let textStartX = padding;
  let textEndX = viewWidth - padding;
  if (hole.enabled && hole.position === 'left') {
    textStartX = holeReserveX;
  } else if (hole.enabled && hole.position === 'right') {
    textEndX = viewWidth + holeReserveX;
  }
  const textWidth = textEndX - textStartX;
  const textCenterX = (textStartX + textEndX) / 2;
  const textCenterY = viewHeight / 2;

  // Fit font size using real measurements
  let fontSize = state.fontSize;
  if (autoFit) {
    if (textMode === 'double' && text2.trim().length > 0) {
      fontSize = await fitFontSizeDoubleLinePath(text, text2, fontId, textWidth, height - padding * 2, lineGap, fontMin, fontMax);
    } else {
      fontSize = await fitFontSizePath(text, fontId, textWidth, fontMin, fontMax);
    }
  }

  // Generate text as paths (PRO feature - no <text> element)
  let textSvg = '';
  const isCut = engraveStyle === 'stroke';

  if (textMode === 'double' && text2.trim().length > 0) {
    const { svg } = await doubleLineTextToPath(
      text,
      text2,
      textCenterX,
      textCenterY,
      { fontId, fontSize, align: 'center' },
      lineGap,
      isCut,
      isCut ? engraveStroke : 0.001
    );
    textSvg = svg;
  } else {
    const { svg } = await textToPositionedPath(
      text,
      textCenterX,
      textCenterY,
      { fontId, fontSize, align: 'center' },
      isCut,
      isCut ? engraveStroke : 0.001
    );
    textSvg = svg;
  }

  // Build layers
  const cutContent = `${pathElement(shapePath, true, cutStroke)}\n    ${holeSvg}`;
  const engraveContent = textSvg;

  const options = { width: viewWidth, height: viewHeight, cutStroke, includeGuides: false };

  return {
    svgCombined: buildCombinedSvg({ cut: cutContent, engrave: engraveContent }, options),
    svgCut: buildCutOnlySvg(cutContent, options),
    svgEngrave: buildEngraveOnlySvg(engraveContent, options),
    meta: { width: viewWidth, height: viewHeight, layers: 1 },
  };
}

function getWarnings(state: SimpleKeychainState): Warning[] {
  const warnings: Warning[] = [];

  const shapeBBox = { x: 0, y: 0, width: state.width, height: state.height };

  warnings.push(...generateCommonWarnings({
    shapeBBox,
    hole: state.hole,
    textLength: state.text.trim().length,
    minFontSize: state.fontMin,
    maxTextWidth: state.width - state.padding * 2,
    hasOutlinedText: true, // V2 always uses outlined text
  }));

  const small = smallKeychainWarning(state.width, state.height);
  if (small) warnings.push(small);

  return warnings;
}

function getFilenameBase(state: SimpleKeychainState): string {
  const slug = sanitizeFilename(state.text);
  return `keychain-simple-${slug}-${state.width}x${state.height}`;
}

export const simpleModeV2: KeychainMode<SimpleKeychainState> = {
  id: 'simple',
  label: 'Simple Keychain',
  description: 'Basic shape with hole and engraved text (as paths)',
  icon: 'tag',
  defaults: SIMPLE_V2_DEFAULTS,
  clamp: clampState,
  build: buildSimpleV2 as any, // async
  getWarnings,
  getFilenameBase,
};
