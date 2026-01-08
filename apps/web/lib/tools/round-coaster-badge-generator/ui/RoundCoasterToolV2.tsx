'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  RotateCcw, Download, ZoomIn, ZoomOut, Maximize2, 
  AlertTriangle, Info, ChevronDown, ChevronUp, Lock, Unlock,
  Eye, EyeOff, Layers, Sparkles, FileStack, Save, FolderOpen, X
} from 'lucide-react';
import type { CoasterStateV2, ShapeType, Warning, PresetConfig } from '../types/coasterV2';
import { DEFAULTS_V2, PRESETS_V2, PRESET_DIAMETERS, STEP_SIZES, LIMITS, clamp, applyPreset } from '../config/defaultsV2';
import { buildCoasterSvgV2, generateFilename } from '../core/generateSvgV2';
import { type CurvedTextConfig, DEFAULT_CURVED_TEXT, generateCurvedTextSvg, calculateOptimalArcAngles } from '../core/curvedText';
import { type BatchConfig, DEFAULT_BATCH_CONFIG, parseTextList, generateBatchItems, buildBatchSvgs, exportBatch, estimateBatchTime } from '../core/batchExport';

// Download helper
function downloadSvg(content: string, filename: string) {
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Number input with step controls
function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'mm',
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step, min, max))}
          disabled={disabled || value <= min}
          className="px-2 py-1 bg-slate-800 rounded text-xs hover:bg-slate-700 disabled:opacity-50"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          className="w-16 text-center rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-100"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step, min, max))}
          disabled={disabled || value >= max}
          className="px-2 py-1 bg-slate-800 rounded text-xs hover:bg-slate-700 disabled:opacity-50"
        >
          +
        </button>
        <span className="text-[10px] text-slate-500">{unit}</span>
      </div>
    </label>
  );
}

// Checkbox component
function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="rounded border-slate-700 bg-slate-900"
      />
      <span className="text-xs text-slate-300">{label}</span>
    </label>
  );
}

// Collapsible section
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="text-sm font-medium text-slate-100">{title}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

// Warning display
function WarningsDisplay({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;
  
  return (
    <div className="space-y-1">
      {warnings.map((w) => (
        <div
          key={w.id}
          className={`flex items-start gap-2 p-2 rounded text-xs ${
            w.level === 'error' ? 'bg-red-900/30 border border-red-800 text-red-300' :
            w.level === 'warning' ? 'bg-yellow-900/30 border border-yellow-800 text-yellow-300' :
            'bg-blue-900/30 border border-blue-800 text-blue-300'
          }`}
        >
          {w.level === 'info' ? (
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          )}
          <span>{w.message}</span>
        </div>
      ))}
    </div>
  );
}

interface RoundCoasterToolV2Props {
  onResetCallback?: (callback: () => void) => void;
}

export function RoundCoasterToolV2({ onResetCallback }: RoundCoasterToolV2Props) {
  // Main state
  const [state, setState] = useState<CoasterStateV2>(DEFAULTS_V2);
  
  // UI state
  const [stepSize, setStepSize] = useState<number>(1);
  const [showPresets, setShowPresets] = useState(true);
  
  // V3 PRO: Curved text state
  const [curvedTop, setCurvedTop] = useState<CurvedTextConfig>({ ...DEFAULT_CURVED_TEXT, position: 'top' });
  const [curvedBottom, setCurvedBottom] = useState<CurvedTextConfig>({ ...DEFAULT_CURVED_TEXT, position: 'bottom' });
  
  // V3 PRO: Batch export state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(DEFAULT_BATCH_CONFIG);
  const [batchTextarea, setBatchTextarea] = useState('');
  const [batchExporting, setBatchExporting] = useState(false);
  
  // V3 PRO: Presets storage
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; state: CoasterStateV2 }>>([]);
  const [presetName, setPresetName] = useState('');
  
  // Update partial state helper - type-safe nested update
  function updateState<K extends keyof CoasterStateV2>(
    key: K,
    value: Partial<CoasterStateV2[K]>
  ) {
    setState(prev => {
      const current = prev[key] as unknown as Record<string, unknown>;
      const updates = value as unknown as Record<string, unknown>;
      const merged = { ...current, ...updates } as unknown as CoasterStateV2[K];
      return { ...prev, [key]: merged };
    });
  }
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setState(DEFAULTS_V2);
  }, []);
  
  // Register reset callback
  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);
  
  // Apply preset
  const handleApplyPreset = useCallback((preset: PresetConfig) => {
    setState(prev => applyPreset(prev, preset));
  }, []);
  
  // Handle diameter preset selection
  const handleDiameterPreset = useCallback((diameter: number | 'custom') => {
    if (diameter === 'custom') return;
    updateState('dimensions', { diameter });
  }, [updateState]);
  
  // Build SVG
  const buildResult = useMemo(() => buildCoasterSvgV2(state), [state]);
  
  // Zoom controls
  const handleZoomIn = useCallback(() => {
    updateState('preview', { zoom: clamp(state.preview.zoom + 0.25, LIMITS.zoom.min, LIMITS.zoom.max) });
  }, [state.preview.zoom, updateState]);
  
  const handleZoomOut = useCallback(() => {
    updateState('preview', { zoom: clamp(state.preview.zoom - 0.25, LIMITS.zoom.min, LIMITS.zoom.max) });
  }, [state.preview.zoom, updateState]);
  
  const handleZoomFit = useCallback(() => {
    updateState('preview', { zoom: 1 });
  }, [updateState]);
  
  // Export
  const handleExport = useCallback(() => {
    const filename = generateFilename(state);
    downloadSvg(buildResult.svg, filename);
  }, [state, buildResult.svg]);
  
  // V3 PRO: Batch export handler
  const handleBatchExport = useCallback(async () => {
    setBatchExporting(true);
    try {
      const textList = parseTextList(batchTextarea);
      const config: BatchConfig = { ...batchConfig, textList };
      const items = generateBatchItems(state, config);
      const builtItems = buildBatchSvgs(state, items);
      await exportBatch(builtItems, `coasters-batch-${Date.now()}.zip`, false);
      setShowBatchModal(false);
    } catch (e) {
      console.error('Batch export failed:', e);
    } finally {
      setBatchExporting(false);
    }
  }, [state, batchConfig, batchTextarea]);
  
  // V3 PRO: Load saved presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lfs_coaster_presets_v2');
      if (saved) {
        setSavedPresets(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }, []);
  
  // V3 PRO: Save preset
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const newPresets = [...savedPresets, { name: presetName.trim(), state }];
    setSavedPresets(newPresets);
    localStorage.setItem('lfs_coaster_presets_v2', JSON.stringify(newPresets));
    setPresetName('');
  }, [presetName, state, savedPresets]);
  
  // V3 PRO: Load preset
  const handleLoadPreset = useCallback((preset: { name: string; state: CoasterStateV2 }) => {
    setState(preset.state);
  }, []);
  
  // V3 PRO: Delete preset
  const handleDeletePreset = useCallback((index: number) => {
    const newPresets = savedPresets.filter((_, i) => i !== index);
    setSavedPresets(newPresets);
    localStorage.setItem('lfs_coaster_presets_v2', JSON.stringify(newPresets));
  }, [savedPresets]);
  
  return (
    <div className="lfs-tool flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">
              Round Coaster & Badge Generator
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-sky-600 rounded">V2</span>
            </h1>
            <p className="text-[11px] text-slate-400">Create laser-ready coasters and badges with CUT/ENGRAVE layers</p>
          </div>
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-md hover:bg-slate-800"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        {/* Controls Panel */}
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto space-y-3 pr-1">
            
            {/* Warnings */}
            {buildResult.warnings.length > 0 && (
              <WarningsDisplay warnings={buildResult.warnings} />
            )}
            
            {/* Quick Presets */}
            <Section title="Quick Presets" defaultOpen={showPresets}>
              <div className="flex flex-wrap gap-2">
                {PRESETS_V2.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1.5 text-[11px] border border-slate-700 bg-slate-900 rounded hover:bg-slate-800 hover:border-slate-600"
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </Section>
            
            {/* Shape */}
            <Section title="Shape">
              <select
                value={state.shape}
                onChange={(e) => setState(prev => ({ ...prev, shape: e.target.value as ShapeType }))}
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
              >
                <option value="circle">Circle</option>
                <option value="hex">Hexagon</option>
                <option value="octagon">Octagon</option>
                <option value="scalloped">Scalloped Circle</option>
              </select>
            </Section>
            
            {/* Dimensions */}
            <Section title="Dimensions">
              {/* Step size selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] text-slate-500">Step:</span>
                {STEP_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStepSize(s)}
                    className={`px-2 py-0.5 text-[10px] rounded ${stepSize === s ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {s}mm
                  </button>
                ))}
              </div>
              
              {/* Preset diameters */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_DIAMETERS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDiameterPreset(d)}
                    className={`px-2 py-1 text-[11px] rounded ${state.dimensions.diameter === d ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {d}mm
                  </button>
                ))}
                <button
                  type="button"
                  className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-400"
                >
                  Custom
                </button>
              </div>

              <NumberInput
                label="Diameter"
                value={state.dimensions.diameter}
                onChange={(v) => updateState('dimensions', { diameter: v })}
                min={LIMITS.diameter.min}
                max={LIMITS.diameter.max}
                step={stepSize}
              />
            </Section>
            
            {/* Border */}
            <Section title="Border">
              <Checkbox
                label="Enable border"
                checked={state.border.enabled}
                onChange={(v) => updateState('border', { enabled: v })}
              />
              
              {state.border.enabled && (
                <div className="space-y-3 mt-2">
                  <NumberInput
                    label="Border inset"
                    value={state.border.inset}
                    onChange={(v) => updateState('border', { inset: v })}
                    min={LIMITS.borderInset.min}
                    max={LIMITS.borderInset.max}
                    step={0.5}
                  />
                  
                  <NumberInput
                    label="Stroke thickness"
                    value={state.border.thickness}
                    onChange={(v) => updateState('border', { thickness: v })}
                    min={LIMITS.borderThickness.min}
                    max={LIMITS.borderThickness.max}
                    step={0.1}
                  />
                  
                  <Checkbox
                    label="Double border"
                    checked={state.border.doubleBorder}
                    onChange={(v) => updateState('border', { doubleBorder: v })}
                  />
                  
                  {state.border.doubleBorder && (
                    <NumberInput
                      label="Double border gap"
                      value={state.border.doubleBorderGap}
                      onChange={(v) => updateState('border', { doubleBorderGap: v })}
                      min={LIMITS.doubleBorderGap.min}
                      max={LIMITS.doubleBorderGap.max}
                      step={0.1}
                    />
                  )}
                </div>
              )}
            </Section>
            
            {/* Text */}
            <Section title="Text">
              <div className="space-y-3">
                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Top text (optional)</div>
                  <input
                    type="text"
                    value={state.text.top}
                    onChange={(e) => updateState('text', { top: e.target.value })}
                    placeholder="Top line"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>
                
                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Center text</div>
                  <input
                    type="text"
                    value={state.text.center}
                    onChange={(e) => updateState('text', { center: e.target.value })}
                    placeholder="Main text"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>
                
                <label className="grid gap-1">
                  <div className="text-[11px] text-slate-400">Bottom text (optional)</div>
                  <input
                    type="text"
                    value={state.text.bottom}
                    onChange={(e) => updateState('text', { bottom: e.target.value })}
                    placeholder="Bottom line"
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                </label>
                
                <div className="flex gap-4">
                  <Checkbox
                    label="UPPERCASE"
                    checked={state.text.uppercase}
                    onChange={(v) => updateState('text', { uppercase: v })}
                  />
                  <Checkbox
                    label="Auto-fit text"
                    checked={state.textFit.autoFit}
                    onChange={(v) => updateState('textFit', { autoFit: v })}
                  />
                </div>
                
                {!state.textFit.autoFit && (
                  <NumberInput
                    label="Manual font size"
                    value={state.textFit.manualFontSize}
                    onChange={(v) => updateState('textFit', { manualFontSize: v })}
                    min={LIMITS.fontSize.min}
                    max={LIMITS.fontSize.max}
                    step={1}
                    unit="pt"
                  />
                )}
                
                <NumberInput
                  label="Letter spacing"
                  value={state.textFit.letterSpacing}
                  onChange={(v) => updateState('textFit', { letterSpacing: v })}
                  min={LIMITS.letterSpacing.min}
                  max={LIMITS.letterSpacing.max}
                  step={0.5}
                  unit="px"
                />
              </div>
            </Section>
            
            {/* Safe Area */}
            <Section title="Safe Area" defaultOpen={false}>
              <NumberInput
                label="Safe margin"
                value={state.safeArea.padding}
                onChange={(v) => updateState('safeArea', { padding: v })}
                min={LIMITS.safeMargin.min}
                max={LIMITS.safeMargin.max}
                step={1}
              />
              <Checkbox
                label="Show safe area guide"
                checked={state.safeArea.showGuide}
                onChange={(v) => {
                  updateState('safeArea', { showGuide: v });
                  updateState('preview', { showSafeArea: v });
                }}
              />
            </Section>
            
            {/* Export Options */}
            <Section title="Export" defaultOpen={false}>
              <div className="space-y-2">
                <Checkbox
                  label="Include dimensions in filename"
                  checked={state.export.includeDimensions}
                  onChange={(v) => updateState('export', { includeDimensions: v })}
                />
                <Checkbox
                  label="Include timestamp"
                  checked={state.export.includeTimestamp}
                  onChange={(v) => updateState('export', { includeTimestamp: v })}
                />
                <Checkbox
                  label="Include metadata"
                  checked={state.export.includeMetadata}
                  onChange={(v) => updateState('export', { includeMetadata: v })}
                />
                <Checkbox
                  label="Group by layers (CUT/ENGRAVE)"
                  checked={state.export.layerGrouping}
                  onChange={(v) => updateState('export', { layerGrouping: v })}
                />
              </div>
            </Section>
            
            {/* V3 PRO: Curved Text */}
            <Section title="Curved Text (PRO)" defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-purple-900/30 border border-purple-700 rounded text-xs text-purple-300">
                  <Sparkles className="w-3 h-3" />
                  <span>PRO Feature - Text on arc path</span>
                </div>
                
                <Checkbox
                  label="Enable curved top text"
                  checked={curvedTop.enabled}
                  onChange={(v) => setCurvedTop(prev => ({ ...prev, enabled: v }))}
                />
                
                {curvedTop.enabled && (
                  <div className="space-y-2 pl-4 border-l border-slate-700">
                    <NumberInput
                      label="Arc span (degrees)"
                      value={Math.abs(curvedTop.endAngle - curvedTop.startAngle)}
                      onChange={(v) => setCurvedTop(prev => ({ ...prev, startAngle: -v/2, endAngle: v/2 }))}
                      min={30}
                      max={180}
                      step={10}
                      unit="°"
                    />
                    <NumberInput
                      label="Letter spacing"
                      value={curvedTop.letterSpacing}
                      onChange={(v) => setCurvedTop(prev => ({ ...prev, letterSpacing: v }))}
                      min={0}
                      max={10}
                      step={1}
                      unit="px"
                    />
                  </div>
                )}
                
                <Checkbox
                  label="Enable curved bottom text"
                  checked={curvedBottom.enabled}
                  onChange={(v) => setCurvedBottom(prev => ({ ...prev, enabled: v }))}
                />
                
                {curvedBottom.enabled && (
                  <div className="space-y-2 pl-4 border-l border-slate-700">
                    <Checkbox
                      label="Flip text (readable from outside)"
                      checked={curvedBottom.flipBottom}
                      onChange={(v) => setCurvedBottom(prev => ({ ...prev, flipBottom: v }))}
                    />
                    <NumberInput
                      label="Arc span (degrees)"
                      value={Math.abs(curvedBottom.endAngle - curvedBottom.startAngle)}
                      onChange={(v) => setCurvedBottom(prev => ({ ...prev, startAngle: -v/2, endAngle: v/2 }))}
                      min={30}
                      max={180}
                      step={10}
                      unit="°"
                    />
                  </div>
                )}
              </div>
            </Section>
            
            {/* V3 PRO: Saved Presets */}
            <Section title="My Presets" defaultOpen={false}>
              <div className="space-y-3">
                {/* Save new preset */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="flex-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim()}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
                
                {/* Saved presets list */}
                {savedPresets.length > 0 ? (
                  <div className="space-y-1">
                    {savedPresets.map((preset, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-900 rounded">
                        <button
                          type="button"
                          onClick={() => handleLoadPreset(preset)}
                          className="flex-1 text-left text-xs text-slate-300 hover:text-white"
                        >
                          <FolderOpen className="w-3 h-3 inline mr-1" />
                          {preset.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(i)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No saved presets yet</p>
                )}
              </div>
            </Section>
            
            {/* Export Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Export SVG
              </button>
              
              <button
                type="button"
                onClick={() => setShowBatchModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <FileStack className="w-4 h-4" /> Batch Export (PRO)
              </button>
            </div>
          </div>
        </section>

        {/* Preview Panel */}
        <section className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40">
            {/* Preview toolbar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
              <div className="text-sm font-medium text-slate-100">Preview</div>
              
              <div className="flex items-center gap-2">
                {/* Layer colors toggle */}
                <button
                  type="button"
                  onClick={() => updateState('preview', { layerColors: !state.preview.layerColors })}
                  className={`p-1.5 rounded ${state.preview.layerColors ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  title="Toggle layer colors"
                >
                  <Layers className="w-4 h-4" />
                </button>
                
                {/* Safe area toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const newShow = !state.preview.showSafeArea;
                    updateState('preview', { showSafeArea: newShow });
                    updateState('safeArea', { showGuide: newShow });
                  }}
                  className={`p-1.5 rounded ${state.preview.showSafeArea ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  title="Toggle safe area"
                >
                  {state.preview.showSafeArea ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                
                <div className="h-4 w-px bg-slate-700" />
                
                {/* Zoom controls */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={state.preview.zoom <= LIMITS.zoom.min}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                
                <span className="text-xs text-slate-400 w-12 text-center">
                  {Math.round(state.preview.zoom * 100)}%
                </span>
                
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={state.preview.zoom >= LIMITS.zoom.max}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 disabled:opacity-50"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  onClick={handleZoomFit}
                  className="p-1.5 bg-slate-800 rounded hover:bg-slate-700"
                  title="Fit to view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Preview content */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-8 bg-white">
              <div 
                style={{ transform: `scale(${state.preview.zoom})` }}
                className="transition-transform"
                dangerouslySetInnerHTML={{ __html: buildResult.svg }} 
              />
            </div>
            
            {/* Info bar */}
            <div className="border-t border-slate-800 px-3 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                {buildResult.meta.shape} • {buildResult.meta.width}×{buildResult.meta.height}mm
              </span>
              <span>
                Layers: {buildResult.layers.map(l => l.id).join(', ')}
              </span>
            </div>
          </div>
        </section>
      </main>
      
      {/* V3 PRO: Batch Export Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileStack className="w-4 h-4" /> Batch Export
              </h2>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 p-2 bg-purple-900/30 border border-purple-700 rounded text-xs text-purple-300">
                <Sparkles className="w-3 h-3" />
                <span>PRO Feature - Generate multiple SVGs at once</span>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Names (one per line)
                </label>
                <textarea
                  value={batchTextarea}
                  onChange={(e) => setBatchTextarea(e.target.value)}
                  placeholder="Enter names, one per line...&#10;John&#10;Jane&#10;Bob"
                  rows={6}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {parseTextList(batchTextarea).length} items • Est. time: {estimateBatchTime(parseTextList(batchTextarea).length)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Checkbox
                  label="Auto-increment (001, 002...)"
                  checked={batchConfig.autoIncrement}
                  onChange={(v) => setBatchConfig(prev => ({ ...prev, autoIncrement: v }))}
                />
              </div>
              
              {batchConfig.autoIncrement && (
                <div className="grid grid-cols-3 gap-3">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400">Prefix</span>
                    <input
                      type="text"
                      value={batchConfig.prefixText}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, prefixText: e.target.value }))}
                      placeholder="Badge-"
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400">Start #</span>
                    <input
                      type="number"
                      value={batchConfig.incrementStart}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, incrementStart: Number(e.target.value) }))}
                      min={1}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-slate-400">Padding</span>
                    <select
                      value={batchConfig.incrementPadding}
                      onChange={(e) => setBatchConfig(prev => ({ ...prev, incrementPadding: Number(e.target.value) }))}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                    >
                      <option value={1}>1 (1, 2, 3)</option>
                      <option value={2}>2 (01, 02)</option>
                      <option value={3}>3 (001, 002)</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchExport}
                disabled={batchExporting || (parseTextList(batchTextarea).length === 0 && !batchConfig.autoIncrement)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs font-medium flex items-center gap-2"
              >
                {batchExporting ? (
                  <>Exporting...</>
                ) : (
                  <><Download className="w-3 h-3" /> Export All</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
