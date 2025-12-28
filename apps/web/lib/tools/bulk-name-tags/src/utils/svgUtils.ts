import type { NameRecord, TextLayoutConfig, SheetLayoutConfig, TemplateBounds, GeneratedSVG, TemplateSizeConfig, UnitSystem } from '../types';

export interface SheetCapacity {
  tagsPerRow: number;
  tagsPerColumn: number;
  maxTags: number;
  cellWidth: number;
  cellHeight: number;
}

export function parseTemplateBounds(svgString: string): TemplateBounds {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Invalid SVG: No <svg> element found');
  }

  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
    return { x, y, width, height };
  }

  const width = parseFloat(svgElement.getAttribute('width') || '100');
  const height = parseFloat(svgElement.getAttribute('height') || '100');
  return { x: 0, y: 0, width, height };
}

export function calculateSheetCapacity(bounds: TemplateBounds, sheetConfig: SheetLayoutConfig): SheetCapacity {
  const margin = sheetConfig.margin;

  const availableWidth = sheetConfig.sheetWidth - 2 * margin;
  const availableHeight = sheetConfig.sheetHeight - 2 * margin;

  const cellWidth = sheetConfig.rotation === 90 ? bounds.height : bounds.width;
  const cellHeight = sheetConfig.rotation === 90 ? bounds.width : bounds.height;

  const tagsPerRow = Math.max(
    0,
    Math.floor(
      (availableWidth + sheetConfig.horizontalSpacing) /
      (cellWidth + sheetConfig.horizontalSpacing)
    )
  );

  const tagsPerColumn = Math.max(
    0,
    Math.floor(
      (availableHeight + sheetConfig.verticalSpacing) /
      (cellHeight + sheetConfig.verticalSpacing)
    )
  );

  return {
    tagsPerRow,
    tagsPerColumn,
    maxTags: tagsPerRow * tagsPerColumn,
    cellWidth,
    cellHeight
  };
}

export function applyTextCase(text: string, textCase: string): string {
  switch (textCase) {
    case 'uppercase':
      return text.toUpperCase();
    case 'capitalize':
      return text.split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    default:
      return text;
  }
}

export function calculateTextPosition(
  bounds: TemplateBounds,
  textConfig: TextLayoutConfig
): { x: number; y: number; textAnchor: string } {
  const { horizontalAlignment, horizontalPosition, verticalPosition, maxTextWidth } = textConfig;

  let x: number;
  let textAnchor: string;

  if (typeof horizontalPosition === 'number' && !Number.isNaN(horizontalPosition)) {
    x = bounds.x + (bounds.width * horizontalPosition) / 100;

    switch (horizontalAlignment) {
      case 'left':
        textAnchor = 'start';
        break;
      case 'right':
        textAnchor = 'end';
        break;
      case 'center':
      default:
        textAnchor = 'middle';
        break;
    }

    const y = bounds.y + (bounds.height * verticalPosition) / 100;
    return { x, y, textAnchor };
  }

  switch (horizontalAlignment) {
    case 'left':
      x = bounds.x + bounds.width * (1 - maxTextWidth / 100) / 2;
      textAnchor = 'start';
      break;
    case 'right':
      x = bounds.x + bounds.width - bounds.width * (1 - maxTextWidth / 100) / 2;
      textAnchor = 'end';
      break;
    case 'center':
    default:
      x = bounds.x + bounds.width / 2;
      textAnchor = 'middle';
      break;
  }

  const y = bounds.y + (bounds.height * verticalPosition) / 100;

  return { x, y, textAnchor };
}

export function createTextElement(
  text: string,
  x: number,
  y: number,
  textAnchor: string,
  config: TextLayoutConfig,
  isSecondLine: boolean = false
): string {
  const fontSize = isSecondLine ? config.secondLineFontSize : config.fontSize;
  const actualY = isSecondLine ? y + config.secondLineVerticalOffset : y;
  const processedText = applyTextCase(text, config.textCase);

  return `<text x="${x}" y="${actualY}" text-anchor="${textAnchor}" dominant-baseline="middle" font-family="${config.fontFamily}" font-size="${fontSize}" letter-spacing="${config.letterSpacing}">${escapeXml(processedText)}</text>`;
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function createEmbeddedFontDefs(textConfig: TextLayoutConfig): string {
  const embedded = textConfig.embeddedFont;
  if (!embedded) return '';

  const family = embedded.fontFamily.trim();
  if (!family) return '';

  const cssFamily = escapeCssString(family);
  const css = `@font-face{font-family:'${cssFamily}';src:url('${embedded.dataUrl}') format('${embedded.format}');}`;

  return `<defs><style type="text/css">${css}</style></defs>`;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateSingleTag(
  templateSvg: string,
  name: NameRecord,
  textConfig: TextLayoutConfig,
  bounds: TemplateBounds,
  offsetX: number = 0,
  offsetY: number = 0,
  rotation: 0 | 90 = 0,
  scaleX: number = 1,
  scaleY: number = 1
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(templateSvg, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Invalid SVG template');
  }

  const templateContent = Array.from(svgElement.children)
    .map(child => child.outerHTML)
    .join('\n');

  const { x, y, textAnchor } = calculateTextPosition(bounds, textConfig);

  const line1Text = createTextElement(
    name.line1,
    x,
    y,
    textAnchor,
    textConfig,
    false
  );

  let line2Text = '';
  if (textConfig.secondLineEnabled && name.line2) {
    line2Text = createTextElement(
      name.line2,
      x,
      y,
      textAnchor,
      textConfig,
      true
    );
  }

  const hasScale = scaleX !== 1 || scaleY !== 1;

  const groupTransform = (offsetX !== 0 || offsetY !== 0 || rotation !== 0 || hasScale)
    ? rotation === 90
      ? ` transform="translate(${offsetX}, ${offsetY}) translate(${bounds.height * scaleY}, 0) rotate(90) scale(${scaleX}, ${scaleY}) translate(${-bounds.x}, ${-bounds.y})"`
      : ` transform="translate(${offsetX}, ${offsetY}) scale(${scaleX}, ${scaleY}) translate(${-bounds.x}, ${-bounds.y})"`
    : '';

  return `<g${groupTransform}>
${templateContent}
${line1Text}
${line2Text}
</g>`;
}

export function generateNameTagSvg(
  baseTemplateSvg: string,
  names: NameRecord[],
  textConfig: TextLayoutConfig,
  sheetConfig: SheetLayoutConfig,
  options?: {
    templateSize?: TemplateSizeConfig | null;
    unitSystem?: UnitSystem;
  }
): GeneratedSVG[] | string {
  const bounds = parseTemplateBounds(baseTemplateSvg);
  const embeddedFontDefs = createEmbeddedFontDefs(textConfig);
  const unitSystem: UnitSystem = options?.unitSystem ?? 'mm';
  const templateSize = options?.templateSize ?? null;

  const mmToIn = (mm: number) => mm / 25.4;
  const formatLength = (mm: number) => {
    const value = unitSystem === 'in' ? mmToIn(mm) : mm;
    const rounded = unitSystem === 'in' ? Number(value.toFixed(4)) : Number(value.toFixed(3));
    return `${rounded}${unitSystem}`;
  };

  if (sheetConfig.outputMode === 'separate') {
    const outWidth = templateSize ? templateSize.width : bounds.width;
    const outHeight = templateSize ? templateSize.height : bounds.height;

    return names.map((name, index) => {
      const tagContent = generateSingleTag(baseTemplateSvg, name, textConfig, bounds);
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${formatLength(outWidth)}" height="${formatLength(outHeight)}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">
${embeddedFontDefs}
${tagContent}
</svg>`;

      const sanitizedName = name.line1.replace(/[^a-zA-Z0-9]/g, '_');
      return {
        fileName: `${String(index + 1).padStart(3, '0')}-${sanitizedName}.svg`,
        svg
      };
    });
  } else {
    const margin = sheetConfig.margin;

    const scaleX = templateSize ? templateSize.width / bounds.width : 1;
    const scaleY = templateSize ? templateSize.height / bounds.height : 1;
    const capacityBounds: TemplateBounds = {
      ...bounds,
      width: bounds.width * scaleX,
      height: bounds.height * scaleY
    };

    const { tagsPerRow, maxTags, cellWidth, cellHeight } = calculateSheetCapacity(capacityBounds, sheetConfig);
    const fillToCapacity = !!sheetConfig.fillToCapacity;

    const tagsToRender = maxTags === 0
      ? []
      : fillToCapacity
        ? Array.from({ length: maxTags }, (_, i) => names[i % names.length])
        : names.slice(0, maxTags);

    let allTags = '';
    tagsToRender.forEach((name, index) => {
      const row = Math.floor(index / tagsPerRow);
      const col = index % tagsPerRow;

      const offsetX = margin + col * (cellWidth + sheetConfig.horizontalSpacing);
      const offsetY = margin + row * (cellHeight + sheetConfig.verticalSpacing);

      allTags += generateSingleTag(baseTemplateSvg, name, textConfig, bounds, offsetX, offsetY, sheetConfig.rotation, scaleX, scaleY) + '\n';
    });

    const sheetSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${formatLength(sheetConfig.sheetWidth)}" height="${formatLength(sheetConfig.sheetHeight)}" viewBox="0 0 ${sheetConfig.sheetWidth} ${sheetConfig.sheetHeight}">
${embeddedFontDefs}
${allTags}
</svg>`;

    return sheetSvg;
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function sanitizeSvgForInlinePreview(svgString: string): string {
  const stripped = svgString
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trim();

  const match = stripped.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : stripped;
}
