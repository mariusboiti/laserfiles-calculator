import type { Point2D, SlidingDrawerInputs } from '../types';
import { clamp, pt } from '../shared/panelUtils';
import { computeFingerPattern } from '../shared/fingerMath';

type Pt = Point2D;

export type DrawerDimensions = {
  outerWidth: number;
  outerDepth: number;
  outerHeight: number;
  innerWidth: number;
  innerDepth: number;
  innerHeight: number;
  drawerWidth: number;
  drawerDepth: number;
  drawerHeight: number;
  openingWidth: number;
  openingHeight: number;
  thickness: number;
};

/**
 * Compute all dimensions for outer box and drawer.
 */
export function computeDrawerDimensions(input: SlidingDrawerInputs): DrawerDimensions {
  const W = clamp(input.widthMm, 10, 5000);
  const D = clamp(input.depthMm, 10, 5000);
  const H = clamp(input.heightMm, 10, 5000);
  const t = clamp(input.thicknessMm, 1, 50);
  const clearance = clamp(input.drawerClearanceMm, 0, 50);
  const innerHeightBase = Math.max(1, H - 2 * t);
  const bottomOffset = clamp(input.drawerBottomOffsetMm, 0, innerHeightBase / 2);

  const innerWidth = W - 2 * t;
  const innerDepth = D - 2 * t;
  const innerHeight = innerHeightBase;

  const drawerWidth = innerWidth - 2 * clearance;
  const drawerDepth = innerDepth - clearance;
  const drawerHeight = innerHeight - clearance - bottomOffset;

  const openingWidth = drawerWidth + 2 * clearance;
  const openingHeight = drawerHeight + clearance;

  return {
    outerWidth: W,
    outerDepth: D,
    outerHeight: H,
    innerWidth,
    innerDepth,
    innerHeight,
    drawerWidth,
    drawerDepth,
    drawerHeight,
    openingWidth,
    openingHeight,
    thickness: t,
  };
}

/**
 * Build finger-jointed edge segments.
 */
export function buildFingerEdge(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  thickness: number,
  fingerWidth: number,
  invert: boolean
): Pt[] {
  const pattern = computeFingerPattern(length, fingerWidth, invert);
  const pts: Pt[] = [];

  let pos = 0;
  for (let i = 0; i < pattern.segmentCount; i++) {
    const isTab = pattern.isTab(i);
    const segLen = pattern.segmentMm;

    if (isTab) {
      // Tab: go out, along, back in
      const p1 = pt(start.x + direction.x * pos, start.y + direction.y * pos);
      const p2 = pt(p1.x + normal.x * thickness, p1.y + normal.y * thickness);
      const p3 = pt(p2.x + direction.x * segLen, p2.y + direction.y * segLen);
      const p4 = pt(p3.x - normal.x * thickness, p3.y - normal.y * thickness);
      pts.push(p1, p2, p3, p4);
      pos += segLen;
    } else {
      // Gap: just advance along the edge
      const p = pt(start.x + direction.x * pos, start.y + direction.y * pos);
      pts.push(p);
      pos += segLen;
    }
  }

  // Add final point at end of edge
  const endPt = pt(start.x + direction.x * length, start.y + direction.y * length);
  if (pts.length === 0 || Math.abs(pts[pts.length - 1].x - endPt.x) > 0.01 || Math.abs(pts[pts.length - 1].y - endPt.y) > 0.01) {
    pts.push(endPt);
  }

  return pts;
}

/**
 * Build rectangular panel with finger joints on specified edges.
 */
export function buildRectPanel(
  w: number,
  h: number,
  t: number,
  fingerW: number,
  edges: {
    top: 'tab' | 'slot' | 'plain';
    right: 'tab' | 'slot' | 'plain';
    bottom: 'tab' | 'slot' | 'plain';
    left: 'tab' | 'slot' | 'plain';
  }
): Pt[] {
  const pts: Pt[] = [];

  // Top edge (left to right)
  if (edges.top === 'plain') {
    pts.push(pt(0, 0), pt(w, 0));
  } else {
    const normal = edges.top === 'tab' ? pt(0, -1) : pt(0, 1);
    const topPts = buildFingerEdge(pt(0, 0), pt(1, 0), normal, w, t, fingerW, false);
    pts.push(...topPts);
  }

  // Right edge (top to bottom)
  const topRight = pts[pts.length - 1];
  if (edges.right === 'plain') {
    pts.push(pt(w, h));
  } else {
    const normal = edges.right === 'tab' ? pt(1, 0) : pt(-1, 0);
    const rightPts = buildFingerEdge(topRight, pt(0, 1), normal, h, t, fingerW, false);
    pts.push(...rightPts.slice(1));
  }

  // Bottom edge (right to left)
  const bottomRight = pts[pts.length - 1];
  if (edges.bottom === 'plain') {
    pts.push(pt(0, h));
  } else {
    const normal = edges.bottom === 'tab' ? pt(0, 1) : pt(0, -1);
    const bottomPts = buildFingerEdge(bottomRight, pt(-1, 0), normal, w, t, fingerW, false);
    pts.push(...bottomPts.slice(1));
  }

  // Left edge (bottom to top)
  const bottomLeft = pts[pts.length - 1];
  if (edges.left === 'plain') {
    pts.push(pt(0, 0));
  } else {
    const normal = edges.left === 'tab' ? pt(-1, 0) : pt(1, 0);
    const leftPts = buildFingerEdge(bottomLeft, pt(0, -1), normal, h, t, fingerW, false);
    pts.push(...leftPts.slice(1));
  }

  return pts;
}

/**
 * Build outer front panel with drawer opening cutout.
 * Returns object with outer outline and cutout rectangles.
 */
export function buildOuterFrontWithOpening(
  w: number,
  h: number,
  t: number,
  fingerW: number,
  openingWidth: number,
  openingHeight: number,
  bottomOffset: number
): { outline: Pt[]; cutouts: Pt[][] } {
  const openingX = (w - openingWidth) / 2;
  const openingY = bottomOffset;

  // Build outer perimeter with finger joints on sides/bottom
  const outer = buildRectPanel(w, h, t, fingerW, {
    top: 'tab',
    right: 'tab',
    bottom: 'tab',
    left: 'tab',
  });

  // Build opening cutout rectangle (clockwise for proper fill-rule)
  const cutout: Pt[] = [
    pt(openingX, openingY),
    pt(openingX + openingWidth, openingY),
    pt(openingX + openingWidth, openingY + openingHeight),
    pt(openingX, openingY + openingHeight),
  ];

  return {
    outline: outer,
    cutouts: [cutout],
  };
}

/**
 * Compute warnings for drawer configuration.
 */
export function computeDrawerWarnings(input: SlidingDrawerInputs, dims: DrawerDimensions): string[] {
  const warnings: string[] = [];

  if (input.drawerClearanceMm < input.kerfMm) {
    warnings.push('Drawer clearance is less than kerf. Drawer may bind.');
  }

  if (dims.drawerHeight > dims.openingHeight) {
    warnings.push('Drawer height exceeds opening height. Drawer will not fit.');
  }

  if (dims.drawerWidth <= 0 || dims.drawerDepth <= 0 || dims.drawerHeight <= 0) {
    warnings.push('Drawer dimensions are invalid. Check clearances and offsets.');
  }

  return warnings;
}
