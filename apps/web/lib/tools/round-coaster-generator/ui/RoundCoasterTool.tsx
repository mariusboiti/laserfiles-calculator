'use client';

import { useMemo, useState, useEffect } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import { downloadTextFile } from '@/lib/studio/export/download';
import type { CoasterShape } from '../types/coaster';
import { generateCoasterSvg } from '../core/generateCoasterSvg';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function RoundCoasterTool() {
  const { api } = useToolUx();

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  const [shape, setShape] = useState<CoasterShape>('circle');
  const [widthMm, setWidthMm] = useState<number>(90);
  const [heightMm, setHeightMm] = useState<number>(100);

  const [textTop, setTextTop] = useState<string>('');
  const [textCenter, setTextCenter] = useState<string>('LASERFILES');
  const [textBottom, setTextBottom] = useState<string>('');

  const [autoFontSize, setAutoFontSize] = useState(true);
  const [fontSizeMm, setFontSizeMm] = useState<number>(7);

  const [showBorder, setShowBorder] = useState(true);
  const [doubleBorder, setDoubleBorder] = useState(false);

  const svg = useMemo(() => {
    try {
      return generateCoasterSvg({
        shape,
        widthMm: clampNumber(widthMm, 10, 400),
        heightMm: shape === 'shield' ? clampNumber(heightMm, 10, 400) : undefined,
        textTop: textTop.trim() ? textTop : undefined,
        textCenter,
        textBottom: textBottom.trim() ? textBottom : undefined,
        autoFontSize,
        fontSizeMm: autoFontSize ? undefined : clampNumber(fontSizeMm, 2, 20),
        showBorder,
        doubleBorder: showBorder ? doubleBorder : false,
      });
    } catch {
      return '';
    }
  }, [
    shape,
    widthMm,
    heightMm,
    textTop,
    textCenter,
    textBottom,
    autoFontSize,
    fontSizeMm,
    showBorder,
    doubleBorder,
  ]);

  function onExport() {
    if (!svg) return;
    downloadTextFile(`coaster-${shape}.svg`, svg, 'image/svg+xml');
  }

  function presetDiameter(value: number) {
    setWidthMm(value);
  }

  return (
    <div className="lfs-tool lfs-tool-round-coaster-generator">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Shape</div>
                <select
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={shape}
                  onChange={(e) => setShape(e.target.value as CoasterShape)}
                >
                  <option value="circle">Circle</option>
                  <option value="hexagon">Hexagon</option>
                  <option value="shield">Shield</option>
                </select>
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Diameter / Width (mm)</div>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={widthMm}
                  min={10}
                  onChange={(e) => setWidthMm(Number(e.target.value))}
                />
              </label>

              {shape === 'shield' && (
                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Height (mm)</div>
                  <input
                    type="number"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={heightMm}
                    min={10}
                    onChange={(e) => setHeightMm(Number(e.target.value))}
                  />
                </label>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => presetDiameter(80)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => presetDiameter(90)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  90mm
                </button>
                <button
                  type="button"
                  onClick={() => presetDiameter(100)}
                  className="rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  100mm
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Text top (optional)</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={textTop}
                  onChange={(e) => setTextTop(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Text center</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={textCenter}
                  onChange={(e) => setTextCenter(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Text bottom (optional)</div>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={textBottom}
                  onChange={(e) => setTextBottom(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={autoFontSize}
                    onChange={(e) => setAutoFontSize(e.target.checked)}
                  />
                  Auto font size
                </label>

                {!autoFontSize && (
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Font size (mm)</div>
                    <input
                      type="number"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                      value={fontSizeMm}
                      min={2}
                      onChange={(e) => setFontSizeMm(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={showBorder}
                    onChange={(e) => setShowBorder(e.target.checked)}
                  />
                  Border
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={doubleBorder}
                    onChange={(e) => setDoubleBorder(e.target.checked)}
                    disabled={!showBorder}
                  />
                  Double border
                </label>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={onExport}
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                >
                  Export SVG
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-2 text-xs text-slate-300">Live Preview</div>
          <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full">
            {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="text-sm text-slate-500">Preview unavailable</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
