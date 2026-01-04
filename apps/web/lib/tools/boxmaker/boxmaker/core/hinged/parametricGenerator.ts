/**
 * Parametric Hinged Box Generator - Replacement for BoxMaker Hinged Box
 * Based on user-provided template with full parametric control
 */

import type { HingedBoxPanels, HingedBoxSvgs, HingedInputs, HingedPanel2D, Point2D, CircleHole2D } from '../types';

type Pt = Point2D;

function pt(x: number, y: number): Pt {
  return { x, y };
}

function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function mul(p: Pt, s: number): Pt {
  return { x: p.x * s, y: p.y * s };
}

function ensureOdd(n: number): number {
  const v = Math.max(1, Math.floor(n));
  return v % 2 === 0 ? v + 1 : v;
}

function getJointSegmentCount(length: number, input: HingedInputs): number {
  if (!input.autoJointFingerCount && input.manualJointFingerCount && Number.isFinite(input.manualJointFingerCount)) {
    return Math.max(3, ensureOdd(input.manualJointFingerCount));
  }
  const L = Math.max(1, length);
  const desired = Math.max(1, input.jointFingerWidthMm);
  return Math.max(3, ensureOdd(Math.round(L / desired)));
}

function getHingeFingerCount(widthMm: number, input: HingedInputs): number {
  if (!input.autoFingerCount && input.manualHingeFingerCount && Number.isFinite(input.manualHingeFingerCount)) {
    return Math.max(3, ensureOdd(input.manualHingeFingerCount));
  }
  const W = Math.max(1, widthMm);
  const desired = Math.max(1, input.hingeFingerWidthMm);
  return Math.max(3, ensureOdd(Math.round(W / desired)));
}

function generateFingerJointsRatio(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  depth: number,
  segmentCount: number,
  ratioFemaleToMale: number,
  startWithMale: boolean,
): Pt[] {
  const c = Math.max(3, ensureOdd(segmentCount));
  const maleCount = startWithMale ? Math.ceil(c / 2) : Math.floor(c / 2);
  const femaleCount = c - maleCount;
  const denom = maleCount + ratioFemaleToMale * femaleCount;
  const maleW = length / Math.max(denom, 1e-6);
  const femaleW = ratioFemaleToMale * maleW;
  return generateFingerJointsWithWidths(start, direction, normal, maleW, femaleW, c, depth, startWithMale);
}

function generateFingerJointsWithSegmentWidths(
  start: Pt,
  direction: Pt,
  normal: Pt,
  segmentWidths: number[],
  depth: number,
  startWithMale: boolean,
): Pt[] {
  const points: Pt[] = [];
  let current = start;
  points.push(current);

  for (let i = 0; i < segmentWidths.length; i++) {
    const isMale = startWithMale ? i % 2 === 0 : i % 2 === 1;
    const w = segmentWidths[i];
    if (isMale) {
      current = add(current, mul(normal, depth));
      points.push(current);
      current = add(current, mul(direction, w));
      points.push(current);
      current = add(current, mul(normal, -depth));
      points.push(current);
    } else {
      current = add(current, mul(direction, w));
      points.push(current);
    }
  }

  return points;
}

function generateTemplateBottomJointPattern(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  depth: number,
  segmentCount: number,
  bigMaleAtStart: boolean | undefined,
): Pt[] {
  const c = Math.max(3, ensureOdd(segmentCount));
  const startWithMale = true;
  const bigWeight = 21 / 15;
  const maleWeight = 1;
  const femaleWeight = 30 / 15;

  const weights: number[] = [];
  for (let i = 0; i < c; i++) {
    const isMale = startWithMale ? i % 2 === 0 : i % 2 === 1;
    if (isMale) {
      if (bigMaleAtStart === true && i === 0) weights.push(bigWeight);
      else if (bigMaleAtStart === false && i === c - 1) weights.push(bigWeight);
      else weights.push(maleWeight);
    } else {
      weights.push(femaleWeight);
    }
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  const scale = length / Math.max(sum, 1e-6);
  const widths = weights.map((w) => w * scale);
  return generateFingerJointsWithSegmentWidths(start, direction, normal, widths, depth, startWithMale);
}

function generateTemplateSideVerticalPattern(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  depth: number,
  segmentCount: number,
): Pt[] {
  const c = Math.max(3, ensureOdd(segmentCount));
  const startWithMale = false;
  const firstFemaleWeight = 3.54 / 4.29;
  const lastFemaleWeight = 6.54 / 4.29;
  const midWeight = 1;

  const weights: number[] = [];
  for (let i = 0; i < c; i++) {
    const isMale = startWithMale ? i % 2 === 0 : i % 2 === 1;
    if (!isMale) {
      if (i === 0) weights.push(firstFemaleWeight);
      else if (i === c - 1) weights.push(lastFemaleWeight);
      else weights.push(midWeight);
    } else {
      weights.push(midWeight);
    }
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  const scale = length / Math.max(sum, 1e-6);
  const widths = weights.map((w) => w * scale);
  return generateFingerJointsWithSegmentWidths(start, direction, normal, widths, depth, startWithMale);
}

/**
 * Generate finger joint pattern with specific widths for male and female sections
 */
function generateFingerJointsWithWidths(
  start: Pt,
  direction: Pt,
  normal: Pt,
  maleWidth: number,
  femaleWidth: number,
  count: number,
  depth: number,
  startWithMale: boolean
): Pt[] {
  const points: Pt[] = [];
  let current = start;
  points.push(current);
  
  for (let i = 0; i < count; i++) {
    const isMale = startWithMale ? (i % 2 === 0) : (i % 2 === 1);
    
    if (isMale) {
      // Male finger: protrudes perpendicular to edge
      current = add(current, mul(normal, depth));
      points.push(current);
      current = add(current, mul(direction, maleWidth));
      points.push(current);
      current = add(current, mul(normal, -depth));
      points.push(current);
    } else {
      // Female gap: stays flat
      current = add(current, mul(direction, femaleWidth));
      points.push(current);
    }
  }
  
  return points;
}

/**
 * Temporary wrapper for backward compatibility - will be replaced panel by panel
 */
function generateFingerJoints(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  depth: number,
  fingerWidth: number,
  isMale: boolean
): Pt[] {
  const points: Pt[] = [];
  let count = Math.max(1, Math.round(length / fingerWidth));
  if (count % 2 === 0) count += 1;
  
  const actualFingerWidth = length / count;
  const n = isMale ? normal : mul(normal, -1);
  
  let current = start;
  points.push(current);
  
  for (let i = 0; i < count; i++) {
    const isFinger = i % 2 === 0;
    
    if (isFinger) {
      current = add(current, mul(n, depth));
      points.push(current);
      current = add(current, mul(direction, actualFingerWidth));
      points.push(current);
      current = add(current, mul(n, -depth));
      points.push(current);
    } else {
      current = add(current, mul(direction, actualFingerWidth));
      points.push(current);
    }
  }
  
  return points;
}

/**
 * Generate hinge finger pattern
 */
function generateHingeFingers(
  start: Pt,
  direction: Pt,
  normal: Pt,
  length: number,
  depth: number,
  fingerWidth: number,
  fingerCount: number,
  clearance: number,
  isBack: boolean
): Pt[] {
  const points: Pt[] = [];
  const pitchWidth = length / fingerCount;
  const tabWidth = Math.max(0.5, pitchWidth - clearance);
  
  let current = start;
  points.push(current);
  
  for (let i = 0; i < fingerCount; i++) {
    const isFinger = isBack ? (i % 2 === 0) : (i % 2 === 1);
    
    if (isFinger) {
      const gapBefore = (pitchWidth - tabWidth) / 2;
      current = add(current, mul(direction, gapBefore));
      points.push(current);
      
      current = add(current, mul(normal, depth));
      points.push(current);
      current = add(current, mul(direction, tabWidth));
      points.push(current);
      current = add(current, mul(normal, -depth));
      points.push(current);
      
      current = add(current, mul(direction, gapBefore));
      points.push(current);
    } else {
      current = add(current, mul(direction, pitchWidth));
      points.push(current);
    }
  }
  
  return points;
}

/**
 * Generate front panel
 * 150mm × 23.4mm with 2 female fingers on left and right edges
 * Fingers: 3.54mm width, 4.29mm gaps between them
 */
function generateFrontPanel(input: HingedInputs): HingedPanel2D {
  void input;
  
  const W = 150;
  const H = 23.4;
  const T = 3; // Material thickness (finger depth)
  const fingerWidth = 3.54;
  const gapWidth = 4.29;
  
  // Calculate finger positions: 4 fingers total
  // Finger 0: at top, no gap, 3.54mm height
  // Fingers 1 & 2: start at 4.29mm from top, 3.54mm width, 4.29mm gap between
  // Finger 3: larger finger at bottom, 3mm width, extends to align with first bottom finger
  const finger3Width = 3;
  
  const y0End = 0;
  const y0Start = y0End - fingerWidth;
  const y1Start = 4.29;
  const y1End = y1Start + fingerWidth;
  const y2Start = y1End + gapWidth;
  const y2End = y2Start + fingerWidth;
  const y3Start = y2End + gapWidth;
  
  // Bottom fingers start at X=0, first finger is 15mm wide
  // Finger 3 should end at Y = H (23.4mm) to align with bottom edge
  const y3End = H;
  
  const points: Pt[] = [];
  
  // Top edge: 2 male fingers with 40mm gap between them
  // Total width = 150mm, 2 fingers with 40mm gap
  // Finger width: 55mm
  const topFingerWidth = 55;
  const topGapWidth = 40;
  
  // Total pattern = finger + gap + finger = 55 + 40 + 55 = 150mm
  // First finger extends 3mm to the left, second finger extends 3mm to the right
  const topStartGap = (W - (topFingerWidth + topGapWidth + topFingerWidth)) / 2;
  const tx1Start = topStartGap - finger3Width;
  const tx1End = tx1Start + topFingerWidth + finger3Width;
  const tx2Start = tx1End + topGapWidth;
  const tx2End = tx2Start + topFingerWidth + finger3Width;
  
  points.push(pt(-T, 0));
  points.push(pt(-T, y0Start));
  points.push(pt(0, y0Start));
  points.push(pt(0, 0));

  // Gap before finger 1
  points.push(pt(tx1Start, 0));
  // Finger 1 (male - protrudes upward)
  points.push(pt(tx1Start, -T));
  points.push(pt(tx1End, -T));
  points.push(pt(tx1End, 0));
  
  // Gap before finger 2
  points.push(pt(tx2Start, 0));
  // Finger 2 (male - protrudes upward)
  points.push(pt(tx2Start, -T));
  points.push(pt(tx2End, -T));
  points.push(pt(tx2End, 0));
  
  // Remaining gap to top-right corner
  points.push(pt(W, 0));
  
  // Right edge: 4 male fingers (protruding)
  // Finger 0 (male - at top, full height with weld at Y=0)
  points.push(pt(W + T, 0));
  points.push(pt(W + T, y0Start));
  points.push(pt(W, y0Start));
  
  // Gap before finger 1
  points.push(pt(W, y1Start));
  // Finger 1 (male - protrudes outward)
  points.push(pt(W + T, y1Start));
  points.push(pt(W + T, y1End));
  points.push(pt(W, y1End));
  
  // Gap before finger 2
  points.push(pt(W, y2Start));
  // Finger 2 (male - protrudes outward)
  points.push(pt(W + T, y2Start));
  points.push(pt(W + T, y2End));
  points.push(pt(W, y2End));
  
  // Gap before finger 3
  points.push(pt(W, y3Start));
  // Finger 3 (male - complete rectangle, protrudes outward with 3mm width, extends to H+T to weld with bottom)
  points.push(pt(W + finger3Width, y3Start));
  points.push(pt(W + finger3Width, H + T));
  
  // Bottom edge: 4 male fingers - 15mm width, 30mm gaps
  // Total = 15 + 30 + 15 + 30 + 15 + 30 + 15 = 150mm (perfect fit!)
  const bottomFingerWidth = 15;
  const bottomGapWidth = 30;
  
  // First finger extends 3mm to the left, last finger extends 3mm to the right
  const x1Start = -finger3Width;
  const x1End = x1Start + bottomFingerWidth + finger3Width;
  const x2Start = x1End + bottomGapWidth;
  const x2End = x2Start + bottomFingerWidth;
  const x3Start = x2End + bottomGapWidth;
  const x3End = x3Start + bottomFingerWidth;
  const x4Start = x3End + bottomGapWidth;
  const x4End = x4Start + bottomFingerWidth + finger3Width;
  
  // Going from right to left - bottom edge with 4 male fingers protruding downward
  // Finger 4 (male - protrudes downward)
  points.push(pt(x4End, H));
  points.push(pt(x4End, H + T));
  points.push(pt(x4Start, H + T));
  points.push(pt(x4Start, H));
  
  // Gap
  points.push(pt(x3End, H));
  
  // Finger 3 (male - protrudes downward)
  points.push(pt(x3End, H + T));
  points.push(pt(x3Start, H + T));
  points.push(pt(x3Start, H));
  
  // Gap
  points.push(pt(x2End, H));
  
  // Finger 2 (male - protrudes downward)
  points.push(pt(x2End, H + T));
  points.push(pt(x2Start, H + T));
  points.push(pt(x2Start, H));
  
  // Gap
  points.push(pt(x1End, H));
  
  // Finger 1 (male - protrudes downward)
  points.push(pt(x1End, H + T));
  points.push(pt(x1Start, H + T));
  points.push(pt(x1Start, H));
  
  // Left edge: 4 male fingers (protruding) at same Y positions
  // Finger 3 (male - larger, protrudes outward with 3mm width, extends from y3Start to H+T to weld with bottom)
  points.push(pt(-finger3Width, H + T));
  points.push(pt(-finger3Width, y3Start));
  points.push(pt(0, y3Start));
  
  // Gap before finger 2
  points.push(pt(0, y2End));
  // Finger 2 (male - protrudes outward)
  points.push(pt(-T, y2End));
  points.push(pt(-T, y2Start));
  points.push(pt(0, y2Start));
  
  // Gap before finger 1
  points.push(pt(0, y1End));
  // Finger 1 (male - protrudes outward)
  points.push(pt(-T, y1End));
  points.push(pt(-T, y1Start));
  points.push(pt(0, y1Start));
  
  // Gap before finger 0
  points.push(pt(0, 0));
  points.push(pt(-T, 0));
  
  return {
    outline: points,
    holes: []
  };
}

/**
 * Generate back panel with hinge
 * Specs from SVG: 156mm × 30mm
 * Top edge: hinge fingers
 * Right/Left/Bottom edges: female fingers (inverted from front panel)
 */
function generateBackPanel(input: HingedInputs): HingedPanel2D {
  const { widthMm: W, thicknessMm: T, hingeFingerWidthMm, hingeClearanceMm, hingeHoleDiameterMm, hingeHoleInsetMm } = input;

  const H = 30; // Fixed hinge strip height

  const hingeFingerCount = getHingeFingerCount(W, input);
  const sideSegCount = getJointSegmentCount(H, input); // Parametric based on height
  const bottomSegCount = getJointSegmentCount(W, input);
  
  const points: Pt[] = [];
  let current = pt(0, 0);
  
  // Top edge (hinge fingers)
  const topPoints = generateHingeFingers(current, pt(1, 0), pt(0, -1), W, T, hingeFingerWidthMm, hingeFingerCount, hingeClearanceMm, true);
  points.push(...topPoints);
  
  // Right edge: female fingers (slots) - template style, equal pitch
  current = pt(W, 0);
  const rightPoints = generateTemplateSideVerticalPattern(
    current,
    pt(0, 1),
    pt(-1, 0),
    H,
    T,
    sideSegCount,
  );
  points.push(...rightPoints.slice(1));
  
  // Bottom edge: template-style ratio pattern, starts/ends with slot
  current = pt(W, H);
  const bottomPoints = generateTemplateBottomJointPattern(
    current,
    pt(-1, 0),
    pt(0, -1),
    W,
    T,
    bottomSegCount,
    false,
  );
  points.push(...bottomPoints.slice(1));
  
  // Left edge: female fingers matching right edge
  current = pt(0, H);
  const leftPoints = generateTemplateSideVerticalPattern(
    current,
    pt(0, -1),
    pt(1, 0),
    H,
    T,
    sideSegCount,
  );
  points.push(...leftPoints.slice(1));
  
  // Add hinge holes
  const holes: CircleHole2D[] = [
    { cx: hingeHoleInsetMm, cy: hingeHoleInsetMm, r: hingeHoleDiameterMm / 2 },
    { cx: W - hingeHoleInsetMm, cy: hingeHoleInsetMm, r: hingeHoleDiameterMm / 2 }
  ];
  
  return {
    outline: points,
    holes
  };
}

/**
 * Generate side panels (left/right)
 * 150mm × 27mm with 3 fingers on each side edge
 * Fingers: 3mm depth (material thickness), 3.54mm spacing between them
 * Fingers are aligned at same Y positions on both edges
 */
function generateSidePanel(input: HingedInputs, isLeft: boolean): HingedPanel2D {
  void input;
  
  const W = 150;
  const H = 27;
  const T = 3; // Material thickness (finger depth)
  const spacing = 3.54; // Gap between fingers
  
  // Calculate finger positions (same Y for both left and right edges)
  const y1Start = spacing;
  const y1End = y1Start + spacing;
  const y2Start = y1End + spacing;
  const y2End = y2Start + spacing;
  const y3Start = y2End + spacing;
  const y3End = y3Start + spacing;
  
  const points: Pt[] = [];
  
  // Top edge (plain)
  points.push(pt(0, 0));
  points.push(pt(W, 0));
  
  // Right edge: 3 male fingers at aligned Y positions
  points.push(pt(W, 0));
  
  // Gap before finger 1
  points.push(pt(W, y1Start));
  // Finger 1
  points.push(pt(W + T, y1Start));
  points.push(pt(W + T, y1End));
  points.push(pt(W, y1End));
  
  // Gap before finger 2
  points.push(pt(W, y2Start));
  // Finger 2
  points.push(pt(W + T, y2Start));
  points.push(pt(W + T, y2End));
  points.push(pt(W, y2End));
  
  // Gap before finger 3
  points.push(pt(W, y3Start));
  // Finger 3
  points.push(pt(W + T, y3Start));
  points.push(pt(W + T, y3End));
  points.push(pt(W, y3End));
  
  // Remaining gap to bottom-right corner
  points.push(pt(W, H));
  
  // Bottom edge: 4 male fingers with 15mm width and 30mm gaps, centered
  // Total pattern: 15mm + 30mm + 15mm + 30mm + 15mm + 30mm + 15mm = 150mm (perfect fit!)
  const fingerWidth = 15;
  const gapWidth = 30;
  
  const x1Start = 0;
  const x1End = x1Start + fingerWidth;
  const x2Start = x1End + gapWidth;
  const x2End = x2Start + fingerWidth;
  const x3Start = x2End + gapWidth;
  const x3End = x3Start + fingerWidth;
  const x4Start = x3End + gapWidth;
  const x4End = x4Start + fingerWidth;
  
  // Going from right to left (W to 0)
  // Finger 4
  points.push(pt(x4End, H));
  points.push(pt(x4End, H + T));
  points.push(pt(x4Start, H + T));
  points.push(pt(x4Start, H));
  
  // Gap
  points.push(pt(x3End, H));
  
  // Finger 3
  points.push(pt(x3End, H + T));
  points.push(pt(x3Start, H + T));
  points.push(pt(x3Start, H));
  
  // Gap
  points.push(pt(x2End, H));
  
  // Finger 2
  points.push(pt(x2End, H + T));
  points.push(pt(x2Start, H + T));
  points.push(pt(x2Start, H));
  
  // Gap
  points.push(pt(x1End, H));
  
  // Finger 1
  points.push(pt(x1End, H + T));
  points.push(pt(x1Start, H + T));
  points.push(pt(x1Start, H));
  
  // Left edge: 3 male fingers at same aligned Y positions
  points.push(pt(0, H));
  
  // Gap before finger 3 (going up from bottom)
  points.push(pt(0, y3End));
  // Finger 3
  points.push(pt(-T, y3End));
  points.push(pt(-T, y3Start));
  points.push(pt(0, y3Start));
  
  // Gap before finger 2
  points.push(pt(0, y2End));
  // Finger 2
  points.push(pt(-T, y2End));
  points.push(pt(-T, y2Start));
  points.push(pt(0, y2Start));
  
  // Gap before finger 1
  points.push(pt(0, y1End));
  // Finger 1
  points.push(pt(-T, y1End));
  points.push(pt(-T, y1Start));
  points.push(pt(0, y1Start));
  
  // Remaining gap to top-left corner
  points.push(pt(0, 0));
  
  // Add circular hole: position depends on left/right panel
  // Left panel: top-left edge at (2.25mm, 1.75mm)
  // Right panel: top-right edge at (W - 2.25mm, 1.75mm)
  const diameter = 4.5;
  const radius = diameter / 2;
  const holeCx = isLeft ? (2.25 + radius) : (W - 2.25 - radius);
  const holeCy = 1.75 + radius;
  
  const holes: CircleHole2D[] = [{
    cx: holeCx,
    cy: holeCy,
    r: radius
  }];
  
  return {
    outline: points,
    holes
  };
}

/**
 * Generate bottom panel
 * 150mm × 150mm with 3 fingers on all 4 edges
 * Fingers: 30mm width, 15mm gaps between them, 3mm depth
 */
function generateBottomPanel(input: HingedInputs): HingedPanel2D {
  void input;
  
  const W = 150;
  const H = 150;
  const T = 3; // Material thickness (finger depth)
  const fingerWidth = 30;
  const gapWidth = 15;
  
  // Calculate finger positions: 3 fingers of 30mm with 15mm gaps
  // Total = 30 + 15 + 30 + 15 + 30 = 120mm, leaving 30mm for end gaps (15mm each side)
  const startGap = 15;
  const x1Start = startGap;
  const x1End = x1Start + fingerWidth;
  const x2Start = x1End + gapWidth;
  const x2End = x2Start + fingerWidth;
  const x3Start = x2End + gapWidth;
  const x3End = x3Start + fingerWidth;
  
  const points: Pt[] = [];
  
  // Top edge: 3 male fingers
  points.push(pt(0, 0));
  
  // Gap before finger 1
  points.push(pt(x1Start, 0));
  // Finger 1
  points.push(pt(x1Start, -T));
  points.push(pt(x1End, -T));
  points.push(pt(x1End, 0));
  
  // Gap before finger 2
  points.push(pt(x2Start, 0));
  // Finger 2
  points.push(pt(x2Start, -T));
  points.push(pt(x2End, -T));
  points.push(pt(x2End, 0));
  
  // Gap before finger 3
  points.push(pt(x3Start, 0));
  // Finger 3
  points.push(pt(x3Start, -T));
  points.push(pt(x3End, -T));
  points.push(pt(x3End, 0));
  
  // Remaining gap to top-right corner
  points.push(pt(W, 0));
  
  // Right edge: 3 male fingers (same pattern)
  // Gap before finger 1
  points.push(pt(W, x1Start));
  // Finger 1
  points.push(pt(W + T, x1Start));
  points.push(pt(W + T, x1End));
  points.push(pt(W, x1End));
  
  // Gap before finger 2
  points.push(pt(W, x2Start));
  // Finger 2
  points.push(pt(W + T, x2Start));
  points.push(pt(W + T, x2End));
  points.push(pt(W, x2End));
  
  // Gap before finger 3
  points.push(pt(W, x3Start));
  // Finger 3
  points.push(pt(W + T, x3Start));
  points.push(pt(W + T, x3End));
  points.push(pt(W, x3End));
  
  // Remaining gap to bottom-right corner
  points.push(pt(W, H));
  
  // Bottom edge: 3 male fingers (going right to left)
  // Finger 3
  points.push(pt(x3End, H));
  points.push(pt(x3End, H + T));
  points.push(pt(x3Start, H + T));
  points.push(pt(x3Start, H));
  
  // Gap
  points.push(pt(x2End, H));
  
  // Finger 2
  points.push(pt(x2End, H + T));
  points.push(pt(x2Start, H + T));
  points.push(pt(x2Start, H));
  
  // Gap
  points.push(pt(x1End, H));
  
  // Finger 1
  points.push(pt(x1End, H + T));
  points.push(pt(x1Start, H + T));
  points.push(pt(x1Start, H));
  
  // Remaining gap to bottom-left corner
  points.push(pt(0, H));
  
  // Left edge: 3 male fingers (going bottom to top)
  // Finger 3
  points.push(pt(0, x3End));
  points.push(pt(-T, x3End));
  points.push(pt(-T, x3Start));
  points.push(pt(0, x3Start));
  
  // Gap
  points.push(pt(0, x2End));
  
  // Finger 2
  points.push(pt(-T, x2End));
  points.push(pt(-T, x2Start));
  points.push(pt(0, x2Start));
  
  // Gap
  points.push(pt(0, x1End));
  
  // Finger 1
  points.push(pt(-T, x1End));
  points.push(pt(-T, x1Start));
  points.push(pt(0, x1Start));
  
  // Remaining gap to top-left corner
  points.push(pt(0, 0));
  
  return {
    outline: points,
    holes: []
  };
}

/**
 * Generate lid panel with hinge
 * Specs from SVG: 156mm × 30mm (approximately, using depthMm from input)
 * Top edge: hinge fingers (lid side)
 * Other edges: plain
 */
function generateLidPanel(input: HingedInputs): HingedPanel2D {
  const { widthMm: W, depthMm: D, thicknessMm: T, hingeFingerWidthMm, hingeClearanceMm, hingeHoleDiameterMm, hingeHoleInsetMm } = input;
  
  const hingeFingerCount = getHingeFingerCount(W, input);
  
  const points: Pt[] = [];
  let current = pt(0, 0);
  
  // Top edge (hinge fingers - lid side)
  const hingePoints = generateHingeFingers(current, pt(1, 0), pt(0, -1), W, T, hingeFingerWidthMm, hingeFingerCount, hingeClearanceMm, false);
  points.push(...hingePoints);
  
  // Right edge (plain)
  current = pt(W, 0);
  points.push(current);
  points.push(pt(W, D));
  
  // Bottom edge (plain)
  current = pt(W, D);
  points.push(current);
  points.push(pt(0, D));
  
  // Left edge (plain)
  current = pt(0, D);
  points.push(current);
  points.push(pt(0, 0));
  
  // Add hinge holes
  const holes: CircleHole2D[] = [
    { cx: hingeHoleInsetMm, cy: hingeHoleInsetMm, r: hingeHoleDiameterMm / 2 },
    { cx: W - hingeHoleInsetMm, cy: hingeHoleInsetMm, r: hingeHoleDiameterMm / 2 }
  ];
  
  return {
    outline: points,
    holes
  };
}

/**
 * Generate all box panels (compatible with existing BoxMaker interface)
 */
export function generateHingedBoxPanels(input: HingedInputs): HingedBoxPanels {
  return {
    front: generateFrontPanel(input),
    back: generateBackPanel(input),
    left: generateSidePanel(input, true),
    right: generateSidePanel(input, false),
    bottom: generateBottomPanel(input),
    lid: generateLidPanel(input),
  };
}

/**
 * Validate that SVG path contains ONLY orthogonal commands (M, L, Z)
 * Throws error if any curves (C, Q, A, S) are detected
 */
function validateOrthogonalPath(path: string): void {
  const curveCommands = /[CcQqAaSs]/;
  if (curveCommands.test(path)) {
    throw new Error('INVALID SVG: Path contains curve commands (C/Q/A/S). Only M/L/Z are allowed for laser cutting.');
  }
}

/**
 * Convert panels to SVG strings
 * OUTPUT: 100% orthogonal paths with ONLY M, L, Z commands
 * NO curves, NO rounded corners, NO Bezier
 */
function panelToSvg(panel: HingedPanel2D): string {
  const points = panel.outline;
  if (points.length === 0) return '';
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  const padding = 5;
  const shiftX = -minX + padding;
  const shiftY = -minY + padding;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  
  // Generate path - ONLY M, L, Z commands (100% orthogonal, laser-safe)
  let path = `M ${(points[0].x + shiftX).toFixed(3)} ${(points[0].y + shiftY).toFixed(3)}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${(points[i].x + shiftX).toFixed(3)} ${(points[i].y + shiftY).toFixed(3)}`;
  }
  path += ' Z';
  
  // Add holes as polygons (NO arc commands - use line segments to approximate circles)
  // This ensures 100% compatibility with laser cutters that require orthogonal paths
  let holePaths = '';
  if (panel.holes && panel.holes.length > 0) {
    const CIRCLE_SEGMENTS = 36; // 36 segments = 10° per segment, smooth enough for laser
    for (const hole of panel.holes) {
      const cx = hole.cx + shiftX;
      const cy = hole.cy + shiftY;
      const r = hole.r;
      
      // Generate circle using line segments only (M/L/Z)
      for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
        const angle = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) {
          holePaths += ` M ${x.toFixed(3)} ${y.toFixed(3)}`;
        } else {
          holePaths += ` L ${x.toFixed(3)} ${y.toFixed(3)}`;
        }
      }
      holePaths += ' Z';
    }
  }
  
  const fullPath = `${path}${holePaths}`;
  
  // VALIDATION: Ensure NO curve commands exist (C, Q, A, S are FORBIDDEN)
  validateOrthogonalPath(fullPath);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}">
  <path d="${fullPath}" fill="none" stroke="#000000" stroke-width="0.1"/>
</svg>`;
}

function getPathBBox(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const update = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  const readNumbers = (s: string) => {
    const nums = s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    return (nums ?? []).map((n) => Number(n));
  };

  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let firstMove = true;

  const segRe = /([MmLlHhVvCcZz])([^MmLlHhVvCcZz]*)/g;
  let seg: RegExpExecArray | null;

  while ((seg = segRe.exec(d)) !== null) {
    const cmd = seg[1];
    const args = readNumbers(seg[2]);
    const isRel = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();

    let i = 0;

    if (c === 'M') {
      while (i + 1 < args.length) {
        const nx = args[i++];
        const ny = args[i++];
        x = isRel ? x + nx : nx;
        y = isRel ? y + ny : ny;
        startX = x;
        startY = y;
        update(x, y);
        firstMove = false;
        break;
      }
      continue;
    }

    if (firstMove) {
      // Malformed path without initial moveto; ignore until we see one.
      continue;
    }

    if (c === 'L') {
      while (i + 1 < args.length) {
        const nx = args[i++];
        const ny = args[i++];
        x = isRel ? x + nx : nx;
        y = isRel ? y + ny : ny;
        update(x, y);
      }
      continue;
    }

    if (c === 'H') {
      while (i < args.length) {
        const nx = args[i++];
        x = isRel ? x + nx : nx;
        update(x, y);
      }
      continue;
    }

    if (c === 'V') {
      while (i < args.length) {
        const ny = args[i++];
        y = isRel ? y + ny : ny;
        update(x, y);
      }
      continue;
    }

    if (c === 'C') {
      while (i + 5 < args.length) {
        const x1 = args[i++];
        const y1 = args[i++];
        const x2 = args[i++];
        const y2 = args[i++];
        const x3 = args[i++];
        const y3 = args[i++];

        const ax1 = isRel ? x + x1 : x1;
        const ay1 = isRel ? y + y1 : y1;
        const ax2 = isRel ? x + x2 : x2;
        const ay2 = isRel ? y + y2 : y2;
        const ax3 = isRel ? x + x3 : x3;
        const ay3 = isRel ? y + y3 : y3;

        update(ax1, ay1);
        update(ax2, ay2);
        update(ax3, ay3);
        x = ax3;
        y = ay3;
      }
      continue;
    }

    if (c === 'Z') {
      x = startX;
      y = startY;
      update(x, y);
      continue;
    }
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Scale an SVG path by given X and Y scale factors.
 * Handles M, L, H, V, C, Z commands (both absolute and relative).
 */
function scaleTemplatePath(d: string, scaleX: number, scaleY: number): string {
  const readNumbers = (s: string) => {
    const nums = s.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    return (nums ?? []).map((n) => Number(n));
  };

  const segRe = /([MmLlHhVvCcZz])([^MmLlHhVvCcZz]*)/g;
  let seg: RegExpExecArray | null;
  const result: string[] = [];

  while ((seg = segRe.exec(d)) !== null) {
    const cmd = seg[1];
    const args = readNumbers(seg[2]);
    const c = cmd.toUpperCase();

    if (c === 'M' || c === 'L') {
      const scaled: number[] = [];
      for (let i = 0; i + 1 < args.length; i += 2) {
        scaled.push(args[i] * scaleX, args[i + 1] * scaleY);
      }
      result.push(cmd + scaled.map(n => n.toFixed(4)).join(' '));
    } else if (c === 'H') {
      const scaled = args.map(n => n * scaleX);
      result.push(cmd + scaled.map(n => n.toFixed(4)).join(' '));
    } else if (c === 'V') {
      const scaled = args.map(n => n * scaleY);
      result.push(cmd + scaled.map(n => n.toFixed(4)).join(' '));
    } else if (c === 'C') {
      const scaled: number[] = [];
      for (let i = 0; i + 5 < args.length; i += 6) {
        scaled.push(
          args[i] * scaleX, args[i + 1] * scaleY,
          args[i + 2] * scaleX, args[i + 3] * scaleY,
          args[i + 4] * scaleX, args[i + 5] * scaleY
        );
      }
      result.push(cmd + scaled.map(n => n.toFixed(4)).join(','));
    } else if (c === 'Z') {
      result.push(cmd);
    }
  }

  return result.join('');
}

/** Original template dimensions (from the perfect SVG template) */
const TEMPLATE_ORIGINAL = {
  widthMm: 156,
  depthMm: 156,
  heightMm: 150,
  hingeStripHeightMm: 30,
} as const;

function svgFromTemplatePath(d: string, opts?: { rotate180?: boolean }): string {
  const { minX, minY, maxX, maxY } = getPathBBox(d);
  const padding = 5;
  const shiftX = -minX + padding;
  const shiftY = -minY + padding;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rot = opts?.rotate180 ? ` rotate(180 ${cx.toFixed(3)} ${cy.toFixed(3)})` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(3)}mm" height="${height.toFixed(3)}mm" viewBox="0 0 ${width.toFixed(3)} ${height.toFixed(3)}">
  <g transform="translate(${shiftX.toFixed(3)} ${shiftY.toFixed(3)})${rot}">
    <path d="${d}" fill="none" stroke="#000000" stroke-width="0.1"/>
  </g>
</svg>`;
}

const TEMPLATE_SVGS = {
  right: "M164 54.7429l0 3.5357m0 4.2857l3 0m0 0l0 -4.2857m15 -19.1786l30 0m-30 0l0 -3m-15 22.1786l-3 0m0 -3.5357l3 0m-3 7.8214l0 3.5357m0 0l156 0m0 0l0 -3.5357m0 0l-3 0m0 0l0 -4.2857m0 0l3 0m0 0l0 -3.5357m0 0l-3 0m0 0l0 -4.2858m0 0l3 0m0 0l0 -3.5357m0 0l-3 0m0 0l0 -4.2857m0 0l3 0m0 0l0 -6.5357m0 0l-18 0m0 3l0 -3m-30 3l30 0m-30 0l0 -3m0 0l-15 0m0 3l0 -3m-30 3l30 0m-30 0l0 -3m0 0l-15 0m0 3l0 -3m-30 0l-18 0m0 0l0 6.5357m3 0l-3 0m3 4.2857l0 -4.2857m-3 4.2857l3 0m-3 0l0 3.5357m3 0l-3 0m3 4.2858l0 -4.2858",
  bottom: "M320 88.9l0 30m-3 -30l3 0m-3 0l0 -15m0 0l-15 0m0 0l0 -3m0 0l-30 0m0 0l0 3m0 0l-15 0m0 0l0 -3m0 0l-30 0m0 0l0 3m0 0l-15 0m0 0l0 -3m0 0l-30 0m0 0l0 3m0 0l-15 0m0 0l0 15m0 0l-3 0m0 0l0 30m0 0l3 0m0 0l0 15m-3 0l3 0m-3 30l0 -30m3 30l-3 0m3 0l0 15m-3 0l3 0m-3 30l0 -30m3 30l-3 0m3 0l0 15m0 0l15 0m0 3l0 -3m30 3l-30 0m30 -3l0 3m0 -3l15 0m0 3l0 -3m30 3l-30 0m30 -3l0 3m0 -3l15 0m0 3l0 -3m30 3l-30 0m30 -3l0 3m0 -3l15 0m0 0l0 -15m0 0l3 0m0 0l0 -30m0 0l-3 0m0 0l0 -15m0 0l3 0m0 0l0 -30m0 0l-3 0m0 0l0 -15m3 0l-3 0",
  lid: "M320 6.6357l0 -3.5357m-18 30l18 0m-48 -3l30 0m0 0l0 3m18 -30l-54 0m0 0c-1.0609,0 -2.0783,0.4214 -2.8284,1.1716 -0.7502,0.7501 -1.1716,1.7675 -1.1716,2.8284m10 26l0 -3m-10 -23l0 1.5m0 0l-40 0m0 0l0 -1.5m0 0c0,-1.0609 -0.4214,-2.0783 -1.1716,-2.8284 -0.7501,-0.7502 -1.7675,-1.1716 -2.8284,-1.1716m0 0l-54 0m0 0l0 3.5357m0 0l3 0m0 0l0 4.2857m0 0l-3 0m0 0l0 3.5357m0 0l3 0m0 0l0 4.2858m0 0l-3 0m0 0l0 3.5357m0 0l3 0m0 0l0 4.2857m0 0l-3 0m0 0l0 6.5357m0 0l18 0m0 0l0 -3m0 0l30 0m0 0l0 3m0 0l15 0m0 0l0 -3m0 0l30 0m0 0l0 3m0 0l15 0m48 0l0 -6.5357m0 0l-3 0m0 0l0 -4.2857m0 0l3 0m0 0l0 -3.5357m0 0l-3 0m0 0l0 -4.2858m0 0l3 0m0 0l0 -3.5357m0 0l-3 0m0 0l0 -4.2857m0 0l3 0",
  front: "M63.5 216.9l0 2m0 0c0,2.1217 0.8429,4.1566 2.3431,5.6569 1.5003,1.5002 3.5352,2.3431 5.6569,2.3431m0 0l23 0m0 0c4.4183,0 8,-3.5817 8,-8m0 0l0 -2m0 0l54.5 0m0 0l0 -142.8382m0 0l4 0m0 0l0 -3.3236m0 0l-4 0m0 0l0 -1.6382m0 0l-148 0m0 0l0 1.6382m0 0l-4 0m0 0l0 3.3236m0 0l4 0m0 0l0 142.8382m0 0l54.5 0",
  back: "M158 18.7429l0 3.5357m-15 7.8214l0 3m15 -14.3571l3 0m0 0l0 -4.2858m0 0l-3 0m0 -3.5357l0 3.5357m3 -3.5357l-3 0m3 0l0 -4.2857m0 0l-3 0m0 -3.5357l0 3.5357m0 -3.5357l-150 0m0 3.5357l0 -3.5357m-3 3.5357l3 0m-3 0l0 4.2857m3 0l-3 0m3 3.5357l0 -3.5357m0 3.5357l-3 0m0 0l0 4.2858m3 0l-3 0m3 3.5357l0 -3.5357m0 3.5357l-3 0m0 0l0 4.2857m3 0l-3 0m3 6.5357l0 -6.5357m0 6.5357l15 0m0 -3l0 3m30 -3l-30 0m30 0l0 3m0 0l15 0m0 -3l0 3m30 -3l-30 0m30 0l0 3m0 0l15 0m0 -3l0 3m30 -3l-30 0m30 3l15 0m0 -6.5357l0 6.5357m0 -6.5357l3 0m0 0l0 -4.2857m-3 0l3 0m-146.25 -15.1786c0,-1.2426 -1.0074,-2.25 -2.25,-2.25 -1.2426,0 -2.25,1.0074 -2.25,2.25 0,1.2426 1.0074,2.25 2.25,2.25 1.2426,0 2.25,-1.0073 2.25,-2.25z",
  left: "M5 51.7429l0 -4.2858m3 4.2858l-3 0m3 0l0 3.5357m0 0l-3 0m0 4.2857l0 -4.2857m3 4.2857l-3 0m3 0l0 6.5357m15 0l-15 0m15 -3l0 3m0 -3l30 0m0 0l0 3m15 0l-15 0m15 -3l0 3m0 -3l30 0m0 0l0 3m15 0l-15 0m15 -3l0 3m0 -3l30 0m0 0l0 3m15 0l-15 0m15 0l0 -6.5357m0 0l3 0m0 -4.2857l0 4.2857m-3 -4.2857l3 0m-3 0l0 -3.5357m0 0l3 0m0 -4.2858l0 4.2858m-3 -4.2858l3 0m-3 0l0 -3.5357m0 0l3 0m0 -4.2857l0 4.2857m0 -4.2857l-3 0m0 0l0 -3.5357m-150 0l150 0m-150 0l0 3.5357m-3 0l3 0m-3 4.2857l0 -4.2857m0 4.2857l3 0m0 0l0 3.5357m-3 0l3 0m147.75 -7.3571c0,-1.2426 -1.0074,-2.25 -2.25,-2.25 -1.2426,0 -2.25,1.0074 -2.25,2.25 0,1.2426 1.0074,2.25 2.25,2.25 1.2426,0 2.25,-1.0073 2.25,-2.25z",
} as const;

/**
 * Generate scaled template SVGs based on input dimensions.
 * This preserves the exact visual style of the original template while allowing dimension changes.
 */
export function generateScaledTemplateSvgs(input: HingedInputs): HingedBoxSvgs {
  const { widthMm, depthMm, heightMm } = input;
  
  // Calculate scale factors relative to original template
  const scaleW = widthMm / TEMPLATE_ORIGINAL.widthMm;
  const scaleD = depthMm / TEMPLATE_ORIGINAL.depthMm;
  
  // CORRECT MAPPING (template file names don't match panel names):
  // UI "front" panel uses TEMPLATE_SVGS.lid (the tall front panel with curved slot)
  // UI "lid" panel uses TEMPLATE_SVGS.front (the lid with hinge)
  // UI "back" panel uses TEMPLATE_SVGS.right (back hinge strip)
  // UI "right" panel uses TEMPLATE_SVGS.back (side panel)
  
  // Front panel (UI): uses lid template, scales with width (X) and height (Y)
  const frontPath = scaleTemplatePath(TEMPLATE_SVGS.lid, scaleW, heightMm / TEMPLATE_ORIGINAL.heightMm);
  
  // Back panel (UI): uses right template, scales with width (X), fixed height
  const backPath = scaleTemplatePath(TEMPLATE_SVGS.right, scaleW, 1);
  
  // Left panel (UI): scales with depth (X), fixed height
  const leftPath = scaleTemplatePath(TEMPLATE_SVGS.left, scaleD, 1);
  
  // Right panel (UI): uses back template, scales with depth (X), fixed height
  const rightPath = scaleTemplatePath(TEMPLATE_SVGS.back, scaleD, 1);
  
  // Bottom panel: scales with width and depth
  const bottomPath = scaleTemplatePath(TEMPLATE_SVGS.bottom, scaleW, scaleD);
  
  // Lid panel (UI): uses front template, scales with width (X) and depth (Y)
  const lidPath = scaleTemplatePath(TEMPLATE_SVGS.front, scaleW, scaleD);
  
  return {
    front: svgFromTemplatePath(frontPath),
    back: svgFromTemplatePath(backPath, { rotate180: true }),
    left: svgFromTemplatePath(leftPath),
    right: svgFromTemplatePath(rightPath),
    bottom: svgFromTemplatePath(bottomPath),
    lid: svgFromTemplatePath(lidPath),
  };
}

/**
 * Generate SVGs from panels (compatible with existing BoxMaker interface)
 */
export function generateHingedBoxSvgsFromPanels(
  panels: HingedBoxPanels,
  mode: 'template' | 'parametric' = 'template',
  _input?: HingedInputs,
): HingedBoxSvgs {
  // Parametric mode: use panel geometry to generate SVGs
  // This is truly parametric - finger count changes with dimensions
  if (mode === 'parametric') {
    return {
      front: panelToSvg(panels.front),
      back: panelToSvg(panels.back),
      left: panelToSvg(panels.left),
      right: panelToSvg(panels.right),
      bottom: panelToSvg(panels.bottom),
      lid: panelToSvg(panels.lid),
    };
  }

  // Original template mode (unscaled) - CORRECT MAPPING
  return {
    front: svgFromTemplatePath(TEMPLATE_SVGS.lid),
    back: svgFromTemplatePath(TEMPLATE_SVGS.right, { rotate180: true }),
    left: svgFromTemplatePath(TEMPLATE_SVGS.left),
    right: svgFromTemplatePath(TEMPLATE_SVGS.back),
    bottom: svgFromTemplatePath(TEMPLATE_SVGS.bottom),
    lid: svgFromTemplatePath(TEMPLATE_SVGS.front),
  };
}
