'use client';

/**
 * Tour Launcher Component
 * Small button to start/replay tour, shown in ToolShell header
 */

import { HelpCircle, Play, RotateCcw } from 'lucide-react';
import type { TourStatus } from '@/lib/tours/types';

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
        <span>Tour</span>
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
          <span>Replay Tour</span>
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" />
          <span>Start Tour</span>
        </>
      )}
    </button>
  );
}
