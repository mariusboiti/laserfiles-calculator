'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react';
import type { SignDocument } from '../../types/signPro';
import { getSelectionBounds, findElementById, getElementBounds } from '../../core/canvas/selection';

export interface AlignPanelProps {
  doc: SignDocument;
  selectedIds: string[];
  onApplyDeltas: (deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }>, skippedLocked: boolean) => void;
}

type AlignTo = 'selection' | 'artboard';

export function AlignPanel({ doc, selectedIds, onApplyDeltas }: AlignPanelProps) {
  const [alignTo, setAlignTo] = useState<AlignTo>('selection');
  const [userOverrodeAlignTo, setUserOverrodeAlignTo] = useState(false);
  const [lastSkippedLocked, setLastSkippedLocked] = useState(false);

  useEffect(() => {
    if (userOverrodeAlignTo) return;
    if (selectedIds.length <= 1) {
      setAlignTo('artboard');
    } else {
      setAlignTo('selection');
    }
  }, [selectedIds.length, userOverrodeAlignTo]);

  const selectionBounds = useMemo(() => getSelectionBounds(selectedIds, doc), [selectedIds, doc]);

  const targetBounds = useMemo(() => {
    if (alignTo === 'artboard') {
      return { xMm: 0, yMm: 0, widthMm: doc.artboard.wMm, heightMm: doc.artboard.hMm };
    }
    return selectionBounds;
  }, [alignTo, selectionBounds, doc.artboard.wMm, doc.artboard.hMm]);

  const disabled = !targetBounds || selectedIds.length < 1;

  const applyAlign = (mode: 'left' | 'centerX' | 'right' | 'top' | 'middleY' | 'bottom') => {
    if (!targetBounds) return;
    setLastSkippedLocked(false);

    const deltas: Array<{ id: string; deltaXMm: number; deltaYMm: number }> = [];
    let skippedLocked = false;

    for (const id of selectedIds) {
      const found = findElementById(doc, id);
      if (!found) continue;
      if (found.layer.locked) {
        skippedLocked = true;
        continue;
      }

      const bounds = getElementBounds(found.element);

      let targetX = found.element.transform.xMm;
      let targetY = found.element.transform.yMm;

      if (mode === 'left') {
        const desiredLeft = targetBounds.xMm;
        const currentLeft = bounds.xMm;
        targetX += desiredLeft - currentLeft;
      }
      if (mode === 'right') {
        const desiredRight = targetBounds.xMm + targetBounds.widthMm;
        const currentRight = bounds.xMm + bounds.widthMm;
        targetX += desiredRight - currentRight;
      }
      if (mode === 'centerX') {
        const desiredCx = targetBounds.xMm + targetBounds.widthMm / 2;
        const currentCx = bounds.xMm + bounds.widthMm / 2;
        targetX += desiredCx - currentCx;
      }

      if (mode === 'top') {
        const desiredTop = targetBounds.yMm;
        const currentTop = bounds.yMm;
        targetY += desiredTop - currentTop;
      }
      if (mode === 'bottom') {
        const desiredBottom = targetBounds.yMm + targetBounds.heightMm;
        const currentBottom = bounds.yMm + bounds.heightMm;
        targetY += desiredBottom - currentBottom;
      }
      if (mode === 'middleY') {
        const desiredCy = targetBounds.yMm + targetBounds.heightMm / 2;
        const currentCy = bounds.yMm + bounds.heightMm / 2;
        targetY += desiredCy - currentCy;
      }

      const dx = targetX - found.element.transform.xMm;
      const dy = targetY - found.element.transform.yMm;

      if (dx !== 0 || dy !== 0) {
        deltas.push({ id, deltaXMm: dx, deltaYMm: dy });
      }
    }

    onApplyDeltas(deltas, skippedLocked);
    setLastSkippedLocked(skippedLocked);
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Align</h3>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="alignTo"
              checked={alignTo === 'selection'}
              onChange={() => {
                setAlignTo('selection');
                setUserOverrodeAlignTo(true);
              }}
              className="accent-blue-500"
            />
            Selection
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="alignTo"
              checked={alignTo === 'artboard'}
              onChange={() => {
                setAlignTo('artboard');
                setUserOverrodeAlignTo(true);
              }}
              className="accent-blue-500"
            />
            Artboard
          </label>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          disabled={disabled}
          onClick={() => applyAlign('left')}
          className="p-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          <AlignHorizontalJustifyStart className="w-4 h-4 mx-auto" />
        </button>
        <button
          disabled={disabled}
          onClick={() => applyAlign('centerX')}
          className="p-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          <AlignHorizontalJustifyCenter className="w-4 h-4 mx-auto" />
        </button>
        <button
          disabled={disabled}
          onClick={() => applyAlign('right')}
          className="p-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          <AlignHorizontalJustifyEnd className="w-4 h-4 mx-auto" />
        </button>

        <button
          disabled={disabled}
          onClick={() => applyAlign('top')}
          className="p-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          <AlignVerticalJustifyStart className="w-4 h-4 mx-auto" />
        </button>
        <button
          disabled={disabled}
          onClick={() => applyAlign('middleY')}
          className="p-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          <AlignVerticalJustifyCenter className="w-4 h-4 mx-auto" />
        </button>
        <button
          disabled={disabled}
          onClick={() => applyAlign('bottom')}
          className="p-2 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          <AlignVerticalJustifyEnd className="w-4 h-4 mx-auto" />
        </button>
      </div>

      <div className="text-[11px] text-slate-400">
        {selectedIds.length === 0 ? 'Select 1+ elements to align.' : ' '}
        {lastSkippedLocked ? 'Some locked items skipped.' : ''}
      </div>
    </div>
  );
}
