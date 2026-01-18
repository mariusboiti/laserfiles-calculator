'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';
import { useEntitlement } from '@/lib/entitlements/client';

interface QuoteItem {
  id: string;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  dataJson: any;
  createdAt: string;
}

interface QuotesListResponse {
  data: QuoteItem[];
  total: number;
  page: number;
  pageSize: number;
}

export default function QuotesPage() {
  const t = useT();
  const { entitlement, loading: entitlementLoading, error: entitlementError } = useEntitlement();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entitlementPlan = entitlement?.plan ?? null;
  const canUseQuotes = entitlementPlan === 'TRIALING' || entitlementPlan === 'ACTIVE';

  useEffect(() => {
    async function load() {
      if (!canUseQuotes) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<QuotesListResponse>('/quotes');
        setQuotes(res.data.data);
      } catch (err: any) {
        const message = err?.response?.data?.message || t('quotes.failed_to_load');
        setError(Array.isArray(message) ? message.join(', ') : String(message));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [canUseQuotes]);

  if (entitlementLoading) {
    return <p className="text-sm text-slate-400">{t('common.loading')}</p>;
  }

  if (entitlementError) {
    return <p className="text-sm text-red-400">{entitlementError}</p>;
  }

  if (!canUseQuotes) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h1 className="text-lg font-semibold tracking-tight text-slate-100">{t('pricing.locked_title')}</h1>
        <p className="text-sm text-slate-400">{t('pricing.locked_desc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <h1 className="text-xl font-semibold tracking-tight">{t('quotes.title')}</h1>
        <p className="text-xs text-slate-400">
          {t('quotes.subtitle')}
        </p>
      </div>

      {loading && <p className="text-sm text-slate-400">{t('quotes.loading')}</p>}
      {error && !loading && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && quotes.length === 0 && (
        <p className="text-sm text-slate-400">{t('quotes.none_found')}</p>
      )}

      {!loading && !error && quotes.length > 0 && (
        <div
          className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60"
          data-tour="quotes-table"
        >
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">{t('quotes.table.quote')}</th>
                <th className="px-3 py-2">{t('quotes.table.customer')}</th>
                <th className="px-3 py-2">{t('quotes.table.material')}</th>
                <th className="px-3 py-2">{t('quotes.table.recommended_price')}</th>
                <th className="px-3 py-2">{t('quotes.table.created')}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const data = q.dataJson || {};
                const materialName = data.material?.name ?? t('common.none');
                const breakdown = data.breakdown ?? null;
                let recommended: number | null = null;
                if (breakdown && breakdown.recommendedPrice != null) {
                  const num = Number(breakdown.recommendedPrice);
                  recommended = Number.isFinite(num) ? num : null;
                }

                return (
                  <tr key={q.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                    <td className="px-3 py-2 align-top">
                      <Link
                        href={`/quotes/${q.id}`}
                        className="text-xs font-medium text-sky-400 hover:underline"
                      >
                        {q.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-300">
                      {q.customer ? (
                        <div>
                          <div className="font-medium">{q.customer.name}</div>
                          {q.customer.email && (
                            <div className="text-[11px] text-slate-400">{q.customer.email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">{t('quotes.no_customer')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-300">{materialName}</td>
                    <td className="px-3 py-2 align-top text-xs text-slate-300">
                      {recommended != null ? (
                        <span>{recommended.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">{t('quotes.na')}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-slate-400">
                      {new Date(q.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
