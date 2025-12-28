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
                  {phase === 'preparing' && 'Preparing...'}
                  {phase === 'tiling' && `Processing tile ${currentTile} of ${totalTiles}`}
                  {phase === 'exporting' && 'Creating ZIP...'}
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
              ✅ {nonEmptyTiles.length} tile(s) ready for export
              {processedTiles.some(t => t.hasUnsafeFallback) && (
                <span className="text-amber-400 ml-2">
                  ⚠️ Some tiles have unsafe fallback
                </span>
              )}
            </div>
          )}

          {!isProcessing && !hasResults && gridInfo && (
            <div className="text-sm text-slate-300">
              {gridInfo.tiles.length} tile(s) in grid. Click &quot;Generate&quot; to process.
            </div>
          )}

          {!gridInfo && (
            <div className="text-sm text-slate-500">
              Upload an SVG to get started
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isProcessing ? (
            <button onClick={onCancel} className="btn-danger">
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={onGenerate}
                disabled={!canGenerate}
                className="btn-primary"
              >
                Generate Tiles
              </button>
              <button
                onClick={onExport}
                disabled={!hasResults}
                className="btn-secondary"
              >
                Download ZIP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
