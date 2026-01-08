'use client';

import React from 'react';
import { Tag, Smile } from 'lucide-react';
import type { KeychainModeId } from '../types';
import { MODE_LIST } from '../modes';

interface ModeSelectorProps {
  activeMode: KeychainModeId;
  onModeChange: (mode: KeychainModeId) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'tag': <Tag className="w-5 h-5" />,
  'smile': <Smile className="w-5 h-5" />,
};

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400 font-medium">Keychain Type</label>
      <div className="grid grid-cols-2 gap-2">
        {MODE_LIST.map(mode => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              activeMode === mode.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className={`p-2 rounded ${activeMode === mode.id ? 'bg-blue-500' : 'bg-slate-700'}`}>
              {ICON_MAP[mode.icon] || <Tag className="w-5 h-5" />}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">{mode.label}</div>
              <div className={`text-xs ${activeMode === mode.id ? 'text-blue-200' : 'text-slate-500'}`}>
                {mode.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModeSelectorCompact({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
      {MODE_LIST.map(mode => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          title={mode.description}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all ${
            activeMode === mode.id
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {ICON_MAP[mode.icon] || <Tag className="w-4 h-4" />}
          <span className="hidden sm:inline">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
