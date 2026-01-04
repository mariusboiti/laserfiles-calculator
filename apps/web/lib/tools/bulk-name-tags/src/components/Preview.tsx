import { useState, useEffect } from 'react';

interface PreviewProps {
  svgContent: string | null;
  isGenerating: boolean;
  singleTagSvg?: string | null;
  sheetWidth?: number;
  sheetHeight?: number;
}

export function Preview({ svgContent, isGenerating, singleTagSvg, sheetWidth, sheetHeight }: PreviewProps) {
  const [singleZoom, setSingleZoom] = useState(100);
  const [sheetZoom, setSheetZoom] = useState(50);
  const [viewMode, setViewMode] = useState<'single' | 'sheet'>('single');

  const displayContent = viewMode === 'single' ? singleTagSvg : svgContent;
  const currentZoom = viewMode === 'single' ? singleZoom : sheetZoom;
  const setCurrentZoom = viewMode === 'single' ? setSingleZoom : setSheetZoom;

  // Auto-adjust sheet zoom to fit when switching to sheet view
  useEffect(() => {
    if (viewMode === 'sheet' && svgContent) {
      // Start with a smaller zoom for sheet view to show more
      setSheetZoom(30);
    }
  }, [viewMode, svgContent]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-slate-100">Preview</h2>
        
        <div className="flex items-center gap-3">
          {/* View mode toggle - always visible */}
          <div className="flex rounded-md overflow-hidden border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-2 py-1 text-xs font-medium ${
                viewMode === 'single' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Single Tag
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
              Sheet View
            </button>
          </div>

          {/* Zoom control - always visible when content exists */}
          {displayContent && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-300">Zoom:</label>
              <input
                type="range"
                min={viewMode === 'sheet' ? 10 : 25}
                max={viewMode === 'sheet' ? 200 : 300}
                value={currentZoom}
                onChange={(e) => setCurrentZoom(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-slate-400 w-10">{currentZoom}%</span>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'sheet' && sheetWidth && sheetHeight && (
        <div className="text-xs text-slate-400 mb-2">
          Sheet: {sheetWidth} × {sheetHeight} mm
        </div>
      )}
      
      <div className="border border-slate-700 rounded-lg flex-1 min-h-0 bg-slate-100 overflow-auto relative">
        {displayContent ? (
          <div 
            className="inline-block p-4 min-w-full min-h-full"
            style={{ 
              transform: `scale(${currentZoom / 100})`, 
              transformOrigin: 'top left',
              width: `${100 / (currentZoom / 100)}%`,
              height: `${100 / (currentZoom / 100)}%`
            }}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center text-slate-500 p-4">
            <div>
              <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Load a template and provide names to see preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
