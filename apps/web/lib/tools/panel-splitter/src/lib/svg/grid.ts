import { Settings, GridInfo, TileInfo, NumberingFormat } from '../../types';

export function formatTileLabel(row: number, col: number, format: NumberingFormat, index: number, startAtOne: boolean = true): string {
  const offset = startAtOne ? 1 : 0;
  const r = String(row + offset).padStart(2, '0');
  const c = String(col + offset).padStart(2, '0');
  const i = String(index + offset).padStart(3, '0');

  switch (format) {
    case 'R01C01':
      return `R${r}C${c}`;
    case '01-01':
      return `${r}-${c}`;
    case 'Tile_001':
      return `Tile_${i}`;
    default:
      return `R${r}C${c}`;
  }
}

export function computeGrid(
  designWidthMm: number,
  designHeightMm: number,
  settings: Settings
): GridInfo {
  const { bedWidth, bedHeight, margin, overlap, numberingFormat, startIndexAtOne } = settings;

  const effectiveTileWidth = bedWidth - 2 * margin;
  const effectiveTileHeight = bedHeight - 2 * margin;

  if (effectiveTileWidth <= 0 || effectiveTileHeight <= 0) {
    throw new Error('panel_splitter.error.effective_tile_non_positive');
  }

  const stepX = effectiveTileWidth - overlap;
  const stepY = effectiveTileHeight - overlap;

  if (stepX <= 0 || stepY <= 0) {
    throw new Error('panel_splitter.error.overlap_too_large_for_effective_tile');
  }

  const cols = Math.max(1, Math.ceil((designWidthMm - overlap) / stepX));
  const rows = Math.max(1, Math.ceil((designHeightMm - overlap) / stepY));

  const tiles: TileInfo[] = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * stepX;
      const y = row * stepY;

      const tileWidth = Math.min(effectiveTileWidth, designWidthMm - x);
      const tileHeight = Math.min(effectiveTileHeight, designHeightMm - y);

      tiles.push({
        row,
        col,
        id: `tile-${row}-${col}`,
        label: formatTileLabel(row, col, numberingFormat, index, startIndexAtOne),
        x,
        y,
        width: tileWidth,
        height: tileHeight,
        isEmpty: false,
        hasUnsafeFallback: false,
      });

      index++;
    }
  }

  return {
    rows,
    cols,
    tileWidth: bedWidth,
    tileHeight: bedHeight,
    effectiveTileWidth,
    effectiveTileHeight,
    tiles,
  };
}
