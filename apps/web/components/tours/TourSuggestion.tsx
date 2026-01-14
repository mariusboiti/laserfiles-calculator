'use client';

/**
 * Tour Suggestion Component
 * Shows a small prompt asking users if they want to take the tour
 * Includes Tutorial button and "Don't show again" checkbox
 */

import { useCallback, useState } from 'react';
import { X, Sparkles, BookOpen } from 'lucide-react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

interface TourSuggestionProps {
  onStart: () => void;
  onDismiss: () => void;
  onTutorial?: () => void;
  toolSlug?: string;
  hasTutorial?: boolean;
}

export function TourSuggestion({ onStart, onDismiss, onTutorial, toolSlug, hasTutorial }: TourSuggestionProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const handleDismiss = () => {
    if (dontShowAgain && toolSlug) {
      try {
        localStorage.setItem(`tourSuggestionHidden:${toolSlug}`, 'true');
      } catch {
        // ignore
      }
    }
    onDismiss();
  };

  const handleStart = () => {
    if (dontShowAgain && toolSlug) {
      try {
        localStorage.setItem(`tourSuggestionHidden:${toolSlug}`, 'true');
      } catch {
        // ignore
      }
    }
    onStart();
  };

  const handleTutorial = () => {
    if (dontShowAgain && toolSlug) {
      try {
        localStorage.setItem(`tourSuggestionHidden:${toolSlug}`, 'true');
      } catch {
        // ignore
      }
    }
    onTutorial?.();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-sky-500/30 bg-slate-900 shadow-lg shadow-sky-500/10">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/20">
            <Sparkles className="h-4 w-4 text-sky-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-slate-100">
              {t('tour.suggestion_title')}
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              {t('tour.suggestion_body')}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
          >
            {t('tour.suggestion_later')}
          </button>
          {hasTutorial && onTutorial && (
            <button
              onClick={handleTutorial}
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              <BookOpen className="h-3 w-3" />
              {t('tools.tutorial')}
            </button>
          )}
          <button
            onClick={handleStart}
            className="flex-1 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
          >
            {t('tour.suggestion_start')}
          </button>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-500 hover:text-slate-400">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500/30"
          />
          {t('tour.suggestion_dont_show_again')}
        </label>
      </div>
    </div>
  );
}
