/**
 * Keychain Hub - Emoji + Name Mode
 * 2-layer keychain with icon and text, outlined base
 */

import type { KeychainMode, EmojiNameState, BuildResult, Warning } from '../types';
import { clamp, mm, roundedRectPath, expandBBox, calculateHolePosition } from '../core/geometry';
import { measureTextMm, fitFontSize, getTextBBox } from '../core/textMeasure';
import { getIconById, getIconGroup } from '../core/iconLibrary';
import { buildCombinedSvg, holeElement, textElement, pathElement, sanitizeFilename } from '../core/export';
import { generateCommonWarnings, noIconWarning } from '../core/warnings';

export const EMOJI_NAME_DEFAULTS: EmojiNameState = {
  // New required fields
  name: 'Justin',
  fontFamily: 'Arial',
  fontWeight: 700,
  iconId: 'gamepad',
  iconSizePct: 0.9,
  gap: 6,
  stickerOffsetMm: 3.0,
  stickerSmoothMm: 0.6,
  ring: {
    enabled: false,
    outerDiameter: 12,
    innerDiameter: 6,
    bridgeWidth: 6,
    bridgeThickness: 3,
    gapFromSticker: 0.8,
    position: 'left',
  },
  textHeightMm: 12,
  render: '2-layer',
  cutStroke: 0.001,
  showBase: true,
  showTop: true,
  debugShowUnion: false,
  // Legacy fields
  height: 35,
  maxWidth: 120,
  outline: true,
  outlineThickness: 3.0,
  borderThickness: 2.0,
  hole: {
    enabled: true,
    diameter: 5,
    margin: 3.5,
    position: 'left',
  },
  cornerRadius: 8,
  smoothing: 0.8,
};

function clampState(state: Partial<EmojiNameState>): EmojiNameState {
  const s = { ...EMOJI_NAME_DEFAULTS, ...state };

  // Legacy fields with defaults
  s.height = clamp(s.height ?? 35, 15, 100);
  s.maxWidth = clamp(s.maxWidth ?? 120, 30, 300);
  s.iconSizePct = clamp(s.iconSizePct, 0.3, 1.5);
  s.gap = clamp(s.gap, 0, 30);
  s.outlineThickness = clamp(s.outlineThickness ?? 3, 1, 10);
  s.borderThickness = clamp(s.borderThickness ?? 2, 0, 10);
  s.cornerRadius = clamp(s.cornerRadius ?? 8, 0, 30);

  // Ensure hole is defined
  if (!s.hole) {
    s.hole = { ...EMOJI_NAME_DEFAULTS.hole! };
  } else if (state.hole) {
    s.hole = { ...EMOJI_NAME_DEFAULTS.hole!, ...state.hole };
  }
  s.hole.diameter = clamp(s.hole.diameter, 2, 15);
  s.hole.margin = clamp(s.hole.margin, 0, 20);

  s.cutStroke = clamp(s.cutStroke, 0.001, 0.2);

  return s;
}

function buildEmojiName(state: EmojiNameState): BuildResult {
  // Use defaults for legacy optional fields
  const height = state.height ?? 35;
  const maxWidth = state.maxWidth ?? 120;
  const outlineThickness = state.outlineThickness ?? 3;
  const borderThickness = state.borderThickness ?? 2;
  const cornerRadius = state.cornerRadius ?? 8;
  const hole = state.hole ?? EMOJI_NAME_DEFAULTS.hole!;
  
  const {
    name, fontFamily, fontWeight,
    iconId, iconSizePct, gap, cutStroke, showBase, showTop
  } = state;

  // Calculate content dimensions
  const contentHeight = height - outlineThickness * 2 - borderThickness * 2;
  const iconSize = contentHeight * iconSizePct;

  // Fit text to remaining width
  const maxTextWidth = maxWidth - iconSize - gap - outlineThickness * 2 - borderThickness * 2 - (hole.enabled ? hole.diameter + hole.margin * 2 : 0);
  const fontSize = fitFontSize(name, maxTextWidth, 8, contentHeight * 0.8, fontFamily, fontWeight);
  const textBBox = getTextBBox(name, fontSize, fontFamily, fontWeight);

  // Total content width
  const contentWidth = (iconId ? iconSize + gap : 0) + textBBox.width;

  // Calculate base dimensions (with outline)
  const baseWidth = contentWidth + outlineThickness * 2 + borderThickness * 2 + (hole.enabled ? hole.diameter + hole.margin * 2 + gap : 0);
  const baseHeight = height;

  // Offset for hole region
  const holeRegionWidth = hole.enabled ? hole.diameter + hole.margin * 2 : 0;

  // Generate base outline path
  const basePath = roundedRectPath(0, 0, baseWidth, baseHeight, cornerRadius + outlineThickness);

  // Generate top layer outline (inner)
  const topPadding = outlineThickness + borderThickness;
  const topWidth = baseWidth - topPadding * 2 - (hole.enabled && hole.position === 'left' ? holeRegionWidth : 0);
  const topHeight = baseHeight - topPadding * 2;
  const topX = topPadding + (hole.enabled && hole.position === 'left' ? holeRegionWidth : 0);
  const topY = topPadding;
  const topPath = roundedRectPath(topX, topY, topWidth, topHeight, cornerRadius);

  // Hole position
  let holeSvg = '';
  if (hole.enabled && hole.position !== 'none') {
    const holeRadius = hole.diameter / 2;
    const holePos = calculateHolePosition(
      { x: 0, y: 0, width: baseWidth, height: baseHeight },
      holeRadius,
      hole.margin,
      hole.position
    );
    if (holePos) {
      holeSvg = holeElement(holePos.x, holePos.y, holeRadius);
    }
  }

  // Icon position
  let iconSvg = '';
  if (iconId) {
    const iconX = topX + (topWidth - contentWidth) / 2;
    const iconY = topY + (topHeight - iconSize) / 2;
    iconSvg = getIconGroup(iconId, iconX, iconY, iconSize, 0.5);
  }

  // Text position
  const textX = topX + (topWidth - contentWidth) / 2 + (iconId ? iconSize + gap : 0) + textBBox.width / 2;
  const textY = baseHeight / 2;
  const textSvg = textElement(name, textX, textY, fontSize, fontFamily, fontWeight, 'middle', true, 0);

  // Build layers
  let cutContent = '';
  let engraveContent = '';

  // Base layer (cut)
  if (showBase) {
    cutContent += pathElement(basePath, true, cutStroke) + '\n    ';
  }

  // Top layer (cut)
  if (showTop && state.render === '2-layer') {
    cutContent += pathElement(topPath, true, cutStroke) + '\n    ';
  }

  // Hole (cut)
  cutContent += holeSvg;

  // Icon + Text (engrave on top layer)
  if (showTop) {
    engraveContent = iconSvg + '\n    ' + textSvg;
  }

  const options = { width: baseWidth, height: baseHeight, cutStroke, includeGuides: false };

  return {
    svgCombined: buildCombinedSvg({ cut: cutContent, engrave: engraveContent }, options),
    svgCut: buildCombinedSvg({ cut: cutContent, engrave: '' }, options),
    svgEngrave: buildCombinedSvg({ cut: '', engrave: engraveContent }, options),
    meta: { width: baseWidth, height: baseHeight, layers: state.render === '2-layer' ? 2 : 1 },
  };
}

function getWarnings(state: EmojiNameState): Warning[] {
  const warnings: Warning[] = [];

  const height = state.height ?? 35;
  const maxWidth = state.maxWidth ?? 120;
  const hole = state.hole ?? EMOJI_NAME_DEFAULTS.hole!;
  
  const baseWidth = height * 2; // approximate
  const shapeBBox = { x: 0, y: 0, width: baseWidth, height };

  warnings.push(...generateCommonWarnings({
    shapeBBox,
    hole,
    textLength: state.name.trim().length,
    minFontSize: 8,
    maxTextWidth: maxWidth,
    hasOutlinedText: false,
  }));

  const iconWarning = noIconWarning(state.iconId, false);
  if (iconWarning) warnings.push(iconWarning);

  return warnings;
}

function getFilenameBase(state: EmojiNameState): string {
  const slug = sanitizeFilename(state.name);
  const height = state.height ?? 35;
  return `keychain-emoji-${slug}-${height}h`;
}

export const emojiNameMode: KeychainMode<EmojiNameState> = {
  id: 'emoji-name',
  label: 'Emoji + Name',
  description: '2-layer keychain with icon and name',
  icon: 'smile',
  defaults: EMOJI_NAME_DEFAULTS,
  clamp: clampState,
  build: buildEmojiName,
  getWarnings,
  getFilenameBase,
};
