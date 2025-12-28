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
  Grid,
  Layers,
} from 'lucide-react';

import type { KeychainModeId, SimpleKeychainState, EmojiNameState, StickerBubbleState, PreviewConfig, IconDef, Warning } from '../types';
import { getMode, getModeDefaults, SIMPLE_DEFAULTS, EMOJI_NAME_DEFAULTS, STICKER_BUBBLE_DEFAULTS } from '../modes';
import { downloadSvg } from '../core/export';
import { isExportDisabled } from '../core/warnings';
import { ModeSelector } from './ModeSelector';
import { IconPicker } from './IconPicker';
import { clamp } from '../core/geometry';

export default function KeychainTool() {
  // Mode state
  const [activeMode, setActiveMode] = useState<KeychainModeId>('simple');

  // Mode-specific states
  const [simpleState, setSimpleState] = useState<SimpleKeychainState>(SIMPLE_DEFAULTS);
  const [emojiNameState, setEmojiNameState] = useState<EmojiNameState>(EMOJI_NAME_DEFAULTS);
  const [stickerBubbleState, setStickerBubbleState] = useState<StickerBubbleState>(STICKER_BUBBLE_DEFAULTS);

  // Preview config
  const [preview, setPreview] = useState<PreviewConfig>({
    showGrid: false,
    showSafeZones: false,
    showHoleGuide: false,
    showLayerColors: false,
  });

  // Uploaded icons
  const [uploadedIcons, setUploadedIcons] = useState<IconDef[]>([]);

  // Section expansion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mode: true,
    controls: true,
    preview: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get current mode and state
  const mode = useMemo(() => getMode(activeMode), [activeMode]);

  const currentState = useMemo(() => {
    switch (activeMode) {
      case 'simple': return simpleState;
      case 'emoji-name': return emojiNameState;
      case 'sticker-bubble': return stickerBubbleState;
      default: return simpleState;
    }
  }, [activeMode, simpleState, emojiNameState, stickerBubbleState]);

  const updateState = useCallback((updates: any) => {
    switch (activeMode) {
      case 'simple':
        setSimpleState(prev => mode.clamp({ ...prev, ...updates }));
        break;
      case 'emoji-name':
        setEmojiNameState(prev => mode.clamp({ ...prev, ...updates }));
        break;
      case 'sticker-bubble':
        setStickerBubbleState(prev => mode.clamp({ ...prev, ...updates }));
        break;
    }
  }, [activeMode, mode]);

  // Build result
  const buildResult = useMemo(() => mode.build(currentState), [mode, currentState]);
  const warnings = useMemo(() => mode.getWarnings(currentState), [mode, currentState]);
  const exportDisabled = useMemo(() => isExportDisabled(warnings), [warnings]);

  // Handlers
  const handleModeChange = useCallback((newMode: KeychainModeId) => {
    setActiveMode(newMode);
  }, []);

  const handleReset = useCallback(() => {
    switch (activeMode) {
      case 'simple':
        setSimpleState(SIMPLE_DEFAULTS);
        break;
      case 'emoji-name':
        setEmojiNameState(EMOJI_NAME_DEFAULTS);
        break;
      case 'sticker-bubble':
        setStickerBubbleState(STICKER_BUBBLE_DEFAULTS);
        break;
    }
  }, [activeMode]);

  const handleExport = useCallback((type: 'combined' | 'cut' | 'engrave') => {
    const filename = mode.getFilenameBase(currentState);
    const svg = type === 'cut' ? buildResult.svgCut : type === 'engrave' ? buildResult.svgEngrave : buildResult.svgCombined;
    downloadSvg(svg, `${filename}-${type}.svg`);
  }, [mode, currentState, buildResult]);

  const handleIconUpload = useCallback((icon: IconDef) => {
    setUploadedIcons(prev => [...prev, icon]);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* Controls Panel */}
      <div className="w-full lg:w-[420px] space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Mode Selector */}
        <Section title="Keychain Type" expanded={expandedSections.mode} onToggle={() => toggleSection('mode')}>
          <ModeSelector activeMode={activeMode} onModeChange={handleModeChange} />
        </Section>

        {/* Mode-specific Controls */}
        <Section title="Settings" expanded={expandedSections.controls} onToggle={() => toggleSection('controls')}>
          {activeMode === 'simple' && (
            <SimpleControls state={simpleState} onChange={updateState} />
          )}
          {activeMode === 'emoji-name' && (
            <EmojiNameControls
              state={emojiNameState}
              onChange={updateState}
              uploadedIcons={uploadedIcons}
              onIconUpload={handleIconUpload}
            />
          )}
          {activeMode === 'sticker-bubble' && (
            <StickerBubbleControls
              state={stickerBubbleState}
              onChange={updateState}
              uploadedIcons={uploadedIcons}
              onIconUpload={handleIconUpload}
            />
          )}
        </Section>

        {/* Preview Settings */}
        <Section title="Preview Options" expanded={expandedSections.preview} onToggle={() => toggleSection('preview')}>
          <div className="space-y-2">
            <Checkbox label="Show Grid" checked={preview.showGrid} onChange={v => setPreview(p => ({ ...p, showGrid: v }))} />
            <Checkbox label="Show Safe Zones" checked={preview.showSafeZones} onChange={v => setPreview(p => ({ ...p, showSafeZones: v }))} />
            <Checkbox label="Show Hole Guide" checked={preview.showHoleGuide} onChange={v => setPreview(p => ({ ...p, showHoleGuide: v }))} />
            <Checkbox label="Layer Colors (preview only)" checked={preview.showLayerColors} onChange={v => setPreview(p => ({ ...p, showLayerColors: v }))} />
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {buildResult.meta.width.toFixed(1)} × {buildResult.meta.height.toFixed(1)} mm
            </span>
            {buildResult.meta.layers > 1 && (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Layers className="w-3 h-3" /> {buildResult.meta.layers} layers
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('combined')}
              disabled={exportDisabled}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Combined
            </button>
            <button
              onClick={() => handleExport('cut')}
              disabled={exportDisabled}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Cut
            </button>
            <button
              onClick={() => handleExport('engrave')}
              disabled={exportDisabled}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
            >
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
              {warnings.map(w => (
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
          <div
            className="bg-white rounded shadow-lg p-4"
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
            dangerouslySetInnerHTML={{ __html: buildResult.svgCombined }}
          />
        </div>
      </div>
    </div>
  );
}

// ============ Mode Control Components ============

function SimpleControls({ state, onChange }: { state: SimpleKeychainState; onChange: (u: Partial<SimpleKeychainState>) => void }) {
  return (
    <div className="space-y-4">
      {/* Shape */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Shape</label>
        <select value={state.shape} onChange={e => onChange({ shape: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
          <option value="rounded-rectangle">Rounded Rectangle</option>
          <option value="capsule">Capsule</option>
          <option value="circle">Circle</option>
          <option value="hexagon">Hexagon</option>
          <option value="dog-tag">Dog Tag</option>
        </select>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Width (mm)" value={state.width} onChange={v => onChange({ width: v })} min={15} max={300} />
        <NumberInput label="Height (mm)" value={state.height} onChange={v => onChange({ height: v })} min={15} max={300} />
      </div>

      {state.shape === 'rounded-rectangle' && (
        <NumberInput label="Corner Radius" value={state.cornerRadius} onChange={v => onChange({ cornerRadius: v })} min={0} max={30} />
      )}

      {/* Text */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Text</label>
        <input type="text" value={state.text} onChange={e => onChange({ text: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
      </div>

      {/* Text Mode */}
      <div className="flex gap-2">
        <button onClick={() => onChange({ textMode: 'single' })} className={`px-3 py-1.5 text-xs rounded ${state.textMode === 'single' ? 'bg-blue-600' : 'bg-slate-700'}`}>Single Line</button>
        <button onClick={() => onChange({ textMode: 'double' })} className={`px-3 py-1.5 text-xs rounded ${state.textMode === 'double' ? 'bg-blue-600' : 'bg-slate-700'}`}>Two Lines</button>
      </div>

      {state.textMode === 'double' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Line 2</label>
          <input type="text" value={state.text2} onChange={e => onChange({ text2: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
        </div>
      )}

      {/* Hole */}
      <Checkbox label="Enable Hole" checked={state.hole.enabled} onChange={v => onChange({ hole: { ...state.hole, enabled: v } })} />

      {state.hole.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Hole Diameter" value={state.hole.diameter} onChange={v => onChange({ hole: { ...state.hole, diameter: v } })} min={2} max={15} />
          <NumberInput label="Hole Margin" value={state.hole.margin} onChange={v => onChange({ hole: { ...state.hole, margin: v } })} min={0} max={20} />
        </div>
      )}
    </div>
  );
}

function EmojiNameControls({ state, onChange, uploadedIcons, onIconUpload }: { state: EmojiNameState; onChange: (u: Partial<EmojiNameState>) => void; uploadedIcons: IconDef[]; onIconUpload: (i: IconDef) => void }) {
  // Default values for legacy optional fields
  const height = state.height ?? 35;
  const outlineThickness = state.outlineThickness ?? 3;
  const borderThickness = state.borderThickness ?? 2;
  const hole = state.hole ?? { enabled: true, diameter: 5, margin: 3.5, position: 'left' as const };
  
  return (
    <div className="space-y-4">
      {/* Height control */}
      <NumberInput label="Height (mm)" value={height} onChange={v => onChange({ height: v })} min={15} max={100} />

      {/* Name */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Name</label>
        <input type="text" value={state.name} onChange={e => onChange({ name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
      </div>

      {/* Icon */}
      <IconPicker
        selectedId={state.iconId}
        onSelect={id => onChange({ iconId: id })}
        uploadedIcons={uploadedIcons}
        onUpload={onIconUpload}
      />

      {/* Icon size */}
      <NumberInput label="Icon Size (%)" value={state.iconSizePct * 100} onChange={v => onChange({ iconSizePct: v / 100 })} min={30} max={150} />

      {/* Gap */}
      <NumberInput label="Gap (mm)" value={state.gap} onChange={v => onChange({ gap: v })} min={0} max={30} />

      {/* Outline */}
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Outline Thickness" value={outlineThickness} onChange={v => onChange({ outlineThickness: v })} min={1} max={10} />
        <NumberInput label="Border Thickness" value={borderThickness} onChange={v => onChange({ borderThickness: v })} min={0} max={10} />
      </div>

      {/* Hole */}
      <Checkbox label="Enable Hole" checked={hole.enabled} onChange={v => onChange({ hole: { ...hole, enabled: v } })} />

      {hole.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Hole Diameter" value={hole.diameter} onChange={v => onChange({ hole: { ...hole, diameter: v } })} min={2} max={15} />
          <NumberInput label="Hole Margin" value={hole.margin} onChange={v => onChange({ hole: { ...hole, margin: v } })} min={0} max={20} />
        </div>
      )}

      {/* Render mode */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Layers</label>
        <select value={state.render} onChange={e => onChange({ render: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
          <option value="1-layer">1 Layer</option>
          <option value="2-layer">2 Layers</option>
        </select>
      </div>
    </div>
  );
}

function StickerBubbleControls({ state, onChange, uploadedIcons, onIconUpload }: { state: StickerBubbleState; onChange: (u: Partial<StickerBubbleState>) => void; uploadedIcons: IconDef[]; onIconUpload: (i: IconDef) => void }) {
  return (
    <div className="space-y-4">
      {/* Height control */}
      <NumberInput label="Height (mm)" value={state.height} onChange={v => onChange({ height: v })} min={20} max={120} />

      {/* Text */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Text Line 1</label>
        <input type="text" value={state.text} onChange={e => onChange({ text: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Text Line 2 (optional)</label>
        <input type="text" value={state.text2} onChange={e => onChange({ text2: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" />
      </div>

      {/* Icon */}
      <IconPicker
        selectedId={state.iconId}
        onSelect={id => onChange({ iconId: id })}
        uploadedIcons={uploadedIcons}
        onUpload={onIconUpload}
      />

      {state.iconId && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Icon Position</label>
          <select value={state.iconPosition} onChange={e => onChange({ iconPosition: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
            <option value="left">Left</option>
            <option value="top">Top</option>
            <option value="none">None</option>
          </select>
        </div>
      )}

      {/* Bubble settings */}
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Bubble Padding" value={state.bubblePadding} onChange={v => onChange({ bubblePadding: v })} min={2} max={30} />
        <NumberInput label="Bubble Corner R" value={state.bubbleCornerRadius} onChange={v => onChange({ bubbleCornerRadius: v })} min={2} max={50} />
      </div>

      <NumberInput label="Bubble Thickness" value={state.bubbleThickness} onChange={v => onChange({ bubbleThickness: v })} min={1} max={15} />

      {/* Hole */}
      <Checkbox label="Enable Hole" checked={state.hole.enabled} onChange={v => onChange({ hole: { ...state.hole, enabled: v } })} />

      {state.hole.enabled && (
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Hole Diameter" value={state.hole.diameter} onChange={v => onChange({ hole: { ...state.hole, diameter: v } })} min={2} max={15} />
          <NumberInput label="Hole Margin" value={state.hole.margin} onChange={v => onChange({ hole: { ...state.hole, margin: v } })} min={0} max={20} />
        </div>
      )}

      {/* Render mode */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Layers</label>
        <select value={state.render} onChange={e => onChange({ render: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
          <option value="1-layer">1 Layer</option>
          <option value="2-layer">2 Layers</option>
        </select>
      </div>
    </div>
  );
}

// ============ Helper Components ============

function Section({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-left">
        <span className="text-sm font-medium text-slate-200">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(clamp(parseFloat(e.target.value) || min, min, max))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm"
      />
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded" />
      <span className="text-xs text-slate-300">{label}</span>
    </div>
  );
}
