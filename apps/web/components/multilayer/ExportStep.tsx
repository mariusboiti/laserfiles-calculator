'use client';

import { useState, useCallback } from 'react';
import type { ProjectState, HealthCheck } from '@/lib/multilayer/types';
import { exportProject, downloadZip, performHealthChecks } from '@/lib/multilayer/export';

interface ExportStepProps {
  project: ProjectState;
  onUpdateProject: (updates: Partial<ProjectState>) => void;
  onBack: () => void;
  onExport?: () => void;
}

export function ExportStep({ project, onUpdateProject, onBack, onExport }: ExportStepProps) {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const runHealthChecks = useCallback(() => {
    const checks = performHealthChecks(project.vectorLayers);
    setHealthChecks(checks);
  }, [project.vectorLayers]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const zipBlob = await exportProject(
        project.vectorLayers,
        project.settings,
        project.sourceImage
      );
      
      downloadZip(zipBlob, 'multilayer-project.zip');
      
      onUpdateProject({ error: null });
      onExport?.();
    } catch (error) {
      onUpdateProject({
        error: error instanceof Error ? error.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  }, [project, onUpdateProject, onExport]);

  // Run health checks on mount
  useState(() => {
    if (project.vectorLayers.length > 0) {
      runHealthChecks();
    }
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Step 3: Export</h2>

      {/* Health Checks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200">Health Checks</h3>
          <button
            onClick={runHealthChecks}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            Re-run checks
          </button>
        </div>

        <div className="space-y-2">
          {healthChecks.map((check, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                check.type === 'error'
                  ? 'bg-red-500/10 border-red-500/30'
                  : check.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-green-500/10 border-green-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  check.type === 'error'
                    ? 'text-red-400'
                    : check.type === 'warning'
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}>
                  {check.type === 'error' ? '✕' : check.type === 'warning' ? '⚠' : '✓'}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    check.type === 'error'
                      ? 'text-red-400'
                      : check.type === 'warning'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                    {check.message}
                  </div>
                  {check.details && (
                    <div className="text-sm text-slate-400 mt-1">{check.details}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Export Options</h3>
        
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={project.settings.includePreview}
              onChange={(e) => onUpdateProject({
                settings: { ...project.settings, includePreview: e.target.checked }
              })}
              className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
            />
            <span className="text-sm text-slate-200">Include preview PNG</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={project.settings.includeSettings}
              onChange={(e) => onUpdateProject({
                settings: { ...project.settings, includeSettings: e.target.checked }
              })}
              className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
            />
            <span className="text-sm text-slate-200">Include settings.json</span>
          </label>
        </div>
      </div>

      {/* Export Contents */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">ZIP Contents</h3>
        
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4">
          <ul className="space-y-1 text-sm text-slate-300">
            {project.vectorLayers.map((layer, index) => (
              <li key={layer.id}>
                • layer-{String(index + 1).padStart(2, '0')}-{layer.name.toLowerCase().replace(/\s+/g, '-')}.svg
              </li>
            ))}
            <li>• combined-all-layers.svg</li>
            {project.settings.includePreview && <li>• preview.png</li>}
            {project.settings.includeSettings && <li>• settings.json</li>}
            <li>• README.txt</li>
          </ul>
        </div>
      </div>

      {/* Layer Summary */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Layer Summary</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4">
            <div className="text-2xl font-bold text-slate-100">
              {project.vectorLayers.length}
            </div>
            <div className="text-sm text-slate-400">Total Layers</div>
          </div>
          
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4">
            <div className="text-2xl font-bold text-slate-100">
              {project.vectorLayers.reduce((sum, l) => sum + l.stats.pathCount, 0)}
            </div>
            <div className="text-sm text-slate-400">Total Paths</div>
          </div>
          
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4">
            <div className="text-2xl font-bold text-slate-100">
              {project.settings.targetWidthMm}mm
            </div>
            <div className="text-sm text-slate-400">Output Width</div>
          </div>
          
          <div className="bg-slate-900/60 rounded-lg border border-slate-800 p-4">
            <div className="text-2xl font-bold text-slate-100">
              {project.settings.outputFormat}
            </div>
            <div className="text-sm text-slate-400">Format</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {project.error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {project.error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors"
        >
          ← Back to Layers
        </button>
        
        <button
          onClick={handleExport}
          disabled={isExporting || healthChecks.some(c => c.type === 'error')}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? 'Exporting...' : 'Download ZIP'}
        </button>
      </div>
    </div>
  );
}
