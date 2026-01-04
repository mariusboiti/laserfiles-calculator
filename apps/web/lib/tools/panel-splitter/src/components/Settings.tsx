import { Settings as SettingsType, ExportMode, NumberingFormat, ValidationError, RegistrationMarkType, MarkPlacement } from '../types';
import { Tooltip } from './Tooltip';
import { BED_PRESETS } from '../../config/defaults';

interface SettingsProps {
  settings: SettingsType;
  onChange: (settings: SettingsType) => void;
  errors: ValidationError[];
}

interface NumberInputProps {
  label: string;
  field: keyof SettingsType;
  value: number;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  onValueChange: (field: keyof SettingsType, value: number) => void;
}

function NumberInput({
  label,
  field,
  value,
  tooltip,
  min = 0,
  max,
  step = 1,
  error,
  onValueChange,
}: NumberInputProps) {
  return (
    <div>
      <label className="flex items-center text-sm font-medium text-slate-200 mb-1">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(field, parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className={`input-field ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Settings({ settings, onChange, errors }: SettingsProps) {
  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const updateSetting = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    onChange({ ...settings, [key]: value });
  };

  const applyPreset = (preset: typeof BED_PRESETS[0]) => {
    onChange({
      ...settings,
      bedWidth: preset.bedWidth,
      bedHeight: preset.bedHeight,
    });
  };

  return (
    <div className="card space-y-6">
      <h2 className="text-lg font-semibold text-slate-100">Settings</h2>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {BED_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Bed Size</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Width (mm)" 
            field="bedWidth" 
            value={settings.bedWidth}
            tooltip="Width of your laser bed in millimeters"
            min={10}
            error={getError('bedWidth')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
          <NumberInput
            label="Height (mm)" 
            field="bedHeight" 
            value={settings.bedHeight}
            tooltip="Height of your laser bed in millimeters"
            min={10}
            error={getError('bedHeight')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Margin (mm)" 
            field="margin" 
            value={settings.margin}
            tooltip="Safe margin around each tile edge"
            min={0}
            error={getError('margin')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
          <NumberInput
            label="Overlap (mm)" 
            field="overlap" 
            value={settings.overlap}
            tooltip="How much adjacent tiles overlap. Useful for alignment or seamless patterns."
            min={0}
            error={getError('overlap')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
        </div>
      </div>

      {/* Unit System Toggle */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Unit System</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateSetting('unitSystem', 'mm')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              settings.unitSystem === 'mm'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Millimeters (mm)
          </button>
          <button
            onClick={() => updateSetting('unitSystem', 'in')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              settings.unitSystem === 'in'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Inches (in)
          </button>
        </div>
      </div>

      {/* Tile Offset Controls */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Tile Offset (Advanced)</h3>
        <p className="text-xs text-slate-400">Shift the tile grid to avoid seams in critical areas</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Offset X (mm)"
            field="tileOffsetX"
            value={settings.tileOffsetX}
            tooltip="Horizontal offset for tile grid positioning"
            min={-100}
            max={100}
            step={0.5}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
          <NumberInput
            label="Offset Y (mm)"
            field="tileOffsetY"
            value={settings.tileOffsetY}
            tooltip="Vertical offset for tile grid positioning"
            min={-100}
            max={100}
            step={0.5}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Export Mode</h3>
        
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/60 transition-colors">
          <input
            type="radio"
            name="exportMode"
            checked={settings.exportMode === 'laser-safe'}
            onChange={() => updateSetting('exportMode', 'laser-safe' as ExportMode)}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-200">Laser-Safe Trim</span>
            <p className="text-sm text-slate-400">
              Real geometry trimming using boolean operations. Recommended for all laser software.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/60 transition-colors">
          <input
            type="radio"
            name="exportMode"
            checked={settings.exportMode === 'fast-clip'}
            onChange={() => updateSetting('exportMode', 'fast-clip' as ExportMode)}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-200">Fast Clip</span>
            <p className="text-sm text-slate-400">
              Uses clipPath (faster but may not work in all laser software).
            </p>
          </div>
        </label>

        {settings.exportMode === 'fast-clip' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            ⚠️ <strong>Warning:</strong> Some laser software ignores clip paths. Use Laser-Safe Trim for reliable cutting.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Numbering</h3>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.numberingEnabled}
            onChange={(e) => updateSetting('numberingEnabled', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Enable tile numbering</span>
        </label>

        {settings.numberingEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Format</label>
              <select
                value={settings.numberingFormat}
                onChange={(e) => updateSetting('numberingFormat', e.target.value as NumberingFormat)}
                className="input-field"
              >
                <option value="panel_{row}{col}">panel_A1 (Recommended)</option>
                <option value="R01C01">R01C01 (Row-Column)</option>
                <option value="01-01">01-01 (Row-Column)</option>
                <option value="Tile_001">Tile_001 (Sequential)</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.startIndexAtOne}
                onChange={(e) => updateSetting('startIndexAtOne', e.target.checked)}
                className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
              />
              <span className="text-sm text-slate-200">Start index at 1 (R01C01 vs R00C00)</span>
            </label>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Options</h3>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.guidesEnabled}
            onChange={(e) => updateSetting('guidesEnabled', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Add alignment guides</span>
          <Tooltip content="Adds tile border rectangle and corner crosshair marks for alignment" />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.boundaryRectEnabled}
            onChange={(e) => updateSetting('boundaryRectEnabled', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Add tile boundary rectangle</span>
          <Tooltip content="Adds a rectangle layer showing exact tile boundaries for alignment in laser software" />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.expandStrokes}
            onChange={(e) => updateSetting('expandStrokes', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Expand strokes</span>
          <Tooltip content="Convert strokes to outlines before trimming. Enable if thick strokes are getting cut off." />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.exportEmptyTiles}
            onChange={(e) => updateSetting('exportEmptyTiles', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Export empty tiles</span>
        </label>

        <div>
          <label className="flex items-center text-sm font-medium text-slate-200 mb-1">
            Simplify tolerance (mm)
            <Tooltip content="Reduce path complexity after trimming. Higher values = simpler paths but less accuracy. Use 0 for no simplification." />
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={settings.simplifyTolerance}
            onChange={(e) => updateSetting('simplifyTolerance', parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0 (off)</span>
            <span>{settings.simplifyTolerance.toFixed(1)} mm</span>
            <span>2 mm</span>
          </div>
        </div>
      </div>

      {/* Registration Marks Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
          Registration Marks
          <Tooltip content="Add alignment marks to each tile for precise assembly of adjacent pieces" />
        </h3>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.registrationMarks.enabled}
            onChange={(e) => updateSetting('registrationMarks', { 
              ...settings.registrationMarks, 
              enabled: e.target.checked 
            })}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Enable registration marks</span>
        </label>

        {settings.registrationMarks.enabled && (
          <div className="space-y-3 pl-6 border-l-2 border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Mark Type</label>
              <select
                value={settings.registrationMarks.type}
                onChange={(e) => updateSetting('registrationMarks', {
                  ...settings.registrationMarks,
                  type: e.target.value as RegistrationMarkType
                })}
                className="input-field"
              >
                <option value="crosshair">Corner Crosshair (thin lines)</option>
                <option value="pinhole">Pin Holes (small circles)</option>
                <option value="lmark">L-Marks (90° marks)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Placement</label>
              <select
                value={settings.registrationMarks.placement}
                onChange={(e) => updateSetting('registrationMarks', {
                  ...settings.registrationMarks,
                  placement: e.target.value as MarkPlacement
                })}
                className="input-field"
              >
                <option value="inside">Inside tile (within margin)</option>
                <option value="overlap">On overlap area</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Mark Size (mm)
                </label>
                <input
                  type="number"
                  value={settings.registrationMarks.size}
                  onChange={(e) => updateSetting('registrationMarks', {
                    ...settings.registrationMarks,
                    size: parseFloat(e.target.value) || 6
                  })}
                  min={1}
                  max={20}
                  step={0.5}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Stroke Width (mm)
                </label>
                <input
                  type="number"
                  value={settings.registrationMarks.strokeWidth}
                  onChange={(e) => updateSetting('registrationMarks', {
                    ...settings.registrationMarks,
                    strokeWidth: parseFloat(e.target.value) || 0.2
                  })}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="input-field"
                />
              </div>
            </div>

            {settings.registrationMarks.type === 'pinhole' && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Hole Diameter (mm)
                </label>
                <input
                  type="number"
                  value={settings.registrationMarks.holeDiameter}
                  onChange={(e) => updateSetting('registrationMarks', {
                    ...settings.registrationMarks,
                    holeDiameter: parseFloat(e.target.value) || 2
                  })}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="input-field"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assembly Map Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
          Assembly Map
          <Tooltip content="Generate an overview map showing all tiles and their positions for easy assembly" />
        </h3>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.assemblyMap.enabled}
            onChange={(e) => updateSetting('assemblyMap', { 
              ...settings.assemblyMap, 
              enabled: e.target.checked 
            })}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">Include assembly map in export</span>
        </label>

        {settings.assemblyMap.enabled && (
          <div className="space-y-3 pl-6 border-l-2 border-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.assemblyMap.includeLabels}
                onChange={(e) => updateSetting('assemblyMap', {
                  ...settings.assemblyMap,
                  includeLabels: e.target.checked
                })}
                className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
              />
              <span className="text-sm text-slate-200">Include tile labels on map</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.assemblyMap.includeThumbnails}
                onChange={(e) => updateSetting('assemblyMap', {
                  ...settings.assemblyMap,
                  includeThumbnails: e.target.checked
                })}
                className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
              />
              <span className="text-sm text-slate-200">Include tile thumbnails (larger file)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
