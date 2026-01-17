/**
 * Preview Mode Selector Component
 * 
 * Toggle between Before/After/Split view modes
 */

import { useCallback } from 'react';
import { useImageStore } from '../store/useImageStore';
import { PreviewMode } from '../types';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function PreviewModeSelector() {
  const { previewMode, setPreviewMode } = useImageStore();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const modes: { value: PreviewMode; label: string }[] = [
    { value: 'before', label: t('engraveprep.preview.before') },
    { value: 'after', label: t('engraveprep.preview.after') },
    { value: 'split', label: t('engraveprep.preview.split') },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-0.5 bg-[#2a2d44] rounded-md p-0.5 shadow-lg">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setPreviewMode(mode.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            previewMode === mode.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1e2139]'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
