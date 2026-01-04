'use client';

import { Shield, X } from 'lucide-react';

export type GlobalDisclaimerMode = 'blocking' | 'readOnly';

export type GlobalDisclaimerProps = {
  mode: GlobalDisclaimerMode;
  onAccept?: () => void;
  onClose?: () => void;
};

const TITLE = 'Important Notice';

const BODY = `LaserFilesPro provides design assistance tools only.
All generated files must be reviewed and tested by the user before cutting.

LaserFilesPro cannot guarantee material safety, machine compatibility,
or final physical results, as these depend on your laser machine,
settings, materials, and handling.

You are fully responsible for verifying designs before production.`;

export function GlobalDisclaimer({ mode, onAccept, onClose }: GlobalDisclaimerProps) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md border border-slate-800 bg-slate-900 p-2 text-slate-300">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-6">{TITLE}</div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{BODY}</p>
        </div>
      </div>

      {mode === 'blocking' && (
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onAccept}
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            I understand
          </button>
        </div>
      )}
    </>
  );

  if (mode === 'readOnly') {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          role="dialog"
          aria-modal="false"
          aria-label={TITLE}
          className="pointer-events-auto fixed right-0 top-0 h-full w-[min(560px,100vw)] border-l border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-2xl"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLE}
        className="relative w-[min(560px,calc(100vw-2rem))] rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl"
      >
        {content}
      </div>
    </div>
  );
}
