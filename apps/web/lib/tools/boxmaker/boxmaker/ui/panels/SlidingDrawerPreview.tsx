'use client';

import { useMemo, useState } from 'react';
import type { SlidingDrawerSvgs } from '../../core/types';
import type { DrawerDimensions } from '../../core/sliding/drawerMath';

type PanelGroup = 'outer' | 'drawer';
type OuterPanelKey = 'back' | 'left' | 'right' | 'bottom' | 'top';
type DrawerPanelKey = 'front' | 'back' | 'left' | 'right' | 'bottom';

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

export function SlidingDrawerPreview({ svgs, dims }: { svgs: SlidingDrawerSvgs; dims: DrawerDimensions }) {
  const [panelGroup, setPanelGroup] = useState<PanelGroup>('outer');
  const [zoom, setZoom] = useState(1);

  const outerKeys: OuterPanelKey[] = ['back', 'left', 'right', 'bottom', ...(svgs.outer.top ? (['top'] as const) : [])];
  const drawerKeys: DrawerPanelKey[] = ['front', 'back', 'left', 'right', 'bottom'];

  const preparedOuterSvgs = useMemo(() => {
    const out: Record<string, string> = {};
    outerKeys.forEach((k) => {
      const svg = svgs.outer[k];
      if (!svg) return;
      out[k] = prepareSvgForPreview(svg);
    });
    return out as Record<OuterPanelKey, string>;
  }, [svgs]);

  const preparedDrawerSvgs = useMemo(() => {
    const out: Record<string, string> = {};
    drawerKeys.forEach((k) => {
      out[k] = prepareSvgForPreview(svgs.drawer[k]);
    });
    return out as Record<DrawerPanelKey, string>;
  }, [svgs]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-100">Preview</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-300">Zoom</div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPanelGroup('outer')}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            panelGroup === 'outer'
              ? 'border-slate-600 bg-slate-900 text-slate-100'
              : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
          }`}
        >
          Outer Box
        </button>
        <button
          type="button"
          onClick={() => setPanelGroup('drawer')}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            panelGroup === 'drawer'
              ? 'border-slate-600 bg-slate-900 text-slate-100'
              : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900'
          }`}
        >
          Drawer
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3">
        <div className="grid gap-3 sm:grid-cols-2" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          {panelGroup === 'outer'
            ? outerKeys.map((k) => (
                <div key={k} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="mb-1 text-xs font-medium text-slate-700">{k}</div>
                  <div className="relative h-56 w-full overflow-hidden rounded border border-slate-100 bg-white">
                    <div
                      className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                      dangerouslySetInnerHTML={{ __html: preparedOuterSvgs[k] ?? '' }}
                    />
                  </div>
                </div>
              ))
            : drawerKeys.map((k) => (
                <div key={k} className="rounded-md border border-slate-200 bg-white p-2">
                  <div className="mb-1 text-xs font-medium text-slate-700">{k}</div>
                  <div className="relative h-56 w-full overflow-hidden rounded border border-slate-100 bg-white">
                    <div
                      className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                      dangerouslySetInnerHTML={{ __html: preparedDrawerSvgs[k] }}
                    />
                  </div>
                </div>
              ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-xs font-medium text-slate-100">Dimensions</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div>
            <span className="text-slate-400">Outer:</span> {dims.outerWidth.toFixed(1)} × {dims.outerDepth.toFixed(1)} ×{' '}
            {dims.outerHeight.toFixed(1)} mm
          </div>
          <div>
            <span className="text-slate-400">Drawer:</span> {dims.drawerWidth.toFixed(1)} × {dims.drawerDepth.toFixed(1)} ×{' '}
            {dims.drawerHeight.toFixed(1)} mm
          </div>
          <div>
            <span className="text-slate-400">Opening:</span> {dims.openingWidth.toFixed(1)} × {dims.openingHeight.toFixed(1)} mm
          </div>
          <div>
            <span className="text-slate-400">Thickness:</span> {dims.thickness.toFixed(1)} mm
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-400">Current view: {panelGroup}</div>
    </div>
  );
}
