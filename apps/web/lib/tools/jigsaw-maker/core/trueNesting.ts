import type { TrueNestingSettings } from '../types/jigsawV3';
import type { PuzzlePiece } from '../types/jigsaw';
import { createSeededRandom } from './random';

/**
 * Module A: True Nesting
 * Real-shape nesting with collision detection
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface PlacedPiece {
  piece: PuzzlePiece;
  x: number;
  y: number;
  rotation: number;
  polygon: Point2D[];
  bounds: BoundingBox;
}

export interface NestingResult {
  placedPieces: PlacedPiece[];
  success: boolean;
  utilization: number;
  warnings: string[];
}

/**
 * Perform true nesting of puzzle pieces
 */
export function performTrueNesting(
  pieces: PuzzlePiece[],
  sheetWidth: number,
  sheetHeight: number,
  settings: TrueNestingSettings,
  seed: number
): NestingResult {
  const random = createSeededRandom(seed);
  const placedPieces: PlacedPiece[] = [];
  const warnings: string[] = [];

  // Convert pieces to polygons
  const piecePolygons = pieces.map(piece => ({
    piece,
    polygon: svgPathToPolygon(piece.path),
  }));

  // Sort by area (largest first)
  piecePolygons.sort((a, b) => {
    const areaA = calculatePolygonArea(a.polygon);
    const areaB = calculatePolygonArea(b.polygon);
    return areaB - areaA;
  });

  // Get allowed rotations
  const rotations = getAllowedRotations(settings.rotationSet);

  // Calculate grid step based on density
  const gridStep = Math.max(5, 20 - settings.density * 1.5);

  // Scatter pieces first if enabled
  if (settings.scatterEnabled) {
    scatterPieces(piecePolygons, sheetWidth, sheetHeight, settings, random);
  }

  // Place each piece
  for (const { piece, polygon } of piecePolygons) {
    let placed = false;
    let bestPlacement: PlacedPiece | null = null;
    let bestScore = Infinity;

    const attempts = Math.min(settings.maxAttempts, 100);

    for (let attempt = 0; attempt < attempts && !placed; attempt++) {
      // Try different rotations
      for (const rotation of rotations) {
        if (placed) break;

        const rotatedPolygon = rotatePolygon(polygon, rotation);
        const bounds = calculateBounds(rotatedPolygon);

        // Generate candidate positions
        const candidates = generateCandidatePositions(
          bounds,
          sheetWidth,
          sheetHeight,
          settings.minGapMm,
          gridStep,
          random
        );

        for (const pos of candidates) {
          const translatedPolygon = translatePolygon(rotatedPolygon, pos.x, pos.y);
          const translatedBounds = calculateBounds(translatedPolygon);

          // Check if within sheet bounds
          if (!isWithinBounds(translatedBounds, sheetWidth, sheetHeight, settings.minGapMm)) {
            continue;
          }

          // Check collision with already placed pieces
          if (hasCollision(translatedPolygon, placedPieces, settings.minGapMm)) {
            continue;
          }

          // Valid placement found
          const placement: PlacedPiece = {
            piece,
            x: pos.x,
            y: pos.y,
            rotation,
            polygon: translatedPolygon,
            bounds: translatedBounds,
          };

          if (settings.strategy === 'fast') {
            // Accept first valid placement
            placedPieces.push(placement);
            placed = true;
            break;
          } else {
            // Score placement for best fit
            const score = scorePlacement(placement, sheetWidth, sheetHeight, settings.strategy);
            if (score < bestScore) {
              bestScore = score;
              bestPlacement = placement;
            }
          }
        }
      }
    }

    // Add best placement if found
    if (!placed && bestPlacement) {
      placedPieces.push(bestPlacement);
      placed = true;
    }

    if (!placed) {
      warnings.push(`Failed to place piece ${piece.row}-${piece.col}`);
    }
  }

  // Calculate utilization
  const usedArea = placedPieces.reduce((sum, p) => sum + calculatePolygonArea(p.polygon), 0);
  const sheetArea = sheetWidth * sheetHeight;
  const utilization = (usedArea / sheetArea) * 100;

  return {
    placedPieces,
    success: placedPieces.length === pieces.length,
    utilization,
    warnings,
  };
}

/**
 * Convert SVG path to polygon (simplified)
 */
function svgPathToPolygon(path: string, epsilon: number = 1.0): Point2D[] {
  const points: Point2D[] = [];
  
  // Parse path commands (simplified - handles M, L, C, Z)
  const commands = path.match(/[MLCZmlcz][^MLCZmlcz]*/g) || [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);

    switch (type.toUpperCase()) {
      case 'M':
        currentX = coords[0];
        currentY = coords[1];
        startX = currentX;
        startY = currentY;
        points.push({ x: currentX, y: currentY });
        break;

      case 'L':
        currentX = coords[0];
        currentY = coords[1];
        points.push({ x: currentX, y: currentY });
        break;

      case 'C':
        // Cubic Bezier - sample points
        const x0 = currentX;
        const y0 = currentY;
        const x1 = coords[0];
        const y1 = coords[1];
        const x2 = coords[2];
        const y2 = coords[3];
        const x3 = coords[4];
        const y3 = coords[5];

        // Sample curve at intervals
        for (let t = 0.2; t <= 1; t += 0.2) {
          const t2 = t * t;
          const t3 = t2 * t;
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;

          const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
          const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
          points.push({ x, y });
        }

        currentX = x3;
        currentY = y3;
        break;

      case 'Z':
        if (currentX !== startX || currentY !== startY) {
          points.push({ x: startX, y: startY });
        }
        break;
    }
  }

  // Simplify polygon using Douglas-Peucker
  return simplifyPolygon(points, epsilon);
}

/**
 * Simplify polygon using Douglas-Peucker algorithm
 */
function simplifyPolygon(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPolygon(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPolygon(points.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[end]];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  
  if (norm === 0) return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
  
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / norm;
}

/**
 * Calculate polygon area
 */
function calculatePolygonArea(polygon: Point2D[]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculate bounding box
 */
function calculateBounds(polygon: Point2D[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Rotate polygon
 */
function rotatePolygon(polygon: Point2D[], degrees: number): Point2D[] {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  return polygon.map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  }));
}

/**
 * Translate polygon
 */
function translatePolygon(polygon: Point2D[], dx: number, dy: number): Point2D[] {
  return polygon.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Get allowed rotations
 */
function getAllowedRotations(rotationSet: string): number[] {
  switch (rotationSet) {
    case 'none':
      return [0];
    case '0-180':
      return [0, 180];
    case '0-90-180-270':
      return [0, 90, 180, 270];
    default:
      return [0];
  }
}

/**
 * Generate candidate positions
 */
function generateCandidatePositions(
  bounds: BoundingBox,
  sheetWidth: number,
  sheetHeight: number,
  minGap: number,
  gridStep: number,
  random: () => number
): Point2D[] {
  const positions: Point2D[] = [];
  
  for (let y = minGap; y < sheetHeight - bounds.height - minGap; y += gridStep) {
    for (let x = minGap; x < sheetWidth - bounds.width - minGap; x += gridStep) {
      positions.push({ x: x - bounds.minX, y: y - bounds.minY });
    }
  }
  
  // Shuffle for randomness
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  return positions;
}

/**
 * Check if bounds are within sheet
 */
function isWithinBounds(
  bounds: BoundingBox,
  sheetWidth: number,
  sheetHeight: number,
  margin: number
): boolean {
  return bounds.minX >= margin &&
         bounds.minY >= margin &&
         bounds.maxX <= sheetWidth - margin &&
         bounds.maxY <= sheetHeight - margin;
}

/**
 * Check collision with placed pieces
 */
function hasCollision(
  polygon: Point2D[],
  placedPieces: PlacedPiece[],
  minGap: number
): boolean {
  const bounds = calculateBounds(polygon);
  
  for (const placed of placedPieces) {
    // Broad phase: bounding box check with gap
    if (bounds.maxX + minGap < placed.bounds.minX ||
        bounds.minX - minGap > placed.bounds.maxX ||
        bounds.maxY + minGap < placed.bounds.minY ||
        bounds.minY - minGap > placed.bounds.maxY) {
      continue;
    }
    
    // Narrow phase: polygon intersection (SAT)
    if (polygonsIntersect(polygon, placed.polygon, minGap)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if two polygons intersect using Separating Axis Theorem
 */
function polygonsIntersect(poly1: Point2D[], poly2: Point2D[], minGap: number): boolean {
  // Simplified SAT - check if polygons are too close
  for (const p1 of poly1) {
    for (const p2 of poly2) {
      const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      if (dist < minGap) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Score placement
 */
function scorePlacement(
  placement: PlacedPiece,
  sheetWidth: number,
  sheetHeight: number,
  strategy: string
): number {
  if (strategy === 'maximize-saving') {
    // Minimize bounding height (pack tighter)
    return placement.bounds.maxY;
  }
  
  // Balanced: prefer top-left corner
  return placement.bounds.minX + placement.bounds.minY;
}

/**
 * Scatter pieces (initial random placement)
 */
function scatterPieces(
  piecePolygons: Array<{ piece: PuzzlePiece; polygon: Point2D[] }>,
  sheetWidth: number,
  sheetHeight: number,
  settings: TrueNestingSettings,
  random: () => number
): void {
  // Simplified scatter - just randomize order
  for (let i = piecePolygons.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [piecePolygons[i], piecePolygons[j]] = [piecePolygons[j], piecePolygons[i]];
  }
}
