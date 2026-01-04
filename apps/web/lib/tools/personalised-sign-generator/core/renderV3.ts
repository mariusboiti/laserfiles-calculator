/**
 * Personalised Sign Generator V3 - SVG Rendering
 */

import type { SignConfigV3, RenderOptions, SignRenderResult } from '../types/signV3';
import { buildShapePath, validateShape } from './shapesV3';
import { computeHoleGeometry, validateHoles, getHoleSvgElements } from './holesV3';
import { computeTextLayout, computeSafeZone, validateLayout, getSafeZoneSvg } from './layoutV3';
import { getIconPathElement, calculateIconPosition } from './iconsV3';
import { applyTextTransform } from '../config/defaultsV3';

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function renderPreviewSvg(config: SignConfigV3, options: Partial<RenderOptions> = {}): SignRenderResult {
  const opts: RenderOptions = {
    showGuides: false,
    showSafeZones: false,
    showTextBoxes: false,
    showHolesGuides: false,
    showGrid: false,
    ...options,
  };

  const warnings = collectWarnings(config);
  const { width, height, shape, cornerRadius, output, text, icon, monogram } = config;

  const shapeBounds = buildShapePath(shape, width, height, cornerRadius);
  const holes = computeHoleGeometry(config.holes, shapeBounds, shape);
  const layout = computeTextLayout(config);
  const safeZone = computeSafeZone(config);

  let svgContent = '';

  // Grid guide
  if (opts.showGrid) {
    svgContent += renderGrid(width, height);
  }

  // Safe zone guide
  if (opts.showSafeZones) {
    svgContent += `\n  <!-- Safe Zone -->\n  ${getSafeZoneSvg(safeZone, width, height)}`;
  }

  // CUT layer
  if (output.mode === 'both' || output.mode === 'cut') {
    svgContent += `\n  <g id="CUT" stroke="#000" fill="none" stroke-width="${output.cutStrokeWidth}">`;
    svgContent += `\n    <path d="${shapeBounds.pathD}" />`;
    if (holes.length > 0) {
      svgContent += `\n    ${getHoleSvgElements(holes, output.cutStrokeWidth)}`;
    }
    svgContent += `\n  </g>`;
  }

  // ENGRAVE layer
  if (output.mode === 'both' || output.mode === 'engrave') {
    svgContent += `\n  <g id="ENGRAVE" stroke="#ff0000" fill="none" stroke-width="${output.engraveStrokeWidth}">`;

    // Text elements
    svgContent += renderTextElements(config, layout, opts.showTextBoxes);

    // Icon
    if (icon.id && layout.line2) {
      const iconPos = calculateIconPosition(
        icon.placement,
        layout.line2.x,
        layout.line2.y,
        layout.line1?.y,
        icon.size,
        layout.line2.width
      );
      svgContent += `\n    ${getIconPathElement(icon.id, iconPos.x, iconPos.y, icon.size, output.engraveStrokeWidth)}`;
    }

    // Monogram
    if (monogram.enabled && monogram.text) {
      svgContent += renderMonogram(config, safeZone);
    }

    // Logo
    if (config.logo.svg) {
      svgContent += renderLogo(config);
    }

    svgContent += `\n  </g>`;
  }

  // Holes guides
  if (opts.showHolesGuides && holes.length > 0) {
    svgContent += `\n  <!-- Holes Guides -->`;
    for (const hole of holes) {
      if (hole.type === 'circle' && hole.r) {
        svgContent += `\n  <circle cx="${mm(hole.cx)}" cy="${mm(hole.cy)}" r="${mm(hole.r + 2)}" fill="none" stroke="#ff0000" stroke-width="0.1" stroke-dasharray="1,1" opacity="0.5" />`;
      }
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(width)}mm" height="${mm(height)}mm" viewBox="0 0 ${mm(width)} ${mm(height)}">
  ${svgContent}
</svg>`;

  return { svg, warnings, dimensions: { width, height } };
}

export function renderExportSvg(config: SignConfigV3): SignRenderResult {
  return renderPreviewSvg(config, {
    showGuides: false,
    showSafeZones: false,
    showTextBoxes: false,
    showHolesGuides: false,
    showGrid: false,
  });
}

export function renderDesignSvg(config: SignConfigV3): SignRenderResult {
  return renderPreviewSvg(config, {
    showGuides: true,
    showSafeZones: true,
    showTextBoxes: true,
    showHolesGuides: true,
    showGrid: true,
  });
}

function renderTextElements(config: SignConfigV3, layout: ReturnType<typeof computeTextLayout>, showBoxes: boolean): string {
  const { text, output } = config;
  let elements = '';

  const line1Text = applyTextTransform(text.line1.text.trim(), text.line1.transform);
  const line2Text = applyTextTransform(text.line2.text.trim(), text.line2.transform);
  const line3Text = applyTextTransform(text.line3.text.trim(), text.line3.transform);

  if (layout.line1 && line1Text) {
    elements += renderTextLine(line1Text, layout.line1, text.line1, output.engraveStrokeWidth, showBoxes);
  }

  if (layout.line2 && line2Text) {
    if (layout.line2.curvedPath) {
      elements += renderCurvedTextLine(line2Text, layout.line2, text.line2, output.engraveStrokeWidth);
    } else {
      elements += renderTextLine(line2Text, layout.line2, text.line2, output.engraveStrokeWidth, showBoxes);
    }
  }

  if (layout.line3 && line3Text) {
    elements += renderTextLine(line3Text, layout.line3, text.line3, output.engraveStrokeWidth, showBoxes);
  }

  return elements;
}

function renderTextLine(
  text: string,
  layout: { x: number; y: number; fontSize: number; width: number },
  lineConfig: { fontFamily: string; weight: string; letterSpacing: number },
  strokeWidth: number,
  showBox: boolean
): string {
  let result = '';

  if (showBox) {
    result += `\n    <rect x="${mm(layout.x - layout.width / 2)}" y="${mm(layout.y - layout.fontSize / 2)}" width="${mm(layout.width)}" height="${mm(layout.fontSize)}" fill="none" stroke="#0000ff" stroke-width="0.1" stroke-dasharray="1,1" opacity="0.3" />`;
  }

  const letterSpacingAttr = lineConfig.letterSpacing !== 0 ? ` letter-spacing="${lineConfig.letterSpacing}"` : '';

  result += `\n    <text x="${mm(layout.x)}" y="${mm(layout.y)}" font-family="${lineConfig.fontFamily}, Arial, sans-serif" font-size="${layout.fontSize}" font-weight="${lineConfig.weight}" text-anchor="middle" dominant-baseline="middle" fill="none" stroke="#000" stroke-width="${strokeWidth}"${letterSpacingAttr}>${escapeXml(text)}</text>`;

  return result;
}

function renderCurvedTextLine(
  text: string,
  layout: { x: number; y: number; fontSize: number; width: number; curvedPath?: string },
  lineConfig: { fontFamily: string; weight: string; letterSpacing: number },
  strokeWidth: number
): string {
  if (!layout.curvedPath) return '';

  const pathId = `curved-text-path-${Date.now()}`;
  const letterSpacingAttr = lineConfig.letterSpacing !== 0 ? ` letter-spacing="${lineConfig.letterSpacing}"` : '';

  return `
    <defs>
      <path id="${pathId}" d="${layout.curvedPath}" fill="none" />
    </defs>
    <text font-family="${lineConfig.fontFamily}, Arial, sans-serif" font-size="${layout.fontSize}" font-weight="${lineConfig.weight}" fill="none" stroke="#000" stroke-width="${strokeWidth}"${letterSpacingAttr}>
      <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapeXml(text)}</textPath>
    </text>`;
}

function renderMonogram(config: SignConfigV3, safeZone: ReturnType<typeof computeSafeZone>): string {
  const { monogram, width, height, output } = config;
  if (!monogram.enabled || !monogram.text) return '';

  let y: number;
  switch (monogram.placement) {
    case 'top':
      y = safeZone.top + monogram.size / 2;
      break;
    case 'bottom':
      y = height - safeZone.bottom - monogram.size / 2;
      break;
    default:
      y = height / 2;
  }

  return `\n    <text x="${mm(width / 2)}" y="${mm(y)}" font-family="serif" font-size="${monogram.size}" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="none" stroke="#000" stroke-width="${output.engraveStrokeWidth}">${escapeXml(monogram.text)}</text>`;
}

function renderLogo(config: SignConfigV3): string {
  const { logo, output } = config;
  if (!logo.svg) return '';

  const { x, y, width: w, height: h } = logo.placement;

  if (logo.simplify) {
    return `\n    <g transform="translate(${mm(x)}, ${mm(y)})" stroke="#000" stroke-width="${output.engraveStrokeWidth}" fill="none">
      <!-- Logo (simplified) -->
      ${logo.svg}
    </g>`;
  }

  return `\n    <g transform="translate(${mm(x)}, ${mm(y)})">
      <!-- Logo -->
      ${logo.svg}
    </g>`;
}

function renderGrid(width: number, height: number): string {
  let grid = '\n  <!-- Grid -->\n  <g stroke="#cccccc" stroke-width="0.05" opacity="0.3">';

  for (let x = 0; x <= width; x += 10) {
    grid += `\n    <line x1="${mm(x)}" y1="0" x2="${mm(x)}" y2="${mm(height)}" />`;
  }
  for (let y = 0; y <= height; y += 10) {
    grid += `\n    <line x1="0" y1="${mm(y)}" x2="${mm(width)}" y2="${mm(y)}" />`;
  }

  grid += '\n  </g>';
  return grid;
}

function collectWarnings(config: SignConfigV3): string[] {
  const warnings: string[] = [];

  const shapeBounds = buildShapePath(config.shape, config.width, config.height, config.cornerRadius);

  warnings.push(...validateShape(config.shape, config.width, config.height, config.cornerRadius));
  warnings.push(...validateHoles(config.holes, shapeBounds, config.shape, config.cornerRadius));
  warnings.push(...validateLayout(config));

  if (config.sheet.enabled) {
    warnings.push(...validateSheet(config));
  }

  return warnings;
}

function validateSheet(config: SignConfigV3): string[] {
  const warnings: string[] = [];
  const { sheet, width, height } = config;

  const availableW = sheet.width - sheet.margin * 2;
  const availableH = sheet.height - sheet.margin * 2;

  const signW = width + sheet.spacing;
  const signH = height + sheet.spacing;

  const maxCountX = Math.floor(availableW / signW);
  const maxCountY = Math.floor(availableH / signH);

  if (sheet.countX > maxCountX) {
    warnings.push(`Sheet can only fit ${maxCountX} signs horizontally`);
  }
  if (sheet.countY > maxCountY) {
    warnings.push(`Sheet can only fit ${maxCountY} signs vertically`);
  }
  if (maxCountX < 1 || maxCountY < 1) {
    warnings.push('Sign is too large to fit on sheet');
  }

  return warnings;
}

export function renderSheetSvg(config: SignConfigV3): SignRenderResult {
  const { sheet, width, height } = config;
  const warnings = collectWarnings(config);

  if (!sheet.enabled) {
    return renderExportSvg(config);
  }

  const signResult = renderExportSvg(config);
  const signSvgContent = signResult.svg
    .replace(/^<\?xml[^>]*\?>\s*/i, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

  const countX = sheet.autoFill
    ? Math.floor((sheet.width - sheet.margin * 2) / (width + sheet.spacing))
    : sheet.countX;
  const countY = sheet.autoFill
    ? Math.floor((sheet.height - sheet.margin * 2) / (height + sheet.spacing))
    : sheet.countY;

  let sheetContent = '';

  for (let row = 0; row < countY; row++) {
    for (let col = 0; col < countX; col++) {
      const x = sheet.margin + col * (width + sheet.spacing);
      const y = sheet.margin + row * (height + sheet.spacing);
      sheetContent += `\n  <g transform="translate(${mm(x)}, ${mm(y)})">${signSvgContent}</g>`;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${mm(sheet.width)}mm" height="${mm(sheet.height)}mm" viewBox="0 0 ${mm(sheet.width)} ${mm(sheet.height)}">
  <!-- Sheet: ${countX} x ${countY} signs -->
  ${sheetContent}
</svg>`;

  return { svg, warnings, dimensions: { width: sheet.width, height: sheet.height } };
}

export function generateFilename(config: SignConfigV3): string {
  const mainText = applyTextTransform(config.text.line2.text.trim(), config.text.line2.transform);
  const slug = mainText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30) || 'sign';

  return `personalised-sign-${config.shape}-${slug}-${config.width}x${config.height}.svg`;
}
