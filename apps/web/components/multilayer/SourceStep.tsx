'use client';

import { useState, useCallback } from 'react';
import type { ProjectState, AIPreset, DetailLevel, BackgroundType, SourceImage } from '@/lib/multilayer/types';
import type { Mode } from '@/lib/multilayer/modes';
import { MODES, getModeDefaults } from '@/lib/multilayer/modes';
import { ModeSelector } from './ModeSelector';
import { refreshEntitlements } from '@/lib/entitlements/client';

interface SourceStepProps {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
}

export function SourceStep({ project, onUpdateProject, onNext }: SourceStepProps) {
  const [activeTab, setActiveTab] = useState<'mode' | 'upload' | 'ai'>('upload');
  const [aiSubject, setAiSubject] = useState('');
  const [aiPreset, setAiPreset] = useState<AIPreset>('cute');
  const [aiDetail, setAiDetail] = useState<DetailLevel>('medium');
  const [aiBackground, setAiBackground] = useState<BackgroundType>('transparent');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  const handleModeSelect = useCallback((mode: Mode) => {
    const modeDefaults = getModeDefaults(mode);
    onUpdateProject({
      mode,
      settings: {
        ...project.settings,
        ...modeDefaults,
      },
    });
    setActiveTab('upload');
  }, [project.settings, onUpdateProject]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const sourceImage: SourceImage = {
            dataUrl: e.target?.result as string,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
          };
          onUpdateProject({ sourceImage, error: null });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      onUpdateProject({ error: 'Failed to load image' });
    }
  }, [onUpdateProject]);

  const handleAIGenerate = useCallback(async () => {
    if (!aiSubject.trim()) {
      onUpdateProject({ error: 'Please enter a subject' });
      return;
    }

    setIsGenerating(true);
    onUpdateProject({ isProcessing: true, error: null });

    try {
      const response = await fetch('/api/multilayer/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: project.mode,
          subject: aiSubject,
          preset: aiPreset,
          detail: aiDetail,
          background: aiBackground,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson: any = await response.json().catch(() => ({}));
          const msg = errJson?.error || errJson?.message || JSON.stringify(errJson);
          throw new Error(`AI generation failed: ${msg}`);
        }
        const errText = await response.text().catch(() => '');
        throw new Error(`AI generation failed: ${errText || response.statusText}`);
      }

      const data: { imageBase64?: string; imageUrl?: string } = await response.json();

      const dataUrl = data.imageBase64
        ? (data.imageBase64.startsWith('data:')
          ? data.imageBase64
          : `data:image/png;base64,${data.imageBase64}`)
        : data.imageUrl;

      if (!dataUrl) {
        throw new Error('AI returned no image. Configure AI_PROVIDER and provider keys.');
      }

      // Load image to get dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load AI image'));
        img.src = dataUrl;
      });

      const sourceImage: SourceImage = {
        dataUrl,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
      };

      onUpdateProject({ sourceImage, error: null, isProcessing: false });
      setHasGeneratedOnce(true);
      setActiveTab('upload');
      refreshEntitlements();
    } catch (error) {
      console.warn('[Multilayer AI] generation failed', error);
      onUpdateProject({ 
        error: 'We couldn’t generate a result this time. Try refining your prompt and generate again.',
        isProcessing: false 
      });
    } finally {
      setIsGenerating(false);
    }
  }, [aiSubject, aiPreset, aiDetail, aiBackground, onUpdateProject]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Step 1: Source Image</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('mode')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'mode'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {MODES[project.mode || 'custom'].icon} {MODES[project.mode || 'custom'].name}
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Upload Image
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'ai'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          AI Generate
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-slate-700 rounded-lg p-12 text-center hover:border-sky-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            {project.sourceImage ? (
              <div>
                <img
                  src={project.sourceImage.dataUrl}
                  alt="Source"
                  className="max-w-md mx-auto rounded-lg"
                />
                <p className="mt-4 text-slate-400">
                  {project.sourceImage.width} × {project.sourceImage.height} px
                </p>

                {hasGeneratedOnce && (
                  <p className="mt-2 text-xs text-slate-500">
                    Not perfect? Try refining your prompt and generate again.
                  </p>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('file-input')?.click();
                  }}
                  className="mt-4 text-sky-400 hover:text-sky-300"
                >
                  Change image
                </button>

                {hasGeneratedOnce && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab('ai');
                      handleAIGenerate();
                    }}
                    disabled={isGenerating || !aiSubject.trim()}
                    className="mt-3 block mx-auto bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            ) : (
              <div>
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-300 font-medium">Click to upload or drag and drop</p>
                <p className="text-slate-500 text-sm mt-2">PNG, JPG, WebP (max 5MB)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Generate Tab */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Subject (e.g., &quot;a tiger&quot;, &quot;cute robot&quot;)
            </label>
            <input
              type="text"
              value={aiSubject}
              onChange={(e) => setAiSubject(e.target.value)}
              placeholder="Enter subject..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Preset Style</label>
            <div className="grid grid-cols-5 gap-2">
              {(['cute', 'realistic', 'christmas', 'minimal', 'bold'] as AIPreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => setAiPreset(preset)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    aiPreset === preset
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Detail Level</label>
              <select
                value={aiDetail}
                onChange={(e) => setAiDetail(e.target.value as DetailLevel)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Background</label>
              <select
                value={aiBackground}
                onChange={(e) => setAiBackground(e.target.value as BackgroundType)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
              >
                <option value="transparent">Transparent</option>
                <option value="solid">Solid Color</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAIGenerate}
            disabled={isGenerating || !aiSubject.trim()}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating… this may take a few seconds.' : 'Generate Image'}
          </button>

          {(hasGeneratedOnce || !!project.error) && (
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || !aiSubject.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Regenerate
            </button>
          )}

          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400">
              <strong>Note:</strong> The AI will generate a multilayer-friendly image with flat colors and clean edges.
              The actual prompt is optimized for laser cutting and hidden from view.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {project.error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {project.error}
        </div>
      )}

      {/* Next Button */}
      {project.sourceImage && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={onNext}
            className="bg-sky-600 hover:bg-sky-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Continue to Layers →
          </button>
        </div>
      )}
    </div>
  );
}
