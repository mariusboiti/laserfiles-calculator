/**
 * Main Jigsaw SVG Generator - Orchestrator
 * 
 * Coordinates all components to generate final puzzle SVG
 */

import type { JigsawSettings, JigsawOutput, PieceInfo, Diagnostics } from '../types/jigsawV2';
import { generateEdgeMap } from './edgeMap';
import { buildAllPieces } from './pieceBuilder';
import { getPathOps } from './pathops/pathopsClient';
import { validateSettings } from './utils/validate';
import { assembledLayout } from './layout/assembled';
import { packedGridLayout } from './layout/packGrid';

/**
 * Generate complete jigsaw puzzle SVG
 */
export async function generateJigsawSvg(settings: JigsawSettings): Promise<JigsawOutput> {
  const startTime = Date.now();
  
  // Validate settings
  const validation = validateSettings(settings);
  if (!validation.valid) {
    throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
  }
  
  const warnings: string[] = [...validation.warnings];
  
  // Calculate dimensions
  const cellWidth = settings.widthMm / settings.columns;
  const cellHeight = settings.heightMm / settings.rows;
  
  // Generate edge map (shared edges, no duplicates)
  const edgeMap = generateEdgeMap({
    rows: settings.rows,
    columns: settings.columns,
    cellWidth,
    cellHeight,
    seed: settings.randomSeed,
  });
  
  // Build all pieces (closed paths in assembled position)
  const pieces = buildAllPieces(
    edgeMap,
    settings.rows,
    settings.columns,
    cellWidth,
    cellHeight,
    0,
    0
  );
  
  // Apply kerf + clearance offset using PathOps
  const pathOps = await getPathOps();
  const offsetDelta = (settings.kerfMm / 2) - settings.clearanceMm;
  
  const offsetPieces: PieceInfo[] = [];
  for (const piece of pieces) {
    try {
      // Parse original path
      const originalPath = pathOps.fromSVGString(piece.path);
      
      // Simplify first
      const simplified = pathOps.simplify(originalPath);
      
      // Apply offset if needed
      let offsetPath = simplified;
      if (Math.abs(offsetDelta) > 0.001) {
        offsetPath = pathOps.offset(simplified, offsetDelta);
      }
      
      // Convert back to SVG string
      const offsetPathString = pathOps.toSVGString(offsetPath);
      
      // Generate piece ID (A1, A2, B1, B2...)
      const rowLetter = String.fromCharCode(65 + piece.row); // A, B, C...
      const colNumber = piece.col + 1;
      const id = `${rowLetter}${colNumber}`;
      
      offsetPieces.push({
        row: piece.row,
        col: piece.col,
        id,
        path: offsetPathString,
        originalPath: piece.path,
        bbox: piece.bbox,
        position: { x: piece.bbox.x, y: piece.bbox.y },
      });
      
      // Clean up PathKit objects
      pathOps.delete(originalPath);
      pathOps.delete(simplified);
      if (offsetPath !== simplified) {
        pathOps.delete(offsetPath);
      }
    } catch (error) {
      console.error(`Failed to offset piece ${piece.row}-${piece.col}:`, error);
      warnings.push(`Piece ${piece.row}-${piece.col}: offset failed, using original`);
      
      const rowLetter = String.fromCharCode(65 + piece.row);
      const colNumber = piece.col + 1;
      offsetPieces.push({
        row: piece.row,
        col: piece.col,
        id: `${rowLetter}${colNumber}`,
        path: piece.path,
        originalPath: piece.path,
        bbox: piece.bbox,
        position: { x: piece.bbox.x, y: piece.bbox.y },
      });
    }
  }
  
  // Apply layout
  let layoutPieces: PieceInfo[];
  let layoutFits = true;
  
  if (settings.layoutMode === 'assembled') {
    layoutPieces = assembledLayout(offsetPieces, settings);
  } else {
    const packResult = packedGridLayout(offsetPieces, settings);
    layoutPieces = packResult.pieces;
    layoutFits = packResult.fits;
    if (!layoutFits) {
      warnings.push('Pieces do not fit in selected sheet. Increase sheet size or reduce puzzle size.');
    }
  }
  
  // Generate SVG layers
  const cutLayerSvg = generateCutLayer(layoutPieces);
  const engraveLayerSvg = settings.pieceNumbering 
    ? generateEngraveLayer(layoutPieces, settings)
    : undefined;
  
  // Generate full SVG document
  const svg = generateFullSvg(
    cutLayerSvg,
    engraveLayerSvg,
    settings,
    layoutFits
  );
  
  // Diagnostics
  const diagnostics: Diagnostics = {
    pieceCount: layoutPieces.length,
    pathCount: layoutPieces.length,
    offsetDelta,
    edgeCount: {
      horizontal: (settings.rows - 1) * settings.columns,
      vertical: settings.rows * (settings.columns - 1),
      total: (settings.rows - 1) * settings.columns + settings.rows * (settings.columns - 1),
    },
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
    // Position text in center of piece bbox
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
  // Determine SVG dimensions
  let svgWidth: number;
  let svgHeight: number;
  
  if (settings.layoutMode === 'assembled') {
    svgWidth = settings.widthMm;
    svgHeight = settings.heightMm;
  } else {
    // Use sheet dimensions for packed layout
    const sheet = getSheetDimensions(settings);
    svgWidth = sheet.widthMm;
    svgHeight = sheet.heightMm;
  }
  
  const layers: string[] = [cutLayerSvg];
  if (engraveLayerSvg) {
    layers.push(engraveLayerSvg);
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" 
     width="${svgWidth}mm" height="${svgHeight}mm" 
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <!-- Jigsaw Puzzle V2 - PathOps WASM -->
  <!-- Dimensions: ${settings.widthMm}mm × ${settings.heightMm}mm -->
  <!-- Grid: ${settings.rows}×${settings.columns} = ${settings.rows * settings.columns} pieces -->
  <!-- Seed: ${settings.randomSeed} -->
  <!-- Kerf: ${settings.kerfMm}mm, Clearance: ${settings.clearanceMm}mm -->
  <!-- Layout: ${settings.layoutMode} ${layoutFits ? '✓' : '⚠ DOES NOT FIT'} -->
  
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
