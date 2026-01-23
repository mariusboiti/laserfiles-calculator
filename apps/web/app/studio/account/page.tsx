'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import Link from 'next/link';
import { startTrial, startTopup } from '../../../lib/entitlements/client';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { locale } = useLanguage();

  const t = (key: string) => getStudioTranslation(locale as any, key);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-400">{t('common.loading')}</div>
      </div>
    );
  }

  const wpBase = (process.env.NEXT_PUBLIC_WP_BASE_URL || 'https://laserfilespro.com').replace(/\/$/, '');
  const wpManageSubscriptionUrl = `${wpBase}/my-account/`;
  const wpBillingHistoryUrl = `${wpBase}/my-account/orders/`;

  const plan = String(user?.plan || 'INACTIVE').toUpperCase();
  const status = String(user?.status || plan).toUpperCase();
  const billingCycle = user?.interval ? String(user.interval) : null;
  const trialEndsAt = user?.trialEndsAt ? new Date(String(user.trialEndsAt)) : null;
  const aiCreditsTotal = Number(user?.aiCreditsTotal ?? 0) || 0;
  const aiCreditsUsed = Number(user?.aiCreditsUsed ?? 0) || 0;
  const aiCreditsAvailable = Math.max(0, aiCreditsTotal - aiCreditsUsed);
  const creditsPercent = aiCreditsTotal > 0 ? Math.min(100, Math.max(0, (aiCreditsAvailable / aiCreditsTotal) * 100)) : 0;

  const daysLeftInTrial = (() => {
    if (!trialEndsAt) return null;
    const diffMs = trialEndsAt.getTime() - Date.now();
    if (!Number.isFinite(diffMs)) return null;
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  })();

  async function handleStartTrial() {
    try {
      setActionLoading('trial');
      await startTrial();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBuyCredits() {
    // In the WP-first billing flow, top-ups should be purchased via WooCommerce.
    // We redirect to WordPress checkout for a default top-up pack.
    // Product IDs can be adjusted via environment variables later.
    const defaultTopupProductId = Number(process.env.NEXT_PUBLIC_WP_PRODUCT_TOPUP_100_ID || 2807);
    try {
      setActionLoading('credits');
      await startTopup(defaultTopupProductId);
    } finally {
      setActionLoading(null);
    }
  }

  const showFreeBanner = plan === 'INACTIVE';
  const showTrialExpiredBanner = status === 'EXPIRED';

  const planLabel = (() => {
    if (plan === 'TRIAL') return t('account.plan_trial');
    if (plan === 'ACTIVE' && billingCycle === 'monthly') return t('account.plan_pro_monthly');
    if (plan === 'ACTIVE' && billingCycle === 'annual') return t('account.plan_pro_annual');
    if (plan === 'ACTIVE') return t('account.plan_pro_monthly');
    return t('account.plan_free');
  })();

  const statusLabel = (() => {
    if (status === 'ACTIVE') return t('account.status_active');
    if (status === 'TRIAL') return t('account.status_trial');
    if (status === 'EXPIRED') return t('account.status_expired');
    if (status === 'CANCELED') return t('account.status_canceled');
    return t('account.status_free');
  })();

  const cycleLabel =
    billingCycle === 'annual'
      ? t('account.billing_cycle_annual')
      : billingCycle === 'monthly'
        ? t('account.billing_cycle_monthly')
        : null;

  const roleRaw = String(user?.role || 'USER').toUpperCase();
  const roleLabel = (() => {
    if (roleRaw === 'USER') return t('account.role.user');
    if (roleRaw === 'ADMIN') return t('account.role.admin');
    return roleRaw;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.account')}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('account.subtitle')}
        </p>
      </div>

      {showFreeBanner && (
        <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-4 text-sm text-amber-200">
          {t('account.banner_free')}
        </div>
      )}

      {showTrialExpiredBanner && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-4 text-sm text-red-200">
          {t('account.banner_trial_ended')}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('account.profile_title')}</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-slate-400">{t('account.email')}</div>
                <div className="mt-1 text-slate-200">{user?.email}</div>
              </div>
              <div>
                <div className="text-slate-400">{t('account.name')}</div>
                <div className="mt-1 text-slate-200">{user?.name || t('common.none')}</div>
              </div>
              <div>
                <div className="text-slate-400">{t('account.role')}</div>
                <div className="mt-1 text-slate-200">{roleLabel}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('account.plan_title')}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-200">
                <span className="font-semibold">{planLabel}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
                {t('account.status_label')}: <span className="font-medium text-slate-100">{statusLabel}</span>
              </span>
              {cycleLabel && (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
                  {t('account.billing_label')}: <span className="font-medium text-slate-100">{cycleLabel}</span>
                </span>
              )}
            </div>

            {plan === 'TRIAL' && typeof daysLeftInTrial === 'number' && (
              <div className="mt-3 text-sm text-slate-300">
                {t('account.trial_ends_in')}{' '}
                <span className="font-semibold text-slate-100">{daysLeftInTrial}</span>{' '}
                {t('account.day_s')}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {plan === 'INACTIVE' ? (
                <button
                  type="button"
                  disabled={actionLoading === 'trial'}
                  onClick={handleStartTrial}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
                >
                  {actionLoading === 'trial' ? t('account.redirecting') : t('account.start_trial')}
                </button>
              ) : (
                <a
                  href={wpManageSubscriptionUrl}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500"
                >
                  {t('account.manage_subscription')}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-sky-800 bg-gradient-to-br from-sky-900/30 to-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('dashboard.ai_credits')}</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-900/60 p-3">
                <div className="text-xs text-slate-400">{t('account.credits_available')}</div>
                <div className="mt-1 text-xl font-semibold text-slate-100">{aiCreditsAvailable}</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3">
                <div className="text-xs text-slate-400">{t('account.credits_used')}</div>
                <div className="mt-1 text-xl font-semibold text-slate-100">{aiCreditsUsed}</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 p-3">
                <div className="text-xs text-slate-400">{t('account.credits_total')}</div>
                <div className="mt-1 text-xl font-semibold text-slate-100">{aiCreditsTotal}</div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-sky-500" style={{ width: `${creditsPercent}%` }} />
            </div>

            <p className="mt-4 text-xs text-slate-300">
              {t('account.credits_help')}
            </p>

            <div className="mt-5">
              <button
                type="button"
                disabled={actionLoading === 'credits'}
                onClick={handleBuyCredits}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {actionLoading === 'credits' ? t('account.redirecting') : t('account.buy_more_credits')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-lg font-semibold">{t('account.quick_actions')}</h2>
            <div className="space-y-2 text-sm">
              <Link
                href="/studio/tools"
                className="block rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800"
              >
                {t('account.open_tools')} →
              </Link>

              <button
                type="button"
                disabled={actionLoading === 'credits'}
                onClick={handleBuyCredits}
                className="block w-full rounded-lg border border-slate-700 px-4 py-2 text-left text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800 disabled:opacity-50"
              >
                {t('account.buy_credits')} →
              </button>

              <a
                href={wpManageSubscriptionUrl}
                className="block rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800"
              >
                {t('account.manage_subscription')} →
              </a>

              <a
                href={wpBillingHistoryUrl}
                className="block rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-sky-500/50 hover:bg-slate-800"
              >
                {t('account.billing_history')} →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
