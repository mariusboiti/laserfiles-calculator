import type { ParsedPart } from "./parseSvgParts";

export type ShelfNestingInput = {
  parts: ParsedPart[];
  sheetWidthMm: number;
  sheetHeightMm: number;
  marginMm: number;
  gapMm: number;
  allowRotation: boolean;
};

export type PlacedPart = {
  part: ParsedPart;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotationDeg: 0 | 90 | 180 | 270;
};

export type SheetLayout = {
  index: number;
  placed: PlacedPart[];
};

export type ShelfNestingResult = {
  sheets: SheetLayout[];
  unplaced: ParsedPart[];
};

export function runShelfNesting(input: ShelfNestingInput): ShelfNestingResult {
  const { parts, sheetWidthMm, sheetHeightMm, marginMm, gapMm, allowRotation } = input;

  if (sheetWidthMm <= 0 || sheetHeightMm <= 0) {
    throw new Error("Sheet size must be greater than zero.");
  }

  const innerWidth = Math.max(0, sheetWidthMm - 2 * marginMm);
  const innerHeight = Math.max(0, sheetHeightMm - 2 * marginMm);

  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error("Sheet is too small for the given margin.");
  }

  const sorted = [...parts].sort((a, b) => {
    const areaA = a.bbox.width * a.bbox.height;
    const areaB = b.bbox.width * b.bbox.height;
    return areaB - areaA;
  });

  const sheets: SheetLayout[] = [];
  const unplaced: ParsedPart[] = [];

  const startNewSheet = (): {
    cursorX: number;
    cursorY: number;
    rowHeight: number;
    layout: SheetLayout;
  } => {
    const layout: SheetLayout = {
      index: sheets.length,
      placed: [],
    };
    sheets.push(layout);
    return {
      cursorX: marginMm,
      cursorY: marginMm,
      rowHeight: 0,
      layout,
    };
  };

  // initialise first sheet
  let { cursorX, cursorY, rowHeight, layout } = startNewSheet();

  const tryPlaceInRow = (
    width: number,
    height: number,
    cursorXLocal: number,
    cursorYLocal: number
  ): { ok: boolean; x: number; y: number } => {
    if (width <= 0 || height <= 0) return { ok: false, x: 0, y: 0 };
    if (width > innerWidth || height > innerHeight) return { ok: false, x: 0, y: 0 };
    if (cursorXLocal - marginMm + width > innerWidth) {
      return { ok: false, x: 0, y: 0 };
    }
    if (cursorYLocal - marginMm + height > innerHeight) {
      return { ok: false, x: 0, y: 0 };
    }
    return { ok: true, x: cursorXLocal, y: cursorYLocal };
  };

  for (const part of sorted) {
    const w = part.bbox.width + gapMm;
    const h = part.bbox.height + gapMm;

    const attemptPlaceOnCurrentSheet = (): PlacedPart | null => {
      const orientations: Array<{ rotationDeg: 0 | 90 | 180 | 270; w: number; h: number }> = allowRotation
        ? [
            { rotationDeg: 0, w, h },
            { rotationDeg: 90, w: h, h: w },
            { rotationDeg: 180, w, h },
            { rotationDeg: 270, w: h, h: w },
          ]
        : [{ rotationDeg: 0, w, h }];

      let best: { rot: 0 | 90 | 180 | 270; x: number; y: number; w: number; h: number } | null = null;

      for (const o of orientations) {
        const pos = tryPlaceInRow(o.w, o.h, cursorX, cursorY);
        if (!pos.ok) continue;
        if (!best) {
          best = { rot: o.rotationDeg, x: pos.x, y: pos.y, w: o.w, h: o.h };
        } else {
          const remainingBest = innerWidth - (best.x - marginMm + best.w);
          const remainingNew = innerWidth - (pos.x - marginMm + o.w);
          if (remainingNew > remainingBest) {
            best = { rot: o.rotationDeg, x: pos.x, y: pos.y, w: o.w, h: o.h };
          }
        }
      }

      if (!best) return null;

      const placed: PlacedPart = {
        part,
        xMm: best.x,
        yMm: best.y,
        widthMm: best.w - gapMm,
        heightMm: best.h - gapMm,
        rotationDeg: best.rot,
      };

      cursorX = best.x + best.w;
      rowHeight = Math.max(rowHeight, best.h);

      layout.placed.push(placed);
      return placed;
    };

    let placedHere = attemptPlaceOnCurrentSheet();

    if (!placedHere) {
      // start new row on current sheet
      cursorX = marginMm;
      cursorY += rowHeight;
      rowHeight = 0;
      placedHere = attemptPlaceOnCurrentSheet();
    }

    if (!placedHere) {
      // start a new sheet and try again
      ({ cursorX, cursorY, rowHeight, layout } = startNewSheet());
      placedHere = attemptPlaceOnCurrentSheet();
    }

    if (!placedHere) {
      // part is too large for sheet, mark as unplaced
      unplaced.push(part);
    }
  }

  return { sheets, unplaced };
}
