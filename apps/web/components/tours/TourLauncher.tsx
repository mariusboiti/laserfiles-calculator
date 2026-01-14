'use client';

/**
 * Tour Launcher Component
 * Small button to start/replay tour, shown in ToolShell header
 */

import { HelpCircle, Play, RotateCcw } from 'lucide-react';
import type { TourStatus } from '@/lib/tours/types';
import { useCallback } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface TourLauncherProps {
  status: TourStatus;
  isLoading: boolean;
  hasTour: boolean;
  onStartTour: () => void;
}

export function TourLauncher({
  status,
  isLoading,
  hasTour,
  onStartTour,
}: TourLauncherProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  if (!hasTour) {
    return null;
  }

  if (isLoading) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-500"
      >
        <HelpCircle className="h-3.5 w-3.5 animate-pulse" />
        <span>{t('shell.tour')}</span>
      </button>
    );
  }

  const isCompleted = status === 'COMPLETED';
  const isSkipped = status === 'SKIPPED';
  const showReplay = isCompleted || isSkipped;

  return (
    <button
      onClick={onStartTour}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
        showReplay
          ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          : 'border-sky-500/50 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
      }`}
    >
      {showReplay ? (
        <>
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t('shell.replay_tour')}</span>
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" />
          <span>{t('shell.start_tour')}</span>
        </>
      )}
    </button>
  );
}
