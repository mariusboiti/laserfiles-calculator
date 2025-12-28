'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SlidingDrawerInputs } from '../../core/types';
import {
  generateSlidingDrawerLayoutSvg,
  generateSlidingDrawerPanels,
  generateSlidingDrawerSvgs,
} from '../../core/sliding/generateSlidingDrawerSvgs';
import type { PathOperation } from '../../../src/lib/types';
import { importSvgAsFace } from '../../../src/lib/svgImport';
import { buildOverlayGroupSvg, mergeSvgWithOverlays, type EngraveOverlayItem } from '../../core/shared/mergeSvgWithOverlays';
import { computeDrawerDimensions } from '../../core/sliding/drawerMath';
import { exportSingleSvg } from '../../export/exportSvgs';
import { validateSlidingDrawerInputs, calculateRecommendedFingerWidth } from '../../core/validation';
import { generateExportFilename } from '../../core/exportNaming';
import { GOLDEN_PRESETS, adjustPresetForSlidingDrawer } from '../../core/presets';
import { checkSlidingDrawerSvgs } from '../../core/regressionChecks';
import { DRAWER_PRESETS, DEFAULTS } from '../../config/defaults';
import { validateBoxInputs, validateDrawerInputs } from '../../core/shared/validate';
import { exportSlidingDrawerZip } from '../../export/exportZip';
import { SlidingDrawerBoxPreview3D } from './SlidingDrawerBoxPreview3D';
import { SlidingDrawerPanelPreview } from './SlidingDrawerPanelPreview';

type SlidingDrawerEngraveTarget =
  | 'outer-back'
  | 'outer-left'
  | 'outer-right'
  | 'outer-bottom'
  | 'outer-top'
  | 'drawer-front'
  | 'drawer-back'
  | 'drawer-left'
  | 'drawer-right'
  | 'drawer-bottom';

function bbox(points: { x: number; y: number }[]) {
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

function injectOverlaysIntoLayoutSvg(layoutSvg: string, overlaysByPanelId: Record<string, string>): string {
  let next = layoutSvg;
  for (const [panelId, overlaySvg] of Object.entries(overlaysByPanelId)) {
    if (!overlaySvg) continue;
    const marker = `data-panel-id="${panelId}"`;
    const idx = next.indexOf(marker);
    if (idx < 0) continue;

    const gOpenIdx = next.lastIndexOf('<g', idx);
    if (gOpenIdx < 0) continue;

    const gOpenEnd = next.indexOf('>', idx);
    if (gOpenEnd < 0) continue;

    const insertAt = gOpenEnd + 1;
    next = `${next.slice(0, insertAt)}${overlaySvg}${next.slice(insertAt)}`;
  }
  return next;
}

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface SlidingDrawerUIProps {
  boxTypeSelector?: ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

export function SlidingDrawerUI({ boxTypeSelector, unitSystem, onResetCallback }: SlidingDrawerUIProps) {
  const MM_PER_INCH = 25.4;
  const unitLabel = unitSystem;
  const toUser = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm);
  const fromUser = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val);

  const [widthMm, setWidthMm] = useState(120);
  const [depthMm, setDepthMm] = useState(80);
  const [heightMm, setHeightMm] = useState(60);
  const [thicknessMm, setThicknessMm] = useState(3);
  const [kerfMm, setKerfMm] = useState(0.15);

  const [drawerClearanceMm, setDrawerClearanceMm] = useState(1);
  const [drawerBottomOffsetMm, setDrawerBottomOffsetMm] = useState(0);
  const [frontFaceStyle, setFrontFaceStyle] = useState<'flush' | 'lip'>('flush');
  const [fingerWidthMm, setFingerWidthMm] = useState(10);
  const [autoFitFingers, setAutoFitFingers] = useState(true);

  const [previewMode, setPreviewMode] = useState<'2d' | 'faces' | '3d'>('2d');

  const [engraveOp, setEngraveOp] = useState<PathOperation>('engrave');
  const [engraveTarget, setEngraveTarget] = useState<SlidingDrawerEngraveTarget>('outer-back');
  const [engraveItems, setEngraveItems] = useState<EngraveOverlayItem[]>([]);
  const [selectedEngraveId, setSelectedEngraveId] = useState<string | null>(null);

  const { input, svgs, panels, layoutSvg, dims, validation } = useMemo(() => {
    const input: SlidingDrawerInputs = {
      widthMm: clampNumber(widthMm, 10, 5000),
      depthMm: clampNumber(depthMm, 10, 5000),
      heightMm: clampNumber(heightMm, 10, 5000),
      thicknessMm: clampNumber(thicknessMm, 1, 50),
      kerfMm: clampNumber(kerfMm, 0, 1),
      drawerClearanceMm: clampNumber(drawerClearanceMm, 0, 50),
      drawerBottomOffsetMm: clampNumber(drawerBottomOffsetMm, 0, heightMm / 2),
      frontFaceStyle,
      fingerWidthMm: clampNumber(fingerWidthMm, 2, 200),
      autoFitFingers,
    };

    const validation = validateSlidingDrawerInputs(input);
    const dims = computeDrawerDimensions(input);
    const panels = generateSlidingDrawerPanels(input);
    const baseSvgs = generateSlidingDrawerSvgs(input);

    const mergedSvgs = {
      outer: {
        back: mergeSvgWithOverlays(
          baseSvgs.outer.back,
          engraveItems.filter((it) => it.id.startsWith('outer-back:')),
        ),
        left: mergeSvgWithOverlays(
          baseSvgs.outer.left,
          engraveItems.filter((it) => it.id.startsWith('outer-left:')),
        ),
        right: mergeSvgWithOverlays(
          baseSvgs.outer.right,
          engraveItems.filter((it) => it.id.startsWith('outer-right:')),
        ),
        bottom: mergeSvgWithOverlays(
          baseSvgs.outer.bottom,
          engraveItems.filter((it) => it.id.startsWith('outer-bottom:')),
        ),
        top: baseSvgs.outer.top
          ? mergeSvgWithOverlays(baseSvgs.outer.top, engraveItems.filter((it) => it.id.startsWith('outer-top:')))
          : undefined,
      },
      drawer: {
        front: mergeSvgWithOverlays(
          baseSvgs.drawer.front,
          engraveItems.filter((it) => it.id.startsWith('drawer-front:')),
        ),
        back: mergeSvgWithOverlays(
          baseSvgs.drawer.back,
          engraveItems.filter((it) => it.id.startsWith('drawer-back:')),
        ),
        left: mergeSvgWithOverlays(
          baseSvgs.drawer.left,
          engraveItems.filter((it) => it.id.startsWith('drawer-left:')),
        ),
        right: mergeSvgWithOverlays(
          baseSvgs.drawer.right,
          engraveItems.filter((it) => it.id.startsWith('drawer-right:')),
        ),
        bottom: mergeSvgWithOverlays(
          baseSvgs.drawer.bottom,
          engraveItems.filter((it) => it.id.startsWith('drawer-bottom:')),
        ),
      },
      frontFace: baseSvgs.frontFace,
    };

    const baseLayoutSvg = generateSlidingDrawerLayoutSvg(panels);
    const overlaysByPanelId: Record<string, string> = {
      'outer-back': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-back:'))),
      'outer-left': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-left:'))),
      'outer-right': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-right:'))),
      'outer-bottom': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-bottom:'))),
      'outer-top': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('outer-top:'))),
      'drawer-front': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-front:'))),
      'drawer-back': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-back:'))),
      'drawer-left': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-left:'))),
      'drawer-right': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-right:'))),
      'drawer-bottom': buildOverlayGroupSvg(engraveItems.filter((it) => it.id.startsWith('drawer-bottom:'))),
    };
    const layoutSvg = injectOverlaysIntoLayoutSvg(baseLayoutSvg, overlaysByPanelId);

    return { input, svgs: mergedSvgs, panels, layoutSvg, dims, validation };
  }, [
    widthMm,
    depthMm,
    heightMm,
    thicknessMm,
    kerfMm,
    drawerClearanceMm,
    drawerBottomOffsetMm,
    frontFaceStyle,
    fingerWidthMm,
    autoFitFingers,
    engraveItems,
  ]);

  const selectedEngraveItem = selectedEngraveId ? engraveItems.find((x) => x.id === selectedEngraveId) ?? null : null;

  const setSelectedEngravePlacement = (patch: Partial<EngraveOverlayItem['placement']>) => {
    if (!selectedEngraveId) return;
    setEngraveItems((prev) =>
      prev.map((it) => (it.id === selectedEngraveId ? { ...it, placement: { ...it.placement, ...patch } } : it)),
    );
  };

  function exportAllPanels() {
    const outerKeys = ['back', 'left', 'right', 'bottom'] as const;
    outerKeys.forEach((k) => {
      const filename = generateExportFilename('sliding_drawer', `outer-${k}`);
      exportSingleSvg(filename, svgs.outer[k]);
    });
    if (svgs.outer.top) {
      const filename = generateExportFilename('sliding_drawer', 'outer-top');
      exportSingleSvg(filename, svgs.outer.top);
    }

    const drawerKeys = ['front', 'back', 'left', 'right', 'bottom'] as const;
    drawerKeys.forEach((k) => {
      const filename = generateExportFilename('sliding_drawer', `drawer-${k}`);
      exportSingleSvg(filename, svgs.drawer[k]);
    });

    if (svgs.frontFace) {
      const filename = generateExportFilename('sliding_drawer', 'frontface');
      exportSingleSvg(filename, svgs.frontFace);
    }
  }

  async function exportAllZip() {
    await exportSlidingDrawerZip(
      svgs,
      input.widthMm,
      input.depthMm,
      input.heightMm,
      input.thicknessMm,
      input.kerfMm
    );
  }

  const recommendedFinger = useMemo(
    () => calculateRecommendedFingerWidth(widthMm, depthMm, heightMm),
    [widthMm, depthMm, heightMm]
  );

  function applyPreset(presetName: string) {
    const preset = GOLDEN_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    
    const adjusted = adjustPresetForSlidingDrawer(preset);
    setWidthMm(adjusted.widthMm);
    setDepthMm(adjusted.depthMm);
    setHeightMm(adjusted.heightMm);
    setThicknessMm(adjusted.thicknessMm);
    setKerfMm(adjusted.kerfMm);
    setFingerWidthMm(adjusted.fingerWidthMm);
    setDrawerClearanceMm(adjusted.drawerClearanceMm);
    setDrawerBottomOffsetMm(adjusted.drawerBottomOffsetMm);
  }

  const regressionCheck = useMemo(() => {
    return checkSlidingDrawerSvgs(svgs);
  }, [svgs]);

  const boxWarnings = useMemo(() => {
    const warnings = validateBoxInputs({
      widthMm: input.widthMm,
      depthMm: input.depthMm,
      heightMm: input.heightMm,
      thicknessMm: input.thicknessMm,
      kerfMm: input.kerfMm,
      fingerWidthMm: input.fingerWidthMm,
    });
    const drawerWarnings = validateDrawerInputs({
      widthMm: input.widthMm,
      thicknessMm: input.thicknessMm,
      kerfMm: input.kerfMm,
      clearanceMm: input.drawerClearanceMm,
    });
    return [...warnings, ...drawerWarnings];
  }, [input]);

  function applyBoxPreset(presetName: string) {
    const preset = DRAWER_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    
    setWidthMm(preset.widthMm);
    setDepthMm(preset.depthMm);
    setHeightMm(preset.heightMm);
    setThicknessMm(preset.thicknessMm);
  }

  function resetToDefaults() {
    setWidthMm(DEFAULTS.drawer.widthMm);
    setDepthMm(DEFAULTS.drawer.depthMm);
    setHeightMm(DEFAULTS.drawer.heightMm);
    setThicknessMm(DEFAULTS.common.thicknessMm);
    setKerfMm(DEFAULTS.common.kerfMm);
    setFingerWidthMm(DEFAULTS.drawer.fingerWidthMm);
    setDrawerClearanceMm(DEFAULTS.drawer.drawerClearanceMm);
    setDrawerBottomOffsetMm(DEFAULTS.drawer.drawerBottomOffsetMm);
    setFrontFaceStyle(DEFAULTS.drawer.frontFaceStyle);
    setAutoFitFingers(DEFAULTS.drawer.autoFitFingers);
  }

  // Register reset callback with parent
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">LaserFilesPro Box Maker</h1>
            <p className="text-[11px] text-slate-400">Sliding Drawer Box (v1) · panel-by-panel SVG export</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="space-y-4">
              {boxTypeSelector ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">{boxTypeSelector}</div>
              ) : null}

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Box Presets</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DRAWER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyBoxPreset(preset.name)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                      title={preset.description}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Outer Box Dimensions</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Width ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(widthMm)}
                      onChange={(e) => setWidthMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Depth ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(depthMm)}
                      onChange={(e) => setDepthMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Height ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(heightMm)}
                      onChange={(e) => setHeightMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Material</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Thickness ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(thicknessMm)}
                      onChange={(e) => setThicknessMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Kerf ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.001 : 0.01}
                      value={toUser(kerfMm)}
                      onChange={(e) => setKerfMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Drawer Settings</div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Clearance ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(drawerClearanceMm)}
                      onChange={(e) => setDrawerClearanceMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Bottom Offset ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(drawerBottomOffsetMm)}
                      onChange={(e) => setDrawerBottomOffsetMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Front Face Style</div>
                    <select
                      value={frontFaceStyle}
                      onChange={(e) => setFrontFaceStyle(e.target.value as 'flush' | 'lip')}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="flush">Flush</option>
                      <option value="lip">Lip</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Finger Joints</div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Finger width ({unitLabel})</div>
                    <input
                      type="number"
                      step={unitSystem === 'in' ? 0.01 : 0.1}
                      value={toUser(fingerWidthMm)}
                      onChange={(e) => setFingerWidthMm(fromUser(Number(e.target.value)))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoFitFingers}
                      onChange={(e) => setAutoFitFingers(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">Auto-fit fingers</span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Engrave SVG</div>
                <div className="mt-3 grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/svg+xml,.svg"
                      className="block w-[220px] text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-[11px] file:text-slate-200 hover:file:bg-slate-700"
                      onChange={async (e) => {
                        const inputEl = e.currentTarget as HTMLInputElement | null;
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const text = await f.text();
                        const face = importSvgAsFace({
                          svgText: text,
                          id: `import-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                          op: engraveOp,
                          label: f.name,
                        });
                        if (!face) {
                          if (inputEl) inputEl.value = '';
                          return;
                        }

                        const targetPanel =
                          engraveTarget === 'outer-back'
                              ? panels.outer.back
                              : engraveTarget === 'outer-left'
                                ? panels.outer.left
                                : engraveTarget === 'outer-right'
                                  ? panels.outer.right
                                  : engraveTarget === 'outer-bottom'
                                    ? panels.outer.bottom
                                    : engraveTarget === 'outer-top'
                                      ? panels.outer.top ?? panels.outer.bottom
                                      : engraveTarget === 'drawer-front'
                                        ? panels.drawer.front
                                        : engraveTarget === 'drawer-back'
                                          ? panels.drawer.back
                                          : engraveTarget === 'drawer-left'
                                            ? panels.drawer.left
                                            : engraveTarget === 'drawer-right'
                                              ? panels.drawer.right
                                              : panels.drawer.bottom;

                        const b = bbox(targetPanel.outline);
                        const targetCx = (b.minX + b.maxX) / 2;
                        const targetCy = (b.minY + b.maxY) / 2;

                        const id = `${engraveTarget}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
                        setEngraveItems((prev) => [
                          ...prev,
                          {
                            id,
                            fileName: f.name,
                            op: engraveOp,
                            face,
                            placement: { x: targetCx, y: targetCy, rotation: 0, scale: 1 },
                          },
                        ]);
                        setSelectedEngraveId(id);
                        if (inputEl) inputEl.value = '';
                      }}
                    />

                    <select
                      value={engraveOp}
                      onChange={(e) => setEngraveOp(e.target.value as PathOperation)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      title="Operation"
                    >
                      <option value="engrave">ENGRAVE</option>
                      <option value="score">SCORE</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">Target panel</div>
                      <select
                        value={engraveTarget}
                        onChange={(e) => setEngraveTarget(e.target.value as SlidingDrawerEngraveTarget)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        <optgroup label="Outer">
                          <option value="outer-back">outer-back</option>
                          <option value="outer-left">outer-left</option>
                          <option value="outer-right">outer-right</option>
                          <option value="outer-bottom">outer-bottom</option>
                          <option value="outer-top">outer-top</option>
                        </optgroup>
                        <optgroup label="Drawer">
                          <option value="drawer-front">drawer-front</option>
                          <option value="drawer-back">drawer-back</option>
                          <option value="drawer-left">drawer-left</option>
                          <option value="drawer-right">drawer-right</option>
                          <option value="drawer-bottom">drawer-bottom</option>
                        </optgroup>
                      </select>
                    </label>
                  </div>

                  {engraveItems.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {engraveItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedEngraveId(item.id)}
                          className={
                            selectedEngraveId === item.id
                              ? 'w-full rounded-md border border-sky-500 bg-slate-900 px-2 py-1 text-left text-[11px] text-slate-100'
                              : 'w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-left text-[11px] text-slate-300 hover:border-slate-600'
                          }
                        >
                          {item.fileName}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {selectedEngraveItem ? (
                    <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-400">Placement</div>
                        <button
                          type="button"
                          onClick={() => {
                            setEngraveItems((prev) => prev.filter((x) => x.id !== selectedEngraveItem.id));
                            setSelectedEngraveId(null);
                          }}
                          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-rose-500 hover:text-rose-200"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>X ({unitLabel})</span>
                          <input
                            type="number"
                            step={unitSystem === 'in' ? 0.01 : 0.1}
                            value={toUser(selectedEngraveItem.placement.x)}
                            onChange={(e) => setSelectedEngravePlacement({ x: fromUser(Number(e.target.value)) })}
                            className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>Y ({unitLabel})</span>
                          <input
                            type="number"
                            step={unitSystem === 'in' ? 0.01 : 0.1}
                            value={toUser(selectedEngraveItem.placement.y)}
                            onChange={(e) => setSelectedEngravePlacement({ y: fromUser(Number(e.target.value)) })}
                            className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>Rotation (deg)</span>
                          <input
                            type="number"
                            step={1}
                            value={(selectedEngraveItem.placement.rotation * 180) / Math.PI}
                            onChange={(e) => {
                              const deg = Number(e.target.value);
                              const rad = (deg * Math.PI) / 180;
                              setSelectedEngravePlacement({ rotation: rad });
                            }}
                            className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>Scale</span>
                          <input
                            type="number"
                            step={0.01}
                            min={0.01}
                            value={selectedEngraveItem.placement.scale}
                            onChange={(e) => setSelectedEngravePlacement({ scale: Math.max(0.01, Number(e.target.value)) })}
                            className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 p-3">
                  <div className="text-sm font-medium text-red-300">Errors</div>
                  <ul className="mt-2 space-y-1 text-xs text-red-200">
                    {validation.errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">Warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {validation.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fingerWidthMm !== recommendedFinger && (
                <div className="rounded-lg border border-blue-800 bg-blue-950/40 p-3">
                  <div className="text-xs text-blue-200">
                    💡 Recommended finger width: {recommendedFinger.toFixed(1)}mm
                  </div>
                </div>
              )}

              {boxWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">Warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {boxWarnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!regressionCheck.passed && (
                <div className="rounded-lg border border-orange-800 bg-orange-950/40 p-3">
                  <div className="text-sm font-medium text-orange-300">Regression Checks</div>
                  <ul className="mt-2 space-y-1 text-xs text-orange-200">
                    {regressionCheck.checks.filter(c => !c.passed).map((c, i) => (
                      <li key={i}>• {c.name}: {c.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Export</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportAllZip}
                    disabled={!validation.isValid}
                    className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export ZIP (All)
                  </button>
                  <button
                    type="button"
                    onClick={exportAllPanels}
                    disabled={!validation.isValid}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export All (Individual)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                <button
                  type="button"
                  onClick={() => setPreviewMode('2d')}
                  className={
                    previewMode === '2d'
                      ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                      : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                  }
                >
                  2D Panels
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('faces')}
                  className={
                    previewMode === 'faces'
                      ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                      : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                  }
                >
                  Faces list
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('3d')}
                  className={
                    previewMode === '3d'
                      ? 'px-3 py-1 text-[11px] font-medium text-slate-950 bg-sky-300'
                      : 'px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-900'
                  }
                >
                  3D
                </button>
              </div>
              {previewMode === '3d' ? <div className="text-[11px] text-slate-400">Sliding Drawer 3D preview</div> : null}
            </div>

            {previewMode === '3d' ? (
              <SlidingDrawerBoxPreview3D input={input} panels={panels} />
            ) : previewMode === 'faces' ? (
              <SlidingDrawerPanelPreview key="faces" layoutSvg={layoutSvg} panels={panels} initialView="faces" />
            ) : (
              <SlidingDrawerPanelPreview key="2d" layoutSvg={layoutSvg} panels={panels} initialView="layout" />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
