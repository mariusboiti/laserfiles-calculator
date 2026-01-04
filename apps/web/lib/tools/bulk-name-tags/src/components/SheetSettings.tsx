import type { SheetLayoutConfig, UnitSystem } from '../types';

interface SheetSettingsProps {
  config: SheetLayoutConfig;
  onChange: (config: SheetLayoutConfig) => void;
  unitSystem: UnitSystem;
}

export function SheetSettings({ config, onChange, unitSystem }: SheetSettingsProps) {
  const updateConfig = (updates: Partial<SheetLayoutConfig>) => {
    onChange({ ...config, ...updates });
  };

  const mmToIn = (mm: number) => mm / 25.4;
  const inToMm = (inch: number) => inch * 25.4;
  const toDisplay = (mm: number) => (unitSystem === 'in' ? mmToIn(mm) : mm);
  const fromDisplay = (value: number) => (unitSystem === 'in' ? inToMm(value) : value);

  const sheetMin = unitSystem === 'in' ? 2 : 50;
  const sheetMax = unitSystem === 'in' ? 80 : 2000;
  const sheetStep = unitSystem === 'in' ? '0.1' : '1';
  const spacingMax = unitSystem === 'in' ? 2 : 50;
  const spacingStep = unitSystem === 'in' ? '0.01' : '0.5';
  const marginMin = 0;
  const marginMax = unitSystem === 'in' ? 2 : 50;
  const marginStep = unitSystem === 'in' ? '0.01' : '0.5';

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Layout Settings</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Output Mode
          </label>
          <select
            value={config.outputMode}
            onChange={(e) => updateConfig({ outputMode: e.target.value as 'sheet' | 'separate' })}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="sheet">Single Sheet SVG (Grid Layout)</option>
            <option value="separate">Separate SVG per Name (ZIP)</option>
          </select>
        </div>

        {config.outputMode === 'sheet' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Sheet Width ({unitSystem})
                </label>
                <input
                  type="number"
                  min={sheetMin}
                  max={sheetMax}
                  step={sheetStep}
                  value={Number(toDisplay(config.sheetWidth).toFixed(unitSystem === 'in' ? 3 : 1))}
                  onChange={(e) => updateConfig({ sheetWidth: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Sheet Height ({unitSystem})
                </label>
                <input
                  type="number"
                  min={sheetMin}
                  max={sheetMax}
                  step={sheetStep}
                  value={Number(toDisplay(config.sheetHeight).toFixed(unitSystem === 'in' ? 3 : 1))}
                  onChange={(e) => updateConfig({ sheetHeight: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Horizontal Spacing ({unitSystem})
                </label>
                <input
                  type="number"
                  min="0"
                  max={spacingMax}
                  step={spacingStep}
                  value={Number(toDisplay(config.horizontalSpacing).toFixed(unitSystem === 'in' ? 3 : 2))}
                  onChange={(e) => updateConfig({ horizontalSpacing: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Vertical Spacing ({unitSystem})
                </label>
                <input
                  type="number"
                  min="0"
                  max={spacingMax}
                  step={spacingStep}
                  value={Number(toDisplay(config.verticalSpacing).toFixed(unitSystem === 'in' ? 3 : 2))}
                  onChange={(e) => updateConfig({ verticalSpacing: fromDisplay(Number(e.target.value)) })}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Margin ({unitSystem})
              </label>
              <input
                type="number"
                min={marginMin}
                max={marginMax}
                step={marginStep}
                value={Number(toDisplay(config.margin).toFixed(unitSystem === 'in' ? 3 : 2))}
                onChange={(e) => updateConfig({ margin: fromDisplay(Number(e.target.value)) })}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Rotation
              </label>
              <select
                value={config.rotation}
                onChange={(e) => updateConfig({ rotation: Number(e.target.value) as 0 | 90 })}
                className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="0">0° (No Rotation)</option>
                <option value="90">90° (Rotated)</option>
              </select>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={!!config.fillToCapacity}
                onChange={(e) => updateConfig({ fillToCapacity: e.target.checked })}
                className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
              />
              <span>
                Fill sheet to capacity (repeat names)
              </span>
            </label>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <label className="flex items-start gap-2 text-sm text-slate-300 mb-3">
                <input
                  type="checkbox"
                  checked={!!config.manualGridEnabled}
                  onChange={(e) => updateConfig({ manualGridEnabled: e.target.checked })}
                  className="h-4 w-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
                />
                <span>
                  Specify grid manually (columns × rows)
                </span>
              </label>

              {config.manualGridEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Columns
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.manualColumns ?? 2}
                      onChange={(e) => updateConfig({ manualColumns: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Rows
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.manualRows ?? 2}
                      onChange={(e) => updateConfig({ manualRows: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-950 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
