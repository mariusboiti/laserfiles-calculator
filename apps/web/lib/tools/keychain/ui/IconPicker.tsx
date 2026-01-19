'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Upload, X, ChevronDown } from 'lucide-react';
import { ICON_PACK, ICON_CATEGORIES, searchIcons, getIconsByCategory, parseUploadedIcon, ICON_COUNT } from '../core/iconLibrary';
import type { IconDef } from '../types';

interface IconPickerProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  uploadedIcons?: IconDef[];
  onUpload?: (icon: IconDef) => void;
}

export function IconPicker({ selectedId, onSelect, uploadedIcons = [], onUpload }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const filteredIcons = useMemo(() => {
    if (search.trim()) {
      return searchIcons(search);
    }
    if (activeCategory === 'uploads') {
      return uploadedIcons;
    }
    if (activeCategory) {
      return getIconsByCategory(activeCategory);
    }
    return ICON_PACK;
  }, [search, activeCategory, uploadedIcons]);

  const allIcons = useMemo(() => {
    if (activeCategory === 'uploads') return uploadedIcons;
    return filteredIcons;
  }, [filteredIcons, activeCategory, uploadedIcons]);

  const selectedIcon = useMemo(() => {
    if (!selectedId) return null;
    return [...ICON_PACK, ...uploadedIcons].find(i => i.id === selectedId) || null;
  }, [selectedId, uploadedIcons]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    try {
      const text = await file.text();
      const icon = parseUploadedIcon(text);
      if (icon) {
        onUpload(icon);
        onSelect(icon.id);
      }
    } catch {
      // Failed to parse
    }
    e.target.value = '';
  }, [onUpload, onSelect]);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-400">
        Icon <span className="text-slate-500">({ICON_COUNT} available)</span>
      </label>

      {/* Selected icon preview */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:border-slate-600"
      >
        {selectedIcon ? (
          <>
            <div className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded">
              <svg viewBox={selectedIcon.viewBox} className="w-6 h-6">
                {selectedIcon.paths.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="4" />
                ))}
              </svg>
            </div>
            <span className="text-sm flex-1">{selectedIcon.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(null); }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-500 flex-1">Select an icon...</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </>
        )}
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-3 max-h-[400px] overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
              placeholder="Search icons..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm"
              autoFocus
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 flex-shrink-0">
            <button
              onClick={() => { setActiveCategory(null); setSearch(''); }}
              className={`px-2 py-1 text-xs rounded transition-colors ${!activeCategory && !search ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              All ({ICON_COUNT})
            </button>
            {ICON_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
                className={`px-2 py-1 text-xs rounded transition-colors ${activeCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
            {uploadedIcons.length > 0 && (
              <button
                onClick={() => { setActiveCategory('uploads'); setSearch(''); }}
                className={`px-2 py-1 text-xs rounded transition-colors ${activeCategory === 'uploads' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                Uploads ({uploadedIcons.length})
              </button>
            )}
          </div>

          {/* Results count */}
          {search && (
            <div className="text-xs text-slate-500 flex-shrink-0">
              Found {allIcons.length} icons for &quot;{search}&quot;
            </div>
          )}

          {/* Icons grid */}
          <div className="grid grid-cols-8 gap-1 overflow-y-auto flex-1 min-h-[150px]">
            {allIcons.map(icon => (
              <button
                key={icon.id}
                onClick={() => { onSelect(icon.id); setIsOpen(false); }}
                title={`${icon.name} (${icon.category})`}
                className={`aspect-square p-1.5 rounded flex items-center justify-center transition-colors ${selectedId === icon.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'}`}
              >
                <svg viewBox={icon.viewBox} className="w-full h-full">
                  {icon.paths.map((d, i) => (
                    <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="5" />
                  ))}
                </svg>
              </button>
            ))}
            {allIcons.length === 0 && (
              <div className="col-span-8 text-center text-slate-500 text-sm py-8">
                No icons found
              </div>
            )}
          </div>

          {/* Upload */}
          {onUpload && (
            <div className="pt-2 border-t border-slate-700 flex-shrink-0">
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded cursor-pointer text-xs transition-colors">
                <Upload className="w-4 h-4" />
                Upload Custom SVG Icon
                <input type="file" accept=".svg" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
