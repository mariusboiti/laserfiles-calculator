/**
 * Keychain Hub V2 - Emoji + Name Mode (PRO) - Sticker Style
 * True silhouette-based outline with integrated keyring loop
 * Uses PathKit (Skia WASM) for robust path boolean operations
 * No <text> elements - all text converted to paths
 */

import type { KeychainMode, EmojiNameState, BuildResult, Warning, RingConfig } from '../types';
import { clamp } from '../core/geometry';
import { textToSvgPath } from '../core/textToPath';
import { getAnyIconById } from '../core/iconLibrary';
import { buildCombinedSvg, sanitizeFilename } from '../core/export';
import { noIconWarning } from '../core/warnings';
import type { FontId } from '../core/fontRegistry';
import { getFontConfig } from '../core/fontRegistry';
import { loadPathOps, type PathOps } from '../../../geometry/pathops';

// Default ring configuration
const DEFAULT_RING: RingConfig = {
  enabled: true,
  outerDiameter: 6.0,
  innerDiameter: 3.0,
  bridgeWidth: 6.0,
  bridgeThickness: 3.0,
  gapFromSticker: 0.0,
  position: 'left',
};

export const EMOJI_NAME_V2_DEFAULTS: EmojiNameState = {
  // Content
  name: 'LaserFilesPro',
  fontFamily: 'Bosnia Script',
  fontWeight: 400,
  iconId: 'heart',
  iconSizePct: 0.85,
  gap: 0,
  
  // Sticker outline (TRUE offset around silhouette)
  stickerOffsetMm: 3.0,       // offset distance around text+icon union
  stickerSmoothMm: 0.6,       // arc tolerance for smooth curves
  
  // Ring
  ring: DEFAULT_RING,
  
  // Text sizing
  fontSize: 12,               // font size in mm
  letterSpacing: 0,           // letter spacing in mm
  
  // Render options
  render: '2-layer',
  cutStroke: 0.5,
  showBase: true,
  showTop: true,
  debugShowUnion: false,      // dev toggle: show union before offset
};

function clampState(state: Partial<EmojiNameState>): EmojiNameState {
  const s = { ...EMOJI_NAME_V2_DEFAULTS, ...state };

  // Font fallback (avoid crashes if saved state references a missing font)
  if (!s.fontFamily || !getFontConfig(s.fontFamily)) {
    s.fontFamily = EMOJI_NAME_V2_DEFAULTS.fontFamily;
  }

  // Content
  s.iconSizePct = clamp(s.iconSizePct, 0.3, 1.5);
  s.gap = clamp(s.gap, 0, 20);
  
  // Sticker offset (minimum 3mm)
  s.stickerOffsetMm = clamp(s.stickerOffsetMm, 3, 8); // Minimum offset is 3mm
  s.stickerSmoothMm = clamp(s.stickerSmoothMm, 0.1, 2);
  
  // Text sizing
  s.fontSize = clamp(s.fontSize, 5, 50);
  s.letterSpacing = clamp(s.letterSpacing, -2, 10);
  
  // Ring
  if (state.ring) {
    s.ring = { ...DEFAULT_RING, ...state.ring };
  }
  // Ring is always enabled in V2
  s.ring.enabled = true;
  if (s.ring.position !== 'left' && s.ring.position !== 'top' && s.ring.position !== 'right') {
    s.ring.position = 'left';
  }
  s.ring.outerDiameter = clamp(s.ring.outerDiameter, 4, 20);
  s.ring.innerDiameter = clamp(s.ring.innerDiameter, 2, 12);
  if (s.ring.innerDiameter > s.ring.outerDiameter - 1) {
    s.ring.innerDiameter = s.ring.outerDiameter - 1;
  }
  s.ring.bridgeWidth = clamp(s.ring.bridgeWidth, 3, 12);
  s.ring.bridgeThickness = clamp(s.ring.bridgeThickness, 2, 8);
  // gapFromSticker removed: loop always stays attached
  s.ring.gapFromSticker = 0;

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
    stickerOffsetMm, ring, fontSize, letterSpacing,
    cutStroke, showBase, showTop
  } = state;

  // Load PathKit WASM
  const pk = await loadPathOps();
  
  const fontId: FontId = fontFamily;
  
  // =========================================================================
  // STEP 1: Generate text path
  // =========================================================================
  const textResult = await textToSvgPath(name, { fontId, fontSize, letterSpacing, align: 'left' });
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
  
  // Collect icon paths separately (don't union - preserves internal details)
  const iconPathsTransformed: string[] = [];
  if (iconId) {
    const icon = getAnyIconById(iconId);
    if (icon && icon.paths) {
      const scale = iconSize / 100;
      for (const iconPathD of icon.paths) {
        const iconPath = pk.fromSVG(iconPathD);
        const iconMatrix = [scale, 0, iconX, 0, scale, iconY, 0, 0, 1];
        const transformedIcon = pk.transform(iconPath, iconMatrix);
        // Store the transformed path D string separately
        const transformedD = pk.toSVG(transformedIcon);
        if (transformedD) {
          iconPathsTransformed.push(transformedD);
        }
        // Still union with topPath for outline calculation, but we'll render separately
        topPath = pk.union(topPath, transformedIcon);
        console.log('[Build] Added icon path (stored separately for rendering)');
      }
    }
  }
  
  // Add traced logo paths if present
  if (state.logo?.enabled && state.logo.paths.length > 0) {
    const logoBbox = state.logo.bboxMm;
    const logoWidthMm = state.logo.widthMm ?? logoBbox.width;
    const logoScale = logoWidthMm / Math.max(0.001, logoBbox.width);
    
    // Position logo to the right of content (icon + text)
    const currentBounds = pk.getBounds(topPath);
    const logoX = currentBounds.x + currentBounds.width + gap;
    const logoY = currentBounds.y + currentBounds.height / 2 - (logoBbox.height * logoScale) / 2;
    
    for (const logoPathD of state.logo.paths) {
      try {
        const logoPath = pk.fromSVG(logoPathD);
        // Translate to origin, scale, then position
        const logoMatrix = [
          logoScale, 0, logoX - logoBbox.x * logoScale,
          0, logoScale, logoY - logoBbox.y * logoScale,
          0, 0, 1
        ];
        const transformedLogo = pk.transform(logoPath, logoMatrix);
        topPath = pk.union(topPath, transformedLogo);
        console.log('[Build] Added traced logo path');
      } catch (e) {
        console.warn('[Build] Failed to add logo path:', e);
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
  // STEP 5: Add ring (always enabled)
  // =========================================================================
  {
    const baseBounds = pk.getBounds(basePath);
    console.log('[Build] baseBounds for ring:', baseBounds);

    const ringOuterR = ring.outerDiameter / 2;
    const ringInnerR = ring.innerDiameter / 2;

    const pos = ring.position || 'left';
    const overlapMm = 1; // ensure contact when gapFromSticker is 0

    // gapFromSticker intentionally ignored (loop stays attached)

    let ringCx = 0;
    let ringCy = 0;

    if (pos === 'left') {
      ringCy = baseBounds.y + baseBounds.height / 2;
      ringCx = baseBounds.x - ringOuterR + overlapMm;
    } else if (pos === 'right') {
      ringCy = baseBounds.y + baseBounds.height / 2;
      ringCx = baseBounds.x + baseBounds.width + ringOuterR - overlapMm;
    } else {
      // top
      ringCx = baseBounds.x + baseBounds.width / 2;
      ringCy = baseBounds.y - ringOuterR + overlapMm;
    }

    // Manual fine offsets requested by user
    if (pos === 'left') {
      ringCx += 2;
    } else if (pos === 'right') {
      ringCx -= 2;
    } else {
      // top
      ringCy += 5;
    }

    // Create ring outer circle
    const ringOuter = pk.makeCircle(ringCx, ringCy, ringOuterR);

    // Union: base + ring
    basePath = pk.union(basePath, ringOuter);

    // Subtract ring hole
    const ringInner = pk.makeCircle(ringCx, ringCy, ringInnerR);
    basePath = pk.difference(basePath, ringInner);

    console.log('[Build] Added ring');
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
    const ringExtra = ring.outerDiameter + 2;
    const pos = ring.position || 'left';
    const fallbackW = contentWidth + stickerOffsetMm * 2 + (pos === 'left' || pos === 'right' ? ringExtra : 0);
    const fallbackH = contentHeight + stickerOffsetMm * 2 + (pos === 'top' ? ringExtra : 0);
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
  
  const finalWidth = finalBounds.width + margin * 2;
  const finalHeight = finalBounds.height + margin * 2;
  
  // =========================================================================
  // STEP 7: Convert to SVG
  // =========================================================================
  const basePathD = pk.toSVG(finalBasePath);
  
  // For text, we need to exclude icon paths from topPath to render them separately
  // Get only the text path (topPath without icon)
  let textOnlyPath = pk.fromSVG(textPathD || '');
  if (textPathD) {
    const textMatrix = [1, 0, textX, 0, 1, textY, 0, 0, 1];
    textOnlyPath = pk.transform(textOnlyPath, textMatrix);
  }
  const textOnlyTranslated = pk.transform(textOnlyPath, translateMatrix);
  const textOnlyPathD = pk.toSVG(textOnlyTranslated);

  // Weld text (merge overlaps) without removing inner counters (letter holes).
  // Using boolean-union per-subpath can destroy counters; simplify on the full path
  // tends to resolve overlaps while preserving holes.
  let textUnionPathD = textOnlyPathD;
  if (textOnlyPathD) {
    try {
      const p = pk.fromSVG(textOnlyPathD);
      const simplified = pk.simplify(p);
      textUnionPathD = pk.toSVG(simplified) || textOnlyPathD;
    } catch {
      textUnionPathD = textOnlyPathD;
    }
  }
  const textOutlineOnlyD = extractOuterSubpaths(textUnionPathD || '');
  
  // Translate icon paths
  const iconPathsTranslated = iconPathsTransformed.map(d => translatePathD(d, translateX, translateY));
  
  console.log('[Build] Final basePathD length:', basePathD?.length);
  console.log('[Build] Final textOnlyPathD length:', textOnlyPathD?.length);
  console.log('[Build] Icon paths count:', iconPathsTranslated.length);
  
  // =========================================================================
  // STEP 8: Build SVG content with color coding
  // =========================================================================
  let topLayerContent = '';
  let baseLayerContent = '';
  
  // ENGRAVE LAYER: Text (filled) + Icon paths (as outlines to preserve details)
  if (showTop) {
    // Text as filled shape (no stroke), plus a separate stroke-only outer outline.
    if (textUnionPathD) {
      topLayerContent += `<path d="${textUnionPathD}" fill="#000" stroke="none" />`;
    }
    if (textOutlineOnlyD) {
      topLayerContent += `<path d="${textOutlineOnlyD}" fill="none" stroke="#000" stroke-width="0.3" />`;
    }
    // Icon paths rendered individually (stroke only - preserves internal details)
    for (const iconD of iconPathsTranslated) {
      topLayerContent += `<path d="${iconD}" fill="none" stroke="#000" stroke-width="0.5" />`;
    }
  }
  
  // CUT LAYER: Outline + Ring (red stroke for preview)
  // Extract only outer contour to avoid interior cut lines from offset
  if (showBase && basePathD) {
    const outerContour = extractOuterContour(basePathD);
    baseLayerContent = `<path d="${outerContour}" fill="none" stroke="#ff0000" stroke-width="${cutStroke}" />`;
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
 * Extract only the outer contour from a path (largest bounding box)
 * This removes interior cut lines created by offset on detailed shapes
 */
function extractOuterContour(pathD: string): string {
  if (!pathD) return '';
  
  // Split into subpaths (each starting with M and ending with Z or next M)
  const subpaths: string[] = [];
  const regex = /M[^M]*?(?:Z|(?=M)|$)/gi;
  let match;
  while ((match = regex.exec(pathD)) !== null) {
    const sp = match[0].trim();
    if (sp) subpaths.push(sp);
  }
  
  if (subpaths.length <= 1) return pathD;
  
  // Calculate bounding box area for each subpath
  const withArea = subpaths.map(sp => {
    const nums = sp.match(/[-+]?(?:\d+\.?\d*|\.\d+)/g);
    if (!nums || nums.length < 4) return { path: sp, area: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (isFinite(x) && isFinite(y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    
    const area = (maxX - minX) * (maxY - minY);
    return { path: sp, area: isFinite(area) ? area : 0 };
  });
  
  // Sort by area descending and take the largest (outer contour)
  withArea.sort((a, b) => b.area - a.area);
  
  // Keep the largest contour plus the ring hole (second largest that's inside)
  // For simplicity, keep top 2 if the second is the ring hole
  if (withArea.length >= 2 && withArea[1].area > 0) {
    // Check if second path is ring hole (should be much smaller)
    const ratio = withArea[1].area / withArea[0].area;
    if (ratio < 0.1) {
      // Second is likely ring hole, keep both
      return withArea[0].path + ' ' + withArea[1].path;
    }
  }
  
  return withArea[0].path;
}

function extractOuterSubpaths(pathD: string): string {
  if (!pathD) return '';

  const subpaths: string[] = [];
  const re = /M[^M]*?(?:Z|(?=M)|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pathD)) !== null) {
    const sp = m[0].trim();
    if (sp) subpaths.push(sp);
  }

  if (subpaths.length <= 1) return pathD;

  const items = subpaths
    .map(sp => {
      const nums = sp.match(/[-+]?(?:\d+\.?\d*|\.\d+)/g);
      if (!nums || nums.length < 4) {
        return { path: sp, minX: 0, minY: 0, maxX: 0, maxY: 0, area: 0 };
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = parseFloat(nums[i]);
        const y = parseFloat(nums[i + 1]);
        if (isFinite(x) && isFinite(y)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }

      const area = (maxX - minX) * (maxY - minY);
      return {
        path: sp,
        minX,
        minY,
        maxX,
        maxY,
        area: isFinite(area) ? area : 0,
      };
    })
    .filter(i => i.area > 0 && isFinite(i.minX) && isFinite(i.minY) && isFinite(i.maxX) && isFinite(i.maxY));

  if (items.length <= 1) return pathD;

  const eps = 0.0001;
  const isInside = (a: (typeof items)[number], b: (typeof items)[number]) => {
    return a.minX >= b.minX - eps && a.minY >= b.minY - eps && a.maxX <= b.maxX + eps && a.maxY <= b.maxY + eps;
  };

  // Keep only subpaths that are NOT inside any other subpath.
  const outers = items
    .filter((a) => !items.some((b) => b !== a && b.area >= a.area && isInside(a, b)))
    .map(i => i.path);

  return outers.join(' ');
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
    if (wallThickness < 1.2) {
      warnings.push({
        id: 'ring-wall-thin',
        level: 'warn',
        message: `Ring wall thickness (${wallThickness.toFixed(1)}mm) may be too thin. Min 2mm recommended.`,
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
  return `keychain-sticker-${slug}-${state.fontSize}mm`;
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
