import type { JigsawInputs, PuzzlePiece, PuzzleResult } from '../types/jigsaw';
import type { JigsawV3Settings } from '../types/jigsawV3';
import { LIMITS, STROKE_WIDTH_MM, KIDS_MODE_OVERRIDES } from '../config/defaults';
import { FIT_MODE_OFFSETS } from '../types/jigsaw';
import { generateBackingBoardSvg, generatePieceNumberingSvg } from './backingBoard';
import { packPieces } from './layoutPacker';
import { generateSharedEdgeMap, buildPiecePath, type SharedEdgeMap } from './sharedEdgeMap';
import { generatePocketFrame, generatePocketFrameSvg } from './pocketFrameV3';
import { generateJigsawPathOps, generateJigsawFilename, type JigsawPathOpsParams } from './pathopsPuzzleGenerator';
import { generatePuzzleV3 } from './puzzleGeneratorV3';

/**
 * Generate a complete jigsaw puzzle (V1/V2/V3/PathOps)
 */
export async function generatePuzzle(inputs: JigsawInputs | JigsawV3Settings): Promise<PuzzleResult> {
  console.log('=== generatePuzzle START ===');
  console.log('Inputs:', {
    mode: inputs.mode,
    widthMm: inputs.widthMm,
    heightMm: inputs.heightMm,
    rows: inputs.rows,
    columns: inputs.columns,
    layoutMode: inputs.layoutMode,
    usePathOps: inputs.usePathOps,
    hasImage: !!inputs.imageDataUrl
  });
  
  // Photo mode must use legacy generator (supports images)
  if (inputs.mode === 'photo') {
    console.log('Using legacy generator for photo mode (supports images)');
    return legacyGeneratePuzzle(inputs);
  }
  
  // Route to PathOps generator if enabled
  if (inputs.usePathOps) {
    console.log('Using PathOps-based generator');
    return await generatePuzzleWithPathOps(inputs);
  }
  
  // Route to V3 Classic Knobs generator (default)
  console.log('Using V3 Classic Knobs generator');
  return await generatePuzzleV3(inputs as JigsawInputs);
}

// Legacy helper functions below (kept for backward compatibility)

function legacyGeneratePuzzle(inputs: JigsawInputs | JigsawV3Settings): PuzzleResult {
  const warnings: string[] = [];
  const kidsMode = inputs.mode === 'kids';
  
  // Check if V3 features are enabled
  const v3Settings = 'v3Features' in inputs ? inputs as JigsawV3Settings : null;
  const v3Enabled = v3Settings?.v3Features?.v3Enabled || false;
  
  console.log('V3 enabled:', v3Enabled);
  
  // Apply kids mode constraints
  let { rows, columns } = inputs;
  if (kidsMode) {
    if (rows > KIDS_MODE_OVERRIDES.maxRows) {
      rows = KIDS_MODE_OVERRIDES.maxRows;
      warnings.push(`Kids mode: reduced rows to ${rows}`);
    }
    if (columns > KIDS_MODE_OVERRIDES.maxColumns) {
      columns = KIDS_MODE_OVERRIDES.maxColumns;
      warnings.push(`Kids mode: reduced columns to ${columns}`);
    }
  }
  
  // Calculate piece dimensions
  const pieceWidth = inputs.widthMm / columns;
  const pieceHeight = inputs.heightMm / rows;
  
  // Check minimum piece size
  if (pieceWidth < LIMITS.minPieceSizeMm || pieceHeight < LIMITS.minPieceSizeMm) {
    warnings.push(`Piece size (${pieceWidth.toFixed(1)}×${pieceHeight.toFixed(1)}mm) is below minimum ${LIMITS.minPieceSizeMm}mm`);
  }
  
  // Generate SHARED edge map - each edge is created ONCE and reused by adjacent pieces
  console.log('Generating SHARED edge map for', rows, 'x', columns);
  const edgeMap = generateSharedEdgeMap(
    rows,
    columns,
    pieceWidth,
    pieceHeight,
    inputs.knobStyle,
    inputs.randomSeed,
    kidsMode
  );
  console.log('Shared edge map generated');
  
  // Generate all pieces from the shared edge map
  console.log('Building pieces from shared edges...');
  const pieces = buildAllPiecesFromEdgeMap(rows, columns, pieceWidth, pieceHeight, edgeMap);
  console.log('Pieces built:', pieces.length);
  
  // Apply fit mode offset
  const fitOffset = FIT_MODE_OFFSETS[inputs.fitMode];
  const totalKerfOffset = inputs.kerfOffset + fitOffset;
  
  // Check if packed layout fits in sheet
  let layoutWarning: string | undefined;
  if (inputs.layoutMode === 'packed') {
    const { fitsInSheet } = packPieces(
      pieces,
      pieceWidth,
      pieceHeight,
      inputs.materialSheet.widthMm,
      inputs.materialSheet.heightMm,
      inputs.materialSheet.marginMm,
      inputs.materialSheet.gapMm
    );
    if (!fitsInSheet) {
      layoutWarning = 'Pieces do not fit in material sheet. Reduce puzzle size or increase sheet size.';
      warnings.push(layoutWarning);
    }
  }
  
  // Generate SVG layers
  console.log('Generating cut layer SVG...');
  const cutLayerSvg = generateCutLayerSvg(pieces, inputs.widthMm, inputs.heightMm, totalKerfOffset, inputs.layoutMode);
  console.log('Cut layer SVG length:', cutLayerSvg.length);
  
  let engraveFrontSvg: string | undefined;
  if (inputs.mode === 'photo' && inputs.imageDataUrl) {
    console.log('Generating engrave front SVG...');
    engraveFrontSvg = generateEngraveLayerSvg(inputs.widthMm, inputs.heightMm, inputs.imageDataUrl, pieces);
  }
  
  let engraveBackSvg: string | undefined;
  if (inputs.pieceNumbering) {
    console.log('Generating piece numbering SVG...');
    engraveBackSvg = generatePieceNumberingSvg(rows, columns, pieceWidth, pieceHeight);
  }
  
  let backingBoardSvg: string | undefined;
  if (inputs.backingBoard.enabled) {
    console.log('Generating backing board SVG...');
    backingBoardSvg = generateBackingBoardSvg(inputs.widthMm, inputs.heightMm, inputs.backingBoard);
  }
  
  // V3: Pocket Frame
  let pocketFrameSvg: string | undefined;
  if (v3Enabled && v3Settings?.pocketFrame?.enabled) {
    console.log('Generating V3 pocket frame...');
    const frameGeometry = generatePocketFrame(
      inputs.widthMm,
      inputs.heightMm,
      inputs.cornerRadius,
      v3Settings.pocketFrame
    );
    pocketFrameSvg = generatePocketFrameSvg(frameGeometry, v3Settings.pocketFrame);
  }
  
  console.log('Generating full SVG...');
  const fullSvg = generateFullSvg(
    cutLayerSvg,
    engraveFrontSvg,
    engraveBackSvg,
    backingBoardSvg,
    inputs.widthMm,
    inputs.heightMm,
    inputs.layoutMode === 'packed' ? inputs.materialSheet : undefined,
    pocketFrameSvg
  );
  console.log('Full SVG generated, length:', fullSvg.length);
  
  console.log('Generated puzzle:', { 
    pieceCount: pieces.length, 
    svgLength: fullSvg.length,
    hasPieces: pieces.length > 0,
    firstPiecePath: pieces[0]?.path?.substring(0, 50)
  });
  console.log('SVG preview:', fullSvg.substring(0, 500));
  
  if (!fullSvg || fullSvg.length === 0) {
    console.error('ERROR: fullSvg is empty!');
  }
  
  if (pieces.length === 0) {
    console.error('ERROR: No pieces generated!');
  }
  
  return {
    pieces,
    cutLayerSvg,
    engraveLayerSvg: engraveFrontSvg,
    fullSvg,
    warnings,
  };
}

/**
 * Build all puzzle pieces from the shared edge map
 * Each piece reuses edges from the shared map - no duplicate geometry
 */
function buildAllPiecesFromEdgeMap(
  rows: number,
  columns: number,
  pieceWidth: number,
  pieceHeight: number,
  edgeMap: SharedEdgeMap
): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const path = buildPiecePath(row, col, pieceWidth, pieceHeight, edgeMap);
      pieces.push({ row, col, path });
    }
  }
  
  return pieces;
}

/**
 * Generate SVG for the cut layer
 */
function generateCutLayerSvg(
  pieces: PuzzlePiece[],
  width: number,
  height: number,
  kerfOffset: number,
  layoutMode: string
): string {
  const strokeWidth = STROKE_WIDTH_MM;
  
  let paths = '';
  for (const piece of pieces) {
    paths += `  <path d="${piece.path}" />\n`;
  }
  
  return `<g id="CUT_PIECES" fill="none" stroke="#FF0000" stroke-width="${strokeWidth}">\n${paths}</g>`;
}

/**
 * Generate SVG for the engrave layer (photo mode)
 */
function generateEngraveLayerSvg(
  width: number,
  height: number,
  imageDataUrl: string,
  pieces: PuzzlePiece[]
): string {
  // Create clip path from puzzle outline (outer border)
  const clipId = 'puzzle-clip';
  
  // For photo mode, we clip the image to the puzzle bounds
  // The individual pieces define the cut lines, the image is engraved within
  return `<g id="ENGRAVE_FRONT">
  <defs>
    <clipPath id="${clipId}">
      <rect x="0" y="0" width="${width}" height="${height}" />
    </clipPath>
  </defs>
  <image 
    href="${imageDataUrl}" 
    x="0" y="0" 
    width="${width}" height="${height}" 
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#${clipId})"
  />
</g>`;
}

/**
 * Generate the complete SVG with all layers
 */
function generateFullSvg(
  cutLayerSvg: string,
  engraveFrontSvg: string | undefined,
  engraveBackSvg: string | undefined,
  backingBoardSvg: string | undefined,
  width: number,
  height: number,
  materialSheet?: { widthMm: number; heightMm: number; marginMm: number },
  pocketFrameSvg?: string
): string {
  let totalWidth: number;
  let totalHeight: number;
  let viewBoxX: number;
  let viewBoxY: number;
  
  if (materialSheet) {
    // Use material sheet dimensions for packed layout
    totalWidth = materialSheet.widthMm;
    totalHeight = materialSheet.heightMm;
    viewBoxX = 0;
    viewBoxY = 0;
  } else {
    // Use puzzle dimensions with padding for assembled layout
    const padding = 5;
    totalWidth = width + padding * 2;
    totalHeight = height + padding * 2;
    viewBoxX = -padding;
    viewBoxY = -padding;
  }
  
  let content = '';
  
  // Add layers in order: engrave front, engrave back, backing board, pocket frame, cut pieces
  if (engraveFrontSvg) {
    content += `  ${engraveFrontSvg}\n`;
  }
  if (engraveBackSvg) {
    content += `  ${engraveBackSvg}\n`;
  }
  if (backingBoardSvg) {
    content += `  ${backingBoardSvg}\n`;
  }
  if (pocketFrameSvg) {
    content += `  ${pocketFrameSvg}\n`;
  }
  content += `  ${cutLayerSvg}`;
  
  const version = 'V2';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg 
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  version="1.1"
  width="${totalWidth}mm"
  height="${totalHeight}mm"
  viewBox="${viewBoxX} ${viewBoxY} ${totalWidth} ${totalHeight}"
>
  <!-- Jigsaw Puzzle ${version} - Generated by LaserFilesPro Studio -->
  <!-- Dimensions: ${width}mm × ${height}mm -->
  <!-- Layers: CUT_PIECES, CUT_BACKING (optional), ENGRAVE_FRONT (optional), ENGRAVE_BACK (optional) -->
<g transform="translate(0, 0)">
${content}
</g>
</svg>`;
}

/**
 * Generate warnings for the puzzle configuration
 */
export function generatePuzzleWarnings(inputs: JigsawInputs): string[] {
  const warnings: string[] = [];
  const kidsMode = inputs.mode === 'kids';
  
  const pieceWidth = inputs.widthMm / inputs.columns;
  const pieceHeight = inputs.heightMm / inputs.rows;
  
  if (pieceWidth < LIMITS.minPieceSizeMm) {
    warnings.push(`Piece width (${pieceWidth.toFixed(1)}mm) is too small. Minimum: ${LIMITS.minPieceSizeMm}mm`);
  }
  
  if (pieceHeight < LIMITS.minPieceSizeMm) {
    warnings.push(`Piece height (${pieceHeight.toFixed(1)}mm) is too small. Minimum: ${LIMITS.minPieceSizeMm}mm`);
  }
  
  if (kidsMode) {
    if (inputs.rows > KIDS_MODE_OVERRIDES.maxRows) {
      warnings.push(`Kids mode supports max ${KIDS_MODE_OVERRIDES.maxRows} rows`);
    }
    if (inputs.columns > KIDS_MODE_OVERRIDES.maxColumns) {
      warnings.push(`Kids mode supports max ${KIDS_MODE_OVERRIDES.maxColumns} columns`);
    }
    if (pieceWidth < KIDS_MODE_OVERRIDES.minPieceSizeMm || pieceHeight < KIDS_MODE_OVERRIDES.minPieceSizeMm) {
      warnings.push(`Kids mode requires pieces at least ${KIDS_MODE_OVERRIDES.minPieceSizeMm}mm`);
    }
  }
  
  if (inputs.mode === 'photo' && !inputs.imageDataUrl) {
    warnings.push('Photo mode requires an uploaded image');
  }
  
  if (inputs.kerfOffset > 0.3) {
    warnings.push('High kerf offset may cause loose-fitting pieces');
  }
  
  return warnings;
}

/**
 * Generate puzzle using PathOps WASM engine
 */
async function generatePuzzleWithPathOps(inputs: JigsawInputs | JigsawV3Settings): Promise<PuzzleResult> {
  const params: JigsawPathOpsParams = {
    widthMm: inputs.widthMm,
    heightMm: inputs.heightMm,
    rows: inputs.rows,
    columns: inputs.columns,
    marginMm: inputs.marginMm || 5,
    knobSizePct: inputs.knobSizePct || 65,
    roundness: inputs.knobRoundness || 0.85,
    jitter: inputs.knobJitter || 0.15,
    seed: inputs.randomSeed,
    kerfMm: inputs.kerfOffset,
    clearanceMm: inputs.clearanceMm || 0,
    exportMode: inputs.exportMode || 'cut-lines',
    compensateKerf: inputs.compensateKerf || false,
  };
  
  const result = await generateJigsawPathOps(params);
  
  // Convert PathOps result to PuzzleResult format
  return {
    pieces: [], // PathOps uses cut lines, not individual pieces
    cutLayerSvg: result.cutLinesSvg,
    engraveLayerSvg: undefined,
    fullSvg: result.cutLinesSvg,
    warnings: result.warnings,
  };
}

/**
 * Generate filename for export
 */
export function generateFilename(inputs: JigsawInputs): string {
  const date = new Date().toISOString().slice(0, 10);
  return `jigsaw-${inputs.rows}x${inputs.columns}-${inputs.mode}-${date}.svg`;
}
