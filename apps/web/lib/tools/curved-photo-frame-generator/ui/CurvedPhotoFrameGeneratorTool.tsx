'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadTextFile } from '@/lib/studio/export/download';
import { downloadZip } from '@/lib/studio/export/zip';
import type { CurvedPhotoFrameInputs, CurveStrength, StandType } from '../core/types';
import { exportCurvedFrameDxf } from '../core/exportDxf';
import { generateCurvedPhotoFrameSvgs } from '../core/generateCurvedPhotoFrameSvgs';

export type CurvedPhotoFrameGeneratorToolProps = {
  onResetCallback?: (fn: () => void) => void;
  onExportCallback?: (fn: () => void) => void;
};

function clampNumber(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function presetToSize(preset: CurvedPhotoFrameInputs['photoPreset']): { w: number; h: number } {
  if (preset === 'wallet') return { w: 60, h: 90 };
  if (preset === '4x6') return { w: 102, h: 152 };
  if (preset === '5x7') return { w: 127, h: 178 };
  if (preset === 'a6') return { w: 105, h: 148 };
  return { w: 100, h: 150 };
}

function sanitizeSvgForInline(svg: string): string {
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const el = doc.querySelector('svg');
    if (!el) return svg;
    el.removeAttribute('width');
    el.removeAttribute('height');
    if (!el.getAttribute('preserveAspectRatio')) el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return new XMLSerializer().serializeToString(el);
  } catch {
    return svg;
  }
}

export function CurvedPhotoFrameGeneratorTool({
  onResetCallback,
  onExportCallback,
}: CurvedPhotoFrameGeneratorToolProps) {
  const [photoPreset, setPhotoPreset] = useState<CurvedPhotoFrameInputs['photoPreset']>('4x6');
  const [photoWidthMm, setPhotoWidthMm] = useState(102);
  const [photoHeightMm, setPhotoHeightMm] = useState(152);

  const [thicknessMm, setThicknessMm] = useState<CurvedPhotoFrameInputs['thicknessMm']>(3);
  const [kerfMm, setKerfMm] = useState(0.15);

  const [borderMm, setBorderMm] = useState(18);
  const [cornerRadiusMm, setCornerRadiusMm] = useState(10);

  const [curveStrength, setCurveStrength] = useState<CurveStrength>('medium');

  const [standType, setStandType] = useState<StandType>('slot');
  const [standWidthMm, setStandWidthMm] = useState(160);
  const [standDepthMm, setStandDepthMm] = useState(60);
  const [standSlotAngleDeg] = useState(15);

  const [addNameText, setAddNameText] = useState(false);
  const [nameText, setNameText] = useState('');
  const [nameTextSizeMm, setNameTextSizeMm] = useState(6);

  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (photoPreset === 'custom') return;
    const s = presetToSize(photoPreset);
    setPhotoWidthMm(s.w);
    setPhotoHeightMm(s.h);
  }, [photoPreset]);

  const inputs: CurvedPhotoFrameInputs = useMemo(
    () => ({
      photoPreset,
      photoWidthMm: clampNumber(photoWidthMm, 20, 600),
      photoHeightMm: clampNumber(photoHeightMm, 20, 600),
      thicknessMm,
      kerfMm: clampNumber(kerfMm, 0, 1),
      borderMm: clampNumber(borderMm, 6, 80),
      cornerRadiusMm: clampNumber(cornerRadiusMm, 0, 60),
      curveStrength,
      standType,
      standWidthMm: clampNumber(standWidthMm, 60, 600),
      standDepthMm: clampNumber(standDepthMm, 30, 250),
      standSlotAngleDeg,
      addNameText,
      nameText,
      nameTextSizeMm: clampNumber(nameTextSizeMm, 3, 20),
      photoDataUrl,
    }),
    [
      addNameText,
      borderMm,
      cornerRadiusMm,
      curveStrength,
      kerfMm,
      nameText,
      nameTextSizeMm,
      photoDataUrl,
      photoHeightMm,
      photoPreset,
      photoWidthMm,
      standDepthMm,
      standSlotAngleDeg,
      standType,
      standWidthMm,
      thicknessMm,
    ],
  );

  const result = useMemo(() => generateCurvedPhotoFrameSvgs(inputs), [inputs]);
  const previewSvg = useMemo(() => sanitizeSvgForInline(result.svgs.combined), [result.svgs.combined]);

  const reset = useCallback(() => {
    setPhotoPreset('4x6');
    setPhotoWidthMm(102);
    setPhotoHeightMm(152);
    setThicknessMm(3);
    setKerfMm(0.15);
    setBorderMm(18);
    setCornerRadiusMm(10);
    setCurveStrength('medium');
    setStandType('slot');
    setStandWidthMm(160);
    setStandDepthMm(60);
    setAddNameText(false);
    setNameText('');
    setNameTextSizeMm(6);
    setPhotoDataUrl(undefined);
  }, []);

  const exportSvgZip = useCallback(async () => {
    await downloadZip('curved-photo-frame.zip', [
      { name: 'frame-front.svg', content: result.svgs.front },
      { name: 'frame-back.svg', content: result.svgs.back },
      { name: 'stand.svg', content: result.svgs.stand },
      { name: 'layout-combined.svg', content: result.svgs.combined },
    ]);
  }, [result.svgs.back, result.svgs.combined, result.svgs.front, result.svgs.stand]);

  const exportDxf = useCallback(() => {
    const dxf = exportCurvedFrameDxf(result.svgs.combined);
    downloadTextFile('curved-photo-frame.dxf', dxf, 'application/dxf');
  }, [result.svgs.combined]);

  const exportSingleSvg = useCallback(() => {
    downloadTextFile('curved-photo-frame.svg', result.svgs.combined, 'image/svg+xml');
  }, [result.svgs.combined]);

  const exportPdf = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><title>Curved Photo Frame</title></head><body style="margin:0;padding:12px;">${result.svgs.combined}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }, [result.svgs.combined]);

  useEffect(() => {
    onResetCallback?.(reset);
  }, [onResetCallback, reset]);

  useEffect(() => {
    onExportCallback?.(exportSvgZip);
  }, [onExportCallback, exportSvgZip]);

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-sm font-medium text-slate-100">Photo</div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Upload photo (engrave preview)</div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="block w-full text-[11px] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-[11px] file:text-slate-200 hover:file:bg-slate-700"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setPhotoDataUrl(typeof reader.result === 'string' ? reader.result : undefined);
                  };
                  reader.readAsDataURL(f);
                  e.currentTarget.value = '';
                }}
              />
              <div className="text-[11px] text-slate-500">
                Embedded raster is best-effort; some laser apps ignore &lt;image&gt;.
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-sm font-medium text-slate-100">Inputs</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Photo size preset</div>
              <select
                value={photoPreset}
                onChange={(e) => setPhotoPreset(e.target.value as any)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="wallet">Wallet (60×90mm)</option>
                <option value="4x6">4×6 (102×152mm)</option>
                <option value="5x7">5×7 (127×178mm)</option>
                <option value="a6">A6 (105×148mm)</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Thickness (mm)</div>
              <select
                value={thicknessMm}
                onChange={(e) => setThicknessMm(Number(e.target.value) as any)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Photo width (mm)</div>
              <input
                type="number"
                value={photoWidthMm}
                onChange={(e) => setPhotoWidthMm(Number(e.target.value))}
                disabled={photoPreset !== 'custom'}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Photo height (mm)</div>
              <input
                type="number"
                value={photoHeightMm}
                onChange={(e) => setPhotoHeightMm(Number(e.target.value))}
                disabled={photoPreset !== 'custom'}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Border (mm)</div>
              <input
                type="number"
                value={borderMm}
                onChange={(e) => setBorderMm(Number(e.target.value))}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Corner radius (mm)</div>
              <input
                type="number"
                value={cornerRadiusMm}
                onChange={(e) => setCornerRadiusMm(Number(e.target.value))}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Kerf (mm)</div>
              <input
                type="number"
                step={0.01}
                value={kerfMm}
                onChange={(e) => setKerfMm(Number(e.target.value))}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Curve strength</div>
              <select
                value={curveStrength}
                onChange={(e) => setCurveStrength(e.target.value as CurveStrength)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="gentle">Gentle</option>
                <option value="medium">Medium</option>
                <option value="strong">Strong</option>
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Stand type</div>
              <select
                value={standType}
                onChange={(e) => setStandType(e.target.value as StandType)}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="slot">Slot stand</option>
                <option value="finger_joint">Finger-joint stand</option>
              </select>
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Stand width (mm)</div>
              <input
                type="number"
                value={standWidthMm}
                onChange={(e) => setStandWidthMm(Number(e.target.value))}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="grid gap-1">
              <div className="text-xs text-slate-300">Stand depth (mm)</div>
              <input
                type="number"
                value={standDepthMm}
                onChange={(e) => setStandDepthMm(Number(e.target.value))}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={addNameText} onChange={(e) => setAddNameText(e.target.checked)} />
              Engrave name on stand
            </label>

            {addNameText ? (
              <>
                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Name text</div>
                  <input
                    type="text"
                    value={nameText}
                    onChange={(e) => setNameText(e.target.value)}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
                <label className="grid gap-1">
                  <div className="text-xs text-slate-300">Text size (mm)</div>
                  <input
                    type="number"
                    value={nameTextSizeMm}
                    onChange={(e) => setNameTextSizeMm(Number(e.target.value))}
                    className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </label>
              </>
            ) : null}
          </div>

          {result.warnings.warnings.length > 0 ? (
            <div className="mt-3 space-y-1 text-xs text-amber-300">
              {result.warnings.warnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-sm font-medium text-slate-100">Export</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={exportSingleSvg}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
            >
              Download SVG
            </button>
            <button
              type="button"
              onClick={exportSvgZip}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
            >
              Download ZIP
            </button>
            <button
              type="button"
              onClick={exportDxf}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
            >
              Download DXF
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900"
            >
              Print / PDF
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-slate-100">Preview</div>
          <div className="text-xs text-slate-400">Combined layout (front + back + stand)</div>
        </div>
        <div className="mt-3 h-[70vh] overflow-auto rounded-lg border border-slate-800 bg-white p-2">
          <div className="w-full" dangerouslySetInnerHTML={{ __html: previewSvg }} />
        </div>
      </div>
    </div>
  );
}
