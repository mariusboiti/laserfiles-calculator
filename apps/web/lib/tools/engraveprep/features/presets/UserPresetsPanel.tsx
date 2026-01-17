/**
 * User Presets Panel Component
 * 
 * Allows users to save/load/delete custom presets
 * Persisted to localStorage
 */

import { useCallback, useEffect, useState } from 'react';
import { Save, Trash2, Download } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

const formatMessage = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);

export function UserPresetsPanel() {
  const [presetName, setPresetName] = useState('');
  const { userPresets, saveUserPreset, loadUserPreset, deleteUserPreset, loadUserPresetsFromStorage } = useImageStore();
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  // Load presets from localStorage on mount
  useEffect(() => {
    loadUserPresetsFromStorage();
  }, [loadUserPresetsFromStorage]);

  const handleSave = () => {
    if (!presetName.trim()) {
      alert(t('engraveprep.user_presets.alert_missing_name'));
      return;
    }
    saveUserPreset(presetName.trim());
    setPresetName('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">{t('engraveprep.user_presets.title')}</h3>

      {/* Save new preset */}
      <div className="flex gap-2">
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder={t('engraveprep.user_presets.placeholder')}
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm
                     placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title={t('engraveprep.user_presets.save_title')}
        >
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Preset list */}
      {userPresets.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {userPresets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              <button
                onClick={() => loadUserPreset(preset.id)}
                className="flex-1 text-left text-sm text-white hover:text-blue-400 transition-colors"
                title={t('engraveprep.user_presets.load_title')}
              >
                <Download className="w-3 h-3 inline mr-1" />
                {preset.name}
              </button>
              <button
                onClick={() => {
                  if (confirm(formatMessage(t('engraveprep.user_presets.delete_confirm'), { name: preset.name }))) {
                    deleteUserPreset(preset.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title={t('engraveprep.user_presets.delete_title')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">
          {t('engraveprep.user_presets.empty')}
        </p>
      )}
    </div>
  );
}
