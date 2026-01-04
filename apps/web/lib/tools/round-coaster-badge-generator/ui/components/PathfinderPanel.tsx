'use client';

/**
 * Pathfinder Panel for Round Coaster PRO
 * Boolean operations on selected paths using PathOps
 */

import React, { useState } from 'react';
import { Combine, Minus, Circle, XCircle, Loader2 } from 'lucide-react';

export type PathfinderOperation = 'union' | 'difference' | 'intersect' | 'exclude';

interface PathfinderPanelProps {
  onOperation: (op: PathfinderOperation) => Promise<void>;
  selectionCount: number;
  disabled?: boolean;
}

export function PathfinderPanel({ onOperation, selectionCount, disabled }: PathfinderPanelProps) {
  const [loading, setLoading] = useState<PathfinderOperation | null>(null);

  const canOperate = selectionCount >= 2 && !disabled;

  const handleOperation = async (op: PathfinderOperation) => {
    if (!canOperate) return;
    setLoading(op);
    try {
      await onOperation(op);
    } finally {
      setLoading(null);
    }
  };

  const buttonClass = (enabled: boolean) =>
    `flex flex-col items-center gap-1 p-2 rounded ${enabled
      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
      : 'bg-slate-900 text-slate-600 cursor-not-allowed'
    }`;

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-slate-400 mb-1">Pathfinder</div>

      <div className="grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={() => handleOperation('union')}
          disabled={!canOperate}
          className={buttonClass(canOperate)}
          title="Union - Combine shapes"
        >
          {loading === 'union' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Combine className="w-4 h-4" />
          )}
          <span className="text-[9px]">Union</span>
        </button>

        <button
          type="button"
          onClick={() => handleOperation('difference')}
          disabled={!canOperate}
          className={buttonClass(canOperate)}
          title="Difference - Subtract top from bottom"
        >
          {loading === 'difference' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          <span className="text-[9px]">Minus</span>
        </button>

        <button
          type="button"
          onClick={() => handleOperation('intersect')}
          disabled={!canOperate}
          className={buttonClass(canOperate)}
          title="Intersect - Keep overlapping area"
        >
          {loading === 'intersect' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          <span className="text-[9px]">Intersect</span>
        </button>

        <button
          type="button"
          onClick={() => handleOperation('exclude')}
          disabled={!canOperate}
          className={buttonClass(canOperate)}
          title="Exclude - Remove overlapping area"
        >
          {loading === 'exclude' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span className="text-[9px]">Exclude</span>
        </button>
      </div>

      {selectionCount < 2 && (
        <div className="text-[10px] text-slate-500 mt-1">
          Select 2+ shapes for pathfinder
        </div>
      )}
    </div>
  );
}

export default PathfinderPanel;
