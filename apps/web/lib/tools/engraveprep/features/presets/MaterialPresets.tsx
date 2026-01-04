/**
 * MaterialPresets Component
 * 
 * One-click material preset buttons that apply optimized settings
 * for different engraving materials.
 * Uses centralized preset configuration.
 */

import { Layers } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { MATERIAL_PRESET_CONFIG } from './presetConfig';
import type { MaterialPresetConfig } from './presetConfig';

export function MaterialPresets() {
  const { applyPreset } = useImageStore();

  // Safety check: ensure MATERIAL_PRESET_CONFIG is defined
  if (!MATERIAL_PRESET_CONFIG || !Array.isArray(MATERIAL_PRESET_CONFIG)) {
    console.error('MATERIAL_PRESET_CONFIG is not properly loaded');
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Material Presets
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {MATERIAL_PRESET_CONFIG.map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyPreset({
              brightness: preset.settings.brightness,
              contrast: preset.settings.contrast,
              gamma: preset.settings.gamma,
              invert: preset.settings.invert,
              ditherMode: preset.settings.ditherMethod,
            })}
            className="p-2.5 bg-[#1e2139] hover:bg-[#252945] rounded-md text-left 
                       transition-colors group border border-gray-700/50"
            title={preset.description}
          >
            <div className="text-sm font-medium text-gray-100 group-hover:text-blue-400 
                            transition-colors">
              {preset.label}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {preset.description}
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 italic">
        Material presets apply optimized settings for different materials.
      </p>
    </div>
  );
}

export default MaterialPresets;
