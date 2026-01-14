import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { GridInfo, TileInfo } from '../types';

interface TileListProps {
  gridInfo: GridInfo | null;
  selectedTile: TileInfo | null;
  onTileSelect: (tile: TileInfo | null) => void;
}

export function TileList({ gridInfo, selectedTile, onTileSelect }: TileListProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  if (!gridInfo) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">{t('panel_splitter.tiles.title')}</h2>
        <p className="text-sm text-slate-500">{t('panel_splitter.tiles.upload_svg_to_see_tiles')}</p>
      </div>
    );
  }

  const { tiles } = gridInfo;
  const nonEmptyCount = tiles.filter(t => !t.isEmpty).length;
  const unsafeCount = tiles.filter(t => t.hasUnsafeFallback).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-100">{t('panel_splitter.tiles.title')}</h2>
        <div className="text-sm text-slate-400">
          {t('panel_splitter.tiles.with_content')
            .replace('{nonEmpty}', String(nonEmptyCount))
            .replace('{total}', String(tiles.length))}
        </div>
      </div>

      {unsafeCount > 0 && (
        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
          ⚠️ {t('panel_splitter.tiles.unsafe_tiles').replace('{count}', String(unsafeCount))}
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-1">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => onTileSelect(selectedTile?.id === tile.id ? null : tile)}
            className={`
              w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
              ${selectedTile?.id === tile.id 
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50' 
                : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
              }
              ${tile.isEmpty ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{tile.label}</span>
              <div className="flex items-center gap-2">
                {tile.isEmpty && (
                  <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">
                    {t('panel_splitter.tiles.empty_badge')}
                  </span>
                )}
                {tile.hasUnsafeFallback && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                    {t('panel_splitter.tiles.unsafe_badge')}
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {t('panel_splitter.tiles.position')
                    .replace('{row}', String(tile.row + 1))
                    .replace('{col}', String(tile.col + 1))}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {tile.width.toFixed(1)} × {tile.height.toFixed(1)} {t('panel_splitter.units.mm')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
