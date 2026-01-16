'use client';

/**
 * Image Trace Panel for Round Coaster PRO
 * Upload images and trace to vector paths
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image, Loader2, Check, X, Settings2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface ImageTracePanelProps {
  onTrace: (imageDataUrl: string, options: TraceOptions) => Promise<string | null>;
  onInsert: (pathD: string) => void;
  disabled?: boolean;
}

export interface TraceOptions {
  threshold: number; // 0-255, black/white threshold
  smoothing: number; // 0-2, path smoothing
  minArea: number; // minimum area in px to include
  invert: boolean; // invert black/white
}

const DEFAULT_OPTIONS: TraceOptions = {
  threshold: 128,
  smoothing: 1,
  minArea: 10,
  invert: false,
};

export function ImageTracePanel({ onTrace, onInsert, disabled }: ImageTracePanelProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<TraceOptions>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [tracedPath, setTracedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('round_coaster.trace.error_not_image'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageDataUrl(event.target?.result as string);
      setTracedPath(null);
      setError(null);
    };
    reader.onerror = () => setError(t('round_coaster.trace.error_read_failed'));
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  }, [t]);

  const handleTrace = useCallback(async () => {
    if (!imageDataUrl || loading || disabled) return;

    setLoading(true);
    setError(null);

    try {
      const pathD = await onTrace(imageDataUrl, options);
      if (pathD) {
        setTracedPath(pathD);
      } else {
        setError(t('round_coaster.trace.error_trace_failed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('round_coaster.trace.error_trace_failed'));
    } finally {
      setLoading(false);
    }
  }, [imageDataUrl, options, loading, disabled, onTrace, t]);

  const handleInsert = useCallback(() => {
    if (tracedPath) {
      onInsert(tracedPath);
      setImageDataUrl(null);
      setTracedPath(null);
    }
  }, [tracedPath, onInsert]);

  const handleClear = useCallback(() => {
    setImageDataUrl(null);
    setTracedPath(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Image className="w-3.5 h-3.5 text-orange-400" />
          <span>{t('round_coaster.trace.title')}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className={`p-1 rounded ${showOptions ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
        >
          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Upload button */}
      {!imageDataUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-lg hover:border-slate-600 hover:bg-slate-800/50 transition-colors disabled:opacity-50"
        >
          <Upload className="w-6 h-6 text-slate-500" />
          <span className="text-xs text-slate-400">{t('round_coaster.trace.click_upload')}</span>
          <span className="text-[10px] text-slate-500">{t('round_coaster.trace.file_types')}</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Options panel */}
      {showOptions && (
        <div className="space-y-2 p-2 bg-slate-800 rounded border border-slate-700">
          <div className="text-[10px] text-slate-400 font-medium">{t('round_coaster.trace.options_title')}</div>

          <label className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{t('round_coaster.trace.threshold')}</span>
            <input
              type="range"
              min="0"
              max="255"
              value={options.threshold}
              onChange={(e) => setOptions(o => ({ ...o, threshold: parseInt(e.target.value) }))}
              className="w-20 h-1"
            />
            <span className="text-[10px] text-slate-500 w-8">{options.threshold}</span>
          </label>

          <label className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">{t('round_coaster.trace.smoothing')}</span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={options.smoothing}
              onChange={(e) => setOptions(o => ({ ...o, smoothing: parseFloat(e.target.value) }))}
              className="w-20 h-1"
            />
            <span className="text-[10px] text-slate-500 w-8">{options.smoothing}</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.invert}
              onChange={(e) => setOptions(o => ({ ...o, invert: e.target.checked }))}
              className="w-3 h-3"
            />
            <span className="text-[10px] text-slate-400">{t('round_coaster.trace.invert')}</span>
          </label>
        </div>
      )}

      {/* Image preview */}
      {imageDataUrl && (
        <div className="space-y-2">
          <div className="relative aspect-square bg-white rounded overflow-hidden border border-slate-700">
            <img
              src={imageDataUrl}
              alt={t('round_coaster.trace.title')}
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1 right-1 p-1 bg-slate-900/80 rounded hover:bg-slate-800"
            >
              <Trash2 className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {!tracedPath && (
            <button
              type="button"
              onClick={handleTrace}
              disabled={loading || disabled}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('round_coaster.trace.tracing')}
                </>
              ) : (
                <>
                  <Image className="w-3.5 h-3.5" />
                  {t('round_coaster.trace.trace_image')}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-400">
          <X className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Traced result */}
      {tracedPath && (
        <div className="space-y-2 p-2 bg-slate-800 rounded border border-slate-700">
          <div className="text-[10px] text-slate-400">{t('round_coaster.trace.traced_result')}</div>

          <div className="aspect-square bg-white rounded overflow-hidden p-2">
            <svg viewBox="-50 -50 100 100" className="w-full h-full">
              <path d={tracedPath} fill="none" stroke="#000" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInsert}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] rounded"
            >
              <Check className="w-3 h-3" />
              {t('round_coaster.ai.insert')}
            </button>
            <button
              type="button"
              onClick={handleTrace}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] rounded"
            >
              {t('round_coaster.trace.retrace')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageTracePanel;
