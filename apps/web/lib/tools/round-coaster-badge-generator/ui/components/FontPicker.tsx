'use client';

/**
 * Font Picker for Round Coaster PRO
 * Uses shared font registry
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { FONTS, type FontId } from '../../../../fonts/sharedFontRegistry';

interface FontPickerProps {
  value: FontId;
  onChange: (fontId: FontId) => void;
  disabled?: boolean;
  label?: string;
}

export function FontPicker({ value, onChange, disabled, label }: FontPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedFont = useMemo(() => {
    return FONTS.find(f => f.id === value) || FONTS[0];
  }, [value]);

  const filteredFonts = useMemo(() => {
    if (!search.trim()) return FONTS;
    const searchLower = search.toLowerCase();
    return FONTS.filter(f =>
      f.label.toLowerCase().includes(searchLower) ||
      f.id.toLowerCase().includes(searchLower)
    );
  }, [search]);

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[11px] text-slate-400">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between gap-2 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-left disabled:opacity-50 hover:border-slate-600"
        >
          <span className="truncate">{selectedFont?.label || 'Select font'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
              <div className="p-2 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search fonts..."
                    className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-2 py-1 text-xs"
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-48">
                {filteredFonts.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400">No fonts found</div>
                ) : (
                  filteredFonts.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => {
                        onChange(font.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left hover:bg-slate-700 transition-colors ${font.id === value ? 'bg-sky-600/20 text-sky-400' : 'text-slate-200'
                        }`}
                    >
                      {font.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FontPicker;
