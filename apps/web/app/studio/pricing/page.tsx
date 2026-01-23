'use client';

import { useState } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import { useEntitlement, startSubscription, startTopup } from '@/lib/entitlements/client';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export default function StudioPricingPage() {
  const { entitlement, loading, error, refetch } = useEntitlement();
  const [action, setAction] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { locale } = useLanguage();

  const t = (key: string) => getStudioTranslation(locale as any, key);

  const plan = entitlement?.plan;

  const errorLabel = (() => {
    if (!error) return null;
    if (error === 'ENTITLEMENTS_HTTP_401') return t('pricing.entitlements_http_401');
    if (error === 'ENTITLEMENTS_HTTP_403') return t('pricing.entitlements_http_403');
    if (error === 'ENTITLEMENTS_HTTP_404') return t('pricing.entitlements_http_404');
    if (error === 'ENTITLEMENTS_HTTP_500') return t('pricing.entitlements_http_500');
    if (error.startsWith('ENTITLEMENTS_HTTP_')) return t('pricing.entitlements_http_generic');
    return error;
  })();

  const planLabel = (() => {
    if (plan === 'TRIAL') return t('billing.badge.trial');
    if (plan === 'ACTIVE') return t('billing.badge.active');
    if (plan === 'NONE') return t('billing.badge.inactive');
    if (plan === 'CANCELED') return t('billing.badge.canceled');
    return t('billing.badge.no_plan');
  })();

  const onSubscribe = async (interval: 'monthly' | 'annual') => {
    setAction(`subscribe-${interval}`);
    setLocalError(null);
    const res = await startSubscription(interval);
    if (!res.success) setLocalError(res.error || t('pricing.failed_to_subscribe'));
    setAction(null);
  };

  const onTopup = async (wpProductId: number) => {
    setAction(`topup-${wpProductId}`);
    setLocalError(null);
    const res = await startTopup(wpProductId);
    if (!res.success) setLocalError(res.error || t('pricing.failed_to_purchase_topup'));
    setAction(null);
  };

  if (loading) {
    return <div className="text-sm text-slate-400">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{t('nav.pricing')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('pricing.subtitle')}
        </p>
      </div>

      {(errorLabel || localError) && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-300">
          {localError || errorLabel}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{t('pricing.pro_monthly_title')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('pricing.pro_monthly_desc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSubscribe('monthly')}
            disabled={action === 'subscribe-monthly'}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" />
            {action === 'subscribe-monthly' ? t('common.loading') : t('pricing.subscribe_monthly')}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">{t('pricing.pro_annual_title')}</h2>
              <p className="mt-1 text-sm text-slate-400">{t('pricing.pro_annual_desc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSubscribe('annual')}
            disabled={action === 'subscribe-annual'}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {action === 'subscribe-annual' ? t('common.loading') : t('pricing.subscribe_annual')}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{t('pricing.credit_topups_title')}</h2>
            <p className="mt-1 text-sm text-slate-400">{t('pricing.credit_topups_desc')}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t('pricing.current_plan')}: {planLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            {t('pricing.refresh')}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onTopup(2807)}
            disabled={action === 'topup-2807'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {action === 'topup-2807' ? t('common.loading') : t('pricing.buy_credits_100')}
          </button>
          <button
            type="button"
            onClick={() => onTopup(2811)}
            disabled={action === 'topup-2811'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {action === 'topup-2811' ? t('common.loading') : t('pricing.buy_credits_200')}
          </button>
          <button
            type="button"
            onClick={() => onTopup(2814)}
            disabled={action === 'topup-2814'}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {action === 'topup-2814' ? t('common.loading') : t('pricing.buy_credits_500')}
          </button>
        </div>
      </div>
    </div>
  );
}
