/**
 * User Presets Panel Component
 * 
 * Allows users to save/load/delete custom presets
 * Persisted to localStorage
 */

import { useState, useEffect } from 'react';
import { Save, Trash2, Download } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';

export function UserPresetsPanel() {
  const [presetName, setPresetName] = useState('');
  const { userPresets, saveUserPreset, loadUserPreset, deleteUserPreset, loadUserPresetsFromStorage } = useImageStore();

  // Load presets from localStorage on mount
  useEffect(() => {
    loadUserPresetsFromStorage();
  }, [loadUserPresetsFromStorage]);

  const handleSave = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    saveUserPreset(presetName.trim());
    setPresetName('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300">My Presets</h3>

      {/* Save new preset */}
      <div className="flex gap-2">
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Preset name..."
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm
                     placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          title="Save current settings as preset"
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
                title="Load this preset"
              >
                <Download className="w-3 h-3 inline mr-1" />
                {preset.name}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete preset "${preset.name}"?`)) {
                    deleteUserPreset(preset.id);
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete preset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">
          No saved presets yet. Save your current settings to create one.
        </p>
      )}
    </div>
  );
}
