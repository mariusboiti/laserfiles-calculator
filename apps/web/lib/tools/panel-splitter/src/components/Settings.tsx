import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
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
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

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
      <h2 className="text-lg font-semibold text-slate-100">{t('common.settings')}</h2>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t('panel_splitter.settings.quick_presets')}</h3>
        <div className="flex flex-wrap gap-2">
          {BED_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              title={t(preset.descriptionKey)}
            >
              {t(preset.nameKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">{t('panel_splitter.settings.bed_size')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label={t('panel_splitter.settings.bed_width_label')}
            field="bedWidth" 
            value={settings.bedWidth}
            tooltip={t('panel_splitter.settings.bed_width_tooltip')}
            min={10}
            error={getError('bedWidth')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
          <NumberInput
            label={t('panel_splitter.settings.bed_height_label')}
            field="bedHeight" 
            value={settings.bedHeight}
            tooltip={t('panel_splitter.settings.bed_height_tooltip')}
            min={10}
            error={getError('bedHeight')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label={t('panel_splitter.settings.margin_label')}
            field="margin" 
            value={settings.margin}
            tooltip={t('panel_splitter.settings.margin_tooltip')}
            min={0}
            error={getError('margin')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
          <NumberInput
            label={t('panel_splitter.settings.overlap_label')}
            field="overlap" 
            value={settings.overlap}
            tooltip={t('panel_splitter.settings.overlap_tooltip')}
            min={0}
            error={getError('overlap')}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
        </div>
      </div>

      {/* Unit System Toggle */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">{t('panel_splitter.settings.unit_system')}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateSetting('unitSystem', 'mm')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              settings.unitSystem === 'mm'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {t('panel_splitter.units.millimeters')}
          </button>
          <button
            onClick={() => updateSetting('unitSystem', 'in')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              settings.unitSystem === 'in'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {t('panel_splitter.units.inches')}
          </button>
        </div>
      </div>

      {/* Tile Offset Controls */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">{t('panel_splitter.settings.tile_offset_title')}</h3>
        <p className="text-xs text-slate-400">{t('panel_splitter.settings.tile_offset_desc')}</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label={t('panel_splitter.settings.offset_x_label')}
            field="tileOffsetX"
            value={settings.tileOffsetX}
            tooltip={t('panel_splitter.settings.offset_x_tooltip')}
            min={-100}
            max={100}
            step={0.5}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
          <NumberInput
            label={t('panel_splitter.settings.offset_y_label')}
            field="tileOffsetY"
            value={settings.tileOffsetY}
            tooltip={t('panel_splitter.settings.offset_y_tooltip')}
            min={-100}
            max={100}
            step={0.5}
            onValueChange={(field, value) => updateSetting(field, value as any)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">{t('panel_splitter.settings.export_mode')}</h3>
        
        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800/60 transition-colors">
          <input
            type="radio"
            name="exportMode"
            checked={settings.exportMode === 'laser-safe'}
            onChange={() => updateSetting('exportMode', 'laser-safe' as ExportMode)}
            className="mt-1"
          />
          <div>
            <span className="font-medium text-slate-200">{t('panel_splitter.settings.export_mode_laser_safe_title')}</span>
            <p className="text-sm text-slate-400">
              {t('panel_splitter.settings.export_mode_laser_safe_desc')}
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
            <span className="font-medium text-slate-200">{t('panel_splitter.settings.export_mode_fast_clip_title')}</span>
            <p className="text-sm text-slate-400">
              {t('panel_splitter.settings.export_mode_fast_clip_desc')}
            </p>
          </div>
        </label>

        {settings.exportMode === 'fast-clip' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            ⚠️ <strong>{t('panel_splitter.settings.export_mode_warning_label')}</strong> {t('panel_splitter.settings.export_mode_warning_body')}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">{t('panel_splitter.settings.numbering_title')}</h3>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.numberingEnabled}
            onChange={(e) => updateSetting('numberingEnabled', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.numbering_enable')}</span>
        </label>

        {settings.numberingEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">{t('panel_splitter.settings.numbering_format_label')}</label>
              <select
                value={settings.numberingFormat}
                onChange={(e) => updateSetting('numberingFormat', e.target.value as NumberingFormat)}
                className="input-field"
              >
                <option value="panel_{row}{col}">{t('panel_splitter.settings.numbering_format_panel_recommended')}</option>
                <option value="R01C01">{t('panel_splitter.settings.numbering_format_r01c01')}</option>
                <option value="01-01">{t('panel_splitter.settings.numbering_format_01_01')}</option>
                <option value="Tile_001">{t('panel_splitter.settings.numbering_format_tile_001')}</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.startIndexAtOne}
                onChange={(e) => updateSetting('startIndexAtOne', e.target.checked)}
                className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
              />
              <span className="text-sm text-slate-200">{t('panel_splitter.settings.start_index_at_one')}</span>
            </label>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">{t('common.options')}</h3>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.guidesEnabled}
            onChange={(e) => updateSetting('guidesEnabled', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.guides_enabled')}</span>
          <Tooltip content={t('panel_splitter.settings.guides_enabled_tooltip')} />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.boundaryRectEnabled}
            onChange={(e) => updateSetting('boundaryRectEnabled', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.boundary_rect_enabled')}</span>
          <Tooltip content={t('panel_splitter.settings.boundary_rect_enabled_tooltip')} />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.expandStrokes}
            onChange={(e) => updateSetting('expandStrokes', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.expand_strokes')}</span>
          <Tooltip content={t('panel_splitter.settings.expand_strokes_tooltip')} />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.exportEmptyTiles}
            onChange={(e) => updateSetting('exportEmptyTiles', e.target.checked)}
            className="w-4 h-4 text-sky-500 focus:ring-sky-500 border-slate-700 bg-slate-950 rounded"
          />
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.export_empty_tiles')}</span>
        </label>

        <div>
          <label className="flex items-center text-sm font-medium text-slate-200 mb-1">
            {t('panel_splitter.settings.simplify_tolerance_label')}
            <Tooltip content={t('panel_splitter.settings.simplify_tolerance_tooltip')} />
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
            <span>{t('panel_splitter.settings.simplify_tolerance_off')}</span>
            <span>{settings.simplifyTolerance.toFixed(1)} {t('panel_splitter.units.mm')}</span>
            <span>{t('panel_splitter.settings.simplify_tolerance_max')}</span>
          </div>
        </div>
      </div>

      {/* Registration Marks Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">
          {t('panel_splitter.settings.registration_marks_title')}
          <Tooltip content={t('panel_splitter.settings.registration_marks_tooltip')} />
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
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.registration_marks_enable')}</span>
        </label>

        {settings.registrationMarks.enabled && (
          <div className="space-y-3 pl-6 border-l-2 border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">{t('panel_splitter.settings.registration_marks_mark_type')}</label>
              <select
                value={settings.registrationMarks.type}
                onChange={(e) => updateSetting('registrationMarks', {
                  ...settings.registrationMarks,
                  type: e.target.value as RegistrationMarkType
                })}
                className="input-field"
              >
                <option value="crosshair">{t('panel_splitter.settings.registration_marks_mark_type_crosshair')}</option>
                <option value="pinhole">{t('panel_splitter.settings.registration_marks_mark_type_pinhole')}</option>
                <option value="lmark">{t('panel_splitter.settings.registration_marks_mark_type_lmark')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">{t('panel_splitter.settings.registration_marks_placement')}</label>
              <select
                value={settings.registrationMarks.placement}
                onChange={(e) => updateSetting('registrationMarks', {
                  ...settings.registrationMarks,
                  placement: e.target.value as MarkPlacement
                })}
                className="input-field"
              >
                <option value="inside">{t('panel_splitter.settings.registration_marks_placement_inside')}</option>
                <option value="overlap">{t('panel_splitter.settings.registration_marks_placement_overlap')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  {t('panel_splitter.settings.registration_marks_mark_size')}
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
                  {t('panel_splitter.settings.registration_marks_stroke_width')}
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
                  {t('panel_splitter.settings.registration_marks_hole_diameter')}
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
          {t('panel_splitter.settings.assembly_map_title')}
          <Tooltip content={t('panel_splitter.settings.assembly_map_tooltip')} />
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
          <span className="text-sm text-slate-200">{t('panel_splitter.settings.assembly_map_include_in_export')}</span>
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
              <span className="text-sm text-slate-200">{t('panel_splitter.settings.assembly_map_include_labels')}</span>
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
              <span className="text-sm text-slate-200">{t('panel_splitter.settings.assembly_map_include_thumbnails')}</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
