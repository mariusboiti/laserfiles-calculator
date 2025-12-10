'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api-client';

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

  const router = useRouter();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DashboardData>('/analytics/dashboard');
      setData(res.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load analytics';
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
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      {loading && <p className="text-sm text-slate-400">Loading analytics…</p>}
      {error && !loading && (
        <div className="space-y-1 text-sm">
          <p className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      )}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">Orders this week</p>
            <p className="mt-1 text-2xl font-semibold">{data.ordersThisWeek}</p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">Revenue estimate this week</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.revenueEstimateThisWeek.toFixed(2)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">Avg minutes per item</p>
            <p className="mt-1 text-2xl font-semibold">
              {data.averageProductionMinutesPerItem.toFixed(1)}
            </p>
          </button>
          <button
            type="button"
            onClick={() => router.push('/materials')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">Top materials</p>
            <ul className="mt-1 space-y-1 text-xs text-slate-300">
              {data.topMaterialsByUsage.map((m) => (
                <li key={m.materialId ?? m.materialName}>
                  {m.materialName} – {m.count}
                </li>
              ))}
              {data.topMaterialsByUsage.length === 0 && <li>No data yet</li>}
            </ul>
          </button>
          <button
            type="button"
            onClick={() => router.push('/sales-channels')}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:bg-slate-800/60"
          >
            <p className="text-xs text-slate-400">Sales channels</p>
            <div className="mt-1 space-y-1 text-xs text-slate-300">
              <div>
                Connections: {' '}
                <span className="font-semibold">
                  {data.salesChannels.totalConnections}
                </span>
              </div>
              <div>
                Imported last 7 days: {' '}
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
                Need review: {' '}
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
