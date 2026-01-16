'use client';

/**
 * Curved Text Controls for Round Coaster PRO
 * Configure arc text for top and bottom of coasters
 */

import React from 'react';
import { Type, RotateCcw } from 'lucide-react';
import { FontPicker } from './FontPicker';
import type { FontId } from '../../../../fonts/sharedFontRegistry';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export interface CurvedTextConfig {
  enabled: boolean;
  text: string;
  radius: number; // percentage of shape radius
  fontSize: number; // mm
  letterSpacing: number; // mm
  startAngle: number; // degrees offset from center
  flip: boolean;
  fontId: FontId;
}

interface CurvedTextControlsProps {
  position: 'top' | 'bottom' | 'center';
  config: CurvedTextConfig;
  onChange: (config: CurvedTextConfig) => void;
  maxRadius: number; // max radius in mm for slider
  disabled?: boolean;
  hideTextInput?: boolean;
}

export function CurvedTextControls({
  position,
  config,
  onChange,
  maxRadius,
  disabled,
  hideTextInput,
}: CurvedTextControlsProps) {
  const { locale } = useLanguage();
  const t = React.useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const label = position === 'top'
    ? t('round_coaster.curved.top_arc')
    : position === 'bottom'
      ? t('round_coaster.curved.bottom_arc')
      : t('round_coaster.curved.center_arc');

  const update = (partial: Partial<CurvedTextConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            disabled={disabled}
            className="w-3.5 h-3.5 rounded"
          />
          <span className="text-[11px] text-slate-300">{label}</span>
        </label>
        {config.enabled && (
          <button
            type="button"
            onClick={() => update({ flip: !config.flip })}
            disabled={disabled}
            className={`p-1 rounded ${config.flip ? 'bg-sky-600' : 'bg-slate-800 hover:bg-slate-700'}`}
            title={t('round_coaster.curved.flip_text')}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>

      {config.enabled && (
        <div className="space-y-2 pl-5">
          {/* Text input */}
          {!hideTextInput && (
            <input
              type="text"
              value={config.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder={`${label}...`}
              disabled={disabled}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
            />
          )}

          {/* Font picker */}
          <FontPicker
            value={config.fontId}
            onChange={(fontId) => update({ fontId })}
            disabled={disabled}
          />

          {/* Radius (distance from center) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-14">{t('round_coaster.curved.radius')}</span>
            <input
              type="range"
              min="50"
              max="95"
              value={config.radius}
              onChange={(e) => update({ radius: parseInt(e.target.value) })}
              disabled={disabled}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-slate-400 w-8">{config.radius}%</span>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-14">{t('round_coaster.curved.size')}</span>
            <input
              type="number"
              min="1"
              max="100"
              step="0.5"
              value={config.fontSize}
              onChange={(e) => update({ fontSize: parseFloat(e.target.value) || 5 })}
              disabled={disabled}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-center"
            />
            <span className="text-[10px] text-slate-400 w-8">mm</span>
          </div>

          {/* Letter spacing */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-14">{t('round_coaster.curved.spacing')}</span>
            <input
              type="number"
              min="-5"
              max="20"
              step="0.1"
              value={config.letterSpacing}
              onChange={(e) => update({ letterSpacing: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-center"
            />
            <span className="text-[10px] text-slate-400 w-8">mm</span>
          </div>

          {/* Angle offset */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-14">{t('round_coaster.curved.offset')}</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={config.startAngle}
              onChange={(e) => update({ startAngle: parseInt(e.target.value) })}
              disabled={disabled}
              className="flex-1 h-1"
            />
            <span className="text-[10px] text-slate-400 w-12">{config.startAngle}°</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const DEFAULT_CURVED_TEXT_CONFIG: CurvedTextConfig = {
  enabled: false,
  text: '',
  radius: 75,
  fontSize: 5,
  letterSpacing: 0.5,
  startAngle: 0,
  flip: false,
  fontId: 'Milkshake',
};

export default CurvedTextControls;
