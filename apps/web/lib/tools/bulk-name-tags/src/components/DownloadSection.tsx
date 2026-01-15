import type { GeneratedSVG } from '../types';
import { downloadSVG, downloadZip } from '../utils/downloadUtils';
import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface DownloadSectionProps {
  generatedContent: string | GeneratedSVG[] | null;
  outputMode: 'sheet' | 'separate';
  canGenerate: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
  sheetStats?: {
    tagsPerRow: number;
    tagsPerColumn: number;
    maxTags: number;
    namesCount: number;
    fillToCapacity?: boolean;
    willGenerate?: number;
  } | null;
}

export function DownloadSection({ 
  generatedContent, 
  outputMode, 
  canGenerate, 
  onGenerate,
  isGenerating,
  sheetStats
}: DownloadSectionProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const handleDownload = async () => {
    if (!generatedContent) return;

    if (outputMode === 'sheet' && typeof generatedContent === 'string') {
      downloadSVG(generatedContent, 'name-tags-sheet.svg');
    } else if (outputMode === 'separate' && Array.isArray(generatedContent)) {
      await downloadZip(generatedContent, 'name-tags-bulk.zip');
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">{t('bulk_name_tags.download.step_title')}</h2>
      
      <div className="space-y-4">
        {outputMode === 'sheet' && sheetStats && (
          <div className="text-sm text-slate-300 bg-slate-800/60 p-3 rounded border border-slate-700">
            <div className="font-medium">{t('bulk_name_tags.download.sheet_capacity')}</div>
            <div>
              {t('bulk_name_tags.download.capacity_math')
                .replace('{perRow}', String(sheetStats.tagsPerRow))
                .replace('{perColumn}', String(sheetStats.tagsPerColumn))
                .replace('{max}', String(sheetStats.maxTags))}
            </div>
            <div>{t('bulk_name_tags.download.names')} {sheetStats.namesCount}</div>

            {typeof sheetStats.willGenerate === 'number' && (
              <div>{t('bulk_name_tags.download.will_generate')} {sheetStats.willGenerate}</div>
            )}

            {sheetStats.maxTags === 0 ? (
              <div className="mt-2 text-amber-700">
                {t('bulk_name_tags.download.no_tags_fit')}
              </div>
            ) : sheetStats.namesCount > sheetStats.maxTags && !sheetStats.fillToCapacity ? (
              <div className="mt-2 text-amber-700">
                {t('bulk_name_tags.download.only_first_names').replace('{max}', String(sheetStats.maxTags))}
              </div>
            ) : null}
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? t('bulk_name_tags.download.generating') : t('bulk_name_tags.download.generate_btn')}
        </button>
        
        {!canGenerate && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
            ⚠️ {t('bulk_name_tags.download.prereq_warning')}
          </p>
        )}
        
        {generatedContent && (
          <div className="border-t pt-4">
            <button
              onClick={handleDownload}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              {outputMode === 'sheet' ? t('bulk_name_tags.download.download_sheet_svg') : t('bulk_name_tags.download.download_zip')}
            </button>
            
            <div className="mt-3 text-sm text-slate-300 bg-emerald-500/10 p-3 rounded border border-emerald-500/30">
              ✓ {outputMode === 'sheet' 
                ? t('bulk_name_tags.download.sheet_generated')
                : t('bulk_name_tags.download.zip_ready').replace(
                    '{count}',
                    String(Array.isArray(generatedContent) ? generatedContent.length : 0)
                  )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
