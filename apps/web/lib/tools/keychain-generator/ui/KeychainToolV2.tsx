'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Download,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Upload,
  Wand2,
  LayoutGrid,
  Settings2,
  Type,
  Circle,
  Square,
  Layers,
  FileText,
  Wrench,
} from 'lucide-react';

import type { KeychainConfigV2, KeychainShape, HoleType, HolePosition, TextMode, RenderMode, EngraveStyle, ExportType, Warning } from '../types/keychainV2';
import { DEFAULTS_V2, LIMITS, FONT_FAMILIES, FONT_WEIGHTS, sanitizeConfig, clamp } from '../config/defaultsV2';
import { renderPreviewSvg, renderExportSvg, renderBatchSvg, generateFilename } from '../core/renderV2';
import { generateWarnings, isExportDisabled, applyAutoFixes } from '../core/keychainWarnings';
import { getAllPresets, savePreset, deletePreset, applyPreset } from '../core/presetManager';
import { parseCustomSvg, readFileAsText } from '../core/customShape';

interface Props {
  featureFlags?: { isProUser?: boolean };
}

export default function KeychainToolV2({ featureFlags }: Props) {
  const [config, setConfig] = useState<KeychainConfigV2>(DEFAULTS_V2);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    shape: true,
    hole: true,
    text: true,
    render: false,
    preview: false,
    batch: false,
    presets: false,
    qa: false,
  });
  const [presetName, setPresetName] = useState('');
  const [lastConfig, setLastConfig] = useState<KeychainConfigV2 | null>(null);
  const [customShapeWarnings, setCustomShapeWarnings] = useState<string[]>([]);

  const handleCustomShapeUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const result = parseCustomSvg(content);

      if (result.success && result.path && result.bounds) {
        setConfig((prev) => ({
          ...prev,
          shape: 'custom',
          customShape: {
            enabled: true,
            svgPath: result.path,
            originalBounds: result.bounds,
          },
        }));
        setCustomShapeWarnings(result.warnings);
      } else {
        setCustomShapeWarnings(result.warnings.length > 0 ? result.warnings : ['Failed to parse SVG']);
      }
    } catch {
      setCustomShapeWarnings(['Failed to read file']);
    }

    e.target.value = '';
  }, []);

  const updateConfig = useCallback((updates: Partial<KeychainConfigV2>) => {
    setConfig((prev) => sanitizeConfig({ ...prev, ...updates }));
  }, []);

  const updateHole = useCallback((updates: Partial<KeychainConfigV2['hole']>) => {
    setConfig((prev) => sanitizeConfig({ ...prev, hole: { ...prev.hole, ...updates } }));
  }, []);

  const updateText = useCallback((updates: Partial<KeychainConfigV2['text']>) => {
    setConfig((prev) => sanitizeConfig({ ...prev, text: { ...prev.text, ...updates } }));
  }, []);

  const updateRender = useCallback((updates: Partial<KeychainConfigV2['render']>) => {
    setConfig((prev) => sanitizeConfig({ ...prev, render: { ...prev.render, ...updates } }));
  }, []);

  const updatePreview = useCallback((updates: Partial<KeychainConfigV2['preview']>) => {
    setConfig((prev) => ({ ...prev, preview: { ...prev.preview, ...updates } }));
  }, []);

  const updateBatch = useCallback((updates: Partial<KeychainConfigV2['batch']>) => {
    setConfig((prev) => sanitizeConfig({ ...prev, batch: { ...prev.batch, ...updates } }));
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const warnings = useMemo(() => generateWarnings(config), [config]);
  const exportDisabled = useMemo(() => isExportDisabled(warnings), [warnings]);

  const previewSvg = useMemo(() => renderPreviewSvg(config), [config]);

  const handleExport = useCallback((type: ExportType) => {
    const result = renderExportSvg(config, type);
    const blob = new Blob([result.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const handleExportBatch = useCallback(() => {
    if (!config.batch.enabled || config.batch.names.length === 0) return;
    const svg = renderBatchSvg(config, config.batch.names);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keychain-batch-${config.shape}-${config.batch.names.length}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const handleReset = useCallback(() => {
    setConfig(DEFAULTS_V2);
  }, []);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    savePreset(presetName, config);
    setPresetName('');
  }, [presetName, config]);

  const handleApplyPreset = useCallback((preset: ReturnType<typeof getAllPresets>[0]) => {
    setConfig(applyPreset(preset, config));
  }, [config]);

  const handleAutoFix = useCallback(() => {
    setLastConfig(config);
    setConfig(applyAutoFixes(config, warnings));
  }, [config, warnings]);

  const handleUndo = useCallback(() => {
    if (lastConfig) {
      setConfig(lastConfig);
      setLastConfig(null);
    }
  }, [lastConfig]);

  const presets = useMemo(() => getAllPresets(), []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* Controls Panel */}
      <div className="w-full lg:w-[400px] space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Shape Section */}
        <Section title="Shape" icon={<Square className="w-4 h-4" />} expanded={expandedSections.shape} onToggle={() => toggleSection('shape')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Shape Type</label>
              <select
                value={config.shape}
                onChange={(e) => updateConfig({ shape: e.target.value as KeychainShape })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm"
              >
                <option value="rounded-rectangle">Rounded Rectangle</option>
                <option value="capsule">Capsule</option>
                <option value="dog-tag">Dog Tag</option>
                <option value="circle">Circle</option>
                <option value="hexagon">Hexagon</option>
                <option value="custom">Custom (Import SVG)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Width (mm)" value={config.width} onChange={(v) => updateConfig({ width: v })} min={LIMITS.width.min} max={LIMITS.width.max} />
              <NumberInput label="Height (mm)" value={config.height} onChange={(v) => updateConfig({ height: v })} min={LIMITS.height.min} max={LIMITS.height.max} />
            </div>

            {(config.shape === 'rounded-rectangle' || config.shape === 'dog-tag') && (
              <NumberInput label="Corner Radius" value={config.cornerRadius} onChange={(v) => updateConfig({ cornerRadius: v })} min={0} max={Math.min(LIMITS.cornerRadius.max, config.width / 2, config.height / 2)} />
            )}

            <NumberInput label="Padding (mm)" value={config.padding} onChange={(v) => updateConfig({ padding: v })} min={0} max={30} />

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.border} onChange={(e) => updateConfig({ border: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Show Border</span>
            </div>

            {config.shape === 'custom' && (
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">Import SVG Outline</label>
                <input
                  type="file"
                  accept=".svg"
                  onChange={handleCustomShapeUpload}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                />
                {config.customShape.enabled && (
                  <div className="text-xs text-green-400">✓ Custom shape loaded</div>
                )}
                {customShapeWarnings.length > 0 && (
                  <div className="text-xs text-yellow-400 space-y-1">
                    {customShapeWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* Hole Section */}
        <Section title="Mounting Hole" icon={<Circle className="w-4 h-4" />} expanded={expandedSections.hole} onToggle={() => toggleSection('hole')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.hole.enabled} onChange={(e) => updateHole({ enabled: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Enable Hole</span>
            </div>

            {config.hole.enabled && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hole Type</label>
                  <select value={config.hole.type} onChange={(e) => updateHole({ type: e.target.value as HoleType })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                    <option value="circle">Circle</option>
                    <option value="slot">Slot (Oval)</option>
                    <option value="double">Double Hole</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Position</label>
                  <select value={config.hole.position} onChange={(e) => updateHole({ position: e.target.value as HolePosition })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                    <option value="left">Left</option>
                    <option value="top">Top</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                {config.hole.type === 'circle' && (
                  <NumberInput label="Diameter (mm)" value={config.hole.diameter} onChange={(v) => updateHole({ diameter: v })} min={2} max={15} />
                )}

                {config.hole.type === 'slot' && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberInput label="Slot Width" value={config.hole.slotWidth} onChange={(v) => updateHole({ slotWidth: v })} min={2} max={20} />
                    <NumberInput label="Slot Height" value={config.hole.slotHeight} onChange={(v) => updateHole({ slotHeight: v })} min={2} max={20} />
                  </div>
                )}

                {config.hole.type === 'double' && (
                  <>
                    <NumberInput label="Hole Diameter" value={config.hole.diameter} onChange={(v) => updateHole({ diameter: v })} min={2} max={15} />
                    <NumberInput label="Hole Spacing" value={config.hole.spacing} onChange={(v) => updateHole({ spacing: v })} min={5} max={200} />
                  </>
                )}

                <NumberInput label="Margin (mm)" value={config.hole.margin} onChange={(v) => updateHole({ margin: v })} min={0} max={30} />
              </>
            )}
          </div>
        </Section>

        {/* Text Section */}
        <Section title="Text" icon={<Type className="w-4 h-4" />} expanded={expandedSections.text} onToggle={() => toggleSection('text')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Text Mode</label>
              <div className="flex gap-2">
                <button onClick={() => updateText({ mode: 'single' })} className={`px-3 py-1.5 text-xs rounded ${config.text.mode === 'single' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Single Line</button>
                <button onClick={() => updateText({ mode: 'double' })} className={`px-3 py-1.5 text-xs rounded ${config.text.mode === 'double' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Two Lines</button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Line 1</label>
              <input type="text" value={config.text.text} onChange={(e) => updateText({ text: e.target.value })} placeholder="Enter text" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
            </div>

            {config.text.mode === 'double' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Line 2</label>
                <input type="text" value={config.text.text2} onChange={(e) => updateText({ text2: e.target.value })} placeholder="Enter second line" className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Font</label>
                <select value={config.text.fontFamily} onChange={(e) => updateText({ fontFamily: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Weight</label>
                <select value={config.text.weight} onChange={(e) => updateText({ weight: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
                  {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.text.autoFit} onChange={(e) => updateText({ autoFit: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Auto-fit text size</span>
            </div>

            {config.text.autoFit && (
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="Min Font" value={config.text.fontMin} onChange={(v) => updateText({ fontMin: v })} min={6} max={80} />
                <NumberInput label="Max Font" value={config.text.fontMax} onChange={(v) => updateText({ fontMax: v })} min={6} max={80} />
              </div>
            )}

            {config.text.mode === 'double' && (
              <NumberInput label="Line Gap" value={config.text.lineGap} onChange={(v) => updateText({ lineGap: v })} min={0.7} max={1.4} step={0.1} />
            )}
          </div>
        </Section>

        {/* Render Section */}
        <Section title="Output Settings" icon={<Layers className="w-4 h-4" />} expanded={expandedSections.render} onToggle={() => toggleSection('render')}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Render Mode</label>
              <select value={config.render.mode} onChange={(e) => updateRender({ mode: e.target.value as RenderMode })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                <option value="cut+engrave">Cut + Engrave</option>
                <option value="cut-only">Cut Only</option>
                <option value="engrave-only">Engrave Only</option>
              </select>
            </div>

            <NumberInput label="Cut Stroke Width" value={config.render.cutStroke} onChange={(v) => updateRender({ cutStroke: v })} min={0.001} max={0.2} step={0.001} />

            <div>
              <label className="block text-xs text-slate-400 mb-1">Engrave Style</label>
              <select value={config.render.engraveStyle} onChange={(e) => updateRender({ engraveStyle: e.target.value as EngraveStyle })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                <option value="fill">Fill</option>
                <option value="stroke">Stroke</option>
                <option value="fill+stroke">Fill + Stroke</option>
              </select>
            </div>

            {config.render.engraveStyle !== 'fill' && (
              <NumberInput label="Engrave Stroke Width" value={config.render.engraveStroke} onChange={(v) => updateRender({ engraveStroke: v })} min={0.05} max={2} step={0.05} />
            )}
          </div>
        </Section>

        {/* Preview Settings */}
        <Section title="Preview Settings" icon={<Eye className="w-4 h-4" />} expanded={expandedSections.preview} onToggle={() => toggleSection('preview')}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.preview.showGrid} onChange={(e) => updatePreview({ showGrid: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Show Grid</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.preview.showSafeZones} onChange={(e) => updatePreview({ showSafeZones: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Show Safe Zones</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.preview.showHatchPreview} onChange={(e) => updatePreview({ showHatchPreview: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Show Hatch Preview</span>
            </div>
          </div>
        </Section>

        {/* Batch Mode (V3) */}
        <Section title="Batch Mode" icon={<LayoutGrid className="w-4 h-4" />} expanded={expandedSections.batch} onToggle={() => toggleSection('batch')}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.batch.enabled} onChange={(e) => updateBatch({ enabled: e.target.checked })} className="rounded" />
              <span className="text-xs text-slate-300">Enable Batch Mode</span>
            </div>

            {config.batch.enabled && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Names (one per line)</label>
                  <textarea
                    value={config.batch.names.join('\n')}
                    onChange={(e) => updateBatch({ names: e.target.value.split('\n').filter(n => n.trim()) })}
                    placeholder="Enter names..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm min-h-[100px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Sheet Width" value={config.batch.sheetWidth} onChange={(v) => updateBatch({ sheetWidth: v })} min={100} max={1200} />
                  <NumberInput label="Sheet Height" value={config.batch.sheetHeight} onChange={(v) => updateBatch({ sheetHeight: v })} min={100} max={800} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Spacing" value={config.batch.spacing} onChange={(v) => updateBatch({ spacing: v })} min={0} max={50} />
                  <NumberInput label="Margin" value={config.batch.margin} onChange={(v) => updateBatch({ margin: v })} min={0} max={50} />
                </div>

                <button onClick={handleExportBatch} disabled={config.batch.names.length === 0} className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-sm font-medium flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Batch ({config.batch.names.length})
                </button>
              </>
            )}
          </div>
        </Section>

        {/* Presets */}
        <Section title="Presets" icon={<FileText className="w-4 h-4" />} expanded={expandedSections.presets} onToggle={() => toggleSection('presets')}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
              <button onClick={handleSavePreset} disabled={!presetName.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs">
                <Save className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {presets.map((preset) => (
                <div key={preset.name} className="flex items-center gap-2 p-2 bg-slate-800 rounded text-xs">
                  <button onClick={() => handleApplyPreset(preset)} className="flex-1 text-left hover:text-blue-400">{preset.name}</button>
                  {!preset.isDefault && (
                    <button onClick={() => deletePreset(preset.name)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* QA Panel (V3) */}
        <Section title="QA Panel" icon={<Wrench className="w-4 h-4" />} expanded={expandedSections.qa} onToggle={() => toggleSection('qa')}>
          <div className="space-y-3">
            {warnings.filter(w => w.autoFixable).length > 0 && (
              <button onClick={handleAutoFix} className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium flex items-center justify-center gap-2">
                <Wand2 className="w-4 h-4" />
                Auto-Fix Issues ({warnings.filter(w => w.autoFixable).length})
              </button>
            )}

            {lastConfig && (
              <button onClick={handleUndo} className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                Undo Last Fix
              </button>
            )}

            <div className="text-xs text-slate-400">
              {warnings.length === 0 ? '✓ No issues detected' : `${warnings.length} issue(s) found`}
            </div>
          </div>
        </Section>

        {/* Reset */}
        <button onClick={handleReset} className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reset to Defaults
        </button>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 bg-slate-800 rounded-lg px-4 py-2">
          <div className="text-xs text-slate-400">{config.width} × {config.height} mm</div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('combined')} disabled={exportDisabled} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
              <Download className="w-3 h-3" /> Combined
            </button>
            <button onClick={() => handleExport('cut')} disabled={exportDisabled} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
              <Download className="w-3 h-3" /> Cut
            </button>
            <button onClick={() => handleExport('engrave')} disabled={exportDisabled} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs flex items-center gap-1">
              <Download className="w-3 h-3" /> Engrave
            </button>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium mb-1">
              <AlertTriangle className="w-4 h-4" /> Warnings
            </div>
            <ul className="text-xs text-yellow-300/80 space-y-1">
              {warnings.map((w) => (
                <li key={w.id} className="flex items-start gap-2">
                  <span className={w.level === 'error' ? 'text-red-400' : w.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'}>•</span>
                  <span>{w.message}{w.fix && <span className="text-slate-400 ml-1">— {w.fix}</span>}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* SVG Preview */}
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex items-center justify-center min-h-[400px]">
          <div className="bg-white rounded shadow-lg" style={{ maxWidth: '100%', maxHeight: '70vh' }} dangerouslySetInnerHTML={{ __html: previewSvg }} />
        </div>
      </div>
    </div>
  );
}

// ============ Helper Components ============

function Section({ title, icon, expanded, onToggle, children }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">{icon}{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1, className = '' }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
      <input type="number" value={value} onChange={(e) => onChange(clamp(parseFloat(e.target.value) || min, min, max))} min={min} max={max} step={step} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
    </div>
  );
}
