import type { CurvedPhotoFrameInputs, CurvedPhotoFrameResult } from './types';
import { clampNumber, imageEl, linePath, pathEl, rectPath, roundedRectPath, svgLayerGroup, svgWrap, textEl } from './svgPrimitives';

type CurveParams = { kerfLines: number; kerfBandHeight: number };

function curveParams(strength: CurvedPhotoFrameInputs['curveStrength'], height: number): CurveParams {
  if (strength === 'strong') return { kerfLines: 42, kerfBandHeight: Math.max(18, height * 0.55) };
  if (strength === 'medium') return { kerfLines: 28, kerfBandHeight: Math.max(14, height * 0.45) };
  return { kerfLines: 18, kerfBandHeight: Math.max(10, height * 0.35) };
}

function mm(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function generateCurvedPhotoFrameSvgs(inputRaw: CurvedPhotoFrameInputs): CurvedPhotoFrameResult {
  const warnings: string[] = [];

  const photoW = clampNumber(inputRaw.photoWidthMm, 20, 600);
  const photoH = clampNumber(inputRaw.photoHeightMm, 20, 600);

  const thickness = clampNumber(inputRaw.thicknessMm, 2, 20);
  const kerf = clampNumber(inputRaw.kerfMm, 0, 1);

  const border = clampNumber(inputRaw.borderMm, 6, 60);
  const cornerR = clampNumber(inputRaw.cornerRadiusMm, 0, 60);

  const outerW = photoW + border * 2;
  const outerH = photoH + border * 2;

  const windowX = border;
  const windowY = border;

  const windowW = photoW;
  const windowH = photoH;

  if (windowW <= 0 || windowH <= 0) {
    warnings.push('Photo window is too small. Increase photo size or border.');
  }

  // FRONT PANEL
  const frontCut = [
    pathEl(roundedRectPath(0, 0, outerW, outerH, cornerR)),
    // Window cutout
    pathEl(roundedRectPath(windowX, windowY, windowW, windowH, Math.max(0, cornerR * 0.6))),
  ].join('');

  const frontEngrave: string[] = [];
  if (inputRaw.photoDataUrl) {
    frontEngrave.push(
      imageEl({
        href: inputRaw.photoDataUrl,
        x: windowX,
        y: windowY,
        w: windowW,
        h: windowH,
        opacity: 0.95,
      }),
    );
  }

  const frontSvg = svgWrap({
    w: outerW,
    h: outerH,
    body: `${svgLayerGroup('cut', frontCut)}${svgLayerGroup('engrave', frontEngrave.join(''))}`,
  });

  // BACK PANEL (photo slot at top)
  const slotMargin = Math.max(8, border * 0.35);
  const slotW = Math.max(20, photoW * 0.75);
  const slotH = Math.max(3, thickness + 0.3);
  const slotX = (outerW - slotW) / 2;
  const slotY = 0; // opening at top edge

  const backCut = [
    pathEl(roundedRectPath(0, 0, outerW, outerH, cornerR)),
    // Photo insertion slot
    pathEl(rectPath(slotX, slotY, slotW, slotH)),
  ].join('');

  // Kerf-bend score lines on back to help curvature
  const cp = curveParams(inputRaw.curveStrength, outerH);
  const bandH = Math.min(cp.kerfBandHeight, outerH - slotMargin * 2);
  const bandY = (outerH - bandH) / 2;

  const scoreLines: string[] = [];
  const usableW = outerW - slotMargin * 2;
  const dx = usableW / Math.max(1, cp.kerfLines - 1);
  for (let i = 0; i < cp.kerfLines; i += 1) {
    const x = slotMargin + i * dx;
    scoreLines.push(pathEl(linePath(x, bandY, x, bandY + bandH)));
  }

  const backSvg = svgWrap({
    w: outerW,
    h: outerH,
    body: `${svgLayerGroup('cut', backCut)}${svgLayerGroup('score', scoreLines.join(''))}`,
  });

  // STAND (slot stand MVP; finger-joint stand is a slightly more complex variant)
  const standW = clampNumber(inputRaw.standWidthMm, Math.max(60, outerW * 0.6), 600);
  const standD = clampNumber(inputRaw.standDepthMm, 30, 250);
  const standR = Math.max(0, Math.min(10, cornerR * 0.35));

  // Slot sized for thickness + kerf clearance
  const slotClear = Math.max(0.15, kerf * 0.5);
  const slotCutW = thickness + slotClear * 2;
  const slotCutH = Math.max(12, standD * 0.55);
  const slotCutX = (standW - slotCutW) / 2;
  const slotCutY = (standD - slotCutH) / 2;

  const baseOutline = roundedRectPath(0, 0, standW, standD, standR);
  const standCutParts: string[] = [pathEl(baseOutline)];

  if (inputRaw.standType === 'slot') {
    standCutParts.push(pathEl(rectPath(slotCutX, slotCutY, slotCutW, slotCutH)));
  } else {
    // Simplified finger-joint style: two slots instead of one, to allow A-frame-ish assembly.
    const gap = Math.max(12, thickness * 4);
    const x1 = (standW - gap) / 2 - slotCutW / 2;
    const x2 = (standW + gap) / 2 - slotCutW / 2;
    standCutParts.push(pathEl(rectPath(x1, slotCutY, slotCutW, slotCutH)));
    standCutParts.push(pathEl(rectPath(x2, slotCutY, slotCutW, slotCutH)));
  }

  const standEngraveParts: string[] = [];
  if (inputRaw.addNameText && inputRaw.nameText.trim()) {
    const tx = standW / 2;
    const ty = standD - Math.max(6, inputRaw.nameTextSizeMm * 1.2);
    standEngraveParts.push(textEl({ text: inputRaw.nameText.trim(), x: tx, y: ty, size: inputRaw.nameTextSizeMm }));
  }

  const standSvg = svgWrap({
    w: standW,
    h: standD,
    body: `${svgLayerGroup('cut', standCutParts.join(''))}${svgLayerGroup('engrave', standEngraveParts.join(''))}`,
  });

  // COMBINED layout (simple side-by-side with gaps)
  const GAP = 12;
  const combinedW = outerW + GAP + outerW + GAP + standW;
  const combinedH = Math.max(outerH, standD);

  const body = [
    `<g transform="translate(0 0)">${frontSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`,
    `<g transform="translate(${mm(outerW + GAP)} 0)">${backSvg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`,
    `<g transform="translate(${mm(outerW + GAP + outerW + GAP)} 0)">${standSvg
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')}</g>`,
  ].join('');

  const combined = svgWrap({ w: combinedW, h: combinedH, body });

  return {
    svgs: {
      combined,
      front: frontSvg,
      back: backSvg,
      stand: standSvg,
    },
    warnings: { warnings },
  };
}
