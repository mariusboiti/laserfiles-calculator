'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { SignInputs, SignShape, TextLine, HolePosition } from '../types/sign';
import { generateSignSvg, generateFilename } from '../core/generateSignSvg';
import { DEFAULTS, SIGN_PRESETS } from '../config/defaults';

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

interface PersonalisedSignToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function PersonalisedSignTool({ onResetCallback }: PersonalisedSignToolProps) {
  const [shape, setShape] = useState<SignShape>(DEFAULTS.shape as SignShape);
  const [widthMm, setWidthMm] = useState(DEFAULTS.w);
  const [heightMm, setHeightMm] = useState(DEFAULTS.h);
  const [borderEnabled, setBorderEnabled] = useState(DEFAULTS.border);
  const [holesEnabled, setHolesEnabled] = useState(DEFAULTS.holes);
  const [holeDiameterMm, setHoleDiameterMm] = useState(DEFAULTS.holeD);
  const [holePosition, setHolePosition] = useState<HolePosition>('top-left-right');

  const [line1Text, setLine1Text] = useState(DEFAULTS.line1);
  const [line1Style, setLine1Style] = useState<'normal' | 'bold'>('normal');
  
  const [line2Text, setLine2Text] = useState(DEFAULTS.line2);
  const [line2Style, setLine2Style] = useState<'normal' | 'bold'>('bold');
  
  const [line3Text, setLine3Text] = useState(DEFAULTS.line3);
  const [line3Style, setLine3Style] = useState<'normal' | 'bold'>('normal');

  const resetToDefaults = useCallback(() => {
    setShape(DEFAULTS.shape as SignShape);
    setWidthMm(DEFAULTS.w);
    setHeightMm(DEFAULTS.h);
    setBorderEnabled(DEFAULTS.border);
    setHolesEnabled(DEFAULTS.holes);
    setHoleDiameterMm(DEFAULTS.holeD);
    setHolePosition('top-left-right');
    setLine1Text(DEFAULTS.line1);
    setLine1Style('normal');
    setLine2Text(DEFAULTS.line2);
    setLine2Style('bold');
    setLine3Text(DEFAULTS.line3);
    setLine3Style('normal');
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const inputs: SignInputs = useMemo(() => {
    const line1: TextLine = {
      text: line1Text,
      style: line1Style,
      sizeMode: 'auto',
    };
    
    const line2: TextLine = {
      text: line2Text,
      style: line2Style,
      sizeMode: 'auto',
    };
    
    const line3: TextLine = {
      text: line3Text,
      style: line3Style,
      sizeMode: 'auto',
    };

    return {
      shape,
      widthMm,
      heightMm,
      borderEnabled,
      holesEnabled,
      holeDiameterMm,
      holePosition,
      line1,
      line2,
      line3,
    };
  }, [
    shape,
    widthMm,
    heightMm,
    borderEnabled,
    holesEnabled,
    holeDiameterMm,
    holePosition,
    line1Text,
    line1Style,
    line2Text,
    line2Style,
    line3Text,
    line3Style,
  ]);

  const svg = useMemo(() => generateSignSvg(inputs), [inputs]);

  function handleExport() {
    const mainText = line2Text || 'sign';
    const filename = generateFilename(mainText);
    downloadTextFile(filename, svg, 'image/svg+xml');
  }

  function applyPreset(preset: (typeof SIGN_PRESETS)[number]) {
    setWidthMm(preset.widthMm);
    setHeightMm(preset.heightMm);
    if (preset.shape) setShape(preset.shape as SignShape);
    if (preset.line1) setLine1Text(preset.line1);
    if (preset.line2) setLine2Text(preset.line2);
    if (preset.line3) setLine3Text(preset.line3);
  }

  return (
    <div className="lfs-tool lfs-tool-personalised-sign-generator flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">Personalised Sign Generator</h1>
            <p className="text-[11px] text-slate-400">Create laser-ready signs with shapes, holes and engraved text</p>
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
                  {SIGN_PRESETS.map((preset) => (
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
                    onChange={(e) => setShape(e.target.value as SignShape)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="rectangle">Classic Rectangle</option>
                    <option value="rounded-rectangle">Rounded Rectangle</option>
                    <option value="arch">Arch Sign</option>
                    <option value="circle">Circle</option>
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
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Holes</div>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={holesEnabled}
                      onChange={(e) => setHolesEnabled(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">Enable holes</span>
                  </label>
                  
                  {holesEnabled && (
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
                        <div className="text-[11px] text-slate-400">Position</div>
                        <select
                          value={holePosition}
                          onChange={(e) => setHolePosition(e.target.value as HolePosition)}
                          className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        >
                          <option value="top-left-right">Top Left + Right</option>
                          <option value="top-center">Top Center</option>
                          <option value="none">None</option>
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Text Lines</div>
                <div className="mt-3 space-y-4">
                  
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">Line 1 (small, optional)</div>
                    <input
                      type="text"
                      value={line1Text}
                      onChange={(e) => setLine1Text(e.target.value)}
                      placeholder="Welcome"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                    <select
                      value={line1Style}
                      onChange={(e) => setLine1Style(e.target.value as 'normal' | 'bold')}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">Line 2 (main, required)</div>
                    <input
                      type="text"
                      value={line2Text}
                      onChange={(e) => setLine2Text(e.target.value)}
                      placeholder="Family Name"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                    <select
                      value={line2Style}
                      onChange={(e) => setLine2Style(e.target.value as 'normal' | 'bold')}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-400">Line 3 (small, optional)</div>
                    <input
                      type="text"
                      value={line3Text}
                      onChange={(e) => setLine3Text(e.target.value)}
                      placeholder="Est. 2025"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                    <select
                      value={line3Style}
                      onChange={(e) => setLine3Style(e.target.value as 'normal' | 'bold')}
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
              </div>

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
