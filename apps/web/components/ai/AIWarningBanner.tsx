'use client';

import { useState, useEffect } from 'react';
import { Info, X } from 'lucide-react';

const STORAGE_KEY = 'ai-warning-dismissed';

interface AIWarningBannerProps {
  className?: string;
}

export function AIWarningBanner({ className = '' }: AIWarningBannerProps) {
  const [state, setState] = useState<'unknown' | 'shown' | 'dismissed'>('unknown');

  useEffect(() => {
    try {
      const wasDismissed = sessionStorage.getItem(STORAGE_KEY) === 'true';
      setState(wasDismissed ? 'dismissed' : 'shown');
    } catch {
      setState('shown');
    }
  }, []);

  const handleDismiss = () => {
    setState('dismissed');
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (state !== 'shown') return null;

  return (
    <div
      className={`relative rounded-lg border border-slate-700 bg-slate-800/50 p-3 ${className}`}
    >
      <div className="flex gap-3">
        <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-300">AI-assisted design</div>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Designed to assist — always review before cutting. Refining your input usually improves results.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
