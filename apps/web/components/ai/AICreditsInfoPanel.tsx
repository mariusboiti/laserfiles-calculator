'use client';

import { X } from 'lucide-react';
import { useEntitlement } from '@/lib/entitlements/client';

interface AICreditsInfoPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AICreditsInfoPanel({ open, onClose }: AICreditsInfoPanelProps) {
  const { entitlement, loading } = useEntitlement();

  if (!open) return null;

  const creditsLine = loading
    ? 'Loading credits…'
    : entitlement
      ? `${entitlement.aiCreditsRemaining}/${entitlement.aiCreditsTotal} credits remaining`
      : 'Credits unavailable';

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-950/70" onClick={onClose} aria-hidden="true" />

      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-800 bg-slate-950 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-100">AI Credits</div>
            <div className="mt-1 text-xs text-slate-400">Informational only. No purchasing yet.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-sm text-slate-300">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-xs text-slate-400">Current balance</div>
            <div className="mt-1 text-sm font-medium text-slate-200">{creditsLine}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">What are AI credits?</div>
            <div className="text-sm text-slate-300">
              AI credits are used to run AI generation features inside LaserFilesPro Studio.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-200">How much does AI cost?</div>
            <div className="text-sm text-slate-300">Cost per generation: 1 credit</div>
            <div className="text-sm text-slate-300">Credits are only used when generation is triggered.</div>
            <div className="text-sm text-slate-300">Retrying uses another credit.</div>
            <div className="text-sm text-slate-300">Manual edits do NOT cost credits.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
