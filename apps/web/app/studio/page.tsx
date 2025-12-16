'use client';

import Link from 'next/link';

export default function StudioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Studio Tools</h1>
        <p className="mt-1 text-sm text-slate-400">
          Professional tools for laser cutting businesses
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/studio/tools/price-calculator"
          className="group rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-sky-500/50 hover:bg-slate-900"
        >
          <div className="mb-2 text-lg font-semibold text-sky-400 group-hover:text-sky-300">
            Price Calculator
          </div>
          <p className="text-sm text-slate-400">
            Calculate accurate pricing for laser cutting projects with material costs, machine
            time, and margins.
          </p>
        </Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 opacity-50">
          <div className="mb-2 text-lg font-semibold text-slate-400">More tools coming soon</div>
          <p className="text-sm text-slate-500">Additional studio tools will be added here.</p>
        </div>
      </div>
    </div>
  );
}
