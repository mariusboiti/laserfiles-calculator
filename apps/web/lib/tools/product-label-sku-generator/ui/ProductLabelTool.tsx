'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DEFAULTS, LABEL_PRESETS, sanitizeDimensions, sanitizeCornerRadius, sanitizePadding, sanitizeQR } from '../config/defaults';

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

interface ProductLabelToolProps {
  onResetCallback?: (callback: () => void) => void;
}

export function ProductLabelTool({ onResetCallback }: ProductLabelToolProps) {
  const [w, setW] = useState(DEFAULTS.w);
  const [h, setH] = useState(DEFAULTS.h);
  const [border, setBorder] = useState(DEFAULTS.border);
  const [rounded, setRounded] = useState(DEFAULTS.rounded);
  const [cornerR, setCornerR] = useState(DEFAULTS.cornerR);
  const [padding, setPadding] = useState(DEFAULTS.padding);
  
  const [productName, setProductName] = useState(DEFAULTS.productName);
  const [sku, setSku] = useState(DEFAULTS.sku);
  const [price, setPrice] = useState(DEFAULTS.price);
  
  const [qrEnabled, setQrEnabled] = useState(DEFAULTS.qrEnabled);
  const [qrText, setQrText] = useState(DEFAULTS.qrText);
  const [qrSize, setQrSize] = useState(DEFAULTS.qrSize);
  const [qrMargin, setQrMargin] = useState(DEFAULTS.qrMargin);

  const resetToDefaults = useCallback(() => {
    setW(DEFAULTS.w);
    setH(DEFAULTS.h);
    setBorder(DEFAULTS.border);
    setRounded(DEFAULTS.rounded);
    setCornerR(DEFAULTS.cornerR);
    setPadding(DEFAULTS.padding);
    setProductName(DEFAULTS.productName);
    setSku(DEFAULTS.sku);
    setPrice(DEFAULTS.price);
    setQrEnabled(DEFAULTS.qrEnabled);
    setQrText(DEFAULTS.qrText);
    setQrSize(DEFAULTS.qrSize);
    setQrMargin(DEFAULTS.qrMargin);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  const applyPreset = useCallback((preset: typeof LABEL_PRESETS[0]) => {
    setW(preset.widthMm);
    setH(preset.heightMm);
    if (preset.qrSize) setQrSize(preset.qrSize);
  }, []);

  const svg = useMemo(() => {
    const dims = sanitizeDimensions(w, h);
    const safeCornerR = sanitizeCornerRadius(cornerR);
    const safePadding = sanitizePadding(padding);
    const qr = sanitizeQR(qrSize, qrMargin);
    
    const textAreaW = qrEnabled ? dims.w - 2 * safePadding - qr.qrSize - 2 * qr.qrMargin : dims.w - 2 * safePadding;
    
    let svgContent = `<svg width="${dims.w}mm" height="${dims.h}mm" viewBox="0 0 ${dims.w} ${dims.h}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Border
    if (border) {
      if (rounded) {
        svgContent += `<rect x="0" y="0" width="${dims.w}" height="${dims.h}" rx="${safeCornerR}" ry="${safeCornerR}" fill="none" stroke="#000" stroke-width="0.2"/>`;
      } else {
        svgContent += `<rect x="0" y="0" width="${dims.w}" height="${dims.h}" fill="none" stroke="#000" stroke-width="0.2"/>`;
      }
    }
    
    // Text
    const yName = dims.h * 0.30;
    const ySku = dims.h * 0.60;
    const yPrice = dims.h * 0.85;
    
    if (productName) {
      svgContent += `<text x="${safePadding}" y="${yName}" font-size="5" font-weight="700" fill="none" stroke="#000" stroke-width="0.1">${productName}</text>`;
    }
    if (sku) {
      svgContent += `<text x="${safePadding}" y="${ySku}" font-size="6" font-weight="500" fill="none" stroke="#000" stroke-width="0.1">${sku}</text>`;
    }
    if (price) {
      svgContent += `<text x="${safePadding}" y="${yPrice}" font-size="4" font-weight="500" fill="none" stroke="#000" stroke-width="0.1">${price}</text>`;
    }
    
    // QR Code (simplified as rectangle grid)
    if (qrEnabled && qrText) {
      const qrX = dims.w - safePadding - qr.qrSize;
      const qrY = dims.h - safePadding - qr.qrSize;
      svgContent += `<rect x="${qrX}" y="${qrY}" width="${qr.qrSize}" height="${qr.qrSize}" fill="none" stroke="#000" stroke-width="0.2"/>`;
      // Simplified QR pattern
      const moduleSize = qr.qrSize / 10;
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if ((i + j) % 2 === 0) {
            svgContent += `<rect x="${qrX + i * moduleSize}" y="${qrY + j * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="#000"/>`;
          }
        }
      }
    }
    
    svgContent += `</svg>`;
    return svgContent;
  }, [w, h, border, rounded, cornerR, padding, productName, sku, price, qrEnabled, qrText, qrSize, qrMargin]);

  const warnings = useMemo(() => {
    const warns: string[] = [];
    const dims = sanitizeDimensions(w, h);
    const safePadding = sanitizePadding(padding);
    const qr = sanitizeQR(qrSize, qrMargin);
    
    if (qrEnabled) {
      const qrBlockW = qr.qrSize + 2 * qr.qrMargin;
      const textAreaW = dims.w - 2 * safePadding - qrBlockW;
      if (textAreaW < 20) {
        warns.push('QR too large for label size (reduce QR or increase label)');
      }
      if (!qrText) {
        warns.push('QR enabled but QR text empty');
      }
    }
    if (!sku) {
      warns.push('SKU empty (recommended for inventory)');
    }
    
    return warns;
  }, [w, h, padding, qrEnabled, qrText, qrSize, qrMargin, sku]);

  function handleExport() {
    const filename = `product-label-${sku || 'label'}-${w}x${h}.svg`.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
    downloadTextFile(filename, svg, 'image/svg+xml');
  }

  return (
    <div className="lfs-tool lfs-tool-product-label-sku-generator flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900 bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-slate-100 md:text-base">Product Label & SKU Generator</h1>
            <p className="text-[11px] text-slate-400">Create laser-ready product labels with text and QR codes</p>
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
                  {LABEL_PRESETS.map((preset) => (
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
                <div className="text-sm font-medium text-slate-100">Dimensions</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Width (mm)</div>
                    <input
                      type="number"
                      value={w}
                      onChange={(e) => setW(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Height (mm)</div>
                    <input
                      type="number"
                      value={h}
                      onChange={(e) => setH(Number(e.target.value))}
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
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
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={rounded}
                          onChange={(e) => setRounded(e.target.checked)}
                          className="rounded border-slate-800"
                        />
                        <span className="text-xs text-slate-300">Rounded corners</span>
                      </label>
                      
                      {rounded && (
                        <label className="grid gap-1">
                          <div className="text-[11px] text-slate-400">Corner radius (mm)</div>
                          <input
                            type="number"
                            value={cornerR}
                            onChange={(e) => setCornerR(Number(e.target.value))}
                            className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">Text</div>
                <div className="mt-3 space-y-3">
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Product name</div>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Handmade Product"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">SKU</div>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="SKU-0001"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                  
                  <label className="grid gap-1">
                    <div className="text-[11px] text-slate-400">Price (optional)</div>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="$19.99"
                      className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-sm font-medium text-slate-100">QR Code</div>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={qrEnabled}
                      onChange={(e) => setQrEnabled(e.target.checked)}
                      className="rounded border-slate-800"
                    />
                    <span className="text-xs text-slate-300">Enable QR code</span>
                  </label>
                  
                  {qrEnabled && (
                    <>
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">QR text/URL</div>
                        <input
                          type="text"
                          value={qrText}
                          onChange={(e) => setQrText(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                      
                      <label className="grid gap-1">
                        <div className="text-[11px] text-slate-400">QR size (mm)</div>
                        <input
                          type="number"
                          value={qrSize}
                          onChange={(e) => setQrSize(Number(e.target.value))}
                          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                        />
                      </label>
                    </>
                  )}
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
                    disabled={!productName && !sku}
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
