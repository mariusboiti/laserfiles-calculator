'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SimpleBoxInputs } from '../../core/geometry-core/simpleBox';
import { buildSimpleBox, validateSimpleBox } from '../../core/geometry-core/simpleBox';
import { layoutPanels, panelToSvg } from '../../core/geometry-core/svgExporter';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { refreshEntitlements } from '@/lib/entitlements/client';

type FaceArtworkPlacement = {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
};

type FaceArtworkConfig = {
  prompt: string;
  imageDataUrl: string;
  placement: FaceArtworkPlacement;
};

interface SimpleBoxUIProps {
  boxTypeSelector: React.ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

const mmToIn = (mm: number) => mm / 25.4;
const inToMm = (inches: number) => inches * 25.4;

const DEFAULTS: SimpleBoxInputs = {
  innerWidth: 100,
  innerDepth: 80,
  innerHeight: 60,
  thickness: 3,
  fingerWidth: 10,
};

export function SimpleBoxUI({ boxTypeSelector, unitSystem, onResetCallback }: SimpleBoxUIProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [input, setInput] = useState<SimpleBoxInputs>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string>('all');

  const panelKeys = ['front', 'back', 'left', 'right', 'bottom', 'lid'] as const;

  const [faceArtworkTargets, setFaceArtworkTargets] = useState<string[]>(['front']);
  const [faceArtworkPrompt, setFaceArtworkPrompt] = useState<string>('');
  const [faceArtworkByPanel, setFaceArtworkByPanel] = useState<Record<string, FaceArtworkConfig | undefined>>({});
  const [selectedArtworkPanel, setSelectedArtworkPanel] = useState<string>('front');
  const [isArtworkGenerating, setIsArtworkGenerating] = useState(false);
  const [artworkError, setArtworkError] = useState<string | null>(null);

  // Reset function
  const resetToDefaults = useCallback(() => {
    setInput(DEFAULTS);
    setError(null);
    setActivePanel('all');
    setFaceArtworkTargets(['front']);
    setFaceArtworkPrompt('');
    setFaceArtworkByPanel({});
    setSelectedArtworkPanel('front');
    setIsArtworkGenerating(false);
    setArtworkError(null);
  }, []);

  useEffect(() => {
    if (onResetCallback) {
      onResetCallback(resetToDefaults);
    }
  }, [onResetCallback, resetToDefaults]);

  // Unit conversion helpers
  const displayValue = useCallback(
    (mmValue: number) => (unitSystem === 'mm' ? mmValue : mmToIn(mmValue)),
    [unitSystem]
  );

  const parseValue = useCallback(
    (value: string) => {
      const num = parseFloat(value);
      return unitSystem === 'mm' ? num : inToMm(num);
    },
    [unitSystem]
  );

  // Generate panels and SVG
  const { panels, svgContent, panelSvgs, validationError } = useMemo(() => {
    try {
      const generatedPanels = buildSimpleBox(input);
      
      // Validate panels (throws if invalid)
      validateSimpleBox(generatedPanels);
      
      const layoutSvg = layoutPanels([
        { name: 'FRONT', points: generatedPanels.front },
        { name: 'BACK', points: generatedPanels.back },
        { name: 'LEFT', points: generatedPanels.left },
        { name: 'RIGHT', points: generatedPanels.right },
        { name: 'BOTTOM', points: generatedPanels.bottom },
        { name: 'LID', points: generatedPanels.lid },
      ], {
        margin: 5,
        spacing: 5,
        columns: 3
      });

      const individualSvgs = {
        front: panelToSvg(generatedPanels.front),
        back: panelToSvg(generatedPanels.back),
        left: panelToSvg(generatedPanels.left),
        right: panelToSvg(generatedPanels.right),
        bottom: panelToSvg(generatedPanels.bottom),
        lid: panelToSvg(generatedPanels.lid),
      };

      return {
        panels: generatedPanels,
        svgContent: layoutSvg,
        panelSvgs: individualSvgs,
        validationError: null,
      };
    } catch (err) {
      return {
        panels: null,
        svgContent: '',
        panelSvgs: null,
        validationError: err instanceof Error ? err.message : 'Generation failed',
      };
    }
  }, [input]);

  // Export functions
  const handleExportAll = useCallback(() => {
    if (!panels) return;
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simple-box_W${input.innerWidth}_D${input.innerDepth}_H${input.innerHeight}_T${input.thickness}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [panels, svgContent, input]);

  const handleExportPanel = useCallback((panelName: string) => {
    if (!panelSvgs || !panelSvgs[panelName as keyof typeof panelSvgs]) return;
    
    const blob = new Blob([panelSvgs[panelName as keyof typeof panelSvgs]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simple-box-${panelName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [panelSvgs]);

  // Input change handler
  const handleInputChange = useCallback(
    (field: keyof SimpleBoxInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseValue(e.target.value);
      setInput((prev) => ({ ...prev, [field]: value }));
    },
    [parseValue]
  );

  const setSelectedArtworkPlacement = (patch: Partial<FaceArtworkPlacement>) => {
    if (!selectedArtworkPanel) return;
    setFaceArtworkByPanel((prev) => {
      const cur = prev[selectedArtworkPanel];
      if (!cur) return prev;
      return {
        ...prev,
        [selectedArtworkPanel]: {
          ...cur,
          placement: {
            ...cur.placement,
            ...patch,
          },
        },
      };
    });
  };

  const toggleArtworkTarget = (panel: string) => {
    setFaceArtworkTargets((prev) => {
      const has = prev.includes(panel);
      const next = has ? prev.filter((x) => x !== panel) : [...prev, panel];
      return next.length ? next : prev;
    });
  };

  const handleGenerateArtwork = async () => {
    const prompt = faceArtworkPrompt.trim();
    if (!prompt) {
      setArtworkError(t('boxmaker.artwork_error.prompt_required'));
      return;
    }

    const targets = faceArtworkTargets.filter((t) => panelKeys.includes(t as any));
    if (targets.length === 0) {
      setArtworkError(t('boxmaker.artwork_error.select_face'));
      return;
    }

    setIsArtworkGenerating(true);
    setArtworkError(null);

    try {
      const enhancedPrompt = `${prompt}, white background`;
      const res = await fetch('/api/ai/silhouette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: enhancedPrompt }),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson: any = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || t('boxmaker.artwork_error.ai_generation_failed'));
        }
        const text = await res.text().catch(() => '');
        throw new Error(text || t('boxmaker.artwork_error.ai_generation_failed'));
      }

      const json: any = await res.json().catch(() => ({}));
      const dataUrl = typeof json?.dataUrl === 'string' ? json.dataUrl : '';
      if (!dataUrl) {
        throw new Error(t('boxmaker.artwork_error.ai_no_data_url'));
      }

      setFaceArtworkByPanel((prev) => {
        const next = { ...prev };
        for (const panelName of targets) {
          const p = panels ? (panels as any)[panelName.toLowerCase()] : null;
          // Note: buildSimpleBox returns lowercase keys in panels object (front, back, left, right, bottom, lid)
          const vertices = p || [];
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          vertices.forEach((pt: any) => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
          });
          const w = Math.max(1, maxX - minX);
          const h = Math.max(1, maxY - minY);

          const existing = next[panelName];
          next[panelName] = {
            prompt,
            imageDataUrl: dataUrl,
            placement: existing?.placement ?? { x: w / 2, y: h / 2, scale: 0.5, rotationDeg: 0 },
          };
        }
        return next;
      });

      if (!targets.includes(selectedArtworkPanel)) {
        setSelectedArtworkPanel(targets[0]);
      }

      // Refresh credits in UI
      refreshEntitlements();
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : t('boxmaker.artwork_error.ai_generation_failed'));
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  const unitLabel = unitSystem === 'mm' ? 'mm' : 'in';

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 h-full">
      {/* Left Panel - Controls */}
      <div className="flex flex-col gap-4 overflow-y-auto p-4 bg-slate-900 rounded-lg">
        {boxTypeSelector}

        {/* Dimensions */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Dimensions (Interior)</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Width ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.innerWidth).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('innerWidth')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Depth ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.innerDepth).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('innerDepth')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Height ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.innerHeight).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('innerHeight')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        {/* Material */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Material</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Thickness ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.1 : 0.01}
              value={displayValue(input.thickness).toFixed(unitSystem === 'mm' ? 1 : 3)}
              onChange={handleInputChange('thickness')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        {/* Finger Joints */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Finger Joints</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Finger Width ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.fingerWidth).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('fingerWidth')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <div className="text-[10px] text-slate-500">Pure geometry: M/L/Z only</div>
        </fieldset>

        <div className="rounded-md border border-slate-700 bg-slate-950/30 px-3 py-2">
          <div className="text-xs font-medium text-slate-200">Face Artwork</div>
          <div className="mt-1 text-[10px] text-slate-400">Preview-only overlay (not included in exports)</div>

          <div className="mt-2 grid gap-2">
            <label className="grid gap-1">
              <span className="text-[11px] text-slate-400">Prompt</span>
              <input
                type="text"
                value={faceArtworkPrompt}
                onChange={(e) => setFaceArtworkPrompt(e.target.value)}
                placeholder="e.g. floral silhouette"
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
              />
            </label>

            <div className="grid gap-1">
              <span className="text-[11px] text-slate-400">Faces</span>
              <div className="flex flex-wrap gap-2">
                {panelKeys.map((k) => (
                  <label key={k} className="flex items-center gap-1 text-[11px] text-slate-200">
                    <input type="checkbox" checked={faceArtworkTargets.includes(k)} onChange={() => toggleArtworkTarget(k)} />
                    <span className="uppercase">{k}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateArtwork}
                disabled={isArtworkGenerating}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {isArtworkGenerating ? 'Generating…' : 'Generate'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFaceArtworkByPanel({});
                  setArtworkError(null);
                }}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              >
                Clear
              </button>
            </div>

            {artworkError ? (
              <div className="rounded-md border border-amber-800 bg-amber-950/30 p-2 text-[11px] text-amber-200">{artworkError}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1">
                <span className="text-[11px] text-slate-400">Edit face</span>
                <select
                  value={selectedArtworkPanel}
                  onChange={(e) => setSelectedArtworkPanel(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                >
                  {panelKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-[10px] text-slate-500 self-end">Center-based X/Y in mm</div>
            </div>

            {faceArtworkByPanel[selectedArtworkPanel] ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">X (mm)</span>
                  <input
                    type="number"
                    value={Number(faceArtworkByPanel[selectedArtworkPanel]?.placement.x.toFixed(2))}
                    onChange={(e) => setSelectedArtworkPlacement({ x: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Y (mm)</span>
                  <input
                    type="number"
                    value={Number(faceArtworkByPanel[selectedArtworkPanel]?.placement.y.toFixed(2))}
                    onChange={(e) => setSelectedArtworkPlacement({ y: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Scale</span>
                  <input
                    type="number"
                    min={0.05}
                    step={0.05}
                    value={Number(faceArtworkByPanel[selectedArtworkPanel]?.placement.scale.toFixed(2))}
                    onChange={(e) =>
                      setSelectedArtworkPlacement({ scale: Math.max(0.05, Number(e.target.value) || 0.05) })
                    }
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Rotate (deg)</span>
                  <input
                    type="number"
                    step={1}
                    value={Number(faceArtworkByPanel[selectedArtworkPanel]?.placement.rotationDeg.toFixed(0))}
                    onChange={(e) => setSelectedArtworkPlacement({ rotationDeg: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">No artwork on this face yet.</div>
            )}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="grid gap-2 mt-auto">
          <button
            onClick={handleExportAll}
            disabled={!!validationError}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-md"
          >
            Export All Panels
          </button>
          
          {panels && (
            <div className="grid grid-cols-3 gap-1">
              {Object.keys(panels).map((panelName) => (
                <button
                  key={panelName}
                  onClick={() => handleExportPanel(panelName)}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[10px] rounded"
                >
                  {panelName.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex flex-col gap-2 p-4 bg-slate-950 rounded-lg">
        {/* Panel selector tabs */}
        <div className="flex gap-1 flex-wrap">
          {['all', ...panelKeys].map((panel) => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={`px-3 py-1 text-xs rounded ${
                activePanel === panel
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {panel}
            </button>
          ))}
        </div>

        {validationError && (
          <div className="px-3 py-2 bg-red-950 border border-red-800 rounded text-red-300 text-xs">
            {validationError}
          </div>
        )}

        <div className="flex-1 bg-white rounded-lg overflow-auto p-4">
          {svgContent && activePanel === 'all' && (
            <div
              dangerouslySetInnerHTML={{ __html: svgContent }}
              className="w-full h-full"
            />
          )}
          {panelSvgs && activePanel !== 'all' && panelSvgs[activePanel as keyof typeof panelSvgs] && (
            <div className="relative w-full h-full">
              <div
                className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                dangerouslySetInnerHTML={{ __html: panelSvgs[activePanel as keyof typeof panelSvgs] }}
              />
              {(() => {
                const art = faceArtworkByPanel[activePanel];
                const p = panels ? (panels as any)[activePanel] : null;
                if (!art || !art.imageDataUrl || !p) return null;
                const vertices = p || [];
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                vertices.forEach((pt: any) => {
                  minX = Math.min(minX, pt.x);
                  minY = Math.min(minY, pt.y);
                  maxX = Math.max(maxX, pt.x);
                  maxY = Math.max(maxY, pt.y);
                });
                const w = Math.max(1, maxX - minX);
                const h = Math.max(1, maxY - minY);

                const leftPct = (art.placement.x / w) * 100;
                const topPct = (art.placement.y / h) * 100;
                const wPct = Math.max(1, Math.min(200, (Math.max(0.05, art.placement.scale) * (Math.min(w, h) / w)) * 100));
                return (
                  <img
                    src={art.imageDataUrl}
                    alt="Artwork"
                    className="absolute pointer-events-none"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${wPct}%`,
                      transform: `translate(-50%, -50%) rotate(${art.placement.rotationDeg}deg)`,
                      transformOrigin: 'center',
                      opacity: 0.85,
                    }}
                  />
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
