'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { SimpleBoxInputs } from '../../core/geometry-core/simpleBox';
import { buildSimpleBox, validateSimpleBox } from '../../core/geometry-core/simpleBox';
import { layoutPanels, panelToSvg } from '../../core/geometry-core/svgExporter';

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
  const [input, setInput] = useState<SimpleBoxInputs>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);

  // Reset function
  const resetToDefaults = useCallback(() => {
    setInput(DEFAULTS);
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
