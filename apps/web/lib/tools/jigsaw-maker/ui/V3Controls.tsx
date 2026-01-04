'use client';

import { useState } from 'react';
import type { 
  TrueNestingSettings, 
  PocketFrameSettings, 
  PhotoEngravingSettings,
  AIImageSettings,
  DifficultySettings,
  ProductKitSettings,
  V3FeatureFlags 
} from '../types/jigsawV3';
import { V3_DEFAULTS, DPI_PRESETS, AI_STYLE_DESCRIPTIONS, NESTING_STRATEGY_DESCRIPTIONS } from '../types/jigsawV3';

interface V3ControlsProps {
  v3Features: V3FeatureFlags;
  setV3Features: (features: V3FeatureFlags) => void;
  difficulty: DifficultySettings;
  setDifficulty: (settings: DifficultySettings) => void;
  trueNesting: TrueNestingSettings;
  setTrueNesting: (settings: TrueNestingSettings) => void;
  pocketFrame: PocketFrameSettings;
  setPocketFrame: (settings: PocketFrameSettings) => void;
  photoEngraving: PhotoEngravingSettings;
  setPhotoEngraving: (settings: PhotoEngravingSettings) => void;
  aiImage: AIImageSettings;
  setAIImage: (settings: AIImageSettings) => void;
  productKit: ProductKitSettings;
  setProductKit: (settings: ProductKitSettings) => void;
}

export function V3Controls({
  v3Features,
  setV3Features,
  difficulty,
  setDifficulty,
  trueNesting,
  setTrueNesting,
  pocketFrame,
  setPocketFrame,
  photoEngraving,
  setPhotoEngraving,
  aiImage,
  setAIImage,
  productKit,
  setProductKit,
}: V3ControlsProps) {
  const [showV3, setShowV3] = useState(false);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <button
        type="button"
        onClick={() => setShowV3(!showV3)}
        className="flex w-full items-center justify-between text-sm font-medium text-slate-100"
      >
        <span>🎯 V3 Premium Features</span>
        <span className="text-xs text-slate-400">{showV3 ? '▼' : '▶'}</span>
      </button>

      {showV3 && (
        <div className="mt-3 space-y-4">
          {/* V3 Master Toggle */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={v3Features.v3Enabled}
              onChange={(e) => setV3Features({ ...v3Features, v3Enabled: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900"
            />
            <span className="text-xs text-slate-300">Enable V3 Premium Features</span>
          </label>

          {v3Features.v3Enabled && (
            <>
              {/* Module E: Difficulty Control */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-medium text-slate-300">Difficulty Level</div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={difficulty.level}
                  onChange={(e) => setDifficulty({ ...difficulty, level: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Easy (1)</span>
                  <span className="font-medium text-sky-400">{difficulty.level}</span>
                  <span>Hard (10)</span>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={difficulty.edgeSymmetryLock}
                    onChange={(e) => setDifficulty({ ...difficulty, edgeSymmetryLock: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Edge symmetry lock (kids-friendly)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={difficulty.ambiguousEdges}
                    onChange={(e) => setDifficulty({ ...difficulty, ambiguousEdges: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Ambiguous edges (challenging)</span>
                </label>
              </div>

              {/* Module A: True Nesting */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={trueNesting.enabled}
                    onChange={(e) => setTrueNesting({ ...trueNesting, enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-slate-300">True Nesting (Real-shape packing)</span>
                </label>
                {trueNesting.enabled && (
                  <div className="ml-5 space-y-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] text-slate-400">Strategy</span>
                      <select
                        value={trueNesting.strategy}
                        onChange={(e) => setTrueNesting({ ...trueNesting, strategy: e.target.value as any })}
                        className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                      >
                        <option value="fast">Fast</option>
                        <option value="balanced">Balanced</option>
                        <option value="maximize-saving">Maximize Saving</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] text-slate-400">Density (1-10)</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={trueNesting.density}
                        onChange={(e) => setTrueNesting({ ...trueNesting, density: parseInt(e.target.value) })}
                        className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={trueNesting.allowRotation}
                        onChange={(e) => setTrueNesting({ ...trueNesting, allowRotation: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900"
                      />
                      <span className="text-[10px] text-slate-400">Allow rotation</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Module B: Pocket Frame */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pocketFrame.enabled}
                    onChange={(e) => setPocketFrame({ ...pocketFrame, enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-slate-300">Pocket Frame System</span>
                </label>
                {pocketFrame.enabled && (
                  <div className="ml-5 space-y-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] text-slate-400">Mode</span>
                      <select
                        value={pocketFrame.mode}
                        onChange={(e) => setPocketFrame({ ...pocketFrame, mode: e.target.value as any })}
                        className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                      >
                        <option value="pocket-only">Pocket Only</option>
                        <option value="pocket-and-frame">Pocket + Frame</option>
                        <option value="frame-only">Frame Only</option>
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] text-slate-400">Pocket Margin (mm)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pocketFrame.pocketMarginMm}
                          onChange={(e) => setPocketFrame({ ...pocketFrame, pocketMarginMm: parseFloat(e.target.value) })}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] text-slate-400">Wall Thickness (mm)</span>
                        <input
                          type="number"
                          step="1"
                          value={pocketFrame.wallThicknessMm}
                          onChange={(e) => setPocketFrame({ ...pocketFrame, wallThicknessMm: parseFloat(e.target.value) })}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pocketFrame.hangingHoles}
                        onChange={(e) => setPocketFrame({ ...pocketFrame, hangingHoles: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900"
                      />
                      <span className="text-[10px] text-slate-400">Hanging holes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pocketFrame.magnetHoles}
                        onChange={(e) => setPocketFrame({ ...pocketFrame, magnetHoles: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-900"
                      />
                      <span className="text-[10px] text-slate-400">Magnet holes</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Module C: Photo Engraving */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={photoEngraving.enabled}
                    onChange={(e) => setPhotoEngraving({ ...photoEngraving, enabled: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-slate-300">Photo Engraving Pipeline</span>
                </label>
                {photoEngraving.enabled && (
                  <div className="ml-5 space-y-2">
                    <label className="grid gap-1">
                      <span className="text-[10px] text-slate-400">Dither Mode</span>
                      <select
                        value={photoEngraving.ditherMode}
                        onChange={(e) => setPhotoEngraving({ ...photoEngraving, ditherMode: e.target.value as any })}
                        className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                      >
                        <option value="none">None (Grayscale)</option>
                        <option value="floyd-steinberg">Floyd-Steinberg</option>
                        <option value="stucki">Stucki</option>
                        <option value="jarvis-judice-ninke">Jarvis-Judice-Ninke</option>
                      </select>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[10px] text-slate-400">DPI</span>
                      <select
                        value={photoEngraving.dpi}
                        onChange={(e) => setPhotoEngraving({ ...photoEngraving, dpi: parseInt(e.target.value) })}
                        className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs"
                      >
                        {DPI_PRESETS.map(preset => (
                          <option key={preset.value} value={preset.value}>{preset.name}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="grid gap-1">
                        <span className="text-[10px] text-slate-400">Brightness</span>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={photoEngraving.preprocess.brightness}
                          onChange={(e) => setPhotoEngraving({ 
                            ...photoEngraving, 
                            preprocess: { ...photoEngraving.preprocess, brightness: parseInt(e.target.value) }
                          })}
                          className="w-full"
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[10px] text-slate-400">Contrast</span>
                        <input
                          type="range"
                          min="-100"
                          max="100"
                          value={photoEngraving.preprocess.contrast}
                          onChange={(e) => setPhotoEngraving({ 
                            ...photoEngraving, 
                            preprocess: { ...photoEngraving.preprocess, contrast: parseInt(e.target.value) }
                          })}
                          className="w-full"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Module F: Product Kit Export */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="text-xs font-medium text-slate-300">Product Kit Export</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productKit.includeEngravingPng}
                    onChange={(e) => setProductKit({ ...productKit, includeEngravingPng: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Include engraving PNG</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productKit.includeMockupPng}
                    onChange={(e) => setProductKit({ ...productKit, includeMockupPng: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Include mockup PNG</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productKit.includeReadme}
                    onChange={(e) => setProductKit({ ...productKit, includeReadme: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Include README</span>
                </label>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
