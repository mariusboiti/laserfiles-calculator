'use client';

/**
 * Personalised Sign Generator V3 PRO - AI Generate Panel
 * Generate engraving sketches and shape silhouettes using Gemini
 */

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Pencil,
  Scissors,
} from 'lucide-react';
import type {
  AiGenerationMode,
  AiDetailLevel,
  AiComplexity,
  Element,
  EngraveImageElement,
  TracedPathGroupElement,
} from '../../types/signPro';
import { generateId } from '../../types/signPro';
import { PROMPT_SUGGESTIONS } from '../../core/ai/promptTemplates';
import { buildSketchImagePrompt, buildSilhouetteImagePrompt } from '../../core/ai/imagePromptTemplates';

const TRACE_DEBUG = process.env.NEXT_PUBLIC_TRACE_DEBUG === '1';

type PanelMode = 'engravingSketchImage' | 'shapeSilhouette' | 'shapeSilhouetteImage';

interface AiGeneratePanelProps {
  targetWidthMm: number;
  targetHeightMm: number;
  onGenerated: (result: { mode: AiGenerationMode; svg?: string; pngDataUrl?: string }) => void;
  onTraceResult?: (element: Element, targetLayer: 'CUT' | 'ENGRAVE') => void;
  onInsertImage?: (element: EngraveImageElement) => void;
  disabled?: boolean;
}

export function AiGeneratePanel({
  targetWidthMm,
  targetHeightMm,
  onGenerated,
  onTraceResult,
  onInsertImage,
  disabled,
}: AiGeneratePanelProps) {
  const [mode, setMode] = useState<PanelMode>('engravingSketchImage');
  const [prompt, setPrompt] = useState('');
  const [detailLevel, setDetailLevel] = useState<AiDetailLevel>('medium');
  const [complexity, setComplexity] = useState<AiComplexity>('simple');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imagePreviewDataUrl, setImagePreviewDataUrl] = useState<string | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);
  const [traceThreshold, setTraceThreshold] = useState(145);
  const [traceDenoise, setTraceDenoise] = useState(0);
  const [traceAutoInvert, setTraceAutoInvert] = useState(true);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  const isImageMode = mode !== 'shapeSilhouette';
  const isSketchMode = mode === 'engravingSketchImage';
  const suggestions = isSketchMode
    ? PROMPT_SUGGESTIONS.engravingSketch
    : PROMPT_SUGGESTIONS.shapeSilhouette;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setWarning(null);
    setTraceError(null);

    try {
      if (mode === 'shapeSilhouette') {
        const response = await fetch('/api/ai/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'shapeSilhouette',
            prompt: prompt.trim(),
            targetWmm: targetWidthMm,
            targetHmm: targetHeightMm,
            detailLevel,
            complexity,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed');
        }

        if (data.warning) {
          setWarning(data.warning);
        }

        setImagePreviewDataUrl(null);
        onGenerated({ mode: 'shapeSilhouette', svg: data.svg, pngDataUrl: data.pngDataUrl });
        setHasGeneratedOnce(true);
        return;
      }

      const promptUsed =
        mode === 'engravingSketchImage'
          ? buildSketchImagePrompt(prompt.trim(), detailLevel)
          : buildSilhouetteImagePrompt(prompt.trim(), complexity === 'simple' ? 'simple' : 'medium');

      const response = await fetch('/api/ai/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: mode === 'engravingSketchImage' ? 'engravingSketch' : 'shapeSilhouette',
          prompt: promptUsed,
          transparent: true,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error?.message || 'Image generation failed');
      }

      const mime = typeof data.mime === 'string' ? data.mime : 'image/png';
      const base64 = typeof data.base64 === 'string' ? data.base64 : '';
      if (!base64) {
        throw new Error('AI returned empty image data');
      }

      if (mode === 'shapeSilhouetteImage') {
        setTraceThreshold(175);
        setTraceDenoise(0);
        setTraceAutoInvert(true);
      } else {
        setTraceThreshold(145);
        setTraceDenoise(0);
        setTraceAutoInvert(true);
      }

      setImagePreviewDataUrl(`data:${mime};base64,${base64}`);
      setHasGeneratedOnce(true);
    } catch (e) {
      const msg =
        e && typeof (e as any).message === 'string'
          ? String((e as any).message)
          : typeof e === 'string'
            ? e
            : 'Generation failed';
      console.warn('[AI Generate] generation failed', msg);
      setError('We couldn’t generate a result this time. Try refining your prompt and generate again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, mode, targetWidthMm, targetHeightMm, detailLevel, complexity, loading, onGenerated]);

  const handleTraceInsert = useCallback(async () => {
    if (!imagePreviewDataUrl || traceLoading || !onTraceResult) return;

    setTraceLoading(true);
    setTraceError(null);
    try {
      const traceMode = mode === 'shapeSilhouetteImage' ? 'CUT_SILHOUETTE' : 'ENGRAVE_LINEART';

      const res = await fetch('/api/trace/potrace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: imagePreviewDataUrl,
          mode: traceMode,
          targetWidthMm,
          targetHeightMm,
          threshold: traceThreshold,
          denoise: traceDenoise,
          autoInvert: traceAutoInvert,
        }),
      });

      const json: any = await res.json();
      if (!json?.ok) {
        throw new Error(json?.error || 'Trace failed');
      }

      const paths: string[] = Array.isArray(json.paths) ? json.paths : [];
      if (paths.length === 0) {
        throw new Error('No usable vector found');
      }

      if (TRACE_DEBUG) {
        console.debug('[Trace&Insert] potrace paths:', paths.length);
        console.debug('[Trace&Insert] first path d:', (paths[0] || '').slice(0, 120));
        console.debug('[Trace&Insert] stats:', json.stats);
        console.debug('[Trace&Insert] debug:', json.debug);
      }

      const targetLayer: 'CUT' | 'ENGRAVE' = mode === 'shapeSilhouetteImage' ? 'CUT' : 'ENGRAVE';

      const element: TracedPathGroupElement = {
        id: generateId(),
        kind: 'tracedPathGroup',
        svgPathDs: paths,
        strokeMm: targetLayer === 'CUT' ? 0.2 : 0.3,
        transform: {
          xMm: targetWidthMm / 2,
          yMm: targetHeightMm / 2,
          rotateDeg: 0,
          scaleX: 1,
          scaleY: 1,
        },
        _localBounds: json?.stats?.localBounds,
        _traceStats: json?.stats
          ? {
              pathsIn: json.stats.pathsIn,
              pathsOut: json.stats.pathsOut,
              commands: json.stats.commands,
              dLength: json.stats.dLength,
              ms: json.stats.ms,
            }
          : undefined,
        aiPrompt: prompt.trim(),
      };

      onTraceResult(element, targetLayer);

      setImagePreviewDataUrl(null);
    } catch (e) {
      const msg =
        e && typeof (e as any).message === 'string'
          ? String((e as any).message)
          : typeof e === 'string'
            ? e
            : 'Trace failed';
      setTraceError(msg);
    } finally {
      setTraceLoading(false);
    }
  }, [
    imagePreviewDataUrl,
    traceLoading,
    onTraceResult,
    targetWidthMm,
    targetHeightMm,
    traceThreshold,
    traceDenoise,
    traceAutoInvert,
    mode,
    prompt,
  ]);

  // Insert image directly without tracing
  const handleInsertAsImage = useCallback(() => {
    if (!imagePreviewDataUrl || !onInsertImage) return;

    const maxWidthMm = targetWidthMm * 0.7;
    const maxHeightMm = targetHeightMm * 0.7;
    const sizeMm = Math.min(maxWidthMm, maxHeightMm);

    const element: EngraveImageElement = {
      id: generateId(),
      kind: 'engraveImage',
      pngDataUrl: imagePreviewDataUrl,
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
    setImagePreviewDataUrl(null);
  }, [imagePreviewDataUrl, onInsertImage, targetWidthMm, targetHeightMm]);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Sparkles className="w-4 h-4 text-purple-400" />
        AI Generate
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 rounded-lg p-1">
        <button
          onClick={() => setMode('engravingSketchImage')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'engravingSketchImage'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          Sketch (Image)
        </button>
        <button
          onClick={() => setMode('shapeSilhouette')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'shapeSilhouette'
              ? 'bg-red-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Silhouette (SVG)
        </button>
        <button
          onClick={() => setMode('shapeSilhouetteImage')}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            mode === 'shapeSilhouetteImage'
              ? 'bg-red-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Silhouette (Image)
        </button>
      </div>

      {/* Mode description */}
      <p className="text-xs text-slate-400">
        {mode === 'engravingSketchImage'
          ? 'Generate a PNG sketch for engraving, then trace to vectors'
          : mode === 'shapeSilhouetteImage'
            ? 'Generate a PNG silhouette for cutting, then trace to vectors'
            : 'Generate solid silhouette shape for cutting (fill-based)'}
      </p>

      {/* Prompt input */}
      <div className="space-y-2">
        <label className="block text-xs text-slate-400">Describe your design</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`e.g., "${suggestions[0]}"`}
          disabled={disabled || loading}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm disabled:opacity-50"
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        />
      </div>

      {/* Suggestions */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Lightbulb className="w-3 h-3" />
          Suggestions
        </div>
        <div className="flex flex-wrap gap-1">
          {suggestions.slice(0, 5).map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              disabled={disabled || loading}
              className="px-2 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-slate-400 hover:text-slate-300"
        >
          {showAdvanced ? '▾ Hide' : '▸ Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-700">
            {mode === 'engravingSketchImage' ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Detail Level</label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value as AiDetailLevel)}
                  disabled={disabled || loading}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                >
                  <option value="low">Low (simple lines)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="high">High (detailed)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Complexity</label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value as AiComplexity)}
                  disabled={disabled || loading}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                >
                  <option value="simple">Simple (single shape)</option>
                  <option value="medium">Medium (few shapes)</option>
                  <option value="detailed">Detailed (complex)</option>
                </select>
              </div>
            )}

            {isImageMode && imagePreviewDataUrl && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Trace Threshold</label>
                  <input
                    type="range"
                    min={80}
                    max={220}
                    value={traceThreshold}
                    onChange={(e) => setTraceThreshold(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                    disabled={disabled || loading || traceLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Denoise</label>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={traceDenoise}
                    onChange={(e) => setTraceDenoise(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                    disabled={disabled || loading || traceLoading}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={traceAutoInvert}
                    onChange={(e) => setTraceAutoInvert(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                    disabled={disabled || loading || traceLoading}
                  />
                  Auto-invert
                </label>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300">{error}</div>
      )}

      {/* Warning message */}
      {warning && (
        <div className="flex items-start gap-2 p-2 bg-amber-900/30 border border-amber-800 rounded text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {warning}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={disabled || loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Generating… this may take a few seconds.
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Generate {mode === 'engravingSketchImage' ? 'Sketch' : 'Silhouette'}
          </>
        )}
      </button>

      {(hasGeneratedOnce || !!error) && (
        <button
          onClick={handleGenerate}
          disabled={disabled || loading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      )}

      {isImageMode && imagePreviewDataUrl && (
        <div className="space-y-2">
          <div className="bg-slate-900 border border-slate-700 rounded p-2">
            <img src={imagePreviewDataUrl} alt="AI preview" className="w-full h-auto rounded" />
          </div>

          <div className="text-[10px] text-slate-400">
            Not perfect? Try refining your prompt and generate again.
          </div>
          
          {/* Insert as Image - no trace needed */}
          {onInsertImage && (
            <button
              onClick={handleInsertAsImage}
              disabled={disabled || loading || traceLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" />
              Insert as Image (no trace)
            </button>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="flex-1 h-px bg-slate-700" />
            <span>or trace to vectors</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <button
            onClick={handleTraceInsert}
            disabled={disabled || loading || traceLoading || !onTraceResult}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              !disabled && !loading && !traceLoading && onTraceResult
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {traceLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Tracing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Trace & Insert
              </>
            )}
          </button>

        </div>
      )}

      {traceError && (
        <div className="flex items-start gap-2 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {traceError}
        </div>
      )}

      {/* Info */}
      <p className="text-[10px] text-slate-500 text-center">
        AI results are added to {mode === 'engravingSketchImage' ? 'ENGRAVE' : 'CUT'} layer
      </p>
    </div>
  );
}

export default AiGeneratePanel;
