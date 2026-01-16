'use client';

/**
 * Alignment Controls for Round Coaster PRO
 * Provides alignment and distribution tools for selected elements
 */

import React from 'react';
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  AlignStartVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export type AlignmentAction =
  | 'align-left'
  | 'align-center-h'
  | 'align-right'
  | 'align-top'
  | 'align-center-v'
  | 'align-bottom'
  | 'distribute-h'
  | 'distribute-v'
  | 'center-artboard';

interface AlignmentControlsProps {
  onAlign: (action: AlignmentAction) => void;
  selectionCount: number;
  disabled?: boolean;
}

export function AlignmentControls({ onAlign, selectionCount, disabled }: AlignmentControlsProps) {
  const { locale } = useLanguage();
  const t = React.useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const hasSelection = selectionCount > 0;
  const hasMultiple = selectionCount > 1;

  const buttonClass = (enabled: boolean) =>
    `p-1.5 rounded ${enabled && !disabled
      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
      : 'bg-slate-900 text-slate-600 cursor-not-allowed'
    }`;

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-slate-400 mb-1">{t('round_coaster.alignment.title')}</div>

      {/* Horizontal alignment */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onAlign('align-left')}
          disabled={!hasSelection || disabled}
          className={buttonClass(hasSelection)}
          title={t('round_coaster.alignment.align_left')}
        >
          <AlignStartVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onAlign('align-center-h')}
          disabled={!hasSelection || disabled}
          className={buttonClass(hasSelection)}
          title={t('round_coaster.alignment.align_center_h')}
        >
          <AlignHorizontalJustifyCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onAlign('align-right')}
          disabled={!hasSelection || disabled}
          className={buttonClass(hasSelection)}
          title={t('round_coaster.alignment.align_right')}
        >
          <AlignEndVertical className="w-4 h-4" />
        </button>

        <div className="w-px bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => onAlign('align-top')}
          disabled={!hasSelection || disabled}
          className={buttonClass(hasSelection)}
          title={t('round_coaster.alignment.align_top')}
        >
          <AlignStartHorizontal className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onAlign('align-center-v')}
          disabled={!hasSelection || disabled}
          className={buttonClass(hasSelection)}
          title={t('round_coaster.alignment.align_center_v')}
        >
          <AlignVerticalJustifyCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onAlign('align-bottom')}
          disabled={!hasSelection || disabled}
          className={buttonClass(hasSelection)}
          title={t('round_coaster.alignment.align_bottom')}
        >
          <AlignEndHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Distribution */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onAlign('distribute-h')}
          disabled={!hasMultiple || disabled}
          className={buttonClass(hasMultiple)}
          title={t('round_coaster.alignment.distribute_h')}
        >
          <AlignHorizontalDistributeCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onAlign('distribute-v')}
          disabled={!hasMultiple || disabled}
          className={buttonClass(hasMultiple)}
          title={t('round_coaster.alignment.distribute_v')}
        >
          <AlignVerticalDistributeCenter className="w-4 h-4" />
        </button>

        <div className="w-px bg-slate-700 mx-1" />

        <button
          type="button"
          onClick={() => onAlign('center-artboard')}
          disabled={!hasSelection || disabled}
          className={`${buttonClass(hasSelection)} px-2 text-[10px]`}
          title={t('round_coaster.alignment.center_artboard')}
        >
          {t('round_coaster.alignment.snap_center')}
        </button>
      </div>

      {selectionCount === 0 && (
        <div className="text-[10px] text-slate-500 mt-1">
          {t('round_coaster.alignment.select_to_align')}
        </div>
      )}
    </div>
  );
}

export default AlignmentControls;
