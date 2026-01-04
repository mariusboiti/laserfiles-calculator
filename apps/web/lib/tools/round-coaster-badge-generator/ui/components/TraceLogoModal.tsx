'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { jobManager } from '../../../../jobs/jobManager';

type PotraceMode = 'CUT_SILHOUETTE' | 'ENGRAVE_LINEART';

type TracePayload = {
  dataUrl: string;
  mode: PotraceMode;
  targetWidthMm: number;
  targetHeightMm: number;
  threshold: number;
  denoise?: number;
  autoInvert?: boolean;
  invert?: boolean;
  optTolerance?: number;
};

type TraceResponse =
  | {
      ok: true;
      paths: string[];
      combinedPath: string;
      stats: {
        localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
      };
    }
  | { ok: false; error: string };

export type TraceLogoModalResult = {
  paths: string[];
  localBounds: { xMm: number; yMm: number; widthMm: number; heightMm: number };
  targetWidthMm: number;
  targetHeightMm: number;
};

export function TraceLogoModal({
  open,
  defaultTargetWidthMm,
  onClose,
  onTraceInsert,
}: {
  open: boolean;
  defaultTargetWidthMm: number;
  onClose: () => void;
  onTraceInsert: (result: TraceLogoModalResult) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState<number | null>(null);

  const [threshold, setThreshold] = useState(150);
  const [invert, setInvert] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const [targetWidthMm, setTargetWidthMm] = useState<number>(defaultTargetWidthMm);
  const [optTolerance, setOptTolerance] = useState<number>(0);

  const [isTracing, setIsTracing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<string[] | null>(null);
  const [combinedPath, setCombinedPath] = useState<string | null>(null);
  const [localBounds, setLocalBounds] = useState<{ xMm: number; yMm: number; widthMm: number; heightMm: number } | null>(null);

  const handleClose = useCallback(() => {
    jobManager.cancelJob('round-coaster-trace-logo');
    setIsTracing(false);
    onClose();
  }, [onClose]);

  const targetHeightMm = useMemo(() => {
    if (!lockAspect || !imageAspect || !Number.isFinite(targetWidthMm) || targetWidthMm <= 0) return targetWidthMm;
    return targetWidthMm / imageAspect;
  }, [lockAspect, imageAspect, targetWidthMm]);

  useEffect(() => {
    if (!open) return;
    setTargetWidthMm(defaultTargetWidthMm);
  }, [open, defaultTargetWidthMm]);

  const clearResult = useCallback(() => {
    setPaths(null);
    setCombinedPath(null);
    setLocalBounds(null);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setError(null);
    clearResult();

    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setImageDataUrl(url);

      const img = new Image();
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          setImageAspect(img.width / img.height);
        }
      };
      img.src = url;
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsDataURL(file);

    e.target.value = '';
  }, [clearResult]);

  const traceNow = useCallback(async () => {
    if (!imageDataUrl) return;

    const jobId = 'round-coaster-trace-logo';
    jobManager.cancelJob(jobId);

    setIsTracing(true);
    setError(null);

    const payload: TracePayload = {
      dataUrl: imageDataUrl,
      mode: 'CUT_SILHOUETTE',
      targetWidthMm,
      targetHeightMm,
      threshold,
      autoInvert: false,
      invert,
      optTolerance,
    };

    const res = await jobManager.runJob({
      id: jobId,
      label: 'Tracing logo',
      fn: async (signal, onProgress) => {
        onProgress({ stage: 'upload', progress: 0.1, message: 'Tracing…' });
        const r = await fetch('/api/trace/potrace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        });
        const json = (await r.json()) as TraceResponse;
        onProgress({ stage: 'finalize', progress: 1, message: 'Done' });
        return json;
      },
      timeoutMs: 60000,
    });

    setIsTracing(false);

    if (!res.ok || !res.data) {
      setError(res.error || 'Trace failed');
      clearResult();
      return;
    }

    if (!res.data.ok) {
      setError(res.data.error || 'Trace failed');
      clearResult();
      return;
    }

    setPaths(res.data.paths);
    setCombinedPath(res.data.combinedPath);
    setLocalBounds(res.data.stats.localBounds);
  }, [imageDataUrl, targetWidthMm, targetHeightMm, threshold, invert, optTolerance, clearResult]);

  useEffect(() => {
    if (!open) return;
    if (!imageDataUrl) return;

    const t = setTimeout(() => {
      void traceNow();
    }, 300);

    return () => clearTimeout(t);
  }, [open, imageDataUrl, threshold, invert, optTolerance, targetWidthMm, targetHeightMm, traceNow]);

  const handleTraceInsert = useCallback(() => {
    if (!paths || paths.length === 0 || !localBounds) return;
    onTraceInsert({
      paths,
      localBounds,
      targetWidthMm,
      targetHeightMm,
    });
  }, [paths, localBounds, targetWidthMm, targetHeightMm, onTraceInsert]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" data-tour="trace-modal">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Add Logo (Trace)</h2>
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
              >
                <Upload className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-300">Upload logo image</span>
                <span className="text-[10px] text-slate-500">PNG/JPG recommended</span>
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
                  <img src={imageDataUrl} alt="logo" className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 border border-red-900/40 bg-red-900/20 rounded p-2">{error}</div>
            )}

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Threshold: {threshold}</label>
              <input
                type="range"
                min={0}
                max={255}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
              />

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
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
              />

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
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
              />
              <div className="text-[10px] text-slate-500">Height: {Math.round(targetHeightMm)}mm</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-slate-400">Preview</div>
            <div className="aspect-square bg-white rounded border border-slate-700 overflow-hidden flex items-center justify-center">
              {combinedPath ? (
                <svg viewBox="-50 -50 100 100" className="w-full h-full">
                  <path d={combinedPath} fill="#000" stroke="none" />
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
                onClick={handleTraceInsert}
                disabled={!paths || paths.length === 0 || !localBounds || isTracing}
                className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded text-sm flex items-center justify-center gap-2"
              >
                {isTracing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Trace &amp; Insert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
