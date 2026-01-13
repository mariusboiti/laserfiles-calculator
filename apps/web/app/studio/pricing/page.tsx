'use client';

import { useState } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import { useEntitlement, startSubscription, startTopup } from '@/lib/entitlements/client';

export default function StudioPricingPage() {
  const { entitlement, loading, error, refetch } = useEntitlement();
  const [action, setAction] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const plan = entitlement?.plan;

  const onSubscribe = async (interval: 'monthly' | 'annual') => {
    setAction(`subscribe-${interval}`);
    setLocalError(null);
    const res = await startSubscription(interval);
    if (!res.success) setLocalError(res.error || 'Failed to subscribe');
    setAction(null);
  };

  const onTopup = async (wpProductId: number) => {
    setAction(`topup-${wpProductId}`);
    setLocalError(null);
    const res = await startTopup(wpProductId);
    if (!res.success) setLocalError(res.error || 'Failed to purchase top-up');
    setAction(null);
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Pricing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Subscribe to Pro to unlock AI tools and get monthly credit grants. Credits accumulate.
        </p>
      </div>

      {(error || localError) && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          {localError || error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Pro Monthly</h2>
              <p className="mt-1 text-sm text-slate-400">+200 credits / month. 7-day trial + 25 credits (one time).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSubscribe('monthly')}
            disabled={action === 'subscribe-monthly'}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" />
            {action === 'subscribe-monthly' ? 'Loading...' : 'Subscribe Monthly'}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Pro Annual</h2>
              <p className="mt-1 text-sm text-slate-400">Billed yearly. Still grants +200 credits each month.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSubscribe('annual')}
            disabled={action === 'subscribe-annual'}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {action === 'subscribe-annual' ? 'Loading...' : 'Subscribe Annual'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Credit Top-ups</h2>
            <p className="mt-1 text-sm text-slate-400">Available only if you have an active paid plan.</p>
            <p className="mt-1 text-xs text-slate-500">Current plan: {plan || 'Unknown'}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onTopup(2807)}
            disabled={action === 'topup-2807'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {action === 'topup-2807' ? 'Loading...' : 'Buy 100 credits'}
          </button>
          <button
            type="button"
            onClick={() => onTopup(2811)}
            disabled={action === 'topup-2811'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {action === 'topup-2811' ? 'Loading...' : 'Buy 200 credits'}
          </button>
          <button
            type="button"
            onClick={() => onTopup(2814)}
            disabled={action === 'topup-2814'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {action === 'topup-2814' ? 'Loading...' : 'Buy 500 credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
