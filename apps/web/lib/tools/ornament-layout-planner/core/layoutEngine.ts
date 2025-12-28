/**
 * Layout Engine V2 for Ornament Layout Planner
 * Supports both Grid and Pack modes
 */

import type {
  TemplateItem,
  LayoutSettings,
  PlacedItem,
  SheetLayout,
  LayoutResult,
} from '../types/layout';

export interface LayoutEngineArgs {
  templates: TemplateItem[];
  settings: LayoutSettings;
}

/**
 * Main layout engine - generates sheet layouts based on mode
 */
export function buildLayoutsV2(args: LayoutEngineArgs): LayoutResult {
  const { templates, settings } = args;
  const errors: string[] = [];
  const summaryWarnings: string[] = [];

  // Validate inputs
  if (templates.length === 0) {
    errors.push('No templates loaded');
    return { sheets: [], summaryWarnings, errors };
  }

  const totalQty = templates.reduce((sum, t) => sum + t.qty, 0);
  if (totalQty === 0) {
    errors.push('Total quantity is 0');
    return { sheets: [], summaryWarnings, errors };
  }

  // Route to appropriate engine
  if (settings.mode === 'grid') {
    return buildGridLayout(args);
  } else {
    return buildPackLayout(args);
  }
}

/**
 * Grid mode layout (V1 compatible)
 */
function buildGridLayout(args: LayoutEngineArgs): LayoutResult {
  const { templates, settings } = args;
  const errors: string[] = [];
  const summaryWarnings: string[] = [];
  const sheets: SheetLayout[] = [];

  // Find active template
  let activeTemplate = templates.find((t) => t.id === settings.activeTemplateId);
  if (!activeTemplate && templates.length > 0) {
    activeTemplate = templates[0];
  }

  if (!activeTemplate) {
    errors.push('No active template for grid mode');
    return { sheets, summaryWarnings, errors };
  }

  // Calculate template dimensions with rotation
  const tplW = activeTemplate.rotateDeg === 90 || activeTemplate.rotateDeg === 270
    ? activeTemplate.height
    : activeTemplate.width;
  const tplH = activeTemplate.rotateDeg === 90 || activeTemplate.rotateDeg === 270
    ? activeTemplate.width
    : activeTemplate.height;

  // Calculate effective rows/cols
  let rows = settings.rows;
  let cols = settings.cols;

  if (settings.autoFit) {
    const usableW = settings.sheetW - 2 * settings.margin;
    const usableH = settings.sheetH - 2 * settings.margin;
    cols = Math.max(1, Math.floor((usableW + settings.gapX) / (tplW + settings.gapX)));
    rows = Math.max(1, Math.floor((usableH + settings.gapY) / (tplH + settings.gapY)));
  }

  // Calculate grid dimensions
  const gridW = cols * tplW + (cols - 1) * settings.gapX;
  const gridH = rows * tplH + (rows - 1) * settings.gapY;

  // Check if grid fits
  const usableW = settings.sheetW - 2 * settings.margin;
  const usableH = settings.sheetH - 2 * settings.margin;

  if (gridW > usableW || gridH > usableH) {
    summaryWarnings.push(
      `Grid ${gridW.toFixed(1)}×${gridH.toFixed(1)}mm exceeds usable area ${usableW.toFixed(1)}×${usableH.toFixed(1)}mm`
    );
  }

  // Calculate start position (centered or margin)
  let startX = settings.margin;
  let startY = settings.margin;

  if (settings.center) {
    startX = (settings.sheetW - gridW) / 2;
    startY = (settings.sheetH - gridH) / 2;
  }

  if (startX < 0 || startY < 0) {
    summaryWarnings.push('Grid start position is negative (layout too large)');
    startX = Math.max(0, startX);
    startY = Math.max(0, startY);
  }

  // Place items in grid
  const items: PlacedItem[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (tplW + settings.gapX);
      const y = startY + row * (tplH + settings.gapY);

      items.push({
        templateId: activeTemplate.id,
        x,
        y,
        w: tplW,
        h: tplH,
        rotateDeg: activeTemplate.rotateDeg,
      });
    }
  }

  sheets.push({
    sheetIndex: 1,
    items,
    warnings: [],
  });

  return { sheets, summaryWarnings, errors };
}

/**
 * Pack mode layout (NEW in V2)
 */
function buildPackLayout(args: LayoutEngineArgs): LayoutResult {
  const { templates, settings } = args;
  const errors: string[] = [];
  const summaryWarnings: string[] = [];
  const sheets: SheetLayout[] = [];

  // Build list of items to place
  const itemsToPlace = buildItemsList(templates, settings);

  if (itemsToPlace.length === 0) {
    errors.push('No items to place');
    return { sheets, summaryWarnings, errors };
  }

  // Check for small gaps
  if (settings.gapX < 0.5 || settings.gapY < 0.5) {
    summaryWarnings.push('Small gaps (<0.5mm) may cause parts to merge after kerf');
  }

  // Pack items into sheets
  const usableW = settings.sheetW - 2 * settings.margin;
  const usableH = settings.sheetH - 2 * settings.margin;

  let currentSheetIndex = 1;
  let currentItems: PlacedItem[] = [];
  let currentX = settings.margin;
  let currentY = settings.margin;
  let rowHeight = 0;

  for (const item of itemsToPlace) {
    let itemW = item.w;
    let itemH = item.h;
    let itemRotate = item.rotateDeg;

    // Try to fit on current row
    if (currentX + itemW > settings.sheetW - settings.margin) {
      // Try rotation if allowed
      if (settings.allowRotateInPack && (itemRotate === 0 || itemRotate === 180)) {
        const swapped = { w: itemH, h: itemW };
        if (currentX + swapped.w <= settings.sheetW - settings.margin) {
          itemW = swapped.w;
          itemH = swapped.h;
          itemRotate = itemRotate === 0 ? 90 : 270;
        } else {
          // New row
          currentX = settings.margin;
          currentY += rowHeight + settings.gapY;
          rowHeight = 0;
        }
      } else {
        // New row
        currentX = settings.margin;
        currentY += rowHeight + settings.gapY;
        rowHeight = 0;
      }
    }

    // Check if fits vertically
    if (currentY + itemH > settings.sheetH - settings.margin) {
      // Overflow - need new sheet
      if (settings.multiSheet && settings.overflowPolicy === 'new-sheet') {
        if (currentSheetIndex >= settings.maxSheets) {
          summaryWarnings.push(`Reached max sheets (${settings.maxSheets}). Some items not placed.`);
          break;
        }

        // Save current sheet
        sheets.push({
          sheetIndex: currentSheetIndex,
          items: currentItems,
          warnings: [],
        });

        // Start new sheet
        currentSheetIndex++;
        currentItems = [];
        currentX = settings.margin;
        currentY = settings.margin;
        rowHeight = 0;
      } else {
        summaryWarnings.push('Items do not fit. Enable multi-sheet or reduce quantity.');
        break;
      }
    }

    // Place item
    currentItems.push({
      templateId: item.templateId,
      x: currentX,
      y: currentY,
      w: itemW,
      h: itemH,
      rotateDeg: itemRotate,
    });

    currentX += itemW + settings.gapX;
    rowHeight = Math.max(rowHeight, itemH);
  }

  // Save last sheet
  if (currentItems.length > 0) {
    sheets.push({
      sheetIndex: currentSheetIndex,
      items: currentItems,
      warnings: [],
    });
  }

  return { sheets, summaryWarnings, errors };
}

/**
 * Build ordered list of items to place based on settings
 */
function buildItemsList(
  templates: TemplateItem[],
  settings: LayoutSettings
): Array<{ templateId: string; w: number; h: number; rotateDeg: number }> {
  const items: Array<{ templateId: string; w: number; h: number; rotateDeg: number }> = [];

  if (settings.groupByTemplate) {
    // Place all of template A, then B, then C
    for (const template of templates) {
      for (let i = 0; i < template.qty; i++) {
        const w = template.rotateDeg === 90 || template.rotateDeg === 270
          ? template.height
          : template.width;
        const h = template.rotateDeg === 90 || template.rotateDeg === 270
          ? template.width
          : template.height;

        items.push({
          templateId: template.id,
          w,
          h,
          rotateDeg: template.rotateDeg,
        });
      }
    }
  } else {
    // Interleave: A1, B1, C1, A2, B2, C2...
    const maxQty = Math.max(...templates.map((t) => t.qty));
    for (let i = 0; i < maxQty; i++) {
      for (const template of templates) {
        if (i < template.qty) {
          const w = template.rotateDeg === 90 || template.rotateDeg === 270
            ? template.height
            : template.width;
          const h = template.rotateDeg === 90 || template.rotateDeg === 270
            ? template.width
            : template.height;

          items.push({
            templateId: template.id,
            w,
            h,
            rotateDeg: template.rotateDeg,
          });
        }
      }
    }
  }

  return items;
}
