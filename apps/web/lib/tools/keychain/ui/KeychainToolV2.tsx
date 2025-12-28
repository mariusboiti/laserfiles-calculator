'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import type { KeychainModeId, SimpleKeychainState, EmojiNameState, StickerBubbleState, PreviewConfig, IconDef, Warning, BuildResult } from '../types';
import { SIMPLE_V2_DEFAULTS, simpleModeV2 } from '../modes/simpleV2';
import { EMOJI_NAME_V2_DEFAULTS, emojiNameModeV2 } from '../modes/emojiNameV2';
import { STICKER_BUBBLE_DEFAULTS } from '../modes/stickerBubble';
import { downloadSvg } from '../core/export';
import { isExportDisabled } from '../core/warnings';
import { preloadAllFonts, getAvailableFonts } from '../core/fontRegistry';
import { ModeSelector } from './ModeSelector';
import { IconPickerV2 } from './IconPickerV2';
import { clamp } from '../core/geometry';

// Default empty build result
const EMPTY_BUILD: BuildResult = {
  svgCombined: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"></svg>',
  svgCut: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"></svg>',
  svgEngrave: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"></svg>',
  meta: { width: 100, height: 50, layers: 1 },
};

export default function KeychainToolV2() {
  // Mode state
  const [activeMode, setActiveMode] = useState<KeychainModeId>('simple');

  // Mode-specific states
  const [simpleState, setSimpleState] = useState<SimpleKeychainState>(SIMPLE_V2_DEFAULTS);
  const [emojiNameState, setEmojiNameState] = useState<EmojiNameState>(EMOJI_NAME_V2_DEFAULTS);
  const [stickerBubbleState, setStickerBubbleState] = useState<StickerBubbleState>(STICKER_BUBBLE_DEFAULTS);

  // Build state
  const [buildResult, setBuildResult] = useState<BuildResult>(EMPTY_BUILD);
  const [isBuilding, setIsBuilding] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Preview config
  const [preview, setPreview] = useState<PreviewConfig>({
    showGrid: false,
    showSafeZones: false,
    showHoleGuide: false,
    showLayerColors: false,
  });
  const [zoom, setZoom] = useState(1);

  // Section expansion
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mode: true,
    controls: true,
    preview: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Skip font loading - use system fonts
  useEffect(() => {
    setFontsLoaded(true);
  }, []);

  // Get current mode and state
  const currentState = useMemo(() => {
    switch (activeMode) {
      case 'simple': return simpleState;
      case 'emoji-name': return emojiNameState;
      case 'sticker-bubble': return stickerBubbleState;
      default: return simpleState;
    }
  }, [activeMode, simpleState, emojiNameState, stickerBubbleState]);

  const currentMode = useMemo(() => {
    switch (activeMode) {
      case 'simple': return simpleModeV2;
      case 'emoji-name': return emojiNameModeV2;
      default: return simpleModeV2;
    }
  }, [activeMode]);

  const updateState = useCallback((updates: any) => {
    switch (activeMode) {
      case 'simple':
        setSimpleState(prev => simpleModeV2.clamp({ ...prev, ...updates }));
        break;
      case 'emoji-name':
        setEmojiNameState(prev => emojiNameModeV2.clamp({ ...prev, ...updates }));
        break;
      case 'sticker-bubble':
        setStickerBubbleState(prev => ({ ...prev, ...updates }));
        break;
    }
  }, [activeMode]);

  // Build SVG (async)
  useEffect(() => {
    if (!fontsLoaded) return;

    let cancelled = false;
    setIsBuilding(true);

    const doBuild = async () => {
      try {
        // Use type assertion since we know mode and state match (build may be sync or async)
        const result = await Promise.resolve((currentMode.build as unknown as (s: any) => BuildResult | Promise<BuildResult>)(currentState));
        if (!cancelled) {
          setBuildResult(result);
        }
      } catch (err) {
        console.error('Build failed:', err);
        // Create fallback SVG on error with visible outline
        if (!cancelled) {
          const w = (currentState as any).width || (currentState as any).maxWidth || 120;
          const h = (currentState as any).height || 35;
          const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
            <g id="CUT" fill="none" stroke="#000" stroke-width="0.5">
              <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="5"/>
            </g>
            <g id="ENGRAVE">
              <text x="${w / 2}" y="${h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="8" fill="#000">Build Error - Check Console</text>
            </g>
          </svg>`;
          setBuildResult({
            svgCombined: fallbackSvg,
            svgCut: fallbackSvg,
            svgEngrave: fallbackSvg,
            meta: { width: w, height: h, layers: 1 }
          });
        }
      } finally {
        if (!cancelled) {
          setIsBuilding(false);
        }
      }
    };

    // Debounce build
    const timer = setTimeout(doBuild, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentState, currentMode, fontsLoaded]);

  // Warnings
  const warnings = useMemo(() => (currentMode.getWarnings as (s: any) => Warning[])(currentState), [currentMode, currentState]);
  const exportDisabled = useMemo(() => isExportDisabled(warnings), [warnings]);

  // Handlers
  const handleModeChange = useCallback((newMode: KeychainModeId) => {
    setActiveMode(newMode);
  }, []);

  const handleReset = useCallback(() => {
    switch (activeMode) {
      case 'simple':
        setSimpleState(SIMPLE_V2_DEFAULTS);
        break;
      case 'emoji-name':
        setEmojiNameState(EMOJI_NAME_V2_DEFAULTS);
        break;
      case 'sticker-bubble':
        setStickerBubbleState(STICKER_BUBBLE_DEFAULTS);
        break;
    }
  }, [activeMode]);

  const handleExport = useCallback((type: 'combined' | 'cut' | 'engrave') => {
    const filename = (currentMode.getFilenameBase as (s: any) => string)(currentState);
    const svg = type === 'cut' ? buildResult.svgCut : type === 'engrave' ? buildResult.svgEngrave : buildResult.svgCombined;
    downloadSvg(svg, `${filename}-${type}.svg`);
  }, [currentMode, currentState, buildResult]);


  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      {/* Controls Panel */}
      <div className="w-full lg:w-[420px] space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Font loading indicator */}
        {!fontsLoaded && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            <span className="text-sm text-blue-300">Loading fonts...</span>
          </div>
        )}

        {/* Mode Selector */}
        <Section title="Keychain Type" expanded={expandedSections.mode} onToggle={() => toggleSection('mode')}>
          <ModeSelector activeMode={activeMode} onModeChange={handleModeChange} />
        </Section>

        {/* Mode-specific Controls */}
        <Section title="Settings" expanded={expandedSections.controls} onToggle={() => toggleSection('controls')}>
          {activeMode === 'simple' && (
            <SimpleControlsV2 state={simpleState} onChange={updateState} />
          )}
          {activeMode === 'emoji-name' && (
            <EmojiNameControlsV2
              state={emojiNameState}
              onChange={updateState}
            />
          )}
        </Section>

        {/* Preview Settings */}
        <Section title="Preview Options" expanded={expandedSections.preview} onToggle={() => toggleSection('preview')}>
          <div className="space-y-2">
            <Checkbox 
              label="Show Base (Cut Layer)" 
              checked={currentState.showBase ?? true} 
              onChange={v => updateState({ showBase: v })} 
            />
            <Checkbox 
              label="Show Top (Engrave Layer)" 
              checked={currentState.showTop ?? true} 
              onChange={v => updateState({ showTop: v })} 
            />
            <div className="h-px bg-slate-700 my-2" />
            <Checkbox 
              label="Show Grid" 
              checked={preview.showGrid} 
              onChange={v => setPreview(p => ({ ...p, showGrid: v }))} 
            />
            <Checkbox 
              label="Show Safe Zones" 
              checked={preview.showSafeZones} 
              onChange={v => setPreview(p => ({ ...p, showSafeZones: v }))} 
            />
          </div>
        </Section>

        {/* Reset */}
        <button onClick={handleReset} className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Reset to Defaults
        </button>

        {/* PRO Badge */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-700/50 rounded-lg p-3 text-center">
          <span className="text-xs text-purple-300 font-medium">✨ PRO: Text exported as real paths (no &lt;text&gt; elements)</span>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 min-w-0 space-y-3 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 bg-slate-800 rounded-lg px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            {isBuilding && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
            <span className="text-xs text-slate-400">
              {(buildResult.meta.width || 0).toFixed(1)} × {(buildResult.meta.height || 0).toFixed(1)} mm
            </span>
            {buildResult.meta.layers > 1 && (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Layers className="w-3 h-3" /> {buildResult.meta.layers} layers
              </span>
            )}
            
            {/* Zoom Slider */}
            <div className="h-4 w-px bg-slate-600" />
            <div className="flex items-center gap-2">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="25"
                max="300"
                step="10"
                value={zoom * 100}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
                className="w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoom * 100 - 25) / 275) * 100}%, #334155 ${((zoom * 100 - 25) / 275) * 100}%, #334155 100%)`
                }}
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('combined')}
              disabled={exportDisabled || isBuilding}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Combined
            </button>
            <button
              onClick={() => handleExport('cut')}
              disabled={exportDisabled || isBuilding}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Cut
            </button>
            <button
              onClick={() => handleExport('engrave')}
              disabled={exportDisabled || isBuilding}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded text-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Engrave
            </button>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex-shrink-0">
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

        {/* SVG Preview - Canvas with zoom */}
        <div className="flex-1 bg-slate-900 rounded-lg border border-slate-700 overflow-auto flex items-center justify-center p-4" style={{ minHeight: '400px' }}>
          {isBuilding ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Building preview...</span>
            </div>
          ) : (
            <div
              className="bg-white rounded shadow-lg p-6 transition-transform"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                width: 'fit-content',
                height: 'fit-content',
              }}
            >
              <div
                dangerouslySetInnerHTML={{ 
                  __html: buildResult.svgCombined
                    .replace(/width="[^"]*"/, `width="${(buildResult.meta.width || 70) * 3}px"`)
                    .replace(/height="[^"]*"/, `height="${(buildResult.meta.height || 25) * 3}px"`)
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Mode Control Components ============

function SimpleControlsV2({ state, onChange }: { state: SimpleKeychainState; onChange: (u: Partial<SimpleKeychainState>) => void }) {
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

      {/* Font */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Font Style</label>
        <select value={state.fontFamily} onChange={e => onChange({ fontFamily: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm max-h-60 overflow-y-auto">
          {getAvailableFonts().map(font => (
            <option key={font.id} value={font.id}>{font.label}</option>
          ))}
        </select>
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

function EmojiNameControlsV2({ state, onChange }: { state: EmojiNameState; onChange: (u: Partial<EmojiNameState>) => void }) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Name</label>
        <input type="text" value={state.name} onChange={e => onChange({ name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm" placeholder="Enter name..." />
      </div>

      {/* Font */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Font Style</label>
        <select value={state.fontFamily} onChange={e => onChange({ fontFamily: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm max-h-60 overflow-y-auto">
          {getAvailableFonts().map(font => (
            <option key={font.id} value={font.id}>{font.label}</option>
          ))}
        </select>
      </div>

      {/* Text Height */}
      <NumberInput label="Text Height (mm)" value={state.textHeightMm} onChange={v => onChange({ textHeightMm: v })} min={5} max={50} />

      {/* Icon - with AI generation */}
      <IconPickerV2
        selectedId={state.iconId}
        onSelect={id => onChange({ iconId: id })}
      />

      {/* Icon size & Gap */}
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Icon Size (%)" value={state.iconSizePct * 100} onChange={v => onChange({ iconSizePct: v / 100 })} min={30} max={150} />
        <NumberInput label="Gap (mm)" value={state.gap} onChange={v => onChange({ gap: v })} min={0} max={20} />
      </div>

      {/* Sticker Outline Settings */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <label className="block text-xs text-slate-300 font-medium mb-2">Sticker Outline</label>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Offset (mm)" value={state.stickerOffsetMm} onChange={v => onChange({ stickerOffsetMm: v })} min={1} max={8} step={0.5} />
          <NumberInput label="Smooth (mm)" value={state.stickerSmoothMm} onChange={v => onChange({ stickerSmoothMm: v })} min={0.1} max={2} step={0.1} />
        </div>
      </div>

      {/* Keyring Loop (Veriga) */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <Checkbox label="Enable Keyring Loop" checked={state.ring.enabled} onChange={v => onChange({ ring: { ...state.ring, enabled: v } })} />
        
        {state.ring.enabled && (
          <div className="space-y-2 mt-2">
            {/* Ring Position */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Ring Position</label>
              <select value={state.ring.position} onChange={e => onChange({ ring: { ...state.ring, position: e.target.value as any } })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
                <option value="left">Left</option>
                <option value="top">Top</option>
                <option value="right">Right</option>
              </select>
            </div>
            
            {/* Ring Diameters */}
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Outer Ø (mm)" value={state.ring.outerDiameter} onChange={v => onChange({ ring: { ...state.ring, outerDiameter: v } })} min={8} max={20} />
              <NumberInput label="Inner Ø (mm)" value={state.ring.innerDiameter} onChange={v => onChange({ ring: { ...state.ring, innerDiameter: v } })} min={4} max={12} />
            </div>
            
            {/* Bridge Settings */}
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Bridge Width" value={state.ring.bridgeWidth} onChange={v => onChange({ ring: { ...state.ring, bridgeWidth: v } })} min={3} max={12} />
              <NumberInput label="Bridge Thick" value={state.ring.bridgeThickness} onChange={v => onChange({ ring: { ...state.ring, bridgeThickness: v } })} min={2} max={8} />
            </div>
            
            {/* Offset from body */}
            <NumberInput label="Gap from Sticker (mm)" value={state.ring.gapFromSticker} onChange={v => onChange({ ring: { ...state.ring, gapFromSticker: v } })} min={0} max={5} step={0.5} />
          </div>
        )}
      </div>

      {/* Layer Visibility */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <label className="block text-xs text-slate-300 font-medium mb-2">Preview Layers</label>
        <div className="flex gap-4">
          <Checkbox label="Base" checked={state.showBase} onChange={v => onChange({ showBase: v })} />
          <Checkbox label="Top" checked={state.showTop} onChange={v => onChange({ showTop: v })} />
        </div>
      </div>

      {/* Render mode */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Output Mode</label>
        <select value={state.render} onChange={e => onChange({ render: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm">
          <option value="1-layer">1 Layer (engrave only)</option>
          <option value="2-layer">2 Layers (stacked acrylic)</option>
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
