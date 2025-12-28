'use client';

import { useMemo, useState } from 'react';
import { downloadTextFile } from '@/lib/studio/export/download';
import { generateParametricBox, type ParametricBoxParams } from '../core/parametricBoxGenerator';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

type PanelKey = 'front' | 'back' | 'left' | 'right' | 'bottom' | 'lid';

export function HingedBoxTool() {
  const [widthMm, setWidthMm] = useState(120);
  const [depthMm, setDepthMm] = useState(80);
  const [heightMm, setHeightMm] = useState(50);
  const [thicknessMm, setThicknessMm] = useState(3);
  const [kerfMm, setKerfMm] = useState(0.15);

  const [hingeFingerWidthMm, setHingeFingerWidthMm] = useState(3);
  const [hingeFingerCount, setHingeFingerCount] = useState(11);
  const [hingeClearanceMm, setHingeClearanceMm] = useState(0.2);

  const [fingerWidthMm, setFingerWidthMm] = useState(15);
  const [autoFitFingers, setAutoFitFingers] = useState(true);
  
  const [slotEnabled, setSlotEnabled] = useState(true);
  const [slotDiameterMm, setSlotDiameterMm] = useState(4.5);
  const [slotOffsetFromTopMm, setSlotOffsetFromTopMm] = useState(25);

  const [panel, setPanel] = useState<PanelKey>('front');
  const [zoom, setZoom] = useState(1);

  const params: ParametricBoxParams = useMemo(() => ({
    widthMm: clampNumber(widthMm, 10, 2000),
    depthMm: clampNumber(depthMm, 10, 2000),
    heightMm: clampNumber(heightMm, 10, 2000),
    thicknessMm: clampNumber(thicknessMm, 1, 50),
    kerfMm: clampNumber(kerfMm, 0, 1),
    fingerWidthMm: clampNumber(fingerWidthMm, 2, 200),
    autoFitFingers,
    hingeFingerWidthMm: clampNumber(hingeFingerWidthMm, 2, 200),
    hingeClearanceMm: clampNumber(hingeClearanceMm, 0, 2),
    hingeFingerCount: clampNumber(hingeFingerCount, 3, 999),
    slotEnabled,
    slotDiameterMm: clampNumber(slotDiameterMm, 2, 50),
    slotOffsetFromTopMm: clampNumber(slotOffsetFromTopMm, 5, heightMm - 5),
  }), [
    widthMm,
    depthMm,
    heightMm,
    thicknessMm,
    kerfMm,
    fingerWidthMm,
    autoFitFingers,
    hingeFingerWidthMm,
    hingeClearanceMm,
    hingeFingerCount,
    slotEnabled,
    slotDiameterMm,
    slotOffsetFromTopMm,
  ]);

  const panels = useMemo(() => generateParametricBox(params), [params]);
  const previewSvg = panels[panel].svg;

  function exportPanel(key: PanelKey) {
    downloadTextFile(`hinged-box-${key}.svg`, panels[key].svg, 'image/svg+xml');
  }

  return (
    <div className="lfs-tool lfs-tool-hinged-box-creator">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Box Dimensions</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Width (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={widthMm} onChange={(e) => setWidthMm(Number(e.target.value))} />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Depth (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={depthMm} onChange={(e) => setDepthMm(Number(e.target.value))} />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Height (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={heightMm} onChange={(e) => setHeightMm(Number(e.target.value))} />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Material thickness (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" step="0.1" value={thicknessMm} onChange={(e) => setThicknessMm(Number(e.target.value))} />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Kerf (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" step="0.01" value={kerfMm} onChange={(e) => setKerfMm(Number(e.target.value))} />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Hinge (Finger Hinge)</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Finger width (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={hingeFingerWidthMm} onChange={(e) => setHingeFingerWidthMm(Number(e.target.value))} />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Finger count</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={hingeFingerCount} onChange={(e) => setHingeFingerCount(Number(e.target.value))} />
              </label>
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Hinge clearance (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" step="0.01" value={hingeClearanceMm} onChange={(e) => setHingeClearanceMm(Number(e.target.value))} />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Finger Joints</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <div className="text-xs text-slate-300">Finger width (mm)</div>
                <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={fingerWidthMm} onChange={(e) => setFingerWidthMm(Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={autoFitFingers} onChange={(e) => setAutoFitFingers(e.target.checked)} />
                Auto-fit
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-medium text-slate-100">Front Slot</div>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={slotEnabled} onChange={(e) => setSlotEnabled(e.target.checked)} />
                Enable circular slot
              </label>
              {slotEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Diameter (mm)</div>
                    <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" step="0.1" value={slotDiameterMm} onChange={(e) => setSlotDiameterMm(Number(e.target.value))} />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-xs text-slate-300">Offset from top (mm)</div>
                    <input className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" type="number" value={slotOffsetFromTopMm} onChange={(e) => setSlotOffsetFromTopMm(Number(e.target.value))} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-slate-100">Preview</div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-300">Zoom</div>
              <input type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(['front', 'back', 'left', 'right', 'bottom', 'lid'] as PanelKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPanel(k)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  panel === k ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-auto rounded-lg border border-slate-800 bg-white p-3">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportPanel(panel)}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              Export {panel}.svg
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
