/**
 * Path Simplification using Ramer-Douglas-Peucker algorithm
 */

interface Point {
  x: number;
  y: number;
}

export function simplifyPath(pathData: string, tolerance: number): string {
  const points = parsePathToPoints(pathData);
  if (points.length < 3) return pathData;
  
  const simplified = rdpSimplify(points, tolerance);
  return pointsToPath(simplified);
}

function parsePathToPoints(pathData: string): Point[] {
  const points: Point[] = [];
  const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
  
  let currentX = 0;
  let currentY = 0;
  
  commands.forEach(cmd => {
    const type = cmd[0];
    const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    
    switch (type.toUpperCase()) {
      case 'M':
      case 'L':
        currentX = coords[0];
        currentY = coords[1];
        points.push({ x: currentX, y: currentY });
        break;
      case 'H':
        currentX = coords[0];
        points.push({ x: currentX, y: currentY });
        break;
      case 'V':
        currentY = coords[0];
        points.push({ x: currentX, y: currentY });
        break;
    }
  });
  
  return points;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x.toFixed(2)} ${points[i].y.toFixed(2)}`;
  }
  
  path += ' Z';
  return path;
}

/**
 * Ramer-Douglas-Peucker algorithm
 */
function rdpSimplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  
  const first = points[0];
  const last = points[points.length - 1];
  
  // Find point with maximum distance from line
  let maxDistance = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), tolerance);
    const right = rdpSimplify(points.slice(maxIndex), tolerance);
    
    // Concatenate results (remove duplicate middle point)
    return [...left.slice(0, -1), ...right];
  } else {
    // All points between first and last can be removed
    return [first, last];
  }
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  if (dx === 0 && dy === 0) {
    // Line start and end are the same point
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }
  
  const numerator = Math.abs(
    dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);
  
  return numerator / denominator;
}
