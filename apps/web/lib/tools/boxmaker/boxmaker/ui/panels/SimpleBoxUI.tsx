'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BoxSettings, GeneratedFace, ImportedItem, PathOperation } from '../../../src/lib/types';
import { applySimpleDefaults } from '../../../src/lib/defaults';
import { BoxPreview3D } from '../../../src/components/BoxPreview3D';
import { exportSingleSvg } from '../../export/exportSvgs';
import { exportSimpleBoxZip } from '../../export/exportZip';
import { DEFAULTS, SIMPLE_PRESETS } from '../../config/defaults';
import { validateSimpleBoxInputs, calculateRecommendedFingerWidth } from '../../core/validation';
import { generateSimpleBoxGeometry } from '../../core/simple/generateSimpleBox';
import { importSvgAsFace } from '../../../src/lib/svgImport';
import { mergeSvgWithOverlays, type EngraveOverlayItem } from '../../core/shared/mergeSvgWithOverlays';

function clampNumber(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
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

function faceToSvg(face: GeneratedFace): string {
  const w = Math.max(face.width, 1);
  const h = Math.max(face.height, 1);
  const ox = face.offset?.x ?? 0;
  const oy = face.offset?.y ?? 0;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`);
  parts.push(`<g transform="translate(${ox} ${oy})">`);
  for (const p of face.paths) {
    const stroke = p.op === 'cut' ? '#ff0000' : p.op === 'score' ? '#0000ff' : 'none';
    const fill = p.op === 'engrave' ? '#000000' : 'none';
    const strokeWidth = p.op === 'engrave' ? 0 : 0.2;
    parts.push(`<path d="${p.d}" stroke="${stroke}" fill="${fill}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`);
  }
  parts.push('</g>');
  parts.push('</svg>');
  return parts.join('');
}

export function SimpleBoxUI({
  boxTypeSelector,
  unitSystem,
  onResetCallback,
}: {
  boxTypeSelector?: ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}) {
  const MM_PER_INCH = 25.4;
  const unitLabel = unitSystem;
  const toUser = (mm: number) => (unitSystem === 'in' ? mm / MM_PER_INCH : mm);
  const fromUser = (val: number) => (unitSystem === 'in' ? val * MM_PER_INCH : val);

  const [widthMm, setWidthMm] = useState(DEFAULTS.simple.widthMm);
  const [depthMm, setDepthMm] = useState(DEFAULTS.simple.depthMm);
  const [heightMm, setHeightMm] = useState(DEFAULTS.simple.heightMm);
  const [thicknessMm, setThicknessMm] = useState(DEFAULTS.common.thicknessMm);
  const [kerfMm, setKerfMm] = useState(DEFAULTS.common.kerfMm);
  const [fingerWidthMm, setFingerWidthMm] = useState(DEFAULTS.simple.fingerWidthMm);
  const [hasLid, setHasLid] = useState(DEFAULTS.simple.hasLid);

  const [engraveOp, setEngraveOp] = useState<PathOperation>('engrave');
  const [engraveTarget, setEngraveTarget] = useState<string>('front');
  const [engraveItems, setEngraveItems] = useState<EngraveOverlayItem[]>([]);
  const [selectedEngraveId, setSelectedEngraveId] = useState<string | null>(null);

  const [previewMode, setPreviewMode] = useState<'2d' | 'faces' | '3d'>('2d');

  const { input, settings, faces, validation } = useMemo(() => {
    const input = {
      widthMm: clampNumber(widthMm, 10, 5000),
      depthMm: clampNumber(depthMm, 10, 5000),
      heightMm: clampNumber(heightMm, 10, 5000),
      thicknessMm: clampNumber(thicknessMm, 1, 50),
      kerfMm: clampNumber(kerfMm, 0, 1),
      fingerWidthMm: clampNumber(fingerWidthMm, 2, 200),
    };

    const validation = validateSimpleBoxInputs(input);

    const rawSettings: BoxSettings = {
      width: input.widthMm,
      depth: input.depthMm,
      height: input.heightMm,
      dimensionReference: 'inside',

      materialThickness: input.thicknessMm,
      kerf: input.kerfMm,
      applyKerfCompensation: true,

      boxType: 'finger_all_edges',

      fingerMin: input.fingerWidthMm,
      fingerMax: input.fingerWidthMm,
      autoFingerCount: true,
      manualFingerCount: null,

      lidType: hasLid ? 'flat_lid' : 'none',
      grooveDepth: input.thicknessMm,
      grooveOffset: input.thicknessMm,
      lipInset: 2,
      lipHeight: 8,

      dividersEnabled: false,
      dividerCountX: 1,
      dividerCountZ: 1,
      dividerClearance: 0.2,

      arrangeOnSheet: false,
      sheetWidth: 300,
      sheetHeight: 200,
      partSpacing: 3,
      autoRotateParts: false,
    };

    const settings = applySimpleDefaults(rawSettings, { preserveDimensionReference: true });
    const out = generateSimpleBoxGeometry(settings);

    return { input, settings, faces: out.faces, validation };
  }, [depthMm, fingerWidthMm, hasLid, heightMm, kerfMm, thicknessMm, widthMm]);

  const faceSvgs = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of faces) {
      const base = prepareSvgForPreview(faceToSvg(f));
      const items = engraveItems.filter((it) => it.id.startsWith(`${f.name}:`));
      map.set(f.name, mergeSvgWithOverlays(base, items));
    }
    return map;
  }, [engraveItems, faces]);

  const faceKeys = useMemo(() => {
    const order = ['front', 'back', 'left', 'right', 'bottom', 'top', 'lid'];
    const keys = faces.map((f) => f.name);
    const uniq = Array.from(new Set(keys));
    uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return uniq;
  }, [faces]);

  useEffect(() => {
    if (!faceKeys.length) return;
    if (faceKeys.includes(engraveTarget as any)) return;
    setEngraveTarget(faceKeys[0] as any);
  }, [engraveTarget, faceKeys]);

  const selectedEngraveItem = selectedEngraveId ? engraveItems.find((x) => x.id === selectedEngraveId) ?? null : null;

  const setSelectedEngravePlacement = (patch: Partial<EngraveOverlayItem['placement']>) => {
    if (!selectedEngraveId) return;
    setEngraveItems((prev) =>
      prev.map((it) => (it.id === selectedEngraveId ? { ...it, placement: { ...it.placement, ...patch } } : it)),
    );
  };

  const importedItems = useMemo<ImportedItem[]>(() => {
    if (!engraveItems.length) return [];

    return engraveItems.map((it) => {
      const target = String(it.id).split(':')[0];
      const targetFace = faces.find((f) => f.name === (target as any)) ?? null;

      return {
        id: it.id,
        fileName: it.fileName,
        op: it.op,
        face: it.face,
        placement: {
          faceId: targetFace?.id ?? null,
          x: it.placement.x,
          y: it.placement.y,
          rotation: it.placement.rotation,
          scale: it.placement.scale,
        },
      };
    });
  }, [engraveItems, faces]);

  const [zoom, setZoom] = useState(1);

  const recommendedFinger = useMemo(
    () => calculateRecommendedFingerWidth(input.widthMm, input.depthMm, input.heightMm),
    [input.depthMm, input.heightMm, input.widthMm]
  );

  function applyBoxPreset(presetName: string) {
    const preset = SIMPLE_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;

    setWidthMm(preset.widthMm);
    setDepthMm(preset.depthMm);
    setHeightMm(preset.heightMm);
    setThicknessMm(preset.thicknessMm);
  }

  function resetToDefaults() {
    setWidthMm(DEFAULTS.simple.widthMm);
    setDepthMm(DEFAULTS.simple.depthMm);
    setHeightMm(DEFAULTS.simple.heightMm);
    setThicknessMm(DEFAULTS.common.thicknessMm);
    setKerfMm(DEFAULTS.common.kerfMm);
    setFingerWidthMm(DEFAULTS.simple.fingerWidthMm);
    setHasLid(DEFAULTS.simple.hasLid);
  }

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback]);

  function exportAllPanels() {
    for (const k of faceKeys) {
      const svg = faceSvgs.get(k);
      if (!svg) continue;
      exportSingleSvg(`boxmaker_simple_${k}.svg`, svg);
    }
  }

  async function exportAllZip() {
    const panels = faceKeys
      .map((k) => ({ name: k, svg: faceSvgs.get(k) ?? '' }))
      .filter((p) => Boolean(p.svg));
    await exportSimpleBoxZip(panels, input.widthMm, input.depthMm, input.heightMm, input.thicknessMm, input.kerfMm);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">LaserFilesPro Box Maker</h1>
            <p className="text-[11px] text-slate-400">Simple Box (v1) · panel preview + 3D</p>
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
                  {SIMPLE_PRESETS.map((preset) => (
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
                <div className="text-sm font-medium text-slate-100">Engrave SVG</div>
                <div className="mt-3 grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/svg+xml,.svg"
                      className="block w-[220px] text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-[11px] file:text-slate-200 hover:file:bg-slate-700"
                      onChange={async (e) => {
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
                          e.currentTarget.value = '';
                          return;
                        }

                        const targetFace = faces.find((x) => x.name === (engraveTarget as any)) ?? faces[0];
                        const targetW = Math.max(targetFace?.width ?? 1, 1);
                        const targetH = Math.max(targetFace?.height ?? 1, 1);

                        const id = `${engraveTarget}:${Date.now()}-${Math.random().toString(16).slice(2)}`;
                        setEngraveItems((prev) => [
                          ...prev,
                          {
                            id,
                            fileName: f.name,
                            op: engraveOp,
                            face,
                            placement: { x: targetW / 2, y: targetH / 2, rotation: 0, scale: 1 },
                          },
                        ]);
                        setSelectedEngraveId(id);
                        e.currentTarget.value = '';
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
                        onChange={(e) => setEngraveTarget(e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                      >
                        {faceKeys.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
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
                            onChange={(e) =>
                              setSelectedEngravePlacement({ scale: Math.max(0.01, Number(e.target.value)) })
                            }
                            className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Dimensions</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Width ({unitLabel})</div>
                    <input
                      value={toUser(widthMm)}
                      onChange={(e) => setWidthMm(fromUser(Number(e.target.value)))}
                      type="number"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Depth ({unitLabel})</div>
                    <input
                      value={toUser(depthMm)}
                      onChange={(e) => setDepthMm(fromUser(Number(e.target.value)))}
                      type="number"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Height ({unitLabel})</div>
                    <input
                      value={toUser(heightMm)}
                      onChange={(e) => setHeightMm(fromUser(Number(e.target.value)))}
                      type="number"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Thickness ({unitLabel})</div>
                    <input
                      value={toUser(thicknessMm)}
                      onChange={(e) => setThicknessMm(fromUser(Number(e.target.value)))}
                      type="number"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Joints & Lid</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Finger width ({unitLabel})</div>
                    <input
                      value={toUser(fingerWidthMm)}
                      onChange={(e) => setFingerWidthMm(fromUser(Number(e.target.value)))}
                      type="number"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Kerf ({unitLabel})</div>
                    <input
                      value={toUser(kerfMm)}
                      onChange={(e) => setKerfMm(fromUser(Number(e.target.value)))}
                      type="number"
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input type="checkbox" checked={hasLid} onChange={(e) => setHasLid(e.target.checked)} />
                    Add lid
                  </label>
                </div>
              </div>

              {fingerWidthMm !== recommendedFinger && (
                <div className="rounded-lg border border-blue-800 bg-blue-950/40 p-3">
                  <div className="text-xs text-blue-200">Recommended finger width: {recommendedFinger.toFixed(1)}mm</div>
                </div>
              )}

              {validation.errors.length > 0 && (
                <div className="rounded-lg border border-rose-800 bg-rose-950/40 p-3">
                  <div className="text-sm font-medium text-rose-300">Errors</div>
                  <ul className="mt-2 space-y-1 text-xs text-rose-200">
                    {validation.errors.map((w, i) => (
                      <li key={i}>• {w}</li>
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
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:bg-slate-900"
                  >
                    Reset
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
              {previewMode === '3d' ? <div className="text-[11px] text-slate-400">Simple Box 3D preview</div> : null}
            </div>

            {previewMode === '3d' ? (
              <BoxPreview3D settings={settings} faces={faces} importedItems={importedItems} />
            ) : previewMode === 'faces' ? (
              <div className="max-h-[520px] overflow-auto rounded-md border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200">
                {!faces.length ? (
                  <p className="text-slate-500">No faces generated yet.</p>
                ) : (
                  <table className="w-full border-collapse text-[11px]">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="text-left text-slate-400">
                        <th className="border-b border-slate-800 px-2 py-1 font-medium">Face</th>
                        <th className="border-b border-slate-800 px-2 py-1 font-medium">Width (mm)</th>
                        <th className="border-b border-slate-800 px-2 py-1 font-medium">Height (mm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faces.map((face) => (
                        <tr key={face.id} className="odd:bg-slate-900/40">
                          <td className="border-b border-slate-900 px-2 py-1">{face.name}</td>
                          <td className="border-b border-slate-900 px-2 py-1 tabular-nums">{face.width.toFixed(2)}</td>
                          <td className="border-b border-slate-900 px-2 py-1 tabular-nums">{face.height.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-100">Preview</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-slate-300">Zoom</div>
                    <input type="range" min="0.5" max="2" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                  </div>
                </div>
                <div className="overflow-auto rounded-lg border border-slate-800 bg-white p-3">
                  <div className="grid gap-3 sm:grid-cols-2" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                    {faceKeys.map((k) => (
                      <div key={k} className="rounded-md border border-slate-200 bg-white p-2">
                        <div className="mb-1 text-xs font-medium text-slate-700">{k}</div>
                        <div className="relative h-56 w-full overflow-hidden rounded border border-slate-100 bg-white">
                          <div className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block" dangerouslySetInnerHTML={{ __html: faceSvgs.get(k) ?? '' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-400">Panels: {faceKeys.join(', ')}</div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
