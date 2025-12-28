/**
 * Preview Mode Selector Component
 * 
 * Toggle between Before/After/Split view modes
 */

import { useImageStore } from '../store/useImageStore';
import { PreviewMode } from '../types';

export function PreviewModeSelector() {
  const { previewMode, setPreviewMode } = useImageStore();

  const modes: { value: PreviewMode; label: string }[] = [
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'split', label: 'Split' },
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
