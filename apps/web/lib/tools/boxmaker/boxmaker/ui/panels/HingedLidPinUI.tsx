'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { HingedPinInputs } from '../../core/hinged-pin/types';
import { HINGED_PIN_DEFAULTS } from '../../core/hinged-pin/types';
import { generateHingedPinPanels, validatePanels } from '../../core/hinged-pin/generateHingedPinSvg';
import { layoutPanelsToSvg, generatePanelSvgs } from '../../core/hinged-pin/layout';
import { AIWarningBanner } from '@/components/ai';

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

interface HingedLidPinUIProps {
  boxTypeSelector: React.ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

const mmToIn = (mm: number) => mm / 25.4;
const inToMm = (inches: number) => inches * 25.4;

export function HingedLidPinUI({ boxTypeSelector, unitSystem, onResetCallback }: HingedLidPinUIProps) {
  const [input, setInput] = useState<HingedPinInputs>(HINGED_PIN_DEFAULTS);
  const [activePanel, setActivePanel] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [showDebugLabels, setShowDebugLabels] = useState<boolean>(true); // Debug ON by default

  const panelKeys = ['bottom', 'front', 'back', 'left', 'right', 'lid'] as const;
  type PanelKey = (typeof panelKeys)[number];

  const [faceArtworkTargets, setFaceArtworkTargets] = useState<string[]>(['front']);
  const [faceArtworkPrompt, setFaceArtworkPrompt] = useState<string>('');
  const [faceArtworkByPanel, setFaceArtworkByPanel] = useState<Record<string, FaceArtworkConfig | undefined>>({});
  const [selectedArtworkPanel, setSelectedArtworkPanel] = useState<string>('front');
  const [isArtworkGenerating, setIsArtworkGenerating] = useState(false);
  const [artworkError, setArtworkError] = useState<string | null>(null);

  // Reset function
  const resetToDefaults = useCallback(() => {
    setInput(HINGED_PIN_DEFAULTS);
    setActivePanel('all');
    setError(null);
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

  // Unit conversion helper
  const displayValue = useCallback(
    (mm: number) => (unitSystem === 'mm' ? mm : mmToIn(mm)),
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
      const generatedPanels = generateHingedPinPanels(input);
      
      // Validate panels (throws if invalid)
      validatePanels(generatedPanels);
      
      const layoutSvg = layoutPanelsToSvg(generatedPanels, {
        margin: input.marginMm,
        spacing: input.spacingMm,
        showDebug: showDebugLabels,
      });
      const individualSvgs = generatePanelSvgs(generatedPanels);

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
  }, [input, showDebugLabels]);

  useEffect(() => {
    const available = ['all', ...panelKeys];
    if (!available.includes(activePanel as any)) {
      setActivePanel('all');
    }
  }, [activePanel]);

  useEffect(() => {
    if (panelKeys.includes(selectedArtworkPanel as any)) return;
    setSelectedArtworkPanel('front');
  }, [selectedArtworkPanel]);

  const selectedArtwork = selectedArtworkPanel ? faceArtworkByPanel[selectedArtworkPanel] ?? null : null;

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
      setArtworkError('Please enter a prompt');
      return;
    }

    const targets = faceArtworkTargets.filter((t) => panelKeys.includes(t as any));
    if (targets.length === 0) {
      setArtworkError('Select at least one face');
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
          throw new Error(errJson?.error || 'AI generation failed');
        }
        const text = await res.text().catch(() => '');
        throw new Error(text || 'AI generation failed');
      }

      const json: any = await res.json().catch(() => ({}));
      const dataUrl = typeof json?.dataUrl === 'string' ? json.dataUrl : '';
      if (!dataUrl) {
        throw new Error('AI image endpoint returned no dataUrl');
      }

      setFaceArtworkByPanel((prev) => {
        const next = { ...prev };
        for (const panelName of targets) {
          const p = panels ? (panels as any)[panelName] : null;
          const w = Math.max(p?.width ?? 1, 1);
          const h = Math.max(p?.height ?? 1, 1);
          const base = Math.max(1, Math.min(w, h));
          const existing = next[panelName];
          next[panelName] = {
            prompt,
            imageDataUrl: dataUrl,
            placement: existing?.placement ?? { x: w / 2, y: h / 2, scale: 0.5, rotationDeg: 0 },
          };
          // Ensure placement remains in-bounds-ish
          next[panelName]!.placement = {
            ...next[panelName]!.placement,
            scale: Math.max(0.05, next[panelName]!.placement.scale),
            x: Number.isFinite(next[panelName]!.placement.x) ? next[panelName]!.placement.x : base / 2,
            y: Number.isFinite(next[panelName]!.placement.y) ? next[panelName]!.placement.y : base / 2,
          };
        }
        return next;
      });

      if (!targets.includes(selectedArtworkPanel)) {
        setSelectedArtworkPanel(targets[0]);
      }
    } catch (e) {
      setArtworkError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setIsArtworkGenerating(false);
    }
  };

  // Export functions
  const handleExportAll = useCallback(() => {
    if (!panels) return;
    
    // Generate SVG without debug labels for export
    const exportSvg = layoutPanelsToSvg(panels, {
      margin: input.marginMm,
      spacing: input.spacingMm,
      showDebug: false, // Always OFF for export
    });
    
    const blob = new Blob([exportSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hinged-pin-box_W${input.innerWidthMm}_D${input.innerDepthMm}_H${input.innerHeightMm}_T${input.thicknessMm}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [panels, input]);

  const handleExportPanel = useCallback((panelName: string) => {
    if (!panelSvgs || !panelSvgs[panelName]) return;
    
    const blob = new Blob([panelSvgs[panelName]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hinged-lid-box_${panelName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [panelSvgs]);

  // Input change handler
  const handleInputChange = useCallback(
    (field: keyof HingedPinInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : parseValue(e.target.value);
      setInput((prev) => ({ ...prev, [field]: value }));
    },
    [parseValue]
  );

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
              value={displayValue(input.innerWidthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('innerWidthMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Depth ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.innerDepthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('innerDepthMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Height ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.innerHeightMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('innerHeightMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        <div className="rounded-md border border-slate-700 bg-slate-950/30 px-3 py-2">
          <div className="text-xs font-medium text-slate-200">Face Artwork</div>
          <div className="mt-1 text-[10px] text-slate-400">Preview-only overlay (not included in exports)</div>

          <div className="mt-2">
            <AIWarningBanner />
          </div>

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

            {selectedArtwork ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">X (mm)</span>
                  <input
                    type="number"
                    value={Number(selectedArtwork.placement.x.toFixed(2))}
                    onChange={(e) => setSelectedArtworkPlacement({ x: Number(e.target.value) || 0 })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Y (mm)</span>
                  <input
                    type="number"
                    value={Number(selectedArtwork.placement.y.toFixed(2))}
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
                    value={Number(selectedArtwork.placement.scale.toFixed(2))}
                    onChange={(e) => setSelectedArtworkPlacement({ scale: Math.max(0.05, Number(e.target.value) || 0.05) })}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[11px] text-slate-400">Rotate (deg)</span>
                  <input
                    type="number"
                    step={1}
                    value={Number(selectedArtwork.placement.rotationDeg.toFixed(0))}
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

        {/* Material */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Material</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Thickness ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.1 : 0.01}
              value={displayValue(input.thicknessMm).toFixed(unitSystem === 'mm' ? 1 : 3)}
              onChange={handleInputChange('thicknessMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Kerf ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.01 : 0.001}
              value={displayValue(input.kerfMm).toFixed(unitSystem === 'mm' ? 2 : 4)}
              onChange={handleInputChange('kerfMm')}
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
              value={displayValue(input.fingerWidthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('fingerWidthMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <div className="text-[10px] text-slate-500">Pattern: Centered (symmetric)</div>
        </fieldset>

        {/* Hinge (Pin Knuckle) */}
        <fieldset className="grid gap-2 border border-sky-800 rounded-md p-3 bg-sky-950/20">
          <legend className="text-xs font-medium text-sky-300 px-1">Hinge (Pin Knuckle)</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Pin Diameter ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.5 : 0.02}
              value={displayValue(input.pinDiameterMm).toFixed(unitSystem === 'mm' ? 1 : 3)}
              onChange={handleInputChange('pinDiameterMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Knuckle Length ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.knuckleLengthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('knuckleLengthMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Knuckle Gap ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.1 : 0.01}
              value={displayValue(input.knuckleGapMm).toFixed(unitSystem === 'mm' ? 1 : 3)}
              onChange={handleInputChange('knuckleGapMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Hinge Inset ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.hingeInsetMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('hingeInsetMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Clearance ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.05 : 0.005}
              value={displayValue(input.clearanceMm).toFixed(unitSystem === 'mm' ? 2 : 4)}
              onChange={handleInputChange('clearanceMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
        </fieldset>

        {/* Layout */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Layout</legend>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Margin ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.marginMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('marginMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Spacing ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.spacingMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('spacingMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDebugLabels}
              onChange={(e) => setShowDebugLabels(e.target.checked)}
              className="rounded border-slate-700"
            />
            <span className="text-[11px] text-slate-400">Show debug labels (preview only)</span>
          </label>
        </fieldset>

        {/* Export Buttons */}
        <div className="grid gap-2 mt-auto">
          <button
            onClick={handleExportAll}
            disabled={!!validationError}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-md"
          >
            Export All (SVG)
          </button>
          
          <div className="grid grid-cols-3 gap-1">
            {['bottom', 'front', 'back', 'left', 'right', 'lid'].map((panel) => (
              <button
                key={panel}
                onClick={() => handleExportPanel(panel)}
                disabled={!!validationError}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-[10px] rounded"
              >
                {panel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex flex-col gap-2 p-4 bg-slate-950 rounded-lg">
        {/* Panel selector tabs */}
        <div className="flex gap-1 flex-wrap">
          {['all', 'bottom', 'front', 'back', 'left', 'right', 'lid'].map((panel) => (
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

        {/* Error display */}
        {validationError && (
          <div className="px-3 py-2 bg-red-950 border border-red-800 rounded text-red-300 text-xs">
            {validationError}
          </div>
        )}

        {/* SVG Preview */}
        <div className="flex-1 bg-white rounded-lg overflow-auto p-4">
          {svgContent && activePanel === 'all' && (
            <div
              dangerouslySetInnerHTML={{ __html: svgContent }}
              className="w-full h-full"
            />
          )}
          {panelSvgs && activePanel !== 'all' && panelSvgs[activePanel] && (
            <div className="relative w-full h-full">
              <div
                className="absolute inset-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:block"
                dangerouslySetInnerHTML={{ __html: panelSvgs[activePanel] }}
              />
              {(() => {
                const art = faceArtworkByPanel[activePanel];
                const p = panels ? (panels as any)[activePanel] : null;
                if (!art || !art.imageDataUrl || !p) return null;
                const w = Math.max(p.width ?? 1, 1);
                const h = Math.max(p.height ?? 1, 1);
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
