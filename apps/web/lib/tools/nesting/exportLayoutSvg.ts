import type { SheetLayout } from "./shelfNesting";

export type ExportLayoutInput = {
  originalSvg: string;
  sheetWidthMm: number;
  sheetHeightMm: number;
  marginMm: number;
  sheet: SheetLayout;
};

export function exportLayoutSvg(input: ExportLayoutInput): string {
  const { sheetWidthMm, sheetHeightMm, marginMm, sheet } = input;

  const header = `<?xml version="1.0" encoding="UTF-8"?>`;

  const viewBox = `0 0 ${sheetWidthMm} ${sheetHeightMm}`;

  const parts = sheet.placed
    .map((p) => {
      const x = p.xMm;
      const y = p.yMm;
      const w = p.widthMm;
      const h = p.heightMm;
      const angle = p.rotationDeg ?? 0;
      const transformBase = `translate(${x},${y})`;
      const transform = angle === 0
        ? transformBase
        : `${transformBase} rotate(${angle})`;
      return `<g transform="${transform}"><rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#000" stroke-width="0.1" /></g>`;
    })
    .join("\n");

  return `${header}
<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidthMm}mm" height="${sheetHeightMm}mm" viewBox="${viewBox}" shape-rendering="crispEdges">
  <rect x="0" y="0" width="${sheetWidthMm}" height="${sheetHeightMm}" fill="none" stroke="#000" stroke-width="0.1" />
  <g transform="translate(${marginMm},${marginMm})">
${parts}
  </g>
</svg>`;
}
