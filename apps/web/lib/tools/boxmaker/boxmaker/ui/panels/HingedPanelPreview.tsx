'use client';

import { useMemo, useState } from 'react';
import type { HingedBoxPanels, HingedBoxSvgs } from '../../core/types';

export type HingedPanelKey = keyof HingedBoxSvgs;
export type HingedPanelView = HingedPanelKey | 'all' | 'faces';

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

function parseLengthNum(value: string | null): number | null {
  if (!value) return null;
  const m = String(value).trim().match(/^([+-]?[0-9]*\.?[0-9]+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function prepareSvgForPreview(svg: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svg;

    if (!svgEl.getAttribute('preserveAspectRatio')) {
      svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    const viewBox = svgEl.getAttribute('viewBox');
    if (!viewBox) {
      const w = parseLengthNum(svgEl.getAttribute('width'));
      const h = parseLengthNum(svgEl.getAttribute('height'));
      if (Number.isFinite(w) && Number.isFinite(h) && w && h) {
        svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    const nextViewBox = svgEl.getAttribute('viewBox');
    if (nextViewBox) {
      const parts = nextViewBox
        .trim()
        .split(/[\s,]+/)
        .map((n) => Number(n));
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const [x, y, w, h] = parts;
        const pad = Math.max(1, Math.min(w, h) * 0.01);
        svgEl.setAttribute('viewBox', `${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`);
      }
    }

    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');

    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return svg;
  }
}

export function HingedPanelPreview({
  svgs,
  panels,
  initialView = 'all',
}: {
  svgs: HingedBoxSvgs;
  panels: HingedBoxPanels;
  initialView?: HingedPanelView;
}) {
  const [panel, setPanel] = useState<HingedPanelView>(initialView);
  const [zoom, setZoom] = useState(1);

  const panelKeys = ['front', 'back', 'left', 'right', 'bottom', 'lid'] as HingedPanelKey[];
  const preparedSvgs = useMemo(() => {
    const out: Record<string, string> = {};
    panelKeys.forEach((k) => {
      out[k] = prepareSvgForPreview(svgs[k]);
    });
    return out as Record<HingedPanelKey, string>;
  }, [svgs]);

  const previewSvg = panel === 'all' || panel === 'faces' ? '' : preparedSvgs[panel];
  const viewButtons: HingedPanelView[] = panel === 'faces' ? ['faces'] : (['all', ...panelKeys] as HingedPanelView[]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-100">Preview</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-300">Zoom</div>
          <input type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {viewButtons.map((k) => (
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

      <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3">
        {panel === 'faces' ? (
          <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-800">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Face</th>
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Width (mm)</th>
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Height (mm)</th>
                </tr>
              </thead>
              <tbody>
                {panelKeys.map((k) => {
                  const b = bbox(panels[k].outline);
                  const w = b.maxX - b.minX;
                  const h = b.maxY - b.minY;
                  return (
                    <tr key={k} className="odd:bg-slate-50">
                      <td className="border-b border-slate-100 px-2 py-1">{k}</td>
                      <td className="border-b border-slate-100 px-2 py-1 tabular-nums">{w.toFixed(2)}</td>
                      <td className="border-b border-slate-100 px-2 py-1 tabular-nums">{h.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : panel === 'all' ? (
          <div
            className="grid gap-3 sm:grid-cols-2"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {panelKeys.map((k) => (
              <div key={k} className="rounded-md border border-slate-200 bg-white p-2">
                <div className="mb-1 text-xs font-medium text-slate-700">{k}</div>
                <div className="relative h-56 w-full overflow-hidden rounded border border-slate-100 bg-white">
                  <div
                    className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                    dangerouslySetInnerHTML={{ __html: preparedSvgs[k] }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <div className="relative h-[520px] w-full overflow-hidden rounded border border-slate-200 bg-white">
              <div className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block" dangerouslySetInnerHTML={{ __html: previewSvg }} />
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400">Current panel: {panel}</div>
    </div>
  );
}
