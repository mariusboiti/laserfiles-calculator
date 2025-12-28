'use client';

export default function BulkNameTagPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bulk Name Tag Generator</h1>
        <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-400">
          v1
        </span>
      </div>

      <p className="text-sm text-slate-400">
        Create multiple personalized name tags from a list in batch with custom fonts and layouts.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Open Tool
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-500 opacity-50 cursor-not-allowed"
        >
          Export
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <p className="text-slate-400">Tool interface coming soon</p>
      </div>
    </div>
  );
}
