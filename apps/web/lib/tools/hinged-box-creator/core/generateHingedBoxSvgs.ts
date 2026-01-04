import type { HingedBoxOptions, HingedBoxSvgs } from '../types/box';
import { computeHingePattern } from './hingeMath';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Pt = { x: number; y: number };

function pt(x: number, y: number): Pt {
  return { x, y };
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function mul(a: Pt, s: number): Pt {
  return { x: a.x * s, y: a.y * s };
}

function bbox(points: Pt[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function pathFromPoints(points: Pt[]) {
  if (points.length === 0) return '';
  const parts: string[] = [];
  parts.push(`M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`);
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function fingerEdge(
  start: Pt,
  dir: Pt,
  normalOut: Pt,
  length: number,
  depth: number,
  fingerWidth: number,
  autoFit: boolean,
  male: boolean,
  startsWithFinger: boolean
): Pt[] {
  const pts: Pt[] = [];
  let count = Math.max(1, Math.round(length / Math.max(1, fingerWidth)));
  if (autoFit) {
    if (count % 2 === 0) count += 1;
  }
  const seg = length / count;

  const n = male ? normalOut : mul(normalOut, -1);
  let cur = start;
  pts.push(cur);

  for (let i = 0; i < count; i++) {
    const isFinger = startsWithFinger ? i % 2 === 0 : i % 2 === 1;
    if (isFinger) {
      cur = add(cur, mul(n, depth));
      pts.push(cur);
      cur = add(cur, mul(dir, seg));
      pts.push(cur);
      cur = add(cur, mul(n, -depth));
      pts.push(cur);
    } else {
      cur = add(cur, mul(dir, seg));
      pts.push(cur);
    }
  }

  return pts;
}

function hingeEdge(
  start: Pt,
  dir: Pt,
  normalOut: Pt,
  width: number,
  depth: number,
  clearance: number,
  kerf: number,
  fingerWidth: number,
  mode: 'back' | 'lid',
  countMode: 'auto' | 'manual',
  manualCount?: number
): Pt[] {
  const pts: Pt[] = [];
  const pattern = computeHingePattern(width, fingerWidth, countMode, manualCount);

  const n = normalOut; // hinge tabs always outward
  let cur = start;
  pts.push(cur);

  const perSide = clamp(clearance / 2 + kerf / 2, 0, pattern.pitchMm / 2 - 0.01);

  for (let i = 0; i < pattern.count; i++) {
    const isBackFinger = pattern.isBackFinger(i);
    const isFinger = mode === 'back' ? isBackFinger : !isBackFinger;

    if (!isFinger) {
      cur = add(cur, mul(dir, pattern.pitchMm));
      pts.push(cur);
      continue;
    }

    // Baseline advance to center the tab within this pitch.
    cur = add(cur, mul(dir, perSide));
    pts.push(cur);

    const tabLen = clamp(pattern.pitchMm - 2 * perSide, 0.2, pattern.pitchMm);

    // Tab outward
    cur = add(cur, mul(n, depth));
    pts.push(cur);
    cur = add(cur, mul(dir, tabLen));
    pts.push(cur);
    cur = add(cur, mul(n, -depth));
    pts.push(cur);

    // Complete pitch
    cur = add(cur, mul(dir, perSide));
    pts.push(cur);
  }

  return pts;
}

function panelSvg(points: Pt[], strokeWidth = 0.2) {
  const b = bbox(points);
  const pad = 1;
  const shift = pt(-b.minX + pad, -b.minY + pad);
  const shifted = points.map((p) => add(p, shift));
  const bb2 = bbox(shifted);
  const w = bb2.maxX + pad;
  const h = bb2.maxY + pad;

  const d = pathFromPoints(shifted);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
  <path d="${d}" fill="none" stroke="#000" stroke-width="${strokeWidth}" />
</svg>`;
  return svg;
}

function buildRectPanelWithEdges(
  w: number,
  h: number,
  t: number,
  fingerW: number,
  autoFit: boolean,
  edges: {
    top?: { type: 'plain' } | { type: 'finger'; male: boolean } | { type: 'hinge'; mode: 'back' | 'lid'; clearance: number; kerf: number; hingeFingerW: number; countMode: 'auto' | 'manual'; manualCount?: number };
    right?: { type: 'plain' } | { type: 'finger'; male: boolean };
    bottom?: { type: 'plain' } | { type: 'finger'; male: boolean };
    left?: { type: 'plain' } | { type: 'finger'; male: boolean };
  }
): Pt[] {
  const topNormal = pt(0, -1);
  const rightNormal = pt(1, 0);
  const bottomNormal = pt(0, 1);
  const leftNormal = pt(-1, 0);

  const p0 = pt(0, 0);

  // Top edge (left -> right)
  let pts: Pt[] = [p0];
  let topEdge: Pt[];
  const top = edges.top ?? { type: 'plain' };
  if (top.type === 'finger') {
    topEdge = fingerEdge(p0, pt(1, 0), topNormal, w, t, fingerW, autoFit, top.male, true);
  } else if (top.type === 'hinge') {
    topEdge = hingeEdge(
      p0,
      pt(1, 0),
      topNormal,
      w,
      t,
      top.clearance,
      top.kerf,
      top.hingeFingerW,
      top.mode,
      top.countMode,
      top.manualCount
    );
  } else {
    topEdge = [p0, pt(w, 0)];
  }
  pts = topEdge;

  // Right edge (top -> bottom)
  const pr = pts[pts.length - 1];
  const right = edges.right ?? { type: 'plain' };
  let rightEdge: Pt[];
  if (right.type === 'finger') {
    rightEdge = fingerEdge(pr, pt(0, 1), rightNormal, h, t, fingerW, autoFit, right.male, true);
  } else {
    rightEdge = [pr, pt(w, h)];
  }
  pts = pts.concat(rightEdge.slice(1));

  // Bottom edge (right -> left)
  const pb = pts[pts.length - 1];
  const bottom = edges.bottom ?? { type: 'plain' };
  let bottomEdge: Pt[];
  if (bottom.type === 'finger') {
    bottomEdge = fingerEdge(pb, pt(-1, 0), bottomNormal, w, t, fingerW, autoFit, bottom.male, true);
  } else {
    bottomEdge = [pb, pt(0, h)];
  }
  pts = pts.concat(bottomEdge.slice(1));

  // Left edge (bottom -> top)
  const pl = pts[pts.length - 1];
  const left = edges.left ?? { type: 'plain' };
  let leftEdge: Pt[];
  if (left.type === 'finger') {
    leftEdge = fingerEdge(pl, pt(0, -1), leftNormal, h, t, fingerW, autoFit, left.male, true);
  } else {
    leftEdge = [pl, pt(0, 0)];
  }
  pts = pts.concat(leftEdge.slice(1));

  return pts;
}

export function generateHingedBoxSvgs(options: HingedBoxOptions): HingedBoxSvgs {
  const W = clamp(options.widthMm, 10, 2000);
  const D = clamp(options.depthMm, 10, 2000);
  const H = clamp(options.heightMm, 10, 2000);
  const t = clamp(options.thicknessMm, 1, 50);
  const kerf = clamp(options.kerfMm, 0, 1);

  const fingerW = clamp(options.fingerWidthMm, 2, 200);
  const autoFit = options.autoFitFingers;

  const hingeFingerW = clamp(options.hingeFingerWidthMm, 2, 200);
  const hingeClear = clamp(options.hingeClearanceMm, 0, 2);

  const countMode = options.hingeFingerCountMode;
  const manualCount = options.hingeFingerCount;

  // Finger joint polarity convention for v1:
  // - Walls have MALE fingers on edges that connect to other walls/bottom.
  // - Bottom has FEMALE (recess) on all edges.
  // - Side panels are FEMALE on front/back edges to mate with front/back MALE.

  const frontPts = buildRectPanelWithEdges(W, H, t, fingerW, autoFit, {
    top: { type: 'plain' },
    right: { type: 'finger', male: true },
    bottom: { type: 'finger', male: true },
    left: { type: 'finger', male: true },
  });

  const backPts = buildRectPanelWithEdges(W, H, t, fingerW, autoFit, {
    top: {
      type: 'hinge',
      mode: 'back',
      clearance: hingeClear,
      kerf,
      hingeFingerW,
      countMode,
      manualCount,
    },
    right: { type: 'finger', male: true },
    bottom: { type: 'finger', male: true },
    left: { type: 'finger', male: true },
  });

  // Side panels: female on the edges mating with front/back (x=0 and x=D), male on bottom.
  const leftPts = buildRectPanelWithEdges(D, H, t, fingerW, autoFit, {
    top: { type: 'plain' },
    right: { type: 'finger', male: false },
    bottom: { type: 'finger', male: true },
    left: { type: 'finger', male: false },
  });

  const rightPts = buildRectPanelWithEdges(D, H, t, fingerW, autoFit, {
    top: { type: 'plain' },
    right: { type: 'finger', male: false },
    bottom: { type: 'finger', male: true },
    left: { type: 'finger', male: false },
  });

  const bottomPts = buildRectPanelWithEdges(W, D, t, fingerW, autoFit, {
    top: { type: 'finger', male: false },
    right: { type: 'finger', male: false },
    bottom: { type: 'finger', male: false },
    left: { type: 'finger', male: false },
  });

  const lidPts = buildRectPanelWithEdges(W, D, t, fingerW, autoFit, {
    top: {
      type: 'hinge',
      mode: 'lid',
      clearance: hingeClear,
      kerf,
      hingeFingerW,
      countMode,
      manualCount,
    },
    right: { type: 'plain' },
    bottom: { type: 'plain' },
    left: { type: 'plain' },
  });

  return {
    front: panelSvg(frontPts),
    back: panelSvg(backPts),
    left: panelSvg(leftPts),
    right: panelSvg(rightPts),
    bottom: panelSvg(bottomPts),
    lid: panelSvg(lidPts),
  };
}
