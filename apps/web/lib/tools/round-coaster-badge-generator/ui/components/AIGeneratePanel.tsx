'use client';

/**
 * AI Generate Panel for Round Coaster PRO
 * Generate images/designs using AI and trace to vector
 */

import React, { useState, useCallback } from 'react';
import { Sparkles, Wand2, Loader2, RefreshCw, Check } from 'lucide-react';

interface AIGeneratePanelProps {
  onGenerate: (prompt: string) => Promise<{ imageUrl?: string; pathD?: string } | null>;
  onInsert: (pathD: string, prompt: string) => void;
  disabled?: boolean;
}

const PROMPT_SUGGESTIONS = [
  'Simple flower silhouette',
  'Celtic knot pattern',
  'Coffee cup icon',
  'Mountain landscape outline',
  'Compass rose design',
  'Vintage frame ornament',
  'Tree of life silhouette',
  'Mandala pattern',
];

export function AIGeneratePanel({ onGenerate, onInsert, disabled }: AIGeneratePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imageUrl?: string; pathD?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading || disabled) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await onGenerate(prompt.trim());
      if (res) {
        setResult(res);
      } else {
        setError('We couldn’t generate a result this time. Try refining your prompt and generate again.');
      }
    } catch (err) {
      console.warn('[AI Generate] generation failed', err);
      setError('We couldn’t generate a result this time. Try refining your prompt and generate again.');
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, disabled, onGenerate]);

  const handleInsert = useCallback(() => {
    if (result?.pathD) {
      onInsert(result.pathD, prompt);
      setResult(null);
      setPrompt('');
    }
  }, [result, prompt, onInsert]);

  const handleSuggestion = useCallback((suggestion: string) => {
    setPrompt(suggestion);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        <span>AI Image Generation</span>
      </div>

      {/* Prompt input */}
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the design you want..."
          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs resize-none h-16 focus:border-purple-500 focus:outline-none"
          disabled={loading || disabled}
        />

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading || disabled}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating… this may take a few seconds.
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              Generate
            </>
          )}
        </button>

        {(!!result || !!error) && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || disabled || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        )}
      </div>

      {/* Suggestions */}
      <div className="space-y-1">
        <div className="text-[10px] text-slate-500">Suggestions:</div>
        <div className="flex flex-wrap gap-1">
          {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestion(suggestion)}
              disabled={loading || disabled}
              className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 rounded disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
          {error}
        </div>
      )}

      {/* Result preview */}
      {result && (
        <div className="space-y-2 p-2 bg-slate-800 rounded border border-slate-700">
          <div className="text-[10px] text-slate-400">Generated result:</div>

          {result.imageUrl && (
            <div className="aspect-square bg-white rounded overflow-hidden">
              <img
                src={result.imageUrl}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {result.pathD && (
            <div className="aspect-square bg-white rounded overflow-hidden p-2">
              <svg viewBox="-50 -50 100 100" className="w-full h-full">
                <path d={result.pathD} fill="none" stroke="#000" strokeWidth="1" />
              </svg>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInsert}
              disabled={!result.pathD}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white text-[11px] rounded"
            >
              <Check className="w-3 h-3" />
              Insert
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] rounded"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          </div>

          <div className="text-[10px] text-slate-400">
            Not perfect? Try refining your prompt and generate again.
          </div>
        </div>
      )}

      <div className="text-[9px] text-slate-600 text-center">
        AI generates SVG-ready vector paths
      </div>
    </div>
  );
}

export default AIGeneratePanel;
