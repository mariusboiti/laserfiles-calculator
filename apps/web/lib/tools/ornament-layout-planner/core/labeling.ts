/**
 * Label generation for Ornament Layout Planner V2
 * Supports serial numbering and template naming
 */

import type {
  SheetLayout,
  TemplateItem,
  LabelStyle,
  PlacedItem,
} from '../types/layout';

export interface LabelingOptions {
  style: LabelStyle;
  templates: TemplateItem[];
}

/**
 * Compute labels for all sheets
 */
export function computeLabels(
  sheets: SheetLayout[],
  options: LabelingOptions
): SheetLayout[] {
  const { style, templates } = options;
  const templatesMap = new Map(templates.map((t) => [t.id, t]));

  let globalIndex = 1;

  return sheets.map((sheet) => ({
    ...sheet,
    items: sheet.items.map((item) => {
      const template = templatesMap.get(item.templateId);
      const label = generateLabel(style, globalIndex, template);
      globalIndex++;

      return {
        ...item,
        label,
      };
    }),
  }));
}

/**
 * Generate label text based on style
 */
function generateLabel(
  style: LabelStyle,
  index: number,
  template?: TemplateItem
): string {
  switch (style) {
    case 'index':
      return `#${index}`;

    case 'templateName':
      return template ? sanitizeName(template.name) : `Item${index}`;

    case 'templateName+index':
      const name = template ? sanitizeName(template.name) : 'Item';
      return `${name}-${index}`;

    default:
      return `#${index}`;
  }
}

/**
 * Sanitize template name for label (remove extension, special chars)
 */
function sanitizeName(name: string): string {
  // Remove file extension
  let sanitized = name.replace(/\.(svg|SVG)$/, '');
  
  // Replace spaces and special chars with dash
  sanitized = sanitized.replace(/[^a-zA-Z0-9-_]/g, '-');
  
  // Remove multiple consecutive dashes
  sanitized = sanitized.replace(/-+/g, '-');
  
  // Trim dashes from start/end
  sanitized = sanitized.replace(/^-+|-+$/g, '');
  
  // Limit length
  if (sanitized.length > 20) {
    sanitized = sanitized.substring(0, 20);
  }
  
  return sanitized || 'Item';
}

/**
 * Render label as SVG text element
 */
export function renderLabelSvg(
  item: PlacedItem,
  fontSize: number,
  offsetX: number,
  offsetY: number
): string {
  if (!item.label) return '';

  const x = item.x + offsetX;
  const y = item.y + offsetY;

  return `<text x="${x.toFixed(3)}" y="${y.toFixed(3)}" font-family="Arial, sans-serif" font-size="${fontSize.toFixed(2)}" fill="#000000" dominant-baseline="hanging">${escapeXml(item.label)}</text>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
