'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { HingedSidePinInputs, Panel } from '../../core/hinged-side-pin/types';
import { HINGED_SIDE_PIN_DEFAULTS } from '../../core/hinged-side-pin/types';
import { generateHingedSidePinPanels, validatePanels } from '../../core/hinged-side-pin/generateHingedSidePinSvg';
import { layoutPanelsToSvg, generatePanelSvgs } from '../../core/hinged-side-pin/layout';

interface HingedSidePinUIProps {
  boxTypeSelector: React.ReactNode;
  unitSystem: 'mm' | 'in';
  onResetCallback?: (callback: () => void) => void;
}

const mmToIn = (mm: number) => mm / 25.4;
const inToMm = (inches: number) => inches * 25.4;

export function HingedSidePinUI({ boxTypeSelector, unitSystem, onResetCallback }: HingedSidePinUIProps) {
  const [input, setInput] = useState<HingedSidePinInputs>(HINGED_SIDE_PIN_DEFAULTS);
  const [activePanel, setActivePanel] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [showDebugLabels, setShowDebugLabels] = useState<boolean>(true); // Debug ON by default

  // Reset function
  const resetToDefaults = useCallback(() => {
    setInput(HINGED_SIDE_PIN_DEFAULTS);
    setActivePanel('all');
    setError(null);
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
  const { panels, svgContent, panelSvgs, validationError, warnings } = useMemo(() => {
    try {
      const generatedPanels = generateHingedSidePinPanels(input);
      
      // Validate panels (throws if invalid)
      validatePanels(generatedPanels);
      
      const panelWarnings = (Object.values(generatedPanels) as Panel[]).flatMap(
        (panel) => panel.warnings ?? []
      );

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
        warnings: panelWarnings,
      };
    } catch (err) {
      return {
        panels: null,
        svgContent: '',
        panelSvgs: null,
        validationError: err instanceof Error ? err.message : 'Generation failed',
        warnings: [],
      };
    }
  }, [input, showDebugLabels]);

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
    a.download = `hinged-side-pin-box_W${input.innerWidthMm}_D${input.innerDepthMm}_H${input.innerHeightMm}_T${input.thicknessMm}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [panels, input]);

  const handleExportPanel = useCallback((panelName: string) => {
    if (!panelSvgs || !panelSvgs[panelName]) return;
    
    const blob = new Blob([panelSvgs[panelName]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hinged-side-pin-box_${panelName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [panelSvgs]);

  // Input change handler
  const handleInputChange = useCallback(
    (field: keyof HingedSidePinInputs) => (e: React.ChangeEvent<HTMLInputElement>) => {
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

        {/* Side Pin Hinge */}
        <fieldset className="grid gap-2 border border-sky-800 rounded-md p-3 bg-sky-950/20">
          <legend className="text-xs font-medium text-sky-300 px-1">Hinge (Side Pin)</legend>
          
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
            <span className="text-[11px] text-slate-400">Pin Inset From Top ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 1 : 0.1}
              value={displayValue(input.pinInsetFromTopMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
              onChange={handleInputChange('pinInsetFromTopMm')}
              className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
          </label>
          
          <label className="grid gap-1">
            <span className="text-[11px] text-slate-400">Pin Inset From Back ({unitLabel})</span>
            <input
              type="number"
              step={unitSystem === 'mm' ? 0.5 : 0.02}
              value={displayValue(input.pinInsetFromBackMm).toFixed(unitSystem === 'mm' ? 1 : 3)}
              onChange={handleInputChange('pinInsetFromBackMm')}
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

        {/* Lid Finger Pull */}
        <fieldset className="grid gap-2 border border-slate-700 rounded-md p-3">
          <legend className="text-xs font-medium text-slate-300 px-1">Lid Finger Pull</legend>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={input.lidFingerPull}
              onChange={handleInputChange('lidFingerPull')}
              className="rounded border-slate-700"
            />
            <span className="text-[11px] text-slate-400">Enable finger pull</span>
          </label>
          
          {input.lidFingerPull && (
            <>
              <label className="grid gap-1">
                <span className="text-[11px] text-slate-400">Pull Radius ({unitLabel})</span>
                <input
                  type="number"
                  step={unitSystem === 'mm' ? 1 : 0.1}
                  value={displayValue(input.fingerPullRadiusMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
                  onChange={handleInputChange('fingerPullRadiusMm')}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                />
              </label>
              
              <label className="grid gap-1">
                <span className="text-[11px] text-slate-400">Pull Depth ({unitLabel})</span>
                <input
                  type="number"
                  step={unitSystem === 'mm' ? 1 : 0.1}
                  value={displayValue(input.fingerPullDepthMm).toFixed(unitSystem === 'mm' ? 0 : 2)}
                  onChange={handleInputChange('fingerPullDepthMm')}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
                />
              </label>
            </>
          )}
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
      <div className="flex flex-col overflow-hidden">
        {validationError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-red-300 text-xs">{validationError}</p>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 rounded-md">
            <p className="text-amber-300 text-xs font-medium">Warnings</p>
            <ul className="mt-1 text-amber-200 text-xs space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex-1 bg-white rounded-lg shadow-inner overflow-hidden">
          {svgContent ? (
            <div className="w-full h-full">
              <iframe
                srcDoc={svgContent}
                className="w-full h-full border-0"
                title="Box Preview"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <p className="text-sm">Generating preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
