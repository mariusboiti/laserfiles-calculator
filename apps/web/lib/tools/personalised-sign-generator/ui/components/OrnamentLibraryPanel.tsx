'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { Search, Package } from 'lucide-react';
import { ORNAMENT_LIBRARY, ORNAMENT_CATEGORIES, ORNAMENT_THUMBS } from '../../../../assets/ornaments';
import type { OrnamentAsset, OrnamentLayerType } from '../../../../assets/ornaments';

interface OrnamentLibraryPanelProps {
  onInsert: (assetId: string, targetLayer: OrnamentLayerType, widthPct: number) => void;
  onClose?: () => void;
}

export function OrnamentLibraryPanel({ onInsert, onClose }: OrnamentLibraryPanelProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOrnament, setSelectedOrnament] = useState<OrnamentAsset | null>(null);
  const [insertLayer, setInsertLayer] = useState<OrnamentLayerType>('ENGRAVE');
  const [insertWidthPct, setInsertWidthPct] = useState(40);

  const filteredOrnaments = useMemo(() => {
    let results = ORNAMENT_LIBRARY;

    if (selectedCategory !== 'All') {
      results = results.filter((o) => o.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (o) =>
          o.name.toLowerCase().includes(query) ||
          o.category.toLowerCase().includes(query) ||
          o.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    return results;
  }, [searchQuery, selectedCategory]);

  const handleOrnamentClick = (ornament: OrnamentAsset) => {
    setSelectedOrnament(ornament);
    setInsertLayer(ornament.recommendedLayer);
    setInsertWidthPct(ornament.defaultInsertWidthPct);
  };

  const handleInsert = () => {
    if (!selectedOrnament) return;
    onInsert(selectedOrnament.id, insertLayer, insertWidthPct);
    setSelectedOrnament(null);
  };

  const handleQuickInsert = (ornament: OrnamentAsset) => {
    onInsert(ornament.id, ornament.recommendedLayer, ornament.defaultInsertWidthPct);
  };

  const handleDragStart = (e: React.DragEvent, ornament: OrnamentAsset) => {
    const targetLayer = selectedOrnament?.id === ornament.id ? insertLayer : ornament.recommendedLayer;
    const widthPct = selectedOrnament?.id === ornament.id ? insertWidthPct : ornament.defaultInsertWidthPct;
    const payload = {
      assetId: ornament.id,
      targetLayer,
      widthPct,
    };
    const json = JSON.stringify(payload);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-psg-ornament', json);
    e.dataTransfer.setData('text/plain', json);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/30">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">{t('personalised_sign.pro.ornaments.title')}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm"
            >
              ×
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={t('personalised_sign.pro.ornaments.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-2 py-1 text-xs rounded ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t('personalised_sign.pro.ornaments.category_all')}
          </button>
          {ORNAMENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 text-xs rounded ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filteredOrnaments.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8">
            {ORNAMENT_LIBRARY.length === 0
              ? t('personalised_sign.pro.ornaments.empty.no_ornaments_available')
              : t('personalised_sign.pro.ornaments.empty.no_ornaments_match')}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredOrnaments.map((ornament) => (
              <button
                key={ornament.id}
                onClick={() => handleOrnamentClick(ornament)}
                onDoubleClick={() => handleQuickInsert(ornament)}
                draggable
                onDragStart={(e) => handleDragStart(e, ornament)}
                className={`aspect-square bg-slate-800 rounded border-2 p-1.5 hover:bg-slate-700 transition-colors ${
                  selectedOrnament?.id === ornament.id
                    ? 'border-blue-500'
                    : 'border-slate-700'
                }`}
                title={`${ornament.name}\n${t('personalised_sign.pro.ornaments.tooltip.double_click_to_insert')}`}
              >
                <div
                  className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:text-slate-300 [&_path]:stroke-current"
                  dangerouslySetInnerHTML={{ __html: ORNAMENT_THUMBS[ornament.id] || '' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedOrnament && (
        <div className="border-t border-slate-800 p-4 bg-slate-900/50">
          <div className="mb-3">
            <div className="text-sm font-medium text-slate-200 mb-1">
              {selectedOrnament.name}
            </div>
            <div className="text-xs text-slate-500">
              {selectedOrnament.category} • {selectedOrnament.tags.join(', ')}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('personalised_sign.pro.ornaments.target_layer')}</label>
              <select
                value={insertLayer}
                onChange={(e) => setInsertLayer(e.target.value as OrnamentLayerType)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200"
              >
                <option value="CUT">{t('personalised_sign.pro.ornaments.layer.cut')}</option>
                <option value="ENGRAVE">{t('personalised_sign.pro.ornaments.layer.engrave')}</option>
                <option value="GUIDE">{t('personalised_sign.pro.ornaments.layer.guide_preview_only')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('personalised_sign.pro.ornaments.size')} ({insertWidthPct}% {t('personalised_sign.pro.ornaments.of_artboard_width')})
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={insertWidthPct}
                onChange={(e) => setInsertWidthPct(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={handleInsert}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded transition-colors"
            >
              {t('personalised_sign.pro.ornaments.insert_ornament')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
