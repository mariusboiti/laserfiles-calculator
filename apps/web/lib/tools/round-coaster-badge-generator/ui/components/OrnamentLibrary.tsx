'use client';

/**
 * Ornament Library Panel for Round Coaster PRO
 * Browse and insert pre-made ornament SVGs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Flower2, Search, Loader2, Plus, LayoutGrid, List } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export interface OrnamentAsset {
  id: string;
  name: string;
  category: string;
  pathD: string;
  viewBox: string;
  tags: string[];
}

interface OrnamentLibraryProps {
  onInsert: (ornament: OrnamentAsset) => void;
  disabled?: boolean;
}

// Ornament categories
const CATEGORIES = [
  { id: 'all', label: 'round_coaster.ornaments.cat_all' },
  { id: 'animals', label: 'round_coaster.ornaments.cat_animals' },
  { id: 'geometric', label: 'round_coaster.ornaments.cat_geometric' },
  { id: 'flowers', label: 'round_coaster.ornaments.cat_flowers' },
  { id: 'accesories', label: 'round_coaster.ornaments.cat_accessories' },
  { id: 'beverages', label: 'round_coaster.ornaments.cat_beverages' },
  { id: 'landscapes', label: 'round_coaster.ornaments.cat_landscapes' },
];

const SAMPLE_ORNAMENTS: OrnamentAsset[] = [];

export function OrnamentLibrary({ onInsert, disabled }: OrnamentLibraryProps) {
  const { locale } = useLanguage();
  const t = React.useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [ornaments, setOrnaments] = useState<OrnamentAsset[]>(SAMPLE_ORNAMENTS);

  // Load ornaments from assets folder
  useEffect(() => {
    // In production, this would load from API or static assets
    // For now, use sample ornaments
    setLoading(true);
    setTimeout(() => {
      setOrnaments(SAMPLE_ORNAMENTS);
      setLoading(false);
    }, 300);
  }, []);

  const filteredOrnaments = useMemo(() => {
    return ornaments.filter(o => {
      const matchesCategory = category === 'all' || o.category === category;
      const matchesSearch = !search.trim() ||
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [ornaments, category, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Flower2 className="w-3.5 h-3.5 text-pink-400" />
          <span>{t('round_coaster.ornaments.header')}</span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1 rounded ${viewMode === 'grid' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1 rounded ${viewMode === 'list' ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
          >
            <List className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('round_coaster.ornaments.search')}
          className="w-full bg-slate-900 border border-slate-700 rounded pl-7 pr-2 py-1.5 text-xs"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={`px-2 py-0.5 text-[10px] rounded ${
              category === cat.id
                ? 'bg-pink-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t(cat.label)}
          </button>
        ))}
      </div>

      {/* Ornaments grid/list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
        </div>
      ) : filteredOrnaments.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          {t('round_coaster.ornaments.no_results')}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
          {filteredOrnaments.map((ornament) => (
            <button
              key={ornament.id}
              type="button"
              onClick={() => onInsert(ornament)}
              disabled={disabled}
              className="relative aspect-square bg-white rounded border border-slate-700 p-1.5 hover:border-pink-500 hover:bg-pink-50 transition-colors group disabled:opacity-50"
              title={ornament.name}
            >
              <svg viewBox={ornament.viewBox} className="w-full h-full">
                <path
                  d={ornament.pathD}
                  fill="none"
                  stroke="#374151"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-pink-500/20 rounded">
                <Plus className="w-4 h-4 text-pink-600" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {filteredOrnaments.map((ornament) => (
            <button
              key={ornament.id}
              type="button"
              onClick={() => onInsert(ornament)}
              disabled={disabled}
              className="w-full flex items-center gap-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50"
            >
              <div className="w-8 h-8 bg-white rounded p-1 flex-shrink-0">
                <svg viewBox={ornament.viewBox} className="w-full h-full">
                  <path
                    d={ornament.pathD}
                    fill="none"
                    stroke="#374151"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <div className="text-[11px] text-slate-200">{ornament.name}</div>
                <div className="text-[9px] text-slate-500">
                  {t(CATEGORIES.find(cat => cat.id === ornament.category)?.label || ornament.category)}
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ))}
        </div>
      )}

      <div className="text-[9px] text-slate-600 text-center">
        {t('round_coaster.ornaments.count').replace('{n}', String(filteredOrnaments.length))}
      </div>
    </div>
  );
}

export default OrnamentLibrary;
