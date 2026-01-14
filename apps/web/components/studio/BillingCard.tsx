'use client';

/**
 * Billing Card Component
 * Shows subscription status, AI credits, and billing actions on the dashboard
 */

import { useCallback, useState } from 'react';
import { Sparkles, CreditCard, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useEntitlement, startTrial, startSubscription, startTopup, canUseAi } from '@/lib/entitlements/client';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export function BillingCard() {
  const { entitlement, loading, refetch } = useEntitlement();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const handleStartTrial = async () => {
    setActionLoading('trial');
    setError(null);
    const result = await startTrial();
    if (!result.success) {
      setError(result.error || t('billing.failed_to_start_trial'));
    }
    setActionLoading(null);
  };

  const handleSubscribe = async (interval: 'monthly' | 'annual') => {
    setActionLoading('subscribe');
    setError(null);
    const result = await startSubscription(interval);
    if (!result.success) {
      setError(result.error || t('pricing.failed_to_subscribe'));
    }
    setActionLoading(null);
  };

  const handleTopup = async (wpProductId: number) => {
    setActionLoading(`topup-${wpProductId}`);
    setError(null);
    const result = await startTopup(wpProductId);
    if (!result.success) {
      setError(result.error || t('pricing.failed_to_purchase_topup'));
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
  const effectivePlan =
    plan === 'TRIALING' || plan === 'ACTIVE' || plan === 'INACTIVE' || plan === 'CANCELED' ? plan : 'INACTIVE';
  const creditPercent = aiCreditsTotal > 0 ? (aiCreditsRemaining / aiCreditsTotal) * 100 : 0;
  const hasCredits = canUseAi(entitlement);

  const getPlanBadge = () => {
    switch (effectivePlan) {
      case 'TRIALING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-900/50 border border-sky-700 px-2 py-0.5 text-xs text-sky-300">
            <Clock className="h-3 w-3" />
            {t('billing.badge.trial')}
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/50 border border-emerald-700 px-2 py-0.5 text-xs text-emerald-300">
            <CheckCircle className="h-3 w-3" />
            {t('billing.badge.active')}
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/50 border border-amber-700 px-2 py-0.5 text-xs text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            {t('billing.badge.inactive')}
          </span>
        );
      case 'CANCELED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-900/50 border border-red-700 px-2 py-0.5 text-xs text-red-300">
            <AlertTriangle className="h-3 w-3" />
            {t('billing.badge.canceled')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
            {t('billing.badge.no_plan')}
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
            {t('billing.title')}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {t('billing.subtitle')}
          </p>
        </div>
        {getPlanBadge()}
      </div>

      {/* Credits Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">{t('billing.ai_credits_label')}</span>
          <span className="text-sm font-medium text-slate-200">
            {aiCreditsRemaining} / {aiCreditsTotal} {t('billing.remaining')}
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
          {aiCreditsUsed} {t('billing.credits_used')}
        </p>
      </div>

      {/* Trial info */}
      {effectivePlan === 'TRIALING' && daysLeftInTrial !== null && (
        <div className="mb-6 p-3 rounded-lg bg-sky-900/20 border border-sky-800">
          <div className="flex items-center gap-2 text-sky-300">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {daysLeftInTrial} {t('billing.days_left_in_trial')}
            </span>
          </div>
          <p className="text-xs text-sky-400/70 mt-1">
            {t('billing.trial_charge_notice')}
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
        {effectivePlan === 'INACTIVE' && (
          <button
            onClick={handleStartTrial}
            disabled={actionLoading === 'trial'}
            className="flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {actionLoading === 'trial' ? t('billing.starting') : t('billing.start_free_trial')}
          </button>
        )}

        {(effectivePlan === 'INACTIVE' || effectivePlan === 'CANCELED') && (
          <>
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={actionLoading === 'subscribe'}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {actionLoading === 'subscribe' ? t('billing.loading') : t('pricing.subscribe_monthly')}
            </button>
            <button
              onClick={() => handleSubscribe('annual')}
              disabled={actionLoading === 'subscribe'}
              className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              {t('pricing.subscribe_annual')}
            </button>
          </>
        )}

        {effectivePlan === 'ACTIVE' && (
          <>
            <button
              onClick={() => handleTopup(2807)}
              disabled={actionLoading === 'topup-2807'}
              className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {actionLoading === 'topup-2807' ? t('billing.loading') : t('billing.topup_100')}
            </button>
            <button
              onClick={() => handleTopup(2811)}
              disabled={actionLoading === 'topup-2811'}
              className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {actionLoading === 'topup-2811' ? t('billing.loading') : t('billing.topup_200')}
            </button>
            <button
              onClick={() => handleTopup(2814)}
              disabled={actionLoading === 'topup-2814'}
              className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {actionLoading === 'topup-2814' ? t('billing.loading') : t('billing.topup_500')}
            </button>
          </>
        )}

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 px-3 py-2 text-sm text-slate-400 transition-colors"
        >
          {t('pricing.refresh')}
        </button>
      </div>

      {/* Info text */}
      {effectivePlan === 'INACTIVE' && (
        <p className="mt-4 text-xs text-slate-500">
          {t('billing.trial_info_text')}
        </p>
      )}
    </div>
  );
}
