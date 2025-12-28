/**
 * Keychain Hub - Sticker/Bubble Mode
 * 2-layer keychain with bubble outline and text/icon
 */

import type { KeychainMode, StickerBubbleState, BuildResult, Warning } from '../types';
import { clamp, mm, roundedRectPath, bubblePath, expandBBox, calculateHolePosition } from '../core/geometry';
import { measureTextMm, fitFontSize, fitFontSizeDoubleLine, getTextBBox } from '../core/textMeasure';
import { getIconById, getIconGroup } from '../core/iconLibrary';
import { buildCombinedSvg, holeElement, textElement, pathElement, sanitizeFilename } from '../core/export';
import { generateCommonWarnings, noIconWarning } from '../core/warnings';

export const STICKER_BUBBLE_DEFAULTS: StickerBubbleState = {
  height: 40,
  maxWidth: 150,
  text: 'Hello',
  text2: 'World',
  fontFamily: 'Arial',
  fontWeight: 700,
  iconId: null,
  iconPosition: 'left',
  iconSizePct: 0.7,
  gap: 5,
  bubblePadding: 8,
  bubbleCornerRadius: 15,
  bubbleThickness: 3,
  hole: {
    enabled: true,
    diameter: 5,
    margin: 4,
    position: 'left',
  },
  render: '2-layer',
  cutStroke: 0.001,
  textAlign: 'center',
};

function clampState(state: Partial<StickerBubbleState>): StickerBubbleState {
  const s = { ...STICKER_BUBBLE_DEFAULTS, ...state };

  s.height = clamp(s.height, 20, 120);
  s.maxWidth = clamp(s.maxWidth, 40, 300);
  s.iconSizePct = clamp(s.iconSizePct, 0.3, 1.5);
  s.gap = clamp(s.gap, 0, 20);
  s.bubblePadding = clamp(s.bubblePadding, 2, 30);
  s.bubbleCornerRadius = clamp(s.bubbleCornerRadius, 2, 50);
  s.bubbleThickness = clamp(s.bubbleThickness, 1, 15);

  if (state.hole) {
    s.hole = { ...STICKER_BUBBLE_DEFAULTS.hole, ...state.hole };
  }
  s.hole.diameter = clamp(s.hole.diameter, 2, 15);
  s.hole.margin = clamp(s.hole.margin, 0, 20);

  s.cutStroke = clamp(s.cutStroke, 0.001, 0.2);

  return s;
}

function buildStickerBubble(state: StickerBubbleState): BuildResult {
  const {
    height, maxWidth, text, text2, fontFamily, fontWeight,
    iconId, iconPosition, iconSizePct, gap,
    bubblePadding, bubbleCornerRadius, bubbleThickness,
    hole, cutStroke, textAlign
  } = state;

  // Calculate content area
  const contentHeight = height - bubblePadding * 2 - bubbleThickness * 2;
  const hasSecondLine = text2.trim().length > 0;
  const hasIcon = iconId && iconPosition !== 'none';

  // Icon size
  const iconSize = hasIcon ? contentHeight * iconSizePct : 0;

  // Calculate available text width
  const holeRegion = hole.enabled ? hole.diameter + hole.margin * 2 + gap : 0;
  const iconRegion = hasIcon && iconPosition === 'left' ? iconSize + gap : 0;
  const maxTextWidth = maxWidth - bubblePadding * 2 - bubbleThickness * 2 - holeRegion - iconRegion;

  // Fit text
  let fontSize: number;
  if (hasSecondLine) {
    fontSize = fitFontSizeDoubleLine(text, text2, maxTextWidth, contentHeight, 0.3, 8, contentHeight * 0.4, fontFamily, fontWeight);
  } else {
    fontSize = fitFontSize(text, maxTextWidth, 8, contentHeight * 0.7, fontFamily, fontWeight);
  }

  const textBBox1 = getTextBBox(text, fontSize, fontFamily, fontWeight);
  const textBBox2 = hasSecondLine ? getTextBBox(text2, fontSize, fontFamily, fontWeight) : { width: 0, height: 0 };
  const textWidth = Math.max(textBBox1.width, textBBox2.width);
  const textHeight = hasSecondLine ? fontSize * 2.3 : fontSize * 1.2;

  // Calculate total content dimensions
  const contentWidth = (hasIcon && iconPosition === 'left' ? iconSize + gap : 0) + textWidth;

  // Calculate bubble dimensions
  const innerWidth = contentWidth + bubblePadding * 2;
  const innerHeight = Math.max(contentHeight, hasIcon && iconPosition === 'top' ? iconSize + gap + textHeight : textHeight) + bubblePadding * 2;

  // Base (outer bubble) dimensions
  const baseWidth = innerWidth + bubbleThickness * 2 + holeRegion;
  const baseHeight = innerHeight + bubbleThickness * 2;

  // Generate base path (outer bubble)
  const basePath = roundedRectPath(0, 0, baseWidth, baseHeight, bubbleCornerRadius + bubbleThickness);

  // Generate inner bubble path (top layer)
  const innerX = bubbleThickness + (hole.enabled && hole.position === 'left' ? holeRegion : 0);
  const innerY = bubbleThickness;
  const innerPath = roundedRectPath(innerX, innerY, innerWidth, innerHeight, bubbleCornerRadius);

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

  // Content positioning
  const contentStartX = innerX + bubblePadding;
  const contentCenterY = baseHeight / 2;

  // Icon
  let iconSvg = '';
  if (hasIcon && iconPosition === 'left') {
    const iconX = contentStartX;
    const iconY = contentCenterY - iconSize / 2;
    iconSvg = getIconGroup(iconId!, iconX, iconY, iconSize, 0.5);
  } else if (hasIcon && iconPosition === 'top') {
    const iconX = contentStartX + (contentWidth - iconSize) / 2;
    const iconY = innerY + bubblePadding;
    iconSvg = getIconGroup(iconId!, iconX, iconY, iconSize, 0.5);
  }

  // Text positioning
  let textX = contentStartX + (hasIcon && iconPosition === 'left' ? iconSize + gap : 0);
  if (textAlign === 'center') {
    textX += textWidth / 2;
  } else if (textAlign === 'right') {
    textX += textWidth;
  }

  let textSvg = '';
  const anchor = textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'middle';

  if (hasSecondLine) {
    const textY1 = contentCenterY - fontSize * 0.65;
    const textY2 = contentCenterY + fontSize * 0.65;
    textSvg = textElement(text, textX, textY1, fontSize, fontFamily, fontWeight, anchor, true, 0);
    textSvg += '\n    ' + textElement(text2, textX, textY2, fontSize, fontFamily, fontWeight, anchor, true, 0);
  } else {
    const textY = hasIcon && iconPosition === 'top' ? contentCenterY + iconSize / 2 : contentCenterY;
    textSvg = textElement(text, textX, textY, fontSize, fontFamily, fontWeight, anchor, true, 0);
  }

  // Build layers
  let cutContent = '';
  let engraveContent = '';

  // Base layer (cut)
  cutContent += pathElement(basePath, true, cutStroke) + '\n    ';

  // Top layer (cut) for 2-layer mode
  if (state.render === '2-layer') {
    cutContent += pathElement(innerPath, true, cutStroke) + '\n    ';
  }

  // Hole (cut)
  cutContent += holeSvg;

  // Icon + Text (engrave)
  engraveContent = iconSvg + '\n    ' + textSvg;

  const options = { width: baseWidth, height: baseHeight, cutStroke, includeGuides: false };

  return {
    svgCombined: buildCombinedSvg({ cut: cutContent, engrave: engraveContent }, options),
    svgCut: buildCombinedSvg({ cut: cutContent, engrave: '' }, options),
    svgEngrave: buildCombinedSvg({ cut: '', engrave: engraveContent }, options),
    meta: { width: baseWidth, height: baseHeight, layers: state.render === '2-layer' ? 2 : 1 },
  };
}

function getWarnings(state: StickerBubbleState): Warning[] {
  const warnings: Warning[] = [];

  const baseWidth = state.maxWidth;
  const shapeBBox = { x: 0, y: 0, width: baseWidth, height: state.height };

  warnings.push(...generateCommonWarnings({
    shapeBBox,
    hole: state.hole,
    textLength: state.text.trim().length,
    minFontSize: 8,
    maxTextWidth: state.maxWidth,
    hasOutlinedText: false,
  }));

  return warnings;
}

function getFilenameBase(state: StickerBubbleState): string {
  const slug = sanitizeFilename(state.text);
  return `keychain-bubble-${slug}-${state.height}h`;
}

export const stickerBubbleMode: KeychainMode<StickerBubbleState> = {
  id: 'sticker-bubble',
  label: 'Sticker Bubble',
  description: '2-layer bubble keychain with thick border',
  icon: 'message-circle',
  defaults: STICKER_BUBBLE_DEFAULTS,
  clamp: clampState,
  build: buildStickerBubble,
  getWarnings,
  getFilenameBase,
};
