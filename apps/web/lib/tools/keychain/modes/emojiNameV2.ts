/**
 * Keychain Hub V2 - Emoji + Name Mode (PRO) - Sticker Style
 * True silhouette-based outline with integrated keyring loop
 * Uses PathKit (Skia WASM) for robust path boolean operations
 * No <text> elements - all text converted to paths
 */

import type { KeychainMode, EmojiNameState, BuildResult, Warning, RingConfig } from '../types';
import { clamp } from '../core/geometry';
import { textToSvgPath } from '../core/textToPath';
import { getIconById } from '../core/iconLibrary';
import { buildCombinedSvg, sanitizeFilename } from '../core/export';
import { noIconWarning } from '../core/warnings';
import type { FontId } from '../core/fontRegistry';
import { loadPathOps, type PathOps } from '../../../geometry/pathops';

// Default ring configuration
const DEFAULT_RING: RingConfig = {
  enabled: true,
  outerDiameter: 12.0,
  innerDiameter: 6.0,
  bridgeWidth: 6.0,
  bridgeThickness: 3.0,
  gapFromSticker: 0, // Ring attached directly to sticker
  position: 'left',
};

export const EMOJI_NAME_V2_DEFAULTS: EmojiNameState = {
  // Content
  name: 'Justin',
  fontFamily: 'Samantha Script',
  fontWeight: 400,
  iconId: 'heart',
  iconSizePct: 0.85,
  gap: 3,
  
  // Sticker outline (TRUE offset around silhouette)
  stickerOffsetMm: 3.0,       // offset distance around text+icon union
  stickerSmoothMm: 0.6,       // arc tolerance for smooth curves
  
  // Ring
  ring: DEFAULT_RING,
  
  // Text sizing
  textHeightMm: 12,           // target text cap height in mm
  
  // Render options
  render: '2-layer',
  cutStroke: 0.5,
  showBase: true,
  showTop: true,
  debugShowUnion: false,      // dev toggle: show union before offset
};

function clampState(state: Partial<EmojiNameState>): EmojiNameState {
  const s = { ...EMOJI_NAME_V2_DEFAULTS, ...state };

  // Content
  s.iconSizePct = clamp(s.iconSizePct, 0.3, 1.5);
  s.gap = clamp(s.gap, 0, 20);
  
  // Sticker offset (minimum 3mm)
  s.stickerOffsetMm = clamp(s.stickerOffsetMm, 3, 8); // Minimum offset is 3mm
  s.stickerSmoothMm = clamp(s.stickerSmoothMm, 0.1, 2);
  
  // Text sizing
  s.textHeightMm = clamp(s.textHeightMm, 5, 50);
  
  // Ring
  if (state.ring) {
    s.ring = { ...DEFAULT_RING, ...state.ring };
  }
  s.ring.outerDiameter = clamp(s.ring.outerDiameter, 8, 20);
  s.ring.innerDiameter = clamp(s.ring.innerDiameter, 4, 12);
  if (s.ring.innerDiameter > s.ring.outerDiameter - 2) {
    s.ring.innerDiameter = s.ring.outerDiameter - 2;
  }
  s.ring.bridgeWidth = clamp(s.ring.bridgeWidth, 3, 12);
  s.ring.bridgeThickness = clamp(s.ring.bridgeThickness, 2, 8);
  s.ring.gapFromSticker = clamp(s.ring.gapFromSticker, 0, 5);

  s.cutStroke = clamp(s.cutStroke, 0.001, 1);

  return s;
}

/**
 * Build sticker-style keychain using PathKit (Skia WASM)
 * Pipeline: SVG path → PathKit → union → stroke expansion → ring → SVG
 */
async function buildEmojiNameV2(state: EmojiNameState): Promise<BuildResult> {
  const {
    name, fontFamily, iconId, iconSizePct, gap,
    stickerOffsetMm, ring, textHeightMm,
    cutStroke, showBase, showTop
  } = state;

  // Load PathKit WASM
  const pk = await loadPathOps();
  
  const fontId: FontId = fontFamily;
  const fontSize = textHeightMm;
  
  // =========================================================================
  // STEP 1: Generate text path
  // =========================================================================
  const textResult = await textToSvgPath(name, { fontId, fontSize, align: 'left' });
  const textPathD = textResult.d;
  const textBbox = textResult.bbox;
  
  const textWidth = textBbox.width || (name.length * fontSize * 0.6);
  const textHeight = textBbox.height || fontSize;
  
  console.log('[Build] textBbox:', textBbox);
  console.log('[Build] textPathD length:', textPathD?.length);
  
  // =========================================================================
  // STEP 2: Calculate icon size and layout
  // =========================================================================
  const iconSize = iconId ? textHeight * iconSizePct : 0;
  const contentHeight = Math.max(textHeight, iconSize);
  
  // Positions for icon and text (in mm)
  const iconX = 0;
  const iconY = (contentHeight - iconSize) / 2;
  const textX = (iconId ? iconSize + gap : 0) - textBbox.x;
  const textY = (contentHeight - textHeight) / 2 - textBbox.y;
  
  // =========================================================================
  // STEP 3: Create PathKit paths
  // =========================================================================
  
  // Start with text path
  let topPath = pk.fromSVG(textPathD || '');
  console.log('[Build] Initial topPath from text');
  
  // Apply text translation
  if (textPathD) {
    const textMatrix = [1, 0, textX, 0, 1, textY, 0, 0, 1];
    topPath = pk.transform(topPath, textMatrix);
    console.log('[Build] Transformed text path');
  }
  
  // Add icon paths
  if (iconId) {
    const icon = getIconById(iconId);
    if (icon && icon.paths) {
      const scale = iconSize / 100;
      for (const iconPathD of icon.paths) {
        const iconPath = pk.fromSVG(iconPathD);
        const iconMatrix = [scale, 0, iconX, 0, scale, iconY, 0, 0, 1];
        const transformedIcon = pk.transform(iconPath, iconMatrix);
        topPath = pk.union(topPath, transformedIcon);
        console.log('[Build] Added icon path');
      }
    }
  }
  
  // Check topPath bounds
  const topBounds = pk.getBounds(topPath);
  console.log('[Build] topBounds:', topBounds);
  
  // =========================================================================
  // STEP 4: Create sticker outline via stroke expansion
  // =========================================================================
  const strokeWidth = stickerOffsetMm * 2;
  const strokePath = pk.strokeToPath(topPath, {
    width: strokeWidth,
    join: 'round',
    cap: 'round'
  });
  
  // Union stroke with original to fill interior
  let basePath = pk.union(strokePath, topPath);
  console.log('[Build] Created base sticker outline');
  
  // =========================================================================
  // STEP 5: Add ring (if enabled) - attached directly to sticker, no bridge
  // =========================================================================
  if (ring.enabled) {
    const baseBounds = pk.getBounds(basePath);
    console.log('[Build] baseBounds for ring:', baseBounds);
    
    const ringOuterR = ring.outerDiameter / 2;
    const ringInnerR = ring.innerDiameter / 2;
    
    // Ring position (left side, overlapping slightly with sticker outline)
    const ringCx = baseBounds.x - ringOuterR + 1; // Move 1mm to the right to ensure contact
    const ringCy = baseBounds.y + baseBounds.height / 2;
    
    // Create ring outer circle
    const ringOuter = pk.makeCircle(ringCx, ringCy, ringOuterR);
    
    // Union: base + ring (no bridge)
    basePath = pk.union(basePath, ringOuter);
    
    // Subtract ring hole
    const ringInner = pk.makeCircle(ringCx, ringCy, ringInnerR);
    basePath = pk.difference(basePath, ringInner);
    
    console.log('[Build] Added ring (no bridge, attached directly)');
  }
  
  // =========================================================================
  // STEP 6: Calculate final bounds and translate to origin
  // =========================================================================
  const finalBounds = pk.getBounds(basePath);
  console.log('[Build] finalBounds:', finalBounds);
  
  // Validate bounds - if invalid, use fallback
  if (!finalBounds || !isFinite(finalBounds.x) || !isFinite(finalBounds.width) ||
      finalBounds.width <= 0 || finalBounds.height <= 0) {
    console.warn('[Build] Invalid bounds, using fallback');
    
    // Calculate fallback dimensions
    const contentWidth = iconId ? iconSize + gap + textWidth : textWidth;
    const fallbackW = contentWidth + stickerOffsetMm * 2 + (ring.enabled ? ring.outerDiameter + ring.gapFromSticker + 2 : 0);
    const fallbackH = contentHeight + stickerOffsetMm * 2;
    const margin = 1;
    
    const options = { width: fallbackW + margin * 2, height: fallbackH + margin * 2, cutStroke, includeGuides: false };
    const rectD = `M ${margin} ${margin} h ${fallbackW} v ${fallbackH} h ${-fallbackW} Z`;
    
    return {
      svgCombined: buildCombinedSvg({ cut: `<path d="${rectD}" fill="none" stroke="#000" stroke-width="${cutStroke}"/>`, engrave: '' }, options),
      svgCut: buildCombinedSvg({ cut: `<path d="${rectD}" fill="none" stroke="#000" stroke-width="${cutStroke}"/>`, engrave: '' }, options),
      svgEngrave: buildCombinedSvg({ cut: '', engrave: '' }, options),
      meta: { width: options.width, height: options.height, layers: 1 },
    };
  }
  
  const margin = 1;
  const translateX = margin - finalBounds.x;
  const translateY = margin - finalBounds.y;
  
  // Translate paths to origin
  const translateMatrix = [1, 0, translateX, 0, 1, translateY, 0, 0, 1];
  const finalBasePath = pk.transform(basePath, translateMatrix);
  const finalTopPath = pk.transform(topPath, translateMatrix);
  
  const finalWidth = finalBounds.width + margin * 2;
  const finalHeight = finalBounds.height + margin * 2;
  
  // =========================================================================
  // STEP 7: Convert to SVG
  // =========================================================================
  const basePathD = pk.toSVG(finalBasePath);
  const topPathD = pk.toSVG(finalTopPath);
  
  console.log('[Build] Final basePathD length:', basePathD?.length);
  console.log('[Build] Final topPathD length:', topPathD?.length);
  
  // =========================================================================
  // STEP 8: Build SVG content with color coding
  // =========================================================================
  let topLayerContent = '';
  let baseLayerContent = '';
  
  // ENGRAVE LAYER: Text + Icon (black fill with blue stroke for preview)
  if (showTop && topPathD) {
    topLayerContent = `<path d="${topPathD}" fill="#000" stroke="#0066ff" stroke-width="0.3" />`;
  }
  
  // CUT LAYER: Outline + Ring (red stroke for preview)
  if (showBase && basePathD) {
    baseLayerContent = `<path d="${basePathD}" fill="none" stroke="#ff0000" stroke-width="${cutStroke}" />`;
  }
  
  const options = { width: finalWidth, height: finalHeight, cutStroke, includeGuides: false };

  return {
    svgCombined: buildCombinedSvg({ cut: baseLayerContent, engrave: topLayerContent }, options),
    svgCut: buildCombinedSvg({ cut: baseLayerContent, engrave: '' }, options),
    svgEngrave: buildCombinedSvg({ cut: '', engrave: topLayerContent }, options),
    meta: { width: finalWidth, height: finalHeight, layers: state.render === '2-layer' ? 2 : 1 },
  };
}

/**
 * Translate SVG path d attribute by offset
 */
function translatePathD(pathD: string, dx: number, dy: number): string {
  if (!pathD) return '';
  
  // Handle M, L commands
  let result = pathD.replace(/([MLml])\s*([\d.-]+)[\s,]+([\d.-]+)/g, (match, cmd, x, y) => {
    const isRel = cmd === cmd.toLowerCase();
    if (isRel) return match; // Don't translate relative commands
    const newX = parseFloat(x) + dx;
    const newY = parseFloat(y) + dy;
    return `${cmd} ${newX.toFixed(4)} ${newY.toFixed(4)}`;
  });
  
  // Handle C (cubic bezier) commands
  result = result.replace(/([Cc])\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)/g,
    (match, cmd, x1, y1, x2, y2, x, y) => {
      const isRel = cmd === 'c';
      if (isRel) return match;
      return `${cmd} ${(parseFloat(x1) + dx).toFixed(4)} ${(parseFloat(y1) + dy).toFixed(4)} ${(parseFloat(x2) + dx).toFixed(4)} ${(parseFloat(y2) + dy).toFixed(4)} ${(parseFloat(x) + dx).toFixed(4)} ${(parseFloat(y) + dy).toFixed(4)}`;
    });
  
  // Handle Q (quadratic bezier) commands
  result = result.replace(/([Qq])\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)/g,
    (match, cmd, x1, y1, x, y) => {
      const isRel = cmd === 'q';
      if (isRel) return match;
      return `${cmd} ${(parseFloat(x1) + dx).toFixed(4)} ${(parseFloat(y1) + dy).toFixed(4)} ${(parseFloat(x) + dx).toFixed(4)} ${(parseFloat(y) + dy).toFixed(4)}`;
    });
  
  return result;
}

/**
 * Scale and translate SVG path d attribute
 */
function scaleAndTranslatePathD(pathD: string, scale: number, dx: number, dy: number): string {
  if (!pathD) return '';
  
  // Handle M, L commands
  let result = pathD.replace(/([MLml])\s*([\d.-]+)[\s,]+([\d.-]+)/g, (match, cmd, x, y) => {
    const newX = parseFloat(x) * scale + dx;
    const newY = parseFloat(y) * scale + dy;
    return `${cmd} ${newX.toFixed(4)} ${newY.toFixed(4)}`;
  });
  
  // Handle C (cubic bezier) commands
  result = result.replace(/([Cc])\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)/g,
    (match, cmd, x1, y1, x2, y2, x, y) => {
      return `${cmd} ${(parseFloat(x1) * scale + dx).toFixed(4)} ${(parseFloat(y1) * scale + dy).toFixed(4)} ${(parseFloat(x2) * scale + dx).toFixed(4)} ${(parseFloat(y2) * scale + dy).toFixed(4)} ${(parseFloat(x) * scale + dx).toFixed(4)} ${(parseFloat(y) * scale + dy).toFixed(4)}`;
    });
  
  // Handle Q (quadratic bezier) commands
  result = result.replace(/([Qq])\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)/g,
    (match, cmd, x1, y1, x, y) => {
      return `${cmd} ${(parseFloat(x1) * scale + dx).toFixed(4)} ${(parseFloat(y1) * scale + dy).toFixed(4)} ${(parseFloat(x) * scale + dx).toFixed(4)} ${(parseFloat(y) * scale + dy).toFixed(4)}`;
    });
  
  // Handle A (arc) commands - scale radii
  result = result.replace(/([Aa])\s*([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([01])[\s,]+([01])[\s,]+([\d.-]+)[\s,]+([\d.-]+)/g,
    (match, cmd, rx, ry, rot, large, sweep, x, y) => {
      return `${cmd} ${(parseFloat(rx) * scale).toFixed(4)} ${(parseFloat(ry) * scale).toFixed(4)} ${rot} ${large} ${sweep} ${(parseFloat(x) * scale + dx).toFixed(4)} ${(parseFloat(y) * scale + dy).toFixed(4)}`;
    });
  
  return result;
}

function getWarnings(state: EmojiNameState): Warning[] {
  const warnings: Warning[] = [];

  // Ring warnings
  if (state.ring.enabled) {
    const wallThickness = (state.ring.outerDiameter - state.ring.innerDiameter) / 2;
    if (wallThickness < 2) {
      warnings.push({
        id: 'ring-wall-thin',
        level: 'warn',
        message: `Ring wall too thin (${wallThickness.toFixed(1)}mm). Min 2mm recommended.`,
      });
    }
    
    if (state.ring.bridgeThickness < 2.5) {
      warnings.push({
        id: 'bridge-thin',
        level: 'warn',
        message: `Bridge thickness (${state.ring.bridgeThickness}mm) may be fragile. Min 2.5mm recommended.`,
      });
    }
  }
  
  // Offset warnings
  if (state.stickerOffsetMm < 2) {
    warnings.push({
      id: 'offset-small',
      level: 'info',
      message: 'Small outline offset may result in fragile edges.',
    });
  }
  
  // Text warnings
  if (!state.name.trim()) {
    warnings.push({
      id: 'name-empty',
      level: 'error',
      message: 'Name is required.',
    });
  }

  const iconWarning = noIconWarning(state.iconId, false);
  if (iconWarning) warnings.push(iconWarning);

  return warnings;
}

function getFilenameBase(state: EmojiNameState): string {
  const slug = sanitizeFilename(state.name);
  return `keychain-sticker-${slug}-${state.textHeightMm}mm`;
}

export const emojiNameModeV2: KeychainMode<EmojiNameState> = {
  id: 'emoji-name',
  label: 'Emoji + Name (Sticker)',
  description: 'Cuttle-style sticker outline with integrated ring loop',
  icon: 'smile',
  defaults: EMOJI_NAME_V2_DEFAULTS,
  clamp: clampState,
  build: buildEmojiNameV2 as any, // async
  getWarnings,
  getFilenameBase,
};
