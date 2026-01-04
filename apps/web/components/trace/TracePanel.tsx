'use client';

/**
 * TracePanel Component
 * UI for bitmap-to-SVG tracing with options and preview
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Wand2, X, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { useTrace } from '@/lib/trace/useTrace';
import { DEFAULT_TRACE_OPTIONS, TRACE_MODE_LABELS, type TraceMode, type TraceOptions } from '@/lib/trace/types';

interface TracePanelProps {
  onTraceComplete?: (svg: string, widthMm?: number, heightMm?: number) => void;
  onCancel?: () => void;
  defaultTargetWidthMm?: number;
  defaultTargetHeightMm?: number;
  showInsertButton?: boolean;
  className?: string;
}

const STAGE_LABELS: Record<string, string> = {
  decode: 'Loading image',
  preprocess: 'Preprocessing',
  trace: 'Tracing paths',
  simplify: 'Simplifying',
  finalize: 'Finalizing',
};

export function TracePanel({
  onTraceComplete,
  onCancel,
  defaultTargetWidthMm = 100,
  defaultTargetHeightMm = 100,
  showInsertButton = true,
  className = '',
}: TracePanelProps) {
  const { state, progress, result, error, isTracing, trace, cancel, reset } = useTrace();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [options, setOptions] = useState<TraceOptions>({
    ...DEFAULT_TRACE_OPTIONS,
    targetWidthMm: defaultTargetWidthMm,
    targetHeightMm: defaultTargetHeightMm,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      reset();
    };
    reader.readAsDataURL(file);
  }, [reset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleTrace = useCallback(async () => {
    if (!imagePreview) return;
    
    try {
      await trace(imagePreview, options);
    } catch (err) {
      console.error('Trace error:', err);
    }
  }, [imagePreview, options, trace]);

  const handleInsert = useCallback(() => {
    if (result?.svg) {
      onTraceComplete?.(result.svg, options.targetWidthMm, options.targetHeightMm);
    }
  }, [result, options, onTraceComplete]);

  const handleDownload = useCallback(() => {
    if (!result?.svg) return;
    
    const blob = new Blob([result.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traced_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const updateOption = <K extends keyof TraceOptions>(key: K, value: TraceOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Upload Area */}
      {!imagePreview && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50 transition-colors hover:border-sky-500/50 hover:bg-slate-900"
        >
          <Upload className="mb-2 h-8 w-8 text-slate-500" />
          <p className="text-sm text-slate-400">Drop image here or click to upload</p>
          <p className="mt-1 text-xs text-slate-500">PNG, JPG, WebP supported</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Source"
            className="h-48 w-full rounded-lg border border-slate-700 object-contain bg-slate-900"
          />
          <button
            onClick={() => {
              setImagePreview(null);
              reset();
            }}
            className="absolute right-2 top-2 rounded-full bg-slate-800/80 p-1 hover:bg-slate-700"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      )}

      {/* Options */}
      {imagePreview && (
        <div className="space-y-3">
          {/* Mode */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Trace Mode</label>
            <select
              value={options.mode}
              onChange={(e) => updateOption('mode', e.target.value as TraceMode)}
              disabled={isTracing}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
            >
              {Object.entries(TRACE_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-slate-400">
              <span>Threshold</span>
              <span className="text-slate-500">{options.threshold}</span>
            </label>
            <input
              type="range"
              min="0"
              max="255"
              value={options.threshold}
              onChange={(e) => updateOption('threshold', parseInt(e.target.value))}
              disabled={isTracing}
              className="w-full"
            />
          </div>

          {/* Simplify */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-slate-400">
              <span>Simplify</span>
              <span className="text-slate-500">{options.simplify}</span>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={options.simplify}
              onChange={(e) => updateOption('simplify', parseInt(e.target.value))}
              disabled={isTracing}
              className="w-full"
            />
          </div>

          {/* Invert */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.invert}
              onChange={(e) => updateOption('invert', e.target.checked)}
              disabled={isTracing}
              className="rounded border-slate-700 bg-slate-900"
            />
            <span className="text-sm text-slate-300">Invert colors</span>
          </label>

          {/* Advanced Options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              {/* Smoothing */}
              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>Smoothing</span>
                  <span className="text-slate-500">{options.smoothing}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={options.smoothing}
                  onChange={(e) => updateOption('smoothing', parseInt(e.target.value))}
                  disabled={isTracing}
                  className="w-full"
                />
              </div>

              {/* Target Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Width (mm)</label>
                  <input
                    type="number"
                    value={options.targetWidthMm || ''}
                    onChange={(e) => updateOption('targetWidthMm', parseFloat(e.target.value) || undefined)}
                    disabled={isTracing}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Height (mm)</label>
                  <input
                    type="number"
                    value={options.targetHeightMm || ''}
                    onChange={(e) => updateOption('targetHeightMm', parseFloat(e.target.value) || undefined)}
                    disabled={isTracing}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
                  />
                </div>
              </div>

              {/* Multi-band thresholds */}
              {options.mode === 'multiband' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Thresholds (comma separated)
                  </label>
                  <input
                    type="text"
                    value={(options.thresholds || [64, 128, 192]).join(', ')}
                    onChange={(e) => {
                      const vals = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                      updateOption('thresholds', vals.length > 0 ? vals : [128]);
                    }}
                    disabled={isTracing}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
                    placeholder="64, 128, 192"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {isTracing && progress && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {STAGE_LABELS[progress.stage] || progress.stage}
            </span>
            <span className="text-slate-500">{Math.round(progress.progress * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${progress.progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result Preview */}
      {result && (
        <div className="space-y-2">
          <div
            className="h-48 w-full rounded-lg border border-slate-700 bg-white p-2"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{result.pathCount} paths, {result.nodeCount} nodes</span>
            <span>{result.widthPx} × {result.heightPx} px</span>
          </div>
          {result.warnings?.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {imagePreview && !result && (
          <button
            onClick={handleTrace}
            disabled={isTracing}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {isTracing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Tracing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Trace
              </>
            )}
          </button>
        )}

        {isTracing && (
          <button
            onClick={cancel}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        )}

        {result && (
          <>
            {showInsertButton && (
              <button
                onClick={handleInsert}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Wand2 className="h-4 w-4" />
                Insert
              </button>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Reset
            </button>
          </>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
