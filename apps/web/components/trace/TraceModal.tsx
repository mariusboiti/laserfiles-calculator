'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { jobManager } from '@/lib/jobs/jobManager';
import { prepareForExport } from '@/lib/export/svgSafety';
import { useT } from '@app/i18n';
import { createArtifact, addToPriceCalculator } from '@/lib/artifacts/client';
import { showArtifactSavedToast } from '@/lib/tools/export/useExportArtifact';

type TraceQualityMode = 'CUT_SILHOUETTE' | 'ENGRAVE_LINEART';

type TracePotraceRequest = {
  dataUrl: string;
  mode: TraceQualityMode;
  targetWidthMm: number;
  targetHeightMm: number;
  threshold?: number;
  denoise?: number;
  autoInvert?: boolean;
  invert?: boolean;
  optTolerance?: number;
};

type TracePotraceResponse =
  | {
      ok: true;
      paths: string[];
      combinedPath: string;
      stats: {
        width: number;
        height: number;
        pathsIn: number;
        pathsOut: number;
        commands: number;
        dLength: number;
        ms: number;
        localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
        speckleRatio: number;
      };
      debug: any;
    }
  | { ok: false; error: string; debug?: any };

export type TraceModalMode = 'silhouette' | 'outline' | 'engrave';

export type TraceModalMeta = {
  bboxMm: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  pathCount?: number;
  nodeCount?: number;
  warnings?: string[];
};

export type TraceModalResult = {
  svgString: string;
  meta: TraceModalMeta;
  // Extra fields kept for minimal diffs in existing tools
  paths: string[];
  combinedPath: string;
  localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  targetWidthMm: number;
  targetHeightMm: number;
};

export function TraceModal({
  open,
  onClose,
  defaultTargetWidthMm = 50,
  defaultMode = 'silhouette',
  onTraced,
  allowSaveToLibrary = false,
  allowAddToPriceCalculator = false,
}: {
  open: boolean;
  onClose: () => void;
  defaultTargetWidthMm?: number;
  defaultMode?: TraceModalMode;
  onTraced: (result: TraceModalResult) => void;
  allowSaveToLibrary?: boolean;
  allowAddToPriceCalculator?: boolean;
}) {
  const t = useT();

  const tr = useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    },
    [t]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  const [mode, setMode] = useState<TraceModalMode>(defaultMode);
  const [threshold, setThreshold] = useState<number>(defaultMode === 'engrave' ? 145 : 175);
  const [invert, setInvert] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const [targetWidthMm, setTargetWidthMm] = useState<number>(defaultTargetWidthMm);
  const [optTolerance, setOptTolerance] = useState<number>(0);

  const [isTracing, setIsTracing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<{ stage: string; progress: number; message?: string } | null>(null);

  const [paths, setPaths] = useState<string[] | null>(null);
  const [combinedPath, setCombinedPath] = useState<string | null>(null);
  const [localBounds, setLocalBounds] = useState<{ xMm: number; yMm: number; widthMm: number; heightMm: number } | null>(null);
  const [metaWarnings, setMetaWarnings] = useState<string[]>([]);

  const jobId = 'studio-trace-modal';

  const handleClose = useCallback(() => {
    jobManager.cancelJob(jobId);
    setIsTracing(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setTargetWidthMm(defaultTargetWidthMm);
    setThreshold(defaultMode === 'engrave' ? 145 : 175);
    setInvert(false);
    setOptTolerance(0);
    setError(null);
    setMetaWarnings([]);
    setPaths(null);
    setCombinedPath(null);
    setLocalBounds(null);
    setImageDataUrl(null);
    setImageAspect(null);
  }, [open, defaultTargetWidthMm, defaultMode]);

  const targetHeightMm = useMemo(() => {
    if (!lockAspect || !imageAspect || !Number.isFinite(targetWidthMm) || targetWidthMm <= 0) return targetWidthMm;
    return targetWidthMm / imageAspect;
  }, [lockAspect, imageAspect, targetWidthMm]);

  const clearResult = useCallback(() => {
    setPaths(null);
    setCombinedPath(null);
    setLocalBounds(null);
    setMetaWarnings([]);
    setProgress(null);
  }, []);

  const downscaleIfHuge = useCallback(async (dataUrl: string): Promise<{ dataUrl: string; warning?: string; aspect?: number }> => {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        if (!w || !h) {
          resolve({ dataUrl });
          return;
        }

        const maxDim = 2200;
        const ratio = Math.max(w, h) / maxDim;
        if (ratio <= 1) {
          resolve({ dataUrl, aspect: w / h });
          return;
        }

        const outW = Math.max(1, Math.round(w / ratio));
        const outH = Math.max(1, Math.round(h / ratio));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, aspect: w / h });
          return;
        }
        ctx.drawImage(img, 0, 0, outW, outH);

        const next = canvas.toDataURL('image/png');
        resolve({
          dataUrl: next,
          aspect: w / h,
          warning: tr('trace.warn_downscaled', 'Image was downscaled for performance.'),
        });
      };
      img.onerror = () => resolve({ dataUrl });
      img.src = dataUrl;
    });
  }, [tr]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError(tr('trace.error_not_image', 'Please select an image file'));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(tr('trace.error_too_large', 'File is too large (max 10MB).'));
        return;
      }

      setError(null);
      clearResult();

      const reader = new FileReader();
      reader.onload = async () => {
        const url = String(reader.result || '');
        const res = await downscaleIfHuge(url);
        setImageDataUrl(res.dataUrl);
        if (typeof res.aspect === 'number' && Number.isFinite(res.aspect)) {
          setImageAspect(res.aspect);
        }
        if (res.warning) {
          setMetaWarnings([res.warning]);
        }
      };
      reader.onerror = () => setError(tr('trace.error_read_failed', 'Failed to read file'));
      reader.readAsDataURL(file);
    },
    [clearResult, downscaleIfHuge, tr]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      await handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const potraceMode: TraceQualityMode = useMemo(() => {
    if (mode === 'engrave') return 'ENGRAVE_LINEART';
    return 'CUT_SILHOUETTE';
  }, [mode]);

  const traceNow = useCallback(async (): Promise<TracePotraceResponse | null> => {
    if (!imageDataUrl) return null;

    jobManager.cancelJob(jobId);
    setIsTracing(true);
    setProgress({ stage: 'start', progress: 0, message: 'Tracing…' });
    setError(null);

    const payload: TracePotraceRequest = {
      dataUrl: imageDataUrl,
      mode: potraceMode,
      targetWidthMm,
      targetHeightMm,
      threshold,
      autoInvert: false,
      invert,
      optTolerance,
    };

    const res = await jobManager.runJob({
      id: jobId,
      label: 'Tracing image',
      fn: async (signal, onProgress) => {
        onProgress({ stage: 'upload', progress: 0.1, message: 'Tracing…' });
        const r = await fetch('/api/trace/potrace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        });
        const json = (await r.json()) as TracePotraceResponse;
        onProgress({ stage: 'finalize', progress: 1, message: 'Done' });
        return json;
      },
      onProgress: (p) => setProgress(p),
      timeoutMs: 60000,
    });

    setIsTracing(false);

    if (!res.ok || !res.data) {
      setError(res.error || tr('trace.error_failed', 'Trace failed'));
      clearResult();
      return null;
    }

    if (!res.data.ok) {
      setError(res.data.error || tr('trace.error_failed', 'Trace failed'));
      clearResult();
      return res.data;
    }

    const nextWarnings: string[] = [];
    if (res.data.stats.commands > 8000) {
      nextWarnings.push(tr('trace.warn_complex', 'Logo is complex. Increase simplify for smoother cutting.'));
    }

    setMetaWarnings((prev) => [...prev, ...nextWarnings]);
    setPaths(res.data.paths);
    setCombinedPath(res.data.combinedPath);
    setLocalBounds(res.data.stats.localBounds);

    return res.data;
  }, [clearResult, imageDataUrl, invert, optTolerance, potraceMode, targetHeightMm, targetWidthMm, threshold, tr]);

  const handleTraceAndInsert = useCallback(async () => {
    const result = await traceNow();
    if (!result || !result.ok) return;

    const nextPaths = result.paths;
    const nextCombined = result.combinedPath;
    const nextBounds = result.stats.localBounds;

    if (!nextPaths || nextPaths.length === 0) return;

    const rawSvg = (() => {
      const vbX = -targetWidthMm / 2;
      const vbY = -targetHeightMm / 2;
      const vbW = targetWidthMm;
      const vbH = targetHeightMm;

      const fill = mode === 'outline' ? 'none' : '#000';
      const stroke = mode === 'outline' ? '#000' : 'none';
      const strokeWidth = 0.3;

      const inner = nextPaths
        .map((d) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`)
        .join('\n');

      return `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidthMm}mm" height="${targetHeightMm}mm" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">\n${inner}\n</svg>`;
    })();

    const prepared = prepareForExport(rawSvg, { units: 'mm' });
    if (!prepared.validation.ok) {
      setError(prepared.validation.errors[0] || tr('trace.error_svg_invalid', 'SVG validation failed'));
      return;
    }
    const outWarnings = [...metaWarnings];
    if (prepared.validation.warnings.length > 0) outWarnings.push(...prepared.validation.warnings);

    onTraced({
      svgString: prepared.svg,
      meta: {
        bboxMm: nextBounds,
        pathCount: nextPaths.length,
        nodeCount: result.stats.commands,
        warnings: outWarnings,
      },
      paths: nextPaths,
      combinedPath: nextCombined,
      localBounds: nextBounds,
      targetWidthMm,
      targetHeightMm,
    });
  }, [metaWarnings, mode, onTraced, targetHeightMm, targetWidthMm, traceNow, tr]);

  const canInsert = !!imageDataUrl && !isTracing;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-tour="trace-modal">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{tr('trace.title', 'Trace Image')}</h2>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {!imageDataUrl && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-slate-700 rounded-lg hover:border-slate-600 hover:bg-slate-800/40"
                data-tour="trace-upload"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-300">{tr('trace.upload', 'Upload image')}</span>
                <span className="text-[10px] text-slate-500">PNG/JPG recommended (max 10MB)</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {imageDataUrl && (
              <div className="space-y-2">
                <div className="relative aspect-square bg-white rounded overflow-hidden border border-slate-700">
                  <img src={imageDataUrl} alt="source" className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 border border-red-900/40 bg-red-900/20 rounded p-2">{error}</div>
            )}

            {metaWarnings.length > 0 && (
              <div className="text-[11px] text-amber-300 border border-amber-900/30 bg-amber-900/10 rounded p-2 space-y-1">
                {metaWarnings.map((w, idx) => (
                  <div key={idx}>{w}</div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Mode</label>
              <select
                value={mode}
                onChange={(e) => {
                  const next = e.target.value as TraceModalMode;
                  setMode(next);
                  if (next === 'engrave') setThreshold(145);
                  else setThreshold(175);
                }}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                disabled={isTracing}
              >
                <option value="silhouette">Silhouette</option>
                <option value="outline">Outline</option>
                <option value="engrave">Engrave</option>
              </select>

              <label className="block text-xs text-slate-400" data-tour="trace-threshold">Threshold: {threshold}</label>
              <input
                type="range"
                min={0}
                max={255}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
                disabled={isTracing}
              />

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} disabled={isTracing} />
                Invert
              </label>

              <label className="block text-xs text-slate-400">Simplify tolerance: {optTolerance.toFixed(2)}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={optTolerance}
                onChange={(e) => setOptTolerance(Number(e.target.value))}
                className="w-full"
                disabled={isTracing}
              />

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} disabled={isTracing} />
                Lock aspect
              </label>

              <label className="block text-xs text-slate-400">Target width (mm)</label>
              <input
                type="number"
                value={targetWidthMm}
                min={5}
                max={500}
                step={1}
                onChange={(e) => setTargetWidthMm(Number(e.target.value) || 0)}
                className="w-28 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                disabled={isTracing}
              />
              <div className="text-[10px] text-slate-500">Height: {Math.round(targetHeightMm)}mm</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-slate-400">Preview</div>
            <div className="aspect-square bg-white rounded border border-slate-700 overflow-hidden flex items-center justify-center">
              {combinedPath ? (
                <svg viewBox={`${-targetWidthMm / 2} ${-targetHeightMm / 2} ${targetWidthMm} ${targetHeightMm}`} className="w-full h-full">
                  <path
                    d={combinedPath}
                    fill={mode === 'outline' ? 'none' : '#000'}
                    stroke={mode === 'outline' ? '#000' : 'none'}
                    strokeWidth={0.3}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              ) : (
                <div className="text-xs text-slate-500">{isTracing ? 'Tracing…' : 'No preview yet'}</div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTraceAndInsert}
                disabled={!canInsert}
                data-tour="trace-run"
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-sm flex items-center justify-center gap-2"
              >
                {isTracing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Trace &amp; Insert
              </button>
            </div>

            {progress && isTracing && (
              <div className="text-[11px] text-slate-400">
                {progress.message || progress.stage} ({Math.round(progress.progress * 100)}%)
              </div>
            )}

            {(allowSaveToLibrary || allowAddToPriceCalculator) && (
              <div className="flex gap-2">
                {allowSaveToLibrary && (
                  <button
                    type="button"
                    disabled={!paths || !localBounds || isTracing}
                    onClick={async () => {
                      if (!paths || !localBounds) return;
                      const name = window.prompt('Save name', 'Traced design');
                      if (!name) return;

                      const vbX = -targetWidthMm / 2;
                      const vbY = -targetHeightMm / 2;
                      const vbW = targetWidthMm;
                      const vbH = targetHeightMm;
                      const fill = mode === 'outline' ? 'none' : '#000';
                      const stroke = mode === 'outline' ? '#000' : 'none';
                      const strokeWidth = 0.3;
                      const inner = paths
                        .map((d) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`)
                        .join('\n');
                      const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidthMm}mm" height="${targetHeightMm}mm" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">\n${inner}\n</svg>`;
                      const prepared = prepareForExport(rawSvg, { units: 'mm' });
                      if (!prepared.validation.ok) {
                        setError(prepared.validation.errors[0] || tr('trace.error_svg_invalid', 'SVG validation failed'));
                        return;
                      }

                      await createArtifact({
                        toolSlug: 'trace',
                        name,
                        svg: prepared.svg,
                        meta: {
                          bboxMm: { width: localBounds.widthMm, height: localBounds.heightMm },
                          boundsMm: localBounds,
                          pathCount: paths.length,
                        },
                      });
                      showArtifactSavedToast(name);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs"
                  >
                    Save to Library
                  </button>
                )}

                {allowAddToPriceCalculator && (
                  <button
                    type="button"
                    disabled={!paths || !localBounds || isTracing}
                    onClick={async () => {
                      if (!paths || !localBounds) return;
                      const name = window.prompt('Name', 'Traced design');
                      if (!name) return;

                      const vbX = -targetWidthMm / 2;
                      const vbY = -targetHeightMm / 2;
                      const vbW = targetWidthMm;
                      const vbH = targetHeightMm;
                      const fill = mode === 'outline' ? 'none' : '#000';
                      const stroke = mode === 'outline' ? '#000' : 'none';
                      const strokeWidth = 0.3;
                      const inner = paths
                        .map((d) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" />`)
                        .join('\n');
                      const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidthMm}mm" height="${targetHeightMm}mm" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">\n${inner}\n</svg>`;
                      const prepared = prepareForExport(rawSvg, { units: 'mm' });
                      if (!prepared.validation.ok) {
                        setError(prepared.validation.errors[0] || tr('trace.error_svg_invalid', 'SVG validation failed'));
                        return;
                      }

                      const artifact = await createArtifact({
                        toolSlug: 'trace',
                        name,
                        svg: prepared.svg,
                        meta: {
                          bboxMm: { width: localBounds.widthMm, height: localBounds.heightMm },
                          boundsMm: localBounds,
                          pathCount: paths.length,
                        },
                      });
                      addToPriceCalculator(artifact);
                      showArtifactSavedToast(name);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs"
                  >
                    Add to Price Calculator
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
