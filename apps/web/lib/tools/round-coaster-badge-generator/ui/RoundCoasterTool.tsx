'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DEFAULTS, COASTER_PRESETS, sanitizeDimensions, sanitizeBorder, sanitizePadding, sanitizeFontSizes } from '../config/defaults';
import { fitFontSize, calculateTextYPositions } from '../core/textFit';

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

interface RoundCoasterToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function RoundCoasterTool({ onResetCallback }: RoundCoasterToolProps) {
  const [shape, setShape] = useState<'circle' | 'hex' | 'shield'>(DEFAULTS.shape);
  const [diameter, setDiameter] = useState(DEFAULTS.diameter);
  const [width, setWidth] = useState(DEFAULTS.width);
  const [height, setHeight] = useState(DEFAULTS.height);
  const [border, setBorder] = useState(DEFAULTS.border);
  const [doubleBorder, setDoubleBorder] = useState(DEFAULTS.doubleBorder);
  const [borderInset, setBorderInset] = useState(DEFAULTS.borderInset);
  
  const [textTop, setTextTop] = useState(DEFAULTS.textTop);
  const [textCenter, setTextCenter] = useState(DEFAULTS.textCenter);
  const [textBottom, setTextBottom] = useState(DEFAULTS.textBottom);
  
  const [autoFit, setAutoFit] = useState(DEFAULTS.autoFit);
  const [fontMin, setFontMin] = useState(DEFAULTS.fontMin);
  const [fontMaxCenter, setFontMaxCenter] = useState(DEFAULTS.fontMaxCenter);
  const [fontMaxSmall, setFontMaxSmall] = useState(DEFAULTS.fontMaxSmall);
  const [padding, setPadding] = useState(DEFAULTS.padding);

  const resetToDefaults = useCallback(() => {
    setShape(DEFAULTS.shape);
    setDiameter(DEFAULTS.diameter);
    setWidth(DEFAULTS.width);
    setHeight(DEFAULTS.height);
    setBorder(DEFAULTS.border);
    setDoubleBorder(DEFAULTS.doubleBorder);
    setBorderInset(DEFAULTS.borderInset);
    setTextTop(DEFAULTS.textTop);
    setTextCenter(DEFAULTS.textCenter);
    setTextBottom(DEFAULTS.textBottom);
    setAutoFit(DEFAULTS.autoFit);
    setFontMin(DEFAULTS.fontMin);
    setFontMaxCenter(DEFAULTS.fontMaxCenter);
    setFontMaxSmall(DEFAULTS.fontMaxSmall);
    setPadding(DEFAULTS.padding);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const applyPreset = useCallback((preset: typeof COASTER_PRESETS[0]) => {
    setShape(preset.shape);
    if (preset.diameter) setDiameter(preset.diameter);
    if (preset.width) setWidth(preset.width);
    if (preset.height) setHeight(preset.height);
    setTextCenter(preset.textCenter);
  }, []);

  const svg = useMemo(() => {
    const dims = sanitizeDimensions(diameter, width, height);
    const safeBorderInset = sanitizeBorder(borderInset);
    const safePadding = sanitizePadding(padding);
    const fonts = sanitizeFontSizes(fontMin, fontMaxCenter, fontMaxSmall);
    
    const size = shape === 'circle' ? dims.diameter : Math.max(dims.width, dims.height);
    const availableWidth = size - 2 * safePadding;
    
    const positions = calculateTextYPositions(size, !!textTop, !!textCenter, !!textBottom);
    
    const fontSizeTop = autoFit && textTop ? fitFontSize(textTop, availableWidth, fonts.fontMin, fonts.fontMaxSmall) : fonts.fontMaxSmall;
    const fontSizeCenter = autoFit && textCenter ? fitFontSize(textCenter, availableWidth, fonts.fontMin, fonts.fontMaxCenter) : fonts.fontMaxCenter;
    const fontSizeBottom = autoFit && textBottom ? fitFontSize(textBottom, availableWidth, fonts.fontMin, fonts.fontMaxSmall) : fonts.fontMaxSmall;
    
    let svgContent = `<svg width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Shape outline
    if (shape === 'circle') {
      const r = size / 2;
      svgContent += `<circle cx="${r}" cy="${r}" r="${r}" fill="none" stroke="#000" stroke-width="0.2"/>`;
      if (border) {
        svgContent += `<circle cx="${r}" cy="${r}" r="${r - safeBorderInset}" fill="none" stroke="#000" stroke-width="0.2"/>`;
        if (doubleBorder) {
          svgContent += `<circle cx="${r}" cy="${r}" r="${r - safeBorderInset - 2}" fill="none" stroke="#000" stroke-width="0.2"/>`;
        }
      }
    } else if (shape === 'hex') {
      const r = size / 2;
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        return `${r + r * Math.cos(angle)},${r + r * Math.sin(angle)}`;
      }).join(' ');
      svgContent += `<polygon points="${points}" fill="none" stroke="#000" stroke-width="0.2"/>`;
    }
    
    // Text
    if (textTop && positions.yTop) {
      svgContent += `<text x="${size / 2}" y="${positions.yTop}" text-anchor="middle" font-size="${fontSizeTop}" font-weight="500" fill="none" stroke="#000" stroke-width="0.1">${textTop}</text>`;
    }
    if (textCenter && positions.yCenter) {
      svgContent += `<text x="${size / 2}" y="${positions.yCenter}" text-anchor="middle" font-size="${fontSizeCenter}" font-weight="700" fill="none" stroke="#000" stroke-width="0.1">${textCenter}</text>`;
    }
    if (textBottom && positions.yBottom) {
      svgContent += `<text x="${size / 2}" y="${positions.yBottom}" text-anchor="middle" font-size="${fontSizeBottom}" font-weight="500" fill="none" stroke="#000" stroke-width="0.1">${textBottom}</text>`;
    }
    
    svgContent += `</svg>`;
    return svgContent;
  }, [shape, diameter, width, height, border, doubleBorder, borderInset, textTop, textCenter, textBottom, autoFit, fontMin, fontMaxCenter, fontMaxSmall, padding]);

  function handleExport() {
    const filename = `coaster-${shape}-${textCenter || 'design'}.svg`.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
    downloadTextFile(filename, svg, 'image/svg+xml');
  }

  return (
    <div className="lfs-tool lfs-tool-round-coaster-badge-generator flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">Round Coaster & Badge Generator</h1>
            <p className="text-[11px] text-slate-400">Create laser-ready coasters and badges with engraved text</p>
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
                  {COASTER_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                      title={preset.description}
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
                    onChange={(e) => setShape(e.target.value as 'circle' | 'hex' | 'shield')}
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="circle">Circle</option>
                    <option value="hex">Hexagon</option>
                    <option value="shield">Shield</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Dimensions</div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {shape === 'circle' ? (
                    <label className="grid gap-1">
                      <div className="text-[11px] text-slate-400">Diameter (mm)</div>
                      <input
                        type="number"
                        value={diameter}
                        onChange={(e) => setDiameter(Number(e.target.value))}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                      />
                    </label>
                  ) : (
                    <>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Width (mm)</div>
                        <input
                          type="number"
                          value={width}
                          onChange={(e) => setWidth(Number(e.target.value))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Height (mm)</div>
                        <input
                          type="number"
                          value={height}
                          onChange={(e) => setHeight(Number(e.target.value))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Border</div>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={border}
                      onChange={(e) => setBorder(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">Enable border</span>
                  </label>
                  
                  {border && (
                    <>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">Border inset (mm)</div>
                        <input
                          type="number"
                          value={borderInset}
                          onChange={(e) => setBorderInset(Number(e.target.value))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={doubleBorder}
                          onChange={(e) => setDoubleBorder(e.target.checked)}
                          className="rounded border-slate-800"
                        />
                        <span className="text-xs text-slate-300">Double border</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Text</div>
                <div className="mt-3 space-y-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Top text (optional)</div>
                    <input
                      type="text"
                      value={textTop}
                      onChange={(e) => setTextTop(e.target.value)}
                      placeholder="Top line"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Center text</div>
                    <input
                      type="text"
                      value={textCenter}
                      onChange={(e) => setTextCenter(e.target.value)}
                      placeholder="Main text"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Bottom text (optional)</div>
                    <input
                      type="text"
                      value={textBottom}
                      onChange={(e) => setTextBottom(e.target.value)}
                      placeholder="Bottom line"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoFit}
                      onChange={(e) => setAutoFit(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">Auto-fit text size</span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Export</div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={!textCenter}
                    className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
