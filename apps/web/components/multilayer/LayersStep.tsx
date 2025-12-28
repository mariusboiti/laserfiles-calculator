'use client';

import { useState, useCallback } from 'react';
import type { ProjectState } from '@/lib/multilayer/types';
import { processImageToLayers } from '@/lib/multilayer/pipeline';

interface LayersStepProps {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LayersStep({ project, onUpdateProject, onNext, onBack }: LayersStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!project.sourceImage) return;

    setIsProcessing(true);
    onUpdateProject({ isProcessing: true, error: null, progress: 0 });

    try {
      const { masks, vectors } = await processImageToLayers(
        project.sourceImage,
        project.settings,
        (progress) => {
          onUpdateProject({ progress: progress.progress, progressMessage: progress.message });
        }
      );

      onUpdateProject({
        layerMasks: masks,
        vectorLayers: vectors,
        isProcessing: false,
        progress: 100,
        progressMessage: 'Complete!',
      });
    } catch (error) {
      onUpdateProject({
        error: error instanceof Error ? error.message : 'Processing failed',
        isProcessing: false,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [project.sourceImage, project.settings, onUpdateProject]);

  const updateSetting = <K extends keyof typeof project.settings>(
    key: K,
    value: typeof project.settings[K]
  ) => {
    onUpdateProject({
      settings: { ...project.settings, [key]: value },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Left: Controls */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-100">Step 2: Configure Layers</h2>

        {/* Layer Count */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Number of Layers: {project.settings.layerCount}
          </label>
          <input
            type="range"
            min={3}
            max={10}
            value={project.settings.layerCount}
            onChange={(e) => updateSetting('layerCount', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>3</span>
            <span>10</span>
          </div>
        </div>

        {/* Quantize Method */}
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Quantization Method</label>
          <div className="grid grid-cols-2 gap-2">
            {(['posterize', 'kmeans'] as const).map(method => (
              <button
                key={method}
                onClick={() => updateSetting('quantizeMethod', method)}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  project.settings.quantizeMethod === method
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Background Removal */}
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={project.settings.removeBg}
              onChange={(e) => updateSetting('removeBg', e.target.checked)}
              className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
            />
            <span className="text-sm text-slate-200">Remove Background</span>
          </label>
          {project.settings.removeBg && (
            <div className="pl-6 space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Tolerance: {project.settings.bgTolerance}
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={project.settings.bgTolerance}
                  onChange={(e) => updateSetting('bgTolerance', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Cleanup Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Cleanup</h3>
          
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Min Island Area: {project.settings.minIslandArea}mm²
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={project.settings.minIslandArea}
              onChange={(e) => updateSetting('minIslandArea', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Smooth Edges: {project.settings.smoothEdges}
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={project.settings.smoothEdges}
              onChange={(e) => updateSetting('smoothEdges', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Simplify Tolerance: {project.settings.simplifyTolerance}
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={project.settings.simplifyTolerance}
              onChange={(e) => updateSetting('simplifyTolerance', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Output Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200">Output</h3>
          
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Target Width: {project.settings.targetWidthMm}mm
            </label>
            <input
              type="number"
              min={50}
              max={1000}
              step={10}
              value={project.settings.targetWidthMm}
              onChange={(e) => updateSetting('targetWidthMm', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['filled', 'stroked'] as const).map(format => (
                <button
                  key={format}
                  onClick={() => updateSetting('outputFormat', format)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    project.settings.outputFormat === format
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Generate Layers'}
        </button>

        {/* Progress */}
        {isProcessing && (
          <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>{project.progressMessage}</span>
              <span>{project.progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-sky-600 h-2 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Center: Preview */}
      <div className="lg:col-span-2">
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Preview</h3>
          
          {project.sourceImage && (
            <div className="bg-white rounded-lg overflow-hidden">
              <img
                src={project.sourceImage.dataUrl}
                alt="Source"
                className="w-full h-auto"
              />
            </div>
          )}

          {project.vectorLayers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-200 mb-3">
                Generated Layers ({project.vectorLayers.length})
              </h4>
              <div className="space-y-2">
                {project.vectorLayers.map(layer => (
                  <div
                    key={layer.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-lg"
                  >
                    <div
                      className="w-6 h-6 rounded border border-slate-600"
                      style={{ backgroundColor: layer.color }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">{layer.name}</div>
                      <div className="text-xs text-slate-400">
                        {layer.stats.pathCount} paths, {layer.stats.islandCount} islands
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      {project.vectorLayers.length > 0 && (
        <div className="lg:col-span-3 flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
          >
            ← Back to Source
          </button>
          <button
            onClick={onNext}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition-colors"
          >
            Continue to Export →
          </button>
        </div>
      )}
    </div>
  );
}
