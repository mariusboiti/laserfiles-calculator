import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { ProcessingState, GridInfo, TileInfo } from '../types';

interface ExportBarProps {
  gridInfo: GridInfo | null;
  processingState: ProcessingState;
  processedTiles: TileInfo[];
  onGenerate: () => void;
  onCancel: () => void;
  onExport: () => void;
  canGenerate: boolean;
}

export function ExportBar({
  gridInfo,
  processingState,
  processedTiles,
  onGenerate,
  onCancel,
  onExport,
  canGenerate,
}: ExportBarProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const { isProcessing, currentTile, totalTiles, phase, error } = processingState;

  const nonEmptyTiles = processedTiles.filter(t => !t.isEmpty);
  const hasResults = nonEmptyTiles.length > 0;

  const progressPercent = totalTiles > 0 ? (currentTile / totalTiles) * 100 : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {error && (
            <div className="text-red-600 text-sm mb-2">
              ❌ {error}
            </div>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {phase === 'preparing' && t('panel_splitter.export.preparing')}
                  {phase === 'tiling' &&
                    t('panel_splitter.export.processing_tile')
                      .replace('{current}', String(currentTile))
                      .replace('{total}', String(totalTiles))}
                  {phase === 'exporting' && t('panel_splitter.export.creating_zip')}
                </span>
                <span className="text-slate-400">{progressPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-sky-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {!isProcessing && hasResults && (
            <div className="text-sm text-slate-300">
              ✅ {t('panel_splitter.export.tiles_ready').replace('{count}', String(nonEmptyTiles.length))}
              {processedTiles.some(t => t.hasUnsafeFallback) && (
                <span className="text-amber-400 ml-2">
                  ⚠️ {t('panel_splitter.export.some_tiles_unsafe_fallback')}
                </span>
              )}
            </div>
          )}

          {!isProcessing && !hasResults && gridInfo && (
            <div className="text-sm text-slate-300">
              {t('panel_splitter.export.tiles_in_grid')
                .replace('{count}', String(gridInfo.tiles.length))
                .replace('{generate}', t('panel_splitter.export.generate'))}
            </div>
          )}

          {!gridInfo && (
            <div className="text-sm text-slate-500">
              {t('panel_splitter.export.upload_svg_to_start')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isProcessing ? (
            <button onClick={onCancel} className="btn-danger">
              {t('common.cancel')}
            </button>
          ) : (
            <>
              <button
                onClick={onGenerate}
                disabled={!canGenerate}
                className="btn-primary"
              >
                {t('panel_splitter.export.generate_tiles')}
              </button>
              <button
                onClick={onExport}
                disabled={!hasResults}
                className="btn-secondary"
              >
                {t('panel_splitter.export.download_zip')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
