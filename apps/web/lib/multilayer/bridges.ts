/**
 * Bridge/Connector Generation for MultiLayer Maker V3
 * Automatically places small rectangular connectors on floating islands
 */

export interface Bridge {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
}

export interface Island {
  id: number;
  pixels: number[];
  boundingBox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
}

/**
 * Detect islands (connected components) in a binary mask
 */
export function detectIslands(imageData: ImageData): Island[] {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const islands: Island[] = [];
  let islandId = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] === 0 && data[idx * 4] > 128) {
        const pixels = floodFill(data, width, height, x, y, visited);
        
        if (pixels.length > 10) { // Minimum island size
          const island = createIsland(islandId++, pixels, width, height);
          islands.push(island);
        }
      }
    }
  }

  return islands;
}

function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Uint8Array
): number[] {
  const stack: [number, number][] = [[startX, startY]];
  const pixels: number[] = [];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const idx = y * width + x;
    if (visited[idx] === 1) continue;
    if (data[idx * 4] < 128) continue;
    
    visited[idx] = 1;
    pixels.push(idx);
    
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return pixels;
}

function createIsland(
  id: number,
  pixels: number[],
  width: number,
  height: number
): Island {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;

  pixels.forEach(idx => {
    const x = idx % width;
    const y = Math.floor(idx / width);
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    sumX += x;
    sumY += y;
  });

  return {
    id,
    pixels,
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    centroid: {
      x: sumX / pixels.length,
      y: sumY / pixels.length,
    },
  };
}

/**
 * Generate bridges between islands and main body
 * Returns bridge rectangles in image coordinates
 */
export function generateBridges(
  islands: Island[],
  imageWidth: number,
  imageHeight: number,
  bridgeSettings: {
    width: number; // pixels
    minIslandSize: number; // pixels²
    maxBridgesPerIsland: number;
  }
): Bridge[] {
  const bridges: Bridge[] = [];
  
  // Find largest island (assumed to be main body)
  const sortedIslands = [...islands].sort((a, b) => b.pixels.length - a.pixels.length);
  if (sortedIslands.length < 2) return bridges;
  
  const mainIsland = sortedIslands[0];
  const floatingIslands = sortedIslands.slice(1).filter(
    island => island.pixels.length >= bridgeSettings.minIslandSize
  );

  floatingIslands.forEach(island => {
    // Find closest point on main island to this island's centroid
    const closestPoint = findClosestPoint(island.centroid, mainIsland.pixels, imageWidth);
    
    // Create bridge from island centroid to closest point
    const dx = closestPoint.x - island.centroid.x;
    const dy = closestPoint.y - island.centroid.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) { // Only add bridge if islands are separated
      const angle = Math.atan2(dy, dx);
      
      bridges.push({
        x: island.centroid.x,
        y: island.centroid.y,
        width: distance,
        height: bridgeSettings.width,
        angle,
      });
    }
  });

  return bridges;
}

function findClosestPoint(
  target: { x: number; y: number },
  pixels: number[],
  imageWidth: number
): { x: number; y: number } {
  let minDist = Infinity;
  let closest = { x: 0, y: 0 };

  pixels.forEach(idx => {
    const x = idx % imageWidth;
    const y = Math.floor(idx / imageWidth);
    
    const dx = x - target.x;
    const dy = y - target.y;
    const dist = dx * dx + dy * dy;
    
    if (dist < minDist) {
      minDist = dist;
      closest = { x, y };
    }
  });

  return closest;
}

/**
 * Add bridges to SVG path data
 */
export function addBridgesToSVG(
  pathData: string,
  bridges: Bridge[]
): string {
  let result = pathData;
  
  bridges.forEach(bridge => {
    const bridgePath = createBridgePath(bridge);
    result += ' ' + bridgePath;
  });
  
  return result;
}

function createBridgePath(bridge: Bridge): string {
  const cos = Math.cos(bridge.angle);
  const sin = Math.sin(bridge.angle);
  const hw = bridge.height / 2;
  
  // Rectangle corners rotated around start point
  const x1 = bridge.x - hw * sin;
  const y1 = bridge.y + hw * cos;
  const x2 = bridge.x + hw * sin;
  const y2 = bridge.y - hw * cos;
  const x3 = bridge.x + bridge.width * cos + hw * sin;
  const y3 = bridge.y + bridge.width * sin - hw * cos;
  const x4 = bridge.x + bridge.width * cos - hw * sin;
  const y4 = bridge.y + bridge.width * sin + hw * cos;
  
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}
