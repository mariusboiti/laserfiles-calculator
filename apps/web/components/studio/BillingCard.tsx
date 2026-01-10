'use client';

/**
 * Billing Card Component
 * Shows subscription status, AI credits, and billing actions on the dashboard
 */

import { useState } from 'react';
import { Sparkles, CreditCard, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useEntitlement, startTrial, openBillingPortal, canUseAi } from '@/lib/entitlements/client';

export function BillingCard() {
  const { entitlement, loading, refetch } = useEntitlement();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartTrial = async () => {
    setActionLoading('trial');
    setError(null);
    const result = await startTrial();
    if (!result.success) {
      setError(result.error || 'Failed to start trial');
    }
    setActionLoading(null);
  };

  const handleManageBilling = async () => {
    setActionLoading('billing');
    setError(null);
    const result = await openBillingPortal();
    if (!result.success) {
      setError(result.error || 'Failed to open billing portal');
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
          <div className="h-4 w-48 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-40 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (!entitlement) {
    return null;
  }

  const { plan, aiCreditsRemaining, aiCreditsTotal, aiCreditsUsed, daysLeftInTrial } = entitlement;
  const creditPercent = aiCreditsTotal > 0 ? (aiCreditsRemaining / aiCreditsTotal) * 100 : 0;
  const hasCredits = canUseAi(entitlement);

  const getPlanBadge = () => {
    switch (plan) {
      case 'TRIALING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-900/50 border border-sky-700 px-2 py-0.5 text-xs text-sky-300">
            <Clock className="h-3 w-3" />
            Trial
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 border border-emerald-700 px-2 py-0.5 text-xs text-emerald-300">
            <CheckCircle className="h-3 w-3" />
            Active
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-900/50 border border-red-700 px-2 py-0.5 text-xs text-red-300">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 px-2 py-0.5 text-xs text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
            No Plan
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            AI Credits & Billing
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage your AI usage and subscription
          </p>
        </div>
        {getPlanBadge()}
      </div>

      {/* Credits Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">AI Credits</span>
          <span className="text-sm font-medium text-slate-200">
            {aiCreditsRemaining} / {aiCreditsTotal} remaining
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              creditPercent > 50
                ? 'bg-emerald-500'
                : creditPercent > 20
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${creditPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {aiCreditsUsed} credits used
        </p>
      </div>

      {/* Trial info */}
      {plan === 'TRIALING' && daysLeftInTrial !== null && (
        <div className="mb-6 p-3 rounded-lg bg-sky-900/20 border border-sky-800">
          <div className="flex items-center gap-2 text-sky-300">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {daysLeftInTrial} days left in trial
            </span>
          </div>
          <p className="text-xs text-sky-400/70 mt-1">
            Your card will be charged when the trial ends unless you cancel.
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {plan === 'NONE' && (
          <button
            onClick={handleStartTrial}
            disabled={actionLoading === 'trial'}
            className="flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {actionLoading === 'trial' ? 'Starting...' : 'Start Free Trial'}
          </button>
        )}

        {(plan === 'EXPIRED' || plan === 'INACTIVE') && (
          <button
            onClick={handleStartTrial}
            disabled={actionLoading === 'trial'}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" />
            {actionLoading === 'trial' ? 'Loading...' : 'Subscribe Now'}
          </button>
        )}

        {plan === 'ACTIVE' && entitlement.stripeCustomerId && (
          <button
            onClick={handleManageBilling}
            disabled={actionLoading === 'billing'}
            className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            {actionLoading === 'billing' ? 'Opening...' : 'Manage Billing'}
          </button>
        )}

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-3 py-2 text-sm text-slate-400 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Info text */}
      {plan === 'NONE' && (
        <p className="mt-4 text-xs text-slate-500">
          Start your 7-day free trial with 25 AI credits. Credit card required.
          Cancel anytime before the trial ends to avoid charges.
        </p>
      )}
    </div>
  );
}
