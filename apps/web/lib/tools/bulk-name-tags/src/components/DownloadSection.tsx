import type { GeneratedSVG } from '../types';
import { downloadSVG, downloadZip } from '../utils/downloadUtils';

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
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Step 4: Generate & Download</h2>
      
      <div className="space-y-4">
        {outputMode === 'sheet' && sheetStats && (
          <div className="text-sm text-slate-300 bg-slate-800/60 p-3 rounded border border-slate-700">
            <div className="font-medium">Sheet capacity</div>
            <div>
              {sheetStats.tagsPerRow} per row × {sheetStats.tagsPerColumn} per column = {sheetStats.maxTags} max
            </div>
            <div>Names: {sheetStats.namesCount}</div>

            {typeof sheetStats.willGenerate === 'number' && (
              <div>Will generate: {sheetStats.willGenerate}</div>
            )}

            {sheetStats.maxTags === 0 ? (
              <div className="mt-2 text-amber-700">
                No tags fit with the current sheet settings. Increase sheet size or reduce spacing/margins.
              </div>
            ) : sheetStats.namesCount > sheetStats.maxTags && !sheetStats.fillToCapacity ? (
              <div className="mt-2 text-amber-700">
                Only the first {sheetStats.maxTags} names will be generated on this sheet.
              </div>
            ) : null}
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Name Tags'}
        </button>
        
        {!canGenerate && (
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
            ⚠️ Please load a template SVG and provide names (CSV upload or manual entry) to generate name tags.
          </p>
        )}
        
        {generatedContent && (
          <div className="border-t pt-4">
            <button
              onClick={handleDownload}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 transition-colors"
            >
              {outputMode === 'sheet' ? '⬇ Download Sheet SVG' : '⬇ Download ZIP'}
            </button>
            
            <div className="mt-3 text-sm text-slate-300 bg-emerald-500/10 p-3 rounded border border-emerald-500/30">
              ✓ {outputMode === 'sheet' 
                ? 'Sheet generated successfully! Click to download.' 
                : `${Array.isArray(generatedContent) ? generatedContent.length : 0} SVG files ready. Click to download ZIP.`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
