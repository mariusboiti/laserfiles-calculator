/**
 * Curved Photo Frame V2 Geometry Generation
 * 
 * Structure: 3 pieces total
 * 1. Large Front Plate (with 3 zones: photo area, kerf bending zone, support lip)
 * 2. Side Support Left (rigid, curved inner edge)
 * 3. Side Support Right (identical to left, mirrored)
 */

import type { CurvedPhotoFrameV3Inputs, CurvedPhotoFrameV3Result } from '../types';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mm(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function svgWrap(width: number, height: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${mm(width)}mm" height="${mm(height)}mm" viewBox="0 0 ${mm(width)} ${mm(height)}">${body}</svg>`;
}

function pathEl(d: string, attrs?: Record<string, string>): string {
  const attrStr = attrs ? Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ') : '';
  return `<path d="${d}" ${attrStr}/>`;
}

function rectPath(x: number, y: number, w: number, h: number): string {
  return `M${mm(x)},${mm(y)} h${mm(w)} v${mm(h)} h${mm(-w)} z`;
}

function linePath(x1: number, y1: number, x2: number, y2: number): string {
  return `M${mm(x1)},${mm(y1)} L${mm(x2)},${mm(y2)}`;
}

function imageEl(href: string, x: number, y: number, w: number, h: number): string {
  return `<image href="${href}" x="${mm(x)}" y="${mm(y)}" width="${mm(w)}" height="${mm(h)}" preserveAspectRatio="xMidYMid slice"/>`;
}

function layerGroup(layerName: string, color: string, content: string): string {
  if (!content) return '';
  return `<g id="layer-${layerName}" stroke="${color}" fill="none" stroke-width="0.1">${content}</g>`;
}

/**
 * Calculate bend radius based on curve strength and bending zone height
 */
function getBendRadius(curveStrength: string, bendZoneHeight: number): number {
  // Approximate radius for living hinge bend
  // Stronger curve = smaller radius
  if (curveStrength === 'strong') return bendZoneHeight * 0.8;
  if (curveStrength === 'medium') return bendZoneHeight * 1.2;
  return bendZoneHeight * 1.8; // gentle
}

/**
 * Generate the large front plate with 3 vertical zones:
 * A) Top rigid area (photo engraving zone)
 * B) Middle bending zone (kerf pattern)
 * C) Bottom support lip (solid, no kerf)
 */
export function generateFrontPlate(inputs: CurvedPhotoFrameV3Inputs): string {
  const { frameSettings, processedPhotoDataUrl } = inputs;
  
  const photoW = clamp(frameSettings.photoWidthMm, 20, 600);
  const photoH = clamp(frameSettings.photoHeightMm, 20, 600);
  const border = clamp(frameSettings.borderMm, 6, 80);
  const cornerR = clamp(frameSettings.cornerRadiusMm, 0, 30);
  
  // Zone heights (configurable) - these do NOT affect plate size
  const bendZoneHeight = clamp(frameSettings.bendZoneHeightMm ?? 24, 18, 30);
  const supportLipHeight = clamp(frameSettings.supportLipHeightMm ?? 10, 8, 12);
  
  // Total plate dimensions (ONLY from photo + border, independent of bend zone)
  const plateW = photoW + border * 2;
  const plateH = photoH + border * 2;
  
  // Plate boundaries
  const plateX = 0;
  const plateY = 0;
  const plateBottomY = plateY + plateH;
  
  // Photo area (inner rectangle for engraving)
  const photoAreaX = border;
  const photoAreaY = border;
  const photoAreaW = photoW;
  const photoAreaH = photoH;
  
  // Outer cut path (rounded rect for top corners only)
  const cutPath = `M${mm(cornerR)},0 
    h${mm(plateW - 2 * cornerR)} 
    a${mm(cornerR)},${mm(cornerR)} 0 0 1 ${mm(cornerR)},${mm(cornerR)} 
    v${mm(plateH - cornerR)} 
    h${mm(-plateW)} 
    v${mm(-(plateH - cornerR))} 
    a${mm(cornerR)},${mm(cornerR)} 0 0 1 ${mm(cornerR)},${mm(-cornerR)} 
    z`;
  
  const cutPaths = [pathEl(cutPath)];

  // Tooth slots in the support lip: 2 slots per side support (left + right), aligned to support teeth.
  const slotClearance = 0.25;
  const toothWForSlots = 7;
  const toothGapForSlots = 10;
  const toothSpanForSlots = toothWForSlots * 2 + toothGapForSlots;
  const teethStartXForSlots = 10;
  const slotW = toothWForSlots + slotClearance * 2;
  const slotH = Math.min(Number(frameSettings.thicknessMm) + 0.5, supportLipHeight - 1);
  const supportDepthForSlots = 60;
  const sideSlotDepth = slotH;
  const sideSlotH = slotW;
  const sideSlotXLeft = 0;
  const sideSlotXRight = plateW - sideSlotDepth;
  const sideSlotsOriginY = plateBottomY - supportDepthForSlots;

  const t1SlotY = clamp(sideSlotsOriginY + teethStartXForSlots - slotClearance, plateY + 1, plateBottomY - sideSlotH - 1);
  const t2SlotY = clamp(
    sideSlotsOriginY + (teethStartXForSlots + toothWForSlots + toothGapForSlots) - slotClearance,
    plateY + 1,
    plateBottomY - sideSlotH - 1
  );

  cutPaths.push(pathEl(rectPath(sideSlotXLeft, t1SlotY, sideSlotDepth, sideSlotH)));
  cutPaths.push(pathEl(rectPath(sideSlotXLeft, t2SlotY, sideSlotDepth, sideSlotH)));
  cutPaths.push(pathEl(rectPath(sideSlotXRight, t1SlotY, sideSlotDepth, sideSlotH)));
  cutPaths.push(pathEl(rectPath(sideSlotXRight, t2SlotY, sideSlotDepth, sideSlotH)));
  
  // Engrave layer (photo) - use photoArea for placement
  const engraveParts: string[] = [];
  if (processedPhotoDataUrl) {
    engraveParts.push(imageEl(processedPhotoDataUrl, photoAreaX, photoAreaY, photoAreaW, photoAreaH));
  }
  
  // Kerf bending pattern (Zone B only)
  const scoreLines: string[] = [];
  const segmentLength = clamp(frameSettings.kerfSegmentLengthMm, 6, 10);
  const gapLength = clamp(frameSettings.kerfGapLengthMm, 2, 4);
  const rowSpacing = clamp(frameSettings.kerfRowSpacingMm, 1.5, 5);
  const rowOffset = (segmentLength + gapLength) / 2;
  
  // Bend zone spans full width (no side margins - lines go to edges)
  const bendSideMargin = 0; // mm from plate edges
  const bendX = plateX + bendSideMargin;
  const bendW = plateW - 2 * bendSideMargin;
  
  const safetyGap = 1.5; // mm

  // Anchor the first kerf row relative to the bottom edge so it matches the support's bottom side length.
  // Side support base (horizontal) is currently fixed at 50mm.
  const supportDepth = 60;
  const kerfDownShiftMm = 15;
  const kerfStartY = Math.min(
    plateBottomY - supportDepth + kerfDownShiftMm,
    plateBottomY - (supportLipHeight + safetyGap)
  );

  // Calculate number of rows based on rowSpacing, but clamp so we don't push kerf lines too high.
  const requestedRows = Math.max(1, Math.floor(bendZoneHeight / rowSpacing));
  const minBendTopY = plateY + plateH * 0.55;
  const maxRowsByHeight = Math.max(1, Math.floor((kerfStartY - minBendTopY) / rowSpacing) + 1);
  const numRows = Math.min(requestedRows, maxRowsByHeight);

  const falloffRows = frameSettings.edgeSafety ? Math.max(1, Math.min(4, Math.floor(numRows / 4))) : 0;

  for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
    // Row 0 is the first (lowest) kerf row.
    const y = kerfStartY - rowIndex * rowSpacing;
    if (y <= plateY) break;

    const lowEdgeFactor = falloffRows > 0 ? Math.max(0, 1 - rowIndex / falloffRows) : 0;
    const highEdgeFactor =
      falloffRows > 0 ? Math.max(0, 1 - (numRows - 1 - rowIndex) / falloffRows) : 0;
    const edgeFactor = Math.max(lowEdgeFactor, highEdgeFactor);
    const edgeMargin = edgeFactor * (bendW * 0.12);
    const rowBendX = bendX + edgeMargin;
    const rowBendW = Math.max(0, bendW - edgeMargin * 2);

    const isOddRow = rowIndex % 2 === 1;
    const rowStartX = isOddRow ? rowBendX + rowOffset : rowBendX;
    
    let x = rowStartX;
    const endX = rowBendX + rowBendW;
    while (x < endX) {
      const segmentEnd = Math.min(x + segmentLength, endX);
      if (segmentEnd - x > 1) { // only draw if segment is meaningful
        scoreLines.push(pathEl(linePath(x, y, segmentEnd, y)));
      }
      x = segmentEnd + gapLength;
    }
  }
  
  const body = 
    layerGroup('cut', 'red', cutPaths.join('')) + 
    layerGroup('engrave', 'black', engraveParts.join('')) +
    layerGroup('score', 'blue', scoreLines.join(''));
  
  return svgWrap(plateW, plateH, body);
}

/**
 * Generate a side support piece as L-shape with 10mm thickness, curved/gusseted bottom, and heart cutout
 */
export function generateSideSupport(inputs: CurvedPhotoFrameV3Inputs, mirrored: boolean = false): string {
  const { frameSettings } = inputs;
  
  const thickness = frameSettings.thicknessMm;
  
  // L-shape dimensions
  const lThickness = 10; // 10mm thickness for L-shape
  const supportHeight = clamp(frameSettings.standDepthMm, 40, 150); // vertical part
  const supportDepth = 60; // horizontal part depth
  
  // Curved/gusset parameters (matches the rounded "belly" in the reference)
  const outerCornerR = 10;
  const gussetR = Math.min(20, supportDepth - lThickness - 2, supportHeight - lThickness - 2);

  // Base/vertical bounds
  const baseTopY = supportHeight - lThickness;
  const baseBottomY = supportHeight;
  const leftX = 0;
  const rightX = supportDepth;

  // Bottom teeth (two tabs)
  const toothDepth = thickness;
  const toothW = 7;
  const toothGap = 10;
  const teethSpan = toothW * 2 + toothGap;
  const teethStartX = clamp(10, outerCornerR + 1, supportDepth - outerCornerR - 1 - teethSpan);
  const t1x = teethStartX;
  const t2x = teethStartX + toothW + toothGap;
  const teethBottomY = baseBottomY + toothDepth;

  // Heart cutout: keep it upright (not sheared) but position it relative to the sheared support.
  // We do this by placing the heart in final (post-shear) coordinates.
  const heartSize = clamp(gussetR * 0.36, 6, 9);

  // Tilt the support to match the viewing angle (e.g. 75°) by shearing the shape.
  // This changes the profile angle without requiring UI changes.
  const viewingAngle = clamp(Number(frameSettings.viewingAngleDeg), 70, 85);
  const leanDeg = 90 - viewingAngle;
  const shear = Math.tan((leanDeg * Math.PI) / 180);

  // Shear around baseTopY so the base remains aligned.
  // Left support leans right; right support leans left.
  const shearC = mirrored ? shear : -shear;
  const shearE = mirrored ? -shear * baseTopY : shear * baseTopY;
  const extraShift = mirrored ? shear * baseTopY : shear * lThickness;
  const shearTransform = `matrix(1 0 ${mm(shearC)} 1 ${mm(shearE + extraShift)} 0)`;

  // Heart center in local (pre-shear) space: target the center of the rounded inner corner.
  // Left support corner arc center is at (lThickness, baseTopY). Right is at (rightX - lThickness, baseTopY).
  const cornerCx = mirrored ? rightX - lThickness : lThickness;
  const cornerCy = baseTopY;
  const sgn = mirrored ? -1 : 1;

  // Place heart roughly in the middle of the quarter circle, then add per-side offsets.
  // User request: left heart lower + more to the left.
  const heartLocalX = cornerCx + sgn * gussetR * 0.55 + (mirrored ? 1.5 : -4.5);
  const heartLocalY = cornerCy - gussetR * 0.55 + 5;

  // Map the heart center through the same shear used by the support group.
  // For matrix(1 0 c 1 e 0): x' = x + c*y + e, y' = y
  const heartX = heartLocalX + shearC * heartLocalY + (shearE + extraShift);
  const heartY = heartLocalY;

  const hs = heartSize;
  const heartPath = `
    M${mm(heartX)},${mm(heartY + hs * 0.28)}
    C${mm(heartX + hs * 0.65)},${mm(heartY - hs * 0.35)} ${mm(heartX + hs * 1.25)},${mm(heartY + hs * 0.35)} ${mm(heartX)},${mm(heartY + hs * 1.35)}
    C${mm(heartX - hs * 1.25)},${mm(heartY + hs * 0.35)} ${mm(heartX - hs * 0.65)},${mm(heartY - hs * 0.35)} ${mm(heartX)},${mm(heartY + hs * 0.28)}
    Z`;

  // Compensate the shear for the teeth side edges so that AFTER the shear they are perfectly vertical.
  // If x' = x + shearC*y + e, we need dx/dy = -shearC for a vertical line in the transformed space.
  const toothDx = -shearC * toothDepth;

  if (!mirrored) {
    // Left support: vertical leg on left, base to the right
    const d = `
      M${mm(leftX)},${mm(0)}
      H${mm(lThickness)}
      V${mm(baseTopY - gussetR)}
      A${mm(gussetR)},${mm(gussetR)} 0 0 1 ${mm(lThickness + gussetR)},${mm(baseTopY)}
      H${mm(rightX - outerCornerR)}
      A${mm(outerCornerR)},${mm(outerCornerR)} 0 0 1 ${mm(rightX)},${mm(baseTopY + outerCornerR)}
      V${mm(baseBottomY)}
      H${mm(t2x + toothW)}
      L${mm(t2x + toothW + toothDx)},${mm(teethBottomY)}
      H${mm(t2x + toothDx)}
      L${mm(t2x)},${mm(baseBottomY)}
      H${mm(t1x + toothW)}
      L${mm(t1x + toothW + toothDx)},${mm(teethBottomY)}
      H${mm(t1x + toothDx)}
      L${mm(t1x)},${mm(baseBottomY)}
      H${mm(leftX + outerCornerR)}
      A${mm(outerCornerR)},${mm(outerCornerR)} 0 0 1 ${mm(leftX)},${mm(baseBottomY - outerCornerR)}
      Z`;

    const cutPaths = [
      pathEl(d),
    ];

    if (frameSettings.addStopNotch) {
      const notchW = 6;
      const notchDepth = 3;
      const notchX = lThickness + gussetR + 4;
      const notchY = baseTopY - notchDepth;
      if (notchX + notchW < rightX - outerCornerR - 1) {
        cutPaths.push(pathEl(rectPath(notchX, notchY, notchW, notchDepth)));
      }
    }

    const supportW = supportDepth + shear * supportHeight;
    const supportH = supportHeight + toothDepth;
    const body = layerGroup('cut', 'red', `<g transform="${shearTransform}">${cutPaths.join('')}</g>${pathEl(heartPath)}`);
    return svgWrap(supportW, supportH, body);
  }

  // Right support (mirrored): vertical leg on right, base to the left
  const d = `
    M${mm(rightX)},${mm(0)}
    H${mm(rightX - lThickness)}
    V${mm(baseTopY - gussetR)}
    A${mm(gussetR)},${mm(gussetR)} 0 0 0 ${mm(rightX - lThickness - gussetR)},${mm(baseTopY)}
    H${mm(leftX + outerCornerR)}
    A${mm(outerCornerR)},${mm(outerCornerR)} 0 0 0 ${mm(leftX)},${mm(baseTopY + outerCornerR)}
    V${mm(baseBottomY)}
    H${mm(t1x)}
    L${mm(t1x + toothDx)},${mm(teethBottomY)}
    H${mm(t1x + toothW + toothDx)}
    L${mm(t1x + toothW)},${mm(baseBottomY)}
    H${mm(t2x)}
    L${mm(t2x + toothDx)},${mm(teethBottomY)}
    H${mm(t2x + toothW + toothDx)}
    L${mm(t2x + toothW)},${mm(baseBottomY)}
    H${mm(rightX - outerCornerR)}
    A${mm(outerCornerR)},${mm(outerCornerR)} 0 0 0 ${mm(rightX)},${mm(baseBottomY - outerCornerR)}
    Z`;

  const cutPaths = [
    pathEl(d),
  ];

  if (frameSettings.addStopNotch) {
    const notchW = 6;
    const notchDepth = 3;
    const notchX = rightX - (lThickness + gussetR + 4) - notchW;
    const notchY = baseTopY - notchDepth;
    if (notchX > leftX + outerCornerR + 1) {
      cutPaths.push(pathEl(rectPath(notchX, notchY, notchW, notchDepth)));
    }
  }

  const supportW = supportDepth + shear * supportHeight;
  const supportH = supportHeight + toothDepth;
  const body = layerGroup('cut', 'red', `<g transform="${shearTransform}">${cutPaths.join('')}</g>${pathEl(heartPath)}`);
  return svgWrap(supportW, supportH, body);
}

/**
 * Legacy function - now returns front plate
 */
export function generateFrameFront(inputs: CurvedPhotoFrameV3Inputs): string {
  return generateFrontPlate(inputs);
}

/**
 * Legacy function - kept for compatibility, returns empty
 */
export function generateFrameBack(inputs: CurvedPhotoFrameV3Inputs): string {
  return svgWrap(1, 1, '');
}

/**
 * Legacy function - now returns left side support
 */
export function generateStand(inputs: CurvedPhotoFrameV3Inputs): string {
  return generateSideSupport(inputs, false);
}

/**
 * Generate combined layout with all 3 pieces:
 * - Front plate (large)
 * - Left side support
 * - Right side support
 */
export function generateCombinedLayout(inputs: CurvedPhotoFrameV3Inputs): string {
  const frontPlate = generateFrontPlate(inputs);
  const leftSupport = generateSideSupport(inputs, false);
  const rightSupport = generateSideSupport(inputs, false);
  
  const { frameSettings } = inputs;
  const photoW = clamp(frameSettings.photoWidthMm, 20, 600);
  const photoH = clamp(frameSettings.photoHeightMm, 20, 600);
  const border = clamp(frameSettings.borderMm, 6, 80);
  const supportHeight = clamp(frameSettings.standDepthMm, 40, 150);
  const supportDepth = 60; // L-shape horizontal depth
  const toothDepth = Number(frameSettings.thicknessMm);

  const viewingAngle = clamp(Number(frameSettings.viewingAngleDeg), 70, 85);
  const shear = Math.tan(((90 - viewingAngle) * Math.PI) / 180);
  const supportW = supportDepth + shear * supportHeight;
  
  // Plate dimensions independent of bend zone
  const plateW = photoW + border * 2;
  const plateH = photoH + border * 2;
  
  const GAP = 10;
  
  // Layout: Front plate | Left support | Right support
  const combinedW = plateW + GAP + supportW + GAP + supportW;
  const combinedH = Math.max(plateH, supportHeight + toothDepth);
  
  const stripSvgTags = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  
  const body = [
    `<g transform="translate(0,0)">${stripSvgTags(frontPlate)}</g>`,
    `<g transform="translate(${mm(plateW + GAP)},0)">${stripSvgTags(leftSupport)}</g>`,
    `<g transform="translate(${mm(plateW + GAP + supportW + GAP)},0)">${stripSvgTags(rightSupport)}</g>`,
  ].join('');
  
  return svgWrap(combinedW, combinedH, body);
}

export function generateCurvedPhotoFrameV3(inputs: CurvedPhotoFrameV3Inputs): CurvedPhotoFrameV3Result {
  const warnings: string[] = [];
  
  const photoW = clamp(inputs.frameSettings.photoWidthMm, 20, 600);
  const photoH = clamp(inputs.frameSettings.photoHeightMm, 20, 600);
  const border = clamp(inputs.frameSettings.borderMm, 6, 80);
  const outerW = photoW + border * 2;
  const bendZoneHeight = clamp(inputs.frameSettings.bendZoneHeightMm ?? 24, 18, 30);
  const curveStrength = inputs.frameSettings.curveStrength;
  const effectiveBendRadiusMm =
    curveStrength === 'custom'
      ? clamp(Number(inputs.frameSettings.bendRadiusMm), 20, 2000)
      : getBendRadius(curveStrength, bendZoneHeight);
  const approxArcRad = outerW / Math.max(1, effectiveBendRadiusMm);
  const approxArcAngleDeg = (approxArcRad * 180) / Math.PI;
  
  if (photoW <= 0 || photoH <= 0) {
    warnings.push('Photo dimensions are too small.');
  }
  
  if (!inputs.processedPhotoDataUrl && inputs.photoDataUrl) {
    warnings.push('Photo uploaded but not processed. Use AI prep or manual adjustments.');
  }

  if (curveStrength === 'custom') {
    if (!Number.isFinite(effectiveBendRadiusMm)) {
      warnings.push('Custom bend radius is invalid.');
    } else {
      if (approxArcAngleDeg > 120) warnings.push('Custom bend radius is very small for this width (extreme curve).');
      if (approxArcAngleDeg < 10) warnings.push('Custom bend radius is very large for this width (almost flat).');
    }
  }
  
  return {
    svgs: {
      front: generateFrontPlate(inputs),
      back: generateSideSupport(inputs, false), // left support
      stand: generateSideSupport(inputs, false), // right support (duplicate of left)
      combined: generateCombinedLayout(inputs),
    },
    warnings,
  };
}
