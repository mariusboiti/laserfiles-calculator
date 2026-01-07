/**
 * Main Jigsaw Generator - PathOps-Only Engine
 * Orchestrates piece generation, layout, and SVG export
 */

import { generateSharedEdges } from './sharedEdgeGenerator';
import { buildPieceFromSharedEdges, type PieceFromEdgesConfig } from './pieceFromSharedEdges';
import { assembledLayout } from './layout/assembled';
import { packedGridLayout } from './layout/packGrid';
import type { JigsawSettings, JigsawOutput, PieceInfo } from '../types/jigsawV2';
import { generateTemplateOutline, isCenterCutoutExcluded } from './templates';
import { getPathOps } from './pathops/pathopsClient';

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
  const template = settings.template || 'rectangle';
  const centerCutout = settings.centerCutout ?? false;
  const centerCutoutRatio = settings.centerCutoutRatio ?? 0.3;
  
  // For non-rectangle templates, use PathOps to clip pieces to template shape
  const needsClipping = template !== 'rectangle';
  let pathOps: Awaited<ReturnType<typeof getPathOps>> | null = null;
  let templatePathObj: any = null;
  let templateOutlinePath = '';
  
  if (needsClipping) {
    pathOps = await getPathOps();
    templateOutlinePath = generateTemplateOutline(
      template,
      settings.widthMm,
      settings.heightMm,
      settings.cornerRadiusMm
    );
    templatePathObj = pathOps.fromSVGString(templateOutlinePath);
  }
  
  for (let row = 0; row < settings.rows; row++) {
    for (let col = 0; col < settings.columns; col++) {
      // Check if piece should be excluded due to center cutout
      if (centerCutout) {
        const excluded = isCenterCutoutExcluded(
          row, col, settings.rows, settings.columns, centerCutoutRatio
        );
        if (excluded) {
          continue;
        }
      }
      
      const x = col * cellWidth;
      const y = row * cellHeight;
      
      const pieceConfig: PieceFromEdgesConfig = {
        row,
        col,
        cellWidth,
        cellHeight,
        edgeMap,
      };
      
      let pathString = buildPieceFromSharedEdges(pieceConfig);
      
      // Clip piece to template outline using PathOps
      if (needsClipping && pathOps && templatePathObj) {
        try {
          const piecePath = pathOps.fromSVGString(pathString);
          const clippedPath = pathOps.intersect(piecePath, templatePathObj);
          
          if (clippedPath) {
            const clippedSvg = pathOps.toSVGString(clippedPath);
            // Check if intersection produced a valid path
            if (clippedSvg && clippedSvg.length > 5 && !clippedSvg.includes('NaN')) {
              pathString = clippedSvg;
              pathOps.delete(clippedPath);
            } else {
              // No valid intersection - skip this piece
              pathOps.delete(piecePath);
              if (clippedPath) pathOps.delete(clippedPath);
              continue;
            }
          }
          pathOps.delete(piecePath);
        } catch (e) {
          // If clipping fails, use center-based filtering as fallback
          if (centerCutout) {
            const excluded = isCenterCutoutExcluded(
              row, col, settings.rows, settings.columns, centerCutoutRatio
            );
            if (excluded) {
              continue;
            }
          }
        }
      }
      
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
  
  // Clean up template path
  if (pathOps && templatePathObj) {
    pathOps.delete(templatePathObj);
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
  const cutLayerSvg = generateCutLayer(layoutPieces, settings);
  const engraveLayerSvg = settings.pieceNumbering
    ? generateEngraveLayer(layoutPieces, settings)
    : undefined;
  
  // STEP 5.5: Generate image layer if photo mode with image
  const imageLayerSvg = settings.imageDataUrl
    ? generateImageLayer(settings)
    : undefined;
  
  // STEP 5.6: Generate backing board if enabled
  const backingBoardSvg = settings.includeBacking
    ? generateBackingBoard(settings)
    : undefined;
  
  // STEP 6: Generate full SVG document
  const svg = generateFullSvg(
    cutLayerSvg,
    engraveLayerSvg,
    imageLayerSvg,
    backingBoardSvg,
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
    backingBoardSvg,
    pieces: layoutPieces,
    warnings,
    diagnostics,
  };
}

/**
 * Generate cut layer SVG
 */
function generateCutLayer(pieces: PieceInfo[], settings: JigsawSettings): string {
  const paths = pieces.map(piece =>
    `    <path d="${piece.path}" data-piece="${piece.id}" data-row="${piece.row}" data-col="${piece.col}" />`
  ).join('\n');
  
  // Add template outline for non-rectangle templates
  const template = settings.template || 'rectangle';
  let outlinePath = '';
  
  if (template !== 'rectangle') {
    const templateOutline = generateTemplateOutline(
      template,
      settings.widthMm,
      settings.heightMm,
      settings.cornerRadiusMm
    );
    outlinePath = `\n    <path d="${templateOutline}" data-part="outline" />`;
  }
  
  // Add center cutout guide (blue stroke) if center cutout is enabled
  // The guide follows the contour of the missing pieces (inner edges of remaining pieces)
  let centerCutoutGuide = '';
  if (settings.centerCutout) {
    const cutoutGuidePath = generateCenterCutoutFromPieces(pieces, settings);
    if (cutoutGuidePath) {
      centerCutoutGuide = `\n  <g id="GUIDE_CENTER_CUTOUT" fill="none" stroke="blue" stroke-width="0.5" stroke-dasharray="2,2">\n    <path d="${cutoutGuidePath}" data-part="center-cutout-guide" />\n  </g>`;
    }
  }
  
  // Add center cutout text if enabled
  let centerCutoutText = '';
  if (settings.centerCutout && settings.centerCutoutText) {
    const cx = settings.widthMm / 2;
    const cy = settings.heightMm / 2;
    const fontSize = Math.min(settings.widthMm, settings.heightMm) * (settings.centerCutoutRatio ?? 0.3) * 0.15;
    centerCutoutText = `\n  <g id="ENGRAVE_CENTER_TEXT" fill="black" stroke="none">\n    <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${fontSize.toFixed(1)}" font-weight="bold">${escapeXml(settings.centerCutoutText)}</text>\n  </g>`;
  }
  
  return `  <g id="CUT_PIECES" fill="none" stroke="red" stroke-width="0.001">\n${paths}${outlinePath}\n  </g>${centerCutoutGuide}${centerCutoutText}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate center cutout guide path from the contours of missing pieces
 * This creates a path that follows the inner edges of the remaining pieces
 */
function generateCenterCutoutFromPieces(pieces: PieceInfo[], settings: JigsawSettings): string {
  const cellWidth = settings.widthMm / settings.columns;
  const cellHeight = settings.heightMm / settings.rows;
  const centerCutoutRatio = settings.centerCutoutRatio ?? 0.3;
  
  // Find which cells are excluded (missing pieces)
  const excludedCells: { row: number; col: number }[] = [];
  for (let row = 0; row < settings.rows; row++) {
    for (let col = 0; col < settings.columns; col++) {
      if (isCenterCutoutExcluded(row, col, settings.rows, settings.columns, centerCutoutRatio)) {
        excludedCells.push({ row, col });
      }
    }
  }
  
  if (excludedCells.length === 0) return '';
  
  // Find the bounding rectangle of excluded cells
  const minRow = Math.min(...excludedCells.map(c => c.row));
  const maxRow = Math.max(...excludedCells.map(c => c.row));
  const minCol = Math.min(...excludedCells.map(c => c.col));
  const maxCol = Math.max(...excludedCells.map(c => c.col));
  
  // Generate a simple rectangular path around the excluded area
  // This follows the grid lines where pieces were removed
  const x1 = minCol * cellWidth;
  const y1 = minRow * cellHeight;
  const x2 = (maxCol + 1) * cellWidth;
  const y2 = (maxRow + 1) * cellHeight;
  
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y2.toFixed(3)} L ${x1.toFixed(3)} ${y2.toFixed(3)} Z`;
}

/**
 * Generate backing board SVG layer
 * Backing board follows the same shape as the puzzle template with margin
 */
function generateBackingBoard(settings: JigsawSettings): string {
  const margin = settings.backingMarginMm ?? 10;
  const template = settings.template || 'rectangle';
  
  // For templates, generate the same shape with added margin
  // We scale the template slightly larger to create the margin effect
  const scaleX = (settings.widthMm + margin * 2) / settings.widthMm;
  const scaleY = (settings.heightMm + margin * 2) / settings.heightMm;
  
  let boardPath: string;
  
  if (template === 'rectangle') {
    // Rectangle with optional corner radius
    const cornerR = Math.min(
      settings.backingCornerRadiusMm ?? settings.cornerRadiusMm,
      Math.min(settings.widthMm, settings.heightMm) / 2
    );
    const boardWidth = settings.widthMm + margin * 2;
    const boardHeight = settings.heightMm + margin * 2;
    const boardX = -margin;
    const boardY = -margin;
    
    boardPath = cornerR > 0
      ? `M ${boardX + cornerR} ${boardY} ` +
        `h ${boardWidth - 2 * cornerR} ` +
        `a ${cornerR} ${cornerR} 0 0 1 ${cornerR} ${cornerR} ` +
        `v ${boardHeight - 2 * cornerR} ` +
        `a ${cornerR} ${cornerR} 0 0 1 ${-cornerR} ${cornerR} ` +
        `h ${-(boardWidth - 2 * cornerR)} ` +
        `a ${cornerR} ${cornerR} 0 0 1 ${-cornerR} ${-cornerR} ` +
        `v ${-(boardHeight - 2 * cornerR)} ` +
        `a ${cornerR} ${cornerR} 0 0 1 ${cornerR} ${-cornerR} Z`
      : `M ${boardX} ${boardY} h ${boardWidth} v ${boardHeight} h ${-boardWidth} Z`;
  } else {
    // For non-rectangle templates (heart, circle, etc.), generate the template
    // at the original size and use SVG transform for scaling and positioning
    // This avoids issues with complex path translation
    const innerPath = generateTemplateOutline(
      template,
      settings.widthMm,
      settings.heightMm,
      settings.cornerRadiusMm
    );
    // Use SVG group transform to scale and translate the backing board
    // Scale from center and translate to position correctly
    const scale = (settings.widthMm + margin * 2) / settings.widthMm;
    const translateX = -margin;
    const translateY = -margin;
    // Return early with transformed group for non-rectangle templates
    const paths: string[] = [];
    paths.push(`    <g transform="translate(${translateX.toFixed(2)}, ${translateY.toFixed(2)}) scale(${scale.toFixed(4)})">`);
    paths.push(`      <path d="${innerPath}" data-part="backing-outline" />`);
    paths.push(`    </g>`);
    
    // Add hanging holes if enabled
    if (settings.hangingHoles) {
      const holeDia = settings.hangingHoleDiameter ?? 6;
      const holeR = holeDia / 2;
      const spacing = settings.hangingHoleSpacing ?? 80;
      const yOffset = settings.hangingHoleYOffset ?? 10;
      const centerX = settings.widthMm / 2;
      const holeY = -margin + yOffset + holeR;
      const hole1X = centerX - spacing / 2;
      const hole2X = centerX + spacing / 2;
      paths.push(`    <circle cx="${hole1X.toFixed(2)}" cy="${holeY.toFixed(2)}" r="${holeR}" data-part="hanging-hole" />`);
      paths.push(`    <circle cx="${hole2X.toFixed(2)}" cy="${holeY.toFixed(2)}" r="${holeR}" data-part="hanging-hole" />`);
    }
    
    // Add magnet holes if enabled
    if (settings.magnetHoles) {
      const holeDia = settings.magnetHoleDiameter ?? 8;
      const holeR = holeDia / 2;
      const inset = settings.magnetHoleInset ?? 15;
      const boardHeight = settings.heightMm + margin * 2;
      const boardWidth = settings.widthMm + margin * 2;
      const boardX = -margin;
      const boardY = -margin;
      const corners = [
        { x: boardX + inset + holeR, y: boardY + boardHeight - inset - holeR },
        { x: boardX + boardWidth - inset - holeR, y: boardY + boardHeight - inset - holeR },
      ];
      corners.forEach((c, i) => {
        paths.push(`    <circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${holeR}" data-part="magnet-hole-${i + 1}" />`);
      });
    }
    
    return `  <g id="CUT_BACKING" fill="none" stroke="blue" stroke-width="0.001">\n${paths.join('\n')}\n  </g>`;
  }
  
  const paths: string[] = [
    `    <path d="${boardPath}" data-part="backing-outline" />`
  ];
  
  // Hanging holes - position at top of shape
  if (settings.hangingHoles) {
    const holeDia = settings.hangingHoleDiameter ?? 6;
    const holeR = holeDia / 2;
    const spacing = settings.hangingHoleSpacing ?? 80;
    const yOffset = settings.hangingHoleYOffset ?? 10;
    
    const centerX = settings.widthMm / 2;
    const holeY = -margin + yOffset + holeR;
    
    // Two holes spaced equally from center
    const hole1X = centerX - spacing / 2;
    const hole2X = centerX + spacing / 2;
    
    paths.push(`    <circle cx="${hole1X.toFixed(2)}" cy="${holeY.toFixed(2)}" r="${holeR}" data-part="hanging-hole" />`);
    paths.push(`    <circle cx="${hole2X.toFixed(2)}" cy="${holeY.toFixed(2)}" r="${holeR}" data-part="hanging-hole" />`);
  }
  
  // Magnet holes (at bottom)
  if (settings.magnetHoles) {
    const holeDia = settings.magnetHoleDiameter ?? 8;
    const holeR = holeDia / 2;
    const inset = settings.magnetHoleInset ?? 15;
    
    const boardHeight = settings.heightMm + margin * 2;
    const boardWidth = settings.widthMm + margin * 2;
    const boardX = -margin;
    const boardY = -margin;
    
    const corners = [
      { x: boardX + inset + holeR, y: boardY + boardHeight - inset - holeR },
      { x: boardX + boardWidth - inset - holeR, y: boardY + boardHeight - inset - holeR },
    ];
    
    corners.forEach((c, i) => {
      paths.push(`    <circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${holeR}" data-part="magnet-hole-${i + 1}" />`);
    });
  }
  
  return `  <g id="CUT_BACKING" fill="none" stroke="blue" stroke-width="0.001">\n${paths.join('\n')}\n  </g>`;
}

/**
 * Translate SVG path by dx, dy
 * Simple implementation that handles M, L, C, A, Z commands
 */
function translatePath(path: string, dx: number, dy: number): string {
  // Parse and translate coordinates in the path
  return path.replace(/([MLCQASTVHZ])\s*([^MLCQASTVHZ]*)/gi, (match, cmd, coords) => {
    if (cmd.toUpperCase() === 'Z') return cmd;
    if (cmd.toUpperCase() === 'H') {
      // Horizontal line - only x coordinate
      const nums = coords.trim().split(/[\s,]+/).map(Number);
      return cmd + ' ' + nums.map((n: number) => (n + dx).toFixed(2)).join(' ');
    }
    if (cmd.toUpperCase() === 'V') {
      // Vertical line - only y coordinate  
      const nums = coords.trim().split(/[\s,]+/).map(Number);
      return cmd + ' ' + nums.map((n: number) => (n + dy).toFixed(2)).join(' ');
    }
    
    // For other commands, translate x,y pairs
    const nums = coords.trim().split(/[\s,]+/).map(Number);
    const translated = nums.map((n: number, i: number) => {
      // For arc (A), parameters 1-5 are not coordinates, only 6-7 are
      if (cmd.toUpperCase() === 'A') {
        // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
        // indices 0,1 = rx,ry (radii, don't translate)
        // index 2 = rotation (don't translate)
        // indices 3,4 = flags (don't translate)
        // indices 5,6 = x,y (translate these)
        const idx = i % 7;
        if (idx === 5) return (n + dx).toFixed(2);
        if (idx === 6) return (n + dy).toFixed(2);
        return n;
      }
      // Regular coordinate pairs
      return i % 2 === 0 ? (n + dx).toFixed(2) : (n + dy).toFixed(2);
    });
    return cmd + ' ' + translated.join(' ');
  });
}

/**
 * Generate engrave layer SVG (piece numbering)
 * Uses simple path-based numbers for laser engraving compatibility
 */
function generateEngraveLayer(pieces: PieceInfo[], settings: JigsawSettings): string {
  const fontSize = Math.min(8, Math.min(pieces[0]?.bbox.width ?? 30, pieces[0]?.bbox.height ?? 30) * 0.25);
  
  const texts = pieces.map(piece => {
    const centerX = piece.position.x + piece.bbox.width / 2;
    const centerY = piece.position.y + piece.bbox.height / 2;
    
    // Generate simple SVG text (will be converted to paths on export if needed)
    // Position text slightly above center for better visibility
    return `    <text x="${centerX.toFixed(2)}" y="${centerY.toFixed(2)}" ` +
      `text-anchor="middle" dominant-baseline="middle" ` +
      `font-family="Arial, sans-serif" font-size="${fontSize.toFixed(1)}" font-weight="bold" ` +
      `data-piece="${piece.id}">${piece.id}</text>`;
  }).join('\n');
  
  return `  <g id="ENGRAVE_IDS" fill="black" stroke="none">\n${texts}\n  </g>`;
}

/**
 * Generate image layer with clipping to template shape
 */
function generateImageLayer(settings: JigsawSettings): string {
  if (!settings.imageDataUrl) return '';
  if (settings.layoutMode !== 'assembled') return '';
  
  const template = settings.template || 'rectangle';
  const outerPath = generateTemplateOutline(
    template,
    settings.widthMm,
    settings.heightMm,
    settings.cornerRadiusMm
  );

  const hasCutout = !!settings.centerCutout;
  let innerPath = '';
  
  if (hasCutout) {
    // Generate inner cutout path based on excluded cells (same logic as generateCenterCutoutFromPieces)
    const cellWidth = settings.widthMm / settings.columns;
    const cellHeight = settings.heightMm / settings.rows;
    const centerCutoutRatio = settings.centerCutoutRatio ?? 0.3;
    
    // Find bounding box of excluded cells
    let minRow = settings.rows, maxRow = 0, minCol = settings.columns, maxCol = 0;
    for (let row = 0; row < settings.rows; row++) {
      for (let col = 0; col < settings.columns; col++) {
        if (isCenterCutoutExcluded(row, col, settings.rows, settings.columns, centerCutoutRatio)) {
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }
    
    if (minRow <= maxRow && minCol <= maxCol) {
      const x1 = minCol * cellWidth;
      const y1 = minRow * cellHeight;
      const x2 = (maxCol + 1) * cellWidth;
      const y2 = (maxRow + 1) * cellHeight;
      innerPath = `M ${x1.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y2.toFixed(3)} L ${x1.toFixed(3)} ${y2.toFixed(3)} Z`;
    }
  }

  // Use even-odd fill rule so inner path becomes a "hole" in the clip
  const clipD = hasCutout && innerPath ? `${outerPath} ${innerPath}` : outerPath;
  
  return `  <defs>
    <clipPath id="puzzle-clip">
      <path d="${clipD}" fill-rule="evenodd" clip-rule="evenodd" />
    </clipPath>
  </defs>
  <g id="IMAGE_LAYER" clip-path="url(#puzzle-clip)">
    <image 
      href="${settings.imageDataUrl}" 
      x="0" y="0" 
      width="${settings.widthMm}" height="${settings.heightMm}" 
      preserveAspectRatio="xMidYMid slice"
    />
  </g>`;
}

/**
 * Generate complete SVG document
 */
function generateFullSvg(
  cutLayerSvg: string,
  engraveLayerSvg: string | undefined,
  imageLayerSvg: string | undefined,
  backingBoardSvg: string | undefined,
  settings: JigsawSettings,
  layoutFits: boolean
): string {
  let svgWidth: number;
  let svgHeight: number;
  
  // Account for backing board margin if enabled
  const backingMargin = settings.includeBacking ? (settings.backingMarginMm ?? 10) : 0;
  
  if (settings.layoutMode === 'assembled') {
    svgWidth = settings.widthMm + backingMargin * 2;
    svgHeight = settings.heightMm + backingMargin * 2;
  } else {
    const sheet = getSheetDimensions(settings);
    svgWidth = sheet.widthMm;
    svgHeight = sheet.heightMm;
  }
  
  // Image layer goes first (background), then cut layer on top
  const layers: string[] = [];
  if (imageLayerSvg) {
    layers.push(imageLayerSvg);
  }
  layers.push(cutLayerSvg);
  if (engraveLayerSvg) {
    layers.push(engraveLayerSvg);
  }
  if (backingBoardSvg) {
    layers.push(backingBoardSvg);
  }
  
  const offsetDelta = (settings.kerfMm / 2) - settings.clearanceMm;
  
  // Adjust viewBox to include backing board margin
  const viewBoxX = settings.includeBacking ? -backingMargin : 0;
  const viewBoxY = settings.includeBacking ? -backingMargin : 0;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" 
     width="${svgWidth}mm" height="${svgHeight}mm" 
     viewBox="${viewBoxX} ${viewBoxY} ${svgWidth} ${svgHeight}">
  <!-- Jigsaw Puzzle - PathOps Boolean Engine -->
  <!-- Dimensions: ${settings.widthMm}mm × ${settings.heightMm}mm -->
  <!-- Grid: ${settings.rows}×${settings.columns} = ${settings.rows * settings.columns} pieces -->
  <!-- Seed: ${settings.randomSeed} -->
  <!-- Kerf: ${settings.kerfMm}mm, Clearance: ${settings.clearanceMm}mm, Offset: ${offsetDelta.toFixed(3)}mm -->
  <!-- Layout: ${settings.layoutMode} ${layoutFits ? '✓' : '⚠ DOES NOT FIT'} -->
  <!-- Backing: ${settings.includeBacking ? 'YES' : 'NO'} -->
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
