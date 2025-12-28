'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { downloadTextFile } from '@/lib/studio/export/download';
import { generateLayoutSvg } from '../core/generateLayoutSvg';
import { DEFAULTS, SHEET_PRESETS } from '../config/defaults';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function maxCount(sheet: number, item: number, spacing: number) {
  if (sheet <= 0 || item <= 0) return 1;
  return Math.max(1, Math.floor((sheet + spacing) / (item + spacing)));
}

function getTemplateDimsMm(templateSvg: string) {
  const pxToMm = 25.4 / 96;
  const parseLen = (v: string | null) => {
    if (!v) return null;
    const t = v.trim();
    const mm = t.match(/^([0-9.+-eE]+)\s*mm$/);
    if (mm) return Number(mm[1]);
    const px = t.match(/^([0-9.+-eE]+)\s*px$/);
    if (px) return Number(px[1]) * pxToMm;
    const num = t.match(/^([0-9.+-eE]+)$/);
    if (num) return Number(num[1]) * pxToMm;
    return null;
  };

  const parser = new DOMParser();
  const doc = parser.parseFromString(templateSvg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) throw new Error('Invalid SVG: missing <svg>');

  const wmm = parseLen(svgEl.getAttribute('width'));
  const hmm = parseLen(svgEl.getAttribute('height'));
  if (wmm && hmm) return { w: wmm, h: hmm };

  const vb = svgEl.getAttribute('viewBox');
  if (vb) {
    const parts = vb
      .trim()
      .split(/\s+|,/)
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
    if (parts.length === 4) return { w: parts[2], h: parts[3] };
  }

  throw new Error('Cannot determine template size (need width/height or viewBox)');
}

interface OrnamentLayoutToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function OrnamentLayoutTool({ onResetCallback }: OrnamentLayoutToolProps) {
  const [templateSvg, setTemplateSvg] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>(DEFAULTS.templateName);

  const [rows, setRows] = useState<number>(DEFAULTS.rows);
  const [cols, setCols] = useState<number>(DEFAULTS.cols);
  const [spacingXmm, setSpacingXmm] = useState<number>(DEFAULTS.gapX);
  const [spacingYmm, setSpacingYmm] = useState<number>(DEFAULTS.gapY);

  const [sheetWidthMm, setSheetWidthMm] = useState<number>(DEFAULTS.sheetW);
  const [sheetHeightMm, setSheetHeightMm] = useState<number>(DEFAULTS.sheetH);

  const [centerLayout, setCenterLayout] = useState<boolean>(DEFAULTS.center);
  const [showSheetOutline, setShowSheetOutline] = useState<boolean>(DEFAULTS.showSheetOutline);
  const [autoFit, setAutoFit] = useState<boolean>(DEFAULTS.autoFit);

  const resetToDefaults = useCallback(() => {
    setTemplateSvg('');
    setTemplateName(DEFAULTS.templateName);
    setRows(DEFAULTS.rows);
    setCols(DEFAULTS.cols);
    setSpacingXmm(DEFAULTS.gapX);
    setSpacingYmm(DEFAULTS.gapY);
    setSheetWidthMm(DEFAULTS.sheetW);
    setSheetHeightMm(DEFAULTS.sheetH);
    setCenterLayout(DEFAULTS.center);
    setShowSheetOutline(DEFAULTS.showSheetOutline);
    setAutoFit(DEFAULTS.autoFit);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const applyPreset = useCallback((preset: typeof SHEET_PRESETS[0]) => {
    setSheetWidthMm(preset.widthMm);
    setSheetHeightMm(preset.heightMm);
  }, []);

  const { svg, error, meta } = useMemo(() => {
    if (!templateSvg) {
      return { svg: '', error: 'Upload an SVG template to start.', meta: null as null | { gridW: number; gridH: number } };
    }

    try {
      const safeSheetW = clampNumber(sheetWidthMm, 1, 5000);
      const safeSheetH = clampNumber(sheetHeightMm, 1, 5000);
      const safeSpacingX = clampNumber(spacingXmm, 0, 500);
      const safeSpacingY = clampNumber(spacingYmm, 0, 500);

      const dims = getTemplateDimsMm(templateSvg);

      const effCols = autoFit ? maxCount(safeSheetW, dims.w, safeSpacingX) : clampNumber(cols, 1, 999);
      const effRows = autoFit ? maxCount(safeSheetH, dims.h, safeSpacingY) : clampNumber(rows, 1, 999);

      const out = generateLayoutSvg({
        templateSvg,
        rows: effRows,
        cols: effCols,
        spacingXmm: safeSpacingX,
        spacingYmm: safeSpacingY,
        sheetWidthMm: safeSheetW,
        sheetHeightMm: safeSheetH,
        centerLayout,
        showSheetOutline,
      });

      const gridW = effCols * dims.w + (effCols - 1) * safeSpacingX;
      const gridH = effRows * dims.h + (effRows - 1) * safeSpacingY;

      return { svg: out, error: '', meta: { gridW, gridH } };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate layout';
      return { svg: '', error: msg, meta: null as null | { gridW: number; gridH: number } };
    }
  }, [
    templateSvg,
    rows,
    cols,
    spacingXmm,
    spacingYmm,
    sheetWidthMm,
    sheetHeightMm,
    centerLayout,
    showSheetOutline,
    autoFit,
  ]);

  function onExport() {
    if (!svg) return;
    downloadTextFile('ornament-layout.svg', svg, 'image/svg+xml');
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setTemplateSvg(text);
    setTemplateName(file.name);
  }

  function setPresetSheet(w: number, h: number) {
    setSheetWidthMm(w);
    setSheetHeightMm(h);
  }

  const overflowWarning =
    meta && (meta.gridW > sheetWidthMm + 0.001 || meta.gridH > sheetHeightMm + 0.001)
      ? `Layout exceeds sheet: grid ${meta.gridW.toFixed(1)}×${meta.gridH.toFixed(1)}mm on sheet ${sheetWidthMm}×${sheetHeightMm}mm`
      : '';

  return (
    <div className="lfs-tool lfs-tool-ornament-layout-planner">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Ornament / Tag Template</div>
            <div className="mt-3 grid gap-2">
              <input
                type="file"
                accept="image/svg+xml,.svg"
                onChange={(e) => onUpload(e.target.files?.[0])}
                className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:text-slate-200 hover:file:bg-slate-800"
              />
              {templateName ? <div className="text-xs text-slate-400">Loaded: {templateName}</div> : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Quick Presets</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SHEET_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
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
                  disabled={autoFit}
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
                  disabled={autoFit}
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
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={centerLayout} onChange={(e) => setCenterLayout(e.target.checked)} />
                Center layout
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showSheetOutline}
                  onChange={(e) => setShowSheetOutline(e.target.checked)}
                />
                Show sheet outline
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={autoFit} onChange={(e) => setAutoFit(e.target.checked)} />
                Auto-fit
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-100">Sheet</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPresetSheet(210, 297)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setPresetSheet(300, 200)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  300×200
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Sheet width (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={sheetWidthMm}
                  min={1}
                  onChange={(e) => setSheetWidthMm(Number(e.target.value))}
                />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Sheet height (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={sheetHeightMm}
                  min={1}
                  onChange={(e) => setSheetHeightMm(Number(e.target.value))}
                />
              </label>
            </div>

            {overflowWarning ? <div className="mt-3 text-xs text-amber-300">{overflowWarning}</div> : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={onExport}
                disabled={!svg}
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
              >
                Export SVG
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-2 text-xs text-slate-300">Preview</div>
          {error ? <div className="mb-3 text-xs text-slate-400">{error}</div> : null}
          <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full">
            {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="text-sm text-slate-500">No preview</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
