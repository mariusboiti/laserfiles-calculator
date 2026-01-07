import type {
  SlidingDrawerInputs,
  SlidingDrawerSvgs,
  SlidingDrawerOuterPanels,
  SlidingDrawerDrawerPanels,
  SlidingDrawerPanel2D,
} from '../types';
import { add, bbox, clamp, pathFromPoints, pt } from '../shared/panelUtils';
import { svgForPanel, svgForPanelWithCutouts } from '../shared/panelUtils';
import { computeDrawerDimensions, buildRectPanel } from './drawerMath';
import type { BoxSettings, GeneratedFace } from '../../../src/lib/types';
import { generateBoxGeometry, generateBoxGeometryOpenFront } from '../../../src/lib/boxGenerator';

/**
 * Generate divider faces for the drawer compartment.
 * Returns array of { name, svg } for each divider panel.
 */
export function generateDrawerDividerSvgs(input: SlidingDrawerInputs): { name: string; svg: string }[] {
  if (!input.dividersEnabled) return [];

  const dims = computeDrawerDimensions(input);
  const { drawerWidth: dW, drawerDepth: dD, drawerHeight: dH, thickness: t } = dims;

  const countX = Math.max(1, Math.floor(input.dividerCountX));
  const countZ = Math.max(1, Math.floor(input.dividerCountZ));

  const dividerCountX = Math.max(0, countX - 1);
  const dividerCountZ = Math.max(0, countZ - 1);

  if (dividerCountX === 0 && dividerCountZ === 0) return [];

  const clearance = Math.max(input.dividerClearanceMm, 0);
  const slotWidth = Math.max(t + clearance, 0.1);

  const innerW = Math.max(dW - 2 * t, 0.1);
  const innerD = Math.max(dD - 2 * t, 0.1);
  const dividerHeight = Math.max(dH - t, 0.1);
  const slotDepth = Math.max(dividerHeight / 2, 0.1);

  const dividerXLength = innerD;
  const dividerZLength = innerW;

  const slotsOnX: number[] = [];
  if (countZ > 1) {
    const step = dividerXLength / countZ;
    for (let i = 1; i < countZ; i++) {
      slotsOnX.push(i * step);
    }
  }

  const slotsOnZ: number[] = [];
  if (countX > 1) {
    const step = dividerZLength / countX;
    for (let i = 1; i < countX; i++) {
      slotsOnZ.push(i * step);
    }
  }

  const results: { name: string; svg: string }[] = [];

  for (let i = 0; i < dividerCountX; i++) {
    const w = dividerXLength;
    const h = dividerHeight;
    let pathD = `M 0 0 H ${w.toFixed(3)} V ${h.toFixed(3)} H 0 Z`;

    const slotPaths: string[] = [];
    for (const pos of slotsOnX) {
      const x = Math.max(0, Math.min(pos - slotWidth / 2, w - slotWidth));
      slotPaths.push(`M ${x.toFixed(3)} 0 V ${slotDepth.toFixed(3)} H ${(x + slotWidth).toFixed(3)} V 0`);
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
  <path d="${pathD}" fill="none" stroke="#ff0000" stroke-width="0.2" />
${slotPaths.map((d) => `  <path d="${d}" fill="none" stroke="#ff0000" stroke-width="0.2" />`).join('\n')}
</svg>`;

    results.push({ name: `drawer-divider-x-${i + 1}`, svg });
  }

  for (let i = 0; i < dividerCountZ; i++) {
    const w = dividerZLength;
    const h = dividerHeight;
    let pathD = `M 0 0 H ${w.toFixed(3)} V ${h.toFixed(3)} H 0 Z`;

    const slotPaths: string[] = [];
    for (const pos of slotsOnZ) {
      const x = Math.max(0, Math.min(pos - slotWidth / 2, w - slotWidth));
      const yTop = h - slotDepth;
      slotPaths.push(`M ${x.toFixed(3)} ${h.toFixed(3)} V ${yTop.toFixed(3)} H ${(x + slotWidth).toFixed(3)} V ${h.toFixed(3)}`);
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(3)}mm" height="${h.toFixed(3)}mm" viewBox="0 0 ${w.toFixed(3)} ${h.toFixed(3)}">
  <path d="${pathD}" fill="none" stroke="#ff0000" stroke-width="0.2" />
${slotPaths.map((d) => `  <path d="${d}" fill="none" stroke="#ff0000" stroke-width="0.2" />`).join('\n')}
</svg>`;

    results.push({ name: `drawer-divider-z-${i + 1}`, svg });
  }

  return results;
}

/**
 * Generate all panels for sliding drawer box.
 */
export function generateSlidingDrawerPanels(input: SlidingDrawerInputs): {
  outer: SlidingDrawerOuterPanels;
  drawer: SlidingDrawerDrawerPanels;
} {
  const dims = computeDrawerDimensions(input);
  const { outerWidth: W, outerDepth: D, outerHeight: H, thickness: t } = dims;
  const { drawerWidth: dW, drawerDepth: dD, drawerHeight: dH } = dims;
  const fingerW = input.fingerWidthMm;

  const faceToOutline = (face: GeneratedFace | null) => (face?.vertices ?? []).map((p) => ({ x: p.x, y: p.y }));

  // OUTER BOX PANELS
  // Outer should match the drawer construction style (finger joints), but be open at the front.
  // That means: it has back/left/right/bottom/top faces, and no front face.
  const outerSettings: BoxSettings = {
    width: Math.max(W, 1),
    depth: Math.max(D, 1),
    height: Math.max(H, 1),
    dimensionReference: 'outside',

    materialThickness: Math.max(t, 0.1),
    kerf: Math.max(input.kerfMm, 0),
    applyKerfCompensation: true,

    boxType: 'finger_all_edges',
    fingerMin: Math.max(fingerW, 0.1),
    fingerMax: Math.max(fingerW, 0.1),
    autoFingerCount: true,
    manualFingerCount: null,

    // Keep a non-none lidType so inner height is reduced by 2*t (top+bottom),
    // but the open-front generator will ignore lid faces.
    lidType: 'flat_lid',
    grooveDepth: Math.max(t, 0.1),
    grooveOffset: Math.max(t, 0.1),
    lipInset: 2,
    lipHeight: 8,

    dividersEnabled: false,
    dividerCountX: 1,
    dividerCountZ: 1,
    dividerClearance: 0.2,

    arrangeOnSheet: false,
    sheetWidth: 300,
    sheetHeight: 200,
    partSpacing: 3,
    autoRotateParts: false,
  };

  const outerFaces = generateBoxGeometryOpenFront(outerSettings).faces;
  const outerFaceByName = (name: GeneratedFace['name']) => outerFaces.find((f) => f.name === name) ?? null;

  const outerBackFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(W, H, t, fingerW, { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }),
  };
  const outerLeftFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(D, H, t, fingerW, { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }),
  };
  const outerRightFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(D, H, t, fingerW, { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }),
  };
  const outerBottomFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(W, D, t, fingerW, { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }),
  };
  const outerTopFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(W, D, t, fingerW, { top: 'tab', right: 'tab', bottom: 'tab', left: 'tab' }),
  };

  const outerBack: SlidingDrawerPanel2D = {
    outline:
      faceToOutline(outerFaceByName('back'))?.length >= 3 ? faceToOutline(outerFaceByName('back')) : outerBackFallback.outline,
  };
  const outerLeft: SlidingDrawerPanel2D = {
    outline:
      faceToOutline(outerFaceByName('left'))?.length >= 3 ? faceToOutline(outerFaceByName('left')) : outerLeftFallback.outline,
  };
  const outerRight: SlidingDrawerPanel2D = {
    outline:
      faceToOutline(outerFaceByName('right'))?.length >= 3 ? faceToOutline(outerFaceByName('right')) : outerRightFallback.outline,
  };
  const outerBottom: SlidingDrawerPanel2D = {
    outline:
      faceToOutline(outerFaceByName('bottom'))?.length >= 3 ? faceToOutline(outerFaceByName('bottom')) : outerBottomFallback.outline,
  };
  const outerTop: SlidingDrawerPanel2D = {
    outline:
      faceToOutline(outerFaceByName('top'))?.length >= 3 ? faceToOutline(outerFaceByName('top')) : outerTopFallback.outline,
  };

  // DRAWER PANELS
  // Drawer should behave like a Simple Box: open-top finger-jointed box.
  const drawerSettings: BoxSettings = {
    width: Math.max(dW, 1),
    depth: Math.max(dD, 1),
    height: Math.max(dH, 1),
    dimensionReference: 'outside',

    materialThickness: Math.max(t, 0.1),
    kerf: Math.max(input.kerfMm, 0),
    applyKerfCompensation: true,

    boxType: 'finger_all_edges',
    fingerMin: Math.max(fingerW, 0.1),
    fingerMax: Math.max(fingerW, 0.1),
    autoFingerCount: true,
    manualFingerCount: null,

    lidType: 'none',
    grooveDepth: Math.max(t, 0.1),
    grooveOffset: Math.max(t, 0.1),
    lipInset: 2,
    lipHeight: 8,

    dividersEnabled: false,
    dividerCountX: 1,
    dividerCountZ: 1,
    dividerClearance: 0.2,

    arrangeOnSheet: false,
    sheetWidth: 300,
    sheetHeight: 200,
    partSpacing: 3,
    autoRotateParts: false,
  };

  const drawerFaces = generateBoxGeometry(drawerSettings).faces;

  const faceByName = (name: GeneratedFace['name']) => drawerFaces.find((f) => f.name === name) ?? null;

  // Fallbacks (previous behavior) in case something is missing.
  const drawerFrontFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(dW, dH, t, fingerW, {
      top: 'plain',
      right: 'tab',
      bottom: 'tab',
      left: 'tab',
    }),
  };
  const drawerBackFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(dW, dH, t, fingerW, {
      top: 'plain',
      right: 'tab',
      bottom: 'tab',
      left: 'tab',
    }),
  };
  const drawerLeftFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(dD, dH, t, fingerW, {
      top: 'plain',
      right: 'slot',
      bottom: 'tab',
      left: 'slot',
    }),
  };
  const drawerRightFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(dD, dH, t, fingerW, {
      top: 'plain',
      right: 'slot',
      bottom: 'tab',
      left: 'slot',
    }),
  };
  const drawerBottomFallback: SlidingDrawerPanel2D = {
    outline: buildRectPanel(dW, dD, t, fingerW, {
      top: 'slot',
      right: 'slot',
      bottom: 'slot',
      left: 'slot',
    }),
  };

  const drawerFrontOutline =
    faceToOutline(faceByName('front')).length >= 3 ? faceToOutline(faceByName('front')) : drawerFrontFallback.outline;

  // Thumb notch must not have the closing chord line.
  // We integrate the notch into the OUTLINE (concave arc) instead of using a cutout polygon.
  const dfB = bbox(drawerFrontOutline);
  const yB = dfB.maxY;
  const xMin = dfB.minX;
  const xMax = dfB.maxX;
  const wDf = Math.max(xMax - xMin, 1);
  const hDf = Math.max(dfB.maxY - dfB.minY, 1);

  // Find the longest horizontal segment on the bottom-most Y (the straight, no-teeth edge in the current orientation).
  let bestI = -1;
  let bestLen = 0;
  const yTol = 1e-3;
  for (let i = 0; i < drawerFrontOutline.length; i += 1) {
    const a = drawerFrontOutline[i];
    const b = drawerFrontOutline[(i + 1) % drawerFrontOutline.length];
    if (Math.abs(a.y - yB) > yTol || Math.abs(b.y - yB) > yTol) continue;
    const len = Math.abs(b.x - a.x);
    if (len > bestLen) {
      bestLen = len;
      bestI = i;
    }
  }

  let drawerFrontOutlineWithNotch = drawerFrontOutline;
  if (bestI >= 0 && bestLen > 10) {
    const segStart = drawerFrontOutline[bestI];
    const segEnd = drawerFrontOutline[(bestI + 1) % drawerFrontOutline.length];
    const dir = segStart.x <= segEnd.x ? 1 : -1;

    const segMinX = Math.min(segStart.x, segEnd.x);
    const segMaxX = Math.max(segStart.x, segEnd.x);

    const cx = (segStart.x + segEnd.x) / 2;
    const notchRRaw = Math.min(hDf * 0.18, wDf * 0.18);
    const notchR = clamp(notchRRaw, 4, 18);
    const x1 = clamp(cx - notchR, segMinX + 1, segMaxX - 1);
    const x2 = clamp(cx + notchR, segMinX + 1, segMaxX - 1);

    if (x2 - x1 > 1.5) {
      const r = (x2 - x1) / 2;
      const centerX = (x1 + x2) / 2;
      const steps = 18;
      const notchPts: { x: number; y: number }[] = [];

      // Semicircle going upward into the panel.
      for (let i = 0; i <= steps; i += 1) {
        const t01 = i / steps;
        const theta = Math.PI * t01; // 0..pi
        notchPts.push(pt(centerX - Math.cos(theta) * r, yB - Math.sin(theta) * r));
      }

      // Ensure notch points follow the same direction as the segment (segStart -> segEnd).
      if (dir < 0) {
        notchPts.reverse();
      }

      const xa = dir > 0 ? x1 : x2;
      const xb = dir > 0 ? x2 : x1;

      const next: { x: number; y: number }[] = [];
      let skipNext = false;
      for (let i = 0; i < drawerFrontOutline.length; i += 1) {
        if (skipNext) {
          skipNext = false;
          continue;
        }
        next.push(drawerFrontOutline[i]);
        if (i === bestI) {
          // Replace the straight segment with the concave notch path.
          next.pop();
          next.push(pt(segStart.x, yB));
          next.push(pt(xa, yB));
          next.push(...notchPts);
          next.push(pt(xb, yB));
          next.push(pt(segEnd.x, yB));
          skipNext = true;
        }
      }

      drawerFrontOutlineWithNotch = next;
    }
  }

  const drawerFront: SlidingDrawerPanel2D = {
    outline: drawerFrontOutlineWithNotch,
  };
  const drawerBack: SlidingDrawerPanel2D = {
    outline: faceToOutline(faceByName('back')).length >= 3 ? faceToOutline(faceByName('back')) : drawerBackFallback.outline,
  };
  const drawerLeft: SlidingDrawerPanel2D = {
    outline: faceToOutline(faceByName('left')).length >= 3 ? faceToOutline(faceByName('left')) : drawerLeftFallback.outline,
  };
  const drawerRight: SlidingDrawerPanel2D = {
    outline: faceToOutline(faceByName('right')).length >= 3 ? faceToOutline(faceByName('right')) : drawerRightFallback.outline,
  };
  const drawerBottom: SlidingDrawerPanel2D = {
    outline: faceToOutline(faceByName('bottom')).length >= 3
      ? faceToOutline(faceByName('bottom'))
      : drawerBottomFallback.outline,
  };

  return {
    outer: {
      back: outerBack,
      left: outerLeft,
      right: outerRight,
      bottom: outerBottom,
      top: outerTop,
    },
    drawer: {
      front: drawerFront,
      back: drawerBack,
      left: drawerLeft,
      right: drawerRight,
      bottom: drawerBottom,
    },
  };
}

/**
 * Generate SVGs from panels.
 */
export function generateSlidingDrawerSvgsFromPanels(panels: {
  outer: SlidingDrawerOuterPanels;
  drawer: SlidingDrawerDrawerPanels;
}): SlidingDrawerSvgs {
  const panelToSvg = (panel: SlidingDrawerPanel2D): string => {
    if (panel.cutouts && panel.cutouts.length > 0) {
      return svgForPanelWithCutouts(panel.outline, panel.cutouts);
    }
    return svgForPanel(panel.outline);
  };

  const outerTopSvg = panels.outer.top ? panelToSvg(panels.outer.top) : undefined;

  return {
    outer: {
      back: panelToSvg(panels.outer.back),
      left: panelToSvg(panels.outer.left),
      right: panelToSvg(panels.outer.right),
      bottom: panelToSvg(panels.outer.bottom),
      top: outerTopSvg,
    },
    drawer: {
      front: panelToSvg(panels.drawer.front),
      back: panelToSvg(panels.drawer.back),
      left: panelToSvg(panels.drawer.left),
      right: panelToSvg(panels.drawer.right),
      bottom: panelToSvg(panels.drawer.bottom),
    },
  };
}

/**
 * Main entry point: generate all SVGs for sliding drawer box.
 */
export function generateSlidingDrawerSvgs(input: SlidingDrawerInputs): SlidingDrawerSvgs {
  const panels = generateSlidingDrawerPanels(input);
  return generateSlidingDrawerSvgsFromPanels(panels);
}

type SlidingDrawerAllPanels = {
  outer: SlidingDrawerOuterPanels;
  drawer: SlidingDrawerDrawerPanels;
};

function normalizePanel(panel: SlidingDrawerPanel2D): {
  outline: { x: number; y: number }[];
  cutouts: { x: number; y: number }[][];
  w: number;
  h: number;
} {
  const allPts = [...panel.outline, ...(panel.cutouts ? panel.cutouts.flat() : [])];
  const b = bbox(allPts);
  const shift = pt(-b.minX, -b.minY);
  const outline = panel.outline.map((p) => add(p, shift));
  const cutouts = (panel.cutouts ?? []).map((c) => c.map((p) => add(p, shift)));
  return {
    outline,
    cutouts,
    w: b.maxX - b.minX,
    h: b.maxY - b.minY,
  };
}

function panelToPathD(panel: { outline: { x: number; y: number }[]; cutouts: { x: number; y: number }[][] }) {
  const outerPath = pathFromPoints(panel.outline);
  const cutoutPaths = panel.cutouts.map((c) => pathFromPoints(c)).join(' ');
  return cutoutPaths ? `${outerPath} ${cutoutPaths}` : outerPath;
}

function renderPlacedPanel(opts: {
  panel: SlidingDrawerPanel2D;
  x: number;
  y: number;
  label: string;
  panelId: string;
}): { svg: string; w: number; h: number } {
  const norm = normalizePanel(opts.panel);
  const d = panelToPathD(norm);
  const svg = `\n  <g data-panel-id="${opts.panelId}" transform="translate(${opts.x.toFixed(3)} ${opts.y.toFixed(3)})">\n    <path d="${d}" fill="none" stroke="#000" stroke-width="0.2" fill-rule="evenodd" />\n  </g>`;
  return { svg, w: norm.w, h: norm.h };
}

export function generateSlidingDrawerLayoutSvg(panels: SlidingDrawerAllPanels): string {
  const PADDING = 8;
  const GAP = 8;
  const GROUP_GAP = 16;

  const dFront = normalizePanel(panels.drawer.front);
  const dBack = normalizePanel(panels.drawer.back);
  const dLeft = normalizePanel(panels.drawer.left);
  const dRight = normalizePanel(panels.drawer.right);
  const dBottom = normalizePanel(panels.drawer.bottom);

  const drawerStackH = dFront.h + GAP + dBack.h;
  const drawerSideStackH = dLeft.h + GAP + dRight.h;
  const drawerRowH = Math.max(drawerStackH, drawerSideStackH, dBottom.h);

  const drawerFrontY = (drawerRowH - drawerStackH) / 2;
  const drawerLeftY = (drawerRowH - drawerSideStackH) / 2;
  const drawerBottomY = (drawerRowH - dBottom.h) / 2;

  const drawerX0 = PADDING;
  const drawerX1 = drawerX0 + dFront.w + GAP;
  const drawerX2 = drawerX1 + dLeft.w + GAP;

  const outerBottom = normalizePanel(panels.outer.bottom);
  const outerTop = normalizePanel(panels.outer.top ?? panels.outer.bottom);
  const outerLeft = normalizePanel(panels.outer.left);
  const outerRight = normalizePanel(panels.outer.right);
  const outerBack = normalizePanel(panels.outer.back);

  const outerY0 = PADDING + drawerRowH + GROUP_GAP;
  const outerX0 = PADDING;
  const outerX1 = outerX0 + outerBottom.w + GAP;
  const outerX2 = outerX1 + outerTop.w + GAP;
  const outerBottomY = outerY0;
  const outerBackY = outerBottomY + outerBottom.h + GAP;

  const outerMidX = outerX2;
  const outerMidY0 = outerY0 + Math.max(0, (outerBottom.h - (outerLeft.h + GAP + outerRight.h)) / 2);

  const placed: { svg: string; w: number; h: number }[] = [];

  placed.push(
    renderPlacedPanel({ panel: panels.drawer.front, x: drawerX0, y: PADDING + drawerFrontY, label: 'Front', panelId: 'drawer-front' }),
  );
  placed.push(
    renderPlacedPanel({
      panel: panels.drawer.back,
      x: drawerX0,
      y: PADDING + drawerFrontY + dFront.h + GAP,
      label: 'Back',
      panelId: 'drawer-back',
    }),
  );
  placed.push(
    renderPlacedPanel({ panel: panels.drawer.left, x: drawerX1, y: PADDING + drawerLeftY, label: 'Left', panelId: 'drawer-left' }),
  );
  placed.push(
    renderPlacedPanel({
      panel: panels.drawer.right,
      x: drawerX1,
      y: PADDING + drawerLeftY + dLeft.h + GAP,
      label: 'Right',
      panelId: 'drawer-right',
    }),
  );
  placed.push(
    renderPlacedPanel({ panel: panels.drawer.bottom, x: drawerX2, y: PADDING + drawerBottomY, label: 'Bottom', panelId: 'drawer-bottom' }),
  );

  placed.push(renderPlacedPanel({ panel: panels.outer.bottom, x: outerX0, y: outerBottomY, label: 'Outer Bottom', panelId: 'outer-bottom' }));
  if (panels.outer.top) {
    placed.push(renderPlacedPanel({ panel: panels.outer.top, x: outerX1, y: outerBottomY, label: 'Outer Top', panelId: 'outer-top' }));
  }
  placed.push(renderPlacedPanel({ panel: panels.outer.back, x: outerX0, y: outerBackY, label: 'Outer Back', panelId: 'outer-back' }));
  placed.push(renderPlacedPanel({ panel: panels.outer.left, x: outerMidX, y: outerMidY0, label: 'Outer Left', panelId: 'outer-left' }));
  placed.push(
    renderPlacedPanel({
      panel: panels.outer.right,
      x: outerMidX,
      y: outerMidY0 + outerLeft.h + GAP,
      label: 'Outer Right',
      panelId: 'outer-right',
    }),
  );

  const maxX = Math.max(
    drawerX2 + dBottom.w,
    outerMidX + Math.max(outerLeft.w, outerRight.w),
    outerX0 + Math.max(outerBottom.w + GAP + (panels.outer.top ? outerTop.w : 0), outerBack.w),
  );
  const outerMaxY = Math.max(outerBackY + outerBack.h, outerMidY0 + outerLeft.h + GAP + outerRight.h);
  const maxY = Math.max(PADDING + drawerRowH, outerMaxY);

  const W = maxX + PADDING;
  const H = maxY + PADDING;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(3)}mm" height="${H.toFixed(3)}mm" viewBox="0 0 ${W.toFixed(3)} ${H.toFixed(3)}">
${placed.map((p) => p.svg).join('')}
</svg>`;
}
