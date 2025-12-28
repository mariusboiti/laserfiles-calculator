'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { downloadTextFile } from '@/lib/studio/export/download';
import { calculateOffsets } from '../core/math';
import { generateDemoSvgs } from '../core/generateDemoSvgs';
import type { FitType, InlayStrategy, PreviewShape } from '../types/inlay';
import { DEFAULTS, INLAY_PRESETS, sanitizeMaterialThickness, sanitizeKerf, sanitizeExtraClearance } from '../config/defaults';
import { calculateOffsets as calculateOffsetsNew, formatOffset, generateCopyText } from '../core/offsetCalculation';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface InlayOffsetToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function InlayOffsetTool({ onResetCallback }: InlayOffsetToolProps) {
  const [kerfMm, setKerfMm] = useState<number>(DEFAULTS.kerf);
  const [thicknessMm, setThicknessMm] = useState<number>(DEFAULTS.materialThickness);
  const [extraClearance, setExtraClearance] = useState<number>(DEFAULTS.extraClearance);
  const [fit, setFit] = useState<FitType>('normal');
  const [strategy, setStrategy] = useState<InlayStrategy>('both');
  const [shape, setShape] = useState<PreviewShape>('circle');

  const [activeTab, setActiveTab] = useState<'inlay' | 'pocket'>('inlay');

  const resetToDefaults = useCallback(() => {
    setKerfMm(DEFAULTS.kerf);
    setThicknessMm(DEFAULTS.materialThickness);
    setExtraClearance(DEFAULTS.extraClearance);
    setFit('normal');
    setStrategy('both');
    setShape('circle');
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const applyPreset = useCallback((preset: typeof INLAY_PRESETS[0]) => {
    setThicknessMm(preset.materialThickness);
    setKerfMm(preset.kerf);
    setExtraClearance(preset.extraClearance || 0);
  }, []);

  const offsetResult = useMemo(() => {
    return calculateOffsetsNew({
      materialThickness: sanitizeMaterialThickness(thicknessMm),
      kerf: sanitizeKerf(kerfMm),
      extraClearance: sanitizeExtraClearance(extraClearance),
    });
  }, [thicknessMm, kerfMm, extraClearance]);

  const handleCopyOffsets = useCallback(() => {
    const text = generateCopyText(offsetResult);
    navigator.clipboard.writeText(text);
  }, [offsetResult]);

  const { result, svgs, warnings } = useMemo(() => {
    const k = clampNumber(kerfMm, 0, 10);
    const res = calculateOffsets(k, fit, strategy);

    const demo = generateDemoSvgs(shape, res.inlayOffsetMm, res.pocketOffsetMm);

    const warn: string[] = [];
    if (k <= 0) warn.push('Kerf is 0 — offsets will be 0.');
    if (Math.abs(res.inlayOffsetMm) > 2 || Math.abs(res.pocketOffsetMm) > 2) {
      warn.push('Offsets are unusually large (> 2mm). Double-check kerf and fit type.');
    }

    return { result: res, svgs: demo, warnings: warn };
  }, [kerfMm, fit, strategy, shape]);

  const previewSvg = activeTab === 'inlay' ? svgs.inlaySvg : svgs.pocketSvg;

  function exportInlay() {
    downloadTextFile('inlay.svg', svgs.inlaySvg, 'image/svg+xml');
  }

  function exportPocket() {
    downloadTextFile('pocket.svg', svgs.pocketSvg, 'image/svg+xml');
  }

  return (
    <div className="lfs-tool lfs-tool-inlay-offset-calculator">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Presets */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Quick Presets</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {INLAY_PRESETS.map((preset) => (
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
            <div className="text-sm font-medium text-slate-100">Inputs</div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Kerf (mm)</div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={kerfMm}
                  min={0}
                  onChange={(e) => setKerfMm(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Material thickness (mm)</div>
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={thicknessMm}
                  min={1}
                  max={20}
                  onChange={(e) => setThicknessMm(Number(e.target.value))}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Extra clearance (mm)</div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={extraClearance}
                  min={-0.5}
                  max={0.5}
                  onChange={(e) => setExtraClearance(Number(e.target.value))}
                />
                <div className="text-xs text-slate-400">Fine-tune fit (usually 0)</div>
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Fit type</div>
                <select
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={fit}
                  onChange={(e) => setFit(e.target.value as FitType)}
                >
                  <option value="tight">Tight fit</option>
                  <option value="normal">Normal</option>
                  <option value="loose">Loose</option>
                </select>
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Inlay strategy</div>
                <select
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as InlayStrategy)}
                >
                  <option value="both">Offset both</option>
                  <option value="pocket-only">Offset only pocket</option>
                  <option value="inlay-only">Offset only inlay</option>
                </select>
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Preview shape</div>
                <select
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={shape}
                  onChange={(e) => setShape(e.target.value as PreviewShape)}
                >
                  <option value="circle">Circle</option>
                  <option value="rounded-rect">Rounded rectangle</option>
                </select>
              </label>
            </div>

            {warnings.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-amber-300">
                {warnings.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-100">Calculator</div>
              <button
                onClick={handleCopyOffsets}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                title="Copy offsets to clipboard"
              >
                Copy Offsets
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <div>Base offset (kerf / 2)</div>
                <div className="font-mono">{offsetResult.baseOffset.toFixed(3)} mm</div>
              </div>
              <div className="flex items-center justify-between">
                <div>Total offset</div>
                <div className="font-mono">{offsetResult.totalOffset.toFixed(3)} mm</div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700 pt-2">
                <div className="font-medium">Positive (Inlay piece)</div>
                <div className="font-mono text-green-400">{formatOffset(offsetResult.positiveOffset)}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-medium">Negative (Base cutout)</div>
                <div className="font-mono text-blue-400">{formatOffset(offsetResult.negativeOffset)}</div>
              </div>
            </div>

            {offsetResult.warnings.length > 0 && (
              <div className="mt-3 space-y-1 rounded-md border border-amber-800 bg-amber-950/20 p-2 text-xs text-amber-300">
                {offsetResult.warnings.map((w, i) => (
                  <div key={i}>⚠️ {w}</div>
                ))}
              </div>
            )}

            <div className="mt-3 text-xs text-slate-400">
              Formula: offset = kerf / 2 + extra clearance
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-100">Preview</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('inlay')}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  activeTab === 'inlay'
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                Inlay
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pocket')}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  activeTab === 'pocket'
                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                Pocket
              </button>
            </div>
          </div>

          <div className="mt-3 overflow-auto rounded-lg border border-slate-800 bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full">
            <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportInlay}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              Export inlay.svg
            </button>
            <button
              type="button"
              onClick={exportPocket}
              className="rounded-md border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900"
            >
              Export pocket.svg
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
