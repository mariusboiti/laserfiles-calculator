/**
 * Main Jigsaw Generator - PathOps-Only Engine
 * Orchestrates piece generation, layout, and SVG export
 */

import { generateSharedEdges } from './sharedEdgeGenerator';
import { buildPieceFromSharedEdges, type PieceFromEdgesConfig } from './pieceFromSharedEdges';
import { assembledLayout } from './layout/assembled';
import { packedGridLayout } from './layout/packGrid';
import type { JigsawSettings, JigsawOutput, PieceInfo } from '../types/jigsawV2';

/**
 * Generate complete jigsaw puzzle using PathOps-only approach
 */
export async function generateJigsawPathOps(settings: JigsawSettings): Promise<JigsawOutput> {
  const startTime = Date.now();
  const warnings: string[] = [];
  
  // Calculate cell dimensions
  const cellWidth = settings.widthMm / settings.columns;
  const cellHeight = settings.heightMm / settings.rows;
  
  // Validate piece size
  const minPieceSize = Math.min(cellWidth, cellHeight);
  if (minPieceSize < 15) {
    warnings.push(`Pieces are very small (${minPieceSize.toFixed(1)}mm). Knobs may be fragile.`);
  }
  
  // STEP 1: Generate shared edge map (each edge generated once)
  const difficulty = settings.difficulty ?? 0;
  const knobParams = {
    knobStyle: settings.knobStyle,
    knobSizePct: settings.knobSizePct,
    knobRoundness: settings.knobRoundness,
    knobJitter: settings.knobJitter,
  };
  
  const edgeMap = generateSharedEdges(
    settings.rows,
    settings.columns,
    cellWidth,
    cellHeight,
    settings.randomSeed,
    difficulty,
    knobParams
  );
  
  // STEP 2: Build pieces from shared edges
  const pieceInfos: PieceInfo[] = [];
  
  for (let row = 0; row < settings.rows; row++) {
    for (let col = 0; col < settings.columns; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      
      const pieceConfig: PieceFromEdgesConfig = {
        row,
        col,
        cellWidth,
        cellHeight,
        edgeMap,
      };
      
      const pathString = buildPieceFromSharedEdges(pieceConfig);
      
      // Generate piece ID (A1, A2, B1, B2...)
      const rowLetter = String.fromCharCode(65 + row);
      const colNumber = col + 1;
      const id = `${rowLetter}${colNumber}`;
      
      // Calculate bbox (approximate)
      const bboxPadding = cellWidth * 0.15;
      
      pieceInfos.push({
        row,
        col,
        id,
        path: pathString,
        originalPath: pathString,
        bbox: {
          x: x - bboxPadding,
          y: y - bboxPadding,
          width: cellWidth + 2 * bboxPadding,
          height: cellHeight + 2 * bboxPadding,
        },
        position: { x, y },
      });
    }
  }
  
  // STEP 4: Apply layout
  let layoutPieces: PieceInfo[];
  let layoutFits = true;
  
  if (settings.layoutMode === 'assembled') {
    layoutPieces = assembledLayout(pieceInfos, settings);
  } else {
    const packResult = packedGridLayout(pieceInfos, settings);
    layoutPieces = packResult.pieces;
    layoutFits = packResult.fits;
    
    if (!layoutFits) {
      warnings.push('Pieces do not fit in selected sheet. Increase sheet size or reduce puzzle size.');
    }
  }
  
  // STEP 5: Generate SVG layers
  const cutLayerSvg = generateCutLayer(layoutPieces);
  const engraveLayerSvg = settings.pieceNumbering
    ? generateEngraveLayer(layoutPieces, settings)
    : undefined;
  
  // STEP 6: Generate full SVG document
  const svg = generateFullSvg(
    cutLayerSvg,
    engraveLayerSvg,
    settings,
    layoutFits
  );
  
  // Diagnostics
  const seamCount = {
    vertical: settings.rows * (settings.columns - 1),
    horizontal: (settings.rows - 1) * settings.columns,
    total: settings.rows * (settings.columns - 1) + (settings.rows - 1) * settings.columns,
  };
  
  const diagnostics = {
    pieceCount: layoutPieces.length,
    pathCount: layoutPieces.length,
    offsetDelta: (settings.kerfMm / 2) - settings.clearanceMm,
    edgeCount: seamCount,
    layoutFits,
    generationTimeMs: Date.now() - startTime,
  };
  
  return {
    svg,
    cutLayerSvg,
    engraveLayerSvg,
    pieces: layoutPieces,
    warnings,
    diagnostics,
  };
}

/**
 * Generate cut layer SVG
 */
function generateCutLayer(pieces: PieceInfo[]): string {
  const paths = pieces.map(piece =>
    `    <path d="${piece.path}" data-piece="${piece.id}" data-row="${piece.row}" data-col="${piece.col}" />`
  ).join('\n');
  
  return `  <g id="CUT_PIECES" fill="none" stroke="red" stroke-width="0.001">\n${paths}\n  </g>`;
}

/**
 * Generate engrave layer SVG (piece numbering)
 */
function generateEngraveLayer(pieces: PieceInfo[], settings: JigsawSettings): string {
  const texts = pieces.map(piece => {
    const x = piece.position.x + piece.bbox.width / 2;
    const y = piece.position.y + piece.bbox.height / 2;
    
    return `    <text x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="8" data-piece="${piece.id}">${piece.id}</text>`;
  }).join('\n');
  
  return `  <g id="ENGRAVE_BACK" fill="black">\n${texts}\n  </g>`;
}

/**
 * Generate complete SVG document
 */
function generateFullSvg(
  cutLayerSvg: string,
  engraveLayerSvg: string | undefined,
  settings: JigsawSettings,
  layoutFits: boolean
): string {
  let svgWidth: number;
  let svgHeight: number;
  
  if (settings.layoutMode === 'assembled') {
    svgWidth = settings.widthMm;
    svgHeight = settings.heightMm;
  } else {
    const sheet = getSheetDimensions(settings);
    svgWidth = sheet.widthMm;
    svgHeight = sheet.heightMm;
  }
  
  const layers: string[] = [cutLayerSvg];
  if (engraveLayerSvg) {
    layers.push(engraveLayerSvg);
  }
  
  const offsetDelta = (settings.kerfMm / 2) - settings.clearanceMm;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" 
     width="${svgWidth}mm" height="${svgHeight}mm" 
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <!-- Jigsaw Puzzle - PathOps Boolean Engine -->
  <!-- Dimensions: ${settings.widthMm}mm × ${settings.heightMm}mm -->
  <!-- Grid: ${settings.rows}×${settings.columns} = ${settings.rows * settings.columns} pieces -->
  <!-- Seed: ${settings.randomSeed} -->
  <!-- Kerf: ${settings.kerfMm}mm, Clearance: ${settings.clearanceMm}mm, Offset: ${offsetDelta.toFixed(3)}mm -->
  <!-- Layout: ${settings.layoutMode} ${layoutFits ? '✓' : '⚠ DOES NOT FIT'} -->
  <!-- Engine: PathOps WASM (primitives + booleans only) -->
  
${layers.join('\n')}
</svg>`;
}

/**
 * Get sheet dimensions from settings
 */
function getSheetDimensions(settings: JigsawSettings): { widthMm: number; heightMm: number } {
  if (settings.sheetPreset === 'custom') {
    return {
      widthMm: settings.customSheetWidth || 500,
      heightMm: settings.customSheetHeight || 500,
    };
  }
  
  const presets: Record<string, { widthMm: number; heightMm: number }> = {
    'glowforge-basic': { widthMm: 495, heightMm: 279 },
    'glowforge-pro': { widthMm: 838, heightMm: 495 },
    'xtool-d1': { widthMm: 400, heightMm: 400 },
    '300x400': { widthMm: 300, heightMm: 400 },
    '600x400': { widthMm: 600, heightMm: 400 },
  };
  
  return presets[settings.sheetPreset] || { widthMm: 500, heightMm: 500 };
}
