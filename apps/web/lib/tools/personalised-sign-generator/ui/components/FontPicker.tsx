'use client';

/**
 * Personalised Sign Generator V3 PRO - Font Picker
 * Uses shared font registry from Keychain Hub
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { ChevronDown, Search } from 'lucide-react';
import { FONTS, type FontConfig, type FontId } from '../../../../fonts/sharedFontRegistry';
import { getCssFontFamily } from '../../../../fonts/fontLoader';

interface FontPickerProps {
  value: FontId;
  onChange: (fontId: FontId) => void;
  disabled?: boolean;
}

export function FontPicker({ value, onChange, disabled }: FontPickerProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

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
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-left disabled:opacity-50"
      >
        <span className="truncate">{selectedFont?.label || t('personalised_sign.pro.font_picker.select_font')}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('personalised_sign.pro.font_picker.search_placeholder')}
                  className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Font list */}
            <div className="overflow-y-auto max-h-48">
              {filteredFonts.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-400">{t('personalised_sign.pro.font_picker.no_fonts_found')}</div>
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
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-700 transition-colors ${
                      font.id === value ? 'bg-blue-600/20 text-blue-400' : 'text-slate-200'
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

      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-1 text-[10px] text-slate-500 truncate">
          {getCssFontFamily(value)}
        </div>
      )}
    </div>
  );
}

/**
 * Compact font picker for inline use
 */
export function FontPickerCompact({ value, onChange, disabled }: FontPickerProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm disabled:opacity-50"
    >
      {FONTS.map((font) => (
        <option key={font.id} value={font.id}>
          {font.label}
        </option>
      ))}
    </select>
  );
}

export default FontPicker;
