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
import { getFontConfig } from '../core/fontRegistry';
import { loadPathOps } from '../../../geometry/pathops';
import { countPathCommands } from '../core/svgCleanup';
import { showToast } from '../../round-coaster-badge-generator/ui/toast';

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
  text: 'LaserFilesPro',
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

  // Font fallback (avoid crashes if saved state references a missing font)
  if (!s.fontFamily || !getFontConfig(s.fontFamily)) {
    s.fontFamily = SIMPLE_V2_DEFAULTS.fontFamily;
  }

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

  if (s.logo && s.logo.enabled) {
    s.logo.opMode = (s.logo.opMode === 'cutout' ? 'cutout' : 'engrave');
    // Validate traceMode - use simple check instead of includes on const array
    const tm = s.logo.traceMode;
    if (tm !== 'silhouette' && tm !== 'outline' && tm !== 'engrave') {
      s.logo.traceMode = 'silhouette';
    }
    console.log('[clampState] logo.traceMode after validation:', s.logo.traceMode);
    s.logo.transform = {
      x: clamp(s.logo.transform?.x ?? s.width / 2, 0, Math.max(0, s.width)),
      y: clamp(s.logo.transform?.y ?? s.height / 2, 0, Math.max(0, s.height)),
      scale: clamp(s.logo.transform?.scale ?? 1, 0.05, 10),
      rotateDeg: clamp(s.logo.transform?.rotateDeg ?? 0, -180, 180),
    };
    if (!Array.isArray(s.logo.paths)) s.logo.paths = [];
    if (!s.logo.bboxMm) s.logo.bboxMm = { x: 0, y: 0, width: 0, height: 0 };
  }

  return s;
}

function logoGroupSvg(state: SimpleKeychainState): string {
  const logo = state.logo;
  if (!logo || !logo.enabled || !logo.paths || logo.paths.length === 0) return '';

  const bbox = logo.bboxMm;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  const t = logo.transform;
  const transform = `translate(${t.x} ${t.y}) rotate(${t.rotateDeg}) scale(${t.scale}) translate(${-cx} ${-cy})`;
  
  // Determine fill/stroke based on traceMode
  const traceMode = logo.traceMode || 'silhouette';
  console.log('[logoGroupSvg] traceMode:', traceMode);
  
  let fill: string;
  let stroke: string;
  let strokeWidth: number;
  
  switch (traceMode) {
    case 'outline':
      // Outline mode: stroke only, no fill
      fill = 'none';
      stroke = '#000';
      strokeWidth = 0.5;
      break;
    case 'engrave':
      // Engrave mode: thicker stroke + fill for engraving effect
      fill = '#000';
      stroke = '#000';
      strokeWidth = 0.2;
      break;
    case 'silhouette':
    default:
      // Silhouette mode: filled solid
      fill = '#000';
      stroke = 'none';
      strokeWidth = 0;
      break;
  }
  
  const paths = logo.paths
    .map((d) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" fill-rule="evenodd" vector-effect="non-scaling-stroke" />`)
    .join('\n    ');
  return `<g transform="${transform}">\n    ${paths}\n  </g>`;
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
  let finalShapePath = shapePath;
  let logoEngraveSvg = '';

  if (state.logo && state.logo.enabled && state.logo.paths.length > 0) {
    if (state.logo.opMode === 'cutout') {
      try {
        const pk = await loadPathOps();

        let logoPath: any = null;
        for (const d of state.logo.paths) {
          const p = pk.fromSVG(d);
          if (!logoPath) logoPath = p;
          else {
            const u = pk.union(logoPath, p);
            pk.deletePath(logoPath);
            pk.deletePath(p);
            logoPath = u;
          }
        }

        if (logoPath) {
          const bbox = state.logo.bboxMm;
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;
          const t = state.logo.transform;

          const rad = (t.rotateDeg * Math.PI) / 180;
          const cos = Math.cos(rad) * t.scale;
          const sin = Math.sin(rad) * t.scale;

          const matrix = [cos, -sin, t.x - cos * cx + sin * cy, sin, cos, t.y - sin * cx - cos * cy, 0, 0, 1];

          const logoWorld = pk.transform(logoPath, matrix);
          const base = pk.fromSVG(shapePath);
          const diff = pk.difference(base, logoWorld);
          finalShapePath = pk.toSVG(diff);

          pk.deletePath(logoPath);
          pk.deletePath(logoWorld);
          pk.deletePath(base);
          pk.deletePath(diff);
        }
      } catch (e) {
        console.warn('[SimpleV2] Logo cut-out boolean diff failed, falling back to engrave:', e);
        showToast('Logo cut-out failed. Falling back to Engrave.', 'warning');
        logoEngraveSvg = logoGroupSvg(state);
      }
    } else {
      logoEngraveSvg = logoGroupSvg(state);
    }
  }

  const cutContent = `${pathElement(finalShapePath, true, cutStroke)}\n    ${holeSvg}`;
  const engraveContent = logoEngraveSvg ? `${textSvg}\n    ${logoEngraveSvg}` : textSvg;

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

  if (state.logo && state.logo.enabled && state.logo.paths.length > 0) {
    const cmdCount = countPathCommands(state.logo.paths);
    if (cmdCount > 2000) {
      warnings.push({
        id: 'logo-complex',
        level: 'warn',
        message: 'Logo is complex. Increase simplify for smoother laser cutting.',
      });
    }

    if (state.logo.opMode === 'cutout') {
      warnings.push({
        id: 'logo-cutout',
        level: 'info',
        message: 'Logo cut-out uses boolean operations. If it fails, it will fall back to engrave.',
      });
    }
  }

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
