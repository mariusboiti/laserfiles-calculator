/**
 * Shape path generation utilities
 * All shapes are path-first for PathOps compatibility
 * Shapes are generated centered at ORIGIN (0,0) - transform handles positioning
 */

export type ShapeType = 'circle' | 'hex' | 'octagon' | 'scalloped' | 'shield';

/**
 * Generate circle path centered at origin
 */
export function circlePath(r: number): string {
  // Use two arcs to create a complete circle centered at 0,0
  return `M ${-r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;
}

/**
 * Generate hexagon path (flat-top) centered at origin
 */
export function hexagonPath(r: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    // Flat-top hexagon: start at -90 degrees
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return `M ${points[0][0]} ${points[0][1]} ` +
    points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
}

/**
 * Generate octagon path centered at origin
 */
export function octagonPath(r: number): string {
  const points: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return `M ${points[0][0]} ${points[0][1]} ` +
    points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
}

/**
 * Generate scalloped circle path centered at origin
 */
export function scallopedPath(r: number, scallops: number = 12): string {
  const points: string[] = [];
  const innerR = r * 0.92;

  for (let i = 0; i < scallops; i++) {
    const angle1 = (Math.PI * 2 / scallops) * i;
    const angle2 = (Math.PI * 2 / scallops) * (i + 0.5);
    const angle3 = (Math.PI * 2 / scallops) * (i + 1);

    const x1 = r * Math.cos(angle1);
    const y1 = r * Math.sin(angle1);
    const x2 = innerR * Math.cos(angle2);
    const y2 = innerR * Math.sin(angle2);
    const x3 = r * Math.cos(angle3);
    const y3 = r * Math.sin(angle3);

    if (i === 0) {
      points.push(`M ${x1} ${y1}`);
    }
    points.push(`Q ${x2} ${y2} ${x3} ${y3}`);
  }

  return points.join(' ') + ' Z';
}

/**
 * Generate shield path centered at origin
 */
export function shieldPath(w: number, h: number): string {
  const halfW = w / 2;
  const halfH = h / 2;
  const topY = -halfH;
  const midY = h * 0.1 - halfH;
  const bottomY = halfH;
  const cornerR = w * 0.08;

  return `M ${-halfW + cornerR} ${topY} ` +
    `L ${halfW - cornerR} ${topY} ` +
    `Q ${halfW} ${topY} ${halfW} ${topY + cornerR} ` +
    `L ${halfW} ${midY} ` +
    `Q ${halfW} ${midY + h * 0.15} 0 ${bottomY} ` +
    `Q ${-halfW} ${midY + h * 0.15} ${-halfW} ${midY} ` +
    `L ${-halfW} ${topY + cornerR} ` +
    `Q ${-halfW} ${topY} ${-halfW + cornerR} ${topY} Z`;
}

/**
 * Generate shape path based on type - centered at origin (0,0)
 */
export function generateShapePath(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number
): string {
  const r = size / 2;

  switch (shapeType) {
    case 'circle':
      return circlePath(r);
    case 'hex':
      return hexagonPath(r);
    case 'octagon':
      return octagonPath(r);
    case 'scalloped':
      return scallopedPath(r);
    case 'shield':
      return shieldPath(width || size, height || size * 1.15);
    default:
      return circlePath(r);
  }
}

/**
 * Get bounding box for shape
 */
export function getShapeBounds(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number
): { widthMm: number; heightMm: number } {
  switch (shapeType) {
    case 'circle':
    case 'hex':
    case 'octagon':
    case 'scalloped':
      return { widthMm: size, heightMm: size };
    case 'shield':
      return { widthMm: width || size, heightMm: height || size * 1.15 };
    default:
      return { widthMm: size, heightMm: size };
  }
}

/**
 * Calculate inscribed radius for text placement
 */
export function getInscribedRadius(
  shapeType: ShapeType,
  size: number,
  width?: number,
  height?: number
): number {
  const r = size / 2;

  switch (shapeType) {
    case 'circle':
      return r;
    case 'hex':
      return r * Math.cos(Math.PI / 6); // ~0.866
    case 'octagon':
      return r * Math.cos(Math.PI / 8); // ~0.924
    case 'scalloped':
      return r * 0.85;
    case 'shield': {
      const w = width || size;
      const h = height || size * 1.15;
      return Math.min(w, h) * 0.4; // Conservative estimate for shield
    }
    default:
      return r;
  }
}
