'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { useT } from '../i18n';

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

interface UsageResponse {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export default function QuotesPage() {
  const t = useT();
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageResponse | null>(null);

  useEffect(() => {
    async function load() {
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
  }, []);

  function generateCSV(quote: QuoteItem): string {
    const data = quote.dataJson || {};
    const breakdown = data.breakdown || {};
    const input = data.input || {};

    const na = t('common.na');

    const rows = [
      [t('quotes.csv.quote_id'), quote.id],
      [t('quotes.csv.created_at'), new Date(quote.createdAt).toLocaleString()],
      [t('quotes.csv.customer'), quote.customer?.name || na],
      [t('quotes.csv.customer_email'), quote.customer?.email || na],
      [''],
      [t('quotes.csv.material'), data.material?.name || na],
      [t('quotes.csv.material_category'), data.material?.category || na],
      [t('quotes.csv.thickness_mm'), data.material?.thicknessMm || na],
      [''],
      [t('quotes.csv.quantity'), input.quantity || na],
      [t('quotes.csv.width_mm'), input.widthMm || na],
      [t('quotes.csv.height_mm'), input.heightMm || na],
      [t('quotes.csv.waste_percent'), input.wastePercent || na],
      [t('quotes.csv.machine_minutes'), input.machineMinutes || na],
      [t('quotes.csv.machine_hourly_cost'), input.machineHourlyCost || na],
      [t('quotes.csv.target_margin_percent'), input.targetMarginPercent || na],
      [''],
      [t('quotes.csv.material_cost'), breakdown.materialCost?.toFixed(2) || na],
      [t('quotes.csv.machine_cost'), breakdown.machineCost?.toFixed(2) || na],
      [t('quotes.csv.labor_cost'), breakdown.laborCost?.toFixed(2) || na],
      [t('quotes.csv.total_cost'), breakdown.totalCost?.toFixed(2) || na],
      [t('quotes.csv.margin_percent'), breakdown.marginPercent || na],
      [t('quotes.csv.recommended_price'), breakdown.recommendedPrice?.toFixed(2) || na],
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleExport(quote: QuoteItem) {
    setExporting(quote.id);
    try {
      // Check usage limit BEFORE exporting
      const usageRes = await apiClient.post<UsageResponse>('/usage/export', {
        toolKey: 'price-calculator',
      });

      setUsageInfo(usageRes.data);

      if (!usageRes.data.allowed) {
        // Show upgrade modal if limit reached
        setShowUpgradeModal(true);
        return;
      }

      // Generate and download CSV
      const csv = generateCSV(quote);
      const filename = `quote-${quote.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csv, filename);
    } catch (err: any) {
      const message = err?.response?.data?.message || t('quotes.export_failed');
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setExporting(null);
    }
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
                <th className="px-3 py-2">{t('common.actions')}</th>
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
                    <td className="px-3 py-2 align-top">
                      <button
                        onClick={() => handleExport(q)}
                        disabled={exporting === q.id}
                        className="inline-flex items-center rounded-md border border-sky-500 bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-400 hover:bg-sky-500/20 disabled:opacity-50"
                      >
                        {exporting === q.id ? t('quotes.exporting') : t('quotes.export_csv')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-100">{t('quotes.export_limit_reached')}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {t('quotes.export_limit_message')
                .replace('{0}', String(usageInfo?.limit || 0))
                .replace('{1}', String(usageInfo?.limit || 0))}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                {t('quotes.cancel')}
              </button>
              <a
                href="/pricing"
                className="flex-1 rounded-md border border-sky-500 bg-sky-500 px-4 py-2 text-center text-sm font-medium text-slate-950 hover:bg-sky-400"
              >
                {t('quotes.upgrade_to_pro')}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
