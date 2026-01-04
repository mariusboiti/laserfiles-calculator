'use client';

import { MODES, type Mode } from '@/lib/multilayer/modes';

interface ModeSelectorProps {
  selectedMode: Mode;
  onSelectMode: (mode: Mode) => void;
}

export function ModeSelector({ selectedMode, onSelectMode }: ModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 mb-3">Choose Mode</h3>
        <p className="text-sm text-slate-400 mb-4">
          Each mode provides optimized defaults for different use cases
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(MODES) as Mode[]).map(mode => {
          const config = MODES[mode];
          const isSelected = selectedMode === mode;
          
          return (
            <button
              key={mode}
              onClick={() => onSelectMode(mode)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
                }
              `}
            >
              <div className="text-2xl mb-2">{config.icon}</div>
              <div className="font-semibold text-slate-100 mb-1">
                {config.name}
              </div>
              <div className="text-xs text-slate-400 line-clamp-2">
                {config.description}
              </div>
              {isSelected && (
                <div className="mt-2 text-xs text-sky-400 font-medium">
                  ✓ Selected
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode Details */}
      <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800">
        <div className="text-sm font-medium text-slate-200 mb-2">
          {MODES[selectedMode].name} Settings
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div>Layers: {MODES[selectedMode].defaults.layerCount}</div>
          <div>Method: {MODES[selectedMode].defaults.quantizeMethod}</div>
          <div>Material: {MODES[selectedMode].defaults.materialThicknessMm}mm</div>
          <div>Bridges: {MODES[selectedMode].defaults.autoBridges ? 'Auto' : 'Manual'}</div>
        </div>
        {MODES[selectedMode].recommendedMaterials.length > 0 && (
          <div className="mt-2 text-xs text-slate-400">
            <span className="font-medium">Recommended:</span>{' '}
            {MODES[selectedMode].recommendedMaterials.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
