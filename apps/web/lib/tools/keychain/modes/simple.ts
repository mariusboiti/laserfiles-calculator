/**
 * Keychain Hub - Simple Mode
 * Basic keychain with shape, hole, and text
 */

import type { KeychainMode, SimpleKeychainState, BuildResult, Warning } from '../types';
import { clamp, mm, roundedRectPath, capsulePath, circlePath, hexagonPath, dogTagPath, calculateHolePosition } from '../core/geometry';
import { measureTextMm, fitFontSize, fitFontSizeDoubleLine } from '../core/textMeasure';
import { buildCombinedSvg, buildCutOnlySvg, buildEngraveOnlySvg, holeElement, textElement, pathElement, sanitizeFilename } from '../core/export';
import { generateCommonWarnings, textTooLongWarning, smallKeychainWarning } from '../core/warnings';

export const SIMPLE_DEFAULTS: SimpleKeychainState = {
  shape: 'rounded-rectangle',
  width: 70,
  height: 25,
  cornerRadius: 6,
  hole: {
    enabled: true,
    diameter: 5,
    margin: 4,
    position: 'left',
  },
  text: 'Marius',
  text2: '',
  textMode: 'single',
  fontFamily: 'Inter',
  fontWeight: '700',
  fontSize: 14,
  autoFit: true,
  fontMin: 8,
  fontMax: 22,
  lineGap: 0.9,
  padding: 4,
  border: false,
  borderWidth: 1,
  cutStroke: 0.001,
  engraveStyle: 'fill',
  engraveStroke: 0.3,
};

function clampState(state: Partial<SimpleKeychainState>): SimpleKeychainState {
  const s = { ...SIMPLE_DEFAULTS, ...state };

  s.width = clamp(s.width, 15, 300);
  s.height = clamp(s.height, 15, 300);
  s.cornerRadius = clamp(s.cornerRadius, 0, Math.min(60, s.width / 2, s.height / 2));
  s.padding = clamp(s.padding, 0, 30);

  if (state.hole) {
    s.hole = { ...SIMPLE_DEFAULTS.hole, ...state.hole };
  }
  s.hole.diameter = clamp(s.hole.diameter, 2, 15);
  s.hole.margin = clamp(s.hole.margin, 0, 30);

  s.fontMin = clamp(s.fontMin, 6, 80);
  s.fontMax = clamp(s.fontMax, 6, 80);
  if (s.fontMin > s.fontMax) [s.fontMin, s.fontMax] = [s.fontMax, s.fontMin];

  s.lineGap = clamp(s.lineGap, 0.7, 1.4);
  s.cutStroke = clamp(s.cutStroke, 0.001, 0.2);
  s.engraveStroke = clamp(s.engraveStroke, 0.05, 2);

  return s;
}

function buildSimple(state: SimpleKeychainState): BuildResult {
  const { shape, width, height, cornerRadius, hole, text, text2, textMode } = state;
  const { fontFamily, fontWeight, autoFit, fontMin, fontMax, lineGap, padding } = state;
  const { cutStroke, engraveStyle, engraveStroke } = state;

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

  // Fit font size
  let fontSize = state.fontSize;
  if (autoFit) {
    if (textMode === 'double' && text2.trim().length > 0) {
      fontSize = fitFontSizeDoubleLine(text, text2, textWidth, height - padding * 2, lineGap, fontMin, fontMax, fontFamily, fontWeight);
    } else {
      fontSize = fitFontSize(text, textWidth, fontMin, fontMax, fontFamily, fontWeight);
    }
  }

  // Generate text
  let textSvg = '';
  const fill = engraveStyle.includes('fill');
  const stroke = engraveStyle.includes('stroke') ? engraveStroke : 0;

  if (textMode === 'double' && text2.trim().length > 0) {
    const totalHeight = fontSize * (2 + lineGap);
    const y1 = textCenterY - totalHeight / 2 + fontSize / 2;
    const y2 = y1 + fontSize * (1 + lineGap);
    textSvg = textElement(text, textCenterX, y1, fontSize, fontFamily, fontWeight, 'middle', fill, stroke);
    textSvg += '\n    ' + textElement(text2, textCenterX, y2, fontSize, fontFamily, fontWeight, 'middle', fill, stroke);
  } else {
    textSvg = textElement(text, textCenterX, textCenterY, fontSize, fontFamily, fontWeight, 'middle', fill, stroke);
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
    hasOutlinedText: false,
  }));

  const small = smallKeychainWarning(state.width, state.height);
  if (small) warnings.push(small);

  return warnings;
}

function getFilenameBase(state: SimpleKeychainState): string {
  const slug = sanitizeFilename(state.text);
  return `keychain-simple-${slug}-${state.width}x${state.height}`;
}

export const simpleMode: KeychainMode<SimpleKeychainState> = {
  id: 'simple',
  label: 'Simple Keychain',
  description: 'Basic shape with hole and engraved text',
  icon: 'tag',
  defaults: SIMPLE_DEFAULTS,
  clamp: clampState,
  build: buildSimple,
  getWarnings,
  getFilenameBase,
};
