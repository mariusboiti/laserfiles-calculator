'use client';

/**
 * PathfinderPanel - Boolean operations on selected shapes
 * Union, Subtract, Intersect, XOR (Exclude)
 */

import React, { useState, useCallback } from 'react';
import {
  Combine,
  Minus,
  Maximize2,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { SignDocument, Element, Layer, ShapeElement } from '../../types/signPro';
import {
  executePathfinderOp,
  createShapeFromResult,
  initPathfinder,
  isPathfinderReady,
  type PathfinderOp,
} from '../../core/pathfinder/ops';

interface PathfinderPanelProps {
  doc: SignDocument;
  selectedIds: string[];
  onApplyResult: (
    newElement: ShapeElement,
    targetLayerId: string,
    removeElementIds: string[]
  ) => void;
  disabled?: boolean;
}

export function PathfinderPanel({
  doc,
  selectedIds,
  onApplyResult,
  disabled = false,
}: PathfinderPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keepOriginals, setKeepOriginals] = useState(false);

  // Get selected elements with their transforms
  const getSelectedElements = useCallback(() => {
    const result: Array<{ element: Element; layer: Layer; transform: Element['transform'] }> = [];

    for (const id of selectedIds) {
      for (const layer of doc.layers) {
        const element = layer.elements.find(el => el.id === id);
        if (element) {
          result.push({ element, layer, transform: element.transform });
          break;
        }
      }
    }

    return result;
  }, [selectedIds, doc.layers]);

  // Check if selection is valid for pathfinder
  const selectedElements = getSelectedElements();
  const hasValidSelection = selectedElements.length >= 2;
  const hasPathElements = selectedElements.every(
    ({ element }) => element.kind === 'shape' || element.kind === 'text' || element.kind === 'engraveSketch'
  );

  const canOperate = hasValidSelection && hasPathElements && !disabled && !loading;

  // Execute pathfinder operation
  const handleOp = useCallback(
    async (op: PathfinderOp) => {
      if (!canOperate) return;

      setLoading(true);
      setError(null);

      try {
        // Ensure PathOps is loaded
        const ready = await initPathfinder();
        if (!ready) {
          setError('Failed to load path operations engine');
          return;
        }

        // Prepare elements for operation
        const elementsForOp = selectedElements.map(({ element }) => ({
          element,
          transform: element.transform,
        }));

        // Execute operation
        const result = await executePathfinderOp(op, elementsForOp);

        if (!result.success || !result.resultPathD) {
          setError(result.error || 'Operation failed');
          return;
        }

        // Determine target layer and style
        const firstElement = selectedElements[0];
        const targetLayerId = firstElement.layer.id;
        const style = firstElement.layer.type === 'ENGRAVE' ? 'ENGRAVE' : 'CUT';

        // Create new shape from result
        const newShape = createShapeFromResult(result.resultPathD, style);

        // Determine which elements to remove
        const removeIds = keepOriginals ? [] : selectedIds;

        onApplyResult(newShape, targetLayerId, removeIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Operation failed');
      } finally {
        setLoading(false);
      }
    },
    [canOperate, selectedElements, selectedIds, keepOriginals, onApplyResult]
  );

  const operations: Array<{ op: PathfinderOp; label: string; icon: React.ReactNode; description: string }> = [
    {
      op: 'union',
      label: 'Unite',
      icon: <Combine className="w-4 h-4" />,
      description: 'Combine all shapes into one',
    },
    {
      op: 'subtract',
      label: 'Subtract',
      icon: <Minus className="w-4 h-4" />,
      description: 'Remove front shapes from back',
    },
    {
      op: 'intersect',
      label: 'Intersect',
      icon: <Maximize2 className="w-4 h-4" />,
      description: 'Keep only overlapping area',
    },
    {
      op: 'xor',
      label: 'Exclude',
      icon: <X className="w-4 h-4" />,
      description: 'Remove overlapping area',
    },
  ];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Combine className="w-4 h-4 text-purple-400" />
          Pathfinder
        </h3>
      </div>

      {/* Selection info */}
      {!hasValidSelection && (
        <div className="text-xs text-slate-400 bg-slate-700/50 rounded p-2">
          Select at least 2 shapes to use pathfinder operations.
        </div>
      )}

      {hasValidSelection && !hasPathElements && (
        <div className="text-xs text-amber-400 bg-amber-900/30 rounded p-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Some selected elements cannot be used (images are not supported).
        </div>
      )}

      {/* Operations grid */}
      <div className="grid grid-cols-2 gap-2">
        {operations.map(({ op, label, icon, description }) => (
          <button
            key={op}
            onClick={() => handleOp(op)}
            disabled={!canOperate}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors
              ${canOperate
                ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-purple-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
            title={description}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              icon
            )}
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Keep originals toggle */}
      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
        <input
          type="checkbox"
          checked={keepOriginals}
          onChange={(e) => setKeepOriginals(e.target.checked)}
          className="rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
        />
        Keep original shapes
      </label>

      {/* Error display */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 rounded p-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
