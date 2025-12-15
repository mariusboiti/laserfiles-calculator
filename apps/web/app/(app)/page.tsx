'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';
import { useT } from './i18n';

interface SalesChannelsOverview {
  totalConnections: number;
  connectionsWithErrors: number;
  externalOrdersImportedLast7Days: number;
  externalOrdersNeedsReview: number;
  externalOrdersIgnored: number;
}

interface DashboardData {
  ordersThisWeek: number;
  revenueEstimateThisWeek: number;
  topMaterialsByUsage: { materialId: string | null; materialName: string; count: number }[];
  averageProductionMinutesPerItem: number;
  salesChannels: SalesChannelsOverview;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tutorialPercent, setTutorialPercent] = useState<number | null>(null);

  const router = useRouter();
  const t = useT();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('tutorialProgress');
      if (!raw) {
        setTutorialPercent(0);
        return;
      }
      const parsed = JSON.parse(raw);
      const completedStepIds = Array.isArray(parsed?.completedStepIds) ? parsed.completedStepIds : [];
      const completedChecklistItemIds = Array.isArray(parsed?.completedChecklistItemIds)
        ? parsed.completedChecklistItemIds
        : [];

      const totalSteps = 10;
      const totalChecklistItems = 20;
      const total = totalSteps + totalChecklistItems;
      const done = completedStepIds.length + completedChecklistItemIds.length;
      const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
      setTutorialPercent(percent);
    } catch {
      setTutorialPercent(0);
    }
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DashboardData>('/analytics/dashboard');
      setData(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('dashboard.failed_to_load_analytics');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
      {loading && <p className="text-sm text-slate-400">{t('dashboard.loading_analytics')}</p>}
      {error && !loading && (
        <div className="space-y-1 text-sm">
          <p className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            {t('common.retry')}
          </button>
        </div>
      )}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => router.push('/tutorial')}
            data-tour="dashboard-tutorial-card"
            className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-4 text-left transition hover:bg-slate-800/60"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">{t('dashboard.tutorial_label')}</p>
                <p className="mt-1 text-lg font-semibold">{t('dashboard.tutorial_quick_start')}</p>
              </div>
              {typeof tutorialPercent === 'number' && (
                <span className="inline-flex rounded-full border border-sky-500/60 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300">
                  {tutorialPercent}%
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {t('dashboard.tutorial_desc')}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${tutorialPercent ?? 0}%` }}
              />
            </div>
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">{t('dashboard.orders_this_week')}</p>
            <p className="mt-1 text-2xl font-semibold">{data.ordersThisWeek}</p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">{t('dashboard.revenue_estimate_this_week')}</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.revenueEstimateThisWeek.toFixed(2)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">{t('dashboard.avg_minutes_per_item')}</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.averageProductionMinutesPerItem.toFixed(1)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/materials')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">{t('dashboard.top_materials')}</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-300">
              {data.topMaterialsByUsage.map((m) => (
                <li key={m.materialId ?? m.materialName}>
                  {m.materialName} – {m.count}
                </li>
              ))}
              {data.topMaterialsByUsage.length === 0 && <li>{t('dashboard.no_data_yet')}</li>}
            </ul>
          </button>
          <button
            type="button"
            onClick={() => router.push('/sales-channels')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">{t('dashboard.sales_channels')}</p>
            <div className="mt-1 space-y-1 text-xs text-slate-300">
              <div>
                {t('dashboard.connections')}: {' '}
                <span className="font-semibold">
                  {data.salesChannels.totalConnections}
                </span>
              </div>
              <div>
                {t('dashboard.imported_last_7_days')}: {' '}
                <span className="font-semibold">
                  {data.salesChannels.externalOrdersImportedLast7Days}
                </span>
              </div>
              <div
                className={
                  data.salesChannels.externalOrdersNeedsReview > 0
                    ? 'text-amber-300'
                    : 'text-slate-400'
                }
              >
                {t('dashboard.need_review')}: {' '}
                <span className="font-semibold">
                  {data.salesChannels.externalOrdersNeedsReview}
                </span>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
