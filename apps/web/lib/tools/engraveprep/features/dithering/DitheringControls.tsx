/**
 * DitheringControls Component
 * 
 * Selection of dithering algorithms for laser engraving.
 */

import { Palette } from 'lucide-react';
import { useImageStore } from '../../store/useImageStore';
import { DitherMode } from '../../types';

const DITHER_OPTIONS: { mode: DitherMode; label: string; description: string }[] = [
  { mode: 'none', label: 'None', description: 'Grayscale only' },
  { mode: 'floyd-steinberg', label: 'Floyd-Steinberg', description: 'Classic dithering' },
  { mode: 'atkinson', label: 'Atkinson', description: 'Higher contrast' },
];

export function DitheringControls() {
  const { ditherMode, setDitherMode } = useImageStore();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        <Palette className="w-4 h-4" />
        Dithering
      </h3>

      <div className="space-y-2">
        {DITHER_OPTIONS.map((option) => (
          <button
            key={option.mode}
            onClick={() => setDitherMode(option.mode)}
            className={`w-full px-3 py-2 rounded text-left text-sm transition-colors ${
              ditherMode === option.mode
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
  );
}
