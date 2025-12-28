import type { PocketFrameSettings } from '../types/jigsawV3';
import { STROKE_WIDTH_MM } from '../config/defaults';

/**
 * Module B: Pocket Frame System
 * Generates premium pocket backing board and/or frame
 */

export interface PuzzleSilhouette {
  width: number;
  height: number;
  cornerRadius: number;
}

export interface FrameGeometry {
  pocketOuterPath: string;
  pocketInnerPath: string;
  frameOuterPath?: string;
  frameInnerPath?: string;
  hangingHoles?: Array<{ cx: number; cy: number; r: number }>;
  magnetHoles?: Array<{ cx: number; cy: number; r: number }>;
  labelPlate?: { x: number; y: number; width: number; height: number };
  registrationPins?: Array<{ cx: number; cy: number; r: number }>;
}

/**
 * Generate pocket frame geometry
 */
export function generatePocketFrame(
  puzzleWidth: number,
  puzzleHeight: number,
  cornerRadius: number,
  settings: PocketFrameSettings
): FrameGeometry {
  const silhouette: PuzzleSilhouette = {
    width: puzzleWidth,
    height: puzzleHeight,
    cornerRadius,
  };

  // Calculate dimensions
  const pocketMargin = settings.pocketMarginMm + settings.toleranceMm;
  const totalWallThickness = settings.wallThicknessMm + settings.outerMarginMm;

  // Pocket cutout (inner)
  const pocketInnerWidth = silhouette.width + pocketMargin * 2;
  const pocketInnerHeight = silhouette.height + pocketMargin * 2;
  const pocketInnerRadius = silhouette.cornerRadius + pocketMargin;

  // Board outer
  const boardOuterWidth = pocketInnerWidth + settings.wallThicknessMm * 2;
  const boardOuterHeight = pocketInnerHeight + settings.wallThicknessMm * 2;
  const boardOuterRadius = getCornerRadius(settings.cornerStyle, pocketInnerRadius + settings.wallThicknessMm, settings.cornerRadiusMm);

  // Generate paths
  const pocketInnerPath = generateRoundedRectPath(
    -pocketMargin,
    -pocketMargin,
    pocketInnerWidth,
    pocketInnerHeight,
    pocketInnerRadius
  );

  const pocketOuterPath = generateRoundedRectPath(
    -(pocketMargin + settings.wallThicknessMm),
    -(pocketMargin + settings.wallThicknessMm),
    boardOuterWidth,
    boardOuterHeight,
    boardOuterRadius
  );

  const geometry: FrameGeometry = {
    pocketOuterPath,
    pocketInnerPath,
  };

  // Frame ring (if mode includes frame)
  if (settings.mode === 'pocket-and-frame' || settings.mode === 'frame-only') {
    const frameOuterWidth = boardOuterWidth + settings.outerMarginMm * 2;
    const frameOuterHeight = boardOuterHeight + settings.outerMarginMm * 2;
    const frameOuterRadius = getCornerRadius(settings.cornerStyle, boardOuterRadius + settings.outerMarginMm, settings.cornerRadiusMm);

    geometry.frameOuterPath = generateRoundedRectPath(
      -(pocketMargin + settings.wallThicknessMm + settings.outerMarginMm),
      -(pocketMargin + settings.wallThicknessMm + settings.outerMarginMm),
      frameOuterWidth,
      frameOuterHeight,
      frameOuterRadius
    );

    geometry.frameInnerPath = pocketOuterPath;
  }

  // Hanging holes
  if (settings.hangingHoles) {
    const holeY = -(pocketMargin + settings.wallThicknessMm / 2);
    const spacing = boardOuterWidth / 3;
    const offsetX = -(pocketMargin + settings.wallThicknessMm);

    geometry.hangingHoles = [
      { cx: offsetX + spacing, cy: holeY, r: settings.hangingHoleDiameter / 2 },
      { cx: offsetX + boardOuterWidth - spacing, cy: holeY, r: settings.hangingHoleDiameter / 2 },
    ];
  }

  // Magnet holes
  if (settings.magnetHoles) {
    const inset = settings.magnetHoleInset;
    const offsetX = -(pocketMargin + settings.wallThicknessMm);
    const offsetY = -(pocketMargin + settings.wallThicknessMm);

    geometry.magnetHoles = [
      { cx: offsetX + inset, cy: offsetY + inset, r: settings.magnetHoleDiameter / 2 },
      { cx: offsetX + boardOuterWidth - inset, cy: offsetY + inset, r: settings.magnetHoleDiameter / 2 },
      { cx: offsetX + inset, cy: offsetY + boardOuterHeight - inset, r: settings.magnetHoleDiameter / 2 },
      { cx: offsetX + boardOuterWidth - inset, cy: offsetY + boardOuterHeight - inset, r: settings.magnetHoleDiameter / 2 },
    ];
  }

  // Label plate (small engraved rectangle)
  if (settings.labelPlate) {
    const plateWidth = 40;
    const plateHeight = 10;
    const offsetX = -(pocketMargin + settings.wallThicknessMm);
    const offsetY = -(pocketMargin + settings.wallThicknessMm);

    geometry.labelPlate = {
      x: offsetX + boardOuterWidth / 2 - plateWidth / 2,
      y: offsetY + boardOuterHeight - settings.wallThicknessMm / 2 - plateHeight / 2,
      width: plateWidth,
      height: plateHeight,
    };
  }

  // Registration pins
  if (settings.registrationPins) {
    const pinRadius = 1.5; // 3mm diameter pins
    const offsetX = -(pocketMargin + settings.wallThicknessMm);
    const offsetY = -(pocketMargin + settings.wallThicknessMm);
    const inset = 20;

    const pinPositions = [
      { cx: offsetX + inset, cy: offsetY + boardOuterHeight / 2 },
      { cx: offsetX + boardOuterWidth - inset, cy: offsetY + boardOuterHeight / 2 },
    ];

    if (settings.registrationPinCount >= 4) {
      pinPositions.push(
        { cx: offsetX + boardOuterWidth / 2, cy: offsetY + inset },
        { cx: offsetX + boardOuterWidth / 2, cy: offsetY + boardOuterHeight - inset }
      );
    }

    geometry.registrationPins = pinPositions.map(pos => ({ ...pos, r: pinRadius }));
  }

  return geometry;
}

/**
 * Generate SVG for pocket frame layers
 */
export function generatePocketFrameSvg(
  geometry: FrameGeometry,
  settings: PocketFrameSettings
): string {
  let svg = `<g id="CUT_POCKET_FRAME" fill="none" stroke="#0000FF" stroke-width="${STROKE_WIDTH_MM}">\n`;

  // Pocket board
  if (settings.mode === 'pocket-only' || settings.mode === 'pocket-and-frame') {
    svg += `  <g id="POCKET_BOARD">\n`;
    svg += `    <path d="${geometry.pocketOuterPath}" />\n`;
    svg += `    <path d="${geometry.pocketInnerPath}" />\n`;
    svg += `  </g>\n`;
  }

  // Frame ring
  if (settings.mode === 'pocket-and-frame' || settings.mode === 'frame-only') {
    if (geometry.frameOuterPath && geometry.frameInnerPath) {
      svg += `  <g id="FRAME_RING">\n`;
      svg += `    <path d="${geometry.frameOuterPath}" />\n`;
      svg += `    <path d="${geometry.frameInnerPath}" />\n`;
      svg += `  </g>\n`;
    }
  }

  // Holes
  if (geometry.hangingHoles) {
    svg += `  <g id="HANGING_HOLES">\n`;
    geometry.hangingHoles.forEach(hole => {
      svg += `    <circle cx="${hole.cx.toFixed(4)}" cy="${hole.cy.toFixed(4)}" r="${hole.r.toFixed(4)}" />\n`;
    });
    svg += `  </g>\n`;
  }

  if (geometry.magnetHoles) {
    svg += `  <g id="MAGNET_HOLES">\n`;
    geometry.magnetHoles.forEach(hole => {
      svg += `    <circle cx="${hole.cx.toFixed(4)}" cy="${hole.cy.toFixed(4)}" r="${hole.r.toFixed(4)}" />\n`;
    });
    svg += `  </g>\n`;
  }

  if (geometry.registrationPins) {
    svg += `  <g id="REGISTRATION_PINS">\n`;
    geometry.registrationPins.forEach(pin => {
      svg += `    <circle cx="${pin.cx.toFixed(4)}" cy="${pin.cy.toFixed(4)}" r="${pin.r.toFixed(4)}" />\n`;
    });
    svg += `  </g>\n`;
  }

  svg += `</g>\n`;

  // Label plate (engrave layer)
  if (geometry.labelPlate) {
    svg += `<g id="ENGRAVE_LABEL_PLATE" fill="none" stroke="#000000" stroke-width="0.1">\n`;
    svg += `  <rect x="${geometry.labelPlate.x.toFixed(4)}" y="${geometry.labelPlate.y.toFixed(4)}" `;
    svg += `width="${geometry.labelPlate.width.toFixed(4)}" height="${geometry.labelPlate.height.toFixed(4)}" rx="2" />\n`;
    svg += `</g>\n`;
  }

  return svg;
}

/**
 * Generate rounded rectangle path
 */
function generateRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): string {
  const r = Math.min(radius, width / 2, height / 2);
  
  return `M ${(x + r).toFixed(4)} ${y.toFixed(4)} ` +
    `L ${(x + width - r).toFixed(4)} ${y.toFixed(4)} ` +
    `A ${r.toFixed(4)} ${r.toFixed(4)} 0 0 1 ${(x + width).toFixed(4)} ${(y + r).toFixed(4)} ` +
    `L ${(x + width).toFixed(4)} ${(y + height - r).toFixed(4)} ` +
    `A ${r.toFixed(4)} ${r.toFixed(4)} 0 0 1 ${(x + width - r).toFixed(4)} ${(y + height).toFixed(4)} ` +
    `L ${(x + r).toFixed(4)} ${(y + height).toFixed(4)} ` +
    `A ${r.toFixed(4)} ${r.toFixed(4)} 0 0 1 ${x.toFixed(4)} ${(y + height - r).toFixed(4)} ` +
    `L ${x.toFixed(4)} ${(y + r).toFixed(4)} ` +
    `A ${r.toFixed(4)} ${r.toFixed(4)} 0 0 1 ${(x + r).toFixed(4)} ${y.toFixed(4)} Z`;
}

/**
 * Get corner radius based on style
 */
function getCornerRadius(style: string, baseRadius: number, userRadius: number): number {
  switch (style) {
    case 'round':
      return userRadius > 0 ? userRadius : baseRadius;
    case 'chamfer':
      return userRadius * 0.5; // Chamfer is smaller
    case 'square':
      return 0;
    default:
      return baseRadius;
  }
}

/**
 * Validate pocket frame settings
 */
export function validatePocketFrameSettings(
  settings: PocketFrameSettings,
  puzzleWidth: number,
  puzzleHeight: number
): string[] {
  const warnings: string[] = [];

  if (settings.pocketMarginMm < 0.5) {
    warnings.push('Pocket margin should be at least 0.5mm for proper fit');
  }

  if (settings.wallThicknessMm < 5) {
    warnings.push('Wall thickness should be at least 5mm for structural integrity');
  }

  if (settings.toleranceMm > 0.5) {
    warnings.push('High tolerance may result in loose fit');
  }

  const totalWidth = puzzleWidth + (settings.pocketMarginMm + settings.wallThicknessMm) * 2;
  const totalHeight = puzzleHeight + (settings.pocketMarginMm + settings.wallThicknessMm) * 2;

  if (totalWidth > 600 || totalHeight > 600) {
    warnings.push('Frame dimensions exceed typical laser bed size');
  }

  return warnings;
}
