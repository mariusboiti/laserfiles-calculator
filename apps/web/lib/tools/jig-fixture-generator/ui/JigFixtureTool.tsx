'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import { downloadTextFile } from '@/lib/studio/export/download';
import { generateJigSvg } from '../core/generateJigSvg';
import type { ObjectShape, CustomShapeData } from '../types/jig';
import { DEFAULTS, JIG_PRESETS } from '../config/defaults';

// Templates from bulk-name-tags
const SHAPE_TEMPLATES = [
  { id: 'rect', name: 'Rectangle', svg: null },
  { id: 'circle', name: 'Circle', svg: null },
  { id: 'rounded-rect', name: 'Rounded Rectangle', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 30"><rect x="1" y="1" width="78" height="28" rx="4" ry="4" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 80, h: 30 },
  { id: 'hexagon', name: 'Hexagon', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 52"><path d="M15 1 L45 1 L59 26 L45 51 L15 51 L1 26 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 60, h: 52 },
  { id: 'pill', name: 'Pill / Capsule', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 25"><rect x="1" y="1" width="78" height="23" rx="11.5" ry="11.5" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 80, h: 25 },
  { id: 'ticket', name: 'Ticket', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 85 30"><path d="M4 1 H81 Q84 1 84 4 V10 Q80 10 80 15 Q80 20 84 20 V26 Q84 29 81 29 H4 Q1 29 1 26 V20 Q5 20 5 15 Q5 10 1 10 V4 Q1 1 4 1 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 85, h: 30 },
  { id: 'shield', name: 'Shield', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 60"><path d="M5 2 H45 Q48 2 48 5 V24 C48 42 37 54 25 58 C13 54 2 42 2 24 V5 Q2 2 5 2 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 50, h: 60 },
  { id: 'diamond', name: 'Diamond', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 55"><path d="M27.5 1 L54 27.5 L27.5 54 L1 27.5 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 55, h: 55 },
  { id: 'arch-top', name: 'Arch Top', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40"><path d="M8 39 H52 V20 C52 10 44 2 30 2 C16 2 8 10 8 20 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 60, h: 40 },
  { id: 'oval', name: 'Oval', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 35"><ellipse cx="40" cy="17.5" rx="38" ry="15.5" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 80, h: 35 },
  { id: 'label-angle', name: 'Angled Label', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 30"><path d="M1 5 Q1 1 5 1 H70 L89 15 L70 29 H5 Q1 29 1 25 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 90, h: 30 },
  { id: 'scalloped-circle', name: 'Scalloped Circle', svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 2.5 C24.5 2.5 26 4.2 27.9 4.7 C29.8 5.2 31.9 4.5 33.5 5.7 C35.1 6.9 35 9.1 36.2 10.7 C37.4 12.3 39.5 13 40 14.9 C40.5 16.8 38.8 18.3 38.8 20.3 C38.8 22.3 40.5 23.8 40 25.7 C39.5 27.6 37.4 28.3 36.2 29.9 C35 31.5 35.1 33.7 33.5 34.9 C31.9 36.1 29.8 35.4 27.9 35.9 C26 36.4 24.5 38.1 22.5 38.1 C20.5 38.1 19 36.4 17.1 35.9 C15.2 35.4 13.1 36.1 11.5 34.9 C9.9 33.7 10 31.5 8.8 29.9 C7.6 28.3 5.5 27.6 5 25.7 C4.5 23.8 6.2 22.3 6.2 20.3 C6.2 18.3 4.5 16.8 5 14.9 C5.5 13 7.6 12.3 8.8 10.7 C10 9.1 9.9 6.9 11.5 5.7 C13.1 4.5 15.2 5.2 17.1 4.7 C19 4.2 20.5 2.5 22.5 2.5 Z" fill="none" stroke="black" stroke-width="0.2" /></svg>`, w: 45, h: 45 },
];
import { calculateLayout, generateLayoutSummary } from '../core/layoutCalculation';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface JigFixtureToolProps {
  onResetCallback?: (callback: () => void) => void;
  onGetExportPayload?: (getExportPayload: () => Promise<{ svg: string; name?: string; meta?: any }> | { svg: string; name?: string; meta?: any }) => void;
}

// Extract first subpath from a path d attribute (M...Z or M...z)
function extractFirstSubpath(d: string): string | null {
  // Split path into subpaths by finding M commands
  // A subpath starts with M/m and ends with Z/z or before next M/m
  const trimmed = d.trim();
  if (!trimmed) return null;
  
  // Find first M command
  const firstM = trimmed.search(/[Mm]/);
  if (firstM === -1) return null;
  
  // Find the end of first subpath (Z/z or next M)
  let endIndex = trimmed.length;
  
  // Look for Z/z first
  const zMatch = trimmed.slice(firstM).search(/[Zz]/);
  if (zMatch !== -1) {
    endIndex = firstM + zMatch + 1; // Include the Z
  } else {
    // No Z, look for next M
    const nextM = trimmed.slice(firstM + 1).search(/[Mm]/);
    if (nextM !== -1) {
      endIndex = firstM + 1 + nextM;
    }
  }
  
  const firstSubpath = trimmed.slice(firstM, endIndex).trim();
  return firstSubpath || null;
}

// Extract ONLY the outer contour from SVG - takes first subpath only
function extractOuterContour(svgText: string): CustomShapeData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return null;

    // Get viewBox or dimensions
    let vb = svg.getAttribute('viewBox');
    let w = 100, h = 100;
    
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length >= 4) {
        w = parts[2];
        h = parts[3];
      }
    } else {
      const widthAttr = svg.getAttribute('width');
      const heightAttr = svg.getAttribute('height');
      if (widthAttr) w = parseFloat(widthAttr) || 100;
      if (heightAttr) h = parseFloat(heightAttr) || 100;
      vb = `0 0 ${w} ${h}`;
    }

    let pathD: string | null = null;

    // Try to get FIRST subpath from first path element
    const firstPath = svg.querySelector('path');
    if (firstPath) {
      const fullD = firstPath.getAttribute('d');
      if (fullD) {
        pathD = extractFirstSubpath(fullD);
      }
    }

    // If no path, try first rect
    if (!pathD) {
      const firstRect = svg.querySelector('rect');
      if (firstRect) {
        const x = parseFloat(firstRect.getAttribute('x') || '0');
        const y = parseFloat(firstRect.getAttribute('y') || '0');
        const rw = parseFloat(firstRect.getAttribute('width') || '0');
        const rh = parseFloat(firstRect.getAttribute('height') || '0');
        const rx = parseFloat(firstRect.getAttribute('rx') || '0');
        const ry = parseFloat(firstRect.getAttribute('ry') || rx.toString());
        if (rw && rh) {
          if (rx > 0 || ry > 0) {
            const r = Math.min(rx, ry, rw / 2, rh / 2);
            pathD = `M${x + r},${y} h${rw - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${rh - 2 * r} a${r},${r} 0 0 1 ${-r},${r} h${-(rw - 2 * r)} a${r},${r} 0 0 1 ${-r},${-r} v${-(rh - 2 * r)} a${r},${r} 0 0 1 ${r},${-r} Z`;
          } else {
            pathD = `M${x},${y} h${rw} v${rh} h${-rw} Z`;
          }
        }
      }
    }

    // If no path/rect, try first circle
    if (!pathD) {
      const firstCircle = svg.querySelector('circle');
      if (firstCircle) {
        const cx = parseFloat(firstCircle.getAttribute('cx') || '0');
        const cy = parseFloat(firstCircle.getAttribute('cy') || '0');
        const r = parseFloat(firstCircle.getAttribute('r') || '0');
        if (r) {
          pathD = `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy}`;
        }
      }
    }

    // If no circle, try first ellipse
    if (!pathD) {
      const firstEllipse = svg.querySelector('ellipse');
      if (firstEllipse) {
        const cx = parseFloat(firstEllipse.getAttribute('cx') || '0');
        const cy = parseFloat(firstEllipse.getAttribute('cy') || '0');
        const rx = parseFloat(firstEllipse.getAttribute('rx') || '0');
        const ry = parseFloat(firstEllipse.getAttribute('ry') || '0');
        if (rx && ry) {
          pathD = `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy}`;
        }
      }
    }

    // If no ellipse, try first polygon
    if (!pathD) {
      const firstPoly = svg.querySelector('polygon');
      if (firstPoly) {
        const points = firstPoly.getAttribute('points');
        if (points) {
          const pts = points.trim().split(/[\s,]+/);
          if (pts.length >= 4) {
            let d = `M${pts[0]},${pts[1]}`;
            for (let i = 2; i < pts.length; i += 2) {
              d += ` L${pts[i]},${pts[i + 1]}`;
            }
            d += ' Z';
            pathD = d;
          }
        }
      }
    }

    if (!pathD) return null;

    return {
      pathD,
      viewBox: vb,
      originalW: w,
      originalH: h,
    };
  } catch {
    return null;
  }
}

export function JigFixtureTool({ onResetCallback, onGetExportPayload }: JigFixtureToolProps) {
  const { api } = useToolUx();

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  const [bedWidthMm, setBedWidthMm] = useState<number>(DEFAULTS.bedW);
  const [bedHeightMm, setBedHeightMm] = useState<number>(DEFAULTS.bedH);

  const [objectWidthMm, setObjectWidthMm] = useState<number>(DEFAULTS.objectW);
  const [objectHeightMm, setObjectHeightMm] = useState<number>(DEFAULTS.objectH);
  const [objectShape, setObjectShape] = useState<ObjectShape>(DEFAULTS.objectShape);
  const [customShape, setCustomShape] = useState<CustomShapeData | null>(null);
  const [customShapeName, setCustomShapeName] = useState<string>('');
  const [previewZoom, setPreviewZoom] = useState<number>(100);

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
    setCustomShape(null);
    setCustomShapeName('');
    setPreviewZoom(100);
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
      customShape: customShape || undefined,
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
    customShape,
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

  const getExportPayload = useCallback(() => {
    return {
      svg,
      name: 'jig-fixture',
      meta: {
        bboxMm: { width: bedWidthMm, height: bedHeightMm },
        ...(meta || {}),
      },
    };
  }, [bedHeightMm, bedWidthMm, meta, svg]);

  useEffect(() => {
    onGetExportPayload?.(getExportPayload);
  }, [getExportPayload, onGetExportPayload]);

  function exportSvg() {
    downloadTextFile('jig-fixture.svg', svg, 'image/svg+xml');
  }

  function setPresetBed(w: number, h: number) {
    setBedWidthMm(w);
    setBedHeightMm(h);
  }

  return (
    <div className="lfs-tool lfs-tool-jig-fixture-generator">
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[320px,1fr]">
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

              <label className="grid gap-1 col-span-2">
                <div className="text-xs text-slate-300">Object shape</div>
                <select
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={objectShape === 'custom' ? 'custom' : objectShape}
                  onChange={(e) => {
                    const val = e.target.value;
                    const tpl = SHAPE_TEMPLATES.find((t) => t.id === val);
                    if (tpl && tpl.svg) {
                      // Template with SVG
                      const extracted = extractOuterContour(tpl.svg);
                      if (extracted) {
                        setObjectShape('custom');
                        setCustomShape(extracted);
                        setCustomShapeName(tpl.name);
                        if (tpl.w && tpl.h) {
                          setObjectWidthMm(tpl.w);
                          setObjectHeightMm(tpl.h);
                        }
                      }
                    } else if (val === 'rect' || val === 'circle') {
                      setObjectShape(val as ObjectShape);
                      setCustomShape(null);
                      setCustomShapeName('');
                    }
                  }}
                >
                  {SHAPE_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Custom SVG Upload - separate section */}
            <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/50 p-3">
              <div className="text-xs text-slate-300 mb-2">Or upload custom SVG (extracts outer contour only)</div>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      const extracted = extractOuterContour(text);
                      if (extracted) {
                        setObjectShape('custom');
                        setCustomShape(extracted);
                        setCustomShapeName(file.name);
                        const aspectRatio = extracted.originalW / extracted.originalH;
                        if (aspectRatio > 1) {
                          setObjectHeightMm(objectWidthMm / aspectRatio);
                        } else {
                          setObjectWidthMm(objectHeightMm * aspectRatio);
                        }
                      } else {
                        alert('Could not extract contour from SVG.');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                  className="flex-1 text-xs text-slate-200 file:mr-2 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:text-slate-200 hover:file:bg-slate-700"
                />
                {customShape && (
                  <button
                    type="button"
                    onClick={() => {
                      setObjectShape('rect');
                      setCustomShape(null);
                      setCustomShapeName('');
                    }}
                    className="rounded-md border border-red-800 bg-red-950/50 px-2 py-1 text-xs text-red-300 hover:bg-red-900/50"
                  >
                    Clear
                  </button>
                )}
              </div>
              {customShapeName && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Using: {customShapeName}
                </div>
              )}
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

        <div className="min-w-0 overflow-hidden">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="text-sm font-medium text-slate-100">Preview</div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(25, z - 25))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  −
                </button>
                <span className="text-xs text-slate-400 min-w-[2.5rem] text-center">{previewZoom}%</span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(400, z + 25))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(100)}
                  className="rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  ↺
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <div 
                style={{ 
                  transform: `scale(${previewZoom / 100})`, 
                  transformOrigin: 'top left',
                  display: 'inline-block'
                }}
                dangerouslySetInnerHTML={{ __html: svg }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
