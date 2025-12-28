'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { downloadTextFile } from '@/lib/studio/export/download';
import { generateJigSvg } from '../core/generateJigSvg';
import type { ObjectShape } from '../types/jig';
import { DEFAULTS, JIG_PRESETS } from '../config/defaults';
import { calculateLayout, generateLayoutSummary } from '../core/layoutCalculation';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface JigFixtureToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function JigFixtureTool({ onResetCallback }: JigFixtureToolProps) {
  const [bedWidthMm, setBedWidthMm] = useState<number>(DEFAULTS.bedW);
  const [bedHeightMm, setBedHeightMm] = useState<number>(DEFAULTS.bedH);

  const [objectWidthMm, setObjectWidthMm] = useState<number>(DEFAULTS.objectW);
  const [objectHeightMm, setObjectHeightMm] = useState<number>(DEFAULTS.objectH);
  const [objectShape, setObjectShape] = useState<ObjectShape>(DEFAULTS.objectShape);

  const [rows, setRows] = useState<number>(DEFAULTS.rows);
  const [cols, setCols] = useState<number>(DEFAULTS.cols);
  const [spacingXmm, setSpacingXmm] = useState<number>(DEFAULTS.gapX);
  const [spacingYmm, setSpacingYmm] = useState<number>(DEFAULTS.gapY);
  const [marginMm, setMarginMm] = useState<number>(DEFAULTS.margin);

  const [centerLayout, setCenterLayout] = useState<boolean>(DEFAULTS.center);
  const [showBedOutline, setShowBedOutline] = useState<boolean>(DEFAULTS.showBedOutline);

  const [cutHoles, setCutHoles] = useState<boolean>(DEFAULTS.holeMode === 'cut');
  const [engraveOutline, setEngraveOutline] = useState<boolean>(false);
  const [showNumbers, setShowNumbers] = useState<boolean>(DEFAULTS.numbering);

  const resetToDefaults = useCallback(() => {
    setBedWidthMm(DEFAULTS.bedW);
    setBedHeightMm(DEFAULTS.bedH);
    setObjectWidthMm(DEFAULTS.objectW);
    setObjectHeightMm(DEFAULTS.objectH);
    setObjectShape(DEFAULTS.objectShape);
    setRows(DEFAULTS.rows);
    setCols(DEFAULTS.cols);
    setSpacingXmm(DEFAULTS.gapX);
    setSpacingYmm(DEFAULTS.gapY);
    setMarginMm(DEFAULTS.margin);
    setCenterLayout(DEFAULTS.center);
    setShowBedOutline(DEFAULTS.showBedOutline);
    setCutHoles(DEFAULTS.holeMode === 'cut');
    setEngraveOutline(false);
    setShowNumbers(DEFAULTS.numbering);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const applyPreset = useCallback((preset: typeof JIG_PRESETS[0]) => {
    setBedWidthMm(preset.bedW);
    setBedHeightMm(preset.bedH);
    setRows(preset.rows);
    setCols(preset.cols);
    setObjectWidthMm(preset.objectW);
    setObjectHeightMm(preset.objectH);
  }, []);

  const handleCopyLayout = useCallback(() => {
    const summary = generateLayoutSummary({
      bedW: bedWidthMm,
      bedH: bedHeightMm,
      rows,
      cols,
      objectW: objectWidthMm,
      objectH: objectHeightMm,
      gapX: spacingXmm,
      gapY: spacingYmm,
    });
    navigator.clipboard.writeText(summary);
  }, [bedWidthMm, bedHeightMm, rows, cols, objectWidthMm, objectHeightMm, spacingXmm, spacingYmm]);

  const layoutResult = useMemo(() => {
    return calculateLayout({
      bedW: bedWidthMm,
      bedH: bedHeightMm,
      margin: marginMm,
      rows,
      cols,
      gapX: spacingXmm,
      gapY: spacingYmm,
      objectW: objectWidthMm,
      objectH: objectHeightMm,
      objectShape,
      center: centerLayout,
    });
  }, [bedWidthMm, bedHeightMm, marginMm, rows, cols, spacingXmm, spacingYmm, objectWidthMm, objectHeightMm, objectShape, centerLayout]);

  const { svg, meta, warnings } = useMemo(() => {
    const opts = {
      bedWidthMm: clampNumber(bedWidthMm, 1, 5000),
      bedHeightMm: clampNumber(bedHeightMm, 1, 5000),
      objectWidthMm: clampNumber(objectWidthMm, 0.1, 5000),
      objectHeightMm: clampNumber(objectHeightMm, 0.1, 5000),
      objectShape,
      rows: clampNumber(rows, 1, 999),
      cols: clampNumber(cols, 1, 999),
      spacingXmm: clampNumber(spacingXmm, 0, 500),
      spacingYmm: clampNumber(spacingYmm, 0, 500),
      marginMm: clampNumber(marginMm, 0, 500),
      centerLayout,
      showBedOutline,
      cutHoles,
      engraveOutline,
      showNumbers,
    };

    const out = generateJigSvg(opts);

    const warn: string[] = [];
    const gridW = out.meta.gridWidthMm;
    const gridH = out.meta.gridHeightMm;

    const usableW = opts.bedWidthMm - (centerLayout ? 0 : 2 * opts.marginMm);
    const usableH = opts.bedHeightMm - (centerLayout ? 0 : 2 * opts.marginMm);

    if (!centerLayout && (gridW > usableW + 0.001 || gridH > usableH + 0.001)) {
      warn.push(`Grid exceeds usable bed area: ${gridW.toFixed(1)}×${gridH.toFixed(1)}mm.`);
    }
    if (centerLayout && (gridW > opts.bedWidthMm + 0.001 || gridH > opts.bedHeightMm + 0.001)) {
      warn.push(`Grid exceeds bed: ${gridW.toFixed(1)}×${gridH.toFixed(1)}mm.`);
    }

    return { svg: out.svg, meta: out.meta, warnings: warn };
  }, [
    bedWidthMm,
    bedHeightMm,
    objectWidthMm,
    objectHeightMm,
    objectShape,
    rows,
    cols,
    spacingXmm,
    spacingYmm,
    marginMm,
    centerLayout,
    showBedOutline,
    cutHoles,
    engraveOutline,
    showNumbers,
  ]);

  function exportSvg() {
    downloadTextFile('jig-fixture.svg', svg, 'image/svg+xml');
  }

  function setPresetBed(w: number, h: number) {
    setBedWidthMm(w);
    setBedHeightMm(h);
  }

  return (
    <div className="lfs-tool lfs-tool-jig-fixture-generator">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-100">Laser Bed</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPresetBed(300, 200)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  300×200
                </button>
                <button
                  type="button"
                  onClick={() => setPresetBed(430, 305)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  Glowforge
                </button>
                <button
                  type="button"
                  onClick={() => setPresetBed(400, 400)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  400×400
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Bed width (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={bedWidthMm}
                  onChange={(e) => setBedWidthMm(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Bed height (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={bedHeightMm}
                  onChange={(e) => setBedHeightMm(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showBedOutline}
                  onChange={(e) => setShowBedOutline(e.target.checked)}
                />
                Show bed outline
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Object</div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Object width (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={objectWidthMm}
                  onChange={(e) => setObjectWidthMm(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Object height (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={objectHeightMm}
                  onChange={(e) => setObjectHeightMm(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Object shape</div>
                <select
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={objectShape}
                  onChange={(e) => setObjectShape(e.target.value as ObjectShape)}
                >
                  <option value="rect">Rectangle</option>
                  <option value="circle">Circle</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Layout</div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Rows</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={rows}
                  min={1}
                  onChange={(e) => setRows(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Columns</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={cols}
                  min={1}
                  onChange={(e) => setCols(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Spacing X (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={spacingXmm}
                  min={0}
                  onChange={(e) => setSpacingXmm(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Spacing Y (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={spacingYmm}
                  min={0}
                  onChange={(e) => setSpacingYmm(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Margin (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={marginMm}
                  min={0}
                  onChange={(e) => setMarginMm(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={centerLayout}
                  onChange={(e) => setCenterLayout(e.target.checked)}
                />
                Center layout
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={cutHoles}
                  onChange={(e) => setCutHoles(e.target.checked)}
                />
                Cut holes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={engraveOutline}
                  onChange={(e) => setEngraveOutline(e.target.checked)}
                />
                Engrave outline (guide)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showNumbers}
                  onChange={(e) => setShowNumbers(e.target.checked)}
                />
                Number positions (engrave)
              </label>
            </div>

            {(warnings.length > 0 || layoutResult.warnings.length > 0) && (
              <div className="mt-3 space-y-1 rounded-md border border-amber-800 bg-amber-950/20 p-2 text-xs text-amber-300">
                {warnings.map((w) => (
                  <div key={w}>⚠️ {w}</div>
                ))}
                {layoutResult.warnings.map((w, i) => (
                  <div key={i}>⚠️ {w}</div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportSvg}
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                Export SVG
              </button>
              <button
                type="button"
                onClick={handleCopyLayout}
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                title="Copy layout summary"
              >
                Copy Layout
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Grid: {meta.gridWidthMm.toFixed(1)}×{meta.gridHeightMm.toFixed(1)}mm • {rows * cols} objects
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-2 text-xs text-slate-300">Preview</div>
          <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      </div>
    </div>
  );
}
