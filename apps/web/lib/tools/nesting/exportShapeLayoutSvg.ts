import type { KeepOutRect, ShapeSheetLayout } from "./shapeNesting";

export type ExportShapeLayoutInput = {
  sheetWidthMm: number;
  sheetHeightMm: number;
  sheet: ShapeSheetLayout;
  keepOuts?: KeepOutRect[];
};

export function exportShapeLayoutSvg(input: ExportShapeLayoutInput): string {
  const { sheetWidthMm, sheetHeightMm, sheet, keepOuts } = input;

  const header = `<?xml version="1.0" encoding="UTF-8"?>`;
  const viewBox = `0 0 ${sheetWidthMm} ${sheetHeightMm}`;

  const parts = sheet.placed
    .map((p) => {
      const pointsAttr = p.polygonWorld
        .map((pt) => `${pt.x.toFixed(3)},${pt.y.toFixed(3)}`)
        .join(" ");
      const fill = p.part.fill ?? "none";
      const stroke = p.part.stroke ?? "#000";
      return `<polygon points="${pointsAttr}" fill="${fill}" stroke="${stroke}" stroke-width="0.1" />`;
    })
    .join("\n");

  const keepOutSvg = (keepOuts ?? [])
    .map(
      (k) =>
        `<rect x="${k.x.toFixed(3)}" y="${k.y.toFixed(3)}" width="${k.width.toFixed(3)}" height="${k.height.toFixed(3)}" fill="none" stroke="#f97316" stroke-width="0.4" stroke-dasharray="3 2" />`
    )
    .join("\n");

  return `${header}
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidthMm}mm" height="${sheetHeightMm}mm" viewBox="${viewBox}" shape-rendering="crispEdges">
  <rect x="0" y="0" width="${sheetWidthMm}" height="${sheetHeightMm}" fill="none" stroke="#000" stroke-width="0.1" />
${keepOutSvg}
${parts}
</svg>`;
}
