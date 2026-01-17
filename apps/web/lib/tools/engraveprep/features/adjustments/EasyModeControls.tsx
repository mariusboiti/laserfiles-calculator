/**
 * Easy Mode Controls Component
 * 
 * Simplified interface with single "Detail vs Clean" slider (1-5)
 * Replaces manual brightness/contrast/gamma/dither controls
 */

import { useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { EasyModeLevel } from '../../types';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function EasyModeControls() {
  const { easyMode, easyModeLevel, toggleEasyMode, setEasyModeLevel } = useImageStore();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  return (
    <div className="space-y-4">
      {/* Easy Mode Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <label className="text-sm font-semibold text-gray-300">{t('engraveprep.easy_mode.title')}</label>
        </div>
        <button
          onClick={toggleEasyMode}
          className={`w-11 h-6 rounded-full transition-colors ${
            easyMode ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            easyMode ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Detail vs Clean Slider (only shown when Easy Mode is ON) */}
      {easyMode && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-300">{t('engraveprep.easy_mode.detail_vs_clean')}</label>
            <span className="text-sm text-blue-400 font-medium">
              {t(`engraveprep.easy_mode.level_${easyModeLevel}`)}
            </span>
          </div>
          
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={easyModeLevel}
            onChange={(e) => setEasyModeLevel(parseInt(e.target.value) as EasyModeLevel)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:bg-blue-500
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-moz-range-thumb]:w-4
                       [&::-moz-range-thumb]:h-4
                       [&::-moz-range-thumb]:bg-blue-500
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0
                       [&::-moz-range-thumb]:cursor-pointer"
          />
          
          {/* Labels */}
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{t('engraveprep.easy_mode.scale.clean')}</span>
            <span>{t('engraveprep.easy_mode.scale.detailed')}</span>
          </div>
          
          <p className="text-xs text-gray-500 mt-3 italic">
            {t('engraveprep.easy_mode.description')}
          </p>
        </div>
      )}
    </div>
  );
}
