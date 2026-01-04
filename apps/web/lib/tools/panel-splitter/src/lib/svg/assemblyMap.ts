import { SVGInfo, Settings, GridInfo, TileInfo } from '../../types';

export function generateAssemblyMapSVG(
  svgInfo: SVGInfo,
  settings: Settings,
  gridInfo: GridInfo,
  tiles: TileInfo[]
): string {
  const { bedWidth, bedHeight, margin, overlap } = settings;
  const { rows, cols, effectiveTileWidth, effectiveTileHeight } = gridInfo;
  
  const mapPadding = 20;
  const legendHeight = 80;
  const labelFontSize = 10;
  
  const totalDesignWidth = svgInfo.detectedWidthMm;
  const totalDesignHeight = svgInfo.detectedHeightMm;
  
  const scale = Math.min(
    400 / totalDesignWidth,
    300 / totalDesignHeight,
    1
  );
  
  const scaledWidth = totalDesignWidth * scale;
  const scaledHeight = totalDesignHeight * scale;
  
  const svgWidth = scaledWidth + mapPadding * 2;
  const svgHeight = scaledHeight + mapPadding * 2 + legendHeight;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${svgWidth}mm" height="${svgHeight}mm" 
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <style>
    .tile-rect { fill: #f0f9ff; stroke: #0ea5e9; stroke-width: 0.5; }
    .tile-rect-empty { fill: #f5f5f5; stroke: #d4d4d4; stroke-width: 0.5; }
    .tile-label { font-family: sans-serif; font-size: ${labelFontSize}px; text-anchor: middle; fill: #1e40af; }
    .design-border { fill: none; stroke: #64748b; stroke-width: 1; stroke-dasharray: 2,2; }
    .legend-text { font-family: sans-serif; font-size: 8px; fill: #475569; }
    .title-text { font-family: sans-serif; font-size: 12px; font-weight: bold; fill: #1e293b; }
  </style>
  
  <!-- Background -->
  <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="white"/>
  
  <!-- Title -->
  <text x="${svgWidth / 2}" y="12" class="title-text" text-anchor="middle">Assembly Map - ${svgInfo.fileName}</text>
  
  <!-- Design area -->
  <g transform="translate(${mapPadding}, ${mapPadding + 5})">
    <!-- Overall design bounds -->
    <rect x="0" y="0" width="${scaledWidth}" height="${scaledHeight}" class="design-border"/>
    
    <!-- Tile grid -->
`;

  const stepX = effectiveTileWidth - overlap;
  const stepY = effectiveTileHeight - overlap;

  for (const tile of tiles) {
    const tileX = tile.col * stepX * scale;
    const tileY = tile.row * stepY * scale;
    const tileW = Math.min(effectiveTileWidth, totalDesignWidth - tile.col * stepX) * scale;
    const tileH = Math.min(effectiveTileHeight, totalDesignHeight - tile.row * stepY) * scale;
    
    const rectClass = tile.isEmpty ? 'tile-rect-empty' : 'tile-rect';
    
    svg += `    <rect x="${tileX}" y="${tileY}" width="${tileW}" height="${tileH}" class="${rectClass}"/>
`;
    
    if (settings.assemblyMap.includeLabels) {
      const labelX = tileX + tileW / 2;
      const labelY = tileY + tileH / 2 + labelFontSize / 3;
      svg += `    <text x="${labelX}" y="${labelY}" class="tile-label">${tile.label}</text>
`;
    }
  }

  svg += `  </g>
  
  <!-- Legend -->
  <g transform="translate(${mapPadding}, ${scaledHeight + mapPadding * 2 + 10})">
    <text x="0" y="0" class="legend-text">Design Size: ${totalDesignWidth.toFixed(1)} × ${totalDesignHeight.toFixed(1)} mm</text>
    <text x="0" y="12" class="legend-text">Bed Size: ${bedWidth} × ${bedHeight} mm</text>
    <text x="0" y="24" class="legend-text">Margin: ${margin} mm | Overlap: ${overlap} mm</text>
    <text x="0" y="36" class="legend-text">Grid: ${cols} × ${rows} (${tiles.length} tiles, ${tiles.filter(t => !t.isEmpty).length} with content)</text>
    <text x="0" y="48" class="legend-text">Numbering: ${settings.numberingFormat}</text>
    <text x="0" y="60" class="legend-text">Generated: ${new Date().toISOString().split('T')[0]}</text>
  </g>
  
  <!-- Assembly direction arrows -->
  <g transform="translate(${svgWidth - 60}, ${scaledHeight + mapPadding * 2 + 10})">
    <text x="0" y="0" class="legend-text" font-weight="bold">Assembly Order:</text>
    <text x="0" y="12" class="legend-text">→ Left to Right</text>
    <text x="0" y="24" class="legend-text">↓ Top to Bottom</text>
    <text x="0" y="36" class="legend-text">Start: ${tiles[0]?.label || 'R01C01'}</text>
  </g>
</svg>`;

  return svg;
}

export function generateAssemblyMapPDF(
  _svgInfo: SVGInfo,
  _settings: Settings,
  _gridInfo: GridInfo,
  _tiles: TileInfo[]
): Blob | null {
  return null;
}
