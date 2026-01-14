'use client';

import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
 import { useLanguage } from '@/app/(app)/i18n';
 import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface ScaledPreviewProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * ScaledPreview - Zoom/fit controls for raster preview (canvas/img)
 * Similar to SvgPreview but uses CSS transform scale instead of SVG viewBox
 */
export function ScaledPreview({ children, title }: ScaledPreviewProps) {
  const [scale, setScale] = useState(1);
  const { locale } = useLanguage();
  const t = (key: string) => getStudioTranslation(locale as any, key);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleFit = () => {
    setScale(1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/40 px-3 py-2">
        <div className="text-xs text-slate-400">{title || t('preview.title')}</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title={t('preview.zoom_out')}
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={handleFit}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title={t('preview.fit_to_view')}
          >
            <Maximize2 size={16} />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title={t('preview.zoom_in')}
          >
            <ZoomIn size={16} />
          </button>
          <span className="ml-2 text-xs text-slate-500">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Preview content with scale */}
      <div className="relative flex-1 overflow-auto bg-slate-950">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: 'transform 0.2s ease-out',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
