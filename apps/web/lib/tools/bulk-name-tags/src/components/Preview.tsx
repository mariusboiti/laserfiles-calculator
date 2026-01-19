import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface PreviewProps {
  svgContent: string | null;
  isGenerating: boolean;
  singleTagSvg?: string | null;
  sheetWidth?: number;
  sheetHeight?: number;
}

function getCroppedSvg(svgContent: string): string {
  const viewBoxMatch = svgContent.match(/viewBox=(['"])([^'"]+)\1/i);
  if (!viewBoxMatch) return svgContent;

  const parts = viewBoxMatch[2].trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return svgContent;

  const [x, y, w, h] = parts;
  const croppedW = w / 2;
  const croppedH = h / 2;
  const croppedViewBox = `${x} ${y} ${croppedW} ${croppedH}`;

  return svgContent.replace(viewBoxMatch[0], `viewBox="${croppedViewBox}"`);
}

export function Preview({ svgContent, isGenerating, singleTagSvg, sheetWidth, sheetHeight }: PreviewProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const [singleZoom, setSingleZoom] = useState(100);
  const [sheetZoom, setSheetZoom] = useState(50);
  const [detailZoom, setDetailZoom] = useState(200);
  const [viewMode, setViewMode] = useState<'single' | 'sheet' | 'detail'>('detail');

  const displayContent =
    viewMode === 'single'
      ? singleTagSvg
      : viewMode === 'detail'
        ? (svgContent ? getCroppedSvg(svgContent) : null)
        : svgContent;

  const currentZoom = viewMode === 'single' ? singleZoom : viewMode === 'detail' ? detailZoom : sheetZoom;
  const setCurrentZoom = viewMode === 'single' ? setSingleZoom : viewMode === 'detail' ? setDetailZoom : setSheetZoom;

  const svgDataUri = useMemo(() => {
    if (!displayContent) return null;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(displayContent)}`;
  }, [displayContent]);

  useEffect(() => {
    if (viewMode === 'sheet' && svgContent) {
      setSheetZoom(30);
    }
  }, [viewMode, svgContent]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-100">{t('bulk_name_tags.preview.title')}</h2>
        
        <div className="flex items-center gap-3">
          {/* View mode toggle - always visible */}
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={`px-2 py-1 text-xs font-medium ${
                viewMode === 'detail'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t('bulk_name_tags.preview.detail_view')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-2 py-1 text-xs font-medium ${
                viewMode === 'single' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t('bulk_name_tags.preview.single_tag')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`px-2 py-1 text-xs font-medium ${
                viewMode === 'sheet' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t('bulk_name_tags.preview.sheet_view')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-300">{t('bulk_name_tags.preview.zoom')}</label>
            <input
              type="range"
              min={viewMode === 'sheet' ? 10 : 25}
              max={viewMode === 'sheet' ? 200 : viewMode === 'detail' ? 500 : 300}
              value={currentZoom}
              onChange={(e) => setCurrentZoom(Number(e.target.value))}
              className="w-24"
              disabled={!displayContent}
            />
            <span className="text-xs text-slate-400 w-10">{currentZoom}%</span>
          </div>
        </div>
      </div>

      {/* Sheet dimensions info - always visible when in sheet mode */}
      {(viewMode === 'sheet' || viewMode === 'detail') && sheetWidth && sheetHeight && (
        <div className="text-xs text-slate-400 mb-2">
          {t('bulk_name_tags.preview.sheet_label')} {sheetWidth} × {sheetHeight} mm
        </div>
      )}
      
      {/* Preview area - always rendered, even if empty */}
      <div className="border border-slate-700 rounded-lg flex-1 min-h-0 bg-slate-100 overflow-auto relative">
        {svgDataUri ? (
          <div
            className="inline-block p-4 min-w-full min-h-full"
            style={{
              transform: `scale(${currentZoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (currentZoom / 100)}%`,
              height: `${100 / (currentZoom / 100)}%`
            }}
          >
            <img src={svgDataUri} alt="" className="block" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-slate-500 p-4">
            <div>
              <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">{t('bulk_name_tags.preview.empty')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
