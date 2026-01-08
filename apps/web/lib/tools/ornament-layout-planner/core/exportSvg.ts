/**
 * SVG Export for Ornament Layout Planner V2
 * Generates clean SVG files for laser cutting
 */

import type {
  SheetLayout,
  TemplateItem,
  LayoutSettings,
} from '../types/layout';

export interface ExportOptions {
  sheetIndex: number;
  sheet: SheetLayout;
  templates: TemplateItem[];
  settings: LayoutSettings;
}

/**
 * Generate SVG for a single sheet
 */
export function generateSheetSvg(options: ExportOptions): string {
  const { sheet, templates, settings } = options;
  const templatesMap = new Map(templates.map((t) => [t.id, t]));

  const { sheetW, sheetH } = settings;

  let content = '';

  // Optional: Sheet outline
  if (settings.showSheetOutline) {
    content += `  <rect x="0" y="0" width="${sheetW}" height="${sheetH}" fill="none" stroke="#CCCCCC" stroke-width="0.5" />\n`;
  }

  // Place templates
  for (const item of sheet.items) {
    const template = templatesMap.get(item.templateId);
    if (!template) continue;

    // Build transform
    let transform = `translate(${item.x.toFixed(3)},${item.y.toFixed(3)})`;
    
    if (item.rotateDeg !== 0) {
      // Rotate around item center
      const cx = item.w / 2;
      const cy = item.h / 2;
      transform += ` rotate(${item.rotateDeg},${cx.toFixed(3)},${cy.toFixed(3)})`;
    }

    content += `  <g transform="${transform}">\n`;
    content += `    ${template.innerSvg}\n`;
    content += `  </g>\n`;
  }


  // Build complete SVG
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${sheetW}mm" height="${sheetH}mm" viewBox="0 0 ${sheetW} ${sheetH}">
${content}</svg>`;
}

/**
 * Generate filename for sheet export
 */
export function generateSheetFilename(
  sheetIndex: number,
  totalSheets: number,
  itemCount: number,
  settings: LayoutSettings,
  templateName?: string
): string {
  const mode = settings.mode;
  const sheetW = Math.round(settings.sheetW);
  const sheetH = Math.round(settings.sheetH);
  
  let filename = `ornament-layout-v2-${mode}-${sheetW}x${sheetH}`;
  
  if (templateName) {
    const sanitized = templateName
      .replace(/\.(svg|SVG)$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 30);
    filename += `-${sanitized}`;
  }
  
  if (totalSheets > 1) {
    filename += `-sheet-${sheetIndex.toString().padStart(2, '0')}`;
  }
  
  filename += `-items-${itemCount}.svg`;
  
  return filename;
}

/**
 * Generate filename for ZIP export
 */
export function generateZipFilename(
  totalItems: number,
  totalSheets: number,
  settings: LayoutSettings
): string {
  const mode = settings.mode;
  const sheetW = Math.round(settings.sheetW);
  const sheetH = Math.round(settings.sheetH);
  
  return `ornament-layout-v2-${mode}-${sheetW}x${sheetH}-${totalItems}items-${totalSheets}sheets.zip`;
}

/**
 * Generate manifest JSON for ZIP export
 */
export function generateManifest(
  sheets: SheetLayout[],
  templates: TemplateItem[],
  settings: LayoutSettings
): string {
  const manifest = {
    tool: 'ornament-layout-planner',
    version: 'v2',
    mode: settings.mode,
    sheet: {
      w: settings.sheetW,
      h: settings.sheetH,
      unit: settings.unit,
    },
    settings: {
      margin: settings.margin,
      gapX: settings.gapX,
      gapY: settings.gapY,
      multiSheet: settings.multiSheet,
      mode: settings.mode,
    },
    templates: templates.map((t) => ({
      name: t.name,
      w: t.width,
      h: t.height,
      qty: t.qty,
      rotateDeg: t.rotateDeg,
    })),
    sheets: sheets.map((s) => ({
      index: s.sheetIndex,
      items: s.items.length,
      warnings: s.warnings,
    })),
  };

  return JSON.stringify(manifest, null, 2);
}
