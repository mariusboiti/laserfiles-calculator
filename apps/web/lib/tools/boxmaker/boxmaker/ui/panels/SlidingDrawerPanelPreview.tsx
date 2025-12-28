'use client';

import { useMemo, useState } from 'react';
import type { SlidingDrawerDrawerPanels, SlidingDrawerOuterPanels, SlidingDrawerPanel2D } from '../../core/types';

export type SlidingDrawerPanelView = 'layout' | 'faces';

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

function panelWH(panel: SlidingDrawerPanel2D) {
  const b = bbox(panel.outline);
  return {
    w: b.maxX - b.minX,
    h: b.maxY - b.minY,
  };
}

export function SlidingDrawerPanelPreview({
  layoutSvg,
  panels,
  initialView = 'layout',
}: {
  layoutSvg: string;
  panels: { outer: SlidingDrawerOuterPanels; drawer: SlidingDrawerDrawerPanels };
  initialView?: SlidingDrawerPanelView;
}) {
  const [view, setView] = useState<SlidingDrawerPanelView>(initialView);
  const [zoom, setZoom] = useState(1);

  const preparedLayoutSvg = useMemo(() => prepareSvgForPreview(layoutSvg), [layoutSvg]);

  const outerRows = useMemo(() => {
    const rows: { group: string; face: string; w: number; h: number }[] = [];
    const push = (face: string, p: SlidingDrawerPanel2D | undefined) => {
      if (!p) return;
      const { w, h } = panelWH(p);
      rows.push({ group: 'Outer', face, w, h });
    };

    push('back', panels.outer.back);
    push('left', panels.outer.left);
    push('right', panels.outer.right);
    push('bottom', panels.outer.bottom);
    push('top', panels.outer.top);

    return rows;
  }, [panels]);

  const drawerRows = useMemo(() => {
    const rows: { group: string; face: string; w: number; h: number }[] = [];
    const push = (face: string, p: SlidingDrawerPanel2D | undefined) => {
      if (!p) return;
      const { w, h } = panelWH(p);
      rows.push({ group: 'Drawer', face, w, h });
    };

    push('front', panels.drawer.front);
    push('back', panels.drawer.back);
    push('left', panels.drawer.left);
    push('right', panels.drawer.right);
    push('bottom', panels.drawer.bottom);

    return rows;
  }, [panels]);

  const allRows = useMemo(() => [...outerRows, ...drawerRows], [outerRows, drawerRows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-100">Preview</div>
        {view === 'layout' ? (
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-300">Zoom</div>
            <input type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setView('layout')}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            view === 'layout'
              ? 'border-slate-600 bg-slate-900 text-slate-100'
              : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
          }`}
        >
          layout
        </button>
        <button
          type="button"
          onClick={() => setView('faces')}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            view === 'faces'
              ? 'border-slate-600 bg-slate-900 text-slate-100'
              : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
          }`}
        >
          faces
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3">
        {view === 'faces' ? (
          <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-white p-2 text-[11px] text-slate-800">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Group</th>
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Face</th>
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Width (mm)</th>
                  <th className="border-b border-slate-200 px-2 py-1 font-medium">Height (mm)</th>
                </tr>
              </thead>
              <tbody>
                {allRows.map((r) => (
                  <tr key={`${r.group}-${r.face}`} className="odd:bg-slate-50">
                    <td className="border-b border-slate-100 px-2 py-1">{r.group}</td>
                    <td className="border-b border-slate-100 px-2 py-1">{r.face}</td>
                    <td className="border-b border-slate-100 px-2 py-1 tabular-nums">{r.w.toFixed(2)}</td>
                    <td className="border-b border-slate-100 px-2 py-1 tabular-nums">{r.h.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            <div className="relative h-[520px] w-full overflow-hidden rounded border border-slate-200 bg-white">
              <div className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block" dangerouslySetInnerHTML={{ __html: preparedLayoutSvg }} />
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400">Current view: {view}</div>
    </div>
  );
}
