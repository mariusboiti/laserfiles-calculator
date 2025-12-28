import { GridInfo, TileInfo } from '../types';

interface TileListProps {
  gridInfo: GridInfo | null;
  selectedTile: TileInfo | null;
  onTileSelect: (tile: TileInfo | null) => void;
}

export function TileList({ gridInfo, selectedTile, onTileSelect }: TileListProps) {
  if (!gridInfo) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Tiles</h2>
        <p className="text-sm text-slate-500">Upload an SVG to see tile list</p>
      </div>
    );
  }

  const { tiles } = gridInfo;
  const nonEmptyCount = tiles.filter(t => !t.isEmpty).length;
  const unsafeCount = tiles.filter(t => t.hasUnsafeFallback).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-100">Tiles</h2>
        <div className="text-sm text-slate-400">
          {nonEmptyCount} / {tiles.length} with content
        </div>
      </div>

      {unsafeCount > 0 && (
        <div className="mb-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
          ⚠️ {unsafeCount} tile(s) have unsafe fallback geometry
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
                    Empty
                  </span>
                )}
                {tile.hasUnsafeFallback && (
                  <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                    Unsafe
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  R{tile.row + 1} C{tile.col + 1}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {tile.width.toFixed(1)} × {tile.height.toFixed(1)} mm
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
