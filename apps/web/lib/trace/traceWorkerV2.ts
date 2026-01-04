/**
 * Trace Worker V2
 * Optimized bitmap-to-SVG tracing with Web Worker
 */

import type { TraceOptions, TraceResult, TraceProgress, TraceWorkerMessage, TraceWorkerResponse } from './types';

// Marching squares lookup table
const MS_TABLE = [
  [0, 0, 0, 0], // 0
  [0, 3, 0, 0], // 1
  [0, 0, 1, 0], // 2
  [0, 3, 1, 0], // 3
  [1, 0, 0, 0], // 4
  [0, 3, 0, 0], // 5 - ambiguous
  [1, 0, 1, 0], // 6
  [1, 3, 1, 0], // 7
  [3, 0, 0, 0], // 8
  [3, 3, 0, 0], // 9
  [0, 0, 1, 0], // 10 - ambiguous
  [3, 3, 1, 0], // 11
  [3, 0, 1, 0], // 12
  [3, 3, 1, 0], // 13
  [3, 0, 1, 0], // 14
  [0, 0, 0, 0], // 15
];

interface Point {
  x: number;
  y: number;
}

type Contour = Point[];

function postProgress(id: string, progress: TraceProgress): void {
  const response: TraceWorkerResponse = { type: 'progress', id, progress };
  self.postMessage(response);
}

function postResult(id: string, result: TraceResult): void {
  const response: TraceWorkerResponse = { type: 'result', id, result };
  self.postMessage(response);
}

function postError(id: string, error: string): void {
  const response: TraceWorkerResponse = { type: 'error', id, error };
  self.postMessage(response);
}

/**
 * Apply threshold to get binary image
 */
function thresholdImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
  invert: boolean
): Uint8Array {
  const result = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Grayscale conversion
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      const alpha = data[idx + 3] / 255;
      const val = gray * alpha + 255 * (1 - alpha);
      
      let bit = val < threshold ? 1 : 0;
      if (invert) bit = 1 - bit;
      
      result[y * width + x] = bit;
    }
  }
  
  return result;
}

/**
 * Marching squares contour extraction
 */
function extractContours(
  binary: Uint8Array,
  width: number,
  height: number,
  onProgress?: (p: number) => void
): Contour[] {
  const visited = new Set<string>();
  const contours: Contour[] = [];
  
  const getCell = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return binary[y * width + x];
  };
  
  const getCellType = (x: number, y: number): number => {
    return (
      (getCell(x, y) << 3) |
      (getCell(x + 1, y) << 2) |
      (getCell(x + 1, y + 1) << 1) |
      getCell(x, y + 1)
    );
  };
  
  const directions = [
    { dx: 1, dy: 0 },  // 0: right
    { dx: 0, dy: 1 },  // 1: down
    { dx: -1, dy: 0 }, // 2: left
    { dx: 0, dy: -1 }, // 3: up
  ];
  
  const totalCells = (width - 1) * (height - 1);
  let processedCells = 0;
  
  for (let startY = 0; startY < height - 1; startY++) {
    for (let startX = 0; startX < width - 1; startX++) {
      processedCells++;
      if (onProgress && processedCells % 10000 === 0) {
        onProgress(processedCells / totalCells);
      }
      
      const startKey = `${startX},${startY}`;
      if (visited.has(startKey)) continue;
      
      const cellType = getCellType(startX, startY);
      if (cellType === 0 || cellType === 15) continue;
      
      // Start a new contour
      const contour: Contour = [];
      let x = startX;
      let y = startY;
      let prevDir = -1;
      
      do {
        const key = `${x},${y}`;
        const ct = getCellType(x, y);
        
        if (ct === 0 || ct === 15) break;
        
        visited.add(key);
        
        // Get edge point
        const edges = MS_TABLE[ct];
        let dir = edges[0];
        
        // Prefer continuing in same direction
        if (prevDir >= 0 && edges[prevDir] !== 0) {
          dir = prevDir;
        } else {
          for (let i = 0; i < 4; i++) {
            if (edges[i] !== 0 && i !== (prevDir + 2) % 4) {
              dir = i;
              break;
            }
          }
        }
        
        // Calculate point on edge
        let px = x;
        let py = y;
        
        switch (dir) {
          case 0: px = x + 1; py = y + 0.5; break;
          case 1: px = x + 0.5; py = y + 1; break;
          case 2: px = x; py = y + 0.5; break;
          case 3: px = x + 0.5; py = y; break;
        }
        
        contour.push({ x: px, y: py });
        
        // Move to next cell
        const d = directions[dir];
        x += d.dx;
        y += d.dy;
        prevDir = dir;
        
      } while (x !== startX || y !== startY);
      
      if (contour.length >= 3) {
        contours.push(contour);
      }
    }
  }
  
  return contours;
}

/**
 * Ramer-Douglas-Peucker simplification
 */
function simplifyContour(points: Contour, epsilon: number): Contour {
  if (points.length < 3) return points;
  
  let maxDist = 0;
  let maxIdx = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  if (maxDist > epsilon) {
    const left = simplifyContour(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyContour(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function perpendicularDistance(p: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len === 0) {
    return Math.sqrt((p.x - lineStart.x) ** 2 + (p.y - lineStart.y) ** 2);
  }
  
  return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / len;
}

/**
 * Smooth contour with Chaikin's algorithm
 */
function smoothContour(points: Contour, iterations: number): Contour {
  if (iterations <= 0 || points.length < 3) return points;
  
  let current = points;
  
  for (let iter = 0; iter < iterations; iter++) {
    const next: Contour = [];
    
    for (let i = 0; i < current.length; i++) {
      const p0 = current[i];
      const p1 = current[(i + 1) % current.length];
      
      next.push({
        x: 0.75 * p0.x + 0.25 * p1.x,
        y: 0.75 * p0.y + 0.25 * p1.y,
      });
      next.push({
        x: 0.25 * p0.x + 0.75 * p1.x,
        y: 0.25 * p0.y + 0.75 * p1.y,
      });
    }
    
    current = next;
  }
  
  return current;
}

/**
 * Convert contour to SVG path d attribute
 */
function contourToPathD(contour: Contour): string {
  if (contour.length < 2) return '';
  
  const parts: string[] = [`M ${contour[0].x.toFixed(2)} ${contour[0].y.toFixed(2)}`];
  
  for (let i = 1; i < contour.length; i++) {
    parts.push(`L ${contour[i].x.toFixed(2)} ${contour[i].y.toFixed(2)}`);
  }
  
  parts.push('Z');
  return parts.join(' ');
}

/**
 * Main trace function
 */
function trace(
  imageData: ImageData,
  options: TraceOptions,
  id: string
): TraceResult {
  const { width, height, data } = imageData;
  const { threshold, invert, simplify, smoothing, minPathNodes = 4, maxPaths = 5000 } = options;
  
  postProgress(id, { stage: 'preprocess', progress: 0, message: 'Thresholding image' });
  
  // Apply threshold
  const binary = thresholdImage(data, width, height, threshold, invert);
  
  postProgress(id, { stage: 'trace', progress: 0, message: 'Extracting contours' });
  
  // Extract contours
  const contours = extractContours(binary, width, height, (p) => {
    postProgress(id, { stage: 'trace', progress: p * 0.5, message: 'Extracting contours' });
  });
  
  postProgress(id, { stage: 'simplify', progress: 0, message: 'Simplifying paths' });
  
  // Simplify and smooth
  const epsilon = simplify * 0.5;
  const smoothIterations = Math.min(Math.floor(smoothing / 3), 3);
  
  const processedContours: Contour[] = [];
  let totalNodes = 0;
  
  for (let i = 0; i < contours.length; i++) {
    if (i % 100 === 0) {
      postProgress(id, { stage: 'simplify', progress: i / contours.length, message: 'Simplifying paths' });
    }
    
    let c = contours[i];
    
    if (epsilon > 0) {
      c = simplifyContour(c, epsilon);
    }
    
    if (smoothIterations > 0) {
      c = smoothContour(c, smoothIterations);
    }
    
    if (c.length >= minPathNodes) {
      processedContours.push(c);
      totalNodes += c.length;
    }
  }
  
  postProgress(id, { stage: 'finalize', progress: 0, message: 'Building SVG' });
  
  // Build SVG
  const warnings: string[] = [];
  
  if (processedContours.length > maxPaths) {
    warnings.push(`Result has ${processedContours.length} paths. Consider increasing simplification.`);
  }
  
  const pathDs = processedContours.map(contourToPathD).filter(Boolean);
  
  const fillAttr = options.mode === 'outline' ? 'none' : '#000000';
  const strokeAttr = options.mode === 'outline' ? '#000000' : 'none';
  const strokeWidth = options.mode === 'outline' ? '1' : '0';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <path d="${pathDs.join(' ')}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeWidth}"/>
</svg>`;
  
  return {
    svg,
    widthPx: width,
    heightPx: height,
    pathCount: processedContours.length,
    nodeCount: totalNodes,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Multi-band tracing for grayscale
 */
function traceMultiband(
  imageData: ImageData,
  options: TraceOptions,
  id: string
): TraceResult {
  const { width, height, data } = imageData;
  const { thresholds = [64, 128, 192], invert, simplify, smoothing, minPathNodes = 4 } = options;
  
  const sortedThresholds = [...thresholds].sort((a, b) => a - b);
  const bandCount = sortedThresholds.length;
  
  const allPathDs: string[] = [];
  const colors = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];
  let totalPaths = 0;
  let totalNodes = 0;
  
  for (let band = 0; band < bandCount; band++) {
    postProgress(id, { 
      stage: 'trace', 
      progress: band / bandCount, 
      message: `Tracing band ${band + 1}/${bandCount}` 
    });
    
    const threshold = sortedThresholds[band];
    const binary = thresholdImage(data, width, height, threshold, invert);
    const contours = extractContours(binary, width, height);
    
    const epsilon = simplify * 0.5;
    const smoothIterations = Math.min(Math.floor(smoothing / 3), 3);
    
    for (const contour of contours) {
      let c = contour;
      if (epsilon > 0) c = simplifyContour(c, epsilon);
      if (smoothIterations > 0) c = smoothContour(c, smoothIterations);
      
      if (c.length >= minPathNodes) {
        const d = contourToPathD(c);
        if (d) {
          const color = colors[band % colors.length];
          allPathDs.push(`<path d="${d}" fill="${color}" stroke="none"/>`);
          totalPaths++;
          totalNodes += c.length;
        }
      }
    }
  }
  
  postProgress(id, { stage: 'finalize', progress: 0, message: 'Building SVG' });
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${allPathDs.join('\n  ')}
</svg>`;
  
  return {
    svg,
    widthPx: width,
    heightPx: height,
    pathCount: totalPaths,
    nodeCount: totalNodes,
  };
}

/**
 * Worker message handler
 */
self.onmessage = function(event: MessageEvent<TraceWorkerMessage>) {
  const { type, id, imageData, options } = event.data;
  
  if (type === 'cancel') {
    const response: TraceWorkerResponse = { type: 'cancelled', id };
    self.postMessage(response);
    return;
  }
  
  if (type !== 'trace' || !imageData || !options) {
    postError(id, 'Invalid message');
    return;
  }
  
  try {
    postProgress(id, { stage: 'decode', progress: 1, message: 'Image loaded' });
    
    let result: TraceResult;
    
    if (options.mode === 'multiband') {
      result = traceMultiband(imageData, options, id);
    } else {
      result = trace(imageData, options, id);
    }
    
    postResult(id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Trace failed';
    postError(id, message);
  }
};
