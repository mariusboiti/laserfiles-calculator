'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToolUx } from '@/components/ux/ToolUxProvider';
import type { KeychainInputs, KeychainShape, HolePosition } from '../types/keychain';
import { generateKeychainSvg, generateFilename, generateKeychainWarnings } from '../core/generateKeychainSvg';
import { createArtifact, addToPriceCalculator } from '@/lib/artifacts/client';
import { DEFAULTS, KEYCHAIN_PRESETS } from '../config/defaults';

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface KeychainToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function KeychainTool({ onResetCallback }: KeychainToolProps) {
  const { api } = useToolUx();

  useEffect(() => {
    api.setIsEmpty(false);
  }, [api]);

  const [shape, setShape] = useState<KeychainShape>(DEFAULTS.shape as KeychainShape);
  const [widthMm, setWidthMm] = useState(DEFAULTS.w);
  const [heightMm, setHeightMm] = useState(DEFAULTS.h);
  const [cornerRadiusMm, setCornerRadiusMm] = useState(DEFAULTS.cornerR);
  const [borderEnabled, setBorderEnabled] = useState(DEFAULTS.border);
  const [holeEnabled, setHoleEnabled] = useState(DEFAULTS.hole);
  const [holeDiameterMm, setHoleDiameterMm] = useState(DEFAULTS.holeD);
  const [holeMarginMm, setHoleMarginMm] = useState(DEFAULTS.holeMargin);
  const [holePosition, setHolePosition] = useState<HolePosition>(DEFAULTS.holePos as HolePosition);
  
  const [text, setText] = useState(DEFAULTS.text);
  const [textSizeMode, setTextSizeMode] = useState<'auto' | 'manual'>('auto');
  const [textManualSize, setTextManualSize] = useState(20);
  const [textWeight, setTextWeight] = useState<'normal' | 'bold'>(DEFAULTS.fontWeight as 'normal' | 'bold');
  
  const [thicknessMm, setThicknessMm] = useState(3);

  const resetToDefaults = useCallback(() => {
    setShape(DEFAULTS.shape as KeychainShape);
    setWidthMm(DEFAULTS.w);
    setHeightMm(DEFAULTS.h);
    setCornerRadiusMm(DEFAULTS.cornerR);
    setBorderEnabled(DEFAULTS.border);
    setHoleEnabled(DEFAULTS.hole);
    setHoleDiameterMm(DEFAULTS.holeD);
    setHoleMarginMm(DEFAULTS.holeMargin);
    setHolePosition(DEFAULTS.holePos as HolePosition);
    setText(DEFAULTS.text);
    setTextSizeMode('auto');
    setTextManualSize(20);
    setTextWeight(DEFAULTS.fontWeight as 'normal' | 'bold');
    setThicknessMm(3);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const inputs: KeychainInputs = useMemo(() => ({
    shape,
    widthMm,
    heightMm,
    cornerRadiusMm,
    borderEnabled,
    holeEnabled,
    holeDiameterMm,
    holeMarginMm,
    holePosition,
    text,
    textSizeMode,
    textManualSize,
    textWeight,
    thicknessMm,
  }), [
    shape,
    widthMm,
    heightMm,
    cornerRadiusMm,
    borderEnabled,
    holeEnabled,
    holeDiameterMm,
    holeMarginMm,
    holePosition,
    text,
    textSizeMode,
    textManualSize,
    textWeight,
    thicknessMm,
  ]);

  const svg = useMemo(() => generateKeychainSvg(inputs), [inputs]);
  const warnings = useMemo(() => generateKeychainWarnings(inputs), [inputs]);

  function handleExport() {
    const filename = generateFilename(text || 'keychain');
    downloadTextFile(filename, svg, 'image/svg+xml');
  }

  function applyPreset(preset: (typeof KEYCHAIN_PRESETS)[number]) {
    setWidthMm(preset.widthMm);
    setHeightMm(preset.heightMm);
    if (preset.shape) setShape(preset.shape as KeychainShape);
    if (preset.text) setText(preset.text);
  }

  const showCornerRadius = shape === 'rounded-rectangle' || shape === 'dog-tag';

  return (
    <div className="lfs-tool lfs-tool-keychain-generator flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">Keychain Generator</h1>
            <p className="text-[11px] text-slate-400">Create laser-ready keychains with shapes, holes and engraved text</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        <section className="w-full md:w-80 lg:w-96">
          <div className="max-h-[calc(100vh-96px)] overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="space-y-4">
              
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Quick Presets</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {KEYCHAIN_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Shape</div>
                <div className="mt-3">
                  <select
                    value={shape}
                    onChange={(e) => setShape(e.target.value as KeychainShape)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="rounded-rectangle">Rounded Rectangle</option>
                    <option value="circle">Circle</option>
                    <option value="dog-tag">Dog Tag</option>
                    <option value="capsule">Capsule / Pill</option>
                    <option value="hexagon">Hexagon</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Dimensions</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Width (mm)</div>
                    <input
                      type="number"
                      value={widthMm}
                      onChange={(e) => setWidthMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Height (mm)</div>
                    <input
                      type="number"
                      value={heightMm}
                      onChange={(e) => setHeightMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  {showCornerRadius && (
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">Corner radius (mm)</div>
                      <input
                        type="number"
                        value={cornerRadiusMm}
                        onChange={(e) => setCornerRadiusMm(Number(e.target.value))}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                    </label>
                  )}
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Thickness (mm) <span className="text-slate-500">(info)</span></div>
                    <input
                      type="number"
                      value={thicknessMm}
                      onChange={(e) => setThicknessMm(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Hole</div>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={holeEnabled}
                      onChange={(e) => setHoleEnabled(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">Enable hole</span>
                  </label>
                  
                  {holeEnabled && (
                    <>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Hole diameter (mm)</div>
                        <input
                          type="number"
                          value={holeDiameterMm}
                          onChange={(e) => setHoleDiameterMm(Number(e.target.value))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                      
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Hole margin (mm)</div>
                        <input
                          type="number"
                          value={holeMarginMm}
                          onChange={(e) => setHoleMarginMm(Number(e.target.value))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                      
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Position</div>
                        <select
                          value={holePosition}
                          onChange={(e) => setHolePosition(e.target.value as HolePosition)}
                          className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        >
                          <option value="left">Left</option>
                          <option value="top">Top</option>
                          <option value="right">Right</option>
                          <option value="none">None</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Text</div>
                <div className="mt-3 space-y-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Name/Text</div>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="John"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Font size</div>
                    <select
                      value={textSizeMode}
                      onChange={(e) => setTextSizeMode(e.target.value as 'auto' | 'manual')}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="auto">Auto-fit</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  
                  {textSizeMode === 'manual' && (
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">Manual size: {textManualSize}pt</div>
                      <input
                        type="range"
                        min="8"
                        max="48"
                        value={textManualSize}
                        onChange={(e) => setTextManualSize(Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  )}
                  
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Weight</div>
                    <select
                      value={textWeight}
                      onChange={(e) => setTextWeight(e.target.value as 'normal' | 'bold')}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </label>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3">
                  <div className="text-sm font-medium text-amber-300">Warnings</div>
                  <ul className="mt-2 space-y-1 text-xs text-amber-200">
                    {warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Export</div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
                  >
                    Export SVG
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const artifact = await createArtifact({
                          toolSlug: 'keychain-generator',
                          name: `keychain-${text || 'design'}`,
                          svg,
                          meta: {
                            bboxMm: { width: widthMm, height: heightMm },
                            operations: { hasCuts: true, hasEngraves: true },
                          },
                        });
                        addToPriceCalculator(artifact);
                      } catch (e) {
                        console.error('Failed to add to price calculator:', e);
                      }
                    }}
                    className="w-full mt-2 rounded-md border-2 border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20"
                  >
                    💰 Add to Price Calculator
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-2 flex flex-1 flex-col gap-3 md:mt-0">
          <div className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-3 md:p-4">
            <div className="mb-3 text-sm font-medium text-slate-100">Preview</div>
            <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg border border-slate-800 bg-white p-8">
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
