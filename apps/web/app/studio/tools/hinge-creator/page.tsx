'use client';

export default function HingeCreatorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Hinge Creator</h1>
        <span className="rounded-full bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-400">
          Coming Soon
        </span>
      </div>

      <p className="text-sm text-slate-400">
        Generate living hinges and flexible joint patterns for bendable laser-cut projects.
      </p>

      <button
        type="button"
        disabled
        className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-500 opacity-50 cursor-not-allowed"
      >
        Coming Soon
      </button>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center opacity-60">
        <p className="text-slate-500">This tool is under development and will be available soon</p>
      </div>
    </div>
  );
}
