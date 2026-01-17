/**
 * ResizeControls Component
 * 
 * Controls for setting output dimensions in mm with DPI selection.
 * Displays computed pixel dimensions and LightBurn line interval helper.
 */

import { useCallback, useMemo } from 'react';
import { Maximize2, Lock, Unlock, Info } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { DPI_OPTIONS } from '../../types';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function ResizeControls() {
  const { 
    resizeState, 
    setResizeWidth, 
    setResizeHeight, 
    setResizeDpi,
    toggleLockAspectRatio 
  } = useImageStore();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const mmToInch = 1 / 25.4;
  const widthPx = Math.round(resizeState.widthMm * mmToInch * resizeState.dpi);
  const heightPx = Math.round(resizeState.heightMm * mmToInch * resizeState.dpi);
  const dpiOptions = useMemo(() => DPI_OPTIONS.map((option) => ({
    ...option,
    label: t(`engraveprep.resize.dpi.${option.value}.label`),
    description: t(`engraveprep.resize.dpi.${option.value}.description`),
  })), [t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Maximize2 className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-300">{t('engraveprep.resize.title')}</h3>
      </div>

      {/* Width */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('engraveprep.resize.width')}</label>
        <input
          type="number"
          value={resizeState.widthMm}
          onChange={(e) => setResizeWidth(Number(e.target.value))}
          step="1"
          min="50"
          max="5000"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white
                     focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Lock aspect ratio */}
      <div className="flex items-center justify-center">
        <button
          onClick={toggleLockAspectRatio}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title={resizeState.lockAspectRatio
            ? t('engraveprep.resize.unlock_aspect')
            : t('engraveprep.resize.lock_aspect')}
        >
          {resizeState.lockAspectRatio ? (
            <Lock className="w-4 h-4 text-blue-400" />
          ) : (
            <Unlock className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Height */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">{t('engraveprep.resize.height')}</label>
        <input
          type="number"
          value={resizeState.heightMm}
          onChange={(e) => setResizeHeight(Number(e.target.value))}
          step="1"
          min="50"
          max="5000"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white
                     focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* DPI Selection */}
      <div>
        <label className="text-xs text-gray-400 block mb-2">{t('engraveprep.resize.dpi_label')}</label>
        <div className="space-y-1">
          {dpiOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setResizeDpi(option.value)}
              className={`w-full px-3 py-2 rounded text-left text-sm transition-colors ${
                resizeState.dpi === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs opacity-75">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Computed pixel dimensions */}
      <div className="pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-1">{t('engraveprep.resize.output_dimensions')}</div>
        <div className="text-sm text-white font-mono">
          {widthPx} × {heightPx} px
        </div>
      </div>

      {/* LightBurn Helper */}
      <div className="pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-400" />
          <div className="text-xs font-semibold text-gray-300">{t('engraveprep.resize.lightburn.title')}</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/50 rounded p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">{t('engraveprep.resize.lightburn.line_interval')}</span>
            <span className="text-sm text-blue-300 font-mono font-semibold">
              {(25.4 / resizeState.dpi).toFixed(3)} mm
            </span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            {t('engraveprep.resize.lightburn.helper')}
          </p>
        </div>
      </div>
    </div>
  );
}
