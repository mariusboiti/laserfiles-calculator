'use client';
/**
 * ImageTracePanel - Upload raster image and trace to SVG paths
 * Uses in-browser image tracing for converting bitmaps to vector paths
 */

import React, { useState, useCallback, useRef } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import {
  Image as ImageIcon,
  Upload,
  Wand2,
  AlertCircle,
  RotateCcw,
  Scissors,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { EngraveImageElement, Element, TracedPathGroupElement } from '../../types/signPro';
import { generateId } from '../../types/signPro';

const TRACE_DEBUG = process.env.NEXT_PUBLIC_TRACE_DEBUG === '1';

export type TraceMode = 'silhouette' | 'sketch';

interface ImageTracePanelProps {
  targetWidthMm: number;
  targetHeightMm: number;
  onTraceResult: (element: Element, targetLayer: 'CUT' | 'ENGRAVE') => void;
  onInsertImage?: (element: EngraveImageElement) => void;
  disabled?: boolean;
}

interface TraceOptions {
  mode: 'CUT_SILHOUETTE' | 'ENGRAVE_LINEART';
  threshold: number;
  denoise: number;
  autoInvert: boolean;
}

const DEFAULT_OPTIONS: TraceOptions = {
  mode: 'CUT_SILHOUETTE',
  threshold: 175,
  denoise: 0,
  autoInvert: true,
};

// Max data URL size before rejecting (1MB)
const MAX_IMAGE_SIZE = 1 * 1024 * 1024;

export function ImageTracePanel({
  targetWidthMm,
  targetHeightMm,
  onTraceResult,
  onInsertImage,
  disabled = false,
}: ImageTracePanelProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [options, setOptions] = useState<TraceOptions>(DEFAULT_OPTIONS);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewPathDs, setPreviewPathDs] = useState<string[] | null>(null);
  const [previewLocalBounds, setPreviewLocalBounds] = useState<{ xMm: number; yMm: number; widthMm: number; heightMm: number } | null>(null);
  const [previewTraceStats, setPreviewTraceStats] = useState<{ pathsIn: number; pathsOut: number; commands: number; dLength: number; ms: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(t('personalised_sign.pro.image_trace.error_invalid_file_type'));
      return;
    }

    setError(null);
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // Reject very large images early
      if (dataUrl.length > MAX_IMAGE_SIZE) {
        setError(t('personalised_sign.pro.image_trace.error_image_too_large'));
        return;
      }
      setImageData(dataUrl);
      setPreviewPath(null);
    };
    reader.onerror = () => {
      setError(t('personalised_sign.pro.image_trace.error_failed_to_read'));
    };
    reader.readAsDataURL(file);
  }, [t]);


  const traceImage = useCallback(async () => {
    if (!imageData) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/trace/potrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: imageData,
          mode: options.mode,
          targetWidthMm,
          targetHeightMm,
          threshold: options.threshold,
          denoise: options.denoise,
          autoInvert: options.autoInvert,
        }),
      });

      const json: any = await res.json();
      if (!json?.ok) {
        throw new Error(json?.error || t('personalised_sign.ai.error_trace_failed'));
      }

      const paths: string[] = Array.isArray(json.paths) ? json.paths : [];
      if (paths.length === 0) {
        throw new Error(t('personalised_sign.ai.error_no_vector'));
      }

      if (TRACE_DEBUG) {
        console.debug('[ImageTrace] potrace paths:', paths.length);
        console.debug('[ImageTrace] first path d:', (paths[0] || '').slice(0, 120));
        console.debug('[ImageTrace] stats:', json.stats);
        console.debug('[ImageTrace] debug:', json.debug);
      }

      setPreviewPathDs(paths);
      setPreviewPath(String(json.combinedPath || paths.join(' ')));
      setPreviewLocalBounds(json?.stats?.localBounds ?? null);
      setPreviewTraceStats(
        json?.stats
          ? {
              pathsIn: json.stats.pathsIn,
              pathsOut: json.stats.pathsOut,
              commands: json.stats.commands,
              dLength: json.stats.dLength,
              ms: json.stats.ms,
            }
          : null
      );
    } catch (err) {
      const msg =
        err && typeof (err as any).message === 'string'
          ? String((err as any).message)
          : typeof err === 'string'
            ? err
            : t('personalised_sign.ai.error_trace_failed');
      setError(msg);
      setPreviewPath(null);
      setPreviewPathDs(null);
      setPreviewLocalBounds(null);
      setPreviewTraceStats(null);
    } finally {
      setLoading(false);
    }
  }, [imageData, options, targetWidthMm, targetHeightMm, t]);

  // Apply trace result to document
  const handleApply = useCallback(() => {
    if (!previewPathDs || previewPathDs.length === 0) return;

    const targetLayer: 'CUT' | 'ENGRAVE' = options.mode === 'CUT_SILHOUETTE' ? 'CUT' : 'ENGRAVE';
    const element: TracedPathGroupElement = {
      id: generateId(),
      kind: 'tracedPathGroup',
      svgPathDs: previewPathDs,
      strokeMm: targetLayer === 'CUT' ? 0.2 : 0.3,
      transform: {
        xMm: targetWidthMm / 2,
        yMm: targetHeightMm / 2,
        rotateDeg: 0,
        scaleX: 1,
        scaleY: 1,
      },
      _localBounds: previewLocalBounds ?? undefined,
      _traceStats: previewTraceStats ?? undefined,
    };
    onTraceResult(element, targetLayer);

    // Reset state
    setImageData(null);
    setPreviewPath(null);
    setPreviewPathDs(null);
    setPreviewLocalBounds(null);
    setPreviewTraceStats(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewPathDs, previewLocalBounds, previewTraceStats, options.mode, targetWidthMm, targetHeightMm, onTraceResult]);

  // Reset panel
  const handleReset = useCallback(() => {
    setImageData(null);
    setPreviewPath(null);
    setPreviewPathDs(null);
    setPreviewLocalBounds(null);
    setPreviewTraceStats(null);
    setImageName('');
    setError(null);
    setOptions(DEFAULT_OPTIONS);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Insert image directly without tracing (as EngraveImage)
  const handleInsertAsImage = useCallback(() => {
    if (!imageData || !onInsertImage) return;

    // Calculate size - fit within 70% of artboard
    const maxWidthMm = targetWidthMm * 0.7;
    const maxHeightMm = targetHeightMm * 0.7;
    
    // Default to square, will be corrected when image loads
    const sizeMm = Math.min(maxWidthMm, maxHeightMm);

    const element: EngraveImageElement = {
      id: generateId(),
      kind: 'engraveImage',
      pngDataUrl: imageData,
      widthMm: sizeMm,
      heightMm: sizeMm,
      transform: {
        xMm: targetWidthMm / 2,
        yMm: targetHeightMm / 2,
        rotateDeg: 0,
        scaleX: 1,
        scaleY: 1,
      },
    };
    
    onInsertImage(element);

    // Reset state
    setImageData(null);
    setPreviewPath(null);
    setImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imageData, onInsertImage, targetWidthMm, targetHeightMm]);

  // NO auto-trace - user must click button manually
  // This prevents page freeze on complex images

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-cyan-400" />
          {t('personalised_sign.pro.image_trace.title')}
        </h3>
        {imageData && (
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition-colors"
            title={t('personalised_sign.pro.image_trace.reset')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Upload area */}
      {!imageData ? (
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-cyan-500 hover:bg-slate-700/50 transition-colors">
          <Upload className="w-8 h-8 text-slate-400" />
          <span className="text-sm text-slate-300">{t('personalised_sign.pro.image_trace.upload_prompt')}</span>
          <span className="text-xs text-slate-500">{t('personalised_sign.pro.image_trace.upload_formats')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
        </label>
      ) : (
        <>
          {/* Image info */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 rounded p-2">
            <ImageIcon className="w-4 h-4" />
            <span className="truncate flex-1">{imageName}</span>
          </div>

          {/* Image preview */}
          <div className="bg-slate-900 rounded border border-slate-600 p-2 aspect-video flex items-center justify-center">
            <img src={imageData} alt={t('personalised_sign.common.preview')} className="max-w-full max-h-full object-contain" />
          </div>

          {/* Quick action: Insert as Image (no trace) */}
          {onInsertImage && (
            <button
              onClick={handleInsertAsImage}
              disabled={disabled || loading}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" />
              {t('personalised_sign.ai.insert_as_image')}
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="flex-1 h-px bg-slate-700" />
            <span>{t('personalised_sign.ai.or_trace_to_vectors')}</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Mode selection */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400">{t('personalised_sign.pro.image_trace.output_mode')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOptions((o) => ({ ...o, mode: 'CUT_SILHOUETTE', threshold: 175, denoise: 0 }))}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  options.mode === 'CUT_SILHOUETTE'
                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span className="text-xs">{t('personalised_sign.pro.image_trace.mode.cut_silhouette')}</span>
              </button>
              <button
                onClick={() => setOptions((o) => ({ ...o, mode: 'ENGRAVE_LINEART', threshold: 145, denoise: 0 }))}
                className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                  options.mode === 'ENGRAVE_LINEART'
                    ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Pencil className="w-4 h-4" />
                <span className="text-xs">{t('personalised_sign.pro.image_trace.mode.engrave_line_art')}</span>
              </button>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">{t('personalised_sign.pro.image_trace.threshold')}</label>
              <span className="text-xs text-slate-500">{options.threshold}</span>
            </div>
            <input
              type="range"
              min={80}
              max={220}
              value={options.threshold}
              onChange={(e) => setOptions(o => ({ ...o, threshold: Number(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Denoise */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">{t('personalised_sign.ai.trace.denoise')}</label>
              <span className="text-xs text-slate-500">{options.denoise}</span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={options.denoise}
              onChange={(e) => setOptions((o) => ({ ...o, denoise: Number(e.target.value) }))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Auto-invert */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.autoInvert}
                onChange={(e) => setOptions((o) => ({ ...o, autoInvert: e.target.checked }))}
                className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
              {t('personalised_sign.ai.trace.auto_invert')}
            </label>
          </div>

          {/* Preview */}
          {previewPath && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">{t('personalised_sign.common.preview')}</label>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-slate-400 hover:text-white"
                >
                  {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {showPreview && (
                <div className="bg-slate-900 rounded border border-slate-600 p-2 aspect-video flex items-center justify-center">
                  <svg
                    viewBox={`0 0 ${targetWidthMm} ${targetHeightMm}`}
                    className="max-w-full max-h-full"
                    style={{ width: '100%', height: 'auto' }}
                  >
                    <path
                      d={previewPath}
                      fill="none"
                      stroke={options.mode === 'ENGRAVE_LINEART' ? '#ff0000' : '#000'}
                      strokeWidth={options.mode === 'ENGRAVE_LINEART' ? 0.3 : 0.2}
                    />
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Start Trace button - only show if no preview yet */}
          {!previewPath && !loading && (
            <button
              onClick={traceImage}
              disabled={disabled}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {t('personalised_sign.pro.image_trace.trace')}
            </button>
          )}

          {/* Loading indicator during tracing */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2">
              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span>{t('personalised_sign.ai.tracing')}</span>
            </div>
          )}

          {/* Insert traced shape - only show after trace complete */}
          {previewPath && !loading && (
            <button
              onClick={handleApply}
              disabled={disabled}
              className="w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {t('personalised_sign.ai.trace_and_insert')}
            </button>
          )}
        </>
      )}

      {/* Error display */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 rounded p-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
